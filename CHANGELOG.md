# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.4（fork 发布 2026-11-09）

本轮为 rc.3 之后的 upstream 同步与发布链修复版本：两次同步 upstream `main`（`08ed6ed..eae80832`，共 8 个提交），把上游发布打包线的五项修复与插件 pin 推进带入 fork，版本号升至 `0.2.2-rc.4` 并以新 tag 触发六目标桌面打包与容器 Release。

### 上游同步（08ed6ed..eae80832，BirdCoder 上游变更）

* **助理与用量计费插件进打包集**：`pack-assistant-plugin` 与容器镜像打包把助理插件（`sdkwork-deepseekbot`）与用量计费插件（`dsh-ui-usage-billing`）纳入 pack set，`Dockerfile` / `Dockerfile.debug` 同步补齐；发布版容器不再缺这两块。
* **backend-sdk 闭包内联进容器**：发布脚本在容器 pack set 内联 backend-sdk 闭包并保持运行时补丁集一致（`94512b47`）；`pack-assistant-plugin` 把 pnpm 版本检查降级为非致命告警（`305e4ae`）。
* **容器镜像安装改用 legacy peer 解析**（`eae80832`）：打包后的 fork 插件 tarball 会把既有的 cordis peer 漂移（peer 钉 ~4.0.4、vendor pack 携带 4.1.0）变成镜像安装时的硬 `ERESOLVE`；workspace 本身用 pnpm 容忍同一依赖图，镜像安装采用同等容错。
* **`sdkwork-deepseekbot` 子模块 repin 到重写后的历史**（`fa23f42`）并启用 shallow clone（`.gitmodules` 新增 `shallow = true`，`070f136`）；fork 侧保留自有 pin `0a371ab2`（重写历史 repin 提交的直接子提交，已包含 upstream repin + workspace-specifier 依赖修复），`dsh-better-sidebar` 保留 fork pin `2963286f`（upstream 文档提交 `bd636302` 为其祖先）。
* **`dsh-better-sidebar` 上游前进一个文档提交**（AGENTS.md 重构，源码与 `lib/` 产物不变；fork pin 已领先，无需动作）。
* **SDKWork 生态兄弟仓库 pin 推进**：`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 双记录同步（`sdkwork-utils`、`sdkwork-iam`、`sdkwork-appbase`、`sdkwork-cloudrouter` 等），`pnpm-lock.yaml` 相应刷新；`pnpm-workspace.yaml` 与 `tsconfig.base.json` 补充对应映射；`build-deepseekbot.mjs` 与 `apps/desktop/scripts/runtime-patch-policy.ts` 跟进。外部依赖遵循 sdkwork-specs 规范：本地相对路径解析、release 经 manifest 固定到各仓库 `main` 的 git 提交。

### 打包与发布（BirdCoder 本地修改）

* 版本号升级至 `0.2.2-rc.4`（根、`apps/desktop`、`apps/web` 三处 package.json 与 `agent.workflow.json` 一致），发布 tag `sdkwork-daxuedazi-v0.2.2-rc.4` 触发 `container-release.yml`：六个桌面目标（mac-arm64、mac-x64、win-x64、win-arm64、linux-x64、linux-arm64）+ 两个原生容器镜像 + Compose/Kubernetes 部署捆绑包，资产齐全后发布 GitHub Release；Release 说明只携带本 `## 0.2.2-rc.4` 章节。
* 部署配置保持安装期高度可自定义：Compose 侧 `DSH_PUBLISH_HOST` / `DSH_PUBLISH_PORT` / `DSH_WEB_PORT`（容器内监听端口一并迁移，healthcheck 同步跟随）/ `DSH_TRUSTED_HOSTS` / `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` 环境变量、`DSH_DATA_DIR` / `DSH_WORKSPACE_DIR` 数据落盘目录绑定挂载，以及 `etc/topology/<profile>.<environment>.env` 部署档位文件选择（`SDKWORK_DEPLOYMENT_PROFILE` / `SDKWORK_ENVIRONMENT`）；Kubernetes 侧 `values.yaml` 覆盖表、`configmap.yaml` 与 `secret.example.yaml`。数据层为内嵌文件存储（无外部数据库/Redis 进程），持久化位置由上述卷映射完全自定义。
