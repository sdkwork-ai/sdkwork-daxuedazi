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

**fork 自有例外。** `dsh-ui-usage-billing`、`sdkwork-deepseekbot` 与 `sdkwork-dsh-agents` 是其 `url` 指向 SDKWork 自有仓库的条目。那个仓库*就是*插件的上游：源码在那里编辑、在那里构建、在这里 pin，因此上述冻结只读规则与「去上游修」的流程描述的是其余条目，而不是这三个（[用量计费](../.agents/notes/implemented/architecture/2026-11-08-forked-usage-billing-settings-card.zh.md)，[助理](../.agents/notes/implemented/architecture/2026-11-08-deepseekbot-assistant-surface.zh.md)）。

`plugins/*` 在 tsdown 的构建 glob（`vendor/*`、`packages/*/*`）之外：每个插件自带构建，其产物由上游提交，而不是由本仓库的构建生成——除了 `sdkwork-deepseekbot`：其上游把产物 gitignore 掉，由本仓库在安装时构建（见下文助理一节）。

## dsh-im — IM 渠道

[`dsh-im`](https://github.com/xmanrui/dsh-im) 把 IM 机器人（飞书、微信、企业微信、钉钉、QQ、Slack、Telegram、Discord、WhatsApp、iMessage、Matrix）接入 harness，并新增一个 `设置 → IM机器人` 设置页。它由 `packages/bundle/web-app/cordis.patch.yml` 以 `xmanrui-dsh-im` 行组合进插件树，但该行带 `disabled: true`：**学伴AI 默认不启用这个插件**。桌面层（`dsh-sdkwork-desktop-app`）继承这个被禁用的行，因此无论 Web / 桌面运行时、cloud / standalone 部署，出厂构建都不提供该表面，也不会启动任何渠道连接。

**Pin。** gitlink 为 `d2f2703d`，是上游 `main` 顶端、`v5.9.1` 之后十二个提交的提交。pin 必须选在上游已提交的 `lib/index.js`、`lib/client.js` 与其源码一致的修订上，这一点很重要，因为本仓库直接按交付形态运行这些产物而不重新构建。发布提交通常是这类时点；该顶端符合条件，因为 `v5.9.1` 之后的每个提交都随源码变更重建了已提交的 `lib/` 文件。

**更新。**

```sh
git submodule update --remote plugins/dsh-im   # follows `branch = main`
pnpm install                                   # relink and refresh the lockfile
pnpm exec vitest run packages/bundle/web-app/tests/built-in-im.spec.ts
```

然后连同刷新后的 `pnpm-lock.yaml` 一起提交新 gitlink，并启动一次 `pnpm dsh web` 确认该行仍保持禁用、没有出现 IM 设置页。本 fork 每次发布前都要到上游检查新发布：这里没有任何机制会自动感知，未审查的 pin 会静默交付旧插件。有新发布时优先用 tag 而不是 `main`：`main` 携带发布之间的提交，其构建产物可能滞后于源码（locale JSON 在运行时加载，因此在发布之间合法地变动；打包的 `lib/*.js` 则不能）。当前 pin 之所以是 `main` 顶端，是因为 `v5.1.0` 之后的提交确实重建了 `lib/client.js`；包含它们的后续发布 tag 仍是更优选的下一个 pin。

**依赖。** `pnpm install` 把插件自身的依赖装进 `plugins/dsh-im/node_modules`。大多数渠道已内联进已提交的 `lib/index.js`；插件在运行时加载的少数依赖（`dingtalk-stream`、`imapflow`、`nodemailer`、`qrcode`、`undici`、Sharp、腾讯与企业微信连接器）从该目录解析。`@whiskeysockets/baileys` 在 `pnpm-workspace.yaml` 的 `allowBuilds` 中被拒绝，因为其构建输入已内联，而它的 `prepare` 脚本会重新编译本仓库从不运行的 TypeScript。

**从源码重建**只在进行插件本身的开发时才需要，交付并不需要：

```sh
pnpm --dir plugins/dsh-im run build   # needs that package's Baileys build approved first
```

**重新启用它。** 该行默认已禁用，且刻意保留而不删除，验收测试才会持续校验子模块、manifest 与构建产物。在更上层的 patch（profile 的 `cordis.patch.yml`，或全局的 `$DSH_HOME/cordis.patch.yml`）写 `- id: xmanrui-dsh-im` / `disabled: false` 即可覆盖。该插件不拥有其他组合表面，因此把该行重新关掉会连同设置页与所有渠道一起移除。

**CI。** 每个需要安装或构建 workspace 的工作流 checkout 都使用 `submodules: recursive`；不带该配置的 job 会得到空的 `plugins/dsh-im`，并在 workspace 解析处失败。

**Windows checkout。** 该子模块没有自己的 `.gitattributes`，父仓库规则也管不到子模块内部，因此 Windows checkout 会继承机器的 `core.autocrlf`，`bin/dsh-im.mjs` 会带 CRLF shebang 落地，而 `pnpm pack` 会以 `ERR_PNPM_BIN_CRLF` 拒绝。桌面打包在打包前规范化插件的 `bin/*` shebang（`apps/desktop/scripts/package-target.ts` 的 `normalizePackedPluginShebangs`），因此构建无需手工步骤；`git submodule update` 会恢复 CRLF 形态，下一次打包又会再次规范化。

**校验。** `packages/bundle/web-app/tests/built-in-im.spec.ts` 断言组合后的行仍存在且默认 `disabled: true`、链接清单中的 `dsh.client` web 声明以及两个构建入口产物，并证明该检查会拒绝每种不完整形态（缺行、意外启用、名称错误、子模块未解析、丢失声明、缺产物）。

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

## sdkwork-dsh-agents — 专家市场

[`sdkwork-dsh-agents`](https://github.com/sdkwork-ai/sdkwork-dsh-agents) 是 SDKWork 专家市场：`@michengai/dsh-agency-agents` DSH 插件，携带 22 个分部下的 331 位领域专家、五个内置专家团队、AI 创建流程、`list_experts` / `summon_expert` / `summon_expert_team` 工具、设置 → 专家 管理页与输入框 `@` 选择器。它是上文所述的 **fork 自有**条目之一——SDKWork 镜像是其源码的权威——并且**默认挂载**为 `packages/bundle/web-app/cordis.patch.yml` 中的 `agency-agents-remote` 与 `agency-agents` 行，因此出厂构建——以及打在其上的桌面层——无需安装步骤即可提供专家市场。

两行承载它。`agency-agents-remote` 注册插件自己的 Typert 远程命名空间，浏览器半经它读取名录、写入启用列表（`ctx.remote.agencyAgents`）。`agency-agents` 挂载宿主半（基于包自带 `assets/agency-agents{,-zh}` 人设的人设库、调用工具、`agency-agents` 设置命名空间、可配置的子代理提供方）与浏览器半（`agency-agents` 主面板、其 `sidebar.panellist` 行、设置 → 专家 页、输入框选择器与任务推荐栏）。该行固定 `entryLocation: both`，因为浏览器半只在插件自己的条目启用时才注册其 `main` 面板；插件的出厂默认是仅设置页，那会让专家标签页的市场 chip 无处可嵌。

**专家标签页集成。** fork 的市场页（`packages/client/ui-sdkwork-markets`）把专家标签作为双 chip 子根承载：云端目录在前，专家市场紧随其后。该 chip 就地绘制插件注册的 `main` 面板——本页渲染的是另一个包的组件，不重新实现名录——并声明经 `ctx.sdkworkSidebar` 嵌入的插件侧栏行，市场因此只有一个导航入口。面板用其注册注入的 props 绘制——插件的翻译器、其 `remote.agencyAgents` 客户端与团队选择回调——因为该注册目标为 `main` 席位，裸渲染会抛错；`mainPanelWatch` 每次注册只解析一次该面，由标签页传入。面板键（`agency-agents`）是两个包之间唯一的软契约：`packages/client/ui-sdkwork-markets/src/client/expertMarketPanel.ts` 中的 `EXPERT_MARKET_PANEL_ID`，由 `packages/bundle/web-app/tests/built-in-expert-market.spec.ts` 对出厂 `lib/client.js` 锁定。该行关闭时——或有人把插件自己的条目切为仅设置页——chip 会说明市场不可用，而不是框入一个无人注册的面板。

**Pin。** gitlink 为 `3612123`，即 pin 时 SDKWork 镜像 `main` 的顶端（插件版本 1.2.26），其已提交的 `lib/` 产物——`lib/index.js`、`lib/client.js`、`lib/remote.js` 与共享的 `lib/src-*.js` chunk——由本仓库按交付形态运行而不重建。pin 必须选在已提交构建与源码一致的修订上。

**依赖。** `pnpm install` 把插件的 peer 闭包链接到本 workspace 自己的包（其 devDependencies 按本仓库版本列出每个 `@deepseek-ai/dsh-*` 包，`linkWorkspacePackages` 把它们解析为成员），并安装其唯一运行时依赖 `zod`。其可选的 `@deepseek-ai/dsh` peer 否则会自动安装已发布线，并把第二套完整 harness 闭包拉进锁文件；`pnpm-workspace.yaml` 中的 `@michengai/dsh-agency-agents>@deepseek-ai/dsh` override 把这条边指向 `apps/cli`。该插件作为 workspace 成员只为依赖安装与加载而存在：`plugins/*` 仍在 tsdown 的构建 glob 之外，其 `lib/` 由它自己的仓库交付。

**更新（随时更新）。** gitlink 跟随镜像的 `main`，因此推进它只需一条命令——它移动 pin、重链 workspace 并重跑验收 spec：

```sh
pnpm run update:expert-market   # submodule update --remote + pnpm install + the acceptance spec
pnpm run check:expert-market    # report drift against origin/main without moving the pin
```

然后连同 `pnpm-lock.yaml` 一起提交新 gitlink。手动等价写法是：

```sh
git submodule update --init --remote plugins/sdkwork-dsh-agents
pnpm install
pnpm exec vitest run packages/bundle/web-app/tests/built-in-expert-market.spec.ts
```

插件自己的在线更新（插件 → `@michengai/dsh-agency-agents` → 在线更新）会在运行中的安装里刷新名录；gitlink 才是*构建*交付的东西。本 fork 每次发布前都要到镜像检查新发布——这里没有任何机制会自动感知，未审查的 pin 会静默交付旧名录。

**校验。** `packages/bundle/web-app/tests/built-in-expert-market.spec.ts` 断言组合后的两行、固定的条目位置、链接清单中的 `dsh.client` web 声明与 `dsh.bundle.patch`、全部三个交付入口产物、客户端的 `agency-agents` 主面板与侧栏行，并证明该检查会拒绝每种不完整形态。真实 web 名录经 `packages/test-support/client-runtime/tests/assembly-bundle-roster.client.spec.ts` 保持该行，`packages/client/ui-sdkwork-markets/tests` 覆盖专家标签页的两个 chip 与实时面板来源。

**关闭它。** 在更上层的 patch 中禁用这些行（`- id: agency-agents` 与 `- id: agency-agents-remote` 加 `disabled: true`），或从 web-app patch 中删除它们。专家标签页的市场 chip 随后会说明市场不可用，输入框选择器与 设置 → 专家 页随这些行消失，已存储在 `$DSH_HOME` 下的专家启用状态与自定义专家保留原处，待这些行回归。

## dsh-ui-usage-billing — 用量与费用看板

[`dsh-ui-usage-billing`](https://github.com/sdkwork-ai/sdkwork-dsh-usage-billing) 把 harness 已经记录的内容变成可审计的账本：从每个持久化的会话日志折叠出的真实用量、按实时多提供方目录定价（含 DeepSeek 的高峰/低谷价拆分），外加提供方余额、订阅配额、中转站配额、逐会话与逐轮成本、低谷任务队列，以及 CSV/JSON 导出。它**默认挂载**为 `packages/bundle/web-app/cordis.patch.yml` 中的 `ui-usage-billing` 行，因此出厂构建——以及打在其上的桌面层——无需安装步骤即可提供该看板。这是本目录中唯一的 **fork 自有**条目：上面的仓库 fork 自 `kenz1117/dsh-ui-usage-billing`，是插件源码、构建与产品默认值的权威（[原因](../.agents/notes/implemented/architecture/2026-11-08-forked-usage-billing-settings-card.zh.md)）。

一行承载两半。宿主半在 `ctx.webServer` 上注册同源 `/api/billing/*` 路由（`usage-stats`、`balance`、`subscriptions`、`relay-quotas`、`pricing`、`task-queue`、`notify-claim`、`usage-tool`）并注入 `sessionPersistence`、`credentials` 与 `settings`；其 `usage_stats` 模型工具存在，但在用户开启之前保持未注册，因此默认组合不增加面向模型的表面。浏览器半把费用卡注册进 fork 侧栏的 `sidebar.footer.action` 席位、把账号卡注册进设置菜单 `settings.menu.account` 席位中用户名之下，新增一个 `settings.section` 页（设置内的找回入口）、把输入框费用 chip 注册进 `conversation.composer.dock` / `conversation.input.*`，以及 `/usage` 命令；它绑定 locale 服务，因此中文/English 跟随 设置 → 常规。该包自己的 `dsh.bundle.patch` 刻意**不**加入 profile 的 bundle 列表：web-app 行是唯一的挂载点。

**出厂默认值。** 侧栏费用卡**默认隐藏**（`mode: 'hidden'`）：fork 的产品决定是让设置菜单在账号身份行下回答「我今天花了多少」，那里的卡打开完整看板。存储的偏好只在其显式命名模式时才被采纳——`full` 或 `compact` 会被尊重，而没有 `mode` 的偏好对象（fork 之前的形态）解析为隐藏——因此升级后的 profile 无法把旧的可见默认值带回来。插件的设置页（用量与费用）可随时恢复完整或紧凑的侧栏条目。账号卡由插件绘制进 `settings.menu.account`——这是 fork 的 `ui-sdkwork-settings-menu` 拥有的席位，直接在账号身份标签下渲染。它是席位贡献而非设置菜单特性：外壳对计费一无所知，不声明该席位的宿主就不显示卡片。

输入框底部同样默认安静：两个胶囊——低谷队列（低谷队列入口及其入队控件）与 价格（实时费用胶囊）——都是**关闭**的（`DEFAULT_QUICK_QUEUE_PREFS.showEntry` / `DEFAULT_LIVE_COST_BAR_PREFS.show`）。设置中心的第一组，「输入框底部内容」，拥有一张带两个开关的卡；打开价格开关会展开其位置控件（输入框内 / 上 / 下）。`show`/`showEntry` 是选择加入：只有显式 `true` 才显示胶囊，因此早于 fork 的偏好对象（或损坏的）保持隐藏。因为旧构建在保存任何偏好时会把当时的默认值 `true` 写入存储，客户端还运行一次性迁移（`dsh.ui-usage-billing.composer-footer-hidden`），每个浏览器只把两个显示字段关一次，同时保留位置、队列启用、草稿清理与来源会话字段。用户之后打开的开关会被存储并尊重；迁移永不运行两次。

**模块表。** 浏览器半把平台种子外部化——`react`、`react-dom`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives` 与 `@deepseek-ai/dsh-client-store`——其余全部内联。前四个已在进程内 assembly 的 require 表中；`@deepseek-ai/dsh-client-store` 不在，因此 `packages/test-support/client-runtime/src/assembly/modules.ts` 现在列出它。需要再多一个种子键的第三方 bundle 会让该套件失败并点名该 specifier；修复方式是在那里添加模块，绝不是在插件里内联第二份副本。

**Pin。** gitlink 为 `9cba33d`，即 fork 的 `1.8.4-sdkwork.3` 提交（默认隐藏的卡加设置菜单账号卡，在同一提交中构建）。与上文上游自有条目不同，被 pin 的仓库是 fork 自己的：它同样提交 `lib/`——`lib/index.js`、`lib/client.js`、`lib/invariant.js` 与 `lib/types` 声明——本仓库运行这些产物而不重建，因此 pin 必须选在已提交构建与源码一致的修订上。插件自己的 `dsh.compatibility` 声明支持到 `0.2.2-rc.1` 的每个宿主发布，也就是本 fork 的版本。

**依赖。** `plugins/*` 加入 `pnpm-workspace.yaml`，因此 `pnpm install` 把宿主半的 peer（本仓库已构建的 `@deepseek-ai/dsh-*` 包）链接进 `plugins/dsh-ui-usage-billing/node_modules`，并安装其唯一运行时依赖 `clsx`；浏览器 bundle 内联 `clsx`，因此交付的页面不需要该目录里的任何东西。该包还声明自己的开发者闭包（`tsdown`、`vitest`、`@playwright/test`、`shiki`、`katex` 等），workspace 安装也会把它落地——这是把它作为成员而非从源码重建插件交付的代价，也是 pin 移动时锁文件变化的原因。浏览看板除宿主本身外无需网络；实时定价、余额与配额从**宿主**到达提供方的公开端点，抓取失败会回退到内置目录而不是显示零。

**开发它。** 源码改动属于 fork 仓库，而不是在子模块目录里做本地编辑：在那里提交、推送，然后在此推进 gitlink。

```sh
cd plugins/dsh-ui-usage-billing
pnpm run build          # tsc -b + tsdown: rebuild lib/ before committing
pnpm exec vitest run    # plugin suite (the three POSIX-permission assertions fail on Windows)
cd ../.. && git add plugins/dsh-ui-usage-billing
```

**更新。**

```sh
git submodule update --remote plugins/dsh-ui-usage-billing   # follows `branch = main`
cd ../.. && pnpm install                                     # relink and refresh the lockfile
pnpm exec vitest run packages/bundle/web-app/tests/built-in-usage-billing.spec.ts
pnpm exec vitest run packages/client/ui-sdkwork-settings-menu/tests
pnpm exec vitest run packages/test-support/client-runtime/tests
```

然后提交新 gitlink，并启动一次 `pnpm dsh web` 确认该行激活、侧栏默认不显示卡、设置菜单在身份行下渲染该卡。

**校验。** `packages/bundle/web-app/tests/built-in-usage-billing.spec.ts` 断言组合后的行、链接清单中的 `dsh.client` web 声明与 `dsh.bundle.patch`、两个交付入口产物、宿主半的四个注入服务及其 `/api/billing/usage-stats` 路由、客户端半的 `sidebar.footer.action`、`settings.section` 与 `settings.menu.account` 注册，以及两个桌面 override 层都不禁用或重指该行，并证明该检查会拒绝每种不完整形态。`packages/client/ui-sdkwork-settings-menu/tests/settings-menu-root.client.spec.tsx` 覆盖账号卡席位在身份行下的位置（以及它不是可选中行），`packages/client/ui-primitives/tests/submenu-menu.client.spec.tsx` 覆盖菜单绘制它所经的块入口，`packages/test-support/client-runtime/tests/assembly-bundle-roster.client.spec.ts` 与 `assembly-test-client.client.spec.ts` 在模块表中带上插件交付的客户端 bundle 启动整个 web 名录。

**关闭它。** 在更上层的 patch 中禁用该行（`- id: ui-usage-billing` 加 `disabled: true`），或从 web-app patch 中删除该行。看板、其设置页、其输入框 chip、`/usage` 命令与每条 `/api/billing/*` 路由随之移除；已写入 `$DSH_HOME` 下的账本、快照、对账与任务队列文件保留在磁盘上，只是不再被读取。

## sdkwork-deepseekbot — 助理 / Assistant

[`sdkwork-deepseekbot`](https://github.com/sdkwork-ai/sdkwork-deepseekbot) 是本 fork 作为助理呈现的 BotHarness 人设机器人层。助理栏格与侧栏快捷入口打开其 `botharness` 主面板，该面板拥有机器人名录、渠道、记忆、右侧 Dock 面板标签与助理（机器人）设置。它是 fork 自有条目，也是唯一由本仓库产出产物的条目：上游 `.gitignore` 排除 `lib/` 与 `dist/`，因此 `scripts/build-deepseekbot.mjs` 在 `pnpm install` 之后以及作为 `build:artifacts` 门禁运行子模块自己的 `tsdown` 工具链。

**Pin。** gitlink 跟随镜像的 `main`。pin 提升对产品而言也是一次插件变更：助理命名、Dock 面板标签与助理设置改名都从该检出交付，因此请一并审阅插件自己的 changelog 与 ADR（0304、0305）。

**更新。** gitlink 跟踪 `main`，因此推进到插件的最新提交只需一条命令——它移动 pin、重链 workspace、重建产物并运行组合的验收 spec：

```sh
pnpm run update:deepseekbot
```

然后连同 `pnpm-lock.yaml` 一起提交新 gitlink（插件自己的改动已在其仓库中审阅）。手动等价写法是：

```sh
git submodule update --init --remote plugins/sdkwork-deepseekbot
pnpm install
pnpm run build:deepseekbot
pnpm exec vitest run packages/bundle/web-app/tests/built-in-assistant.spec.ts
```

`postinstall` 也会构建该插件，并在从未初始化子模块的检出中带消息跳过（仅 lint 与策略作业不会加载它）。

**组合。** 三个运行时包（`@botharness/core`、`@botharness/ui`、`deepseekbot`）是 pnpm workspace 成员，web-app bundle 以 `workspace:*` 声明它们；插件自己的 `dsh.bundle.patch` 不进 profile 的 bundle 列表，因为 `cordis.patch.yml` 把 `botharness-core`、`botharness-client` 与 `preset-deepseekbot` 作为唯一挂载。子模块根只为构建工具链而作为成员；`puppeteer`（由其文档工具链拉入）在 `allowBuilds` 中被拒绝。

**发布输入。** `scripts/release/pack-assistant-plugin.ts` 把三个运行时包与 dsh 家族一起打包，因此 Desktop 包集闭包与 `release:verify-packed-install` 能解析打包后 web-app 清单携带的 `0.0.0` 依赖。`sdkwork-deepseekbot` 自己的 tarball 会重新打包，其清单列出两个挂载的包，而不是它的 `link:` 兄弟源。不向任何注册表发布。打包还会拒绝这样的浏览器 bundle：其裸 `require()` 命名了 Web 模块表之外的模块（平台种子加上 bundle 声明的 `dsh.client.external`），因此过期的 bundle 会让发布失败，而不是在已安装应用中丢掉该插件。

**关闭它。** 在更上层的 patch 中禁用这三行（或从 web-app patch 中删除它们），并从组合中移除 `packages/client/ui-sdkwork-assistant`；助理栏格与侧栏入口随面板消失，插件自己的 `sidebar.panellist` 行回归。插件在 `$DSH_HOME/botharness` 下的数据保留在磁盘上。
