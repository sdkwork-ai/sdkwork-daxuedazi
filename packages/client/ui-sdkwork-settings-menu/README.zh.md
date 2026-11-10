---
description: "Settings menu over the mode rail's settings gear plus the settings modal shell it owns, re-declaring every upstream settings seat so feature-owned sections mount unchanged."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sdkwork-settings-menu

[English](README.md) | 中文

## 概述


模式栏设置齿轮上的设置菜单，以及它拥有的设置弹窗外壳。插件占据上游 `ui-settings-general` 曾占用的 `mode.rail.settings` 席位；web bundle patch 保留该上游行的 `id`——profile 承载的设置命名空间*就是*生效的 loader 行 id——只把它背后的实现包换成本包，因此上游外壳不会装载（其源码一行不动，上游更新不会与本表面冲突），同时本包重新声明的每个命名空间仍然可寻址；本包重新声明全部设置席位——`settings.trigger/header/action/close/section/onboarding/general.item`、根作用域的账号卡席位 `settings.menu.account`，以及六个根作用域功能弹窗席位 `settings.apiKeys`、`settings.officialAccounts`、`settings.miniPrograms`、`settings.dns`、`settings.certificates` 与 `settings.myDeployments`——各功能的分区、行与 onboarding 步骤无需改动即可挂载。这六个功能弹窗席位是运行时授权，不是菜单项：本产品弹窗不提供任何打开它们的行，缺一声明会在注册时抛 `SlotOwnershipError`，整个 rail 条目随之崩溃。

悬停（或聚焦、点击）齿轮会向右弹出菜单：顶部账户行（用户名），账户行正下方是经 `settings.menu.account` 注入的账号卡（本 fork 的用量/费用卡；席位收到 `close`，因此打开更宽表面的内容会同时收起菜单），账户 provider 发布数据时的会员/积分分组、产品命令分组（设置打开弹窗、外观通过子菜单切换真实主题、检查更新在 preload 表面存在时驱动桌面更新器）、底部固定的退出登录行（未登录时禁用）。菜单在指针离开宽限期、Escape、外部点击与选中行后关闭。SDKWork 云控制台表面——公众号账号、小程序账号、域名管理、证书管理、我的应用部署、中转站 API Key 管理——原有的帮助/反馈行，以及角色与兴趣 persona 行均已刻意移除：云控制台是控制台管理能力而非本产品命令，而 persona 选角弹窗在本构建中只保留首次引导入口。云控制台插件的席位照常注册，但本弹窗既不渲染入口，也不挂载对应弹窗宿主；persona 插件的选角弹窗仍挂在 `shell.overlay` 上，同样没有弹窗入口。

插件提供 `ctx.account`——快照源（`{ signedIn, username?, membership?, points? }`）加 `logout()`——`ctx.feedback`——快照源（`{ available }`）加 `open()`，保留该服务以便反馈插件挂载其渠道——以及 `ctx.persona`——快照源（`{ available, roleLabel? }`）加 `open()`，保留该服务以便 persona 插件挂载其选角渠道。随附账户实现是匿名态：不显示账户身份头部（头部与登录/注册行互斥），会员/积分隐藏，退出登录禁用。未来账户后端在同一接口后替换实现，菜单永不改动。随附反馈实现是不可用态；ui-sdkwork-feedback 插件在同一接口后替换该源，渠道生效但本弹窗不再有对应行。随附 persona 实现同样是不可用态；ui-sdkwork-persona 插件替换它，且其 disposer 在该插件卸载时恢复默认值。本弹窗不渲染 persona 行（本构建只保留首次引导入口），因此该接缝服务于功能插件自身的绑定与将来的行决策，而不是当前入口。

设置弹窗是本包自己的外壳：基于 `settings.section` 账本的分区导航、基于 `settings.general.item` 的通用设置分区、loopback 的打开配置文件动作、基于 `settings.onboarding` 的 onboarding 协调器。欢迎通知确认是 host 半部自己 Config 的 volatile 字段，而 loader entry 的 id 就是设置命名空间——因此本包占据上游 `ui-settings-general` 行，该字段正落在欢迎步骤读取方所解析的那个命名空间里，已持久化的确认在切换后依然有效。

## 目录

- [Model Experience](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

## Model Experience

无，本包是纯人工设置界面与导航。外观子菜单调用 `ctx.theme.setTheme`，偏好经设置传输持久化，不触碰模型请求；账户 provider 默认匿名。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与后续工作

- **匿名账户默认**——在真实账户 provider 替换 `ctx.account` 之前，不显示账户身份头部（头部与登录/注册行互斥），会员/积分隐藏，退出登录禁用。
- **云控制台行已隐藏**——公众号账号、小程序账号、域名管理、证书管理、我的应用部署、中转站 API Key 管理在本产品中不挂载弹窗行（也不挂载弹窗宿主）；其席位照常声明，所属插件仍可注册。要恢复某个入口，需添加该行与对应宿主席位，而不是改动席位表。
- **角色行已隐藏**——角色与兴趣在本构建中不挂载弹窗行：ui-sdkwork-persona 的选角弹窗只保留首次引导入口，因此本弹窗既不渲染该行，也不显示所选角色名。`ctx.persona` 仍照常提供，功能插件继续绑定其数据源；要恢复该行，需同时恢复它的注入面（`persona` hook 与 `openPersona`）与该行本身，而不是重建整个功能。
- **检查更新仅桌面端**——该行仅在 `window.desktopBridge.updates` 存在时渲染；web 组合隐藏。

### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

本包重新声明全部设置席位（`settings.trigger/header/action/close/section/onboarding/general.item`），各功能的分区因此无需改动即可挂载；新增席位必须沿用上游的词汇，否则既有消费方将不再挂载。`ctx.account`、`ctx.feedback` 与 `ctx.persona` 随附匿名态与不可用态实现，接口保持稳定——消费方必须同时应对两种状态，而不是假定真实后端存在；host 半部以被替换外壳的 id 注册 `ui-onboarding`，使已持久化的确认在切换后依然有效。

</details>

## 运行时不变量

不发布运行时不变量伴随检查；设置界面直接读取权威的 settings 服务分节，每个开关都通过所属能力自己校验的服务面写回；作用域一致性直接由本包的客户端行为规格测试覆盖。
