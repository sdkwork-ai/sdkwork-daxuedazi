---
description: "Settings menu over the mode rail's settings gear plus the settings modal shell it owns, re-declaring every upstream settings seat so feature-owned sections mount unchanged."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sdkwork-settings-menu

English | [中文](README.zh.md)

## Summary


The settings menu over the mode rail's settings gear plus the settings modal shell it owns. The plugin occupies the `mode.rail.settings` seat that upstream's `ui-settings-general` used to hold; the web bundle patch keeps that upstream row's `id` — a profile-backed settings namespace *is* the live loader row id — and swaps only the implementation package behind it to this one, so the upstream shell never loads (its source is never touched, so upstream updates cannot conflict with this surface) while every namespace the fork re-declares stays addressable; this package re-declares every settings seat — `settings.trigger/header/action/close/section/onboarding/general.item`, the root-scoped account-card seat `settings.menu.account`, the account-wallet seat `settings.menu.plan`, plus the six root-scoped feature-modal seats `settings.apiKeys`, `settings.officialAccounts`, `settings.miniPrograms`, `settings.dns`, `settings.certificates`, and `settings.myDeployments` — so feature-owned sections, rows, and onboarding steps mount unchanged. Those six feature-modal seats are runtime grants, not menu entries: this product's popover ships no row that opens them, and dropping a declaration would throw `SlotOwnershipError` at registration and take the whole rail entry down.

Hovering (or focusing, or clicking) the gear opens the popover menu to its right: a header row with the account identity, the account card contributed through `settings.menu.account` directly under that row (the fork's usage/cost card; the seat receives `close` so content that opens a wider surface takes the menu with it), the account-wallet card contributed through `settings.menu.plan` immediately below it (the Token Plan plugin's membership plan and compute-point balance with upgrade/top-up actions; it shares the same `close` contract), the membership/points group when the account provider publishes facts, the product command group (设置 opens the modal, 外观 switches the real theme through the Appearance submenu, 检查更新 drives the desktop updater where the preload surface exists), and a pinned sign-out footer row that is disabled while signed out. The menu closes on pointer-leave grace, Escape, outside click, and row selection. The SDKWork cloud-console surfaces — 公众号账号, 小程序账号, 域名管理, 证书管理, 我的应用部署, 中转站 API Key 管理 — the former 帮助/反馈 rows, and the 角色与兴趣 persona row are deliberately absent: the console surfaces are administration rather than commands of this product, and the persona picker stays a first-run surface here. The console-surface plugins keep registering into the seat table while the popover renders no entry and no dialog host for them; the persona plugin keeps its picker on `shell.overlay`, again with no popover entry.

The plugin provides `ctx.account` — a snapshot source (`{ signedIn, username?, membership?, points? }`) plus `logout()` — `ctx.feedback` — a snapshot source (`{ available }`) plus `open()`, still provided so the feedback plugin can attach its channel — and `ctx.persona` — a snapshot source (`{ available, roleLabel? }`) plus `open()`, still provided so the persona plugin can attach its picker channel. The shipped account provider is the anonymous state: no account identity header (the header and the sign-in row are mutually exclusive), membership/points stay hidden, and sign-out is disabled. A future account backend replaces the provider behind the same face; the menu never changes. The shipped feedback provider is the unavailable state; the ui-sdkwork-feedback plugin replaces that source behind the same face, and the channel is served without a popover row. The shipped persona provider is the same unavailable state; the ui-sdkwork-persona plugin replaces it, and its disposer restores the default when that plugin unloads. The popover renders no persona row (this build keeps the picker to its first-run gate), so the seam exists for the feature plugin's binding and for a later row decision, not for a current entry.

The settings modal is the package's own shell: the section nav over the `settings.section` ledger, the General section over `settings.general.item`, the loopback open-document action, and the onboarding coordinator over `settings.onboarding`. The Token Plan plugin adds the `套餐与积分` section through that same ledger, so the account's plan and points ledger live beside the other settings pages without shell changes. The welcome-notice acknowledgement is a volatile field of the host half's own Config, and the loader entry's id is the settings namespace — so because this package occupies upstream's `ui-settings-general` row, that field lands in the very namespace the welcome step's reader resolves, and persisted acknowledgements survive the swap.

## Table of Contents

- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Model Experience

None, as the package is human-only settings chrome and navigation. The Appearance submenu calls `ctx.theme.setTheme`, which persists the preference through the settings transport and never touches a model request; the account provider is anonymous by default.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Anonymous account default** — no account identity header (the header and the sign-in row are mutually exclusive), membership/points rows are hidden, and sign-out is disabled until a real account provider replaces `ctx.account`.
- **Wallet card is provider-gated** — `settings.menu.plan` renders only while the Token Plan plugin is mounted and the session is signed in; without that contribution the menu keeps its usage card and rows unchanged.
- **Cloud-console rows hidden** — 公众号账号, 小程序账号, 域名管理, 证书管理, 我的应用部署, and 中转站 API Key 管理 mount no popover row (and no dialog host) in this product; their seats stay declared so the owning plugins still register. Re-enabling an entry means adding the row and its host slot, not changing the seat table.
- **Persona row hidden** — 角色与兴趣 mounts no popover row in this build: the ui-sdkwork-persona picker stays a first-run surface, so the popover neither renders the entry nor the role label. `ctx.persona` stays provided so the feature plugin keeps binding its source; restoring the row means restoring its injected share (the `persona` hook and `openPersona`) together with the row, not rebuilding the feature.
- **Check for updates is desktop-only** — the row renders only where `window.desktopBridge.updates` exists; the web composition hides it.

### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This package re-declares every settings seat (`settings.trigger/header/action/close/section/onboarding/general.item`) so feature-owned sections mount unchanged; a new seat must mirror upstream's vocabulary or existing consumers stop mounting. `ctx.account`, `ctx.feedback`, and `ctx.persona` ship anonymous and unavailable providers behind stable faces — consumers must cope with both states rather than assuming a real backend, and the host half registers `ui-onboarding` under the replaced shell's id so persisted acknowledgements survive.

</details>

## Runtime invariants

No runtime invariant companion is published; the settings surface reads the authoritative settings service sections directly, and each toggle writes through the same service face the owning capability validates; scope agreement is covered directly by this package client behavior specs.
