# Agent Note: OEM builds hide the SDKWork storefront rows behind user switches

Status: implemented

[English](2026-11-05-oem-marketplace-surfaces.md) | 中文

## 问题

出厂应用是学生知识平台，但侧栏一打开仍是三个 SDKWork 商店界面：应用商店、模板库、需求大厅。它们宣传的是多数用户并不需要的市场；如果只让用户自己隐藏，每个新用户仍会先看到它们，偏好重置后又会回来。

移除插件不是答案：产品要求这些行仍能通过「设置 → 侧栏」打开，所以即使该行默认隐藏，入口、页面与开关也必须继续挂载。用 CSS 隐藏更糟：注册与设置列表会互相矛盾，其他表面还可能进入一个自称已关闭的行。

## 决策

三个插件保持原样挂载——侧栏快捷入口、键控页面、SDKWork 宿主适配器与「设置 → 侧栏」开关都不变。可见性决策归侧栏布局偏好（`packages/client/ui-sdkwork-sidebar/src/client/layout.ts`），它现在保存两个方向的用户选择：用户显式隐藏的 id 与显式显示的 id。有效隐藏集合是 `出厂隐藏 ∪ 显式隐藏 − 显式显示`。

出厂默认来自 OEM 配置。`ui.appStore`、`ui.templateLibrary` 与 `ui.demandHall` 默认 `false`，发布在 `__DSH_OEM__`；`ui-primitives` 中的 `readOemAppStore` / `readOemTemplateLibrary` / `readOemDemandHall` 是唯一读取入口，`shippedHiddenEntryIds()` 把每个字段映射到对应的 `sidebar.actions` id。因此出厂配置隐藏这三行；想突出某个商店的部署把字段设为 `true`，每个用户初始就能看到该行。没有 OEM 投影的页面显示全部行，所以单元测试与未挂载 OEM 的组合仍保留开发者条目栈。

设置开关始终是用户两个方向的覆盖：打开一个出厂隐藏行会写入 `shown`，并压过后来的默认变更；隐藏一个出厂可见行会写入 `hidden`。**重置**清空两个列表，回到部署的出厂默认。

## 备选方案

**移除商店插件（或按 OEM 字段门禁注册）。** 不取：页面与设置开关都不存在，用户无法把商店打开，而这正是产品要求；部署默认也与「功能不存在」无法区分。这是最初的实现，已被替换。

**用 CSS 隐藏三行。** 不取：注册与侧栏设置页仍会列出它们，隐藏状态不会持久化，其他表面仍可进入一个自称关闭的行。可见性属于两个表面本来就在读的偏好。

**沿用旧的单一隐藏列表并默认填入三个 id。** 不取：旧模型只记录用户隐藏了什么，之前隐藏过其他行的老用户仍会看到商店行，而且重置（清空列表）会把它们重新显示。拆出显式显示方向，才让产品默认与用户选择共存。

## 后果

出厂 OEM 构建的侧栏不再出现应用商店、模板库、需求大厅三行；它们都在「设置 → 侧栏」一步之内，页面保持挂载。把字段设为 `true` 的部署会让每个用户初始看到该行。老用户已存储的 blob（旧的单一 `hidden` 列表）在加载时归一为双列表形态：显式隐藏保留，新出厂默认作用于他们从未选择过的行。代价是多了一份持久化状态和一个需要与插件 id 保持同步的默认来源，后者由 `verify-oem-identity` 校验。

应用商店的模式栏图标遵循同一产品默认：出厂 rail 布局隐藏它，自定义弹窗把它加回来；rail-layout 修订 3 会让「图标仍出厂可见」时期写下的布局一次性采纳该默认。OEM 字段不控制模式栏布局，只决定侧栏行的出厂可见性。

`verify-oem-identity` 会校验三个配置默认值、三个读取器、侧栏偏好里的三组 id/读取器映射、显式显示列表，以及 AGENTS、`brands/README.md`、`FORK_SYNC.md` 的契约文案。合并删除插件、丢掉映射，或在偏好之外隐藏行，都会让同步门禁失败。

## 测试

`packages/client/ui-sdkwork-sidebar/tests/layout.client.spec.ts` 覆盖出厂隐藏默认、OEM 可见方向、跨页面加载的显式显示/隐藏覆盖、旧 blob 迁移、归一化、重置，以及快照引用稳定。`scripts/verify-oem-identity.spec.ts` 逐项改动配置默认值、侧栏映射、显式显示存储与契约文案，并断言对应失败。`packages/host/sdkwork-oem` 覆盖配置字段与发布对象，`packages/client/ui-primitives/tests/oem-brand.client.spec.tsx` 覆盖每个读取器，三个插件的 apply spec 继续断言入口、页面与适配器照常挂载。
