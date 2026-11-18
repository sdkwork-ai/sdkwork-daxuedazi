# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」按该 tag 区间内的实际提交归纳并注明来源；「BirdCoder 本地变更」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、依赖、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.7（2026-11-18）

本版本发布 fork 版本线 **0.2.2-rc.7**（tag `sdkwork-daxuedazi-v0.2.2-rc.7`），内容为 `deepseek-ai/deepseek-harness` **0.2.2-rc.4** 的完整合入（经上游 `sdkwork-birdcoder2` 合并基底 `68cd0b637e`），加上合并后的修复、依赖收敛与打包发布链路修复。上游版本线仍是 **0.2.2-rc.4**（tag `birdcoder-v0.2.2-rc.4`）；相对上一合并基底 `949381a6ba`（rc.3 合并点）本次上游新增 **818 个提交、3259 个文件变更**（+97938 / −34600），全部随真实双亲 merge commit 入树，未 squash、未 rebase、未 cherry-pick，上游 commit message 与代码注释逐字保留。

### 上游变更（deepseek-harness 0.2.2-rc.4）

* **会话与持久化**：Session 存储切到 **SQLite** 并在打开时导入旧 JSONL，frame size 变成插件设置；按配置选择 frame 压缩、并发解码、事件以压缩 frame 存储；修正会话缓冲窗口（先消费已到达的较旧页）、符号链接目录下的具名 Session、SQLite WAL 初始化争用重试；客户端重做会话保留策略（未渲染不折叠、保留最近访问、断连与缺口修复一致）；等父前缀持久化后创建共享 fork。
* **账号、鉴权与凭据**：新增 DeepSeek 请求鉴权并随发行元数据进入 Python runtime 闭包；凭据层接管 API Key 合法性检查，account 包独立承载登录与仅限 Host 的请求凭据；移除路由失败时的 sdk-server 回退鉴权，mcp-client 在路由准入前应答 OAuth 回调。
* **Forge、Worktree 与插件**：变更请求在 Session 面板以紧凑卡片呈现，可读取、审阅并绑定 GitLab merge request；`create_worktree` 合并进 `enter_worktree`；插件管理器以变更结果的 application 状态作为重启权威，`list_plugins` / `set_plugin` 支持原地重载提示；tool-cordis 向插件作者暴露运行中的 DSH 版本。
* **Skills、Subagent、LLM 与工具**：新增 upstream-skills 连接插件（首次下载才加载 node-tar）；subagent 每次调用读取模型选择设置并隔离读取失败；llm-deepseek 新增 `safetyCheck` 开关、默认请求内容安全检查、拒答不走安全复核；新增 tool-session-list 与 action-cards 回答内卡片；CUA 增加 `toggleMouse` 与 Windows 初始支持；liveshare 在 Electron Node 模式启动 tunnel worker。
* **UI、调度与桌面**：侧栏图标与间距统一、拖到边缘自动滚动、滚动条 500ms 淡出；模型选择前景色统一（fork 保留 BirdCoder 排首位的品牌排序）；每周回顾限定用户自己的日程并推荐任务，jobs 分组超五行折叠、活跃任务优先；插件设置进入 Plugins 页，客户端支持从上下文菜单添加文件引用；app-boot 修正 include 路径与配置快照隔离。

### 合并后的修复（fork）

* **合并冲突**：404 个冲突文件按 fork-first 规则解决——387 个仅版本行的 `package.json` 保留 fork 版本，5 个复杂清单逐项三方合并；`ui-sdkwork-sidebar` 的 OEM 感知 `shippedHiddenEntryIds()`（应用商店 / 模板库 / 需求大厅三个入口）与 `cordis.patch.yml`、demand-hall / sidebar / template-library 的 README 与 i18n 配对保留 fork 侧。
* **fork 组件完整性**：上游产品性删除的 `ui-sdkwork-template-library` 整包从 fork 侧恢复（26 个源码 / 配置 / 测试文件）；`BirdLogo` / `BirdWordmark` / `LoginPanel` / favicon / 安装包图标 / 标语、`ui-sdkwork-*` 组件、daxuedazi 安装身份与 IAM scheme 均保持当前仓库版本。
* **工作区与构建修复**：恢复 `@deepseek-ai/dsh-client-config`、`@deepseek-ai/dsh-client-ui-session-panel` 的包名（rename 错配曾让 `SyncedConfigValues` 丢失），据此重建 `pnpm-lock.yaml`；`ui-workspace` 去掉重复的 `cwd` 成员、补回 `ShortcutCatalogEntry` 类型、把 Workspace 重命名 / 删除动词改由新的 `requestWorkspaceAction` 注入面承载；`ui-settings-account` 的 AccountMenu 不再渲染 `settings.launcher.notifications`（该子槽由 `settings.notice` 声明，双亲声明会在注册期抛错）；`hmr` 恢复 `src/events.ts` 并声明 `eventsource-parser`；`tsdown.client.ts` 与 `webworker-runtime` 去除重复的 `INLINE_SAFE` 定义、`noExternal` 与重复的 `plugins` 键；根 `package.json` 去掉重复的 `@deepseek-ai/dsh-action-cards` 键；`ui-sdkwork-automation` 与测试聚合改为引用 `ui-workspace` 的项目 tsconfig。
* **CHANGELOG**：按单版本策略重写，只保留当前版本条目。

