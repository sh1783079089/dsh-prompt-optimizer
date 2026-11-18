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

## Output shapes

The optimizer labels the result according to how the draft relates to the conversation.

| Shape | When it is used | What it includes |
|---|---|---|
| **Full prompt** | A new task | A self-contained objective, relevant context, deliverable, and requirements. |
| **Delta instruction** | A follow-up, revision, correction, or next step | The requested change and any existing constraints that need to be restated. |

Turning off **Use this conversation as context** selects the full-prompt format.

## Conversation context

- The host looks up the active session by ID and reads its messages with `Session.deriveMessages()`.
- The digest includes user and assistant turns. It omits system prompts and tool results, and represents tool calls as `[tools: name]` markers.
- Each turn is capped at 900 characters. Compression favors recent turns and marks omitted history with `[… N earlier messages compressed away …]`.
- Compression is deterministic. Each optimization request makes one model call.

## Installation

Install the plugin as a local DSH bundle. Open **Plugins → Add plugin** and select this directory. You can also run `plugin_manager` with the `install_bundle` action and the absolute path to this directory as its target.

DSH loads the client module on installation. If the composer button is missing, refresh the interface.

## Configuration

Open **Plugins → Prompt optimizer**, choose the model source, and click **Save**.

- **Use the conversation model** (default) uses the current session's model selection, then the model from its last request, then the DSH default.
- **Use a dedicated model** uses the model you select from the DSH catalog for every optimization request. The draft and any enabled conversation context go to that model's provider.

Existing `provider` and `model` overrides continue to select a dedicated model until you change the mode in the plugin settings. The plugin row also accepts these options.

| Option | Default | Description |
|---|---:|---|
| `timeoutMs` | `90000` | Request timeout in milliseconds. |
| `maxContextChars` | `6000` | Target digest size in characters. The configured value is capped at `24000`. |

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

Run `remove_bundle` followed by `install_bundle` to reload host changes.

## License

[BSD 3-Clause](LICENSE)
