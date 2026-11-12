# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.6（fork 发布 2026-11-12，基于上游同步 `bad40ca7cb`）

本轮为 rc.5 之后的迭代版本，交付一次完整上游同步后的首个发布构建：把 `sdkwork-ai/sdkwork-birdcoder2` 的 944 个提交（含其内部的 `deepseek-harness` 0.2.2-rc.2 合并，923 个提交）合入当前 fork，并在此基础上推进全部子模块与 SDKWork 兄弟仓库到各自 `main`，重新对齐锁文件、切版本并重跑全平台打包，同时保留 fork 自有的 SDKWork 组件、品牌与打包链路。

### 本次同步摘要（2026-11-12）

* **同步范围**：`sdkwork-ai/sdkwork-birdcoder2` 的 `70f1bfb22b` → `24e386c2c8`，共 **944 个上游提交、3595 个文件变更**（+115256 / −33733）。其中 `fa9a9ad3eb` 是上游自己的 deepseek-harness 合并（`e8f7b93a34`，923 个提交），因此本次同步把 `deepseek-harness` 0.2.2-rc.2 的全部改动一并带入。使用真实双亲 merge commit，上游提交记录、commit message 与代码注释逐字保留，未做 squash、rebase 或 cherry-pick。
* **冲突处理**：387 个冲突文件按 fork-first 规则解决——356 个 `package.json` 只有版本行冲突，一律保留 fork 的 `0.2.2-rc.5`（上游 `0.2.2-rc.2` 不覆盖 fork 发布线），其余字段完整采纳上游；7 个 `package.json` 的描述/改名冲突采用上游新描述与包名（`dsh-office-to-pdf` → `dsh-office-kit`）并保留 fork 版本号；共享源码、locale 与清单按语义合并（品牌字面仍为 fork 的 BirdCoder/学伴AI）。
* **采纳上游删除**：`packages/api/account-controller` 与 `packages/credentials/deepseek-account-platform` 已由上游 `d51d623bfc`（统一账号服务）删除，源码零引用，随上游删除；`packages/document/office-to-pdf` 跟随上游改名为 `office-kit`。同时清理 `packages/api/remotes` 与 `packages/bundle/web-app` 中指向已删包的失效 `workspace:*` 声明，使 workspace 可解析。
* **子模块**：`plugins/sdkwork-deepseekbot` 快进到上游 pin `9611a07b2`（`ac7c85d8a` 为其祖先）；上游新增的私有镜像 `plugins/sdkwork-dsh-agents`（专家市场，提供 `@michengai/dsh-agency-agents`）已初始化到 `e05cd2282a`。
* **文档与配对**：`AGENTS.md` 的 OEM 契约段落保留 fork 版本，上游新增的子模块镜像说明一并采纳；`ui-sdkwork-settings-menu` 中英文 README 补入上游的账号钱包卡（`settings.menu.plan`）描述；`plugins/README.zh.md` 补齐上游新增的专家市场、用量与费用看板、助理三节及「fork 自有例外」段，`ui-primitives` 中文 README 补入 `WideModal`、`Drawer` 两行与抽屉浮层层级限制条目；`scripts/translation-pairing.manifest.json` 把上游新增的两个私有镜像子模块（`plugins/dsh-ui-usage-billing/`、`plugins/sdkwork-dsh-agents/`）纳入排除项，与既有 `plugins/*` 子模块一致。全部 1487 对中英文配对已重录并通过 `pnpm run verify-translation-pairing` 校验。
* **后续步骤**：`pnpm-lock.yaml` 已按合并后的 `package.json` 重新规范化（`pnpm install --lockfile-only`），完整 `pnpm install` 与类型/测试门禁需在合并后单独执行。
* **子模块推进到最新**：`plugins/dsh-better-sidebar` → `v0.31.1`（`8d8592bb`，含超长单行 diff 卡死的线性高亮修复）、`plugins/dsh-mcp-connector` → `v0.2.101`（`ed73328a`，启信宝迁移恢复）、`plugins/sdkwork-deepseekbot` → `5f10691a`（机器人文案统一为「助理 / Assistant」）；其余子模块经检查已在最新发布 pin 上。
* **外部依赖对齐 `main`**：`scripts/sdkwork-sources.manifest.json` 一次推进 17 个 SDKWork 兄弟仓库（`sdkwork-sdk-commons`、`sdkwork-appbase`、`sdkwork-iam`、`sdkwork-appstore`、`sdkwork-cloudrouter`、`sdkwork-models`、`sdkwork-order`、`sdkwork-promotion`、`sdkwork-knowledgebase`、`sdkwork-drive`、`sdkwork-course`、`sdkwork-plugins`、`sdkwork-generations`、`sdkwork-community`、`sdkwork-feeds`、`sdkwork-agents`、`sdkwork-deployments`、`sdkwork-messaging`、`sdkwork-payment`、`sdkwork-web-framework`）到各自 `main` 最新提交，其余仓库已在最新；本地按相对路径解析、release 按 git 依赖解析的 sdkwork-specs 约定保持不变。
* **锁文件修复**：`pnpm-lock.yaml` 与兄弟仓库 `sdkwork-ui/sdkwork-ui-pc-react` 的 `lucide-react` 规格不一致（锁文件 `^1.31.0`、其 `main` 为 `1.7.0`），导致 CI 的 `pnpm install --frozen-lockfile` 报 `ERR_PNPM_OUTDATED_LOCKFILE`。本次按兄弟仓库**已提交的 main** 重新生成锁文件，`Release (dsh)`、`Release (vendor)`、`Sandbox`、`E2E` 四个工作流随之恢复可安装状态。

