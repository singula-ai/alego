# Loadable Harness plugin packages

This file is GENERATED from workspace manifests (`scripts/gen-plugin-packages.ts`) and verified fresh by `pnpm run verify-plugin-packages` (part of `doc-sync`); do not edit it by hand.

Every package below exports a Cordis plugin that a bundle patch can name in a Loader row. `Config` marks packages whose row accepts a `config` mapping; query `Config.listConfigs` through `cordis_inspect_query` (filter by `name`, then query the `entry` id) for the mounted schema. Packages under `experimental` are pre-stable.

## acp

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-acp` | yes | Automation-only Agent Client Protocol server for driving Alego agents over JSON-RPC stdio |

## api

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-api-account-controller` | no | Expose safe account operations over authenticated Remote |
| `@singula-ai/alego-api-gateway` | yes | Typert Remote Host dispatcher and Client API endpoint |
| `@singula-ai/alego-api-job-controller` | yes | Job Remote observation stream and the reference-counted client job-output service |
| `@singula-ai/alego-api-remotes` | no | Remote BFF assembly for application-selected Host capabilities |
| `@singula-ai/alego-api-session-controller` | yes | Session Remote commands, cold reads, and live control transport |
| `@singula-ai/alego-api-settings-controller` | yes | Remote owner for the configuration surfaces over the settings-domain seams |
| `@singula-ai/alego-api-terminal-controller` | yes | Session-owned interactive terminals with shell discovery, screen recovery and typed Remote control |
| `@singula-ai/alego-api-workspace-controller` | yes | Workspace Remote commands and reconnect-safe state transport |
| `@singula-ai/alego-api-workspace-files` | yes | Workspace file service and Client resource provider: bounded reads, directory listing, and live metadata over the workspaceFiles Remote namespace |

## attachment

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-attachment-local` | yes | Private content-addressed ALEGO_HOME attachment storage |

## boot

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-config-editor` | no | Persist plugin configuration through profile patches and Loader reconciliation |
| `@singula-ai/alego-hmr` | yes | Coordinated module and profile configuration hot reload |
| `@singula-ai/alego-plugin-manager` | yes | Current-profile plugin and bundle management shared by alego CLI, Web and agent tools |

## browser-use

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-browser-use` | no | Exclusive named browser-use provider registration |

## bundle

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-acp-app` | no | The alego ACP profile bundle: automation-only JSON-RPC stdio and process lifecycle over alego-base |
| `@singula-ai/alego-headless` | yes | The alego one-shot bundle: a direct core Agent/Session runner over alego-base with no Host, HTTP, or browser layer |
| `@singula-ai/alego-sdk-app` | yes | The alego SDK profile bundle: stdio JSON-RPC serving and process lifecycle over alego-base |
| `@singula-ai/alego-web-app` | yes | The alego browser-surface bundle: the web patch layer over alego-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) |

