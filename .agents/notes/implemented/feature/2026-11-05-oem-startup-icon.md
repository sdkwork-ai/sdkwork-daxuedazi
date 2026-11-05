# Agent Note: The startup icon is explicit product identity, not OEM copy

Status: implemented

English | [中文](2026-11-05-oem-startup-icon.zh.md)

## Problem

The first surface a desktop launch shows is the Welcome window, and it had no explicit `icon` option; only the later main window passed the generated raster. The macOS Dock in an unpackaged run and the Windows AppUserModelID were also left to platform defaults. On top of that, the OEM profile accepted unknown fields, so a deployment could add `brand.icon` / `ui.icon` expecting a different mark even though the runtime never swaps images. The result was that the icon a user sees at startup depended on the platform, the shell packaging, and whatever a profile happened to say, instead of on the one canonical product mark.

## Decision

The startup icon is resolved from `apps/desktop/build/icon.png` only (`resolveApplicationIcon`), with `resolveWindowIcon` keeping the macOS bundle rule. The shell sets the macOS Dock image in an unpackaged run, sets the Windows AppUserModelID from the selected brand (so the running process and the installed shortcut share one taskbar identity), and gives the Welcome window the same explicit icon as the main window. Packaging names the same rasters for the macOS, Windows, and Linux targets and for the installer icons. `brand.icon` and `ui.icon` are rejected at OEM profile load: a deployment that needs another mark replaces the generated rasters in the build.

`verify-oem-identity` now asserts the readers, the three startup wiring points, the builder entries, the generated rasters, `brand.icon` / `ui.icon` rejection, and the contract copy in `AGENTS.md` and `brands/README.md`; `apps/desktop/tests/app-icon.spec.ts` and `welcome-window.spec.ts` pin the raster formats, the builder wiring, and the first-window icon.

## Alternatives considered

**Rely on the packaged executable and bundle icon.** Lost: it leaves the unpackaged macOS Dock and the Welcome window on Electron defaults, which is exactly the state the user reports; it also gives no positive assertion that the correct raster is wired.

**Let an OEM profile or brand manifest select the image.** Lost: the mark is product identity shared by every deployment, and a per-profile image would make the installed app disagree with the web tab and the installer. The profile already cannot swap images; accepting the field silently was the confusing part.

**Copy the icon into each window after construction.** Lost: the first paint can already show the default; the constructor option is the only place that guarantees the window never appears with the wrong mark.

## Consequences

Every launch surface now carries the 学伴AI orange mascot: the Dock in development, the Windows taskbar identity, the Welcome window, the main window, the tray, and the installer. A deployment that tries to point the profile at another image fails loudly at load instead of shipping a silently ignored field. The cost is that a deployment with a genuinely different mark must rebuild the generated rasters rather than change one JSON value, which is the same rule the logo and installer already follow.

## Testing

`apps/desktop/tests/app-icon.spec.ts` covers `resolveApplicationIcon` / `resolveWindowIcon`, the PNG/ICO/ICNS formats, the About rasters, and the builder's platform and installer entries. `apps/desktop/tests/welcome-window.spec.ts` asserts the startup window receives the raster path. `packages/host/sdkwork-oem/tests/config.spec.ts` asserts `brand.icon` / `ui.icon` are rejected. `scripts/verify-oem-identity.spec.ts` mutates the wiring, the raster, and the guard and expects the named failure.