### 依赖与供应链

* **依赖源**：本地开发按 `sdkwork-specs` 的约定用相对路径（`pnpm-workspace.yaml` 的 `../sdkwork-*` workspace 成员）解析 SDKWork sibling；发布/CI 由 `.github/actions/setup-sdkwork-siblings` 按 `scripts/sdkwork-sources.manifest.json` 从各仓库 git 克隆同一份代码。
* **清单收敛到 main**：38 个 pnpm sibling 与 2 个 Cargo-only sibling 的 pin 全部推进到各自 `main` 头；唯一例外是 `sdkwork-appstore` 保持 `036dbd5a61`——其 `main` 已删除 `templates` 市场面（`chore(appstore): remove the retired template and plugin market surfaces`），而 fork 的模板库仍以该面为渲染入口，待上游提供替代面后再跟进。
* **submodule**：`plugins/dsh-better-sidebar`、`plugins/dsh-mcp-connector` 推进到各自分支头；`dsh-im`、`dsh-skill-market`、`dsh-ui-usage-billing`、`sdkwork-deepseekbot`、`sdkwork-dsh-agents` 已在 `origin/main`。
* **expert-market 覆盖**：`pnpm-workspace.yaml` 的 27 条 `@michengai/dsh-agency-agents>@deepseek-ai/dsh*` 覆盖同步到 `0.2.2-rc.7`，让 pnpm 链接 workspace 成员而不是拉取 registry tarball。

### 打包与发布

* **产物矩阵**：桌面 6 个目标（`win-x64`、`win-arm64`、`mac-x64`、`mac-arm64`、`linux-x64`、`linux-arm64`，未签名安装包）、容器镜像 `amd64` / `arm64` 离线归档，以及 Compose / Kubernetes 部署包；tag 触发 `Release (dsh artifacts)` 一次性打包并在同一 GitHub Release 发布。
* **Web 构建身份**：`apps/web/vite.config.ts` 拒绝提交在仓库里的 `__SDKWORK_DEPLOY_APPLICATION_ID__` 占位符，因此 `release.yml`、`container-release.yml`、`desktop-package-target.yml` 统一从仓库变量 `SDKWORK_DEPLOY_APPLICATION_ID` 注入安装的部署应用 ID（公开客户端身份，不落到 secret）。
* **host-only 包与 Client pass**：`ptc-runtime-node` 的 tsdown 配置以 Host 编译器产物（`lib/types/*.js`）为 entry，却同时参与 Client pass；一旦该目录在干净的 Linux 检出上不存在，Client bundle 门禁会以 `[UNRESOLVED_ENTRY] Cannot resolve entry module lib/types/index.js` 中止。现改用仓库既有的 `hostOnlyTsdownConfig` 约定，Client pass 跳过该包，Host pass 照旧发布四个 Node bundle。
* **本地验证**：Windows + Node 24.11.1 下 `pnpm run build:official` 12 个门禁全部通过（Host/Client 编译、bundle、Assistant 插件、Desktop bundle、Web build 等），产物记录 495 个 client artifact。

### 安装期可配置项

* **端口与监听**：`DSH_WEB_PORT`（容器内监听端口，1–65535）、`DSH_PUBLISH_PORT` / `DSH_PUBLISH_HOST`（宿主机映射，默认仅绑 `127.0.0.1`）、`DSH_TRUSTED_HOSTS`（浏览器 Host 白名单）。
* **数据与工作区**：`DSH_DATA_DIR`、`DSH_WORKSPACE_DIR` 可指向宿主持久化路径（留空则用命名卷）；`DSH_HOME` 内的 profile 决定存储后端（SQLite / JSONL）。
* **上下游与模型**：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_SEARCH_BASE_URL` 直传；`SDKWORK_DEPLOYMENT_PROFILE` / `SDKWORK_ENVIRONMENT` 选择 `etc/topology/<profile>.<environment>.env`，网关与 CORS 域名在该文件里按部署改写。
* **说明**：本产品不依赖外部 Redis 或独立数据库服务，会话状态落在 `DSH_HOME`（SQLite / JSONL），因此安装期没有 Redis / DB 连接串需要配置；如需共享后端，请通过 profile patch 挂载对应插件。
