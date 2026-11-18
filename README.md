# Prompt optimizer

一个适用于 DeepSeek Harness（DSH）的提示词优化插件。在消息框旁新增一个按钮，点击后用对话模型或专用模型重写草稿。缺少必要信息时会先向你追问。

插件会读取当前会话并自动压缩成有界摘要，一并交给优化模型，因此在**对话中途**同样可用，而不局限于开场。

## 功能

- **消息框旁的按钮**：位于 composer 工具行，点击打开优化弹窗。
- **优化**：把草稿交给模型重写。
- **缺少信息时追问**：最多 4 个具体问题；可以只答一部分，也可以「跳过，直接优化」。
- **结果可编辑**：可直接改，再「插入输入框」（写回 composer）或「复制」。
- **两种输出形态**：见下文。
- **会话上下文**：自动读取本会话消息并压缩，供优化模型参考。

## 两种输出形态

优化器根据草稿性质选择形态，并在结果标题旁标注：

| 形态 | 适用 | 规则 |
|---|---|---|
| **完整提示词** | 会话与该任务无关 | 角色、目标、上下文、交付格式、硬约束，自包含 |
| **增量指令** | 后续、修订、纠正、下一步 | 不重述身份与背景；只写这次改什么；仅在约束必须继续成立、有风险或被强调时重申 |

关闭「参考本会话上下文」后没有历史可判，一律产出完整提示词。

## 会话上下文与压缩

- 通过宿主的 `ctx.sessions.get(sessionId)` 取当前活动会话，再用 `Session.deriveMessages()` 读模型实际看到的消息列表。
- 只有 human / assistant 轮次进入摘要；system prompt 与 tool result 不进入；工具调用压成 `[tools: name]` 标记。
- 单条上限 900 字；按近因加权装入预算，放不下的旧内容折叠为 `[… N earlier messages compressed away …]`，让模型知道该段是省略而非空。
- 压缩是确定性的，不额外调用模型，一次请求仍只有一次模型往返。

## 安装

本插件是本地 bundle，`private: true`，不发布到 npm。

在 DSH 中通过 **Plugins → Add plugin** 选择本目录，或由智能体执行 `plugin_manager` 的 `install_bundle`（target 为本目录绝对路径）。

安装后无需重启，客户端模块会热加载；若界面未更新，刷新页面即可。

## 配置

在 DSH 的 **插件 → 提示词优化** 详情页选择优化时使用的模型，然后点击 **保存**。

- **使用对话模型**（默认）沿用当前会话的模型选择。新会话没有单独选择时，使用 DSH 的默认模型。
- **使用优化专用模型** 从 DSH 模型目录选择一个固定模型，应用于所有会话的优化请求。草稿和启用的会话摘要会发给该模型提供方。

已有的 `provider` 和 `model` 固定配置会沿用为专用模型，直到从插件设置切换模式。插件行配置还支持下列参数。

| 字段 | 默认 | 说明 |
|---|---|---|
| `timeoutMs` | `90000` | 单次请求端到端超时 |
| `maxContextChars` | `6000` | 会话摘要字符预算，上限 `24000` |

## 工作原理

- **宿主半部**（`index.js`）注册一个 `POST /prompt-optimizer/optimize` 端点，负责读会话、压缩、调用 `ctx.llm`，并返回 `{ok, stage, prompt|questions, shape, notes, context}`。
- **浏览器半部**（`client.js`）通过 `window.__ModuleLoader__` 注册 `conversation.input.left`（按钮）、`shell.overlay`（弹窗）和 `plugins.bundle.config`（插件设置）。
- 界面样式使用宿主的 `--dsw-alias-*`、`--dsw-radius-*`、`--dsw-font-*`、`--dsw-elevation-*` 设计令牌，跟随明暗主题与用户字号。

## 目录结构

```
.
├── index.js            # 宿主：优化端点、会话读取与压缩、模型调用
├── client.js           # 浏览器：按钮、弹窗、样式
├── cordis.patch.yml    # bundle patch
├── package.json        # 包元信息与 dsh.client 声明
├── locale/             # 中英文显示标题与描述
├── docs/DETAIL.md      # 插件详情页文档
└── icon.svg            # 插件图标
```

## 限制

- 需要一个已选中的模型路由，没有时请求会被拒绝并给出说明。
- 草稿超过 20,000 字符会被拒绝。
- 非活动会话（例如未打开过的冷会话）不提供上下文，请求退化为仅用草稿。
- 弹窗覆盖在对话之上，不新增标签页或侧栏页面。

## 开发

```bash
# 语法与逻辑冒烟（仅示例，仓库不含测试脚本）
node --check client.js
```

对 DSH 端点的改动需要重新安装 bundle 才能被宿主加载：先 `remove_bundle`，再 `install_bundle`。

## 许可

[BSD 3-Clause](LICENSE)
