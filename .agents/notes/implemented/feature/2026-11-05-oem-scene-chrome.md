# Agent Note: OEM builds hide the scene chrome through the profile

Status: implemented

English | [中文](2026-11-05-oem-scene-chrome.zh.md)

## Problem

The shipped application is a student knowledge platform, but the new-session surface still carried the developer workbench's two scene affordances: the Code/Media/Document switcher under the hero headline and the staged scene's built-in `birdcoder-*` skill tags below the composer. They advertise scenes and skills the deployment may not offer, and every new user met them before writing a first message. Both had user-level visibility preferences, so a deployment could not turn them off for the product: each user would have to discover and switch off two settings, and a reset would bring them back.

## Decision

The OEM profile owns the decision. `ui.sceneSwitcher` and `ui.skillTags` join the resolved profile, default to `false`, and are published in the `__DSH_OEM__` page projection. `readOemSceneSwitcher` / `readOemSkillTags` in `ui-primitives` are the only readers; they treat a missing or malformed projection as "keep the chrome", so an OEM-free composition and the component specs still mount it. False is a mount decision, not a style: `ui-sdkwork-app-modes` does not register the hero mode-switch seat, either skill-strip seat, the submission observer, or the General scene-switcher row, and `ui-sdkwork-skills` omits the strip's master switch. The existing `heroSwitchVisible` / `showSceneTags` preferences still control a surface a deployment opts back into; they cannot resurrect one the profile does not mount.

## Alternatives considered

**Default both user settings to `false` instead.** Lost: it changes the surface for every composition, including the second brand and any OEM-free build, while a deployment's stored `true` still brings the chrome back. The product decision belongs to the deployment profile, and the profile already owns every other OEM-only behavior.

**Hide the seats in CSS with a page-level class.** Lost: the seats would still register, the settings rows would still write, and a deployment could not tell a missing surface from a hidden one. Registration is the cheapest place to state "this build does not offer it", and the client already has to decide there.

**Remove the scene packages from the bundle for the OEM build.** Lost: the rail, base mode pages, and the app-mode settings rows share the package; splitting the bundle to drop two seats would fork the package and give upstream merges a second composition to reconcile.

## Consequences

A stock OEM build renders neither the pills nor the strip, and Settings no longer offers a dead switch for either. A deployment that sets `ui.sceneSwitcher` and/or `ui.skillTags` to `true` gets the surface and its durable user preference back, independently. The hidden defaults are visible in the profile, so the decision is auditable without reading client code. The cost is that a user of the shipped build cannot re-enable the chrome by themselves; that is the product requirement. `verify-oem-identity` asserts the profile fields, both readers, both client gates, and the contract text, so an upstream merge that mounts the chrome unconditionally fails the sync gate.

## Testing

`packages/host/sdkwork-oem/tests/config.spec.ts` covers the default and per-lifecycle overrides plus the boolean validation; `tests/plugin.spec.ts` covers the published view object. `packages/client/ui-primitives/tests/oem-brand.client.spec.tsx` covers the readers' explicit-false and fallback behavior. `packages/client/ui-sdkwork-app-modes/tests/apply.client.spec.ts` asserts no seats and no scene-switcher row when the projection hides them, and that the two switches are independent. `packages/client/ui-sdkwork-skills/tests/skills-section.client.spec.tsx` asserts the strip master switch is absent while per-skill switches stay. `scripts/verify-oem-identity.spec.ts` mutates each gate surface and expects the named failure.
