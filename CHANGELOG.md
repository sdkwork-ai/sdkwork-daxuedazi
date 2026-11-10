# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.5（fork 发布 2026-11-10）

本轮为 rc.4 之后的迭代版本：桌面引入开发 lane 隔离与 Web 构建环境约束，设置菜单抽出 persona 独立状态层，SDKWork 生态兄弟仓库 pin 推进（8 个仓库前进到各自 `main` 最新），`dsh-mcp-connector` 子模块推进到 `v0.2.100`。

### BirdCoder 本地修改

* **桌面开发 lane 隔离**（`1feb0f0ab0`）：开发、在线与已安装发布三个 lane 相互独立——开发 lane 不读写已安装版的数据与端口，Web 构建环境约束由新脚本 `scripts/web-build-environment.ts` 固化（`scripts/web-build-environment.spec.ts` 90 行规格测试），`scripts/verify-desktop-lane-isolation.ts` 以 57 项检查守护该不变量并已接入 `run-gates.ts` 门禁。
* **设置菜单 persona 状态抽取**（`8b2b424a05`）：`ui-sdkwork-settings-menu` 把 persona UI 状态从设置壳层抽出为独立状态层（`persona.ts`），精简 `SettingsMenuRoot` 与 shell 契约，README 中英文案同步对齐（`1fcefae141`）。
* **`sdkwork-deepseekbot` 子模块推进**（`8ee54bff6d`）：pin 前进到 `ac7c85d8`。
* **`dsh-mcp-connector` 子模块推进**：`66961e57` → `618cbd3c`（上游 `v0.2.100`，新增 npm 下载趋势图与日常维护）。
* **SDKWork 生态兄弟仓库 pin 推进**：`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 双记录同步 8 个仓库到各自 `main` 最新（`sdkwork-cloudrouter`、`sdkwork-models`、`sdkwork-promotion`、`sdkwork-knowledgebase`、`sdkwork-agents`、`sdkwork-deployments`、`sdkwork-messaging`、`sdkwork-documents`），`pnpm-lock.yaml` 相应刷新。外部依赖遵循 sdkwork-specs 规范：本地相对路径解析、release 经 manifest 固定到各仓库 `main` 的 git 提交。
* 版本号升级至 `0.2.2-rc.5`（根、`apps/desktop`、`apps/web` 三处 package.json 与全部 455 个 workspace 包一致），发布 tag `sdkwork-daxuedazi-v0.2.2-rc.5` 触发 `container-release.yml`：六个桌面目标（mac-arm64、mac-x64、win-x64、win-arm64、linux-x64、linux-arm64）+ 两个原生容器镜像 + Compose/Kubernetes 部署捆绑包，资产齐全后发布 GitHub Release；Release 说明只携带本 `## 0.2.2-rc.5` 章节。
* 部署配置保持安装期高度可自定义：Compose 侧 `DSH_PUBLISH_HOST` / `DSH_PUBLISH_PORT` / `DSH_WEB_PORT` / `DSH_TRUSTED_HOSTS` / `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` 环境变量、`DSH_DATA_DIR` / `DSH_WORKSPACE_DIR` 数据落盘目录绑定挂载，以及 `etc/topology/<profile>.<environment>.env` 部署档位文件选择；Kubernetes 侧 `values.yaml` 覆盖表、`configmap.yaml` 与 `secret.example.yaml`。数据层为内嵌文件存储（无外部数据库/Redis 进程），持久化位置由上述卷映射完全自定义。
