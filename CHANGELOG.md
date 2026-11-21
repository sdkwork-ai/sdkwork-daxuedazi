# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」按该 tag 区间内的实际提交归纳并注明来源（上游尚未发布该版 Release notes 时如此处理）；「BirdCoder 本次更新」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.7（fork 同步 2026-11-19）

本版本发布 fork 版本线 **0.2.2-rc.7**（tag `sdkwork-daxuedazi-v0.2.2-rc.7`），内容为 `deepseek-ai/deepseek-harness` **0.2.2-rc.5** 的完整合入（经上游 `sdkwork-birdcoder2` 合并指针 `7ebcb9add8`）。上游版本线是 **0.2.2-rc.5**（tag `dsh-v0.2.2-rc.5`）；相对上一合并基底 `68cd0b637e`（rc.4 合并点）本次上游新增 **249 个提交（其中 149 个非 merge 功能/修复提交）、1064 个文件变更**（+23051 / −10933）。全部随真实双亲 merge commit 入树，未 squash、未 rebase、未 cherry-pick，上游 commit message 与代码注释逐字保留。fork 侧本地 105 个提交（品牌、SDKWork 组件、依赖与打包修复）同时保留。2026-11-20 再次从上游 `sdkwork-birdcoder2` 同步：合并基底 `7ebcb9add8` → `daa4abe6ebc`，新增 17 个提交（含 tag `birdcoder-v0.2.2-rc.5`），同样以真实双亲 merge commit 合入，上游 commit message 与代码注释逐字保留；同日第二轮再合入 2 个提交（`daa4abe6ebc` → `51d3091c28`，打包链路修复与 changelog），同样为真实双亲 merge commit。

### 上游变更（deepseek-harness 0.2.2-rc.5）

上游尚未以 Release 正文形式发布该版说明，以下按 `git log 68cd0b637e..7ebcb9add8` 的实际提交主题归纳。

#### 会话、SQLite 与持久化

* 并发 SQLite 提交合并为单组事务（`perf(session): commit concurrent SQLite batches as one group`），每次提交后让出事件循环（`fix(session): yield the event loop after each SQLite commit`），并补齐分组提交与失败隔离的测试（`test(session): cover SQLite group commits and failure isolation`）。
* Session 存储保持 SQLite 主线，连接恢复时序改为通过 synced Config 字段下发，页面注入路径随之调整（见「客户端与连接」）。

#### Forge、代码审阅与 Worktree

* 新增**代码审阅页面**（`feat(forge): add the code review page`）：列出当前登录用户的 change request、读取描述、审阅列表支持搜索、状态以块（blocks）呈现、读取期间以骨架行占位（`feat(forge): draw the review lists as skeleton rows while they are read`、`show the review summary's status as blocks`、`search the review lists under the client search rule`）。页面客户端文件独立成目录（`refactor(forge): keep the code review page's client files in a folder of their own`）。配套文档、主题门禁修复、共享代码与测试落地。
* 审阅列表以紧凑视图呈现，审阅评论可引用进聊天输入（`feat(forge): add a compact review list view and quote review comments into the chat`）；变更视图移除已保存的评论卡片（`fix(forge): remove saved comment cards from the changes view`），页面停止展示时释放审阅会话（`fix(forge): release the review conversation when the page stops showing it`）。
* 仓库菜单始终列出全部仓库（`fix(forge): keep offering every repository in the review page's repository menu`），状态折叠箭头方向修正（`fix(forge): point the status fold's chevron up when it folds`），审阅 tab 顺序与事件图/插件清单随配置刷新（`fix(forge): name the review tab order outside the copy rule and regenerate event graphs and the plugin package list`）。
* worktree 的 Git 目录不再被沙箱策略按布局推断，改由配置与 `registerWritableRoot` 授予（`refactor(sandbox-policy): read no Git layout; grants come from configuration and registerWritableRoot`）；worktree 维护以源 checkout 为界（`fix(sandbox-policy): bound worktree maintenance by the source checkout`），forge worktree 阻断项计入 sandbox grant（`fix(deliverables): … count sandbox grants in the forge worktree blocker`）。

#### 客户端、连接与会话面板

* Host 配置改为通过 synced plugin Config 以 page-global 方式下发（`refactor(client): deliver page-global Host configuration through synced plugin Config`），Remote 链使用连接 synced Config（`fix(client): pass the connection synced Config in the built Remote chain …`）；等待注入的插件配置表达式在注入完成前不发布 synced 值（`fix(client-modules): publish no synced values while a pending plugin's config expression awaits an injection`）。账户联系人表单固定在本页全局（`fix(client): keep the account contact form on its page global …`）。
* 每个内容实例独立处理 Workspace 选择（`refactor(ui-conversation): let each content occurrence handle a Workspace pick`），embedded Workspace pick 以单一受检步骤交接（`fix(conversation): hand an embedded Workspace pick over in one checked step`）。
* 侧栏面板行新增行尾内容（trailing content）：按标题之后排布、悬停/聚焦时让位给取消固定操作、窄栏显示在图标右上、不可含交互元素（`feat(sidebar): show trailing content on panel rows`、`fix(ui-sidebar): rest panel trailing content at the row's end and swap it for the unpin action on hover`、`fix(sidebar): lay panel trailing content out after the title like a Session row`）。fork 的 IM 面板快捷入口过滤行为保留。
* 新增 shared title marquee 与 embedded hero 选项（`feat(client): add panel row trailing content, embedded hero options, and a shared title marquee`）；HeroShell 新增 `headline` 覆盖文案（fork 侧仍渲染静态 BirdCoder 鸟标，见「BirdCoder 本次更新」）。
* 连接恢复时序由页面注入改为 synced 字段声明：配置声明浏览器恢复时序、不再向页面注入（`test` 中明确 `injects nothing into served pages`），NaN 恢复系数的校验理由写入文档。fork 侧仍保留自身页面注入与 API 网关 fallback（见冲突处理）。

