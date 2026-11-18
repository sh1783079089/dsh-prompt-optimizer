# AGENTS.md

Working instructions for agents in this repository. They are guidance, not a
substitute for the task the user gives you.

## Project

`@local/prompt-optimizer` — a DeepSeek Harness (DSH) bundle plugin that adds an
Optimize button to the composer and rewrites the current draft with the session's
selected model.

- Repository root **is** the plugin package root; there is one package and no
  monorepo.
- No build step, no bundler, no runtime dependencies, no test framework.
- `private: true`. Local installation only; never publish.
- Git: branch `main`, local only, **no remote**. Do not add one.

## Layout

| Path | Role |
|---|---|
| `index.js` | Host half: the `/prompt-optimizer/optimize` endpoint, session reading, context compression, model calls. |
| `client.js` | Browser half: the composer trigger, the dialog, and all CSS (an inline string). |
| `cordis.patch.yml` | Bundle row that inserts the plugin into the profile. |
| `package.json` | Package metadata plus the `dsh.bundle` and `dsh.client` declarations. |
| `locale/{en,zh}.json` | Plugin Manager title, description, and detail-document pointer. |
| `docs/DETAIL.md` | The plugin's detail page (English). |
| `icon.svg` | Plugin icon. |

## Architecture

- **Host half** registers a `POST` route on `ctx.webServer`. It resolves the
  model route from config or `ctx.get('agentDefaultModel').currentSelection()`,
  reads the calling session through `ctx.get('sessions').get(sessionId)` and
  `Session.deriveMessages()`, and reuses or generates an AI summary for the
  filtered conversation. Both the summary and the optimization use
  `ctx.llm.prepareCall(...)` and `call.stream(...)`.
- **Browser half** loads through `window.__ModuleLoader__.load` and registers
  `conversation.input.left` as `prompt-optimizer.trigger`, `shell.overlay` as
  `prompt-optimizer.panel`, and the plugin settings panel as
  `plugins.bundle.config`. The trigger captures `inputActions` and `sessionId`
  from its slot props; the dialog lives in a root-scoped overlay and receives
  them through the module store. It reads the dialog defaults from
  `configForms` on every open, so a saved setting applies to the next request.
- The two halves talk over plain `fetch` to the host route. There is no Remote,
  no Typert schema, and no `host.call` — a bundle's host half is not a dynamic
  Cordis package, so `host.call` does not reach it.

## Invariants

1. **No dependencies.** The host half imports nothing. The browser half only
   does `require('react')`. Do not add npm packages to solve a small problem.
2. **The endpoint must stay a `WebRoute` handler.** A `WebResourceRoute`
   (`resource`) answers only `GET`/`HEAD`; a `POST` to it falls through to the
   static resource and returns `405` with `Allow: GET, HEAD`. This was a real
   defect once.
3. **Never require a Harness Client package** such as
   `@deepseek-ai/dsh-client-ui-primitives` from `client.js`. Copy the markup and
   CSS from the host source instead; a throwing component blanks the slot entry.
4. **Use DSH design tokens only**: `--dsw-alias-*`, `--dsw-radius-*`,
   `--dsw-font-*`, `--dsw-elevation-*`, `--dsh-content-font-size`. No literal
   colors except through a token; no fixed font size that ignores the user's
   setting.
5. **Keep drafts and answers request-local.** Keep successful conversation
   summaries only in the host's memory cache for up to 30 minutes and at most
   32 entries. The cache key hashes the session ID, filtered history, and
   summary settings. A local-only request, or a history that fits the budget
   without truncation, writes no cache entry and makes no summary call.
6. **Conversation context contains only visible user and assistant text.**
   Exclude session system prompts, DSH compaction checkpoints, tool calls and
   results, reasoning blocks, and attachments from AI input and local fallback.
7. **Bounds are part of the contract**: draft ≤ 20,000 chars, context budget
   default 6,000 (cap 24,000), output ≤ 2,000 tokens.

## Endpoint contract

`POST /prompt-optimizer/optimize`

Request: `{ draft, answers, force, locale, sessionId, useContext, summaryMode }`,
where `summaryMode` is `ai` | `local` and defaults to the plugin setting.
Response: `{ ok, stage, prompt?, questions?, shape?, notes?, context? }`, where
`stage` is `optimized` or `questions`, `shape` is `fresh` | `continue` | `null`,
and `context` is `{ available, messages, chars, truncated, summary, budget }`
with `summary` being `ai` | `cached` | `local` | `null` and `budget` the
effective character limit (or `null`).
Errors: `{ ok: false, code, message }` with `400` (empty/too long/body), `409`
(no model), `413`, `502` (model), `503` (no LLM service), `405` (method).

Changing either the route path or these field names requires updating both halves
in the same change.

## Changing and verifying

- **Host changes** at the same installed path need a new DSH host process.
  Quit DSH Desktop from the system tray and reopen it. Reinstalling a bundle
  at the same path can reuse the old host module cached by the running process.
- **Client changes** reload with the module graph; if the page still shows the old
  UI, refresh it.
- There is usually **no browser control**. Verify in this order:
  1. `node --check` the changed file.
  2. A throwaway smoke script under a scratch directory: import the host half,
     call `apply` with a fake `ctx` (fake `webServer`, `llm`, `sessions`), invoke
     the captured route handler with fake `req`/`res`, and call the client halves
     with a stub React. Delete the scratch directory afterwards.
  3. A real `POST` to `http://127.0.0.1:<port>/prompt-optimizer/optimize`.
  4. `cordis_inspect_query` on the client `Slots` provider to confirm the
     occupants.
- **Never claim visual success without a screenshot.** Slot registration and a
  passing endpoint do not prove the panel renders correctly.

## Documentation

`docs/DETAIL.md` is the user-facing detail page. Keep it consistent with what the
code actually does; do not document behaviour that is not implemented. Bump
`CHANGELOG.md` under `[Unreleased]` for any user-visible change.

## Style

- Plain JavaScript, two-space indentation, no semicolons, single quotes.
- Keep the host half dependency-free and defensive: every external call
  (`ctx.get`, `deriveMessages`, `prepareCall`, `stream`) is guarded, and a failure
  degrades to a clear JSON error rather than throwing out of the route.
- Comments explain why something is the way it is; they do not restate the code.

## Git

- Line endings are normalized to LF by `.gitattributes`; keep it.
- One logical change per commit, message in the existing
  `type: summary` style.
- This machine's global config enables commit signing, but the sandbox cannot
  write `%APPDATA%\gnupg`. Signing therefore needs a one-shot wider access for
  that single command. **Never change the global Git config** to work around it;
  scope any override to the command with `-c`.
