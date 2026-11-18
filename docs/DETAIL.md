# Prompt optimizer

## What it does

Adds one button to the composer tool row, next to the message box. Clicking it
opens a dialog over the chat:

1. The dialog shows your current draft in an editable textarea.
2. **Optimize** sends the draft to the model.
3. If the model decides that information is missing, the dialog lists up to four
   specific questions. Answer any of them and choose **Continue**; blank answers
   are skipped. **Skip and optimize** produces a rewrite from whatever the draft
   already says instead of asking again.
4. The dialog then shows the rewritten prompt with a short note on what changed.
   The result is editable. **Insert into composer** replaces the draft with it,
   and **Copy** places it on the clipboard. **Optimize again** reuses the answers
   you already supplied.

## Output shapes

The optimizer does not force every prompt into the same template. It picks one
of two shapes from what the draft does, and the dialog labels the result.

- **Full prompt** — for work this conversation does not bear on. A complete,
  self-contained prompt: stance when it helps, the objective, the context and
  inputs that matter, the deliverable and its format, and the hard constraints.
- **Delta instruction** — for a follow-up, revision, correction or next step.
  The responder already holds the conversation, so the rewrite does **not**
  restate its role, the background, or what was already built and decided.
  It states the new instruction, names the target artifact or scope by the name
  already in play, and re-states a constraint only when it must keep holding, is
  at risk, or the draft stresses it — marked as still in force rather than
  re-explained. It stays short: one to four sentences, or a short bullet list.

A nudge like "continue" becomes a concrete next step instead of an echo. With
the conversation toggle off there is no history to judge against, so every
prompt comes back as a full prompt.

## Conversation context

The plugin is not limited to the first message. Every request also reads the
current session and compresses it into a bounded digest, so a prompt written
mid-conversation is optimized against the work already done.

- **Source.** `ctx.sessions.get(sessionId)` on the host, then
  `Session.deriveMessages()` — the same message list the model sees, not a
  re-parse of the raw log.
- **Compression.** Only human and assistant turns survive. The system prompt and
  tool results never enter the digest; a tool call is reduced to a short
  `[tools: name]` marker. Each turn is capped, and once the budget is spent the
  oldest turns are dropped behind an explicit
  `[… N earlier messages compressed away …]` marker, so the model knows a stretch
  is missing rather than empty.
- **Use.** The model is told to resolve references such as "this", "that",
  "continue" or "the previous version", to keep decisions and constraints already
  agreed, to never re-ask for a fact the history states, and to restate just
  enough working context to make a bare follow-up self-contained.
- **Control.** The dialog shows a **Use this conversation as context** toggle,
  on by default. After the first request it also reports how many messages were
  read and how large the digest became. Turning it off sends the draft alone.
- **Budget.** `maxContextChars` in the plugin configuration sets the digest size
  (default 6,000 characters, capped at 24,000).

Compression is deterministic: it adds no extra model call, so a request stays
one model round trip.

## Model use

Open **Plugins → Prompt optimizer**, choose the model source, and select **Save**.

- **Use the conversation model** (default) follows the current session's model
  selection. A new session without its own selection uses the DSH default.
- **Use a dedicated model** sends drafts and any enabled conversation context
  to the model you pick from DSH's catalog.

Existing `provider` and `model` overrides continue to act as a dedicated model
until you change the mode in the settings. `timeoutMs` overrides the 90-second
deadline.

Each optimization is one model call, capped at 2,000 output tokens. Prompts are
not stored by the plugin: the draft and answers travel from the page to the host
endpoint, and only the result returns. The conversation digest is built per
request and never persisted.

## Limits

- The dialog needs a selected model route. With none selected the request is
  refused with an explanatory message.
- Drafts above 20,000 characters are refused.
- The panel opens over the chat; it does not add a tab or a sidebar page.
- A session that is not live in this process (for example a cold, unopened
  session) contributes no context; the request proceeds with the draft alone.
- UI text follows the active DSH language; the model's output language follows
  the same setting.