#### 交付物、工作区与沙箱

* 变更文件路径改为相对该轮开始所在目录解析（`fix(deliverables): resolve changed-file paths against the turn's directory`）：summary 携带 `cwd`，客户端据此解析完整路径与 review tab 的 Sidebar 文件地址。
* workspace-root 校验 LSP root、丢弃未读取的原目录并修复 CI 输入（`fix(workspace-root): validate the LSP root, drop the unread original directory, and repair CI inputs`）；workspace-write 边界指南与 Git 目录 grant 在 Windows 进程中的限制写入 upgrade guide。
* ui-sidebar-files 对持有查询的窗格移动到新 checkout 的搜索修正（`fix(ui-sidebar-files): search the checkout a held query's pane moves to`）。

#### 桌面、CUA 与安装器

* 开发态 Harness 状态移出 `.desktop-build`，改到 `.desktop-dev`，启动时迁移缺失目录并在运行中的 Harness Dev 占用时拒绝迁移（`fix(desktop): keep development Harness state out of .desktop-build`、`refuse to move state that a running Harness Dev owns`）；操作历史按精确文件身份去重、保留被 predecessor 读取会丢弃的段并上报已读段（`deduplicate history segments by exact file identity`、`keep operation history the predecessor read would drop`、`report read segments …`）。
* 安装完成提示在原生拖动/系统菜单期间延迟显示（`fix(desktop): show installer completion during native dragging`、`defer installer completion through system menus / until native move returns`）。追加的 predecessor 被跳过而非收集写入文档。
* CUA：Windows 实现窗口级鼠标按键切换、macOS 支持已批准的鼠标按键按住与独立按键事件（`feat(cua-windows): implement window-level mouse button toggles`、`feat(cua-macos): support approved system mouse button holds / send individual mouse button events to a window`）；修复窗口几何校验与按键接收者检查顺序、光标采样时机、turn 结束鼠标清理等待原生完成与撤销场景（`fix(cua-macos): sample the cursor after validating window geometry`、`check the press recipient before reading AX geometry`、`fix(cua): wait for native cleanup before the next request`）。
* Web：恢复持久化终端插件控制并注册快照（`feat(web): restore persistent terminal plugin controls`、`test(web): register the persistent terminal snapshot`）。

#### MCP、连接器、LLM 与工具

* `ctx.mcpManager` 重命名贯穿客户端/Host 与快照（`refactor: follow the ctx.mcpManager rename`），MCP client host 纳入快照组合，OAuth world 与 manager profile 由 `dsh-mcp-testkit` 提供。
* Linear / Notion 连接器：将 `src/copy.ts` 重命名为 `src/locales.ts`，账号通过共享 connector account registry 展示并在 Host 注册（`refactor(linear/notion): rename …`、`show the account through the connector account registry`、`register the account on the Host`）；快照与版本随 master 提示/工具文本刷新。
* Web 搜索默认模型切到 DeepSeek（`Merge PR #8707 … feat/web-search-deepseek-model-default`）。工具可达性与首次披露提议写入 agent-notes。
* 重复提醒排除嵌套调用（`fix(guard): exclude nested calls from repeat reminders`）。

#### 工程、版本与文档

* 根版本与 master-only 包对齐到 `0.2.2-rc.5`（`chore(release): align master-only packages to 0.2.2-rc.5`），发布提交 `release(dsh): 0.2.2-rc.5`；bundle 的 English 标题改为句首大写、Plugins 页增加 feature preview。
* 大量 snapshot/文档/upgrade guide 刷新（mcp-tool-loading、linear、notion、终端、liveshare 等），module graph 随 sandbox-policy 与 workspace-changes 边重生成，README 字数上限按栈同步后复位。

### BirdCoder 本次更新

#### 同步与冲突处理

* 合并基底 `68cd0b637e` → `7ebcb9add8`（249 个上游提交、1064 个文件变更），以真实双亲 merge commit 合入，保留全部上游 commit message 与代码注释。**490 个文件**存在冲突，按 fork-first 规则逐项解决：
  * **475 个 `package.json`**：仅版本行冲突（fork rc.7 / upstream rc.5 / base rc.4）。fork 的 `0.2.2-rc.7` 是已发布版本线（tag `sdkwork-daxuedazi-v0.2.2-rc.7`），领先于上游 rc.5，全部保留 fork 版本以避免倒退并满足家族版本门禁；非冲突区自动合入的上游依赖变更全部保留，475 个文件 JSON 校验全部合法。
  * **15 个真实冲突**：`EmptyHero.tsx` 采纳上游 `headline` 覆盖文案，同时保留 fork 的静态 `BirdLogo` headlineText 结构（上游 fish hover-morph 死状态不引入）；`tsdown.client.ts` 取上游 `INLINE_SAFE` 超集（含 fork 的 `plugin-market-index/source` 与上游新增的 `dsh-api-session-controller/client/directories`）；`ui-workspace` 的 `slots.ts` 保留 fork 对 `requestWorkspaceAction` 的注释、`WorkspaceBrowser.tsx` 保留 fork 的 row-menu seam、`tree.ts` 保留 fork 精确的 session-scoped `cwd` 定义；4 个 deploy 测试保留 fork 的 `deployApplicationId: '1001'`；测试 mock 采纳上游更完整的 `requestWorkspaceAction` 行为。
  * SDKWork 自有组件（`ui-sdkwork-*`、`sdkwork-*` Host/Bundle、`ui-sdkwork-iam` 登录步骤等）与品牌表面（`BirdLogo` / `BirdWordmark` / `LoginPanel` / favicon / 图标 / 标语）全部保留 fork 版本。
  * 子模块 `dsh-better-sidebar` / `dsh-mcp-connector`：fork 指针是上游指针的后代（已含上游改动且更新），保留 fork 较新版本。
