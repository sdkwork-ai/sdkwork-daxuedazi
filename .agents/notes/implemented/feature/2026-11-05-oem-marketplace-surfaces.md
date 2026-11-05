# Agent Note: OEM builds hide the SDKWork storefront rows behind user switches

Status: implemented

English | [中文](2026-11-05-oem-marketplace-surfaces.zh.md)

## Problem

The shipped application is a student knowledge platform, but the sidebar still opened with three SDKWork storefronts: the App Store, the template library, and the demand hall. They advertise a marketplace most users do not need, yet hiding them only through the user's own preference leaves every new user seeing them and a preference reset brings them back.

Removing the plugins is not the answer: the product wants the rows available through the Sidebar settings page, so the entry, its page, and its switch must keep mounting even while the row ships hidden. Hiding the rows in CSS is worse: the registrations and the Settings list would disagree, and another surface could still reach a row that claims to be off.

## Decision

The three plugins stay mounted exactly as before — sidebar quick entry, keyed page, SDKWork host adapter, and the Settings → Sidebar switch. The visibility decision belongs to the sidebar layout preference (`packages/client/ui-sdkwork-sidebar/src/client/layout.ts`), which now stores the user's choices from both directions: the ids the user explicitly hid and the ids the user explicitly showed. The effective hidden set is `shippedHidden ∪ explicitHidden − explicitShown`.

The shipped default comes from the OEM profile. `ui.appStore`, `ui.templateLibrary`, and `ui.demandHall` default to `false` and are published in `__DSH_OEM__`; `readOemAppStore` / `readOemTemplateLibrary` / `readOemDemandHall` in `ui-primitives` are the only readers, and `shippedHiddenEntryIds()` maps each field to its `sidebar.actions` id. The shipped profile therefore hides the three rows, while a deployment that promotes a storefront sets its field to `true` and every user starts with the row visible. A page without the OEM projection ships every row visible, so unit tests and an OEM-free composition keep the developer stack.

The Settings switch remains the user's override in both directions: showing a shipped-hidden row persists in `shown` and wins over a later default change, and hiding a shipped-visible row persists in `hidden`. **Reset** clears both lists and returns to the deployment's shipped defaults.

## Alternatives considered

**Remove the storefront plugins (or gate their registration on the OEM field).** Lost: no page and no Settings switch would exist, so the user could not turn a storefront on, which is the product requirement. It also made a deployment's default indistinguishable from an absent feature. This was the first implementation and was replaced.

**Hide the three rows in CSS.** Lost: the registrations and the Sidebar settings page would still list them, the hidden state would not persist, and another surface could reach a row that claims to be off. Visibility belongs to the preference both surfaces already read.

**Default the old single hidden list to the three ids.** Lost: the old model only records what the user hid, so an existing user who had hidden any other row would keep seeing the storefronts, and the reset action (which cleared the list) would show them again. Separating the explicit-show direction is what lets a product default coexist with a user's choice.

## Consequences

A stock OEM build opens its sidebar without the App Store, template library, or demand hall rows; all three remain one switch away in Settings → Sidebar, with their pages mounted. A deployment that sets a field to `true` starts every user with that row visible. An existing user's stored blob (the legacy single `hidden` list) is normalized on load into the two-list shape: their explicit hides survive, and the new shipped defaults apply to the rows they never touched. The trade-off is one more piece of persisted state and one more default source to keep in step with the plugin ids, which `verify-oem-identity` checks.

The App Store's mode-rail icon follows the same product default: the shipped rail layout hides it, the customize dialog brings it back, and rail-layout revision 3 adopts that default once for layouts written while the icon shipped visible. The OEM field does not control the rail layout; it only sets the sidebar row's shipped visibility.

`verify-oem-identity` asserts the three profile defaults, the three readers, the three id/reader pairs in the sidebar preference, the explicit-show list, and the AGENTS/`brands/README.md`/`FORK_SYNC.md` contract text. A merge that removes a plugin, drops a mapping, or hides the rows outside the preference fails the sync gate.

## Testing

`packages/client/ui-sdkwork-sidebar/tests/layout.client.spec.ts` covers the shipped-hidden defaults, the OEM-visible direction, explicit show/hide overrides across reloads, the legacy blob migration, normalization, reset, and the stable snapshot reference. `scripts/verify-oem-identity.spec.ts` mutates the profile defaults, the sidebar mapping, the explicit-show storage, and the contract prose and expects the named failure. `packages/host/sdkwork-oem` covers the profile fields and the published projection, `packages/client/ui-primitives/tests/oem-brand.client.spec.tsx` covers each reader, and the three plugin apply specs keep asserting that the entries, pages, and adapters mount.