### 本轮增量同步（2026-11-12，`24e386c2c8` → `bad40ca7cb`）

* **同步范围**：上游该区间 **4 个提交、102 个文件变更**（+2446 / −452），使用真实双亲 merge commit 合入，上游提交记录、commit message 与代码注释逐字保留。
* **上游发布收敛**（`a146e8fad1`）：上游把自身 449 个 dsh 家族清单推进到 `0.2.2-rc.2` 并修复打包门禁。fork 发布线保持 **`0.2.2-rc.6`**：92 个 `package.json` 的版本行按 fork-first 保留，zod 统一到 `4.6.6`、`files` 数组取双方并集等其余字段完整采纳上游。
* **桌面 Office 组合交回上游**（`a146e8fad1`）：删除 fork 自有的 `apps/desktop-host/src/office.ts` 插件与 `ctx.plugin` 注册——Office 组合已由 `packages/bundle/web-app/cordis.patch.yml` 的 `office-kit` / `workspace-dependencies` / `skill-office` 三行承接，两处并存会让桌面 profile 重复挂载；`office-engine.ts` 的 ASAR 路径解析保留，打包运行时冒烟检查依赖它。`@deepseek-ai/dsh-office-to-pdf` 的残留声明同步清除。
* **测试桩修复**（`34a778b443`）：`ui-settings-account` 的 `menu()` 助手补上上游新增的必填 `renderSlot`，消除 `tsc -b tsconfig.client.tests.json` 的 TS2741。
* **兄弟仓库 pin 对齐**（`1a84d2812c`）：`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 的 20 个 pin 推进到各自 `origin/main`，锁文件随之收敛。
* **`@tanstack/react-query` 供给**（`bad40ca7cb`）：根 devDependencies 收入 `5.105.0`，修复 `@botharness/ui` 编译 `apps/mobile` 源码时 tsdown 无法内联该依赖、导致助理插件打包被拒；fork 侧同时在其 client 包声明该依赖。
* **子模块决策**：`plugins/dsh-better-sidebar` 保持 fork 已发布的 **v0.31.1**（`8d8592bb`）——上游 pin `95270afa` 位于未合并的 `origin/dev`，会丢失 v0.31.1 的 markdown 媒体能力；`plugins/sdkwork-deepseekbot` 取 fork 的 `80663d6dc`（上游 pin `5f10691a` 为其祖先）。
* **冲突处理**：95 个文件——92 个 `package.json` 版本行保留 fork 版本，3 个 controller 的 `files` 数组取双方并集（新增上游 `src` 条目），2 个包描述保留 fork 文案，`CHANGELOG.md`、`pnpm-lock.yaml` 与 2 个子模块按语义解决；品牌与图标字面（BirdCoder / 学伴AI、BirdLogo / BirdWordmark / LoginPanel）未受本次合并影响。

### 上游变更（deepseek-harness 0.2.2-rc.2）

以下逐字摘自上游 [v0.2.2-rc.2](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.2) 官方 Release notes 中文部分；英文版见该 Release 页面。

#### 新增功能

- Git Worktree 支持按分支、提交和文件类型审阅改动，并直接处理 GitHub 评审、同步已审阅进度和更新分支。 @LegGasai
- SubAgent 支持具名与多层协作，AgentTeam 可按会话开启，共用成员与任务面板。 @Dudu-0223, @Yifffan
- 桌面端支持在设置中切换正式版与开发版更新渠道。 @winewill

#### 体验优化

- 改善代码审阅时的评论、文件导航与窄屏布局，减少查看大型改动时的卡顿，并放宽大型仓库创建工作树的等待时间。 @LegGasai
- 改善多层子代理的浏览与任务协调，优先展示任务描述，支持逐层展开和读取失败后重试。 @Dudu-0223
- 优化左侧栏插件入口的收纳，不常用入口可移入“更多”，重新固定时保持原顺序。 @Yifffan
- 简化个性化页面安装后的操作，移除“保留”按钮，统一使用撤销与恢复。 @ZiyaZhang
- 改善自定义主题对通知、卡片、计划和任务等界面颜色的覆盖。 @turtle2099
- 改善页面缩放、平移及长列表场景下的菜单定位，保持菜单与触发位置对齐；自定义浮层需适配新定位接口。 @Stevring, @LegGasai
- 改善暗色模式下文件树浮层的显示，使用背景层次区分面板，避免白色投影。 @turtle2099
- 改善在侧栏查找文件的体验，支持按名称或路径搜索，并可调整排除规则与隐藏文件显示。 @yudshj
- 改善侧栏长列表的浏览与拖动体验，插件导航和会话列表共用滚动区域，工作区工具栏保持可见。 @Yifffan
- 优化从会话打开工作目录的操作，统一“在应用中打开”菜单，并改善窄屏使用体验。 @Yifffan
- 加快文件右键菜单的打开；关联应用查询较慢时，先提供默认应用入口。 @yudshj
- 向上回看聊天时自动加载更早消息，优先保持阅读位置，并保留手动加载和重试入口。 @imccyu
- 改善聊天过程的可查看性，可展开工作区指令、技能目录等信息，了解模型收到的上下文。 @turtle2099
- 改善补丁编辑的回执，折叠状态下也可查看修改的文件，并在成功后直接打开。 @sjw1231
- 优化会话首页的交互动画。 @ZiyaZhang
- 改善会话恢复或压缩后的上下文提示，明确当前运行信息与旧信息的替换关系。 @kermanx
- 改善聊天中代码差异的阅读，显示增删行颜色，并按文件语言高亮。 @mektpoy
- 改善粘贴图片和文件的体验，未聚焦输入框时也可粘贴到最近使用的可用输入框或主对话。 @std4453
- 改善暂停、恢复定时任务时的操作反馈，保持按钮焦点与显示稳定，避免重复操作。 @turtle2099
- 优化目标栏的操作排列与按钮间距，统一为“编辑、清除、暂停或恢复”。 @turtle2099
- 优化模型请求失败后的重试设置，可在模型设置中选择重试条件、次数和等待时间。 @turtle2099
- 改善临时请求失败后的恢复操作，可直接点击“继续生成”，无需另写消息。 @LegGasai
- 改善 API Key 的管理，已保存密钥以掩码显示，支持整体替换或清除，不显示完整旧密钥。 @Magolor
- 优化多问题检索，单次网页搜索默认支持最多 10 个查询和 10 个来源。 @turtle2099
- 改善 Agent 终端的可见性与接管体验，命令在侧栏终端运行，用户输入即可接管；允许读取的用户终端内容会进入模型与会话记录。 @LegGasai
- 优化批量查询文件、任务和资源时的执行效率，更多只读工具可并行运行，结果仍按调用顺序返回。 @turtle2099
- 改善桌面更新下载时的进度显示，可点击下载百分比或“检查更新”查看状态。 @winewill

#### 问题修复

- 修复 PR 更新后审阅差异与提交行号不一致的问题，并改善大量评审讨论的统计。 @LegGasai
- 修复只有 SSH 凭据时无法查看私有 Git 插件详情的问题。 @turtle2099
- 修复可选插件加载失败导致整个 Web 页面无法启动的问题；必需插件失败仍会提示。 @imccyu
- 修复已启用但未成功加载的插件容易被误认为正在运行的问题，明确显示“未运行”及原因。 @turtle1999
- 修复 PTC 中重复等待子代理消息时，同一条消息反复触发唤醒的问题。 @Dudu-0223
- 修复浏览特殊文件名或扩展名时，文件树视图崩溃的问题。 @LegGasai
- 修复“未分组”会话中显示无效“新建会话”按钮的问题。 @turtle2099
- 修复复制聊天公式时出现乱码的问题，同一条 Markdown 内容中的公式可复制为 TeX 源码。 @turtle2099
- 修复查看 Perl 代码时，正则表达式导致后续内容高亮错误的问题。 @turtle2099
- 修复聊天更新出错后，历史加载和新消息显示持续卡住的问题。 @Magolor
- 改善重复创建会话分支时的标题编号，跳过已用编号，减少同名会话。 @turtle2099
- 修复停止任务或关闭会话时，部分错误导致任务未中止或资源提前释放的问题。 @liukx0205
- 修复发送消息或准备附件期间重试请求，导致同一消息被重复提交的问题。 @liukx0205
- 修复中文目标栏混淆“待继续”与“已暂停”状态的问题。 @imccyu
- 修复桌面端多次启动后，因鉴权信息累积而无法启动的问题。 @turtle2099
- 修复 Windows 通过短路径启动命令行时，无法保存欢迎页确认的问题。 @winewill
- 修复 macOS 窗口拖动与粘贴快捷键问题，以及 Windows 暗色模式启动白闪。 @yxy72, @winewill, @turtle2099
- 改善 Windows 更新安装期间的反馈，显示安装状态窗口，减少重启过程中的无提示等待。 @winewill
- 修复移动端 Safari 在展开屏幕或切换视口后，聊天文字被额外放大的问题，保留用户主动缩放。 @Saafo
- 修复 Linux 存在长期后台进程时，会话加载与新建变慢的问题。 @turtle2099
- 修复会话中移除或替换工具后，部分模型拒绝继续请求的问题。 @Tuyixiang
- 通过 Anthropic Messages 接入时，历史前缀变化后省略失效的签名 thinking，减少压缩后持续请求失败。 @turtle2099
- 修复部分模型网关错误被误报为“API 密钥无效”的问题，使重试按实际响应状态处理。 @LegGasai
- 修复在 DSH 用户目录中配置 DeepSeek 端点后无法启动的问题；项目目录中的环境配置仍不能覆盖端点。 @LegGasai
- 修复连续浏览多页 PDF 时加载越来越慢、快速翻页卡顿的问题。 @turtle2099
- 修复使用 Inspector 查看较大的 Cordis 树时，快照接近上限可能导致服务退出的问题。 @turtle2099

#### 其他变更

- 网页搜索默认改用 DeepSeek Search API，搜索与获取可分别选择计费账号或 API Key；旧提供方和自定义配置需按升级指南调整。 @yudshj
- 归档会话默认清理符合条件的 Git 工作树，保留分支与提交；需保留本地目录时请关闭清理，自定义配置与 Forge 插件需迁移。 @LegGasai
- AgentTeam 改用统一的具名子代理，中断工具默认关闭；自定义插件与 SDK 集成需迁移，共享会话的进程须同步升级。 @Dudu-0223
- SDK 可通过配置为新会话默认开启团队协作，恢复已有会话时保留原选择。 @Dudu-0223
- 允许插件动态注册和移除 MCP 服务，并查询状态、重启或探测连接，无需用户逐项维护服务配置。 @LegGasai
- 插件可按语言扩展聊天代码块的显示，未匹配或渲染失败时回退为普通代码块。 @imccyu
- 插件索引可提供 GitHub Star 和 npm 周下载量，默认仍按索引提供的顺序排列。 @turtle1999
- Creator 的开发指引统一到 dsh-doc，用于定制 DSH 并查阅当前版本资料；引用旧技能名称或路径的扩展需迁移。 @turtle1999
- 自定义模型提供方支持 Gemini 原生接口，可获取模型列表并设置推理等级。 @turtle2099
- 模型请求的 User-Agent 增加启动配置标记，便于服务端区分桌面端、Web、命令行与 SDK 请求。 @imccyu
- 调整账号通知，支持产品公告等消息并随界面语言更新；已有登录保留，自定义账号插件与配置需迁移。 @lsdsjy
- PTC 按运行时限限制工具调用总量，超限会终止代码并清空保留状态，已完成的操作不会撤销。 @kermanx
- Session 支持批量追加事件，日志格式不变；自定义追加接口的包装代码需适配批量调用。 @liukx0205
- 工具失败提供更明确的错误类型与代码，便于定位问题；依赖旧错误分类的插件和 SDK 集成需同步适配。 @sjw1231
- 调整 Computer Use 的窗口操作、键盘控制和授权，默认不移动系统鼠标；自定义脚本与 helper 需同步升级。 @CreatixChu, @Tuyixiang, @Dudu-0223
- Office 改用原生工具，Web 与 SDK 均可加载技能；旧包和技能需迁移，文档解析在 DSH 主进程中运行，不受命令行沙箱保护。 @yudshj
- Windows 的额外目录授权仅供文件工具使用，不扩大终端或 PTC 的访问范围；相关沙箱扩展需迁移。 @Tuyixiang
- 调整 LiveShare 的多会话分享与插件授权，旧授权需重新配置；PTC 可访问分享目录之外，仅应分享给可信任的人。 @mektpoy
- npm 安装与桌面端随附对应版本的源码和文档，方便查阅与开发扩展；Python 单文件运行时不包含这些资源。 @turtle1999
- 升级 Zod 至 4.6.6、Stagehand 至 4.4.0；Stagehand 改为自动发现扩展，旧 extensionId 配置不再生效。 @imccyu

### BirdCoder 本地修改

* **桌面开发 lane 隔离**（`1feb0f0ab0`）：开发、在线与已安装发布三个 lane 相互独立——开发 lane 不读写已安装版的数据与端口，Web 构建环境约束由新脚本 `scripts/web-build-environment.ts` 固化（`scripts/web-build-environment.spec.ts` 90 行规格测试），`scripts/verify-desktop-lane-isolation.ts` 以 57 项检查守护该不变量并已接入 `run-gates.ts` 门禁。
* **设置菜单 persona 状态抽取**（`8b2b424a05`）：`ui-sdkwork-settings-menu` 把 persona UI 状态从设置壳层抽出为独立状态层（`persona.ts`），精简 `SettingsMenuRoot` 与 shell 契约，README 中英文案同步对齐（`1fcefae141`）。
* **文档配对补齐**：`plugins/README.zh.md` 补入上游新增的专家市场、用量与费用看板、助理三节；`ui-primitives` 中文 README 补入 `WideModal`、`Drawer` 两行与抽屉浮层层级限制条目；`scripts/translation-pairing.manifest.json` 把上游新增的两个私有镜像子模块纳入排除项。全部 1487 对中英文配对通过 `pnpm run verify-translation-pairing` 校验。
* 版本号升级至 `0.2.2-rc.6`（根、`apps/desktop`、`apps/web` 三处 package.json 与全部 workspace 包一致），发布 tag `sdkwork-daxuedazi-v0.2.2-rc.6` 触发 `container-release.yml`：六个桌面目标（mac-arm64、mac-x64、win-x64、win-arm64、linux-x64、linux-arm64）+ 两个原生容器镜像 + Compose/Kubernetes 部署捆绑包，资产齐全后发布 GitHub Release；Release 说明只携带本 `## 0.2.2-rc.6` 章节。
* 部署配置保持安装期高度可自定义：Compose 侧 `DSH_PUBLISH_HOST` / `DSH_PUBLISH_PORT` / `DSH_WEB_PORT` / `DSH_TRUSTED_HOSTS` / `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` 环境变量、`DSH_DATA_DIR` / `DSH_WORKSPACE_DIR` 数据落盘目录绑定挂载，以及 `etc/topology/<profile>.<environment>.env` 部署档位文件选择；Kubernetes 侧 `values.yaml` 覆盖表、`configmap.yaml` 与 `secret.example.yaml`。数据层为内嵌文件存储（无外部数据库/Redis 进程），持久化位置由上述卷映射完全自定义。
* **本轮增量合并的自有面**：SDKWork 组件、OEM 品牌与说明文案、打包与部署链路在本次 4 个上游提交的合并中零覆盖——`package.json` 只取上游的依赖与 `files` 字段，版本行仍为 `0.2.2-rc.6`；`office.ts` 的删除按上游进行，fork 自有的 OEM / 账号 / 助理等依赖声明（`packages/bundle/web-app/package.json` 的 SDKWork 依赖块）未变。
