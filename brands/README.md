# Brand manifests (OEM)

English | [中文](README.zh.md)

One JSON file per application brand. A brand is the complete identity of one
installed application: the Harness home it owns, the Electron product name, its
block of loopback ports, the URL scheme, the desktop command, the updater cache
directory and the artifact spelling. Two brands built from this repository
install, run, update and uninstall side by side because none of those values is
shared.

`daxuedazi.json` is the shipped brand; everything the packaging scripts and the Electron shell derive by default comes from it. `birdcoder.json` remains the second brand this repository can still package, and the two share no installed identity. The [OEM-owned surface inventory](#oem-owned-surfaces) below lists every file an upstream merge must preserve, and `pnpm run verify-oem-identity` checks it after each merge.

## Files

| File | Owner | Purpose |
|---|---|---|
| `brands/<key>.json` | this repository | Build-time source of one brand |
| `brands/<key>.oem.json` | deployment | OEM profile shipped as `resources/oem.json`; required for every brand other than the shipped one, because the shared defaults spell the shipped brand's display name and IAM callback scheme |
| `resources/brand.json` (inside a packaged app) | packaging | Runtime copy of the selected manifest |
| `resources/oem.json` (inside a packaged app) | packaging | Runtime copy of `<key>.oem.json`, when present |

## Selecting a brand

Highest precedence first:

1. `DSH_BRAND_CONFIG=/abs/path/brand.json` — an explicit manifest, for a packaging
   lane that keeps its brand files elsewhere.
2. `DSH_BRAND=<key>` — `brands/<key>.json`.
3. `daxuedazi` — the shipped brand.

Packaging uses the same precedence, writes the selected file as
`resources/brand.json`, and copies `<key>.oem.json` beside it as `oem.json` when
it exists. At runtime the shell reads `resources/brand.json`; a source checkout
(`pnpm dev:desktop`) reads `brands/<key>.json` instead.

<a id="fields"></a>

## Fields

| Field | Meaning | Example |
|---|---|---|
| `key` | Lower-case brand key; names the file and appears in logs | `daxuedazi` |
| `displayName` | Product name for surfaces that read the manifest directly | `学伴AI` |
| `companyName` | Vendor name for packaging metadata | `SDKWork` |
| `home.dirName` | Harness home directory under the user's home; dot-prefixed and lower case so two brands cannot collide on a case-insensitive filesystem | `.daxuedazi` |
| `home.adoptLegacyDshHome` | Whether a packaged first launch may take over an existing `~/.dsh` | `false` |
| `desktop.appId` | Reverse-DNS identifier; owns the Windows installer GUID, and with it the install directory the next installer upgrades, the uninstall registration and the macOS bundle identifier | `com.sdkwork.daxuedazi` |
| `desktop.releaseRepository` | GitHub `owner/repo` that publishes this brand's releases; the packaged updater reads `latest.yml` from it | `sdkwork-ai/sdkwork-daxuedazi` |
| `desktop.productName` | Electron product name; names userData, the single-instance lock and logs | `daxuedazi` |
| `desktop.executableName` | Installed executable and macOS `MacOS/<name>` | `daxuedazi` |
| `desktop.protocol` | Custom URL scheme the shell registers | `daxuedazi` |
| `desktop.commandName` | Desktop command, launcher file name and ownership-receipt stem | `daxuedazi` |
| `desktop.registryKey` | Windows PATH-ownership key and mutex stem | `DaXueDaZi` |
| `desktop.updaterCacheDirName` | electron-updater cache directory | `daxuedazi-updater` |
| `desktop.artifactPrefix` | Artifact stem before `-<version>-<os>-<arch>` | `daxuedazi` |
| `desktop.webPort` | First of the brand's nine loopback ports; the packaged shell serves it, and the source lanes and their inspectors take the rest | `19400` |

`parseBrandManifest` rejects malformed values and the upstream identity
(`~/.dsh`, `DeepSeek Harness`, scheme and command `dsh`, `com.deepseek.harness`).
A typo fails the build instead of silently splitting one application's data
across two homes. `desktop.webPort` accepts 1024 through 65527, because the whole
[port block](#ports) has to stay usable; a value that leaves no room for it is a
build error rather than a lane that starts on a truncated port.

`desktop.appId` is the installed identity, not a label: electron-builder hashes it into the NSIS GUID, and that GUID keys the `Software\<GUID>\InstallLocation` record the next installer reads. Two products that ship one app id therefore cannot be installed side by side — the second installer treats the first one's directory as its own previous installation, upgrades it in place and takes over its uninstall registration. Packaging takes the identifier from this manifest; a `DSH_DESKTOP_APP_ID` naming another brand this repository ships, or the upstream application, fails the run with both identities named instead of installing over that product. Leave the variable unset, or repeat the selected brand's value.

`desktop.releaseRepository` is the update identity: the packaged `app-update.yml` names it, electron-updater downloads `latest.yml` from it, and a repository has exactly one `latest` pointer. Two brands that share one repository therefore share one update stream — the newer release of either product is offered to both, and installing it replaces the other product. Packaging reads the repository from this manifest and refuses a lane that builds the brand in any other repository, and the packaged artifact is read back to confirm its updater configuration names this repository; an OEM build can no longer pick up the release of the product it was forked from.

`desktop.protocol` also carries the SDKWork IAM browser-login callback: an OEM
brand that changes it must set `sdkwork.iamRedirectUri` in its OEM profile to
`<scheme>://auth/callback` (see
[the OEM profile](../packages/host/sdkwork-oem/README.md)), because the packaged
shell can only receive schemes the operating system was told about. The OAuth
client id defaults to that same scheme, so the tenant registers one public
client per installed brand instead of reusing another brand's.

## Ports

Loopback ports are as brand-scoped as the home. One brand owns nine consecutive
ports starting at `desktop.webPort`, so two installed applications, their two
source lanes and each lane's debuggers never contend for one listener or one
debugger port:

| Offset | Owner | Shipped brand | Second brand |
|---|---|---|---|
| `+0` | Installed shell, Web application | `19400` | `19387` |
| `+1` | `pnpm dev:desktop` Web application | `19401` | `19388` |
| `+2` | `pnpm dev:desktop:online` Web application | `19402` | `19389` |
| `+3`-`+5` | `dev:desktop` main, renderer and Host inspectors | `19403`-`19405` | `19390`-`19392` |
| `+6`-`+8` | `dev:desktop:online` main, renderer and Host inspectors | `19406`-`19408` | `19393`-`19395` |

Two brands therefore have to be at least nine ports apart. That is not a
convention a reviewer has to remember: `brandPortCollisions` reads every manifest
in `brands/` and fails packaging when two blocks overlap, `verify-oem-identity`
fails an upstream sync with the colliding pair and both ranges, and
`apps/desktop/tests/development-identity.spec.ts` pins the shipped set. A lane moves
off its block only when a launch names the port: `DSH_DESKTOP_HOST_WEB_PORT`,
`DSH_DESKTOP_MAIN_INSPECT_PORT`, `DSH_DESKTOP_RENDERER_DEBUG_PORT` and
`DSH_DESKTOP_HOST_INSPECT_PORT`.

A checkout that still runs upstream's unmodified development launcher keeps
upstream's fixed ports; this block describes the manifests and the launcher in this
repository, which is what the gates can prove.

## Harness home

The launcher resolves the home before any plugin mounts and exports it as
`DSH_HOME`, which every consumer already reads:

1. An explicit `DSH_HOME` — tests, CI, portable installs.
2. `~/<home.dirName>` — the brand's own home.
3. The legacy `~/.dsh`, only for a brand that sets `home.adoptLegacyDshHome` and
   only in a packaged launch:
   - the first launch renames `~/.dsh` to the brand home (same-volume move, so
     sessions, credentials, profiles and workspaces move with it);
   - when a rename is refused — an older instance may still hold a file — it
     creates a directory link instead;
   - when neither works it keeps using `~/.dsh` for that launch and reports it,
     so the application still starts and no data is lost.

A brand without `adoptLegacyDshHome` always uses its own directory and never reads `~/.dsh`: importing another product's credentials and sessions is worse than starting empty, and a shared directory would let two installed brands read one home. A source launch of an adopting brand never renames anything; it uses the brand home when it exists and otherwise keeps `~/.dsh`.

A shipped `resources/oem.json` becomes the default `DSH_OEM_CONFIG` only when the
home carries no `oem.json` of its own, so a deployment ships its endpoints
read-only and a user can still override them from `~/.<brand>/oem.json`.

A packaged application exports its home as `DSH_HOME` into every child process it
spawns, so a terminal started from one brand carries that brand's home. The
development launcher therefore refuses an inherited `DSH_HOME` that another brand
(or the upstream `~/.dsh`) owns, uses its own state root under
`apps/desktop/.desktop-build/`, and reports the refused path; any other explicit
`DSH_HOME` still replaces the lane's home.

## Adding a brand

1. Copy `brands/daxuedazi.json` to `brands/<key>.json` and change `key`,
   `displayName`, `companyName`, `home.dirName` and every `desktop` value, giving
   the new brand its own [`desktop.webPort`](#ports) block at least nine ports
   away from every existing one and its own
   [`desktop.releaseRepository`](#fields) — the repository that will publish its
   releases. Leave `home.adoptLegacyDshHome` false unless the new brand replaces
   an existing `~/.dsh` installation.
2. Replace the build-time rasters for that brand: `build/icon.{ico,icns,png}`,
   `resources/icon{,-windows,-macos}.png`, the installer brand images
   (`pnpm --dir apps/desktop run generate-icons` and
   `generate-installer-brand` regenerate the shipped set), and the welcome
   lockup. The runtime never swaps images.
3. Build with `DSH_BRAND=<key>` (plus `DSH_DESKTOP_UNSIGNED` and the signing
   variables the lane needs) using the `package:*` scripts. Leave
   `DSH_DESKTOP_APP_ID` unset: the manifest supplies the identity, and a value
   naming another brand fails packaging.
4. Verify: `pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts
   apps/desktop/tests/brand-home.spec.ts apps/desktop/tests/desktop-application-identity.spec.ts`,
   then install both brands and confirm two homes (`~/.daxuedazi`, `~/.<key>`),
   two userData directories, two URL schemes, two commands and two disjoint port
   blocks — starting one while the other runs is the collision this manifest set
   exists to prevent.

<a id="oem-owned-surfaces"></a>

## OEM-owned surfaces

Everything listed here is OEM content: upstream owns the surrounding code, this repository owns the brand values, names, paths and flow that make the shipped application `daxuedazi`. An upstream merge takes upstream's structure and keeps these values; `pnpm run verify-oem-identity` fails with the surface that stopped matching, so a merge cannot quietly revert one. The platform-wide rules this repository applies — brand declaration and validation, artifact prefixes on every released file, side-by-side installed identity, and the verification a release-branded build owes — are normative in `../sdkwork-specs/OEM_BRANDING_SPEC.md`.

| Surface | OEM content | Merge rule |
|---|---|---|
| `brands/<key>.json` | Every identity value two installed brands must not share: app id, release repository, product name, executable, URL scheme, command, Windows PATH key, updater cache, artifact stem, nine-port loopback block, home directory | Keep both manifests, keep their port blocks disjoint and give each brand its own release repository; upstream has no equivalent identity to take |
| `apps/desktop/scripts/brand-manifest.mjs` + `.d.mts` | Manifest loader and validator, `DEFAULT_BRAND_KEY`, `BRAND_PORT_BLOCK`, `brandPortCollisions`, rejection of the upstream identity | Keep the fork implementation; a changed manifest shape is a product change, not a sync |
| `apps/desktop/package.json` (`productName`) | Electron application name behind userData, logs, the single-instance lock and the Windows install directory | Keep `daxuedazi`; the builder refuses a mismatch with the shipped brand |
| `apps/desktop/scripts/electron-builder-config.mjs` | `productName`, `extraMetadata.productName`, `executableName`, `artifactName`, protocols, app-id fallback, updater cache directory, `resources/brand.json`, the port-block collision refusal | Keep every brand-derived field and upstream's new builder fields |
| `apps/desktop/cli/daxuedazi` + `daxuedazi.cmd` | Installed launcher templates (`@BRAND_HOME@`, executable name, command name) | Keep these launchers; upstream's `dsh` launcher belongs to another application |
| `apps/desktop/scripts/dev.ts` + `apps/desktop/scripts/development-identity.ts` | The source lanes' Web and inspector ports from the brand block, and the refusal of an inherited `DSH_HOME` that another brand exports into the environment | Keep the derivation; a fixed lane or inspector port, or a taken-over home, is a merge defect |
| `apps/desktop/src/brand.ts` | Resolves the launch brand, owns `~/.<home.dirName>`, exports `DSH_HOME`, and hands the Host the brand Web port; a brand without `adoptLegacyDshHome` never reads `~/.dsh` | Keep the module and its isolation branches; re-resolve it onto upstream's startup changes |
| `apps/desktop/src/main.ts` | Registers `brand.desktop.protocol`, names the About panel from the OEM brand, applies the brand window icon and tray identity, and passes `desktop.webPort` to the Desktop Host | Keep these call sites inside upstream's restructured `main.ts` |
| `apps/desktop/src/locale.ts` command copy | The `cliCommand*` strings name the shipped `daxuedazi` command and terminal invocation | Keep the shipped command spelling; other brand builds re-spell them |
| `apps/desktop/src/command-*.ts` + `scripts/command-path.ps1` | Command ownership receipt, Windows PATH key and mutex stem, all from the manifest | Keep the manifest-derived names; never hardcode a brand |
| `apps/desktop/installer/*` + `scripts/installer.nsh` | Installer artwork and copy, path row, run/launch checks, removal targets; the uninstaller retires only `%APPDATA%<productName>` | Keep the fork installer files and merge upstream's NSIS fixes by meaning |
| Artifact-name derivations: `package-target.ts`, `package-macos.ts`, `prepare-cli.ts`, `smoke-packaged-runtime.ts`, `desktop-upload-plan.ts`, `desktop-build-version-discovery.ts`, `retain-desktop-ci.ts`, `installed-update-distribution.ts`, `scripts/release/assemble-github-release.ts`, `scripts/release/container-artifacts.ts` | Every produced, uploaded and retained file starts with the selected brand's `artifactPrefix`: the Desktop installers (`<prefix>-<version>-<os>-<arch>`), the container deployment bundle (`<prefix>-container-<version>.tar.gz`), each saved image archive (`<prefix>-container-image-<version>-linux-<arch>.tar.gz`), and the Actions artifacts and guide commands that name them | Keep the derivation and keep the container names in their one owner, `container-artifacts.ts`; a literal `deepseek-harness-`, `birdcoder-`, `dsh-container` or `daxuedazi-` stem in a lane, the workflow or the guides is a merge defect |
| `.github/workflows/container-release.yml` + `scripts/release/pack-container.ts` + `scripts/release/verify-container.ts` + `INSTALL*.md` + `docs/user/guide/deployment*.md` | The container release asset names: the workflow resolves `desktop.artifactPrefix` in its `resolve` job, the packer and assembler derive from it, the gate asserts the workflow and guides still use it | Keep the derivation; the image *reference* inside Compose and Kubernetes is deployment identity, not a release asset, and keeps its application name |
| `packages/host/sdkwork-oem` | OEM profile schema, shipped display brand, the `ui.sceneSwitcher` / `ui.skillTags` product-chrome defaults, the `ui.appStore` / `ui.templateLibrary` / `ui.demandHall` shipped-visibility defaults, IAM callback default whose scheme is the brand protocol | Keep the profile contract; the callback scheme must follow `desktop.protocol`; all five surface fields default to `false`, so the shipped build mounts neither the scene chrome nor a storefront row in the sidebar |
| `packages/client/ui-primitives/src/oem-brand.ts` | Browser fallback of the same IAM callback, plus the `readOemSceneSwitcher` / `readOemSkillTags` / `readOemAppStore` / `readOemTemplateLibrary` / `readOemDemandHall` readers every client gate and the sidebar default use | Keep both defaults in step; these readers remain the only way a client reads the surface flags |
| `packages/client/ui-sdkwork-app-modes` | The scene-pill seat, the two skill-strip seats, the submission observer, and the General scene-switch row are registered only when the OEM flags allow them | Keep the `readOemSceneSwitcher` / `readOemSkillTags` gates; an unconditional registration is a merge defect |
| `packages/client/ui-sdkwork-skills` | The Skills page omits the strip master switch when `ui.skillTags` is off; per-skill suggestion switches stay | Keep the `readOemSkillTags` gate on the strip switch only |
| `packages/client/ui-sdkwork-sidebar` | The sidebar layout preference ships `sdkwork-appstore`, `sdkwork-template-library`, and `sdkwork-demand-hall` hidden through `shippedHiddenEntryIds()`; it stores the ids the user explicitly hid and the ids the user explicitly showed, so the Settings → Sidebar switches stay effective | Keep the three id/reader pairs and the explicit-show list; a merge that drops either shows the storefronts to every shipped user or re-hides a row the user turned on |
| Startup icon: `apps/desktop/src/app-icon.ts`, `apps/desktop/src/main.ts`, `apps/desktop/src/welcome-window.ts`, `apps/desktop/build/icon.{png,ico,icns}`, `apps/desktop/resources/icon*.png`, `resources/tray-windows.ico`, `renderer/assets/welcome-bird.png`, `apps/desktop/scripts/electron-builder-config.mjs` | The 学伴AI mascot every launch surface shows: Dock image, Windows taskbar identity, Welcome and main windows, tray, installer and packaged targets | Keep the canonical raster and every wiring point; no profile or brand field may select another image (`brand.icon` / `ui.icon` are rejected), and a merge that drops `resolveApplicationIcon` / `resolveWindowIcon` or the builder's `brandIcon(...)` entries is a defect |
| `packages/client/ui-sdkwork-appstore` | The App Store rail entry, keyed page, sidebar quick entry, and SDKWork host adapter, all mounted so the sidebar row and its Settings switch stay reachable | Keep the plugin mounted; the sidebar preference, not the plugin, hides the row by default |
| `packages/client/ui-sdkwork-template-library` | The template-library quick entry, keyed page, and SDKWork host adapter, all mounted so the sidebar row and its Settings switch stay reachable | Keep the plugin mounted; the sidebar preference, not the plugin, hides the row by default |
| `packages/client/ui-sdkwork-demand-hall` | The demand-hall quick entry, keyed page, SDKWork host adapter, and demand-to-project port, all mounted so the sidebar row and its Settings switch stay reachable | Keep the plugin mounted; the sidebar preference, not the plugin, hides the row by default |
| Docs and gates: `AGENTS.md` OEM sections, this page, `FORK_SYNC.md`, `INSTALL*.md`, `docs/user/guide/desktop*.md`, `apps/desktop/README*.md` | The described identities, paths, commands, artifact names and merge rules | Keep the OEM statements; merge upstream's new prose around them |
| Tests and snapshots: `apps/desktop/tests/*brand*`, `*identity*`, `*packaging*`, `*publication*`, `expected/*` | The assertions and fixtures that pin the OEM values | Keep the OEM expectations; refresh a snapshot only when the contract itself changes |

Merge rules:

- Resolve per file, never per tree: no `git checkout --ours .`, `--theirs .`, `-X ours`, `-X theirs`, and never delete a file to silence a conflict.
- When upstream rewrote a file this fork owns, take upstream's structure and re-apply the OEM fields above; a file that lost them is a merge defect, not a resolution.
- When upstream's launcher or builder reintroduces a fixed port, re-apply the brand-block derivation. A merge that leaves `19388`, `19389`, `9222`, `9229` or `9230` as a default in `apps/desktop/scripts/dev.ts` is a merge defect, even if every other OEM value survived.
- A merge that mounts the hero scene pills or the composer skill strip unconditionally is the same kind of defect: the shipped profile hides both through `ui.sceneSwitcher` / `ui.skillTags`, and `verify-oem-identity` fails when the gates disappear.
- A merge that replaces the startup icon wiring with an Electron default, or an OEM profile that tries to select another image, is a merge/product defect: the startup icon is build-time identity, and `verify-oem-identity` asserts the canonical raster plus every launch surface that shows it.
- A merge that registers the App Store, template library, or demand hall only when the OEM flag is on is the same kind of defect: the plugins must stay mounted so Settings → Sidebar can offer their switches, and the shipped-hidden mapping in `ui-sdkwork-sidebar` is what hides the rows. A merge that removes a plugin, drops an id from `shippedHiddenEntryIds()`, or hardcodes "hidden" outside the preference is a merge defect.
- An OEM deployment that promotes a storefront sets the corresponding field to `true` in `oem.json` so the row starts visible; the user's own switch still wins. Never move the visibility decision into the plugin or the composition.
- Run the verification below before `scripts/sync-upstream.sh anchor`; the sync's `verify` step calls the same gate.
- Snapshot and fixture updates are legitimate only when the contract changes; never regenerate them to turn a red OEM check green.

Re-verify after every upstream merge:

```sh
pnpm run verify-oem-identity
pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts \
  apps/desktop/tests/brand-host-port.spec.ts apps/desktop/tests/development-identity.spec.ts \
  apps/desktop/tests/desktop-application-identity.spec.ts apps/desktop/tests/installer-packaging.spec.ts \
  packages/host/sdkwork-oem packages/client/ui-primitives/tests/oem-brand.client.spec.tsx \
  packages/client/ui-sdkwork-app-modes/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-skills/tests/skills-section.client.spec.tsx \
  packages/client/ui-sdkwork-sidebar/tests/layout.client.spec.ts \
  packages/client/ui-sdkwork-appstore/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-template-library/tests/apply.client.spec.ts \
  packages/client/ui-sdkwork-demand-hall/tests/apply.client.spec.ts \
  scripts/verify-oem-identity.spec.ts
```

## Not brand-scoped yet

- Installer copy and native window strings come from `apps/desktop/scripts/locale*`
  and the NSIS include; they carry the shipped brand until an OEM build replaces
  them the way it replaces the rasters. The Desktop command-management copy in
  `apps/desktop/src/locale.ts` names the shipped `daxuedazi` command, so a build
  of another brand must re-spell those strings.
- Icon and artifact artwork is generated from the canonical 学伴AI raster.
- `desktop.executableName` names the installed binary; an OEM build must ship a
  binary of that name, which electron-builder derives from the same field.
