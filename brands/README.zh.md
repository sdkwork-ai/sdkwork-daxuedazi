# 品牌清单（OEM）

[English](README.md) | 中文

每个应用品牌一份 JSON 文件。品牌是一个已安装应用的完整身份：它拥有的 Harness home、Electron 产品名、回环 Web 端口、URL scheme、桌面命令、更新缓存目录与产物命名。由本仓库构建的两个品牌之所以能并排安装、运行、更新和卸载，正是因为上述值无一共用。

`daxuedazi.json` 是出厂品牌，打包脚本与 Electron 外壳默认派生的一切都来自它；`birdcoder.json` 仍是本仓库可以打包的第二个品牌，两者不共用任何已安装身份。下面的 [OEM 自有内容清单](#oem-owned-surfaces) 列出每次 upstream 合并必须保留的每个文件，`pnpm run verify-oem-identity` 会在每次合并后校验它。

## 文件

| 文件 | 归属 | 用途 |
|---|---|---|
| `brands/<key>.json` | 本仓库 | 一个品牌的构建期来源 |
| `brands/<key>.oem.json` | 部署方 | 打包为 `resources/oem.json` 的 OEM profile；除出厂品牌外每个品牌都必须提供，因为共享默认值写的是出厂品牌的显示名与 IAM 回调 scheme |
| `resources/brand.json`（打包应用内） | 打包 | 所选清单的运行时副本 |
| `resources/oem.json`（打包应用内） | 打包 | 存在 `<key>.oem.json` 时的运行时副本 |

## 选择品牌

优先级从高到低：

1. `DSH_BRAND_CONFIG=/abs/path/brand.json` —— 显式清单，适用于把品牌文件放在别处的打包通道。
2. `DSH_BRAND=<key>` —— `brands/<key>.json`。
3. `daxuedazi` —— 出厂品牌。

打包沿用同一优先级，把所选文件写成 `resources/brand.json`，并在 `<key>.oem.json` 存在时把它复制为 `oem.json`。运行时外壳读取 `resources/brand.json`；源码检出（`pnpm dev:desktop`）则读取 `brands/<key>.json`。

<a id="fields"></a>

## 字段

| 字段 | 含义 | 示例 |
|---|---|---|
| `key` | 小写品牌键；决定文件名并出现在日志中 | `daxuedazi` |
| `displayName` | 直接读取清单的界面所用的产品名 | `学伴AI` |
| `companyName` | 打包元数据中的厂商名 | `SDKWork` |
| `home.dirName` | 用户主目录下的 Harness home 目录名；带点且小写，避免在大小写不敏感的文件系统上互相冲突 | `.daxuedazi` |
| `home.adoptLegacyDshHome` | 打包后的首次启动是否可以接管已存在的 `~/.dsh` | `false` |
| `desktop.appId` | 反向域名标识；拥有 Windows 安装器 GUID，因而决定下一次安装要升级的目录、卸载登记与 macOS bundle id | `com.sdkwork.daxuedazi` |
| `desktop.releaseRepository` | 发布该品牌 Release 的 GitHub `owner/repo`；打包后的更新器从它读取 `latest.yml` | `sdkwork-ai/sdkwork-daxuedazi` |
| `desktop.productName` | Electron 产品名；决定 userData、单实例锁与日志目录 | `daxuedazi` |
| `desktop.executableName` | 已安装的可执行文件名与 macOS `MacOS/<name>` | `daxuedazi` |
| `desktop.protocol` | 外壳注册的自定义 URL scheme | `daxuedazi` |
| `desktop.commandName` | 桌面命令、启动脚本文件名与归属回执前缀 | `daxuedazi` |
| `desktop.registryKey` | Windows PATH 归属键与互斥体名 | `DaXueDaZi` |
| `desktop.updaterCacheDirName` | electron-updater 缓存目录 | `daxuedazi-updater` |
| `desktop.artifactPrefix` | `-<version>-<os>-<arch>` 之前的产物前缀 | `daxuedazi` |
| `desktop.webPort` | 品牌九个回环端口中的第一个；打包外壳使用它，源码通道与其调试端口使用其余八个 | `19400` |

`parseBrandManifest` 拒绝畸形取值与上游身份（`~/.dsh`、`DeepSeek Harness`、scheme 与命令 `dsh`、`com.deepseek.harness`）。拼写错误会让构建失败，而不是静默地把一个应用的数据拆到两个 home。`desktop.webPort` 接受 1024 到 65527，因为整个[端口块](#ports)都必须可用；取值不给端口块留空间的属于构建错误，而不是让某条通道落到被截断的端口上。

`desktop.appId` 是"已安装身份"而不是标签：electron-builder 对它求哈希得到 NSIS GUID，而该 GUID 正是下一个安装器读取的 `Software\<GUID>\InstallLocation` 记录的键。因此共享同一个 app id 的两个产品无法并排安装——第二个安装器会把第一个产品的目录当成自己的上一版安装，原地升级并接管它的卸载登记。打包从本清单取该标识；若 `DSH_DESKTOP_APP_ID` 指向本仓库发布的其他品牌或上游应用，打包会同时报出两个身份并失败，而不会覆盖那个产品。该变量要么不设，要么重复所选品牌的值。

`desktop.releaseRepository` 是更新身份：打包后的 `app-update.yml` 指向它，electron-updater 从它下载 `latest.yml`，而一个仓库只有一个 `latest` 指针。因此共享同一个仓库的两个品牌共享同一条更新流——任一产品的新版本都会被推送给两者，安装后即替换另一个产品。打包从本清单读取该仓库，拒绝在别的仓库里构建该品牌，并在产物上回读确认更新配置指向本仓库；OEM 构建不会再拿到它 fork 来源产品的 Release。

`desktop.protocol` 同时承载 SDKWork IAM 浏览器登录回调：更换该 scheme 的 OEM 品牌必须在其 OEM profile 中把 `sdkwork.iamRedirectUri` 设为 `<scheme>://auth/callback`（见[OEM profile](../packages/host/sdkwork-oem/README.zh.md)），因为打包外壳只能接收操作系统已登记 scheme 的 URL。OAuth 客户端 id 默认取同一个 scheme，因此租户为每个安装品牌注册各自的公共客户端，不会复用其他品牌的。

<a id="ports"></a>

## 端口

回环端口和 home 一样按品牌配置。一个品牌从 `desktop.webPort` 起拥有九个连续端口，因此两个已安装应用、它们的两个源码通道以及每条通道的调试端口都不会争用同一个监听端口或调试端口：

| 偏移 | 归属 | 出厂品牌 | 第二个品牌 |
|---|---|---|---|
| `+0` | 已安装外壳的 Web 应用 | `19400` | `19387` |
| `+1` | `pnpm dev:desktop` 的 Web 应用 | `19401` | `19388` |
| `+2` | `pnpm dev:desktop:online` 的 Web 应用 | `19402` | `19389` |
| `+3`-`+5` | `dev:desktop` 的 Main、Renderer 与 Host inspector | `19403`-`19405` | `19390`-`19392` |
| `+6`-`+8` | `dev:desktop:online` 的 Main、Renderer 与 Host inspector | `19406`-`19408` | `19393`-`19395` |

因此两个品牌的首端口至少相差九个端口。这不靠评审记住：`brandPortCollisions` 读取 `brands/` 下的每份清单，端口块重叠时打包直接失败；`verify-oem-identity` 在上游同步时以冲突的一对品牌与两段范围报错；`apps/desktop/tests/development-identity.spec.ts` 锁定出厂端口集合。只有当某次启动显式指定端口时，通道才会离开自己的端口块：`DSH_DESKTOP_HOST_WEB_PORT`、`DSH_DESKTOP_MAIN_INSPECT_PORT`、`DSH_DESKTOP_RENDERER_DEBUG_PORT` 与 `DSH_DESKTOP_HOST_INSPECT_PORT`。

仍然运行上游未改动开发启动器的检出保留上游的固定端口；本端口块描述的是本仓库的清单与启动器，也正是门禁能够证明的部分。

## Harness home

启动器在任何插件挂载之前解析 home，并把它导出为 `DSH_HOME`——所有使用方本就读取该变量：

1. 显式 `DSH_HOME` —— 测试、CI、便携安装。
2. `~/<home.dirName>` —— 品牌自己的 home。
3. 旧 `~/.dsh`，仅当品牌设置 `home.adoptLegacyDshHome` 且仅在打包启动时：
   - 首次启动把 `~/.dsh` 重命名为品牌 home（同盘移动，会话、凭据、profile 与工作区随之迁移）；
   - 重命名被拒时——旧实例可能仍占用文件——改为创建目录联接；
   - 两者都失败时本次启动继续使用 `~/.dsh` 并报告，应用仍能启动且数据不丢失。

未设置 `adoptLegacyDshHome` 的品牌始终使用自己的目录，永不读取 `~/.dsh`：导入其他产品的凭据与会话，比从空目录开始更糟，而共用目录会让两个已安装品牌读到同一个 home。接管旧 home 的品牌在源码启动时从不重命名；品牌 home 存在就用它，否则继续使用 `~/.dsh`。

随包提供的 `resources/oem.json` 只有在 home 中没有自己的 `oem.json` 时才成为默认 `DSH_OEM_CONFIG`，因此部署方可以只读地提供端点，用户仍可在 `~/.<brand>/oem.json` 中覆盖。

打包应用会把 home 作为 `DSH_HOME` 导出给每个子进程，因此从某个品牌启动的终端会携带该品牌的 home。开发启动器因此拒绝由其他品牌（或上游 `~/.dsh`）拥有的继承 `DSH_HOME`，改用 `apps/desktop/.desktop-build/` 下自己的状态根并报告被拒绝的路径；其他显式 `DSH_HOME` 仍会替换通道的 home。

## 新增品牌

1. 把 `brands/daxuedazi.json` 复制为 `brands/<key>.json`，修改 `key`、`displayName`、`companyName`、`home.dirName` 与每个 `desktop` 值；新品牌的 [`desktop.webPort`](#ports) 端口块必须与既有每个品牌至少相差九个端口，并须给它自己的 [`desktop.releaseRepository`](#fields)——即将发布其 Release 的仓库。除非新品牌要替代既有的 `~/.dsh` 安装，`home.adoptLegacyDshHome` 保持 false。
2. 替换该品牌的构建期位图：`build/icon.{ico,icns,png}`、`resources/icon{,-windows,-macos}.png`、安装器品牌图（`pnpm --dir apps/desktop run generate-icons` 与 `generate-installer-brand` 重新生成出厂那一套），以及欢迎页标识。运行时从不替换图片。
3. 用 `DSH_BRAND=<key>`（以及通道需要的 `DSH_DESKTOP_UNSIGNED` 与签名变量）通过 `package:*` 脚本构建。不要设置 `DSH_DESKTOP_APP_ID`：身份由清单提供，指向其他品牌的值会让打包失败。
4. 校验：`pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts apps/desktop/tests/desktop-application-identity.spec.ts`，然后并排安装两个品牌，确认两个 home（`~/.daxuedazi`、`~/.<key>`）、两个 userData 目录、两个 URL scheme、两个命令与两段互不重叠的端口块——在一个品牌运行时启动另一个，正是这套清单要避免的冲突。

<a id="oem-owned-surfaces"></a>

## OEM 自有内容清单

以下内容属于 OEM：上游拥有的是周围的代码，本仓库拥有让交付应用成为 `daxuedazi` 的品牌值、名称、路径与流程。upstream 合并取上游的结构、保留这些值；`pnpm run verify-oem-identity` 会指出失配的具体面，因此合并无法悄悄回退其中任何一项。本仓库遵循的平台级规则——品牌声明与校验、每个发布文件上的产物前缀、可并列安装的身份，以及发布品牌构建必须提供的验证——的规范文本位于 `../sdkwork-specs/OEM_BRANDING_SPEC.md`。

| 面 | OEM 内容 | 合并规则 |
|---|---|---|
| `brands/<key>.json` | 两个已安装品牌不得共用的全部身份值：app id、发布仓库、产品名、可执行名、URL scheme、命令、Windows PATH 键、更新缓存、产物前缀、九端口回环块、home 目录 | 保留两份清单，保持端口块互不重叠，并给每个品牌各自的发布仓库；上游没有等价身份可取代 |
| `apps/desktop/scripts/brand-manifest.mjs` + `.d.mts` | 清单加载与校验、`DEFAULT_BRAND_KEY`、`BRAND_PORT_BLOCK`、`brandPortCollisions`、拒绝上游身份 | 保留本分支实现；清单结构变化属于产品变更，不是同步 |
| `apps/desktop/package.json`（`productName`） | Electron 应用名，决定 userData、日志、单实例锁与 Windows 安装目录 | 保持 `daxuedazi`；打包配置会拒绝与出厂品牌不一致的取值 |
| `apps/desktop/scripts/electron-builder-config.mjs` | `productName`、`extraMetadata.productName`、`executableName`、`artifactName`、protocols、app id 回退、更新缓存目录、`resources/brand.json`、端口块冲突拒绝 | 保留每个品牌派生字段，同时接纳上游新增的打包字段 |
| `apps/desktop/cli/daxuedazi` + `daxuedazi.cmd` | 已安装启动器模板（`@BRAND_HOME@`、可执行名、命令名） | 保留这两个启动器；上游的 `dsh` 启动器属于另一个应用 |
| `apps/desktop/scripts/dev.ts` + `apps/desktop/scripts/development-identity.ts` | 源码通道的 Web 与 inspector 端口（取自品牌端口块）以及对其他品牌导出到环境中的继承 `DSH_HOME` 的拒绝 | 保留该派生；写死的通道或 inspector 端口、被接管的 home 属于合并缺陷 |
| `apps/desktop/src/brand.ts` | 解析本次启动的品牌、拥有 `~/.<home.dirName>`、导出 `DSH_HOME`，并把品牌 Web 端口交给 Host；未声明 `adoptLegacyDshHome` 的品牌永不读取 `~/.dsh` | 保留该模块及其隔离分支；把它重新落到上游的启动流程改动上 |
| `apps/desktop/src/main.ts` | 注册 `brand.desktop.protocol`、用 OEM 品牌命名关于面板、应用品牌窗口图标与托盘身份，并把 `desktop.webPort` 传给 Desktop Host | 在上游重构后的 `main.ts` 中保留这些调用点 |
| `apps/desktop/src/locale.ts` 命令文案 | `cliCommand*` 文案写出出厂 `daxuedazi` 命令与终端调用方式 | 保留出厂命令拼写；其他品牌构建需重新拼写 |
| `apps/desktop/src/command-*.ts` + `scripts/command-path.ps1` | 命令归属回执、Windows PATH 键与互斥体名，全部来自清单 | 保留清单派生名，绝不写死品牌 |
| `apps/desktop/installer/*` + `scripts/installer.nsh` | 安装器位图与文案、路径行、运行/启动检查、删除目标；卸载只清理 `%APPDATA%<productName>` | 保留本分支安装器文件，按语义合并上游的 NSIS 修复 |
| 产物命名派生：`package-target.ts`、`package-macos.ts`、`prepare-cli.ts`、`smoke-packaged-runtime.ts`、`desktop-upload-plan.ts`、`desktop-build-version-discovery.ts`、`retain-desktop-ci.ts`、`installed-update-distribution.ts`、`scripts/release/assemble-github-release.ts`、`scripts/release/container-artifacts.ts` | 每个产出、上传、留存的文件名都以所选品牌的 `artifactPrefix` 开头：Desktop 安装包（`<prefix>-<version>-<os>-<arch>`）、容器部署包（`<prefix>-container-<version>.tar.gz`）、每个已保存镜像归档（`<prefix>-container-image-<version>-linux-<arch>.tar.gz`），以及引用它们的 Actions artifact 与指南命令 | 保留派生，并把容器名称留在唯一归属 `container-artifacts.ts`；任一通道、工作流或指南出现字面 `deepseek-harness-`、`birdcoder-`、`dsh-container` 或 `daxuedazi-` 前缀即属合并缺陷 |
| `.github/workflows/container-release.yml` + `scripts/release/pack-container.ts` + `scripts/release/verify-container.ts` + `INSTALL*.md` + `docs/user/guide/deployment*.md` | 容器发布资产名：工作流在 `resolve` 作业中解析 `desktop.artifactPrefix`，打包脚本与汇总器据此派生，校验门禁断言工作流与指南仍在使用它 | 保留派生；Compose 与 Kubernetes 内的镜像引用是部署身份而非发布资产名，保持其应用名 |
| `packages/host/sdkwork-oem` | OEM profile schema、出厂显示品牌、`ui.sceneSwitcher` / `ui.skillTags` 产品外观默认值、`ui.appStore` / `ui.templateLibrary` / `ui.demandHall` 出厂可见性默认值、IAM 回调默认值（scheme 即品牌 protocol） | 保留 profile 契约；回调 scheme 必须跟随 `desktop.protocol`；五个界面字段默认全部为 `false`，因此出厂构建既不挂载场景外观，也不在侧栏显示商店行 |
| `packages/client/ui-primitives/src/oem-brand.ts` | 同一 IAM 回调的浏览器兜底，以及每个客户端门禁与侧栏默认值使用的 `readOemSceneSwitcher` / `readOemSkillTags` / `readOemAppStore` / `readOemTemplateLibrary` / `readOemDemandHall` 读取器 | 两处默认值必须同步；客户端只能通过这些读取器读取界面开关 |
| `packages/client/ui-sdkwork-app-modes` | 只有在 OEM 开关允许时才注册场景胶囊座位、两个技能标签条座位、提交观察者与通用设置中的场景切换行 | 保留 `readOemSceneSwitcher` / `readOemSkillTags` 门禁；无条件注册属于合并缺陷 |
| `packages/client/ui-sdkwork-skills` | `ui.skillTags` 关闭时技能页不显示标签条总开关；逐技能的推荐开关保留 | 只在标签条总开关上保留 `readOemSkillTags` 门禁 |
| `packages/client/ui-sdkwork-sidebar` | 侧栏布局偏好通过 `shippedHiddenEntryIds()` 出厂隐藏 `sdkwork-appstore`、`sdkwork-template-library`、`sdkwork-demand-hall` 三行；它分别保存用户显式隐藏与显式显示的 id，因此设置 → 侧栏里的开关始终有效 | 保留三组 id/读取器映射与显式显示列表；合并丢掉任一项都会让商店行重新出现在出厂侧栏，或把用户已打开的行重新隐藏 |
| 启动图标：`apps/desktop/src/app-icon.ts`、`apps/desktop/src/main.ts`、`apps/desktop/src/welcome-window.ts`、`apps/desktop/build/icon.{png,ico,icns}`、`apps/desktop/resources/icon*.png`、`resources/tray-windows.ico`、`renderer/assets/welcome-bird.png`、`apps/desktop/scripts/electron-builder-config.mjs` | 每个启动表面显示的学伴AI 吉祥物：Dock 图像、Windows 任务栏身份、欢迎窗口与主窗口、托盘、安装器与各打包目标 | 保留规范位图与每个接线点；任何 profile 或品牌字段都不得选择另一张图片（`brand.icon` / `ui.icon` 会被拒绝），合并丢掉 `resolveApplicationIcon` / `resolveWindowIcon` 或打包器的 `brandIcon(...)` 条目即属缺陷 |
| `packages/client/ui-sdkwork-appstore` | 应用商店的模式栏入口、键控页面、侧栏快捷入口与 SDKWork 宿主适配器全部挂载，保证侧栏行与设置开关可达 | 保持插件挂载；隐藏默认值属于侧栏偏好，不属于插件 |
| `packages/client/ui-sdkwork-template-library` | 模板库的快捷入口、键控页面与 SDKWork 宿主适配器全部挂载，保证侧栏行与设置开关可达 | 保持插件挂载；隐藏默认值属于侧栏偏好，不属于插件 |
| `packages/client/ui-sdkwork-demand-hall` | 需求大厅的快捷入口、键控页面、SDKWork 宿主适配器与需求转项目端口全部挂载，保证侧栏行与设置开关可达 | 保持插件挂载；隐藏默认值属于侧栏偏好，不属于插件 |
| 文档与门禁：`AGENTS.md` 的 OEM 小节、本页、`FORK_SYNC.md`、`INSTALL*.md`、`docs/user/guide/desktop*.md`、`apps/desktop/README*.md` | 其中描述的身份、路径、命令、产物名与合并规则 | 保留 OEM 陈述，把上游新增叙述合并进来 |
| 测试与快照：`apps/desktop/tests/*brand*`、`*identity*`、`*packaging*`、`*publication*`、`expected/*` | 锁定 OEM 取值的断言与 fixture | 保留 OEM 期望；仅当契约本身变化时才刷新快照 |

合并规则：

- 按文件逐个解决，绝不按整树处理：禁止 `git checkout --ours .`、`--theirs .`、`-X ours`、`-X theirs`，也禁止删除文件来掩盖冲突。
- 当上游重写了本分支拥有的文件时，取上游的结构并重新落上表中列出的 OEM 字段；丢失字段的文件属于合并缺陷，不是解决结果。
- 当上游重新引入固定端口时，把品牌端口块派生重新落回去：`apps/desktop/scripts/dev.ts` 里若仍以 `19388`、`19389`、`9222`、`9229` 或 `9230` 作为默认值，即使其他 OEM 取值都在，也属于合并缺陷。
- 合并后无条件挂载英雄区场景胶囊或输入框下方技能标签条，属于同一类缺陷：出厂配置通过 `ui.sceneSwitcher` / `ui.skillTags` 隐藏两者，门禁消失时 `verify-oem-identity` 会失败。
- 合并把启动图标接线换成 Electron 默认值，或 OEM 配置试图选择另一张图片，同样属于合并/产品缺陷：启动图标是构建期身份，`verify-oem-identity` 会校验规范位图以及每个显示它的启动表面。
- 合并后只在 OEM 开关开启时才注册应用商店、模板库或需求大厅，同样属于合并缺陷：插件必须保持挂载，设置 → 侧栏才能提供它们的开关，隐藏默认值由 `ui-sdkwork-sidebar` 的出厂隐藏映射负责。合并删除插件、从 `shippedHiddenEntryIds()` 里丢掉某个 id，或把「隐藏」硬编码到偏好之外，即属合并缺陷。
- 想突出某个商店界面的 OEM 部署在 `oem.json` 中把对应字段设为 `true`，让该行默认可见；用户自己的开关仍然优先。绝不把可见性决策挪进插件或组合。
- 在执行 `scripts/sync-upstream.sh anchor` 之前跑下面的校验；同步脚本的 `verify` 步骤会调用同一门禁。
- 只有契约本身变化时才更新快照与 fixture；绝不为把红色的 OEM 检查变绿而重新生成。

每次 upstream 合并后重新校验：

```sh
pnpm run verify-oem-identity
pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts \
  apps/desktop/tests/brand-host-port.spec.ts apps/desktop/tests/development-identity.spec.ts \
  apps/desktop/tests/desktop-application-identity.spec.ts apps/desktop/tests/installer-packaging.spec.ts \
  packages/host/sdkwork-oem packages/client/ui-primitives/tests/oem-brand.client.spec.tsx \
  packages/client/ui-sdkwork-app-modes/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-skills/tests/skills-section.client.spec.tsx \
  packages/client/ui-sdkwork-sidebar/tests/layout.client.spec.ts \
  packages/client/ui-sdkwork-appstore/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-template-library/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-demand-hall/tests/apply.client.spec.ts \
  scripts/verify-oem-identity.spec.ts
```

## 尚未按品牌配置

- 安装器文案与原生窗口字符串来自 `apps/desktop/scripts/locale*` 与 NSIS include；在 OEM 构建像替换位图那样替换它们之前，这些文案沿用出厂品牌。`apps/desktop/src/locale.ts` 中的桌面命令管理文案写的是出厂 `daxuedazi` 命令，构建其他品牌时必须重新拼写这些字符串。
- 图标与产物美术由学伴AI 的规范位图生成。
- `desktop.executableName` 决定已安装的二进制名；OEM 构建必须提供同名二进制，electron-builder 由同一字段派生它。