* 合并后全仓扫描无冲突标记残留；品牌契约保持：`BirdLogo` / `BirdWordmark` / `LoginPanel`、favicon 与安装包图标、daxuedazi 安装身份与 IAM scheme 均为当前仓库版本。
* **同步完整性复核**：`git merge-base` 为 `68cd0b637e`，upstream 指针 `7ebcb9add8`，249 个上游提交随真实双亲 merge commit 全部合入；所有改动均为上游自身演进，无 fork 自定文件误删。

#### 版本与依赖

* fork 版本线维持 **0.2.2-rc.7**（tag `sdkwork-daxuedazi-v0.2.2-rc.7`）；上游本次推进到 **0.2.2-rc.5**（tag `dsh-v0.2.2-rc.5` / `birdcoder-v0.2.2-rc.5`），随上游发布线同步，版本线不倒退。
* `pnpm-workspace.yaml` 的 27 条 `@michengai/dsh-agency-agents>@deepseek-ai/dsh*` 覆盖行保留 fork 的 rc.7 pin；`pnpm-lock.yaml` 保留 fork 的 workspace 链接与 SDKWork sibling importer 块（本地开发走 `pnpm-workspace.yaml` 的 `../sdkwork-*` 相对路径 + `workspace:*`，CI/release 走 `agent.workflow.json` 声明、`scripts/sdkwork-sources.manifest.json` pin 的 git 仓库 checkout，两者同源）。
* SDKWork 生态 pin 本次沿用 fork 已推送的 `main`：`sdkwork-cloudrouter`（`07ff220`，第二轮同步随上游前移到 `1c3763e8`，见下节）、`sdkwork-deployments`（`eb9279ec`），并保留上游新增的 `sdkwork-shop`（`a4a2e686`）与 `sdkwork-inventory`（`f8b294e8`）两条 pin。云端路由与部署控制台新增的 `@sdkwork/{shop,inventory,deployments}-backend-sdk` 依赖已 join workspace 成员并在 `tsconfig.base.json` 建映射（重复的同值映射行已去重），`Dockerfile` / `Dockerfile.debug` 同步带 `sdkwork-ecosystem` 复制行。
* `plugins/sdkwork-dsh-agents` 子模块由 `2d317ce`（1.2.26）前移到 `a2911f0`（1.2.34 镜像同步），并把新版新增的 `@deepseek-ai/dsh-error@0.2.2-rc.3` 依赖补进 lockfile；不同步时 `pnpm install --frozen-lockfile` 直接报 `ERR_PNPM_OUTDATED_LOCKFILE`。
* 新增 `plugins/dsh-market` 子模块（`e8dc3529`，`dsh-market` 的 SDKWork fork；第二轮同步前移到 `b7d62fd`，见下节），host 半侧由 `scripts/build-dsh-market.mjs` 从子模块 `src/` 编译，浏览器半侧 `client/client.js` 由子模块提交，本仓不重新生成（详见下节）。

#### 子模块本地改动（随本次一并提交）

* `plugins/sdkwork-deepseekbot` 推进到 `05d0e36b5`：采纳 ADR-0310，新 profile 的 Simple Messages 默认打开 Subpanel 列（Sessions 展开），一次性存储标记迁移旧记录且不覆盖用户主动关闭；同步 bot-mode-dock 验证技能与布局测试。

#### 合并后的 fork 变更（2026-11-19）

合入 rc.5 之后 fork 侧在同一版本线上继续推进的自有能力（`ff72ca4f20..9d00779d7a`，13 个提交；依赖与 pin 的调整已记入上节）。上游代码与提交记录不受影响。

