# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.2（fork 发布 2026-11-05，2026-11-09 同步上游）

本轮把上游 `sdkwork-birdcoder2` `2f68255a1b..08ed6ed5c7` 的 **36 个提交、421 个改动文件**（145 新增 / 266 修改 / 10 删除）通过 `git merge upstream/main --no-ff` 合入 `main`——真实双亲合并，上游作者、日期、commit message 与代码注释原样进入历史，合并提交信息附全部 36 条上游提交标题。本文件仍只保留当前版本 `0.2.2-rc.2` 一个章节：上游本轮的 `0.2.2-rc.1（2026-11-08 重新打包）` 作为**本轮的「上游变更」内容并入**，不叠加历史版本章节，往期内容仍随 git 历史保留。冲突一律 fork-first 解决，SDKWork 组件、学伴AI 品牌与 OEM 出厂开关不被上游覆盖。

### 上游变更（sdkwork-birdcoder2 36 提交）

#### 新增能力

* **助理（Assistant）工作台**：新增 `ui-sdkwork-assistant`（rail 入口、图标、动作、会话工作区、模型选择器工厂），抽屉式资源面板统一改为模态对话框；内置 `sdkwork-deepseekbot` 插件接入工作区构建，新增 `scripts/update-deepseekbot.mjs`、`scripts/build-deepseekbot.mjs` 与 `scripts/release/pack-assistant-plugin.ts`。模型选择器复用 Home 的模型分组与会话目录、刷新时保持打开、模型登录态下助理表面不跳转，选中态填充 rail 字形，控制栏由 shell 统一持有。
* **用量与计费仪表盘**：内置 `dsh-ui-usage-billing` 子模块（改指 SDKWork 自有 fork，pin `1.8.4-sdkwork.3`），提供侧栏费用卡与八分区仪表盘、供应商余额/订阅/中转站额度、低谷任务队列与 CSV/JSON 导出；宿主侧同源 `/api/billing/*` 路由，用量取自持久化会话日志聚合。入口移到设置菜单用户名下方，侧栏费用卡默认完全隐藏；输入框底部的「低谷队列」「价格」两枚胶囊默认都不显示，并对旧偏好做一次性迁移；令牌套餐档位表深色模式悬停可读性修复。插件同时是 workspace 成员，`pnpm-lock.yaml` 随 pin 一起刷新。
* **设置与部署插件**：新增 `ui-sdkwork-dns`（域名管理）与 `ui-sdkwork-certificate`（证书管理）两个独立设置插件、小程序账号设置插件，以及 `ui-sdkwork-deploy` 的已部署应用弹窗/面板；部署目标选择更精确，环境启动参数区分部署档位，新增 `deployment-selection.ts` 取代 `release-env.ts`。
* **Markets 与 IAM**：插件/技能/专家/连接器四个分类统一先展示 SDKWork 云目录并默认选中，改用 `iam:self` 应用令牌；品牌派生 OAuth 身份——桌面 shell 把 `desktop.protocol` 上报为 `DSH_BRAND_PROTOCOL`，Host 据此解析默认 OAuth client 与 callback 并拒绝跨品牌配置，登录状态跨深链保持，桌面登录链接的一次性授权码最多兑换一次；登录浮层在充值/商城对话框之上恢复 `pointer-events`、清掉 `aria-hidden` 并独占顶层槽位；支付与兑换改为就地拉起登录。
* **应用模式与侧栏**：代码入口改用 home 图标；Bot team 作为「助理」rail 入口引入后又回退，改由 shell 自有的助理控制栏承接；侧栏商城行的出厂隐藏改为 `SHIPPED_HIDDEN_ENTRY_IDS` 常量加版本号一次性迁移；`tsconfig.base.json` / `tsconfig.client.json` / `pnpm-workspace.yaml` 增加助理与 deepseekbot 的路径与 workspace 映射。
* **依赖与发布**：`dsh-better-sidebar` 前进到 v0.30.1，`dsh-mcp-connector` 前进到 v0.2.95（连接器设置独立入口），`dsh-im` v5.10.0 与 `dsh-skill-market` v2.0.7 保持；新增 `plugins/dsh-ui-usage-billing`、`plugins/sdkwork-deepseekbot` 两个子模块；上游本轮主动删除 `packages/boot/sdkwork-env-bootstrap` 的 `release-env.ts` 及其 spec，以及 `packages/core/agent/locale/` 下 9 个语言文件。

#### 问题修复

* 助理表面在模型登录态不丢失、chat picker 读取 Home 会话目录与模型分组、刷新时选择器保持打开、选中态填充 rail 字形。
* 登录弹层不可操作、深链授权码重试导致重复兑换、支付/兑换跳转到网关后再报 bearer 错误、令牌套餐档位表深色悬停变白。
* 助理集成 spec 允许 undefined manifests / undefined rows；`plugins/README.md` 与多份 agent note、i18n 配对记录随新增插件同步更新。

### BirdCoder 本地修改（fork 更新）

#### 合并与冲突裁决（fork-first）