## client

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-client-connection` | yes | Authenticated RPC transport and generation lifecycle |
| `@singula-ai/alego-client-file-upload` | no | Agent-scoped browser file upload, streaming intake, and staged receipt service |
| `@singula-ai/alego-client-hmr` | yes | Web client graph synchronization and rebuilt-bundle reload transport |
| `@singula-ai/alego-client-locale` | no | Locale plugin: Host-backed preference, extensible language catalog, browser fallback, and typed built-in dictionaries |
| `@singula-ai/alego-client-modules` | no | Client module system, dual-face: node half composes the __ALEGO_BOOT__ entry graph (incremental alego.client scan, bundle route, index tap, webPlugins service); browser half is the lazy-CJS module table the vendored cordis Loader consumes as its internal seam |
| `@singula-ai/alego-client-product-analytics` | yes | Desktop product event collection and authenticated Host reporting |
| `@singula-ai/alego-client-resources` | no | Unified client resource model: protocol-registered providers turn URL addresses into live values, consumed through the useResource global standard hook |
| `@singula-ai/alego-client-shortcuts` | yes | Application keyboard command registry and physical-key routing |
| `@singula-ai/alego-client-ui-agent-preset` | no | Agent-preset surfaces: the default for later sessions, this session's seat, and the composition editor |
| `@singula-ai/alego-client-ui-approval` | no | Approval composer takeover over the scoped Remote Event waterfall |
| `@singula-ai/alego-client-ui-attachment` | no | Dynamic attachment presentation plugin for conversation input, message-image, and trajectory image slots |
| `@singula-ai/alego-client-ui-brand-official` | no | Official Alego brand occupants for the Web client's sidebar slots |
| `@singula-ai/alego-client-ui-chat` | no | Chat Conversation target, node definitions, renderers, and details surface |
| `@singula-ai/alego-client-ui-commands` | no | Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry |
| `@singula-ai/alego-client-ui-conversation` | no | Target-neutral Conversation assembly, shell, composer, queue, and view navigation |
| `@singula-ai/alego-client-ui-deliverables` | no | Changed-files card with per-file comparison tabs, delivery cards, and clickable final-response file references for Web |
| `@singula-ai/alego-client-ui-directory-picker-browse` | no | In-app directory browsing surface: the workspace directory-flow owner rendering the host's listing and creation primitives |
| `@singula-ai/alego-client-ui-directory-picker-native` | no | Native directory-picker surface: the renderless workspace directory-flow occupant driving the local Desktop or Host OS chooser |
| `@singula-ai/alego-client-ui-goal` | no | Session goal surface: GoalBar docked above the composer, read from the goal session projection |
| `@singula-ai/alego-client-ui-input-trigger` | no | Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources |
| `@singula-ai/alego-client-ui-jobs` | no | Session-header background-job list with on-demand streaming record panels |
| `@singula-ai/alego-client-ui-layout` | no | Shell plugin: three-column AppFrame with drag handles, ctx.layout viewing-state service (navigation + panels) |
| `@singula-ai/alego-client-ui-message-feedback` | no | The Web feedback surface: per-message Like/Dislike in the assistant-message action strip and the feedback dialog behind both ratings and /feedback, backed by the messageFeedback and sessionFeedback Host Remotes |
| `@singula-ai/alego-client-ui-model-selection` | no | Model selection over the shared model catalog, Session projection, and session.selectModel |
| `@singula-ai/alego-client-ui-open-in-app` | no | Web "Open In..." controls: the Session-header split button opening the workspace directory in an installed application, and the document preview's default-application controls for one file |
| `@singula-ai/alego-client-ui-permission-presets` | no | Permission surfaces: a new-session default in General settings and a current-session /permission popup over the permissions projection |
| `@singula-ai/alego-client-ui-plan` | no | Plan mode controls, persistent transcript plan cards, and sidebar Markdown previews |
| `@singula-ai/alego-client-ui-plugin-manager` | yes | Plugin management for the alego web client: the sidebar Plugins panel installs, enables, disables, retries, and composes installed plugin packages |
| `@singula-ai/alego-client-ui-reference` | no | Unified Web @file and @session reference source |
| `@singula-ai/alego-client-ui-renderer` | no | Browser UI renderer: React slot bindings, ctx.uiRenderer, and the assembled application root |
| `@singula-ai/alego-client-ui-schedule` | no | Host task management page and Session reminder catalog |
| `@singula-ai/alego-client-ui-session` | no | Session Controller adapter for React and session-scoped slots |
| `@singula-ai/alego-client-ui-settings` | no | Settings domain base plugin: shared configuration forms and the canonical settings slot-type contract |
| `@singula-ai/alego-client-ui-settings-account` | yes | Manage DeepSeek login and open Platform billing pages |
| `@singula-ai/alego-client-ui-settings-agent-loop` | no | Settings page of the agent loop on the alego web client's Plugins page: the parallel tool-call cap of the agent-loop namespace |
| `@singula-ai/alego-client-ui-settings-general` | no | Settings ownerless-copy and product onboarding plugin: the General section, shell trigger/header chrome content, settings dictionaries, and the versioned welcome notice |
| `@singula-ai/alego-client-ui-settings-models` | yes | Models settings and shared product-onboarding dialogs over existing settings and credential joins |
| `@singula-ai/alego-client-ui-settings-plugin-inventory` | no | Read-only Cordis Loader inventory tab in Web Plugins settings |
| `@singula-ai/alego-client-ui-settings-plugins` | no | Built-in plugins settings section for the alego web client: the Settings navigation entry and the tab chrome feature-owned tabs register into |
| `@singula-ai/alego-client-ui-settings-shell` | no | Settings page of the shell executor on the alego web client's Plugins page: the command timeout and the per-stream output cap of the shell namespace |
| `@singula-ai/alego-client-ui-settings-subagent` | no | Settings page of Subagent delegation on the alego web client's Plugins page: recursion depth, parallel capacity, and the models agents may choose for subagents |
| `@singula-ai/alego-client-ui-settings-web-search` | no | Settings page of the DeepSeek web-search provider on the alego web client's Plugins page: its API key, endpoint, and per-request search budget |
| `@singula-ai/alego-client-ui-shortcuts` | no | Keyboard shortcut reference, recording, and local preference editing |
| `@singula-ai/alego-client-ui-sidebar` | no | Sidebar plugin: session multi-level tree, search, grouping, state dots |
| `@singula-ai/alego-client-ui-sidebar-browser` | no | Sandboxed Web browser tabs for the right Sidebar |
| `@singula-ai/alego-client-ui-sidebar-documentpreview` | yes | Extensible Sidebar previews for Office documents, spreadsheets, Markdown, code, images, PDF, HTML, and plain text |
| `@singula-ai/alego-client-ui-sidebar-files` | no | Workspace file tree tab type for the right Sidebar: lazy directory listing over the workspaceFiles Remote namespace, opening files into the Sidebar |
| `@singula-ai/alego-client-ui-sidebar-right` | no | Right Sidebar: the docking surface's session-bound state, its panel and header expand control, and the navigation service over it |
| `@singula-ai/alego-client-ui-sidebar-terminal` | no | Interactive shell tabs for the right Sidebar |
| `@singula-ai/alego-client-ui-skill` | no | Web skill references and the dedicated skill tool row |
| `@singula-ai/alego-client-ui-subagent` | no | Subagent conversation catalog, continuation routing UI, and '@' reference source |
| `@singula-ai/alego-client-ui-theme` | yes | Theme plugin: Host bootstrap for the pre-plugin palette; DOM-free ThemeRuntime for light/dark/system state; --dsw-* token styles and Appearance settings row |
| `@singula-ai/alego-client-ui-tool` | no | Client Tool call-tree renderer and keyed per-tool presentation slot |
| `@singula-ai/alego-client-ui-trajectory` | no | Trajectory event ledger with an interactive timing overview: pure-consumer plugin registering into the conversation ViewMap (no service) |
| `@singula-ai/alego-client-ui-user-questions` | no | Web ask_user_question composer takeover and plan-review presentation UI |
| `@singula-ai/alego-client-ui-workflow-run` | no | Durable workflow-run Conversation Node and nested member disclosure for alego web |
| `@singula-ai/alego-client-ui-workspace` | no | Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state workspace slots |

## compaction

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-command-compact` | no | Human-facing slash command for explicit session compaction |
| `@singula-ai/alego-compaction-basic` | yes | Token-meter-driven compaction policy and LLM summarization backend for the Alego |
| `@singula-ai/alego-compaction-image-offload` | no | Durable image offload for image-capable routes: replace over-budget request images with placeholders and retry |
| `@singula-ai/alego-compaction-tool-result-pruner` | yes | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes |

## computer-use

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-computer-use` | no | Exclusive named computer-use provider registration |

## context

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-agent-instructions` | yes | Workspace context loader for AGENTS.md/CLAUDE.md instruction files |
| `@singula-ai/alego-file-reference-local` | yes | Local-filesystem ctx.fileReferences provider with bounded fuzzy indexes |
| `@singula-ai/alego-session-reference` | yes | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) |
| `@singula-ai/alego-time-context` | yes | Durable per-step context with the current time and elapsed time |
| `@singula-ai/alego-tmux-context` | yes | Opt-in durable per-step context with this agent's tmux pane and window location |

## core

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-agent` | no | Agent interface, registry, initiator scope, and event vocabulary for the Alego |
| `@singula-ai/alego-agent-default-model` | yes | Default model selection shared by Agent entry points |
| `@singula-ai/alego-agent-loop` | yes | The concrete agent loop plugin for the Alego |
| `@singula-ai/alego-agent-tool-presentation` | yes | Agent-plane presentation selector: composes one agent's tools as PTC mode, native, or both |
| `@singula-ai/alego-session` | no | Event-sourced session store for the Alego |
| `@singula-ai/alego-system-prompt` | yes | System prompt assembly registry for the Alego |
| `@singula-ai/alego-tools` | yes | Tool registry and execution pipeline for the Alego |

## credentials

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-authorization` | no | Authorization seam (ctx.authorization): plugin-owned flows that obtain a credential through a conversation with the human |
| `@singula-ai/alego-credentials-local` | yes | File-backed credentials provider ($ALEGO_HOME/.env under the live process environment) for the Alego |
| `@singula-ai/alego-deepseek-account-platform` | yes | Authorize DeepSeek accounts through browser PKCE |

