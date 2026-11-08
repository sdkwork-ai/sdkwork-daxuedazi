---
description: "OEM brand client plugin: applies the Host-published display name, the brand manifest's per-language name map, and lifecycle to locale copy, the document title, and diagnostics."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sdkwork-oem

English | [中文](README.zh.md)

## Summary

The browser half of the OEM profile. At boot it reads the `__DSH_OEM__` page projection published by [`@deepseek-ai/dsh-sdkwork-oem`](../../host/sdkwork-oem/README.md) and the `__DSH_APP_NAMES__` map the web build publishes from the [brand manifest](../../../brands/README.md), hands the per-language application names to the locale registry (`setBrandNames`), keeps the document title on the name of the active interface language, and records the resolved lifecycle on `documentElement.dataset.dshEnvironment` for diagnostics. Every client dictionary string that spells `BirdCoder` then renders the deployment's name for that language (the shipped default is 学伴AI in all eight); an OEM profile that renames the product outright wins in every language, and a composition that does not mount the OEM profile stays on the dictionary's `BirdCoder` spelling.

The sidebar wordmark reads the same name map directly through `readOemBrandNameForLocale()` in [`ui-primitives`](../ui-primitives/README.md), following `<html lang>` (which the locale registry keeps in step with the interface language) rather than the browser's first preference; the name is live SVG text, so a longer OEM name steps down inside the upstream wordmark's box rather than reflowing the slot.

## Model Experience

None, as the plugin changes display copy and the document title only.

#### KV Cache effect

None; this package assembles no provider request.

## Known Limitations and Deferred Work

- The web app manifest and `index.html` title are build-time text: the manifest's `name`/`short_name` carry the default name, and the document title is re-localized at runtime (by the inline bootstrap script for the browser language, then by this plugin for the interface language). A deployment that ships a different name per language updates the manifest in the build.
- The logo stays the build-time BirdCoder mark. A deployment that adopts another brand replaces the logo rasters in the build (app icons, installer brand images, and the welcome mark); the profile only carries the display name.
- Locale substitution replaces the exact `BirdCoder` spelling in dictionary templates. A deployment whose brand name contains that spelling in an unrelated word should choose a different brand.
- The H5 and mini-program apps are separate shells with their own product labels; the profile does not reach them.