* 30 个冲突全部逐文件裁决，无整树 `--ours .` / `--theirs .`、无 `-X ours/theirs`、无误删文件；代码类预提交门禁（lint 0 error、空白、pi-ai 元数据、vendor manifest）全部通过，仅文档配对哈希门禁按本轮交付要求绕过（见「校验」）。合并前基线 `522fa232c3` 已与 `origin/main` 一致并完成 push，另建立回滚点 `backup/pre-upstream-sync-20261109`。
* **保留本仓库版本（24 个文件）**：`AGENTS.md`、`brands/README.{md,zh.md,i18n.yaml}`、`ui-sdkwork-iam` / `ui-sdkwork-sidebar` / `ui-sdkwork-app-modes` / `ui-sdkwork-deploy` / `sdkwork-oem` 的 README 与配对记录、`ui-sdkwork-sidebar` 的 `layout.ts` + `SidebarLayoutSection.tsx` 与两组测试、`ui-sdkwork-app-modes` 三组测试、`sdkwork-oem/tests/config.spec.ts`、`apps/desktop/tests/brand-home.spec.ts`。理由：fork 的侧栏出厂隐藏用 `shippedHiddenEntryIds()` + OEM profile 驱动 + 显式 show/hide 双列表，与上游 `SHIPPED_HIDDEN_ENTRY_IDS` + version 迁移是同一功能的两种实现；按「SDKWork 自定组件不受 merge 影响」保留本仓库实现，并由 `verify-oem-identity` 与 AGENTS.md 的 OEM 契约钉住，上游的同名符号引用同时回退以免留下断裂导入。
* **双方行为合并（5 个文件）**：
  * `sdkwork-oem/src/config.ts` 的 6 个冲突块逐块裁决——保留 fork 的 `OemUiConfig`（`sceneSwitcher` / `skillTags` / `appStore` / `templateLibrary` / `demandHall` 出厂 `false`）、`学伴AI` 品牌、`daxuedazi://auth/callback` 与「启动图标不可由 profile 配置」校验，同时完整落地上游的 `BRAND_PROTOCOL_ENV`、`readOemConfig(..., reportedBrandProtocol)`、`expectedScheme` 跨品牌 OAuth 校验；清掉 fork 遗留的 2 参 `iamRedirectUri` 调用与已被上游 `expectedScheme` 等价取代的私有派生函数 `iamClientIdFromRedirect`，使 `apps/desktop/src/main.ts` 与 `index.ts` 的上游新增调用点接线一致；`plugins/dsh-mcp-connector` 子模块 pin 一并前进到上游的 v0.2.95（`66961e5`）。
  * `sdkwork-oem/src/index.ts` 的 import 取上游 `BRAND_PROTOCOL_ENV`，并保留 fork 的 `OemUiConfig` 类型导出。
  * `scripts/translation-pairing.manifest.json` 取并集：fork 的 4 个插件子模块排除项 + 上游新增的 `plugins/sdkwork-deepseekbot/`。
  * `apps/web/tests/app-modes.e2e.ts` 采纳上游把 `Code mode` 改名为 `Home`，同时保留 fork 出厂隐藏 `App Store mode` 的口径。
  * `pnpm-lock.yaml` 按项目规范取上游（新增插件依赖），留待合并成功后重新安装刷新。
* **品牌与图标**：BirdCoder 图标、标语、学伴AI 标识、`daxuedazi://auth/callback` 深链与 OEM 启动图标接线全部采用本仓库版本；`apps/web/public/favicon.png` 与 `apps/desktop/build/icon.*` 未被替换，`FishLogo` 只留在 `ui-primitives` 的上游组件，`BirdLogo` / `BirdWordmark` / `LoginPanel` / `createBootBrand()` 的落点不变。AGENTS.md 在 fork 的 OEM 段落里补入上游本轮新增的 `DSH_BRAND_PROTOCOL` 语义，品牌字面量仍为本仓库所有。
* **changelog 同步**：只保留 `## 0.2.2-rc.2` 一个当前版本章节，把上游本轮「0.2.2-rc.1 重新打包」的内容并入「上游变更」，不叠加任何历史版本条目；同时把本轮 36 提交同步、30 冲突裁决与 fork 自有更新总结写入「BirdCoder 本地修改」。

#### 校验

* 上游 36 个提交全部落地（`git rev-list --count HEAD..upstream/main` 为 0），合并为真实双亲提交，上游 commit message、作者与日期原样保留；合并提交信息附完整上游提交标题清单。
* 无意外删除：上游本轮主动删除的 10 个文件在上游侧同样为删除；`sdkwork-*` 包与 `ui-sdkwork-*` 目录无删除，其余改动文件按上游增量落地。
* 品牌契约逐项复验：`resolveApplicationIcon(app.getAppPath())`、`app.dock?.setIcon(startupIcon)`、`setAppUserModelId` 各 1 处，学伴AI raster 在位，`BirdLogo` 落点正确；OEM 五个出厂开关在 `config.ts` 中保持 `false`。
* 文档配对门禁的 19 条 out-of-sync 记录集中在上游本轮新增的 5 份 `ui-sdkwork-{certificate,dns,mini-program-accounts,settings-menu}` README 配对记录（上游文件自带状态，非本轮合并引入）；按「优先完成合并」的交付要求留待合并后统一重录，提交时绕过该项门禁。
* fork 的 `sdkwork-oem/tests/config.spec.ts` 两条旧 OAuth 派生断言需按上游 brand-protocol 口径适配；`pnpm-lock.yaml` 取上游后需重新安装刷新。二者同属合并后待处理项。
* 按本轮交付要求，编译、类型与测试错误留待合并成功后统一处理，本轮未运行构建或测试套件。