* **输入框历史（新包 `ui-sdkwork-input-history`）**：记录 Host 已接受的普通消息到浏览器本地存储，输入框裸 ↑/↓ 回溯——↑ 走向更旧一条、↓ 走向更新并在越过最新一条后恢复被中断的草稿，新一轮回溯只在草稿的询问边界开始（`feat(client): add the composer input history section and share the input contract`）。设置页「输入历史」可选范围（本会话 / 本项目 / 本浏览器全部会话）、保留窗口（默认 30 天）并可清空缓存；关闭开关即停止记录与回溯，账本保留至清空或过期。历史按浏览器配置存放，不跨账号或机器同步。输入契约与召回后的光标行为写入 README 与 agent-note（`docs(client): describe the caret behaviour inside a recalled input-history entry`）。
* **设置菜单 shell store**：新增对话框可见性、当前分区与待揭示 provider 路由的共享 store，让轨道之外的表面——会话失败行的「去配置」手势——能在自己的分区打开设置对话框；悬停菜单的展开状态仍是组件内查看状态（`feat(client): add the settings menu store and its slot wiring`）。
* **缺失凭据修复接到会话失败行**：失败行给出缺失凭据的修复入口，`ui-settings` 模型分区按 `focusProvider` 定位并高亮对应 provider 行，普通导航清掉该定位；chat 视图测试补上动作归属的收窄（`feat(client): surface missing-credential fixes on the chat failure row`、`test(client): narrow the turn-error action owner through the slot cast`、`test(client): cover the missing-credential action flow in the chat view`）。
* **欢迎页登录交棒新 workspace boot**：`ui-sdkwork-iam` 只在 overlay 条目渲染、store 动作绑定完成后接管模态动作，冷启动换票或回调失败因此有表面可呈现——用户看到失败原因与恢复动作，而不是匿名工作区；登录完成以新的 workspace boot 启动（`feat(desktop): hand the welcome sign-in to a fresh workspace boot`）。
* **插件市场 fork 落地**：`plugins/dsh-market`（`dsh-market` 的 SDKWork fork）作为 pin 住的子模块接入，host 半侧由 `scripts/build-dsh-market.mjs` 从子模块 `src/` 编译出被 gitignore 的 `lib/`；判鲜按内容哈希而非 mtime，`postinstall` 与 `build:artifacts` 新增 `dsh-market` 闸门并排在 `host-src` 之后（其 `tsc` 要对本仓 `vendor/cordis`、`vendor/schemastery` 的输出做类型检查）。浏览器半侧 `client/client.js` 仍由子模块提交，本仓不重新生成（`feat(birdcoder2): fork the plugin market and finalize the composer input history section`）。
* **HMR 恢复 `pluginEvents` 流**：客户端在一个 client entry 里重新同步 Host 插件图与 synced 配置，插件启停与配置变更不刷新页面即生效，代码重建替换受影响插件；独立的 transport / events 模块及其 fallback 规格移除（`fix(client-hmr): finish the pluginEvents stream restoration`），`tsconfig.client.tests.json` 直接引用 hmr 的 client project（`fix(birdcoder2): reference the hmr client project from the client-tests face`），two-face 包改为单侧解析后重跑各自规格（`docs(fork-sync): resolve two-face packages from one side and rerun their specs`）。
* **翻译配对门禁覆盖子模块**：`.gitmodules` 的 `path` 被解析进排除范围（`parseGitmodulePaths` / `isSubmodulePath`），子模块工作树内的双语文档在其所在仓库翻译，本仓不再要求 sidecar；新增包 README 与 agent-note 补规格（`fix(birdcoder2): guard the gitmodule path capture against a missing group`）。
* **桌面运行时冒烟**：Office 转换的两条冒烟路由从 `fetch` 换成 `node:http`——undici 在响应头 300 s 未到时就抛裸 `TypeError: fetch failed`，使 `OFFICE_CALL_TIMEOUT_MS` 与引擎自身的 `timeoutMs: 600000` 都轮不到决定；`node:http` 无默认超时，只由该客户端预算兜底，慢 runner 于是「慢但成功」，失败时也报得出路由与预算（`fix(desktop): outwait the Office engine instead of fetch's 300 s header ceiling`）。

#### 本次上游同步（2026-11-20，`7ebcb9add8` → `51d3091c28`）

* 从 `sdkwork-birdcoder2` 分两轮合入 19 个上游提交（对应 tag `birdcoder-v0.2.2-rc.5`），均以真实双亲 merge commit 入树，未 squash、未 rebase、未 cherry-pick，上游 commit message 与代码注释逐字保留：
  * 第一轮 17 个（`7ebcb9add8` → `daa4abe6ebc`）：工作区版本 bump、backend SDK sibling pin 映射、composer 输入历史、设置菜单 shell store、缺失凭据修复接入会话失败行、欢迎页登录交棒新 workspace boot、插件市场 fork、HMR `pluginEvents` 恢复、翻译配对门禁覆盖子模块、Office 冒烟换 `node:http`，以及两份 changelog 提交。能力细节已在上文「合并后的 fork 变更（2026-11-19）」逐项归纳。
  * 第二轮 2 个（`daa4abe6ebc` → `51d3091c28`）：打包链路修复与 changelog，见下节。
* 上游 changelog 的当前版本内容已并入本节（不叠加历史版本）：本文件仍只保留 rc.7 一个 `##` 版本节。

##### 第二轮上游：重打包前的修复（`9089061d62` / `51d3091c28`）

本次按 `birdcoder-v0.2.2-rc.5` 重打包，版本线不变；打包链路上有两处会必然失败的问题在本轮修掉，另把四个子模块 pin 前移到各自已发布版本。

* **插件市场的 `prepare` 在干净 checkout 上必失败**：`plugins/dsh-market` 的 `prepare` 原来跑完整 `build`，其 `tsc` 要解析 `@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery` 的 `lib/types`——这两者是 Host 编译器的产物，干净 checkout 上尚不存在，`pnpm install` 于是在 `plugins/dsh-market prepare` 阶段直接 `TS2307`（`Cannot find module '@deepseek-ai/cordis'`）。六条打包 lane 与 `Release (dsh)` 的 Dependency layout 都停在这一步。fork 侧改为 emit-only（`tsc -p tsconfig.json --noCheck`，与 `scripts/build-dsh-market.mjs` 的干净 checkout 模式一致），`prepack` 与 `check` 仍保留类型检查构建；安装期也不再重写已提交的 `client/client.js`（`sdkwork-dsh-market` `b7d62fd`）。
* **云路由新控制台包缺映射**：`sdkwork-cloudrouter` 新增 `@sdkwork/cloudrouter-pc-console-vm-instances`（VM 实例与硬件市场控制台），`pc-console-shell` 已 import 其 `/contribution`，但本仓 `tsconfig.base.json` 没有对应映射，`verify-sdkwork-dependencies` 在打包第一步就失败（`… maps no @sdkwork package root for it`）。按既有 `/*` 形制补映射，并把 `sdkwork-cloudrouter` 的 pin 前移到已推送的 `origin/main` `1c3763e8`——旧 pin 里还没有这个包，release checkout 中不会存在被映射的源文件。两处 pin 记录（`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json`）同步更新。本地仍走 `../sdkwork-*` 相对路径，release 走 pin 的 git checkout。
* **子模块 pin 前移**：`dsh-mcp-connector` `v0.2.113` → `v0.2.117`；`dsh-ui-usage-billing` `1.8.4-sdkwork.3` → `1.8.8-sdkwork.1`（#123 压缩调用计入统计、缓存写入独立计价，#124 动效作用域，#125 中转站模型 id 归一与未收录模型补价，#126 通道可见性，#127 兜底账本行键归一与按日补价）；`sdkwork-deepseekbot` `ef40c579` → `05d0e36b`（新配置默认展开 Simple Subpanel 列）；`dsh-market` `e8dc352` → `b7d62fd`。`pnpm-lock.yaml` 只随之改写两个 importer：56 条 `@deepseek-ai/dsh-*` pin `0.2.2-rc.1` → `0.2.2-rc.3`，以及 mcp-connector 的 `undici ^6.29.1`、`zod ^4.6.6`。
* **本地 Windows 打包验证**：`package:win:x64:unsigned` 在 win-x64 上通过——安装包与 zip 产出，运行时冒烟跑到 CLI 离线插件装卸、Office 技能加载与 DOCX/XLSX/PPTX→PDF 转换全绿，`stage-desktop-artifacts.ts` 按发布契约收出 3 个资产（`.exe` / `.zip` / `latest.yml`）。

