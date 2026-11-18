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

**Use this conversation as context** starts from the plugin settings, on by
default. The context icon beside the draft opens the settings for that one
request: a checkbox for the context and a choice between AI summary and local
compression. The plugin reads the active session through `Session.deriveMessages()`
and uses only visible text from user and assistant turns. It excludes session
system prompts, DSH compaction checkpoints, tool calls and results, reasoning,
and attachments.

The history is prepared in one of two ways:

- **Local compression** is deterministic: it keeps the newest turns, caps each
  one, and marks the dropped stretch with an explicit elision marker. It makes
  no model call.
- **AI summary** (default) sends the filtered history to the optimizer's model
  with a dedicated system prompt that preserves goals, constraints, decisions,
  progress, and open work. It makes one model call.

`maxContextChars` bounds both the summary input and the context sent to the
optimizer. It defaults to 6,000 characters and is capped at 24,000. The summary
call requests up to 800 output tokens. A history that already fits the budget
without truncation is sent as-is, so a short conversation never pays for a
summary call. If the summary fails or exceeds its share of the request timeout,
the request uses local compression.

Successful summaries stay in host memory for up to 30 minutes, with a limit of
32 entries. Matching requests reuse the summary while the filtered history,
model, and summary settings stay the same; concurrent matching requests share
one summary call. Drafts and answers never affect the cache key. The dialog
reports which source it used: AI summary, cached AI summary, or local
compression.

## Model use

Open **Plugins → Prompt optimizer**, choose the model source and the context
defaults, and select **Save**.

- **Use the conversation model** (default) follows the current session's model
  selection. A new session without its own selection uses the DSH default.
- **Use a dedicated model** sends drafts and any enabled conversation context
  to the model you pick from DSH's catalog.
- **Conversation context** sets whether the dialog starts with the context
  toggle on or off.
- **How to prepare the context** picks AI summary or local compression as the
  default. The dialog can change it for one request without saving anything.
- **Context budget** caps the summary input and the context sent to the
  optimizer: 6,000 characters by default, selectable up to 24,000.
- **Request timeout** is shared by the summary and the optimization call,
  90 seconds by default.

The dialog reports the context it used as `used / budget`, for example
`AI summary · 4 messages, 1,842 / 6,000 characters`, plus a marker when older
parts were elided.

Existing `provider` and `model` overrides continue to act as a dedicated model
until you change the mode in the settings. `timeoutMs` overrides the 90-second
deadline.

The optimization call requests up to 2,000 output tokens. Preparing a new AI
summary adds one model call. Drafts and answers stay within the request.

## Limits

- The dialog needs a selected model route. With none selected the request is
  refused with an explanatory message.
- Drafts above 20,000 characters are refused.
- The panel opens over the chat; it does not add a tab or a sidebar page.
- A session that is not live in this process (for example a cold, unopened
  session) contributes no context; the request proceeds with the draft alone.
- UI text follows the active DSH language; the model's output language follows
  the same setting.
