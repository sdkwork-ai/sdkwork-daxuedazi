# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.1（fork 发布 2026-11-05）

本版本把上游 `deepseek-harness` `dsh-v0.2.2-rc.1` 整体合并进来：本地执行 `git merge upstream/main --no-ff`，把 `636cfbbc86`..`1c45658511` 的 268 个上游提交合入 `main`——真实双亲合并提交，上游作者、日期、commit message 与代码注释原样进入历史。窗口主体是 `8bd073392e` → `fcc0ad4621` 的 260 个上游提交（tag `dsh-v0.2.2-rc.1`），其后是 upstream 侧对本次同步的类型与测试修复、以及面板锚定回退的还原。窗口尾部再追加 `1c45658511`..`82bb8a137d` 的 2 个上游提交（`05ce989c33` 的输入框能力行、公众号账号弹层与启动页品牌，`82bb8a137d` 的版本线与 pin 前进），与前者在同一天、同一版本内收口。同时结清上一轮尚未发布的自有改动（打在 `birdcoder-v0.2.2-alpha.6` 之后的 alpha.7 内容）。冲突一律 fork-first 解决——SDKWork 组件、BirdCoder 品牌与发布车道不被上游覆盖，双方都改过的同一行为取并集后按上游新结构落地。

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

#### 本轮自有改动（OEM 商城表面与模式栏默认）

* OEM 部署的商城类表面（App Store、模板库、需求大厅）改为「默认隐藏、一处开关放行」：`brands/*.json` 新增三个 profile 字段，侧栏偏好在原有单列 `hidden` 之外新增「显式显示」列，任一字段为 `true` 时该行随部署默认可见；设置页开关仍是两个方向上的覆盖手段。旧用户存下的 blob 在加载时按两列形状归一化——显式隐藏保留，新默认只作用于从未碰过的行。`verify-oem-identity` 断言三个默认、三个读取方与三对 id/读取器映射。
* 模式栏（`ui-sdkwork-app-modes`）同口径：`SHIPPED_VISIBLE_MODES` 清空，出货布局只留固定模式，App Store 与搜索等可隐藏模式一律默认隐藏，定制弹层是重新打开的入口。`LAYOUT_REVISION` 进到 3，一次性迁移改成按 revision 的步骤表：存于 revision 2 的布局（App Store 可见）被隐藏一次，此后用户自己的改动按当前 revision 记账、不再被迁移改写。OEM 字段不控制模式栏，只决定侧栏行的出货可见性。
* 场景外观与启动图标：`ui-primitives` 新增 `oem-brand.ts`，按品牌提供场景底色与图形；`apps/desktop` 的 `app-icon.ts`、`main.ts`、`welcome-window.ts` 让窗口、欢迎窗与关于面板都用同一份品牌栅格，图形仍取自当前仓库的 BirdCoder/学伴AI 资产，不取上游。

#### 发布前依赖与安装期配置（本次发布）

