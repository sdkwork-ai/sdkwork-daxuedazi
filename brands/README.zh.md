# 品牌清单（OEM）

[English](README.md) | 中文

每个应用品牌一份 JSON 文件。品牌是一个已安装应用的完整身份：它拥有的 Harness home、Electron 产品名、URL scheme、桌面命令、更新缓存目录与产物命名。由本仓库构建的两个品牌之所以能并排安装、运行、更新和卸载，正是因为上述值无一共用。

`daxuedazi.json` 是出厂品牌，打包脚本与 Electron 外壳默认派生的一切都来自它；`birdcoder.json` 仍是本仓库可以打包的第二个品牌，两者不共用任何已安装身份。下面的 [OEM 自有内容清单](#oem-owned-surfaces) 列出每次 upstream 合并必须保留的每个文件，`pnpm run verify-oem-identity` 会在每次合并后校验它。

## 文件

| 文件 | 归属 | 用途 |
|---|---|---|
| `brands/<key>.json` | 本仓库 | 一个品牌的构建期来源 |
| `brands/<key>.oem.json` | 部署方 | 可选的 OEM profile，打包为 `resources/oem.json` |
| `resources/brand.json`（打包应用内） | 打包 | 所选清单的运行时副本 |
| `resources/oem.json`（打包应用内） | 打包 | 存在 `<key>.oem.json` 时的运行时副本 |

## 选择品牌

优先级从高到低：

1. `DSH_BRAND_CONFIG=/abs/path/brand.json` —— 显式清单，适用于把品牌文件放在别处的打包通道。
2. `DSH_BRAND=<key>` —— `brands/<key>.json`。
3. `daxuedazi` —— 出厂品牌。

打包沿用同一优先级，把所选文件写成 `resources/brand.json`，并在 `<key>.oem.json` 存在时把它复制为 `oem.json`。运行时外壳读取 `resources/brand.json`；源码检出（`pnpm dev:desktop`）则读取 `brands/<key>.json`。

## 字段

| 字段 | 含义 | 示例 |
|---|---|---|
| `key` | 小写品牌键；决定文件名并出现在日志中 | `daxuedazi` |
| `displayName` | 直接读取清单的界面所用的产品名 | `学伴AI` |
| `companyName` | 打包元数据中的厂商名 | `SDKWork` |
| `home.dirName` | 用户主目录下的 Harness home 目录名；带点且小写，避免在大小写不敏感的文件系统上互相冲突 | `.daxuedazi` |
| `home.adoptLegacyDshHome` | 打包后的首次启动是否可以接管已存在的 `~/.dsh` | `false` |
| `desktop.appId` | 反向域名标识；发布通道的 `DSH_DESKTOP_APP_ID` 仍然优先 | `com.sdkwork.daxuedazi` |
| `desktop.productName` | Electron 产品名；决定 userData、单实例锁与日志目录 | `daxuedazi` |
| `desktop.executableName` | 已安装的可执行文件名与 macOS `MacOS/<name>` | `daxuedazi` |
| `desktop.protocol` | 外壳注册的自定义 URL scheme | `daxuedazi` |
| `desktop.commandName` | 桌面命令、启动脚本文件名与归属回执前缀 | `daxuedazi` |
| `desktop.registryKey` | Windows PATH 归属键与互斥体名 | `DaXueDaZi` |
| `desktop.updaterCacheDirName` | electron-updater 缓存目录 | `daxuedazi-updater` |
| `desktop.artifactPrefix` | `-<version>-<os>-<arch>` 之前的产物前缀 | `daxuedazi` |

`parseBrandManifest` 拒绝畸形取值与上游身份（`~/.dsh`、`DeepSeek Harness`、scheme 与命令 `dsh`、`com.deepseek.harness`）。拼写错误会让构建失败，而不是静默地把一个应用的数据拆到两个 home。

`desktop.protocol` 同时承载 SDKWork IAM 浏览器登录回调：更换该 scheme 的 OEM 品牌必须在其 OEM profile 中把 `sdkwork.iamRedirectUri` 设为 `<scheme>://auth/callback`（见[OEM profile](../packages/host/sdkwork-oem/README.zh.md)），因为打包外壳只能接收操作系统已登记 scheme 的 URL。

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

## 新增品牌

1. 把 `brands/daxuedazi.json` 复制为 `brands/<key>.json`，修改 `key`、`displayName`、`companyName`、`home.dirName` 与每个 `desktop` 值。除非新品牌要替代既有的 `~/.dsh` 安装，`home.adoptLegacyDshHome` 保持 false。
2. 替换该品牌的构建期位图：`build/icon.{ico,icns,png}`、`resources/icon{,-windows,-macos}.png`、安装器品牌图（`pnpm --dir apps/desktop run generate-icons` 与 `generate-installer-brand` 重新生成出厂那一套），以及欢迎页标识。运行时从不替换图片。
3. 用 `DSH_BRAND=<key>`（以及该通道的 `DSH_DESKTOP_APP_ID`、`DSH_DESKTOP_UNSIGNED`、签名变量）通过 `package:*` 脚本构建。
4. 校验：`pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts apps/desktop/tests/desktop-application-identity.spec.ts`，然后并排安装两个品牌，确认两个 home（`~/.daxuedazi`、`~/.<key>`）、两个 userData 目录、两个 URL scheme 与两个命令。

<a id="oem-owned-surfaces"></a>

## OEM 自有内容清单

以下内容属于 OEM：上游拥有的是周围的代码，本仓库拥有让交付应用成为 `daxuedazi` 的品牌值、名称、路径与流程。upstream 合并取上游的结构、保留这些值；`pnpm run verify-oem-identity` 会指出失配的具体面，因此合并无法悄悄回退其中任何一项。

| 面 | OEM 内容 | 合并规则 |
|---|---|---|
| `brands/<key>.json` | 两个已安装品牌不得共用的全部身份值：app id、产品名、可执行名、URL scheme、命令、Windows PATH 键、更新缓存、产物前缀、home 目录 | 保留两份清单；上游没有等价身份可取代 |
| `apps/desktop/scripts/brand-manifest.mjs` + `.d.mts` | 清单加载与校验、`DEFAULT_BRAND_KEY`、拒绝上游身份 | 保留本分支实现；清单结构变化属于产品变更，不是同步 |
| `apps/desktop/package.json`（`productName`） | Electron 应用名，决定 userData、日志、单实例锁与 Windows 安装目录 | 保持 `daxuedazi`；打包配置会拒绝与出厂品牌不一致的取值 |
| `apps/desktop/scripts/electron-builder-config.mjs` | `productName`、`extraMetadata.productName`、`executableName`、`artifactName`、protocols、app id 回退、更新缓存目录、`resources/brand.json` | 保留每个品牌派生字段，同时接纳上游新增的打包字段 |
| `apps/desktop/cli/daxuedazi` + `daxuedazi.cmd` | 已安装启动器模板（`@BRAND_HOME@`、可执行名、命令名） | 保留这两个启动器；上游的 `dsh` 启动器属于另一个应用 |
| `apps/desktop/src/brand.ts` | 解析本次启动的品牌、拥有 `~/.<home.dirName>`、导出 `DSH_HOME`；未声明 `adoptLegacyDshHome` 的品牌永不读取 `~/.dsh` | 保留该模块及其隔离分支；把它重新落到上游的启动流程改动上 |
| `apps/desktop/src/main.ts` | 注册 `brand.desktop.protocol`、用 OEM 品牌命名关于面板、应用品牌窗口图标与托盘身份 | 在上游重构后的 `main.ts` 中保留这些调用点 |
| `apps/desktop/src/locale.ts` 命令文案 | `cliCommand*` 文案写出出厂 `daxuedazi` 命令与终端调用方式 | 保留出厂命令拼写；其他品牌构建需重新拼写 |
| `apps/desktop/src/command-*.ts` + `scripts/command-path.ps1` | 命令归属回执、Windows PATH 键与互斥体名，全部来自清单 | 保留清单派生名，绝不写死品牌 |
| `apps/desktop/installer/*` + `scripts/installer.nsh` | 安装器位图与文案、路径行、运行/启动检查、删除目标；卸载只清理 `%APPDATA%<productName>` | 保留本分支安装器文件，按语义合并上游的 NSIS 修复 |
| 产物命名派生：`package-target.ts`、`package-macos.ts`、`prepare-cli.ts`、`smoke-packaged-runtime.ts`、`desktop-upload-plan.ts`、`desktop-build-version-discovery.ts`、`retain-desktop-ci.ts`、`installed-update-distribution.ts`、`scripts/release/assemble-github-release.ts` | 每个产出、上传、留存的文件名都以所选品牌的 `artifactPrefix` 开头 | 保留派生；出现字面 `deepseek-harness-`、`birdcoder-` 或 `daxuedazi-` 前缀即属合并缺陷 |
| `packages/host/sdkwork-oem` | OEM profile schema、出厂显示品牌、IAM 回调默认值（scheme 即品牌 protocol） | 保留 profile 契约；回调 scheme 必须跟随 `desktop.protocol` |
| `packages/client/ui-primitives/src/oem-brand.ts` | 同一 IAM 回调的浏览器兜底 | 两处默认值必须同步 |
| 文档与门禁：`AGENTS.md` 的 OEM 小节、本页、`FORK_SYNC.md`、`INSTALL*.md`、`docs/user/guide/desktop*.md`、`apps/desktop/README*.md` | 其中描述的身份、路径、命令、产物名与合并规则 | 保留 OEM 陈述，把上游新增叙述合并进来 |
| 测试与快照：`apps/desktop/tests/*brand*`、`*identity*`、`*packaging*`、`*publication*`、`expected/*` | 锁定 OEM 取值的断言与 fixture | 保留 OEM 期望；仅当契约本身变化时才刷新快照 |

合并规则：

- 按文件逐个解决，绝不按整树处理：禁止 `git checkout --ours .`、`--theirs .`、`-X ours`、`-X theirs`，也禁止删除文件来掩盖冲突。
- 当上游重写了本分支拥有的文件时，取上游的结构并重新落上表中列出的 OEM 字段；丢失字段的文件属于合并缺陷，不是解决结果。
- 在执行 `scripts/sync-upstream.sh anchor` 之前跑下面的校验；同步脚本的 `verify` 步骤会调用同一门禁。
- 只有契约本身变化时才更新快照与 fixture；绝不为把红色的 OEM 检查变绿而重新生成。

每次 upstream 合并后重新校验：

```sh
pnpm run verify-oem-identity
pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts \
  apps/desktop/tests/desktop-application-identity.spec.ts apps/desktop/tests/installer-packaging.spec.ts \
  scripts/verify-oem-identity.spec.ts
```

## 尚未按品牌配置

- 安装器文案与原生窗口字符串来自 `apps/desktop/scripts/locale*` 与 NSIS include；在 OEM 构建像替换位图那样替换它们之前，这些文案沿用出厂品牌。`apps/desktop/src/locale.ts` 中的桌面命令管理文案写的是出厂 `daxuedazi` 命令，构建其他品牌时必须重新拼写这些字符串。
- 图标与产物美术由 BirdCoder 的规范位图生成。
- `desktop.executableName` 决定已安装的二进制名；OEM 构建必须提供同名二进制，electron-builder 由同一字段派生它。
