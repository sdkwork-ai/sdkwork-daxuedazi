# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-alpha.5（上游发布 2026-11-02，本地同步 2026-11-03）

Fork 同步：merge `upstream/main`（`de5cdae77f`）到本地 `main`，窗口 `82ff44c26aa..de5cdae77f`，23 个上游提交。本次为真实双亲合并提交（`git merge --no-ff`，非 squash / rebase / cherry-pick），上游提交的作者、日期、commit message 与代码注释原样进入历史。上游 Release：[v0.2.2-alpha.5](https://github.com/sdkwork-ai/sdkwork-birdcoder2/releases/tag/birdcoder-v0.2.2-alpha.5)。合并裁决保留 fork 自有 SDKWork 组件、学伴AI 品牌资产与「当前版本 changelog」策略；环境、凭据与打包口径取 upstream 最新实现（打包期 env 投影脚本随上游移除，OEM 品牌 `resolveBrand` 保留），桌面发布取上游逐目标 lane 结构（六目标覆盖不变），容器镜像车道超时采用上游 150 分钟口径。

本版本打在 `sdkwork-daxuedazi-v0.2.2-alpha.4`（`91cacc287d`）之后：包含该 tag 之后到 `de5cdae77f` 的全部上游变更，以及本地 OEM 品牌身份与 CLI 启动器改名、H5 页签字形修复、Flutter TLS 引导测试与 CI 容器磁盘修复。

### 上游变更

#### 新增功能

* **桌面发布改为逐目标 lane**（`39e8ed6c9b`）：`desktop-release.yml` 保留唯一的六目标表，每个目标成为独立 job（`package-win-x64` 到 `package-linux-arm64`）并调用新的可复用 workflow `desktop-package-target.yml`。失败时运行摘要与 Actions API 直接指明目标，"re-run failed jobs" 只重试该目标；`resolve` 校验 `targets` 子集并按发布顺序归一，部分运行仅用于重新打包与诊断。各 lane 复用 runner 临时目录下载缓存，Windows 短构建根保持不变。
* **插件市场默认随应用出货**：Web 组合 `packages/bundle/web-app` 以 npm 依赖 `dshmarket ^1.73.8` 钉住已发布构建产物，并在自己的 `cordis.patch.yml` 挂载 `dsh-market` 行，桌面组合直接继承；打开插件页即落在可浏览的社区目录，无需安装步骤。
* **cloud 部署档位成为默认**（`3210b5098c`、`f6a2aac376`）：新增 `.env.cloud.{development,test,production}`，取值对齐 `etc/topology/cloud.<environment>.env`（production 为 `https://api.sdkwork.com`，应用入口按域名访问）；`apps/web/vite.config.ts` 默认 `cloud`，非 development 构建丢弃 loopback 地址；pad、Flutter 与小程序构建默认 cloud，standalone 保留为显式变体。
* **标准 env 物化流程**：仓库根 `workflow:materialize-client-env` 改调 sdkwork-specs 标准物化器，`check:client-env` 校验已提交面；新增 `sdkwork-birdcoder2-pad` 面。
* **容器 Compose 直接读取部署的 per-environment topology env**（`d698695a91`）：`docker-compose.yml` 不再依赖打包期投影。
* **创意应用跟随账号重建**：图像/视频创作面的 Host 适配器按账号标识（tenant、organization、user）生成 `surfaceRevision`，账号切换时重建内嵌视图。
* **模板库与需求大厅重新打开回到首页**：Host 适配器新增 `navigationResetKey` 与 `resetNavigation()`；需求提交支持多应用形态 `appForms`。
* **技能设置入口区分**：设置侧栏的 `skills` 行使用技能图标，文案改为「技能设置」/「Skill settings」。

#### 问题修复

* **安装包的 IAM 登录**（`bb2014454b`）：打包清单把应用编码写入 `resources/sdkwork-app.json`，凭据包按应用编码而非 profile 目录名定位。
* **发布包自带部署凭据**（`388efed45d`、`e629acd53f`）：受跟踪的 `.env.standalone.production` 携带本部署的 `SDKWORK_ACCESS_TOKEN`，发布车道改为 `deployment` 类别；令牌过期或 claims 不匹配时构建 fail closed。
* **SDKWork 配置改由 Vite env 文件在构建期注入**（`c98f6b8234`）：删除打包期投影与 `resources/sdkwork-release.env` 管线（含 `apps/desktop/scripts/prepare-sdkwork-release-env.ts`），环境由构建模式选择，一环境一构建。
* **构建模式按车道选择**（`7d2869486a`）：dev/online 各自烘焙对应环境，启动进程自身的 `SDKWORK_*` 在 `loadEnv` 前移除。
* **浏览器 runtime env 标准门禁**（`5b4483e55d`）：仓库根链接 `@sdkwork/sdk-common`，`check-browser-runtime-env-standard` 输出 `standard ok`。
* **容器镜像车道超时放宽到 150 分钟**（`d07d7da928`、`c63ecea949`、`5695690194`）：45→90→150 分钟，覆盖共享 runner 上 git 插件加入构建后的 amd64 构建（77 分钟）与被取消的 arm64 车道。
* **插件 bin 归一覆盖 manifest bin 字段声明的路径**（`aa5b0e42aa`）：`dsh-mcp-connector` 的 `scripts/probe-connector.mjs`（`bin/` 之外）不再触发 `ERR_PNPM_BIN_CRLF`。
* **Electron 分发下载加有界重试**（`ea98a9f76e`）。

#### 依赖与版本

* 新增 npm 依赖 `dshmarket@1.73.8`（Web 组合与 client-runtime 测试支撑），运行时闭包带入 `undici` 与 `js-yaml`；锁文件已同步。
* SDKWork 发布车道依赖 pin 前进：`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 双记录 pin 取上游 0.2.2-alpha.5 发布链路验证过的值（本地相对路径工作区、发布按 pin 克隆 git 仓库）。
* 版本号同步推进到 `0.2.2-alpha.5`。

### BirdCoder 本地修改

#### 功能

* **OEM 品牌身份完整落地与 CLI 启动器改名**（`252d404ca9`）：`brand-manifest` 驱动的 OEM 品牌身份落地（桌面产物名按品牌 `desktop.artifactPrefix` 拼写），CLI 启动器随品牌改名；`package-target.ts` 保留 `resolveBrand` 装配路径。

#### 问题修复

* **H5 选中页签字形**（`91cacc287d`）：修复 H5 端选中页签的字形填充。
* **Flutter TLS trust bootstrap 测试**（`cadc4388a5`）：补齐 Flutter 引导的 TLS 信任链测试。
* **CI 容器磁盘**（`67c512d9c7`）：容器打包车道把 Docker data-root 迁到 runner 大容量临时盘，`prebuilt` 上下文改为硬链接复制，避免 BuildKit 快照写满根盘。

#### 合并调整

* 上游删除打包期 env 投影脚本 `apps/desktop/scripts/prepare-sdkwork-release-env.ts` 及其分发契约断言，本 fork 跟随（环境改由 Vite env 文件构建期注入）；OEM 品牌装配（`resolveBrand` / `brand-manifest.mjs`）保留为 fork 自有路径。
* `.github/workflows/desktop-release.yml` 整体取上游逐目标 lane 结构；六目标（含 fork 自有的 win-arm64 与 linux 双架构）覆盖不变。
* 容器镜像车道超时冲突取上游 150 分钟口径（覆盖本地此前的 90 分钟）；`scripts/release/verify-container.ts` 的断言同步。