* 75 个 fork 自有包（70 个 `packages/*`、5 个 `apps/sdkwork-*`，含 `packages/host/sdkwork-desktop-carrier`、`packages/bundle/sdkwork-desktop-app`、`packages/client/ui-sdkwork-*` 等）的版本从 `0.2.2-alpha.7` 统一到 `0.2.2-rc.1`，`verify-version-sync` 报告 450 个清单一致。`DshFamily.verifyVersions` 要求 dsh 家族共享同一个版本，否则 `pack:pack-local-packages` 在打包中途失败——六个平台的桌面打包都会在 pack 阶段直接失败；此前只有上游同步带来的 375 个成员被推进，fork 自有包漏在 alpha.7。
* 排查并定位了 Windows 上桌面打包在 `prepare-dsh` 阶段停滞的根因，并撤回了先前的临时规避：运行时内置的 pnpm 11.28.5 在把 store 使用方登记为 `store/v11/projects/<hash>` 时，会留下普通空目录而非目录联接，随后用 `fs.promises.unlink` 删除该目录被 Windows 以 `EPERM` 拒绝；先前引入的 `pnpm-windows-junction-unlink.cjs`（`--require` 注入、把 EPERM 退化为 `rmSync`）只能让这一步反复重试，反而把快速失败变成无界循环，已随本次提交移除。同一台机器上 pnpm 12.4.1 可正常完成该登记，11.28.5 不可，且用单个依赖的最小工程、全新 store 均可复现，属环境侧行为而非本仓代码缺陷；运行时 pnpm 版本是上游自 2026-10-07 起的固定 pin（`apps/desktop/package.json`、`packageManager`、specs 多处引用），本版不改动，桌面打包以 CI 的干净 runner 为准。
* 32 个 SDKWork 兄弟仓 pin 再次前进到各自 `origin/main` 的最新提交（`sdkwork-iam` → `920b01af`、`sdkwork-web-framework` → `11baa767`、`sdkwork-agents` → `052b9185`、`sdkwork-account` → `e12912b6` 等），`sdkwork-core`、`sdkwork-ui`、`sdkwork-utils`、`sdkwork-appbase`、`sdkwork-catalog`、`sdkwork-database` 已在最新处未动；本地仍由 `pnpm-workspace.yaml` 以 `../sdkwork-*` 相对路径解析，发布车道由 `scripts/sdkwork-sources.manifest.json` 的 pin 克隆同名兄弟仓，两种形态共用同一份 pin 记录。`agent.workflow.json` 的 `dependencies[].ref` 与 manifest 逐条对齐——`verify-sdkwork-dependencies` 要求两处记录逐字一致，否则 `build --profile local` 直接失败。
* 容器部署的安装期配置全部改为环境变量可覆盖，安装时不必改 Compose 文件：`DSH_WEB_PORT` 同时决定容器内监听端口与发布端口，健康检查读取同一变量；`DSH_PUBLISH_HOST`/`DSH_PUBLISH_PORT` 调整宿主机侧；`DSH_DATA_DIR`/`DSH_WORKSPACE_DIR` 接受宿主路径，把 `/data`、`/workspace` 从托管命名卷改为绑定挂载。`verify-container` 逐项断言这些变量，`release:verify-container-bundle` 在发布包上复核同一套定义。
* `plugins/dsh-im`（v5.10.0，`c826bfa4`）、`plugins/dsh-mcp-connector`（v0.2.93，`80f61822`）、`plugins/dsh-skill-market`（v2.0.7，`4cda9309`）已在其跟踪分支最新处；`plugins/dsh-better-sidebar` 本轮随上游跟到 `v0.30.0`（`11e6c8e6`，43 个提交）：该版本把基线抬到 DSH 0.2.2-rc.1，peer 与 `engines.dsh` 都要求 `>=0.2.2-rc.1`，与本次发布的主机版本一致，旧 pin（`0.29.0`）的 peer 仍停在 `^0.2.1-rc.1`。上一版因它在 workspace 混合布局下与宿主 vendor Cordis 4.1.0 的 module augmentation 不合并（`Property 'settings' does not exist on type 'Context'`）而未采纳，本轮上游按宿主 toolchain 出包后该阻塞解除，子模块随之前进。
* `sdkwork-iam` pin 前进到 `920b01af`（`scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 逐字一致）：`pnpm-workspace.yaml` 已把 `sdkwork-iam-pc-oauth` 列为成员，而旧 pin 上发布车道克隆出的兄弟仓没有这个目录，工作区解析会在打包前就失败。
* 插件随子模块前进把 devDependencies 从 `0.2.1-rc.1` 抬到 `0.2.2-rc.1`，锁文件里 0.2.1-rc.1 的 700 余条 registry 解析随之消失，改由工作区链接提供；`pnpm install --frozen-lockfile` 通过。

#### 桌面端品牌身份与开发车道（`3c74f3f3ba`）

* **每个品牌独占一个 loopback Web 端口**：品牌清单新增 `desktop.webPort`（BirdCoder `19387`、学伴AI `19400`），外壳经 `hostWebPort()` 把它交给 Desktop Host（`DSH_DESKTOP_HOST_WEB_PORT`），两个品牌同时安装不再抢同一个监听而启动失败；显式指定端口仍然优先，畸形值原样下传由 Host 自己报错。
* **开发车道改用品牌身份**：`pnpm dev:desktop` 的固定端口（19388/19389/9222/9229/9230）与 `DSH_HOME` 继承已移除，改为 `apps/desktop/scripts/development-identity.ts` 按品牌端口段与品牌 home 派生，开发车道不再与已安装应用、或同机另一份 checkout 的车道冲突，也不再往别的应用 home 里写会话与凭据。
* **OEM 校验加固**：`scripts/verify-oem-identity.ts` 把 `webPort` 纳入「两品牌不得共享」的身份字段，并把 `dev.ts`、`development-identity.ts` 列为 OEM 归属文件，同时断言外壳仍把品牌 Web 端口交给 Host、仍按 `brand.desktop.protocol` 注册 URL scheme。
* **品牌资产与文案**：`brands/*.json`、`brands/README`（中英双语与配对记录）、`FORK_SYNC`、`AGENTS.md` 与 `apps/desktop/README` 同步到按品牌派生的身份模型；图标、标语等品牌图形沿用当前仓库版本，不取上游。

#### 本轮同步新增的上游能力

* 输入框的 Add 区新增「技能 / MCP / 知识库」三行（`ui-sdkwork-capabilities`）：每行只在自己被打开时加载对应目录（会话可用的技能、托管 MCP 服务器、已登录用户的知识库），复用共享的 popupSelect 外壳做搜索与键盘选择，选中结果落进当前草稿——技能插入 `/name` 手势交给 Host 展开、MCP 插入「用这台服务器的工具」的指令、知识库插入链接与检索到的段落（检索为空或失败时保留链接并给出提示，不阻塞这次选择）。子代理会话与没有保留绑定的会话不出现这三行。
* 设置菜单在 relay API key 行之上新增「公众号账号」行（`ui-sdkwork-official-accounts`）：打开的是账号表格加自定义菜单编辑器的弹层，内容是 SDKWork IAM 的 `@sdkwork/iam-pc-oauth` 面板，挂在新增的 root 级 `settings.officialAccounts` 座位上，开合语义与 API key 弹层一致。
* 前端插件加载前的启动页渲染 fork 品牌 lockup（图形在名称上方，`boot-brand.ts`），不再回落到上游 wordmark；标记同时是文档 favicon 的同一份栅格。
* 知识库服务（`ui-sdkwork-knowledge`）新增目录与检索接口 `knowledgeBases`，供上面三行消费。

#### 开发体验

* `desktop:dev` 的参数解析抽到 `development-arguments.ts`，并先丢掉 argv 里的 `--` 分隔符：`pnpm desktop:dev -- --gateway domain` 这种 pnpm 文档写法此前会被 `parseArgs` 当成位置参数而直接报错。fork 的开发车道身份派生（`development-identity.ts` 按品牌端口段与品牌 home 派生）在该解析器之后应用，两套逻辑并存。

### 校验

* 上游改过、fork 未改的 1196 个文件与 `upstream/master` 逐字节一致（0 失配），即上游改动全部落地、没有被 fork 侧覆盖。
* 上游本轮删除的 3 个模块（`session-reveal`、`useAnchoredPosition`、`HeaderAction`）在源码中已无引用，随上游一并移除。
* fork 自有文件 3309 → 3300，差额即上述 9 个上游重构删除的文件（含对应测试），无其他 fork 文件丢失。
* 品牌契约逐项复验：`FishLogo` 仅存于 ui-primitives，`BirdLogo`/`BirdWordmark`/`LoginPanel` 均落在 fork 自有表面，窗口图标与安装器品牌资源未回退到上游图形。
* 本轮 `git merge upstream/main --no-ff` 共 7 个冲突，全部是文档：`CHANGELOG.md` 与 5 组中英配对 README（`apps/desktop`、`ui-sdkwork-iam`、`sdkwork-oem`）的正文与配对哈希；无源码、无配置、无锁文件冲突。
* 冲突裁决逐项复验：IAM 深链 scheme 保留 fork 的 `daxuedazi://auth/callback`（`packages/host/sdkwork-oem/src/config.ts` 的 `DEFAULT_IAM_REDIRECT_URI` 未被上游 `birdcoder://` 覆盖），`agent.app.config.json` 的 relying-party 注册与上游一致；上游新增的「页面内登录表面」说明照单接收。
* 文档正文合并后由 `verify-translation-pairing --write` 重算 3 份配对记录并回校验通过；`sdkwork-oem` 仅配对哈希冲突（正文两侧一致），重录后与正文匹配。
* 上游 268 个提交全部落地（`git rev-list --count HEAD..upstream/main` 为 0），`sdkwork-*` 包与 `ui-sdkwork-*` 目录无删除。
* 本轮第二次同步（`1c45658511`..`82bb8a137d`，2 个上游提交）同样走 `--no-ff` 真实合并：唯一冲突是 `CHANGELOG.md`，按「fork 自有条目 + 上游新增条目」取并集落地；`AGENTS.md`、`dev.ts`、`agent.workflow.json`、`pnpm-lock.yaml`、`scripts/sdkwork-sources.manifest.json`、`cordis.patch.yml` 与 5 个 `apps/sdkwork-*` 清单均自动合并，无源码与锁文件冲突。
* 合并未删除任何文件（`git diff --diff-filter=D` 为空），`sdkwork-*` / `ui-sdkwork-*` 包与目录无丢失；`plugins/dsh-better-sidebar` 子模块指针随上游前进到 `11e6c8e6`（v0.30.0）。
* 品牌契约再次逐项复验：`FishLogo` 仍只在 ui-primitives，`BirdLogo`/`BirdWordmark`/`LoginPanel` 未受影响，`createBootBrand()` 接管启动页，窗口与安装器图形仍是当前仓库资产。
* 版本线复验：`grep '"version": "0.2.2-rc.1"'` 命中 450 个 `package.json`，`@deepseek-ai/dsh-sdkwork*` 家族无成员落后在 alpha 线。

### 测试与文档

* 会话页头、工作区行菜单、Hero 品牌断言与桌面菜单 spec 按合并后的实现更新（页头 `renderFactorySlot`、行菜单 `contextMenu.button`、macOS Edit 子菜单与 Linux 隐藏菜单）。
* 5 组中英配对文档（`apps/desktop`、`apps/desktop/packaging`、`ui-conversation`、`ui-model-selection`、`ui-primitives`）合并正文后重算配对记录，`verify-translation-pairing` 校验通过。
* 本轮冲突涉及的 3 组配对文档（`apps/desktop`、`ui-sdkwork-iam`、`sdkwork-oem`）中英两侧同步改写后重算配对记录，`verify-translation-pairing` 逐对校验通过。
* 新增 8 个 spec：`ui-sdkwork-capabilities` 的 rows/options/insertion、`ui-sdkwork-official-accounts` 的 host/modal/浏览器插件、`ui-sdkwork-knowledge` 的目录、`apps/desktop` 的参数解析；`ui-commands`、`ui-sdkwork-settings-menu`、`ui-sdkwork-sidebar`（子模块契约）与启动页 spec 按新实现更新。