## deliverables

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-tool-present` | yes | Explicit workspace file delivery declarations for the Alego |
| `@singula-ai/alego-workspace-changes` | yes | Per-turn workspace file changes recorded from git working-tree snapshots and whole-file captures, with per-file comparisons, for the Alego |

## document

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-office-to-pdf` | yes | Shared Office-to-PDF conversion with bounded queues and caching |

## experimental

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-experimental-agent-team` | yes | Implicit-root Agent Teams roster, durable peer mailbox, and shared task DAG |
| `@singula-ai/alego-experimental-api-speech-to-text` | yes | Authenticated experimental speech transcription for browser clients |
| `@singula-ai/alego-experimental-auto-review` | no | Per-tool LLM authorization review for the Alego Auto permission preset |
| `@singula-ai/alego-experimental-browser-use-chrome-devtools-mcp` | yes | Experimental per-Session Chromium browser tools through chrome-devtools-mcp |
| `@singula-ai/alego-experimental-browser-use-playwright-mcp` | yes | Experimental per-Session Chromium browser tools through @playwright/mcp |
| `@singula-ai/alego-experimental-browser-use-stagehand-native` | yes | Experimental Stagehand browser tools with separately configured native models |
| `@singula-ai/alego-experimental-client-ui-agent-team` | no | Web Agent Teams roster, task board, and teammate navigation |
| `@singula-ai/alego-experimental-client-ui-voice-input` | no | Record speech and insert editable text into the conversation draft |
| `@singula-ai/alego-experimental-computer-use-cua-driver-mcp` | yes | Experimental computer use through an installed Cua Driver MCP executable |
| `@singula-ai/alego-experimental-computer-use-cua-driver-native` | no | Experimental computer-use provider embedding the Cua Driver native npm SDK |
| `@singula-ai/alego-experimental-inspector` | yes | Experimental cross-realm CDP hub for Host debugging and Client Runtime inspection |
| `@singula-ai/alego-experimental-ptc-runtime-python` | yes | CPython subprocess implementation of the Alego PTC execution seam |
| `@singula-ai/alego-experimental-speech-to-text` | yes | Experimental speech recognition with independently selectable providers |
| `@singula-ai/alego-experimental-speech-to-text-sensevoice` | yes | Local SenseVoice ONNX transcription with a managed sherpa-onnx process |
| `@singula-ai/alego-experimental-tool-agent-team` | yes | Scoped model-facing Agent Teams tools over ctx.agentTeams |

## extensions

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-client-ui-cordis` | no | Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch |
| `@singula-ai/alego-cordis-client-runner` | no | Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation, guard facade, and loader entries |
| `@singula-ai/alego-cordis-host-runner` | yes | Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table for model-mounted dual-half packages |
| `@singula-ai/alego-tool-cordis` | no | Read-only runtime API inspection for Harness plugin development |

