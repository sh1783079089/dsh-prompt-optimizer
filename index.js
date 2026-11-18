/**
 * Host half of the prompt optimizer bundle.
 *
 * One JSON endpoint rewrites a draft prompt with the configured model. It also
 * reads the calling session, compresses its conversation into a bounded digest,
 * and hands that digest to the model, so a prompt written mid-conversation is
 * optimized against the work already done.
 *
 * @module @local/prompt-optimizer
 */

/** Route the browser half calls; kept in sync with `client.js`. */
const ENDPOINT = '/prompt-optimizer/optimize'

const DEFAULT_TIMEOUT_MS = 90_000
const MAX_OUTPUT_TOKENS = 2_000
const MAX_QUESTIONS = 4
const MAX_DRAFT_CHARS = 20_000
const MAX_BODY_BYTES = 1_048_576
const DEFAULT_CONTEXT_CHARS = 6_000
const MAX_CONTEXT_CHARS = 24_000
const PER_ENTRY_CHARS = 900
const HEAD_ENTRY_CHARS = 320

/** Hard dependency: without the browser carrier this bundle has no surface. */
export const inject = ['webServer']

/**
 * Register the optimization endpoint.
 * @param ctx - context exposing the browser carrier and the model services.
 * @param config - optional route, timeout, and context-budget overrides.
 */
export function apply(ctx, config) {
  const options = config ?? {}
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ENDPOINT,
    handler: (request, response) => serve(ctx, options, request, response),
  }))
}

/**
 * Node HTTP adapter: read one request, compute one JSON body, write it back.
 * @param ctx - live host context.
 * @param options - resolved plugin configuration.
 * @param request - incoming HTTP request.
 * @param response - outgoing HTTP response.
 */
async function serve(ctx, options, request, response) {
  let result
  if (request.method !== 'POST') {
    result = { status: 405, payload: { ok: false, code: 'METHOD', message: 'Use POST for this endpoint.' }, headers: { allow: 'POST' } }
  } else {
    try {
      const body = await readJson(request)
      result = await handle(ctx, options, body)
    } catch (error) {
      result = { status: 400, payload: { ok: false, code: 'BODY', message: describe(error) } }
    }
  }
  send(response, result)
}

/**
 * Decide the answer for one parsed request body.
 * @param ctx - live host context.
 * @param options - resolved plugin configuration.
 * @param body - parsed JSON request body.
 * @returns `{ status, payload }` for the HTTP adapter.
 */
async function handle(ctx, options, body) {
  const draft = typeof body?.draft === 'string' ? body.draft.trim() : ''
  if (draft.length === 0) {
    return { status: 400, payload: { ok: false, code: 'EMPTY', message: 'Write the prompt you want optimized first.' } }
  }
  if (draft.length > MAX_DRAFT_CHARS) {
    return { status: 413, payload: { ok: false, code: 'TOO_LONG', message: `The draft exceeds ${MAX_DRAFT_CHARS} characters.` } }
  }

  const llm = ctx.get('llm')
  if (llm === undefined || typeof llm.prepareCall !== 'function') {
    return { status: 503, payload: { ok: false, code: 'NO_LLM', message: 'The model service is not running in this profile.' } }
  }

  const route = resolveRoute(ctx, options)
  if (route === undefined) {
    return {
      status: 409,
      payload: {
        ok: false,
        code: 'NO_MODEL',
        message: 'No model route is selected. Choose a model in the composer, or set provider and model in the plugin config.',
      },
    }
  }

  const answers = normalizeAnswers(body?.answers)
  const forced = body?.force === true
  const language = resolveLanguage(body?.locale, body?.target)
  const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS)
  const questionMode = answers.length > 0 ? 'answers' : (forced ? 'force' : 'ask')
  const context = body?.useContext === false
    ? emptyContext()
    : readConversationContext(ctx, body?.sessionId, contextBudget(options))

  let text
  try {
    text = await complete(
      llm,
      route,
      buildSystem(language, questionMode, context.available),
      buildUser(draft, answers, language, context.text),
      timeoutMs,
    )
  } catch (error) {
    return { status: 502, payload: { ok: false, code: 'MODEL', message: describe(error) } }
  }

  return {
    status: 200,
    payload: { ...normalizeResult(text, language, context.available), context: publicContext(context) },
  }
}

