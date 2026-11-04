# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.1（fork 发布 2026-11-04）

本版本把上游 `deepseek-harness` `dsh-v0.2.2-rc.1` 整体合并进来：本地执行 `git merge upstream/main --no-ff`，把 `636cfbbc86`..`1c45658511` 的 268 个上游提交合入 `main`——真实双亲合并提交，上游作者、日期、commit message 与代码注释原样进入历史。窗口主体是 `8bd073392e` → `fcc0ad4621` 的 260 个上游提交（tag `dsh-v0.2.2-rc.1`），其后是 upstream 侧对本次同步的类型与测试修复、以及面板锚定回退的还原。同时结清上一轮尚未发布的自有改动（打在 `birdcoder-v0.2.2-alpha.6` 之后的 alpha.7 内容）。冲突一律 fork-first 解决——SDKWork 组件、BirdCoder 品牌与发布车道不被上游覆盖，双方都改过的同一行为取并集后按上游新结构落地。

### 上游变更

> 上游尚未发布 `dsh-v0.2.2-rc.1` 的 Release notes（该 tag 只有构建产物里程碑），以下按 `8bd073392e..fcc0ad4621` 区间内的实际提交归纳。

#### 新增功能

* 桌面端发布支持分阶段灰度：发布时可配置灰度比例，未显式指定时默认全量。
* macOS 编辑菜单把 Paste and Match Style 绑定到 ⇧⌘V，保留 ⌥⇧⌘V 作为隐藏别名；Substitutions 与 Speech 标题改由桌面端语言包提供。
* 「在原生应用打开」收进会话菜单，原先的独立 header 入口与其模块一并移除。
* 失败的轮次可以用空输入继续；Web 端在瞬时请求失败后继续生成，并对已接受输入的重复重试去重。
* 聊天把上下文注入显示为工具调用行；`apply_patch` 行标出它改动的文件，并可逐个打开。
* 子代理在创建者目录里带上名字，持久化名称经过校验。
* 变更请求（Forge）可选择本地改动的基线分支，合并按钮改用产品强调色与实心折角。
* PTC：保留环境支持 Host 重置，协作式取消后保留运行时状态。
* CUA：应用审批的风险说明与会话选择更明确。
* 发布车道复用源码字节一致的 CUA helper 构建，并把构建绑定到 Actions run 的提交。

#### 体验优化

* 审批风险卡改用 CSS 锚点定位，浮层在页面缩放时保持与触发器对齐。
* PDF 文本层改为分离布局，并挂到真正承载样式的节点上，修复预览错位。
* 风险标签、合并按钮的悬停与焦点行为统一，浮层在焦点或前台丢失时关闭。

#### 问题修复

* 会话窗口在增量 flush 失败后重建，不再停留在半更新状态。
* inspect 的 Cordis 快照预算为记录开销预留额度，并拒绝没有快照预算的 source-frame 限制。
* 桌面端发布通道与版本后缀解耦，更旧来源的工作流模式可正确桥接，工作流版本模式命名更清晰。
* 安装器产物保留修改时间，改用系统 ZIP 写入器并校验归档失败。
* 桌面端归档设置在保留文件之前校验；保留件的时间戳与命名说明一致。
* `ui-goal` 在中文下区分「未激活」与「已暂停」。
* PTC 的诊断用自然语言给出每分钟调用预算与上限。
* 修复多文件 patch 行在悬停时高亮到整行、以及 `experimental/` 前缀出现在新包名里的问题。

#### 其他变更

* 同步 vendor：Cordis 4.1.0、Loader 1.1.0、Include 1.1.0、HMR 1.1.0、Timer 1.2.0、cosmokit 1.9.0、schemastery 3.19.0。
* 客户端打包允许内联 `dsh-fs-patch`。

### BirdCoder 本地修改

#### 合并与冲突解决（fork-first）