##### fork 侧完整性校验

* fork 侧功能与品牌未被覆盖：`BirdLogo` / `BirdWordmark` / `LoginPanel` / favicon / 安装包图标与 BirdCoder 图标标语均为当前仓库版本；SDKWork 自有组件（`ui-sdkwork-*` / `sdkwork-*`）、设置菜单产品条目（无云端控制台行）、daxuedazi 安装身份与 IAM scheme 全部保留。
* 冲突按 fork-first 规则逐项解决：第一轮 92 个（79 个仅版本行的 `package.json` 保留 rc.7，13 个真实冲突合并双方行为，`tsconfig.base.json` 自动合入产生的两条同值重复映射已去重）；第二轮 6 个（`.gitmodules` 的 mcp-connector 版本注释、`agent.workflow.json` 与 `scripts/sdkwork-sources.manifest.json` 的 cloudrouter pin、`pnpm-lock.yaml` 的 5 处 rc.1 陈旧块与 zod `4.4.3`→`4.6.6`、`plugins/dsh-mcp-connector` 子模块 gitlink、本 changelog）。无文件误删：本轮上游未删除任何文件，仅新增一条 `tsconfig.base.json` 映射。
* 子模块 pin 校验（前移方向均为 fork 现有指针的后代，无 fork 改动丢失）：`dsh-market` `e8dc352` → `b7d62fd`；`dsh-mcp-connector` `11af59ab`（v0.2.113）→ `98f1f38`（v0.2.117）；`dsh-ui-usage-billing` → `fd0468c`（1.8.8-sdkwork.1）；`sdkwork-deepseekbot` → `05d0e36b`。`sdkwork-cloudrouter` pin `07ff220` → `1c3763e8` 同为后代，且 `1c3763e8` 才含 `pc-console-vm-instances` 包。

##### fork 侧发布收口：打包链路与 CI 修复（2026-11-20）

本版按 `sdkwork-daxuedazi-v0.2.2-rc.7` 重新打包并更新发布：tag 前移到本次同步后的 `main`，`container-release.yml` 重新产出全部 31 个资产（6 个桌面目标、2 个容器镜像、Compose/K8s bundle、`SHA256SUMS` 与 `latest*.yml`），GitHub Release 正文就是本节内容（不累积历史版本）。打通链路时修掉的问题：

* **每条 lane 首步 `pnpm install --frozen-lockfile` 失败（`ERR_PNPM_OUTDATED_LOCKFILE`）**：根 `package.json` 的三个 workspace 依赖（`@deepseek-ai/dsh-mcp-manager`、`dsh-linear`、`dsh-notion`）只进了 manifest、没有进 lockfile 的根 importer；同时 `pnpm-workspace.yaml` 的 `dshmarket>` 三条 override 仍钉在 `0.2.2-rc.5`，而 workspace 已到 `0.2.2-rc.7`，安装报 `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`。override 升到 rc.7 并重算 lockfile 后 `pnpm install --frozen-lockfile` 通过——这是 `CI master`、`Release (dsh)`、`Release (vendor)`、`Sandbox`、`E2E`、`Node Addon System` 六条 workflow 全部失败的同一个根因。
* **`agent.workflow.json` 重复依赖**：`sdkwork-shop` 与 `sdkwork-inventory` 在 `dependencies[]` 各出现两次（合并双方各留一份，其中 inventory 那份还是旧 ref `f8b294e8`），`verify-sdkwork-dependencies` 直接失败、打包第一步即中止。按 manifest 去重为 42 条，每条 ref 与 `scripts/sdkwork-sources.manifest.json` 逐一相等。
* **`desktop-package-target.yml` 工作流文件非法**：job 级 `env` 里 `SDKWORK_DEPLOY_APPLICATION_ID` 写了两次（一次读 `vars`、一次写死公开 app id），重复键让 GitHub 判定文件非法，六条桌面 lane 全部在启动前被拒（run 显示 0 秒失败）。合并为一条 `${{ vars.SDKWORK_DEPLOY_APPLICATION_ID || 'app_01a18…' }}`，变量缺省时仍有可用的公开身份。
* **`SessionNode` 缺 `cwd`**：`ui-workspace` 的类型定义在上游同步中丢了 `cwd?: string`，而 `Rows.tsx` 用 `node.cwd` 渲染行菜单与悬停卡，`tsc` 报 3 处 `TS2339`。补回该字段（构造处本来就在写入 `cwd`，只是接口没声明）。
* **`settings.launcher` 声明了不渲染的子 slot**：上游新增的 `ui-account-notifications` 给 `settings.launcher.notifications` 指定 owner 契约后，`AccountMenu`（fork 侧不渲染通知条）注册时仍声明该 child，`tsc` 报 `TS2769`（`children declared but the component consumes no renderSlot`）。按 `06a97f4f97` 的既定决策删掉该声明；通知条仍由 `AccountNotices` 在 `settings.notice` 下渲染。
* **`dsh-client-hmr` 丢 `dsh.client.external`**：其 `src/client/index.ts` 从 `@deepseek-ai/dsh-api-gateway/client` 取值，但 package.json 的 `dsh.client` 块在上游同步中丢了 `external` 声明，客户端打包的 purity 门禁因此拒绝该解析。补回后 client bundle 通过。