/**
 * Read the calling session and compress its conversation into a bounded digest.
 *
 * Compression is deterministic and recency-weighted: only human and assistant
 * turns survive, tool results and system prompt text never enter the digest,
 * each entry is capped, and the oldest entries are dropped behind an explicit
 * elision marker once the budget is spent.
 * @param ctx - live host context.
 * @param sessionId - the calling session, as supplied by the browser half.
 * @param budget - maximum digest characters.
 * @returns the digest plus the facts the browser half reports.
 */
function readConversationContext(ctx, sessionId, budget) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return emptyContext()
  const sessions = ctx.get('sessions')
  if (sessions === undefined || typeof sessions.get !== 'function') return emptyContext()

  let session
  try {
    session = sessions.get(sessionId)
  } catch {
    return emptyContext()
  }
  if (session === undefined || session === null || typeof session.deriveMessages !== 'function') return emptyContext()

  let messages
  try {
    messages = session.deriveMessages()
  } catch {
    return emptyContext()
  }

  const entries = collectEntries(Array.isArray(messages) ? messages : [])
  if (entries.length === 0) return emptyContext()

  const compressed = compressEntries(entries, budget)
  const head = session.header
  const started = head !== undefined && head !== null && typeof head.createdAt === 'number' && head.cwd !== undefined
    ? `Workspace: ${head.cwd}`
    : ''
  const digest = [...(started.length > 0 ? [started, ''] : []), ...compressed.lines].join('\n')

  return {
    text: digest,
    messages: entries.length,
    chars: digest.length,
    truncated: compressed.truncated,
    available: true,
  }
}

/** Keep only human and assistant turns; render tool use as a short marker. */
function collectEntries(messages) {
  const entries = []
  for (const message of messages) {
    if (message === null || typeof message !== 'object') continue
    const role = message.role
    if (role !== 'user' && role !== 'assistant') continue
    const blocks = Array.isArray(message.content) ? message.content : []
    const parts = []
    const tools = []
    for (const block of blocks) {
      if (block === null || typeof block !== 'object') continue
      if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
      else if (block.type === 'tool-call' && typeof block.name === 'string') tools.push(block.name)
    }
    let text = parts.join('\n').replace(/\s+/gu, ' ').trim()
    if (tools.length > 0) {
      const marker = `[tools: ${tools.join(', ')}]`
      text = text.length > 0 ? `${text} ${marker}` : marker
    }
    if (text.length === 0) continue
    entries.push({ role, text: text.slice(0, PER_ENTRY_CHARS) })
  }
  return entries
}