* 工作区行与会话行的菜单触发改用上游新增的 `contextMenu.button` 工厂，同时保留 fork 的 `sidebar.workspaces.rowMenus` 菜单 seam：插件接管时由插件画整块菜单与自己的触发器，未接管时退回共享右键菜单。插件路径下的行右键继续走 pointer 通道，未接管时交给共享菜单容器。
* 会话页头把上游新增的 `renderFactorySlot` 通道贯通到 fork 拆分的 header body，末尾「更多」按钮由 `contextMenu.button` 提供，`sessionHeader` 目标与上游一致。
* 桌面端语言包保留 BirdCoder 品牌名（8 个语言的 退出/打开 条目），同时引入上游新增的 Substitutions 与 Speech 菜单标题。
* 桌面端打包环境读取保留 fork 的 `baseDir` 语义（模板内相对路径按 `apps/desktop` 解析）。上游把该读取器抽到 `desktop-file-settings.mjs`，其签名不接收 `baseDir`，因此 fork 保留本地副本并在代码里注明分歧原因与同步要求。
* 客户端 bundler 的内联白名单保留 fork 的 `host-apiproxy` 与 `client-sdkwork-office`，并接收上游新增的 `fs-patch`。
* 保留 fork 的发布决定：不引入 `release-publish.yml` / `scripts/release/publish.ts`（`birdcoder-v*` tag 走 `container-release.yml`），上游针对这两份文件新增的测试块按该决定删除。
* 锁文件里 357 个只差版本号的包统一采用上游 `0.2.2-rc.1`；`ui-approval` 新增的 `react-dom` 按 fork 的 React 19 口径记为 `19.2.8`，锁文件中不再有 `^18.2.0` 的 specifier 残留。

#### 承接上一轮未发布的改动

* 左侧栏会话列表的滚动交接与面板启动器不再丢位置、不再被「更多」菜单吞掉。
* 客户端 inspect 清单改为等 Host 代次就绪后再发布；网关不再把精确路由自己的 404 当成回落信号；变更摘要按「无内容」回答。
* 36 个 SDKWork 兄弟仓 pin 一次性前进到各自已推送的 `origin/main`（`sdkwork-appbase` → `1fc30502`），两条 pin 记录逐字一致。
* `plugins/dsh-im` 子模块跟到 `v5.10.0`（`c826bfa4`）。

#### 发布前依赖与安装期配置（本次发布）

* 73 个 fork 自有包（`packages/host/sdkwork-desktop-carrier`、`packages/bundle/sdkwork-desktop-app`、`packages/client/ui-sdkwork-*` 等）的版本从 `0.2.2-alpha.7` 统一到 `0.2.2-rc.1`。`DshFamily.verifyVersions` 要求 dsh 家族共享同一个版本，否则 `pack:pack-local-packages` 在打包中途失败；此前只有上游同步带来的 375 个成员被推进，fork 自有包漏在 alpha.7。
* 修复 Windows 上重复执行桌面打包必然失败的问题：`prepare-dsh` 的 pnpm 把 store 使用方登记为 `store/v11/projects/<hash>` 目录联接（junction），pnpm 11 用 `fs.promises.unlink` 改写该条目时被 Windows 以 `EPERM` 拒绝，于是第二次 `install` 在读取 lockfile 前中止。新增 `pnpm-windows-junction-unlink.cjs`，经 `--require` 载入 pnpm，把该 EPERM 退化为用 `rmSync` 删除联接本身（不跟随目标），打包因此可以重复执行。
* 32 个 SDKWork 兄弟仓 pin 再次前进到各自 `origin/main` 的最新提交（`sdkwork-iam` → `920b01af`、`sdkwork-web-framework` → `11baa767`、`sdkwork-agents` → `052b9185`、`sdkwork-account` → `e12912b6` 等），`sdkwork-core`、`sdkwork-ui`、`sdkwork-utils`、`sdkwork-appbase`、`sdkwork-catalog`、`sdkwork-database` 已在最新处未动；本地仍由 `pnpm-workspace.yaml` 以 `../sdkwork-*` 相对路径解析，发布车道由 `scripts/sdkwork-sources.manifest.json` 的 pin 克隆同名兄弟仓，两种形态共用同一份 pin 记录。`agent.workflow.json` 的 `dependencies[].ref` 与 manifest 逐条对齐——`verify-sdkwork-dependencies` 要求两处记录逐字一致，否则 `build --profile local` 直接失败。
* 容器部署的安装期配置全部改为环境变量可覆盖，安装时不必改 Compose 文件：`DSH_WEB_PORT` 同时决定容器内监听端口与发布端口，健康检查读取同一变量；`DSH_PUBLISH_HOST`/`DSH_PUBLISH_PORT` 调整宿主机侧；`DSH_DATA_DIR`/`DSH_WORKSPACE_DIR` 接受宿主路径，把 `/data`、`/workspace` 从托管命名卷改为绑定挂载。`verify-container` 逐项断言这些变量，`release:verify-container-bundle` 在发布包上复核同一套定义。
* `plugins/dsh-im`（v5.10.0，`c826bfa4`）、`plugins/dsh-mcp-connector`（v0.2.93，`80f61822`）、`plugins/dsh-skill-market`（v2.0.7，`4cda9309`）已在其跟踪分支最新处；`plugins/dsh-better-sidebar` 保持 `bd6cfa5`（v0.29.0）。dev 分支的 v0.30.0 把 DSH 基线抬到 0.2.2-rc.1 并开始使用 `ctx.settings`，但它在 workspace 混合布局下与宿主 vendor Cordis 4.1.0 的 module augmentation 不合并（`Property 'settings' does not exist on type 'Context'`），且其 React 18 的 `RefObject<T>` 用法与宿主的 React 19 类型冲突；插件源码属上游仓库，主仓无法在 CI 侧修正，故本版不采纳，待上游按宿主 toolchain 出包后再跟进。