第二轮（`Sandbox` 失败项）：

* **`.gitignore` 的 staging 规则误伤子目录**：`.env.standalone.staging` / `.env.cloud.staging` 两条忽略规则没有根锚定，除仓库根的私有文件外，也把 `apps/sdkwork-birdcoder2-{pad,h5,pc}/.env.standalone.staging` 一起挡在版本库外——这三个文件由 `pnpm workflow:materialize-client-env` 生成、内容只有公开占位令牌，于是 CI checkout 后每个应用的 10 个环境矩阵文件都只剩 9 个。两条规则改为 `/` 锚定，三个文件一并入库。
* **pad 环境矩阵测试仍按已废弃的三段命名断言**：`apps/sdkwork-birdcoder2-pad/tests/config/config.spec.ts` 自 pad 应用族引入后未再更新，仍要求 `.env.<profile>.<environment>.tablet-android`（`62cbdce890b` 已按 ENVIRONMENT_SPEC §5.1.7 取消第三段命名），并把公开面令牌 `SDKWORK_ACCESS_TOKEN` 当成秘密键。改为断言 10 个两段命名文件、`VITE_SDKWORK_RUNTIME_TARGET` 取仓库基线 `tablet-ipados`（Android 由 `scripts/tablet.mjs` 在调用时注入），公开令牌按 `alg: none` + `token_class: application` + `user_id: 0` + `permission_scope: ["iam:self"]` 白名单校验。
* **桌面打包 lane 的部署应用 ID 会被仓库变量带偏**：`desktop-package-target.yml` 原来写的是 `vars.SDKWORK_DEPLOY_APPLICATION_ID`，而该变量当前值 `381158476182720512` 并不是 IAM 为本次部署绑定的 runtime application id（`2026-11-12-pinned-production-bootstrap-token.md` 记录的权威值是 `app_01a18b4f-6f61-7ff1-b86c-75b54995883f`，其他值一律 `40103`）。同一条链路上 `container-release.yml`、`release.yml`、`e2e.yml`、`sandbox.yml`、`debug-docker.yml` 传的都是字面量，只有桌面六目标会拿到另一个身份，产物里的引导令牌会被 IAM 抑制、表现为桌面端无法登录。三个 workflow 的该变量统一为同一字面量。
* **`dsh-better-sidebar` 子模块落后一个提交**：`plugins/dsh-better-sidebar` 跟的是 `dev`，落后 `8d48469a`——该提交去掉了 Session Sources 目录项里 `dsh-better-sidebar@0.29.0` 那一半安装命令，否则会在 web profile 已加载侧栏的前提下再装一份。其余七个子模块（`dsh-im`/`dsh-market`/`dsh-mcp-connector`/`dsh-skill-market`/`dsh-ui-usage-billing`/`sdkwork-deepseekbot`/`sdkwork-dsh-agents`）逐一比对各自分支头，behind=0。
* **`Sandbox` 的 darwin 单测在 60 分钟上限处被截断**：上游套件在快跑机器上 16 分钟完成、最慢观测到 20 分钟过半，所以原上限是 60。本 fork 的矩阵比上游大（`sdkwork-birdcoder2-{pad,h5,pc}` 三族加 SDKWork 插件包），run 44600532136 到 60 分钟时已通过 2,505 / 3,434 个 spec 文件、仍在持续打 ✓（不是卡死），按外推约需 82 分钟。上限提到 120，保留同样的余量而不是把一次绿色运行截断。
* **`Release (dsh)` 的 `verify-npm-install-layout` 已成死门禁**：run 44600532460 在 npm 里耗满 42.5 分钟的挂起守卫仍未走完，本地复跑同样在 42m55s 处触发同一守卫；而 `MAX_RESOLUTION_WORK_UNITS` 的规模判定自始至终没有触发——耗尽的不是图大小的余量，是墙钟时间。这个检查按设计要在两个互不兼容的 DSH 版本间走 2.4M 个工作单元的 npm 解析，图上去了就不可能几分钟跑完。处理：守卫倍数由 4 提到 12（≈127 分钟，规模预算不变，仍由 `MAX_RESOLUTION_WORK_UNITS` 决定图是否过大），并把该门禁从每次 push 的 `Release (dsh)` 迁到独立的 `npm-install-layout.yml`（每日 03:17 UTC + 手动触发，job 上限 240 分钟）。`Release (dsh)` 只保留秒级的清单级依赖策略校验。
* **mac-x64 桌面目标在 XLSX 转换上撞上引擎上限**：run 44620605332 里六个桌面目标中五个成功（win-x64、win-arm64、mac-arm64、linux-x64、linux-arm64），只有 Intel 的 mac-x64 在 `prepare:dsh` 的运行时 smoke 处报 `OfficeKitError: LibreOffice conversion timed out`——DOCX 与 PPTX 已通过，XLSX 用尽了每操作 600 秒的上限，而 arm64 机器上全部 Office 操作 17 秒完成。这是同一个上限第四次为 Intel runner 让路（60 s → 180 s → 600 s → 现在），所以引擎 `timeoutMs` 提到 1200000，打包 smoke 的客户端预算同步提到 1260000（必须始终高于引擎上限，否则客户端先放弃，历史上 240 s 就是这样踩的）。上限只界定「挂了多久才放弃」，不影响成功路径。
* **三个 `package.json` 残留 merge 重复键，连带 479 个单测失败**：`Sandbox` 的 darwin 单测里有 479 个测试挂在同一处——esbuild 加载 `apps/web/vite.config.ts` 时对 `package.json:382` 报 `Duplicate key "@deepseek-ai/dsh-skill-office"`，Vite 随即 `failed to load config`，所有依赖该配置的用例一起失败。重复来自合并时双方各留一份：根 `package.json` 11 对（`dsh-skill-office`、`dsh-tool-workspace-dependencies`、`dsh-working-directory`、`dsh-experimental-worktree`、`dsh-experimental-tool-worktree`、`dsh-cua-bundle`、`dsh-experimental-subagent-oar`、`dsh-experimental-tool-subagent-oar`、`dsh-experimental-forge`、`dsh-experimental-forge-github`、`dsh-experimental-forge-session`），`packages/bundle/web-app` 1 对（`dsh-client-ui-context-menu`），`packages/experimental/client-ui-forge` 5 对（`dsh-timeout`、`dsh-session-projection-cache`、`dsh-session-query`、`dsh-api-remote-access`、`@types/picomatch`）；每对的取值都相同，删掉多余那份即可。全仓 487 个 `package.json` 复查后重复键为 0，`pnpm install --frozen-lockfile` 仍通过（键集合未变）。

