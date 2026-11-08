# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.3（fork 发布 2026-11-09）

本轮为 rc.2 之后的修复与依赖推进版本：合并前未提交的设置菜单精简重构落地、修复其遗留的测试初始化错误、全部 `sdkwork-*` 兄弟仓库依赖与三个插件子模块推进到各自 main 最新，并以新 tag 触发六目标桌面打包与容器 Release。

### 设置菜单与测试修复（BirdCoder 本地修改）

* **设置菜单精简为产品命令面**：`ui-sdkwork-settings-menu` 的弹出菜单移除公众号账号、小程序账号、域名管理、证书管理、我的应用部署、中转站 API Key 管理六条云控制台行及帮助/反馈行（帮助无中心支撑、反馈属控制台渠道），保留设置、角色（persona）、外观与桌面 shell 组（插件管理、检查更新、退出）。这些表面的 root 作用域座位（seats）仍在 `shell-contract` 中**声明保留**——注册者缺授权时会抛 `SlotOwnershipError` 带下整个设置入口，因此座位表是这些插件的运行时权限，条目列表不再出厂展示；恢复某条目是「一行加一个宿主座位」，不是契约变更。配套精简了 `shell-contract.ts` 导出、`locales.ts` 文案与 README 三语文档，并同步改写 `settings-menu-root`、`apps/web` settings-menu e2e、`ui-brand-official` / `ui-model-selection` / `ui-sdkwork-capabilities` / `ui-sdkwork-iam` 各自的浏览器 spec 期望。
* **修复 `quota-notice-hold` spec 的初始化错误**：`enCopy` 常量在自身初始化表达式中自引用（`backToHarness: enCopy.backToHarness...`）导致 `ReferenceError: Cannot access 'enCopy' before initialization`、整套件加载失败；改为从源字典 `en` 派生品牌替换文案，8 条用例全部通过。
* **桌面期望夹具随本地化线刷新**：`about-panel`、`application-menu-en-US`、`application-menu-zh-CN` 期望与 `main-startup` spec 同步（176 条用例通过）；`test-support/client-runtime` 补充助理装配模块映射，`tsconfig.base.json` 补充对应路径映射。

### 依赖推进（sdkwork-specs 规范：本地相对路径、release 经 manifest 固定 git 提交）

* **`sdkwork-*` 兄弟仓库全部推进到各自 main 最新**：`scripts/sdkwork-sources.manifest.json` 38 个仓库中 33 个前进（`sdkwork-utils`、`sdkwork-iam`、`sdkwork-appbase`、`sdkwork-cloudrouter`、`sdkwork-models`、`sdkwork-agents`、`sdkwork-web-framework` 等）；`sdkwork-sdk-commons`、`sdkwork-ui`、`sdkwork-core`、`sdkwork-comments`、`sdkwork-catalog`、`sdkwork-database`、`sdkwork-feeds` 已在 main 最新。新增 `scripts/update-sources-manifest-main.mjs` 一键同步脚本（查询各仓库 main 头提交并校验 SHA 格式后写回 manifest）。
* **插件子模块推进**：`dsh-better-sidebar` 前进到 dev 分支最新（`2963286f`），`dsh-im` 前进到 main 最新（`fc2ceab2`，v5.10.0 之后 41 提交），`dsh-skill-market` 前进到 v2.1.0（`6901769`，构建产物 `lib/` 随仓库携带）；`dsh-mcp-connector`（v0.2.94 pin）、`dsh-ui-usage-billing`（fork v1.8.4-sdkwork.3）与 `sdkwork-deepseekbot`（main `d5b20fba`）保持不变。

### 打包与发布

* 版本号升级至 `0.2.2-rc.3`（根、`apps/desktop`、`apps/web` 三处 package.json 一致），发布 tag `sdkwork-daxuedazi-v0.2.2-rc.3` 触发 `container-release.yml`：六个桌面目标（mac-arm64、mac-x64、win-x64、win-arm64、linux-x64、linux-arm64）+ 两个原生容器镜像 + Compose/Kubernetes 部署捆绑包，资产齐全后发布 GitHub Release；Release 说明只携带本 `## 0.2.2-rc.3` 章节。
* 部署配置保持安装期可自定义：Compose 侧 `DSH_PUBLISH_HOST` / `DSH_PUBLISH_PORT` / `DSH_WEB_PORT` / `DSH_DATA_DIR` / `DSH_WORKSPACE_DIR` 环境变量与 `etc/topology/<profile>.<environment>.env` 部署档位文件选择；Kubernetes 侧 `values.yaml` 覆盖表、`configmap.yaml` 与 `secret.example.yaml`。
