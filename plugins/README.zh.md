# Git 关联插件

[English](README.md) | 中文

本 fork **随仓库自带**的第三方 DSH 插件，而不是要求用户自行安装。每一项都是一个 Git 子模块，同时也是 pnpm workspace 成员：`pnpm install` 会链接插件并安装其自身的运行时依赖，bundle patch 可以像其他包一样按名称挂载它。

这个目录刻意不与它相似的两个邻居中的任何一个相同：

| 目录 | 内容 | 归属 |
|---|---|---|
| `vendor/` | Cordis 框架的源码副本，改scope为 `@deepseek-ai/*` | 本 fork（在此编辑） |
| `packages/` | 本仓库自己编写的包 | 本 fork（在此编辑） |
| `plugins/` | 完整的外部插件，pin 在某个上游提交上 | 上游项目（绝不在此编辑） |

这里的任何内容都不做 rescope 或编辑。本地修复属于上游，随后提升 pin；[命名契约](../AGENTS.md#sdkwork-fork-naming-contract)只适用于 fork 自有的包，这些插件刻意保留上游名称，以便 `git submodule update` 始终是快进操作。

`plugins/*` 在 tsdown 的构建 glob（`vendor/*`、`packages/*/*`）之外：每个插件自带构建，其产物由上游提交，而不是由本仓库的构建生成。

## dsh-im — IM 渠道

[`dsh-im`](https://github.com/xmanrui/dsh-im) 把 IM 机器人（飞书、微信、企业微信、钉钉、QQ、Slack、Telegram、Discord、WhatsApp、iMessage、Matrix）接入 harness，并新增一个 `设置 → IM机器人` 设置页。它由 `packages/bundle/web-app/cordis.patch.yml` 以 `xmanrui-dsh-im` 行挂载，桌面层（`dsh-sdkwork-desktop-app`）继承该挂载，因此出厂构建无需安装步骤即可提供该表面。

**Pin。** gitlink 为 `d2f2703d`，是上游 `main` 顶端、`v5.9.1` 之后十二个提交的提交。pin 必须选在上游已提交的 `lib/index.js`、`lib/client.js` 与其源码一致的修订上，这一点很重要，因为本仓库直接按交付形态运行这些产物而不重新构建。发布提交通常是这类时点；该顶端符合条件，因为 `v5.9.1` 之后的每个提交都随源码变更重建了已提交的 `lib/` 文件。

**更新。**

```sh
git submodule update --remote plugins/dsh-im   # follows `branch = main`
pnpm install                                   # relink and refresh the lockfile
pnpm exec vitest run packages/bundle/web-app/tests/built-in-im.spec.ts
```

然后连同刷新后的 `pnpm-lock.yaml` 一起提交新 gitlink，并启动一次 `pnpm dsh web` 确认该行仍会激活、设置页仍会渲染。本 fork 每次发布前都要到上游检查新发布：这里没有任何机制会自动感知，未审查的 pin 会静默交付旧插件。有新发布时优先用 tag 而不是 `main`：`main` 携带发布之间的提交，其构建产物可能滞后于源码（locale JSON 在运行时加载，因此在发布之间合法地变动；打包的 `lib/*.js` 则不能）。当前 pin 之所以是 `main` 顶端，是因为 `v5.1.0` 之后的提交确实重建了 `lib/client.js`；包含它们的后续发布 tag 仍是更优选的下一个 pin。

**依赖。** `pnpm install` 把插件自身的依赖装进 `plugins/dsh-im/node_modules`。大多数渠道已内联进已提交的 `lib/index.js`；插件在运行时加载的少数依赖（`dingtalk-stream`、`imapflow`、`nodemailer`、`qrcode`、`undici`、Sharp、腾讯与企业微信连接器）从该目录解析。`@whiskeysockets/baileys` 在 `pnpm-workspace.yaml` 的 `allowBuilds` 中被拒绝，因为其构建输入已内联，而它的 `prepare` 脚本会重新编译本仓库从不运行的 TypeScript。

**从源码重建**只在进行插件本身的开发时才需要，交付并不需要：

```sh
pnpm --dir plugins/dsh-im run build   # needs that package's Baileys build approved first
```

**关闭它。** 在更上层的 patch 中禁用该行（`- id: xmanrui-dsh-im` 加 `disabled: true`），或从 web-app patch 中删除该行。该插件不拥有其他组合表面，因此任一形式都会连同设置页与所有渠道一起移除。

**CI。** 每个需要安装或构建 workspace 的工作流 checkout 都使用 `submodules: recursive`；不带该配置的 job 会得到空的 `plugins/dsh-im`，并在 workspace 解析处失败。

**Windows checkout。** 该子模块没有自己的 `.gitattributes`，父仓库规则也管不到子模块内部，因此 Windows checkout 会继承机器的 `core.autocrlf`，`bin/dsh-im.mjs` 会带 CRLF shebang 落地，而 `pnpm pack` 会以 `ERR_PNPM_BIN_CRLF` 拒绝。桌面打包在打包前规范化插件的 `bin/*` shebang（`apps/desktop/scripts/package-target.ts` 的 `normalizePackedPluginShebangs`），因此构建无需手工步骤；`git submodule update` 会恢复 CRLF 形态，下一次打包又会再次规范化。

**校验。** `packages/bundle/web-app/tests/built-in-im.spec.ts` 断言组合后的行、链接清单中的 `dsh.client` web 声明以及两个构建入口产物，并证明该检查会拒绝每种不完整形态（缺行、禁用行、名称错误、子模块未解析、丢失声明、缺产物）。

## dsh-better-sidebar — 右侧栏工作台与左栏页面模型

[`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar) 是本 fork 交付的开放式侧栏基础：插件通过一个 service（`{ id, title, icon, order }`）贡献页面，宿主绘制行与页面主体。它**默认挂载**为 `packages/bundle/web-app/cordis.patch.yml` 中的 `better-sidebar` 行，因此出厂构建无需安装步骤即可在右侧栏提供其文件树、Git、变更、任务、边聊、编辑器与终端页面。其宿主侧服务 `/sidebar/*` 路由（文件树、流式读取、上传、Git、bundle、边聊推送）。

该包自己的 `dsh.bundle.patch` 刻意**不**加入 profile 的 bundle 列表：web-app 行是唯一挂载点，插件的 `disabled` 双挂载守卫因此不必推断第二个实例。

fork 的左栏（`packages/client/ui-sdkwork-sidebar`）通过 `ctx.sdkworkSidebar` 镜像同一页面模型，当子模块的被跟踪文件被修改、或上游 `TabDescriptor` 不再声明 `id`、`title`、`icon`、`order` 时，`packages/client/ui-sdkwork-sidebar/tests/better-sidebar-contract.client.spec.ts` 会失败。

**只读。** 本仓库不编辑、不补丁、不再 vendor 这个子模块；缺失的能力在上游修复、发布，再通过移动 pin 拉入（[根规则](../AGENTS.md#third-party-plugin-submodules-are-read-only-merge-stable-contract)）。workspace 把它作为成员安装（`plugins/*`），这会运行其自身的 `prepare` 构建并产出该行加载的被 gitignore 的 `lib/` 产物；`pnpm --dir plugins/dsh-better-sidebar run build`（或根 `build:better-sidebar` 脚本）从 pin 住的源码重建它们。

**表面重叠。** fork 的右侧栏本就自带自己的工作区文件树、终端、浏览器与文档预览标签，而该插件在它们旁边又添加了自己的文件树、Git、变更、任务、边聊与编辑器。两套默认都是活的；只想保留一套的部署移除另一侧的行，而不是编辑任何一个包。

**关闭它。** 在更上层的 patch 中禁用该行（`- id: better-sidebar` 加 `disabled: true`），或从 web-app patch 中删除该行。它拥有的每个页面、路由与 service 都随之移除；左栏的 `ctx.sdkworkSidebar` 注册表独立存在，继续工作。

**Pin。** gitlink 为 `b0e0fab`，即 `v0.28.2` 发布提交（合并了 `dev` 以获得 cold-cwd 读取修复）。与 `dsh-im` 不同，上游不提交 `lib/`，因此 pin 必须是其 tag 源码能被本仓库 install 成功构建的修订——优先选择发布 tag 而非 `dev` 顶端。

**更新。**

```sh
git submodule update --remote plugins/dsh-better-sidebar   # follows `branch = dev`
cd plugins/dsh-better-sidebar && git checkout vX.Y.Z       # prefer a release tag
cd ../.. && pnpm install                                   # relink, rebuild, refresh the lockfile
pnpm exec vitest run packages/client/ui-sdkwork-sidebar/tests packages/bundle/web-app/tests
```

然后连同刷新后的 `pnpm-lock.yaml` 一起提交新 gitlink。如果发布改了描述符字段名，在同一提交中更新 `packages/client/ui-sdkwork-sidebar/src/client/service.ts`——契约 spec 在匹配之前会一直失败。

## dsh-skill-market — SkillHub 技能市场

[`dsh-skill-market`](https://github.com/montersy123/dsh-skill-market) 是 SkillHub 市场：一个整页面板，可浏览、搜索、安装、更新与禁用发布在 `skillhub.cn` 上的社区技能，带分类、详情标签、本地 `.zip` 导入、收藏与已安装管理。它**默认挂载**为 `packages/bundle/web-app/cordis.patch.yml` 中的 `montersy-skill-market` 行，因此出厂构建——以及打在其上的桌面层——无需安装步骤即可提供该市场。

一行承载两半。宿主半在 `ctx.webServer` 上注册同源 `/skill-market/api/*` 前缀（SkillHub 应答浏览器时不带 CORS，页面无法直接调用），并负责安装：下载技能的完整文件束、校验每个路径与字节、写入 `$DSH_HOME/skills/<handle>--<slug>/` 下，并作为**运行时活注册**发布到 `ctx.skills`。最后这部分是与本 harness 技能系统而非自有市场的集成：安装后的技能就是一个普通技能，文件系统提供方同样会发现它，因此 Skills 设置页会列出它，运行中的会话无需重启进程即可调用它。禁用技能会把其目录移出 harness 技能根，因此开/关状态由文件系统而非标志位承载。浏览器半注册 `skill-market` 键控 `main` 面板及其 `sidebar.panellist` 行，并绑定 DSH locale 服务（中英词典跟随 设置 → 常规）。

**Skills 标签页集成。** fork 的市场页（`packages/client/ui-sdkwork-markets`）无法绘制另一个插件的面板页，而该插件也不发布客户端 service，因此 Skills 标签页通过导航与一个固定的面板键集成：其首个 `技能市场` chip 渲染市场入口表面并经 `ctx.layout.selectPanel` 交接，技能添加菜单也携带同一目的地。该键（`skill-market`）是两个包之间唯一的软契约——`packages/client/ui-sdkwork-markets/src/client/skillMarketPanel.ts` 中的 `SKILL_MARKET_PANEL_ID`——出厂客户端不再注册它时验收 spec 会失败。面板未注册期间（该行被禁用，或插件的客户端半尚未加载），chip 会解释这一状态，而不是提供会抛错的导航。

**设置管理。** 已安装的技能由 fork 的 Settings → 技能 页以其自己的 `技能市场` 分组列出，来源显示为 `SkillHub 技能市场`。该行按提供方（`skill-market`）分类，因为 Host 按设计把市场自己的 `source` 字符串上报为 `unknown`；提供方同时也是胜出事实，因为运行时注册（rank 250）压过同一目录的用户级文件系统副本（400）。页面的启用开关写入持久的 `disabledSkills` 抑制项，它在 rank 0 赢得目录合并——因此 Settings 可以在不移动文件的情况下关掉一个市场技能，而市场面板自己的开关继续拥有目录。两个开关不互为镜像；`packages/client/ui-sdkwork-skills` 的 README 在其已知限制下记录了这一分工。

**Pin。** gitlink 为 `4cda930`，即 `v2.0.7` 发布提交（pin 时也是上游 `main` 的顶端）。与 `dsh-im` 一样，上游提交 `lib/`，因此本仓库按交付形态运行产物而不重建，pin 必须选在 `lib/` 与源码一致的修订上——发布 tag 就是这一时点。出于同样原因，优先选择 tag 而不是更新的 `main` 顶端。

**依赖。** 该包自身声明无运行时依赖；两半都是自包含 ESM，浏览器半只需要基线的 `react` / `@deepseek-ai/dsh-client-ui-primitives` 模块。宿主侧需要 Node >= 20、`ctx.webServer` 以及可选的 `ctx.skills` service（没有技能注册表的 profile 仍能提供市场数据并安装到磁盘，只是没有目录可发布）。浏览与安装需要到 `api.skillhub.cn` 的网络访问；启用、禁用与卸载不需要。

**更新。**

```sh
git submodule update --remote plugins/dsh-skill-market   # follows `branch = main`
cd plugins/dsh-skill-market && git checkout vX.Y.Z       # prefer a release tag
cd ../.. && pnpm install                                 # relink and refresh the lockfile
pnpm exec vitest run packages/bundle/web-app/tests/built-in-skill-market.spec.ts
pnpm exec vitest run packages/client/ui-sdkwork-markets/tests
```

然后连同刷新后的 `pnpm-lock.yaml` 一起提交新 gitlink。如果发布改了面板键名，在同一提交中更新 `SKILL_MARKET_PANEL_ID`——验收 spec 在匹配之前会一直失败。本 fork 每次发布前都要到上游检查新发布：这里没有任何机制会自动感知，未审查的 pin 会静默交付旧市场。

**校验。** `packages/bundle/web-app/tests/built-in-skill-market.spec.ts` 断言组合后的行、链接清单中的 `dsh.client` web 声明与 `dsh.bundle.patch`、两个构建入口产物、宿主半的 `webServer` 注入与 `ctx.skills` 发布，以及客户端的 `skill-market` 面板与侧栏注册，并证明该检查会拒绝每种不完整形态。

**关闭它。** 在更上层的 patch 中禁用该行（`- id: montersy-skill-market` 加 `disabled: true`），或从 web-app patch 中删除该行。市场页、其路由与入口点随之移除；已安装的技能保留——它们是 `$DSH_HOME/skills` 下的普通文件，文件系统提供方继续提供。Skills 标签页的市场 chip 会解释禁用状态而不是报错。

## dsh-mcp-connector — MCP 连接器市场、连接与工具工作台

[`dsh-mcp-connector`](https://github.com/duhu2000/dsh-mcp-connector) 把 MCP 服务器配置、授权、跨连接工具搜索与连接排障收进一个表面：持续更新的连接器目录（公共注册表加包内自带卡片）、连接记录及其 OAuth 2.0 PKCE / API-key / `mcpServers`-JSON 授权、带逐连接器诊断的工具工作台、连接范围（项目/全局）、三级治理规则，以及会话级工具注入。它**默认挂载**为 `packages/bundle/web-app/cordis.patch.yml` 中的 `duhu2000-mcp-connector` 行，因此出厂构建——以及打在其上的桌面层——无需安装步骤即可提供该表面。

一行承载两半。宿主半拥有目录、连接记录与 OAuth 授权（自己的存储域加 `$DSH_HOME/storages/mcp_connector_grants_v1`）、范围与治理规则，以及活动连接变成的受管 `@deepseek-ai/dsh-mcp-client` loader 条目——Host 自己的 MCP 客户端仍然拥有传输、stdio 子进程、工具注册、执行与审批链。它还在 `/mcp-connector/ui/` 以同源页面服务整个连接器界面，其 CSP `frame-ancestors` 跟随插件的 `frameAncestors` 配置（默认 `['self']`）。浏览器半注册 `mcp-connector` 主面板及其侧栏行，面板在 iframe 中绘制该页面。

**Connectors 标签页集成。** fork 的市场页（`packages/client/ui-sdkwork-markets`）把连接器嵌入为它的 Connectors 标签：该标签框入插件的面板页，并应答该页面向其宿主帧请求的两类消息——新连接默认落入的 Workspace 范围，以及示例 Prompt 打开的会话（经 Workspace 表面自己的 `uiWorkspace.startSession`）——并声明经 `ctx.sdkworkSidebar` 嵌入的插件侧栏行，连接器因此保持一个导航入口。两个包共享的字符串（`mcp-connector` 面板键、`/mcp-connector/ui/` 页面路径与帧消息名）位于 `packages/client/ui-sdkwork-markets/src/client/mcpConnectorPanel.ts`；出厂产物不再声明其中任何一个时 `packages/bundle/web-app/tests/built-in-mcp-connector.spec.ts` 会失败。

**Pin。** gitlink 为 `2057af5`，即 `v0.2.94` 发布提交（pin 时也是上游 `main` 的顶端）。与 `dsh-im`、`dsh-skill-market` 一样，上游提交 `lib/`，因此本仓库按交付形态运行产物而不重建，pin 必须选在 `lib/`、`ui/` 与源码一致的修订上——发布 tag 就是这一时点。出于同样原因，优先选择 tag 而不是更新的 `main` 顶端。

**依赖。** `pnpm install` 把 workspace 自己的 `@deepseek-ai/dsh-mcp-client`、`@deepseek-ai/dsh-storage-domain`、`@deepseek-ai/schemastery` 与 `@deepseek-ai/cordis` 链接进 `plugins/dsh-mcp-connector/node_modules`，并安装其三个运行时依赖（`cross-spawn`、`undici`、`zod`）。浏览目录需要访问该行 `catalogUrl` 指向的注册表；只要 bundled 卡片的部署把 `catalogUrl` 设为 `''`。连接需要所选提供方要求的一切，其凭据绝不离开本机。该行只在提供 `tools`、`storageDomain`、`loader` 与 `workspaceRegistry` 的 profile 中激活；面板页只在 Host 同时服务 `ctx.webServer` 的地方存在，因此纯对话部署保留工具但没有页面可框入。

**更新。**

```sh
git submodule update --remote plugins/dsh-mcp-connector   # follows `branch = main`
cd plugins/dsh-mcp-connector && git checkout vX.Y.Z       # prefer a release tag
cd ../.. && pnpm install                                  # relink and refresh the lockfile
pnpm exec vitest run packages/bundle/web-app/tests/built-in-mcp-connector.spec.ts
pnpm exec vitest run packages/client/ui-sdkwork-markets/tests
pnpm exec vitest run packages/test-support/client-runtime/tests/assembly-bundle-roster.client.spec.ts
```

然后连同刷新后的 `pnpm-lock.yaml` 一起提交新 gitlink，并启动一次 `pnpm dsh web` 确认该行激活、`/mcp-connector/ui/` 应答、Connectors 标签框入它。本 fork 每次发布前都要到上游检查新发布：这里没有任何机制会自动感知，未审查的 pin 会静默交付旧连接器。

**校验。** `packages/bundle/web-app/tests/built-in-mcp-connector.spec.ts` 断言组合后的行、链接清单中的 `dsh.client` web 声明与 `dsh.bundle.patch`、全部四个交付文件（两个入口产物、路由模块与面板页）、客户端的 `mcp-connector` 主面板注册、宿主半的四个注入服务及其 `/mcp-connector/ui` 路由，以及两半的帧协议，并证明该检查会拒绝每种不完整形态。

**关闭它。** 在更上层的 patch 中禁用该行（`- id: duhu2000-mcp-connector` 加 `disabled: true`），或从 web-app patch 中删除该行。连接器市场、其路由、受管 mcp-client 条目与面板页随之移除，Connectors 标签会说明连接器不可用而不是框入缺失路由。既有连接记录保留在 `$DSH_HOME` 下的磁盘上，该行创建的 `mcp` 前缀 loader 条目随该行的组合一起消失。插件自己的 `showSidebarEntry` 配置与本页无关：标签页嵌入面板并抑制该行，因此无论如何该行的独立页面都不是第二个入口。