部署期可覆盖的配置项（本版打包产物复核）：

* 容器/Compose：监听端口 `DSH_WEB_PORT`、宿主发布地址 `DSH_PUBLISH_HOST`/`DSH_PUBLISH_PORT`、数据与工作区目录 `DSH_DATA_DIR`/`DSH_WORKSPACE_DIR`、对外权威 `DSH_TRUSTED_HOSTS`、镜像 `DSH_IMAGE`，以及 `DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY` 透传；入口会校验端口为 1–65535。
* Kubernetes：`service.port`、`runtime.allowedOrigins`、`image.digest`（生产要求不可变摘要）、`secret.example.yaml` 提供的凭据键。
* 数据库：按 SDKWork 规范统一走 `SDKWORK_DATABASE_*`（主机级档位 `config/host/postgres.env`，样例见 `config/host/postgres.env.example`）。本版本运行时无 Redis 依赖，因此没有 Redis 配置面。
##### 上游 changelog 当前版本：2026-11-20 再打包

本次仍在 `0.2.2-rc.5` 版本线上，把 tag 之后合入 main 的 IAM deep-link loopback policy 与 access-token bootstrap 纳入正式包，并只前移真正前进的 git submodule。

* **子模块前移**：`dsh-mcp-connector` `e762e57` → `ed9ea13`（v0.2.118 + 实时 locale 修复与 GilData MCP bridge）；远端 `main` 相对旧 pin 是快进，依赖集合未变，因此 `pnpm-lock.yaml` 的 importer 无需改写。`dsh-better-sidebar` 保持 `aa2a058`：远端 `main` 的 `2811573` 实际是它的祖先，移动会造成倒退并丢掉已合入的 editor 修复。
* **依赖管理**：本地仍由 `pnpm-workspace.yaml` 的 `../sdkwork-*` 相对路径与 `workspace:*` 解析，release 仍由 `agent.workflow.json` 与 `scripts/sdkwork-sources.manifest.json` 的 git pin checkout 解析；没有把任何本地路径写进 release 依赖。
* **本地 Windows 打包验证**：`package:win:x64:unsigned` 在 win-x64 上通过，产出 `BirdCoder-0.2.2-rc.5-win-x64.exe` / `.zip` / `latest.yml`；冒烟覆盖 CLI 离线插件装卸、Office 技能加载与 DOCX/XLSX/PPTX→PDF 转换，全部通过。

##### 上游 changelog 当前版本：2026-11-21 IAM 兑换与启动锚点修复

同一 `0.2.2-rc.5` 版本线，纳入 tag 之后合入 main 的 IAM 登录与 access-token 修复，并撤掉一处会让 release 工作流在 CI 必然失败的前置门禁。

* **桌面兑换信封**：`ui-sdkwork-iam` 的 V3 会话创建调用从 `sdkworkUnwrapKind: 'data'` 改为 `'item'`，与生成的 `oauth.desktopSessions.create` 一致（`{"code":0,"data":{"item":{...}}}`）；此前把 `{ item: session }` 交给会话校验器，会把成功兑换误判为不完整会话。登录失败提示优先显示服务端/传输层 `detail`，固定摘要 `message` 退为兜底；失败日志保留原始 error，便于按状态码、问题码与 trace id 与 IAM 服务端日志对齐。
* **启动锚点**：`admin:bootstrap:app` 从 `scripts/sdkwork-app-bootstrap.mjs` 迁到 `scripts/bootstrap/bootstrap-app.mjs`，支持 `--deploy-application-id` / `SDKWORK_DEPLOY_APPLICATION_ID` 覆盖 manifest 回退值，使 access token 的 `app_id` 与部署自身应用一致（provision → enable → access-credential）。本地新增 `check:architecture` 三项校验（IAM application bootstrap、access-token lifecycle、embedded bootstrap workspace audit），均针对 `sdkwork-specs` 规范，本地全绿。
* **CI 门禁纠正**：`release:verify` / `release:pack` 曾被前置 `check:release-access-token:require-anchor`。该脚本依赖 CI 未 checkout 的 `../sdkwork-specs/tools/...`，且要求构建后才材料化的应用锚点，放在 `release:verify`（Build 之前）会在干净 checkout 上必然失败；已撤销这两处前置，锚点校验保留为本地按需执行的脚本，不影响 release 打包链。
* **依赖管理**：本地仍由 `pnpm-workspace.yaml` 的 `../sdkwork-*` 相对路径与 `workspace:*` 解析，release 仍由 `agent.workflow.json` 与 `scripts/sdkwork-sources.manifest.json` 的 git pin checkout 解析；根 importer 的 98 个 devDependency 与 lockfile 逐项一致，没有把本地路径写进 release 依赖。
* **本地 Windows 打包验证**：`package:win:x64:unsigned` 在 win-x64 上通过，产出 `BirdCoder-0.2.2-rc.5-win-x64.exe` / `.zip` / `latest.yml`。