## feedback

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-command-feedback` | no | Log-only session feedback: the record event, the sessionFeedback Host Remote, and the human-facing slash command |
| `@singula-ai/alego-message-feedback` | yes | Canonical Session-log ratings and notes for finalized assistant messages |

## fs

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-fs-local` | yes | Local-filesystem implementation of the Alego filesystem seam (ctx.fs) |
| `@singula-ai/alego-fs-observation-policy` | no | File-context policy plugin for the Alego — observed-state, read-before-edit, and version-guarded write/edit added over the ctx.fs provider seam through the fs/* event gate (no service API) |
| `@singula-ai/alego-fs-sandbox` | yes | Sandbox-enforcing implementation of the Alego filesystem seam: fences write/edit by the per-call sandbox mode (read-only denies mutation, workspace-write contains it to the workspace + temp roots) while reads pass through |
| `@singula-ai/alego-tool-fs` | yes | Model-facing filesystem tools (read, write, edit) over the Alego filesystem seam (ctx.fs) |
| `@singula-ai/alego-tool-fs-search` | yes | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) |
| `@singula-ai/alego-tool-str-replace-editor` | yes | Model-facing view, create, literal replace, and line insert tool over the Harness filesystem service |

## goal

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-command-goal` | no | Human-facing slash command for persisted same-session goals |
| `@singula-ai/alego-goal` | yes | Event-sourced same-session goal state and lifecycle service for the Alego |
| `@singula-ai/alego-goal-round-driver` | no | Race-fenced same-session goal-round driver |
| `@singula-ai/alego-tool-goal` | yes | Model-facing same-session goal tools with execution-time authority checks |

## guard

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-repeat-tool-reminder` | yes | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls |
| `@singula-ai/alego-tool-call-timeout-policy` | no | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns TOOL_TIMEOUT when it wins |

## hooks

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-hooks-claude-code` | yes | Bridge plugin: run a Claude Code hooks.json / settings hook config on the Alego interception seams |
| `@singula-ai/alego-hooks-codex` | yes | Bridge plugin: run a Codex hooks.json hook config on the Alego interception seams |

## host

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-host-directory-picker-auto` | no | Adaptive chooser of the directory-picker seam: resolves the host situation at boot and mounts the native or browse backend for the Alego web GUI host |
| `@singula-ai/alego-host-directory-picker-browse` | yes | In-app browsing backend of the directory-picker seam (listing/creation primitives over the host filesystem) |
| `@singula-ai/alego-host-directory-picker-native` | no | Native-OS-chooser backend of the directory-picker seam for the Alego web GUI host |
| `@singula-ai/alego-host-frontend-static` | yes | SPA dist server for the Web shell: owns the webserver fallback seat, serving explicit index entries and static assets with traversal rejection and 404 misses |
| `@singula-ai/alego-host-open-in-app` | yes | Host half of open-in-app: resolved application catalog, icons, and the launch endpoint as three webServer routes |
| `@singula-ai/alego-host-plugin-inventory` | no | Read-only Remote projection of current Cordis Loader plugin state |
| `@singula-ai/alego-host-product-telemetry-otel` | yes | Explicit product usage events exported through OpenTelemetry HTTP logs |
| `@singula-ai/alego-host-webserver` | yes | Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback; knows no harness concepts |

## interaction

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-commands` | no | Plugin-owned human command registry for Alego UIs |
| `@singula-ai/alego-permission-presets` | yes | User-facing permission presets (ctx.permissionPresets) for the Alego: one product-level Permissions select bundling the sandbox-mode and approval-policy knobs, written through to their own session events |
| `@singula-ai/alego-tool-ask-user` | no | Model-facing ask_user_question tool over the ctx.userQuestions seam |
| `@singula-ai/alego-user-approval` | yes | User-approval seam (ctx.approval) for the Alego: one-shot permission decisions dispatched to composed answerers over the approval/request waterfall, fail-closed by default |
| `@singula-ai/alego-user-questions` | no | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs |

## jobs

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-jobs-local` | yes | Process-local implementation of the Alego background job registry seam |
| `@singula-ai/alego-tool-jobs` | yes | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry |

## llm

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-deepseek-llm-api-extensions` | no | Additive request-field registry for the official DeepSeek LLM API adapter |
| `@singula-ai/alego-llm` | no | Provider-neutral LLM service interface for the Alego |
| `@singula-ai/alego-llm-deepseek-account` | yes | DeepSeek account provider authentication and discovery |
| `@singula-ai/alego-llm-deepseek-api-key` | yes | DeepSeek api-key provider authentication and discovery |
| `@singula-ai/alego-llm-pi-ai` | yes | pi-ai-backed DeepSeek adapter for the Alego LLM seam (design-verification twin of alego-llm-deepseek) |
| `@singula-ai/alego-llm-retry` | yes | Provider-routed LLM request retry policy for the Alego |
| `@singula-ai/alego-plugin-package-inventory-deepseek` | yes | Active Loader-backed plugin package inventory for official DeepSeek LLM API requests |
| `@singula-ai/alego-token-meter` | yes | Replay-aware token measurement service (ctx.tokenMeter) for the Alego |

## lsp

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-lsp` | no | Abstract LSP capability seam (ctx.lsp) for the Alego — language-server provider registry keyed by branded id and extension mapping, order-independent per-query selection, normalized definition/references/implementation/hover requests and results, and the LspError taxonomy |
| `@singula-ai/alego-lsp-stdio` | yes | Generic stdio language-server provider for the Alego LSP capability seam (ctx.lsp) — spawns configured servers, translates JSON-RPC, and serves transient-open goToDefinition/findReferences/goToImplementation/hover queries in the host filesystem namespace |
| `@singula-ai/alego-tool-lsp` | yes | Model-facing lsp tool over the Alego LSP capability seam (ctx.lsp) — one read-only tool with goToDefinition/findReferences/goToImplementation/hover operations, one-based UTF-16 cursor coordinates, bounded location rendering, and hover normalization |

## mcp

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-mcp-client` | yes | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools |
| `@singula-ai/alego-mcp-resources` | no | Scoped MCP resource discovery and reading through shared model tools |

## plan

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-plan-mode` | yes | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit |

## preset

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-agent-preset` | yes | Declare an Agent capability composition in Cordis YAML |
| `@singula-ai/alego-agent-preset-registry` | yes | Declarative Agent preset registry and profile-backed editing |
| `@singula-ai/alego-persona` | yes | Composition-authored deployment persona section for the Alego |

## ptc-runtime

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-ptc-runtime-node` | yes | Sandboxed Node process implementation of the Alego PTC execution capability |

## runtime-diagnostics

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-invariants` | yes | Registry service for package-owned Alego runtime invariants |

## sandbox

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-sandbox-local` | yes | Local process-sandbox backends for the Alego sandbox seam: bwrap, the npm-distributed landlock-run launcher, macOS Seatbelt, or the Windows ACL restricted-token runner — functionally probed, fail-closed |
| `@singula-ai/alego-sandbox-policy` | yes | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode and workspace root, shared by every enforcing capability family |

## schedule

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-schedule` | yes | Host-wide durable reminders with shared management and original-Session delivery |

## sdk

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-sdk-jsonrpc-server` | yes | Stdio JSON-RPC server plugin for out-of-process Alego SDK clients |

## session

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-session-checkpoint-policy` | no | Semantic session durability checkpoints before model requests and tool side effects |
| `@singula-ai/alego-session-log-deepseek` | yes | Incremental lossless session-log request extension for the official DeepSeek LLM API |
| `@singula-ai/alego-session-persistence-jsonl` | yes | JSONL durable session persistence backend for the Alego |
| `@singula-ai/alego-session-projection` | no | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.sessionProjections registry serving whole current values of log-derived per-session state |
| `@singula-ai/alego-session-projection-cache` | yes | Persisted projection cache (ctx.sessionProjectionCache): durable per-session checkpoint records on the session_projcache storage domain (per-record layout), throttled write-behind, and the cached listing read |
| `@singula-ai/alego-session-stats` | no | Whole-log conversation counts and wall times projection (sessionStats) for the Alego |
| `@singula-ai/alego-session-telemetry-otel` | yes | Feedback-authorized Session logs over byte-bounded OpenTelemetry HTTP requests |
| `@singula-ai/alego-session-title` | yes | Log-backed session title service and provider registry for the Alego |
| `@singula-ai/alego-session-title-all-prompts-llm` | yes | All-user-messages LLM provider plugin for Alego session titles |
| `@singula-ai/alego-session-title-first-prompt-llm` | yes | First-message LLM provider plugin for Alego session titles |
| `@singula-ai/alego-session-turn-outline` | no | Whole-log turn outline projection (turnOutline) for the Alego |

## session-query

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-session-log-export` | yes | Web Session-log export command and shared download dialog |
| `@singula-ai/alego-session-query-sqlite` | yes | Concrete ctx.sessionQuery backend with SQLite FTS5 search |
| `@singula-ai/alego-tool-session-query` | yes | Workspace-authorized model-facing session history search, trace, and event read tools |

## settings

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-settings` | no | Abstract user-settings seam (ctx.settings) for the Alego |

## shell

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-bash-local` | yes | Local-subprocess implementation of the Alego bash executor seam |
| `@singula-ai/alego-bash-sandbox` | yes | Sandbox-consuming implementation of the Alego bash executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| `@singula-ai/alego-pwsh-local` | yes | Local PowerShell implementation of the Alego bash executor seam |
| `@singula-ai/alego-pwsh-sandbox` | yes | Sandbox-consuming implementation of the Alego PowerShell executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| `@singula-ai/alego-shell-env` | yes | Tool-independent managed ALEGO_* shell environment registry |
| `@singula-ai/alego-tool-bash` | yes | Model-facing bash tool with optional generic background-job and sandbox-escalation support |
| `@singula-ai/alego-tool-bash-persistent` | yes | Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service |
| `@singula-ai/alego-tool-pwsh` | yes | Model-facing pwsh tool over the bash executor seam |
| `@singula-ai/alego-tool-pwsh-persistent` | yes | Model-facing owner-scoped persistent PowerShell tool backed by the Harness PTY service |

## skill

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-skill` | yes | Agent skill provider registry for the Alego |
| `@singula-ai/alego-skill-badge` | no | Bundled alego badge skill provider for Alego |
| `@singula-ai/alego-skill-filesystem` | yes | Local filesystem skill provider for the Alego |
| `@singula-ai/alego-skill-office` | yes | Bundled Word, PowerPoint, and Excel workflows and structural checks |
| `@singula-ai/alego-tool-skill` | yes | Model-facing skill loading tool for the Alego |
| `@singula-ai/alego-tool-workspace-dependencies` | yes | The load_workspace_dependencies tool: absolute paths into a bundled Python, Node.js, and pnpm payload |

## spill

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-spill-local` | yes | Local-filesystem implementation of the Alego spill storage seam (private session-scoped files) |
| `@singula-ai/alego-spill-policy` | yes | Token-budgeted tool-result retention with recoverable text and image paths |

## ssh

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-fs-ssh` | no | Filesystem provider over the shared POSIX SSH helper |
| `@singula-ai/alego-sandbox-ssh` | no | Remote POSIX sandbox argv provider over the shared SSH helper |
| `@singula-ai/alego-ssh` | yes | Shared OpenSSH connection and versioned POSIX remote helper |
| `@singula-ai/alego-subprocess-ssh` | no | Subprocess and terminal provider over the shared POSIX SSH helper |

## storage

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-storage` | no | Storage hub (ctx.storage): named backend registry plus mounted data-form facilities for the Alego |
| `@singula-ai/alego-storage-domain` | yes | Domain data form (ctx.storage.domain): schema-validated, event-emitting KV domains over storage backends for the Alego |
| `@singula-ai/alego-storage-json` | yes | JSON file KV storage backend for the Alego storage hub |
| `@singula-ai/alego-storage-sqlite` | yes | SQLite storage backend (kv facet) for the Alego storage hub |

## subagent

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-subagent` | yes | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents |
| `@singula-ai/alego-subagent-acp` | yes | Out-of-process ACP subagent backend: drives a child agent in a spawned subprocess over the Agent Client Protocol |
| `@singula-ai/alego-subagent-alego-sdk` | yes | Out-of-process SDK subagent backend: drives a child Alego runtime subprocess over stdio JSON-RPC through the TypeScript SDK client |
| `@singula-ai/alego-subagent-claude-code` | yes | One-shot Claude Code subagent provider over the official Agent SDK |
| `@singula-ai/alego-subagent-codex` | yes | One-shot Codex subagent provider over the official app-server protocol |
| `@singula-ai/alego-subagent-fork-in-process` | yes | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log |
| `@singula-ai/alego-subagent-spawn-in-process` | yes | In-process spawn subagent backend: runs a fresh child agent on ctx.agents |
| `@singula-ai/alego-tool-subagent` | yes | Model-facing subagent delegation tool over the ctx.subagents seam |
| `@singula-ai/alego-tool-subagent-control` | no | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations |

## subprocess

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-subprocess-local` | no | Local-subprocess implementation of the Alego subprocess seam |

## telemetry

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-otel` | no | Cordis service for independent ordinary-event and byte-bounded Session-log OTLP channels |

## terminal

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-terminal` | no | Persistent PTY session seam for the Alego — owner-scoped ids, backend registry, interactive sends, reads, signals, and awaited cleanup |
| `@singula-ai/alego-terminal-bash` | yes | Persistent shell PTY backend over the Alego subprocess terminal primitive |
| `@singula-ai/alego-tool-terminal` | yes | Six model-facing persistent PTY tools with owner isolation and generic background-job integration |

## test-support

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-llm-replay` | yes | Replay LLM plugin: short-circuits llm/stream with model chunks reconstructed from a recorded session JSONL (keyless snapshot tests) |

## todo

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-tool-todo` | yes | Model-facing todo_write tool over the Alego event-sourced session log |

## typert

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-typert-loader` | yes | Loader integration for generated Typert package contributions |

## web

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-tool-web` | yes | Model-facing web tools (web_search, web_fetch) over the Alego web capability seam (ctx.web) |
| `@singula-ai/alego-web` | yes | Abstract web access capability seam (ctx.web) for the Alego — search/fetch provider registry, registration-order-independent selection, request/result vocabulary, and the WebError taxonomy |
| `@singula-ai/alego-web-fetch-http` | yes | Anonymous public HTTP(S) fetch provider for the Alego web capability seam (ctx.web) |
| `@singula-ai/alego-web-search-deepseek` | yes | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the Alego web capability seam (ctx.web) |
| `@singula-ai/alego-web-search-exa` | yes | Exa-backed search provider for the Alego web capability seam (ctx.web) |
| `@singula-ai/alego-web-search-perplexity` | yes | Perplexity-backed search provider for the Alego web capability seam (ctx.web) |

## webhook

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-webhook` | no | Fire-and-forget webhook rule runtime that creates Workspace-backed Alego Sessions |
| `@singula-ai/alego-webhook-github` | yes | Signed GitHub HTTP webhook adapter for the Alego webhook runtime |

## workflow

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-tool-ralph` | yes | Model-facing fresh-agent Ralph loop over the workflow and subagent seams |
| `@singula-ai/alego-tool-workflow` | yes | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine |
| `@singula-ai/alego-workflow-ptc` | yes | Workflow orchestration in the shared sandboxed Node PTC runtime |

## workspace

| Package | Config | Description |
|---|---|---|
| `@singula-ai/alego-workspace` | no | Workspace entity registry (ctx.workspaceRegistry): durable workspace records with validated session attachment over the domain data form for the Alego |
