# Prompt optimizer

[简体中文](README.zh-CN.md)

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD--3--Clause-blue)](LICENSE)
[![DeepSeek Harness bundle plugin](https://img.shields.io/badge/DeepSeek_Harness-Bundle_plugin-2563eb)](#installation)

Prompt optimizer is a DeepSeek Harness (DSH) bundle plugin that adds an **Optimize prompt** button to the composer. It rewrites your draft with the conversation model or a dedicated model and asks follow-up questions when important details are missing.

The optimizer can use a compact digest of the current conversation, so it can refine a follow-up in the middle of a session as well as a first message.

## Features

- Open the optimizer from the composer and edit your draft in the dialog.
- Answer up to four follow-up questions, leave some blank, or choose **Skip and optimize**.
- Edit the rewritten prompt, insert it into the composer, or copy it to the clipboard.
- Use the current conversation as context and see how much history the optimizer used.
- Set the context defaults in the plugin settings, and change them for a single request from the dialog.

## Output shapes

The optimizer labels the result according to how the draft relates to the conversation.

| Shape | When it is used | What it includes |
|---|---|---|
| **Full prompt** | A new task | A self-contained objective, relevant context, deliverable, and requirements. |
| **Delta instruction** | A follow-up, revision, correction, or next step | The requested change and any existing constraints that need to be restated. |

Turning off **Use this conversation as context** selects the full-prompt format.

## Conversation context

- The host looks up the active session by ID and reads its messages with `Session.deriveMessages()`.
- The summary uses visible user and assistant text. It excludes session system prompts, DSH checkpoints, tool calls and results, reasoning, and attachments.
- The plugin settings choose the default: whether the context toggle starts on, and whether the history is prepared with an AI summary or with local compression. The context icon beside the draft changes either choice for one request without saving it.
- When there is no cached summary, the configured model summarizes the history with a dedicated system prompt. If summarization fails or times out, local compression supplies the context.
- A history that already fits `maxContextChars` without truncation is sent as-is, so the summary call only happens when local compression would drop something.
- Within a session, matching history and model settings reuse the summary for 30 minutes. The host keeps up to 32 successful summaries in memory and shares a single summary call across matching concurrent requests.
- Preparing an AI summary adds one model call. Requests that use local compression, reuse a summary, or skip conversation context make only the optimization call.
- The dialog reports which source it used: AI summary, cached AI summary, or local compression.

## Installation

Install the plugin as a DSH bundle from npm:

```sh
npm install @tick47/dsh-prompt-optimizer
```

Then add it to the profile with the `plugin_manager` tool (`install_bundle`, target `@tick47/dsh-prompt-optimizer`), or pick the package directory with **Plugins → Add plugin**. To install from a checkout instead, point `install_bundle` at the repository directory.

DSH loads the client module on installation. If the composer button is missing, refresh the interface.

## Configuration

Open **Plugins → Prompt optimizer**, choose the model source, and click **Save**.

- **Use the conversation model** (default) uses the current session's model selection, then the model from its last request, then the DSH default.
- **Use a dedicated model** uses the model you select from the DSH catalog for every optimization request. The draft and any enabled conversation context go to that model's provider.

Existing `provider` and `model` overrides continue to select a dedicated model until you change the mode in the plugin settings. The plugin row also accepts these options.

The same page sets the **context budget** (6,000 / 12,000 / 24,000 characters) and the **request timeout** (30 / 60 / 90 / 180 seconds). Both apply to the summary and to the optimization call; a value saved outside these presets stays selectable as its own choice.

| Option | Default | Description |
|---|---:|---|
| `timeoutMs` | `90000` | Shared timeout in milliseconds for summarization and optimization. |
| `maxContextChars` | `6000` | Character limit for the summary input and conversation context sent to the optimizer. Capped at `24000`. |
| `contextDefault` | `on` | Whether a new optimization request starts with the conversation context on or off. |
| `summaryMode` | `ai` | `ai` summarizes the history with one extra model call; `local` compresses it without one. |

## How it works

- The host in `index.js` registers `POST /prompt-optimizer/optimize`. It reads the session, builds the digest, and calls the model through `ctx.llm`.
- The browser code in `client.js` registers the composer button, dialog, and plugin settings through `window.__ModuleLoader__`.
- The interface uses DSH design tokens for its theme and typography.

## Repository layout

```text
.
├── index.js           # Host endpoint, session digest, and model calls
├── client.js          # Composer button, dialog, settings, and styles
├── cordis.patch.yml   # DSH bundle patch
├── package.json      # Package metadata and client module declaration
├── locale/           # English and Chinese plugin manager text
├── docs/DETAIL.md     # Plugin details
└── icon.svg           # Plugin icon
```

## Limits

- Optimization requires an available model route.
- Drafts over 20,000 characters are rejected. The model call requests up to 2,000 output tokens.
- A session that is unavailable to the host contributes no context. The optimizer can still use the draft.

## Development

```sh
node --check index.js
node --check client.js
```

After updating the bundle in place, quit DSH Desktop from the system tray and reopen it to load host changes. The running host can reuse the module cached for the same file path even after reinstalling the bundle.

## License

[BSD 3-Clause](LICENSE)