##### 本次上游同步（2026-11-21，`51d3091c28` → `da26a7b896`）

从上游 `sdkwork-birdcoder2` 再同步 **15 个提交**（合并基底 `51d3091c28` → `da26a7b896`，**315 个文件变更、+17901 / −335**），仍以真实双亲 merge commit 合入：未 squash、未 rebase、未 cherry-pick，上游 commit message 与代码注释逐字保留。上游本批无删除文件。

* **IAM 访问令牌与登录链路**：新增应用访问令牌初始化（`scripts/bootstrap/bootstrap-app.mjs`，支持 `--deploy-application-id` / `SDKWORK_DEPLOY_APPLICATION_ID` 覆盖 manifest 回退值，`provision → enable → access-credential` 三步落地）与永久应用访问令牌（`2026-11-20-permanent-application-access-token`、`2026-11-20-sdkwork-access-token-initializer`）。桌面端新增 IAM 回环重定向策略与深链中继（`iam-loopback-policy.ts` / `iam-loopback-protocol.ts` / `iam-loopback-redirect.ts` / `iam-deep-link-relay.ts`，记录见 `2026-11-20-deeplink-login-multi-process-handoff`）：回环默认关闭，由 OEM profile 的 `sdkwork.iamLoopbackRedirect: true` 或 `DSH_DESKTOP_IAM_LOOPBACK=1` 开启，关闭或壳拒绝监听时回退自定义 scheme。`agent.app.config.json` 的 `redirectUris` 因此新增 `http://127.0.0.1:0/auth/callback`（fork 侧 `daxuedazi://auth/callback` 保留）。
* **About 面**：新增 `ui-sdkwork-about` 包与桌面 `about-command.ts`（`sdkwork:about:open` / `sdkwork:about:takePending` 两通道），应用菜单与设置菜单的 About 行都改为打开页面内的同一份 About 设计与安装身份面（`2026-11-21-about-installation-identity`），不再走原生面板或 Electron 消息框；菜单项的 `role: about` 随之退场。fork 设置菜单接入 `openAbout` / `aboutAvailable`，其产品行裁剪（无帮助、反馈、角色与兴趣、云端控制台行）保持不变。
* **发布与校验链路**：`release.yml` / `container-release.yml` 增加 `repair` 判定，并把访问令牌锚点前置门禁从 `release:verify` / `release:pack` 撤下（依赖 CI 未 checkout 的 `../sdkwork-specs/tools/...`，放在 Build 之前必然失败）；`verify-npm-install-layout` 改为一律**剥离 glue DSH 边**（`stripGlueDshEdges`）而不是改写范围，npm 挂起守卫回到由规模预算派生的 4×（上游实测同一张图剥离后 223 s 出结论，fork 侧的 12× 分支随之退场）；`npm-verify` 的浏览器输入断言按 DSH runtime 边收窄、EBUSY 清理容忍；dual-release layout lane 会自带 deadline 上报；桌面打包冒烟的 LibreOffice 超时改为可重试。
* **env 矩阵**：上游为 `standalone` / `cloud` 两个 profile 补齐 `staging` 与桌面应用的 `.env.<profile>.<environment>` carrier（根目录与 `apps/desktop/` 各 10 份），`.gitignore` 相应撤掉 staging 忽略规则——发布 lane 不再缺 carrier。
* **子模块**：`dsh-mcp-connector` `a3b1d9a`（v0.2.117）→ `78a2976`（v0.2.119，installed connection layout 修复 + 实时 locale），`dsh-skill-market` `6901769`（v2.1.0）→ `14be569`；两者都经 `git merge-base --is-ancestor` 校验为 fork 现有指针的后代，属快进，无 fork 改动丢失。
* **conflict 处理（26 处，fork-first + 双方行为同时保留）**：`.gitignore` 采用上游「每个 profile 均入库」，并把 fork 曾踩到的「unanchored staging 规则误伤 `apps/sdkwork-birdcoder2-{pad,h5,pc}/.env.standalone.staging`」写进注释；`desktop-package-target.yml` 保留 fork 的 `app_01a18b4f-…` 字面量（上游新增的同键 job-env 条目会让 workflow 非法）；`container-release.yml` 同时保留 fork 的 `prefix` 输出与上游的 `repair` 输出；三份 `apps/sdkwork-birdcoder2-*/.env.standalone.staging` 保留 fork 的占位令牌；桌面 `about-panel` / `application-menu` 期望快照保留 fork 的「学伴AI」标签并跟随上游去掉 `role: about`；`main-startup.spec.ts` 采用上游的 About 桥接断言；`ui-sdkwork-iam` README 合并 `daxuedazi` scheme 与上游回环说明；设置菜单 5 个文件保留 fork 的行裁剪并接入 About；`sdkwork-oem` 两处期望保留 `daxuedazi` 身份并补 `iamLoopbackRedirect: false`；`pnpm-lock.yaml` 的 `react-router-dom` 采用上游 `^7.15.0` / `7.18.5`（与兄弟仓 `sdkwork-deployments` 的声明一致）。
* **完整性校验**：fork 的品牌与 SDKWork 自有组件仍为当前仓库版本（`BirdLogo` / `BirdWordmark` / `LoginPanel` / favicon / 安装包图标与标语、`ui-sdkwork-*` / `sdkwork-*`、daxuedazi 安装身份与 IAM scheme）；上游本批未删除文件，合并亦未误删；本文件仍只保留 rc.7 一个 `##` 版本节。

本文件只保留当前版本一节；往期条目随各自版本的提交留在 git 历史里（`git log -p CHANGELOG.md`）。Release notes 就是本节内容。