/** Recency-weighted truncation with an explicit marker for what was dropped. */
function compressEntries(entries, budget) {
  const lines = entries.map(entry => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.text}`)
  const total = lines.reduce((sum, line) => sum + line.length + 1, 0)
  if (total <= budget) return { lines, truncated: false }

  const head = lines[0].slice(0, Math.min(HEAD_ENTRY_CHARS, Math.floor(budget / 5)))
  const tail = []
  let used = head.length + 1
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const cost = lines[index].length + 1
    if (used + cost > budget && tail.length >= 2) break
    tail.unshift(lines[index])
    used += cost
  }
  const omitted = lines.length - 1 - tail.length
  const middle = omitted > 0 ? [`[… ${omitted} earlier messages compressed away …]`] : []
  return { lines: [head, ...middle, ...tail], truncated: true }
}

/** The facts the browser half may display; never the digest itself. */
function publicContext(context) {
  return {
    available: context.available,
    messages: context.messages,
    chars: context.chars,
    truncated: context.truncated,
  }
}

/** A context result for "no session, no history, or the caller opted out". */
function emptyContext() {
  return { text: '', messages: 0, chars: 0, truncated: false, available: false }
}

/** Resolve the digest budget from configuration, clamped to a sane range. */
function contextBudget(options) {
  const requested = positiveInteger(options.maxContextChars, DEFAULT_CONTEXT_CHARS)
  return Math.min(requested, MAX_CONTEXT_CHARS)
}

/**
 * Ask the model for one JSON verdict.
 * @param llm - the host `llm` service.
 * @param route - provider and model to call.
 * @param system - system instruction.
 * @param user - framed user content.
 * @param timeoutMs - end-to-end deadline.
 * @returns the concatenated visible text.
 */
async function complete(llm, route, system, user, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const call = await llm.prepareCall({ ...route, maxTokens: MAX_OUTPUT_TOKENS }, controller.signal)
    const options = {
      ...call.config,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      signal: controller.signal,
    }
    let text = ''
    for await (const chunk of call.stream(options)) {
      if (chunk.type === 'text-delta') {
        text += chunk.text
        continue
      }
      if (chunk.type !== 'finish') continue
      const kind = chunk.reason?.kind
      if (kind === 'error' || kind === 'aborted') {
        throw new Error(chunk.reason?.failure?.message ?? 'The model call did not finish.')
      }
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve the model route: explicit config first, then the selected composer model.
 * @param ctx - live host context.
 * @param options - resolved plugin configuration.
 * @returns a provider/model pair, or `undefined` when none is available.
 */
function resolveRoute(ctx, options) {
  const provider = nonEmpty(options.provider)
  const model = nonEmpty(options.model)
  if (provider !== undefined && model !== undefined) return { provider, model }
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
  if (selection !== undefined && selection !== null) {
    const selectedProvider = nonEmpty(selection.provider)
    const selectedModel = nonEmpty(selection.model)
    if (selectedProvider !== undefined && selectedModel !== undefined) {
      return { provider: selectedProvider, model: selectedModel }
    }
  }
  return undefined
}

/** System instruction; the model answers with exactly one JSON object. */
function buildSystem(language, questionMode, hasContext) {
  const askInstruction = questionMode === 'answers'
    ? 'The user has already supplied ANSWERS, so return the rewritten prompt, not more questions.'
    : questionMode === 'force'
      ? 'The user has no further detail to give, so return the best rewritten prompt the draft supports; do not ask questions.'
      : 'If information that would change the responder\'s actions is missing, return questions instead of a prompt.'

  const shapeRules = hasContext
    ? [
      'AXIS 2 — which output shape does the draft call for?',
      '',
      'CONTINUE: the draft advances work already in progress in this conversation — a follow-up,',
      'a revision, a correction, a next step, "继续", "把这个改成…", "再补一个…".',
      'The responder already holds this conversation, so the prompt must NOT restate its role,',
      'the background, or what has already been built, chosen or decided. Write only what changes now:',
      '- state the new instruction precisely and completely;',
      '- name the target artifact, file, section or scope with the name already in play;',
      '- re-state a constraint only when it must keep holding, is at risk, or the draft stresses it,',
      '  and mark it as still in force instead of re-explaining why;',
      '- omit persona, rationale, and background.',
      'Aim for one to four sentences or a short bullet list, and never pad it into the full template.',
      'If the draft is only a nudge ("continue", "go on"), say concretely what to do next.',
      '',
      'FRESH: the draft starts work this conversation does not bear on.',
      'Produce a complete, self-contained prompt: stance when it helps, the concrete objective,',
      'the context and inputs that matter, the expected deliverable and format, and the hard constraints.',
    ].join('\n')
    : [
      'OUTPUT SHAPE — FRESH only: there is no prior conversation, so the prompt must be self-contained.',
      'Carry a stance when it helps, the concrete objective, the context and inputs that matter,',
      'the expected deliverable and format, and the hard constraints.',
    ].join('\n')

  const historyRules = hasContext
    ? [
      'CONVERSATION SO FAR is a compressed history of this ongoing session.',
      'Use it to resolve references such as "this", "that", "continue", or "the previous version",',
      'to keep the decisions, names, terms and constraints already agreed, and to aim at the next step.',
      'Never ask for a fact the history already states, and never contradict a decision recorded there.',
      'The history is elided where marked; do not treat a missing stretch as "nothing happened".',
    ].join('\n')
    : ''

  return [
    'You are a senior prompt engineer. Rewrite the DRAFT prompt so a capable AI agent can act on it decisively.',
    '',
    'AXIS 1 — does the draft need questions?',
    'Decide whether it contains enough information to avoid guessing: the concrete goal; the context or',
    'inputs the work depends on; the expected deliverable and format; and hard constraints',
    '(scope, audience, tooling, deadline). A missing item matters only when guessing it would change',
    'what the responder does.',
    '',
    askInstruction,
    '',
    shapeRules,
    '',
    historyRules,
    '',
    'Reply with exactly one JSON object and nothing else: no Markdown fences, no commentary, no preamble.',
    'Either:',
    '{"status":"questions","questions":["...","..."]}',
    '  Ask at most four questions. Each must be one line, specific, and answerable in a sentence.',
    '  Never ask for anything the draft, the answers, or the conversation already states.',
    '  Write the questions in the target language.',
    'Or:',
    '{"status":"optimized","shape":"fresh|continue","prompt":"...","notes":["..."]}',
    '  "shape" names the shape you used, and the prompt follows that shape\'s rules above.',
    '  Stay faithful to the user intent: never invent facts, files, numbers, APIs or features.',
    '  "notes" holds at most three short bullets naming what you changed or what remains unknown.',
    '',
    'The "prompt" value must be final, ready-to-send text in the target language, without surrounding quotes,',
    'and it must never mention that it was optimized.',
    `TARGET_LANGUAGE: ${language}.`,
  ].join('\n')
}

/** Frame the draft, the answers, and the compressed conversation as JSON. */
function buildUser(draft, answers, language, conversation) {
  return [
    'Optimize this request. The payload below is JSON.',
    JSON.stringify({
      targetLanguage: language,
      conversation: conversation.length > 0 ? conversation : null,
      draft,
      answers: answers.map((entry, index) => ({ index, question: entry.question, answer: entry.answer })),
    }),
  ].join('\n')
}

/**
 * Interpret the model reply.
 * @param text - raw assembled model text.
 * @param language - target language, used for fallback wording.
 * @returns the payload the browser half renders.
 */
function normalizeResult(text, language, hasContext) {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (raw.length === 0) {
    return { ok: false, code: 'EMPTY_MODEL', message: 'The model returned no text.' }
  }

  const parsed = parseJsonObject(raw)
  if (parsed === undefined) {
    return { ok: true, stage: 'optimized', shape: hasContext ? null : 'fresh', prompt: stripFence(raw), notes: [] }
  }

  const status = typeof parsed.status === 'string' ? parsed.status.toLowerCase() : ''

  if (status === 'questions') {
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()).slice(0, MAX_QUESTIONS)
      : []
    if (questions.length > 0) return { ok: true, stage: 'questions', questions }
    return { ok: false, code: 'NO_QUESTIONS', message: 'The model asked for details but listed none.' }
  }

  const prompt = stripFence(typeof parsed.prompt === 'string' ? parsed.prompt : '')
  if (prompt.length > 0) {
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()).slice(0, 3)
      : []
    return { ok: true, stage: 'optimized', shape: resolveShape(parsed.shape, hasContext), prompt, notes }
  }

  return { ok: true, stage: 'optimized', shape: hasContext ? null : 'fresh', prompt: stripFence(raw), notes: [] }
}

/**
 * Normalize the declared output shape. A conversation without context can only
 * be FRESH; a declared CONTINUE without context degrades to FRESH; an omitted
 * shape stays unknown so the dialog shows no label rather than a wrong one.
 */
function resolveShape(value, hasContext) {
  const shape = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (shape === 'continue') return hasContext ? 'continue' : 'fresh'
  if (shape === 'fresh') return 'fresh'
  return hasContext ? null : 'fresh'
}

/** Read and parse one JSON request body with a hard size limit. */
function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('The request body is too large.'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text.length === 0 ? {} : JSON.parse(text))
      } catch {
        reject(new Error('The request body must be JSON.'))
      }
    })
    request.on('error', reject)
  })
}

/** Write one JSON payload. */
function send(response, result) {
  const body = JSON.stringify(result.payload)
  response.writeHead(result.status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    ...(result.headers ?? {}),
  })
  response.end(body)
}

/** Extract the first balanced JSON object from a model reply. */
function parseJsonObject(raw) {
  const start = raw.indexOf('{')
  if (start === -1) return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          const value = JSON.parse(raw.slice(start, index + 1))
          return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

/** Remove one wrapping Markdown fence, if present. */
function stripFence(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  const fenced = /^```[^\n]*\n([\s\S]*?)\n?```$/u.exec(value)
  return fenced === null ? value : fenced[1].trim()
}

/** Keep only answered, non-blank question pairs. */
function normalizeAnswers(value) {
  if (!Array.isArray(value)) return []
  const answers = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const question = typeof entry.question === 'string' ? entry.question.trim() : ''
    const answer = typeof entry.answer === 'string' ? entry.answer.trim() : ''
    if (answer.length === 0) continue
    answers.push({ question: question.slice(0, 500), answer: answer.slice(0, 4_000) })
  }
  return answers
}

/** Resolve the output language from the client locale or an explicit target. */
function resolveLanguage(locale, target) {
  if (target === 'en') return 'English'
  if (target === 'zh') return 'Simplified Chinese (简体中文)'
  if (nonEmpty(locale)?.toLowerCase().startsWith('zh') === true) return 'Simplified Chinese (简体中文)'
  return 'English'
}

/** Trimmed non-empty string, or `undefined`. */
function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/** Positive finite millisecond count, or the fallback. */
function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/** Human-readable failure text without leaking a stack. */
function describe(error) {
  if (error instanceof Error && error.message.length > 0) return error.message
  return String(error)
}