#### 桌面端品牌身份与开发车道（`3c74f3f3ba`）

* **每个品牌独占一个 loopback Web 端口**：品牌清单新增 `desktop.webPort`（BirdCoder `19387`、学伴AI `19400`），外壳经 `hostWebPort()` 把它交给 Desktop Host（`DSH_DESKTOP_HOST_WEB_PORT`），两个品牌同时安装不再抢同一个监听而启动失败；显式指定端口仍然优先，畸形值原样下传由 Host 自己报错。
* **开发车道改用品牌身份**：`pnpm dev:desktop` 的固定端口（19388/19389/9222/9229/9230）与 `DSH_HOME` 继承已移除，改为 `apps/desktop/scripts/development-identity.ts` 按品牌端口段与品牌 home 派生，开发车道不再与已安装应用、或同机另一份 checkout 的车道冲突，也不再往别的应用 home 里写会话与凭据。
* **OEM 校验加固**：`scripts/verify-oem-identity.ts` 把 `webPort` 纳入「两品牌不得共享」的身份字段，并把 `dev.ts`、`development-identity.ts` 列为 OEM 归属文件，同时断言外壳仍把品牌 Web 端口交给 Host、仍按 `brand.desktop.protocol` 注册 URL scheme。
* **品牌资产与文案**：`brands/*.json`、`brands/README`（中英双语与配对记录）、`FORK_SYNC`、`AGENTS.md` 与 `apps/desktop/README` 同步到按品牌派生的身份模型；图标、标语等品牌图形沿用当前仓库版本，不取上游。

### 校验

* 上游改过、fork 未改的 1196 个文件与 `upstream/master` 逐字节一致（0 失配），即上游改动全部落地、没有被 fork 侧覆盖。
* 上游本轮删除的 3 个模块（`session-reveal`、`useAnchoredPosition`、`HeaderAction`）在源码中已无引用，随上游一并移除。
* fork 自有文件 3309 → 3300，差额即上述 9 个上游重构删除的文件（含对应测试），无其他 fork 文件丢失。
* 品牌契约逐项复验：`FishLogo` 仅存于 ui-primitives，`BirdLogo`/`BirdWordmark`/`LoginPanel` 均落在 fork 自有表面，窗口图标与安装器品牌资源未回退到上游图形。
* 本轮 `git merge upstream/main --no-ff` 共 7 个冲突，全部是文档：`CHANGELOG.md` 与 5 组中英配对 README（`apps/desktop`、`ui-sdkwork-iam`、`sdkwork-oem`）的正文与配对哈希；无源码、无配置、无锁文件冲突。
* 冲突裁决逐项复验：IAM 深链 scheme 保留 fork 的 `daxuedazi://auth/callback`（`packages/host/sdkwork-oem/src/config.ts` 的 `DEFAULT_IAM_REDIRECT_URI` 未被上游 `birdcoder://` 覆盖），`agent.app.config.json` 的 relying-party 注册与上游一致；上游新增的「页面内登录表面」说明照单接收。
* 文档正文合并后由 `verify-translation-pairing --write` 重算 3 份配对记录并回校验通过；`sdkwork-oem` 仅配对哈希冲突（正文两侧一致），重录后与正文匹配。
* 上游 268 个提交全部落地（`git rev-list --count HEAD..upstream/main` 为 0），`sdkwork-*` 包与 `ui-sdkwork-*` 目录无删除。

### 测试与文档

* 会话页头、工作区行菜单、Hero 品牌断言与桌面菜单 spec 按合并后的实现更新（页头 `renderFactorySlot`、行菜单 `contextMenu.button`、macOS Edit 子菜单与 Linux 隐藏菜单）。
* 5 组中英配对文档（`apps/desktop`、`apps/desktop/packaging`、`ui-conversation`、`ui-model-selection`、`ui-primitives`）合并正文后重算配对记录，`verify-translation-pairing` 校验通过。
* 本轮冲突涉及的 3 组配对文档（`apps/desktop`、`ui-sdkwork-iam`、`sdkwork-oem`）中英两侧同步改写后重算配对记录，`verify-translation-pairing` 逐对校验通过。
