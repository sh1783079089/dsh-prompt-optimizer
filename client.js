/**
 * Browser half of the prompt optimizer bundle.
 *
 * Adds one button beside the composer that opens a dialog. The dialog sends the
 * draft to the Host endpoint, shows the questions the model still needs, and
 * finally offers the rewritten prompt for copying or insertion.
 */
window.__ModuleLoader__.load({
  id: '@local/prompt-optimizer',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const ENDPOINT = '/prompt-optimizer/optimize'
    const SETTINGS_ID = 'prompt-optimizer'

    const STRINGS = {
      en: {
        button: 'Optimize prompt',
        title: 'Prompt optimizer',
        subtitle: 'Rewrite the draft with the model, or answer what it still needs.',
        inputLabel: 'Your prompt',
        placeholder: 'Paste or write the prompt you want to improve…',
        optimize: 'Optimize',
        optimizing: 'Optimizing…',
        back: 'Back to draft',
        questionsHint: 'Answer what you know, then continue. Blank answers are skipped.',
        continue: 'Continue',
        skip: 'Skip and optimize',
        resultTitle: 'Optimized prompt',
        shapeFresh: 'Full prompt',
        shapeContinue: 'Delta instruction',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Could not copy. Select the text and copy it manually.',
        insert: 'Insert into composer',
        insertedByCopy: 'Could not write to the composer; the prompt is on your clipboard.',
        regenerate: 'Optimize again',
        close: 'Close',
        notes: 'What changed',
        answerPlaceholder: 'Your answer',
        original: 'Original draft',
        contextLabel: 'Use this conversation as context',
        contextUsed: 'Conversation context: {messages} messages, compressed to {chars} characters',
        contextTruncated: ', earlier parts elided',
        contextEmpty: 'No earlier messages in this session.',
        settings: {
          mode: 'Model used for optimization',
          conversation: 'Use the conversation model',
          dedicated: 'Use a dedicated model',
          model: 'Dedicated model',
          choose: 'Choose a model',
          loading: 'Loading models…',
          catalogFailed: 'Could not load the model list.',
          catalogPartial: 'Some providers could not list their models.',
          noModels: 'DSH has no models available to select.',
          retry: 'Reload models',
          unavailable: 'Unavailable',
          readOnly: 'These settings are read-only.',
          save: 'Save',
          saving: 'Saving…',
          discard: 'Discard',
          saveFailed: 'Could not save. Discard your edits to load the current settings, then try again.',
        },
        errors: {
          EMPTY: 'Write a prompt first.',
          TOO_LONG: 'That prompt is too long.',
          NO_LLM: 'The model service is not running in this profile.',
          NO_MODEL: 'Choose a conversation model in the composer or a dedicated model in the plugin settings.',
          OPTIMIZER_MODEL_REQUIRED: 'Choose a dedicated model in the Prompt optimizer plugin settings.',
          MODEL: 'The model call failed.',
          UNREADABLE: 'The optimizer returned an unreadable response.',
          NO_QUESTIONS: 'The model asked for details but listed none.',
          UNKNOWN: 'Optimization failed.',
        },
      },
      zh: {
        button: '优化提示词',
        title: '提示词优化',
        subtitle: '用模型重写草稿；若缺少关键信息，先向你追问。',
        inputLabel: '你的提示词',
        placeholder: '把想改进的提示词粘贴或写在这里…',
        optimize: '优化',
        optimizing: '优化中…',
        back: '返回修改',
        questionsHint: '知道多少写多少，留空的会跳过。',
        continue: '继续优化',
        skip: '跳过，直接优化',
        resultTitle: '优化后的提示词',
        shapeFresh: '完整提示词',
        shapeContinue: '增量指令',
        copy: '复制',
        copied: '已复制',
        copyFailed: '复制失败，请手动选中文本复制。',
        insert: '插入输入框',
        insertedByCopy: '无法写入输入框，提示词已在剪贴板。',
        regenerate: '再优化一次',
        close: '关闭',
        notes: '改动说明',
        answerPlaceholder: '你的回答',
        original: '原始草稿',
        contextLabel: '参考本会话上下文',
        contextUsed: '已附带会话上下文：{messages} 条消息，压缩至 {chars} 字',
        contextTruncated: '，较早部分已省略',
        contextEmpty: '本会话暂无更早的消息。',
        settings: {
          mode: '优化时使用的模型',
          conversation: '使用对话模型',
          dedicated: '使用优化专用模型',
          model: '专用模型',
          choose: '请选择模型',
          loading: '正在加载模型…',
          catalogFailed: '无法加载模型列表。',
          catalogPartial: '部分提供商的模型列表加载失败。',
          noModels: 'DSH 暂无可选模型。',
          retry: '重新加载模型',
          unavailable: '不可用',
          readOnly: '当前设置为只读。',
          save: '保存',
          saving: '保存中…',
          discard: '放弃修改',
          saveFailed: '保存失败。请放弃修改以读取当前设置，然后重试。',
        },
        errors: {
          EMPTY: '请先写一段提示词。',
          TOO_LONG: '提示词太长了。',
          NO_LLM: '当前配置没有运行模型服务。',
          NO_MODEL: '请在输入框选择对话模型，或在插件设置中选择专用模型。',
          OPTIMIZER_MODEL_REQUIRED: '请在「提示词优化」插件设置中选择专用模型。',
          MODEL: '模型调用失败。',
          UNREADABLE: '优化服务返回了无法识别的内容。',
          NO_QUESTIONS: '模型表示需要补充信息，但没有列出问题。',
          UNKNOWN: '优化失败。',
        },
      },
    }

    /**
     * DSH design language: the card is the elevated composer surface with the
     * panel elevation, panel radius and the shared type scale; controls reuse
     * the host's 0.5px hairline, radius, hover and focus-ring tokens.
     */
    const CSS = [
      '.dpo-root{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto}',
      '.dpo-backdrop{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1)}',
      '.dpo-dialog{position:relative;display:flex;flex-direction:column;width:min(680px,100%);max-height:min(84vh,760px);overflow:hidden;border:0;border-radius:var(--dsw-radius-panel);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-elevation-panel);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));outline:none}',
      '.dpo-head{display:flex;flex:0 0 auto;align-items:flex-start;gap:16px;padding:20px 16px 0 24px}',
      '.dpo-headtext{flex:1 1 auto;min-width:0}',
      '.dpo-title{margin:0;font-size:16px;line-height:22px;font-weight:500}',
      '.dpo-sub{margin:5px 0 0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dpo-close{display:grid;flex:0 0 auto;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
      '.dpo-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dpo-close:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-body{display:flex;flex:1 1 auto;flex-direction:column;gap:14px;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 24px 4px}',
      '.dpo-label{display:block;margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-weight:500}',
      '.dpo-input{display:block;box-sizing:border-box;width:100%;min-height:132px;max-height:280px;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font:inherit;outline:none;resize:vertical;transition:border-color 120ms ease}',
      '.dpo-input::placeholder{color:var(--dsw-alias-label-caption)}',
      '.dpo-input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.dpo-q{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform);transition:border-color 120ms ease}',
      '.dpo-q:focus-within{border-color:var(--dsw-alias-state-business-primary)}',
      '.dpo-qtext{font-size:14px;line-height:24px;font-weight:500}',
      '.dpo-qinput{box-sizing:border-box;width:100%;padding:2px 0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:24px;outline:none}',
      '.dpo-qinput::placeholder{color:var(--dsw-alias-label-caption)}',
      '.dpo-foot{display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 24px 20px}',
      '.dpo-spacer{flex:1 1 auto}',
      '.dpo-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 16px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;font-weight:500;cursor:pointer;transition:background-color 120ms ease,border-color 120ms ease}',
      '.dpo-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dpo-btn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-btn[disabled]{opacity:.5;cursor:default}',
      '.dpo-btn[disabled]:hover{background:transparent}',
      '.dpo-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.dpo-primary:hover:not([disabled]){background:var(--dsw-alias-button-primary-hover)}',
      '.dpo-error{padding:8px 12px;border-radius:var(--dsw-radius-md);background:var(--dsw-static-red-400-a12);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}',
      '.dpo-notice{padding:8px 12px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dpo-notes{margin:0;padding-left:18px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dpo-context{display:flex;flex-direction:column;gap:6px;margin-top:10px}',
      '.dpo-check{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;cursor:pointer;user-select:none}',
      '.dpo-check input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer}',
      '.dpo-check input:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dpo-labelrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}',
      '.dpo-labelrow .dpo-label{margin:0}',
      '.dpo-badge{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap}',
      '.dpo-trigger{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
      '.dpo-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dpo-trigger:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-settings{display:grid;gap:12px;color:var(--dsw-alias-label-primary)}',
      '.dpo-setting{display:grid;gap:6px;min-width:0}',
      '.dpo-setting select{min-width:0;width:100%;padding:8px 12px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-3);color:inherit;font:inherit}',
      '.dpo-setting select:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
      '.dpo-settings-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}',
      '.dpo-settings .dpo-btn{font:inherit}',
      '.dpo-settings-status{margin:0;color:var(--dsw-alias-label-tertiary)}',
      '.dpo-settings-error{margin:0;color:var(--dsw-alias-label-error)}',
      '@media (max-width:720px){.dpo-dialog{border-radius:var(--dsw-radius-xl)}.dpo-head{padding:16px 12px 0 18px}.dpo-body{padding:12px 18px 4px}.dpo-foot{padding:12px 18px 16px}}',
      '@media (prefers-reduced-motion:reduce){.dpo-close,.dpo-btn,.dpo-input,.dpo-q,.dpo-trigger{transition:none}}',
    ].join('\n')

    const runtime = { localeService: null, controller: null, requestId: 0 }
    const store = createStore()
    const selectDraft = state => (state && typeof state.draft === 'string' ? state.draft : '')
    const FOCUSABLE = 'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'

    function createStore() {
      let snapshot = {
        open: false,
        view: 'edit',
        busy: false,
        draft: '',
        questions: [],
        answers: [],
        lastPairs: [],
        result: '',
        notes: [],
        shape: null,
        error: '',
        notice: '',
        targetActions: null,
        sessionId: null,
        useContext: true,
        contextMeta: null,
      }
      const listeners = new Set()
      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (patch) => {
          snapshot = Object.assign({}, snapshot, patch)
          listeners.forEach((listener) => { try { listener() } catch { /* one bad listener must not stop the rest */ } })
        },
      }
    }

    function useStore() {
      if (typeof React.useSyncExternalStore === 'function') {
        return React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      }
      const initial = React.useState(store.getSnapshot())
      React.useEffect(() => store.subscribe(() => initial[1](store.getSnapshot())), [])
      return initial[0]
    }

    /** Read the active locale on every call so a language change is not cached. */
    function currentLanguage() {
      const service = runtime.localeService
      if (service && typeof service.getSnapshot === 'function') {
        try {
          const active = String(service.getSnapshot().active || '').toLowerCase()
          if (active.length > 0) return active.indexOf('zh') === 0 ? 'zh' : 'en'
        } catch { /* fall through to the next source */ }
      }
      if (service && typeof service.getLocale === 'function') {
        try {
          const active = String(service.getLocale().active || '').toLowerCase()
          if (active.length > 0) return active.indexOf('zh') === 0 ? 'zh' : 'en'
        } catch { /* fall through to the document language */ }
      }
      let active = ''
      try { active = document.documentElement.lang || '' } catch { active = '' }
      const normalized = typeof active === 'string' ? active.toLowerCase() : ''
      return normalized.indexOf('zh') === 0 ? 'zh' : 'en'
    }

    function strings() {
      return currentLanguage() === 'zh' ? STRINGS.zh : STRINGS.en
    }

    /** Fill `{name}` slots in one localized template. */
    function format(template, values) {
      return String(template).replace(/\{(\w+)\}/gu, (match, key) => (
        values[key] === undefined ? match : String(values[key])
      ))
    }

    function openPanel(draft, targetActions, sessionId) {
      store.set({
        open: true,
        view: 'edit',
        busy: false,
        draft: draft || '',
        questions: [],
        answers: [],
        lastPairs: [],
        result: '',
        notes: [],
        shape: null,
        error: '',
        notice: '',
        targetActions: targetActions || null,
        sessionId: typeof sessionId === 'string' ? sessionId : null,
        useContext: true,
        contextMeta: null,
      })
    }

    /** Abort any in-flight request and close; the owner keeps its own work. */
    function closePanel() {
      if (runtime.controller) {
        try { runtime.controller.abort() } catch { /* already settled */ }
        runtime.controller = null
      }
      runtime.requestId += 1
      store.set({ open: false, busy: false })
    }

    function backToDraft() {
      if (store.getSnapshot().busy) return
      store.set({ view: 'edit', error: '', notice: '' })
    }

    function setDraft(value) {
      store.set({ draft: value, lastPairs: [], error: '', notice: '' })
    }

    function setAnswer(index, value) {
      const next = store.getSnapshot().answers.slice()
      next[index] = value
      store.set({ answers: next, error: '', notice: '' })
    }

    async function postOptimize(draft, answers, force, signal, sessionId, useContext) {
      const language = currentLanguage()
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          draft,
          answers,
          locale: language,
          force: force === true,
          sessionId: typeof sessionId === 'string' ? sessionId : null,
          useContext: useContext !== false,
        }),
        signal,
      })
      let payload = null
      try { payload = await response.json() } catch { payload = null }
      if (payload === null) {
        const error = new Error('Unreadable response.')
        error.code = 'UNREADABLE'
        throw error
      }
      if (payload.ok !== true) {
        const error = new Error(typeof payload.message === 'string' ? payload.message : '')
        error.code = typeof payload.code === 'string' ? payload.code : 'UNKNOWN'
        throw error
      }
      return payload
    }

    function localizeError(error) {
      const t = strings()
      const code = error && typeof error.code === 'string' ? error.code : ''
      if (code && Object.prototype.hasOwnProperty.call(t.errors, code)) return t.errors[code]
      return error && error.message ? error.message : t.errors.UNKNOWN
    }

    async function runOptimize(answers, force) {
      const snapshot = store.getSnapshot()
      const draft = snapshot.draft.trim()
      if (draft.length === 0) {
        store.set({ error: strings().errors.EMPTY })
        return
      }
      if (snapshot.busy) return
      if (runtime.controller) {
        try { runtime.controller.abort() } catch { /* already settled */ }
      }
      const controller = new AbortController()
      runtime.controller = controller
      runtime.requestId += 1
      const requestId = runtime.requestId
      store.set({ busy: true, error: '', notice: '' })
      try {
        const payload = await postOptimize(
          draft,
          answers || [],
          force === true,
          controller.signal,
          snapshot.sessionId,
          snapshot.useContext,
        )
        if (requestId !== runtime.requestId) return
        const contextMeta = payload.context && typeof payload.context === 'object' ? payload.context : null
        if (payload.stage === 'questions') {
          const questions = Array.isArray(payload.questions) ? payload.questions : []
          store.set({
            busy: false,
            view: 'questions',
            questions,
            answers: questions.map(() => ''),
            contextMeta,
          })
          return
        }
        store.set({
          busy: false,
          view: 'result',
          result: typeof payload.prompt === 'string' ? payload.prompt : '',
          notes: Array.isArray(payload.notes) ? payload.notes : [],
          shape: payload.shape === 'continue' || payload.shape === 'fresh' ? payload.shape : null,
          contextMeta,
        })
      } catch (error) {
        if (requestId !== runtime.requestId) return
        if (error && error.name === 'AbortError') {
          store.set({ busy: false })
          return
        }
        store.set({ busy: false, error: localizeError(error) })
      } finally {
        if (requestId === runtime.requestId) runtime.controller = null
      }
    }

    function submitAnswers(force) {
      const snapshot = store.getSnapshot()
      const pairs = snapshot.questions.map((question, index) => ({
        question,
        answer: typeof snapshot.answers[index] === 'string' ? snapshot.answers[index] : '',
      }))
      const answered = pairs.some(pair => pair.answer.trim().length > 0)
      store.set({ lastPairs: pairs })
      runOptimize(pairs, force === true || !answered)
    }

    function regenerate() {
      runOptimize(store.getSnapshot().lastPairs, true)
    }

    async function copyResult() {
      const snapshot = store.getSnapshot()
      if (!snapshot.result) return
      const t = strings()
      const copied = await copyText(snapshot.result)
      store.set({ notice: copied ? t.copied : t.copyFailed })
    }

    function insertResult() {
      const snapshot = store.getSnapshot()
      if (!snapshot.result) return
      const actions = snapshot.targetActions
      if (actions && typeof actions.setDraft === 'function') {
        try {
          actions.setDraft(snapshot.result)
          closePanel()
          return
        } catch { /* fall back to the clipboard */ }
      }
      copyText(snapshot.result).then((copied) => {
        store.set({ notice: copied ? strings().insertedByCopy : strings().copyFailed })
      })
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch { /* fall through */ }
      try {
        const field = document.createElement('textarea')
        field.value = text
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        const ok = document.execCommand('copy')
        field.remove()
        return ok
      } catch {
        return false
      }
    }

    function routeKey(provider, model) {
      return provider && model ? JSON.stringify([provider, model]) : ''
    }

    function ModelSettings({ form, sessionRemote }) {
      const t = strings().settings
      const subscribe = React.useCallback(listener => form.subscribe(listener), [form])
      const getSnapshot = React.useCallback(() => form.getSnapshot(), [form])
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [failed, setFailed] = React.useState(false)
      const [catalog, setCatalog] = React.useState(null)
      const [attempt, setAttempt] = React.useState(0)
      const value = snapshot.value
      const savedRoute = routeKey(value?.provider?.trim(), value?.model?.trim())
      const savedMode = value?.modelMode || (savedRoute ? 'dedicated' : 'conversation')
      const mode = draft?.mode ?? savedMode
      const selected = draft?.selected ?? savedRoute
      const dedicated = mode === 'dedicated'

      React.useEffect(() => {
        if (!dedicated) return
        let active = true
        setCatalog(null)
        async function load() {
          try {
            const response = await sessionRemote.modelCatalog()
            if (active) setCatalog(response.ok ? response.value : false)
          } catch {
            if (active) setCatalog(false)
          }
        }
        load()
        return () => { active = false }
      }, [dedicated, sessionRemote, attempt])

      if (snapshot.status === 'loading') return null
      const disabled = snapshot.status !== 'ready' || !snapshot.writable || saving
      const groups = catalog?.groups ?? []
      const known = groups.some(group => group.models.some(model => routeKey(group.id, model.id) === selected))
      const changed = mode !== savedMode || (dedicated && selected !== savedRoute)

      function edit(patch) {
        setDraft({ mode, selected, revision: draft?.revision ?? snapshot.revision, ...patch })
      }

      function discard() {
        setDraft(null)
        setFailed(false)
      }

      async function save(event) {
        event.preventDefault()
        if (disabled || !changed || (dedicated && !known)) return
        const ops = [{ op: 'set', path: ['modelMode'], value: mode }]
        if (dedicated) {
          const [provider, model] = JSON.parse(selected)
          ops.push(
            { op: 'set', path: ['provider'], value: provider },
            { op: 'set', path: ['model'], value: model },
          )
        }
        setSaving(true)
        setFailed(false)
        try {
          if (await form.mutate(ops, draft.revision) === false) setFailed(true)
          else setDraft(null)
        } catch {
          setFailed(true)
        } finally {
          setSaving(false)
        }
      }

      return h('form', { className: 'dpo-settings', onSubmit: save },
        h('style', null, CSS),
        h('label', { className: 'dpo-setting' }, t.mode,
          h('select', { value: mode, disabled, onChange: event => edit({ mode: event.target.value }) },
            h('option', { value: 'conversation' }, t.conversation),
            h('option', { value: 'dedicated' }, t.dedicated),
          ),
        ),
        dedicated && h('label', { className: 'dpo-setting' }, t.model,
          h('select', { value: selected, disabled: disabled || !catalog, onChange: event => edit({ selected: event.target.value }) },
            h('option', { value: '', disabled: true }, t.choose),
            selected && !known && h('option', { value: selected, disabled: true },
              `${JSON.parse(selected).join(' / ')} (${catalog === null ? t.loading : t.unavailable})`,
            ),
            groups.map(group => h('optgroup', { key: group.id, label: group.name ?? group.id },
              group.models.map(model => h('option', { key: model.id, value: routeKey(group.id, model.id) }, model.name ?? model.id)),
            )),
          ),
        ),
        dedicated && catalog === null && h('p', { role: 'status', className: 'dpo-settings-status' }, t.loading),
        dedicated && catalog && !groups.some(group => group.models.length) &&
          h('p', { role: 'status', className: 'dpo-settings-status' }, t.noModels),
        dedicated && (catalog === false || catalog?.failures?.length > 0) && h('div', { className: 'dpo-settings' },
          h('p', { role: 'status', className: 'dpo-settings-status' }, catalog === false ? t.catalogFailed : t.catalogPartial),
          h('div', null, h('button', { type: 'button', className: 'dpo-btn', onClick: () => setAttempt(attempt + 1) }, t.retry)),
        ),
        !snapshot.writable && h('p', { className: 'dpo-settings-status' }, t.readOnly),
        failed && h('p', { role: 'alert', className: 'dpo-settings-error' }, t.saveFailed),
        snapshot.writable && h('div', { className: 'dpo-settings-actions' },
          (draft || failed) && h('button', { type: 'button', className: 'dpo-btn', onClick: discard, disabled: saving }, t.discard),
          h('button', { type: 'submit', className: 'dpo-btn dpo-primary', disabled: disabled || !changed || (dedicated && !known) }, saving ? t.saving : t.save),
        ),
      )
    }

    function OptimizeButton(props) {
      const useInput = props && props.useInput
      const draft = typeof useInput === 'function' ? useInput(selectDraft) : ''
      const inputActions = props && props.inputActions
      const t = strings()
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('button', {
          type: 'button',
          className: 'dpo-trigger',
          title: t.button,
          'aria-label': t.button,
          onClick: () => openPanel(typeof draft === 'string' ? draft : '', inputActions, props && props.sessionId),
          onMouseDown: event => event.preventDefault(),
        }, h('svg', {
          viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        },
        h('path', { d: 'M12 3l1.9 4.4L18.5 9l-4.6 1.6L12 15l-1.9-4.4L5.5 9l4.6-1.6z' }),
        h('path', { d: 'M18.5 15.5l.9 2 2.1.8-2.1.8-.9 2-.9-2-2.1-.8 2.1-.8z' }),
        )))
    }

    function OptimizePanel() {
      const snapshot = useStore()
      const t = strings()
      const dialogRef = React.useRef(null)

      // Restore focus to whatever had it before the dialog opened.
      React.useEffect(() => {
        if (!snapshot.open) return undefined
        const previous = document.activeElement
        return () => {
          if (previous && typeof previous.focus === 'function') {
            try { previous.focus() } catch { /* the owner may be gone */ }
          }
        }
      }, [snapshot.open])

      // Escape closes even during a request (the request is aborted). IME Escape is ignored.
      React.useEffect(() => {
        if (!snapshot.open) return undefined
        const onKeyDown = (event) => {
          if (event.isComposing || event.keyCode === 229 || event.defaultPrevented) return
          if (event.key !== 'Escape') return
          event.stopPropagation()
          closePanel()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [snapshot.open])

      // Move focus to the first control of each view.
      React.useEffect(() => {
        if (!snapshot.open) return undefined
        const timer = setTimeout(() => {
          const root = dialogRef.current
          if (!root || typeof root.querySelector !== 'function') return
          const target = root.querySelector('[data-autofocus]') || root
          if (target && typeof target.focus === 'function') target.focus()
        }, 0)
        return () => clearTimeout(timer)
      }, [snapshot.open, snapshot.view])

      if (!snapshot.open) return null

      const onDialogKeyDown = (event) => {
        if (event.key !== 'Tab') return
        const root = dialogRef.current
        if (!root || typeof root.querySelectorAll !== 'function') return
        const nodes = root.querySelectorAll(FOCUSABLE)
        const focusable = []
        for (let index = 0; index < nodes.length; index += 1) {
          const node = nodes[index]
          if (node.disabled) continue
          if (node.offsetParent === null) continue
          focusable.push(node)
        }
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }

      const subtitle = snapshot.view === 'questions' ? t.questionsHint : t.subtitle
      const meta = snapshot.contextMeta
      const contextLine = snapshot.useContext === false || meta === null || meta === undefined
        ? ''
        : meta.available === true
          ? format(t.contextUsed, { messages: meta.messages, chars: meta.chars })
            + (meta.truncated === true ? t.contextTruncated : '')
          : t.contextEmpty
      const shapeLabel = snapshot.shape === 'continue'
        ? t.shapeContinue
        : snapshot.shape === 'fresh' ? t.shapeFresh : ''

      return h('div', { className: 'dpo-root' },
        h('div', { className: 'dpo-backdrop' }),
        h('div', {
          className: 'dpo-dialog',
          ref: dialogRef,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t.title,
          'aria-busy': snapshot.busy ? 'true' : 'false',
          tabIndex: -1,
          onKeyDown: onDialogKeyDown,
        },
          h('div', { className: 'dpo-head' },
            h('div', { className: 'dpo-headtext' },
              h('h2', { className: 'dpo-title' }, t.title),
              h('p', { className: 'dpo-sub' }, subtitle),
            ),
            h('button', { type: 'button', className: 'dpo-close', title: t.close, 'aria-label': t.close, onClick: closePanel },
              h('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
                h('path', { d: 'M6 6l12 12M18 6L6 18' }))),
          ),

          h('div', { className: 'dpo-body' },
            snapshot.error ? h('div', { className: 'dpo-error', role: 'alert' }, snapshot.error) : null,
            snapshot.notice ? h('div', { className: 'dpo-notice', role: 'status', 'aria-live': 'polite' }, snapshot.notice) : null,

            snapshot.view === 'edit'
              ? h('div', null,
                h('label', { className: 'dpo-label', htmlFor: 'dpo-draft' }, t.inputLabel),
                h('textarea', {
                  id: 'dpo-draft',
                  className: 'dpo-input',
                  value: snapshot.draft,
                  placeholder: t.placeholder,
                  spellCheck: false,
                  'data-autofocus': true,
                  onChange: event => setDraft(event.target.value),
                }),
                h('div', { className: 'dpo-context' },
                  h('label', { className: 'dpo-check' },
                    h('input', {
                      type: 'checkbox',
                      checked: snapshot.useContext !== false,
                      onChange: event => store.set({ useContext: event.target.checked, contextMeta: null }),
                    }),
                    h('span', null, t.contextLabel),
                  ),
                  contextLine ? h('div', { className: 'dpo-meta' }, contextLine) : null,
                ),
              )
              : null,

            snapshot.view === 'questions'
              ? h(React.Fragment, null,
                contextLine ? h('div', { className: 'dpo-meta' }, contextLine) : null,
                h('div', null,
                  h('label', { className: 'dpo-label', htmlFor: 'dpo-original' }, t.original),
                  h('textarea', { id: 'dpo-original', className: 'dpo-input', readOnly: true, value: snapshot.draft }),
                ),
                snapshot.questions.map((question, index) => h('div', { className: 'dpo-q', key: index },
                  h('label', { className: 'dpo-qtext', htmlFor: 'dpo-q-' + index }, question),
                  h('input', {
                    id: 'dpo-q-' + index,
                    className: 'dpo-qinput',
                    value: typeof snapshot.answers[index] === 'string' ? snapshot.answers[index] : '',
                    placeholder: t.answerPlaceholder,
                    spellCheck: false,
                    'data-autofocus': index === 0 ? true : undefined,
                    'aria-label': question,
                    onChange: event => setAnswer(index, event.target.value),
                  }),
                )),
              )
              : null,

            snapshot.view === 'result'
              ? h(React.Fragment, null,
                contextLine ? h('div', { className: 'dpo-meta' }, contextLine) : null,
                h('div', null,
                  h('div', { className: 'dpo-labelrow' },
                    h('label', { className: 'dpo-label', htmlFor: 'dpo-result' }, t.resultTitle),
                    shapeLabel.length > 0 ? h('span', { className: 'dpo-badge' }, shapeLabel) : null,
                  ),
                  h('textarea', {
                    id: 'dpo-result',
                    className: 'dpo-input',
                    value: snapshot.result,
                    spellCheck: false,
                    'data-autofocus': true,
                    onChange: event => store.set({ result: event.target.value }),
                  }),
                ),
                snapshot.notes.length > 0
                  ? h('div', null,
                    h('label', { className: 'dpo-label' }, t.notes),
                    h('ul', { className: 'dpo-notes' }, snapshot.notes.map((note, index) => h('li', { key: index }, note))),
                  )
                  : null,
              )
              : null,
          ),

          h('div', { className: 'dpo-foot' },
            snapshot.view === 'edit'
              ? h('button', { type: 'button', className: 'dpo-btn dpo-primary', disabled: snapshot.busy, onClick: () => runOptimize([], false) },
                snapshot.busy ? t.optimizing : t.optimize)
              : null,

            snapshot.view === 'questions'
              ? h(React.Fragment, null,
                h('button', { type: 'button', className: 'dpo-btn dpo-primary', disabled: snapshot.busy, onClick: () => submitAnswers(false) },
                  snapshot.busy ? t.optimizing : t.continue),
                h('button', { type: 'button', className: 'dpo-btn', disabled: snapshot.busy, onClick: () => submitAnswers(true) }, t.skip),
                h('span', { className: 'dpo-spacer' }),
                h('button', { type: 'button', className: 'dpo-btn', disabled: snapshot.busy, onClick: backToDraft }, t.back),
              )
              : null,

            snapshot.view === 'result'
              ? h(React.Fragment, null,
                h('button', { type: 'button', className: 'dpo-btn dpo-primary', disabled: snapshot.busy, onClick: insertResult }, t.insert),
                h('button', { type: 'button', className: 'dpo-btn', disabled: snapshot.busy, onClick: copyResult }, t.copy),
                h('span', { className: 'dpo-spacer' }),
                h('button', { type: 'button', className: 'dpo-btn', disabled: snapshot.busy, onClick: regenerate },
                  snapshot.busy ? t.optimizing : t.regenerate),
                h('button', { type: 'button', className: 'dpo-btn', disabled: snapshot.busy, onClick: backToDraft }, t.back),
              )
              : null,
          ),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const localeService = ctx.get('locale')
        if (localeService) runtime.localeService = localeService

        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left',
          id: 'prompt-optimizer.trigger',
          order: 40,
          label: 'Optimize prompt',
        }, OptimizeButton))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'prompt-optimizer.panel',
          order: 60,
          label: 'Prompt optimizer',
        }, OptimizePanel))

        ctx.inject(['configForms', 'remote', 'remote.session'], settingsCtx => {
          const form = settingsCtx.configForms.get(SETTINGS_ID)
          const sessionRemote = settingsCtx.remote.session
          settingsCtx.slots.inject('plugins.bundle.config', () => settingsCtx.slots.register({
            name: 'plugins.bundle.config',
            key: '@local/prompt-optimizer',
          }, () => h(ModelSettings, { form, sessionRemote })))
        })
      },
    }
  },
})
