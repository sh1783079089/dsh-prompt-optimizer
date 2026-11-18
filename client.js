/**
 * Browser half of the prompt optimizer bundle.
 *
 * Adds one button beside the composer that opens a dialog. The dialog sends the
 * draft to the Host endpoint, shows the questions the model still needs, and
 * finally offers the rewritten prompt for copying or insertion.
 */
window.__ModuleLoader__.load({
  id: '@tick47/dsh-prompt-optimizer',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const ENDPOINT = '/prompt-optimizer/optimize'
    const SETTINGS_ID = 'prompt-optimizer'
    // The host clamps the budget and falls back to these defaults.
    const DEFAULT_CONTEXT_BUDGET = 6000
    const DEFAULT_TIMEOUT_MS = 90000
    const CONTEXT_BUDGETS = [6000, 12000, 24000]
    const TIMEOUT_OPTIONS = [30000, 60000, 90000, 180000]

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
        contextTitle: 'Context for this request',
        contextOffState: 'Off',
        contextMode: 'How to prepare this conversation',
        contextAi: 'AI summary',
        contextAiHint: 'One extra model call; keeps decisions, constraints and open work.',
        contextLocal: 'Local compression',
        contextLocalHint: 'No extra model call; deterministic, recency-weighted.',
        contextReset: 'Use the defaults',
        summaryAi: 'AI summary',
        summaryCached: 'AI summary (cached)',
        summaryLocal: 'Local compression',
        contextUsed: '{messages} messages, {chars} / {budget} characters',
        contextUsedPlain: '{messages} messages, {chars} characters',
        contextTruncated: ', earlier parts elided',
        contextEmpty: 'No earlier messages in this session.',
        settings: {
          mode: 'Model used for optimization',
          conversation: 'Use the conversation model',
          conversationHint: 'New conversations use the DSH default until you choose a model.',
          dedicated: 'Use a dedicated model',
          dedicatedHint: 'Use one model for optimization across all conversations.',
          model: 'Dedicated model',
          contextMode: 'Conversation context',
          contextOn: 'On by default',
          contextOnHint: 'The dialog starts with context on; each request can still turn it off.',
          contextOff: 'Off by default',
          contextOffHint: 'The dialog starts with context off; each request can still turn it on.',
          summaryMode: 'How to prepare the context',
          summaryAi: 'AI summary',
          summaryAiHint: 'One extra model call; a history that already fits is sent as-is.',
          summaryLocal: 'Local compression',
          summaryLocalHint: 'No extra model call; the oldest turns are elided first.',
          budget: 'Context budget',
          budgetHint: 'Upper limit for the summary input and the context sent to the optimizer.',
          timeout: 'Request timeout',
          timeoutHint: 'Shared by the summary and the optimization call.',
          characters: 'characters',
          seconds: 's',
          loading: 'Loading models…',
          catalogFailed: 'Could not load the model list.',
          catalogPartial: 'Some providers could not list their models.',
          noModels: 'DSH has no models available to select.',
          retry: 'Reload models',
          unavailable: 'Unavailable',
          readOnly: 'These settings are read-only.',
          settingsLoading: 'Loading plugin settings…',
          settingsUnavailable: 'DSH has not exposed these plugin settings. If you just updated the bundle, quit DSH from the system tray and reopen it.',
          settingsReadFailed: 'Could not read the plugin settings from DSH.',
          reloadSettings: 'Reload settings',
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
        contextTitle: '本次上下文',
        contextOffState: '不使用',
        contextMode: '本次会话上下文的整理方式',
        contextAi: 'AI 摘要',
        contextAiHint: '额外调用一次模型；保留决定、约束和待办。',
        contextLocal: '本地压缩',
        contextLocalHint: '不额外调用模型；确定性的近因加权压缩。',
        contextReset: '恢复默认',
        summaryAi: 'AI 摘要',
        summaryCached: 'AI 摘要（缓存）',
        summaryLocal: '本地压缩',
        contextUsed: '{messages} 条消息，{chars} / {budget} 字',
        contextUsedPlain: '{messages} 条消息，{chars} 字',
        contextTruncated: '，较早部分已省略',
        contextEmpty: '本会话暂无更早的消息。',
        settings: {
          mode: '优化时使用的模型',
          conversation: '使用对话模型',
          conversationHint: '新对话尚未选定模型时，使用 DSH 默认模型。',
          dedicated: '使用优化专用模型',
          dedicatedHint: '所有对话的提示词优化都使用同一个模型。',
          model: '专用模型',
          contextMode: '会话上下文',
          contextOn: '默认开启',
          contextOnHint: '弹窗默认勾选上下文，单次请求仍可关闭。',
          contextOff: '默认关闭',
          contextOffHint: '弹窗默认不带上下文，单次请求仍可开启。',
          summaryMode: '上下文整理方式',
          summaryAi: 'AI 摘要',
          summaryAiHint: '额外调用一次模型；历史本就不长时直接原样带上。',
          summaryLocal: '本地压缩',
          summaryLocalHint: '不额外调用模型；优先省略较早的轮次。',
          budget: '上下文预算',
          budgetHint: '摘要输入和发给优化模型的上下文的上限。',
          timeout: '请求超时',
          timeoutHint: '摘要与优化共用这个总超时。',
          characters: '字',
          seconds: '秒',
          loading: '正在加载模型…',
          catalogFailed: '无法加载模型列表。',
          catalogPartial: '部分提供商的模型列表加载失败。',
          noModels: 'DSH 暂无可选模型。',
          retry: '重新加载模型',
          unavailable: '不可用',
          readOnly: '当前设置为只读。',
          settingsLoading: '正在加载插件设置…',
          settingsUnavailable: 'DSH 宿主暂未提供此插件的配置。如果刚更新 bundle，请从系统托盘退出 DSH，再重新打开。',
          settingsReadFailed: '无法从 DSH 读取插件设置。',
          reloadSettings: '重新加载设置',
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
      '.dpo-btn:hover:enabled{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dpo-btn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-btn[disabled]{opacity:.5;cursor:default}',
      '.dpo-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.dpo-primary:hover:enabled{background:var(--dsw-alias-button-primary-hover)}',
      '.dpo-error{padding:8px 12px;border-radius:var(--dsw-radius-md);background:var(--dsw-static-red-400-a12);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}',
      '.dpo-notice{padding:8px 12px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dpo-notes{margin:0;padding-left:18px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dpo-context{display:flex;flex-direction:column;gap:6px;margin-top:10px}',
      '.dpo-check{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;cursor:pointer;user-select:none}',
      '.dpo-check input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer}',
      '.dpo-check input:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dpo-ctxbtn{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
      '.dpo-ctxbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dpo-ctxbtn[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-active)}',
      '.dpo-ctxbtn[data-active="false"]{color:var(--dsw-alias-label-caption)}',
      '.dpo-ctxbtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-panel{display:grid;gap:8px;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}',
      '.dpo-panel-title{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;font-weight:500}',
      '.dpo-choice{display:flex;align-items:flex-start;gap:8px;min-width:0;cursor:pointer;font-size:13px;line-height:20px}',
      '.dpo-choice input{flex:none;margin:3px 0 0;accent-color:var(--dsw-alias-state-business-primary)}',
      '.dpo-choice input:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-choice-copy{display:grid;gap:2px;min-width:0}',
      '.dpo-choice:has(input:disabled){cursor:default;opacity:.55}',
      '.dpo-choice-title{font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.dpo-link{appearance:none;justify-self:start;margin:0;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;text-decoration:underline;text-underline-offset:2px;border-radius:var(--dsw-radius-xs)}',
      '.dpo-link:hover{color:var(--dsw-alias-label-primary)}',
      '.dpo-link:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-labelrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}',
      '.dpo-labelrow .dpo-label{margin:0}',
      '.dpo-badge{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap}',
      '.dpo-trigger{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
      '.dpo-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dpo-trigger:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-settings{display:grid;gap:16px;min-width:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size,1rem);line-height:1.5}',
      '.dpo-setting{min-width:0;margin:0;padding:0;border:0}',
      '.dpo-setting legend{padding:0;margin:0 0 8px;font-weight:500}',
      '.dpo-mode-options,.dpo-model-list{min-width:0;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3)}',
      '.dpo-mode-options{overflow:hidden}',
      '.dpo-model-list{display:grid;gap:8px;max-height:min(280px,40vh);overflow:auto;overscroll-behavior:contain;padding:8px}',
      '.dpo-model-group+.dpo-model-group{border-top:0.5px solid var(--dsw-alias-border-l3);padding-top:8px}',
      '.dpo-model-provider{margin:0 0 4px;padding:0 8px;color:var(--dsw-alias-label-tertiary);font-size:.9em;font-weight:500;overflow-wrap:anywhere}',
      '.dpo-model-option{display:flex;align-items:center;gap:10px;min-width:0;padding:7px 8px;border-radius:var(--dsw-radius-sm);overflow-wrap:anywhere}',
      '.dpo-mode-options .dpo-model-option{align-items:flex-start;gap:12px;padding:11px 12px;border-radius:0}',
      '.dpo-mode-options .dpo-model-option+.dpo-model-option{border-top:0.5px solid var(--dsw-alias-border-l3)}',
      '.dpo-model-option-copy{display:grid;gap:2px;min-width:0}',
      '.dpo-model-option-title{font-weight:500}',
      '.dpo-model-option-hint{color:var(--dsw-alias-label-secondary);font-size:.9em}',
      '.dpo-model-option:has(input:enabled){cursor:pointer}',
      '.dpo-model-option:hover:has(input:enabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dpo-model-option:has(input:checked){background:var(--dsw-alias-interactive-bg-active)}',
      '.dpo-model-option input{flex:none;margin:0;accent-color:var(--dsw-alias-state-business-primary)}',
      '.dpo-mode-options input{margin-block-start:.3em}',
      '.dpo-settings :is(input,button):focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dpo-settings-feedback,.dpo-settings-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}',
      '.dpo-settings-feedback .dpo-settings-status,.dpo-settings-actions .dpo-settings-error{flex:1 1 16em}',
      '.dpo-settings-actions{justify-content:flex-end;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l2)}',
      '.dpo-settings-buttons{margin-inline-start:auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}',
      '.dpo-settings-button{appearance:none;font:inherit;line-height:1.5;padding:5px 14px;border:.5px solid transparent;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dpo-settings-button:hover:enabled{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dpo-settings-button:disabled{opacity:.4;cursor:default}',
      '.dpo-settings-save,.dpo-settings-save:hover:enabled{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}',
      '.dpo-settings-save:hover:enabled{opacity:.85}',
      '.dpo-settings-link{appearance:none;padding:2px 0;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:.92em;cursor:pointer}',
      '.dpo-settings-link:hover:enabled{text-decoration:underline}',
      '.dpo-settings-link:disabled{opacity:.4;cursor:default}',
      '.dpo-settings-status,.dpo-settings-error{margin:0;min-width:0;font-size:.92em;overflow-wrap:anywhere}',
      '.dpo-setting .dpo-settings-status:not(:last-child){margin-bottom:8px}',
      '.dpo-settings-status{color:var(--dsw-alias-label-secondary)}',
      '.dpo-settings-error{color:var(--dsw-alias-state-error-primary)}',
      '@media (max-width:720px){.dpo-dialog{border-radius:var(--dsw-radius-xl)}.dpo-head{padding:16px 12px 0 18px}.dpo-body{padding:12px 18px 4px}.dpo-foot{padding:12px 18px 16px}}',
      '@media (prefers-reduced-motion:reduce){.dpo-close,.dpo-btn,.dpo-input,.dpo-q,.dpo-trigger{transition:none}}',
    ].join('\n')

    const runtime = { localeService: null, controller: null, requestId: 0, readConfig: null }
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
        summaryMode: 'ai',
        contextOpen: false,
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

    /** Group digits for character and millisecond counts. */
    function count(value) {
      return Number(value).toLocaleString()
    }

    /** A volatile settings field exposes `get()`; a plain value is returned as-is. */
    function readField(field) {
      if (field && typeof field.get === 'function') {
        try { return field.get() } catch { return '' }
      }
      return typeof field === 'string' ? field : ''
    }

    /** A positive integer from a numeric settings field, or 0 when unset. */
    function readNumber(field) {
      let raw = field
      if (field && typeof field.get === 'function') {
        try { raw = field.get() } catch { return 0 }
      }
      const value = typeof raw === 'number' ? raw : Number(raw)
      return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
    }

    /**
     * Defaults for one dialog, read from the plugin settings each time it opens.
     * A missing or unreadable config falls back to context on, AI summary.
     */
    function contextDefaults() {
      const fallback = { useContext: true, summaryMode: 'ai' }
      if (typeof runtime.readConfig !== 'function') return fallback
      try {
        const value = runtime.readConfig() || {}
        return {
          useContext: readField(value.contextDefault) !== 'off',
          summaryMode: readField(value.summaryMode) === 'local' ? 'local' : 'ai',
        }
      } catch {
        return fallback
      }
    }

    function openPanel(draft, targetActions, sessionId) {
      const defaults = contextDefaults()
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
        useContext: defaults.useContext,
        summaryMode: defaults.summaryMode,
        contextOpen: false,
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

    async function postOptimize(draft, answers, force, signal, sessionId, useContext, summaryMode) {
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
          summaryMode: summaryMode === 'local' ? 'local' : 'ai',
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
          snapshot.summaryMode,
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

    /** "Use the defaults" inside the dialog: the settings decide, this request does not persist. */
    function resetContextSettings() {
      const defaults = contextDefaults()
      store.set({ useContext: defaults.useContext, summaryMode: defaults.summaryMode, contextMeta: null })
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

    function ModelSettings({ form, settingsDocument, sessionRemote }) {
      const t = strings().settings
      const subscribe = React.useCallback(listener => form.subscribe(listener), [form])
      const getSnapshot = React.useCallback(() => form.getSnapshot(), [form])
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [failed, setFailed] = React.useState(false)
      const [catalog, setCatalog] = React.useState(null)
      const [attempt, setAttempt] = React.useState(0)
      const [settingsAttempt, setSettingsAttempt] = React.useState(0)
      const [checkingSettings, setCheckingSettings] = React.useState(true)
      const value = snapshot.value
      const savedRoute = routeKey(value?.provider?.trim(), value?.model?.trim())
      const savedMode = value?.modelMode || (savedRoute ? 'dedicated' : 'conversation')
      const savedContextDefault = readField(value?.contextDefault) === 'off' ? 'off' : 'on'
      const savedSummaryMode = readField(value?.summaryMode) === 'local' ? 'local' : 'ai'
      const savedBudget = readNumber(value?.maxContextChars) || DEFAULT_CONTEXT_BUDGET
      const savedTimeout = readNumber(value?.timeoutMs) || DEFAULT_TIMEOUT_MS
      const mode = draft?.mode ?? savedMode
      const selected = draft?.selected ?? savedRoute
      const contextDefault = draft?.contextDefault ?? savedContextDefault
      const summaryMode = draft?.summaryMode ?? savedSummaryMode
      const budget = draft?.budget ?? savedBudget
      const timeout = draft?.timeout ?? savedTimeout
      const dedicated = mode === 'dedicated'
      const ready = snapshot.status === 'ready'
      const readOnly = snapshot.mode === 'memory' || (ready && !snapshot.writable)
      const settingsStatus = checkingSettings ? t.settingsLoading
        : snapshot.status === 'unavailable' ? t.settingsUnavailable : t.settingsReadFailed

      React.useEffect(() => {
        if (form.getSnapshot().mode === 'memory') return
        let active = true
        setCheckingSettings(true)
        // Client bundles can mount after the initial settings snapshot was read.
        Promise.resolve().then(() => settingsDocument.load()).catch(() => {}).finally(() => {
          if (active) setCheckingSettings(false)
        })
        return () => { active = false }
      }, [form, settingsDocument, settingsAttempt])

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

      const disabled = readOnly || saving
      const groups = catalog?.groups ?? []
      const hasModels = groups.some(group => group.models.length > 0)
      const known = groups.some(group => group.models.some(model => routeKey(group.id, model.id) === selected))
      const changed = mode !== savedMode || (dedicated && selected !== savedRoute) ||
        contextDefault !== savedContextDefault || summaryMode !== savedSummaryMode ||
        budget !== savedBudget || timeout !== savedTimeout
      const canSave = ready && snapshot.writable && !disabled && changed && (!dedicated || known)

      function edit(patch) {
        setDraft(current => ({ revision: snapshot.revision, ...current, ...patch }))
      }

      function discard() {
        setDraft(null)
        setFailed(false)
      }

      async function save(event) {
        event.preventDefault()
        if (!canSave) return
        const ops = [{ op: 'set', path: ['modelMode'], value: mode }]
        if (dedicated) {
          const [provider, model] = JSON.parse(selected)
          ops.push(
            { op: 'set', path: ['provider'], value: provider },
            { op: 'set', path: ['model'], value: model },
          )
        }
        ops.push(
          { op: 'set', path: ['contextDefault'], value: contextDefault },
          { op: 'set', path: ['summaryMode'], value: summaryMode },
          { op: 'set', path: ['maxContextChars'], value: budget },
          { op: 'set', path: ['timeoutMs'], value: timeout },
        )
        setSaving(true)
        setFailed(false)
        try {
          if (await form.mutate(ops, draft.revision ?? snapshot.revision) === false) setFailed(true)
          else setDraft(null)
        } catch {
          setFailed(true)
        } finally {
          setSaving(false)
        }
      }

      return h('form', { className: 'dpo-settings', onSubmit: save },
        h('style', null, CSS),
        h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.mode),
          h('div', { className: 'dpo-mode-options' },
            ['conversation', 'dedicated'].map(value => h('label', { key: value, className: 'dpo-model-option' },
              h('input', { type: 'radio', name: 'dpo-model-mode', value, checked: mode === value, onChange: () => edit({ mode: value }) }),
              h('span', { className: 'dpo-model-option-copy' },
                h('span', { className: 'dpo-model-option-title' }, t[value]),
                h('span', { className: 'dpo-model-option-hint' }, t[`${value}Hint`]),
              ),
            )),
          ),
        ),
        dedicated && h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.model),
          catalog === null && h('p', { role: 'status', className: 'dpo-settings-status' }, t.loading),
          catalog && selected && !known && h('p', { role: 'status', className: 'dpo-settings-status' },
            `${JSON.parse(selected).join(' / ')} (${t.unavailable})`,
          ),
          hasModels && h('div', { className: 'dpo-model-list' },
            groups.map(group => h('div', { key: group.id, className: 'dpo-model-group', role: 'group', 'aria-label': group.name ?? group.id },
              h('p', { className: 'dpo-model-provider' }, group.name ?? group.id),
              group.models.map(model => {
                const value = routeKey(group.id, model.id)
                return h('label', { key: model.id, className: 'dpo-model-option' },
                  h('input', { type: 'radio', name: 'dpo-dedicated-model', value, checked: selected === value, onChange: () => edit({ selected: value }) }),
                  model.name ?? model.id,
                )
              }),
            )),
          ),
        ),
        dedicated && catalog !== null && (!hasModels || catalog.failures?.length > 0) && h('div', { className: 'dpo-settings-feedback' },
          h('p', { role: 'status', className: 'dpo-settings-status' },
            catalog === false ? t.catalogFailed : (catalog.failures?.length ? t.catalogPartial : t.noModels),
          ),
          h('button', { type: 'button', className: 'dpo-settings-link', disabled: saving, onClick: () => setAttempt(attempt + 1) }, t.retry),
        ),
        h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.contextMode),
          h('div', { className: 'dpo-mode-options' },
            [
              { value: 'on', title: t.contextOn, hint: t.contextOnHint },
              { value: 'off', title: t.contextOff, hint: t.contextOffHint },
            ].map(option => h('label', { key: option.value, className: 'dpo-model-option' },
              h('input', {
                type: 'radio',
                name: 'dpo-context-default',
                value: option.value,
                checked: contextDefault === option.value,
                onChange: () => edit({ contextDefault: option.value }),
              }),
              h('span', { className: 'dpo-model-option-copy' },
                h('span', { className: 'dpo-model-option-title' }, option.title),
                h('span', { className: 'dpo-model-option-hint' }, option.hint),
              ),
            )),
          ),
        ),
        h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.summaryMode),
          h('div', { className: 'dpo-mode-options' },
            [
              { value: 'ai', title: t.summaryAi, hint: t.summaryAiHint },
              { value: 'local', title: t.summaryLocal, hint: t.summaryLocalHint },
            ].map(option => h('label', { key: option.value, className: 'dpo-model-option' },
              h('input', {
                type: 'radio',
                name: 'dpo-summary-default',
                value: option.value,
                checked: summaryMode === option.value,
                onChange: () => edit({ summaryMode: option.value }),
              }),
              h('span', { className: 'dpo-model-option-copy' },
                h('span', { className: 'dpo-model-option-title' }, option.title),
                h('span', { className: 'dpo-model-option-hint' }, option.hint),
              ),
            )),
          ),
        ),
        h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.budget),
          h('p', { className: 'dpo-settings-status' }, t.budgetHint),
          h('div', { className: 'dpo-mode-options' },
            (CONTEXT_BUDGETS.includes(savedBudget) ? CONTEXT_BUDGETS : [savedBudget, ...CONTEXT_BUDGETS])
              .map(option => h('label', { key: option, className: 'dpo-model-option' },
                h('input', {
                  type: 'radio',
                  name: 'dpo-context-budget',
                  value: String(option),
                  checked: budget === option,
                  onChange: () => edit({ budget: option }),
                }),
                h('span', { className: 'dpo-model-option-copy' },
                  h('span', { className: 'dpo-model-option-title' }, `${count(option)} ${t.characters}`),
                ),
              )),
          ),
        ),
        h('fieldset', { className: 'dpo-setting', disabled },
          h('legend', null, t.timeout),
          h('p', { className: 'dpo-settings-status' }, t.timeoutHint),
          h('div', { className: 'dpo-mode-options' },
            (TIMEOUT_OPTIONS.includes(savedTimeout) ? TIMEOUT_OPTIONS : [savedTimeout, ...TIMEOUT_OPTIONS])
              .map(option => h('label', { key: option, className: 'dpo-model-option' },
                h('input', {
                  type: 'radio',
                  name: 'dpo-timeout',
                  value: String(option),
                  checked: timeout === option,
                  onChange: () => edit({ timeout: option }),
                }),
                h('span', { className: 'dpo-model-option-copy' },
                  h('span', { className: 'dpo-model-option-title' }, `${option / 1000} ${t.seconds}`),
                ),
              )),
          ),
        ),
        readOnly && h('p', { role: 'status', className: 'dpo-settings-status' }, t.readOnly),
        !ready && !readOnly && h('div', { className: 'dpo-settings-feedback' },
          h('p', { role: 'status', className: 'dpo-settings-status' }, settingsStatus),
          !checkingSettings && h('button', { type: 'button', className: 'dpo-settings-link', onClick: () => setSettingsAttempt(settingsAttempt + 1) }, t.reloadSettings),
        ),
        !readOnly && h('div', { className: 'dpo-settings-actions' },
          failed && h('p', { role: 'alert', className: 'dpo-settings-error' }, t.saveFailed),
          h('div', { className: 'dpo-settings-buttons' },
            (draft || failed) && h('button', { type: 'button', className: 'dpo-settings-button', onClick: discard, disabled: saving }, t.discard),
            h('button', { type: 'submit', className: 'dpo-settings-button dpo-settings-save', disabled: !canSave }, saving ? t.saving : t.save),
          ),
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
      const sourceLabel = meta === null || meta === undefined ? ''
        : meta.summary === 'cached' ? t.summaryCached
          : meta.summary === 'local' ? t.summaryLocal
            : meta.summary === 'ai' ? t.summaryAi : ''
      const contextLine = snapshot.useContext === false || meta === null || meta === undefined
        ? ''
        : meta.available === true
          ? (sourceLabel.length > 0 ? `${sourceLabel} · ` : '')
            + (meta.budget == null
              ? format(t.contextUsedPlain, { messages: meta.messages, chars: count(meta.chars) })
              : format(t.contextUsed, { messages: meta.messages, chars: count(meta.chars), budget: count(meta.budget) }))
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
                h('div', { className: 'dpo-labelrow' },
                  h('label', { className: 'dpo-label', htmlFor: 'dpo-draft' }, t.inputLabel),
                  h('button', {
                    type: 'button',
                    className: 'dpo-ctxbtn',
                    'aria-expanded': snapshot.contextOpen ? 'true' : 'false',
                    'aria-controls': 'dpo-context-panel',
                    'data-active': snapshot.useContext === false ? 'false' : 'true',
                    title: `${t.contextTitle} — ${snapshot.useContext === false ? t.contextOffState : snapshot.summaryMode === 'local' ? t.contextLocal : t.contextAi}`,
                    'aria-label': t.contextTitle,
                    onClick: () => store.set({ contextOpen: !snapshot.contextOpen }),
                  }, h('svg', {
                    viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor',
                    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
                  },
                  h('path', { d: 'M4 8h9M17 8h3M4 16h3M11 16h9' }),
                  h('circle', { cx: 15, cy: 8, r: 2 }),
                  h('circle', { cx: 9, cy: 16, r: 2 }),
                  )),
                ),
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
                  snapshot.contextOpen
                    ? h('div', { className: 'dpo-panel', id: 'dpo-context-panel', role: 'group', 'aria-label': t.contextTitle },
                      h('label', { className: 'dpo-check' },
                        h('input', {
                          type: 'checkbox',
                          checked: snapshot.useContext !== false,
                          onChange: event => store.set({ useContext: event.target.checked, contextMeta: null }),
                        }),
                        h('span', null, t.contextLabel),
                      ),
                      h('p', { className: 'dpo-panel-title' }, t.contextMode),
                      [
                        { value: 'ai', title: t.contextAi, hint: t.contextAiHint },
                        { value: 'local', title: t.contextLocal, hint: t.contextLocalHint },
                      ].map(option => h('label', { key: option.value, className: 'dpo-choice' },
                        h('input', {
                          type: 'radio',
                          name: 'dpo-summary-mode',
                          value: option.value,
                          checked: snapshot.summaryMode === option.value,
                          disabled: snapshot.useContext === false,
                          onChange: () => store.set({ summaryMode: option.value, contextMeta: null }),
                        }),
                        h('span', { className: 'dpo-choice-copy' },
                          h('span', { className: 'dpo-choice-title' }, option.title),
                          h('span', { className: 'dpo-meta' }, option.hint),
                        ),
                      )),
                      h('button', { type: 'button', className: 'dpo-link', onClick: resetContextSettings }, t.contextReset),
                    )
                    : null,
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

        // The dialog starts from the saved defaults; read them again on every open.
        ctx.inject(['configForms'], configCtx => {
          try {
            const form = configCtx.configForms.get(SETTINGS_ID)
            if (form && typeof form.getSnapshot === 'function') runtime.readConfig = () => form.getSnapshot().value
          } catch { /* the settings service may not expose this plugin row */ }
        })

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
          const settingsDocument = settingsCtx.configForms.describe()
          const sessionRemote = settingsCtx.remote.session
          settingsCtx.slots.inject('plugins.bundle.config', () => settingsCtx.slots.register({
            name: 'plugins.bundle.config',
            key: '@tick47/dsh-prompt-optimizer',
          }, () => h(ModelSettings, { form, settingsDocument, sessionRemote })))
        })
      },
    }
  },
})
