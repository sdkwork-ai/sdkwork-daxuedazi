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
| `brands/<key>.oem.json` | deployment | Optional OEM profile shipped as `resources/oem.json` |
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

## Fields

| Field | Meaning | Example |
|---|---|---|
| `key` | Lower-case brand key; names the file and appears in logs | `daxuedazi` |
| `displayName` | Product name for surfaces that read the manifest directly | `学伴AI` |
| `companyName` | Vendor name for packaging metadata | `SDKWork` |
| `home.dirName` | Harness home directory under the user's home; dot-prefixed and lower case so two brands cannot collide on a case-insensitive filesystem | `.daxuedazi` |
| `home.adoptLegacyDshHome` | Whether a packaged first launch may take over an existing `~/.dsh` | `false` |
| `desktop.appId` | Reverse-DNS identifier; `DSH_DESKTOP_APP_ID` still wins for release lanes | `com.sdkwork.daxuedazi` |
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

`desktop.protocol` also carries the SDKWork IAM browser-login callback: an OEM
brand that changes it must set `sdkwork.iamRedirectUri` in its OEM profile to
`<scheme>://auth/callback` (see
[the OEM profile](../packages/host/sdkwork-oem/README.md)), because the packaged
shell can only receive schemes the operating system was told about.

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
   away from every existing one. Leave `home.adoptLegacyDshHome` false unless the
   new brand replaces an existing `~/.dsh` installation.
2. Replace the build-time rasters for that brand: `build/icon.{ico,icns,png}`,
   `resources/icon{,-windows,-macos}.png`, the installer brand images
   (`pnpm --dir apps/desktop run generate-icons` and
   `generate-installer-brand` regenerate the shipped set), and the welcome
   lockup. The runtime never swaps images.
3. Build with `DSH_BRAND=<key>` (and the lane's `DSH_DESKTOP_APP_ID`,
   `DSH_DESKTOP_UNSIGNED`, signing variables) using the `package:*` scripts.
4. Verify: `pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts
   apps/desktop/tests/brand-home.spec.ts apps/desktop/tests/desktop-application-identity.spec.ts`,
   then install both brands and confirm two homes (`~/.daxuedazi`, `~/.<key>`),
   two userData directories, two URL schemes, two commands and two disjoint port
   blocks — starting one while the other runs is the collision this manifest set
   exists to prevent.

<a id="oem-owned-surfaces"></a>

## OEM-owned surfaces

Everything listed here is OEM content: upstream owns the surrounding code, this repository owns the brand values, names, paths and flow that make the shipped application `daxuedazi`. An upstream merge takes upstream's structure and keeps these values; `pnpm run verify-oem-identity` fails with the surface that stopped matching, so a merge cannot quietly revert one.

| Surface | OEM content | Merge rule |
|---|---|---|
| `brands/<key>.json` | Every identity value two installed brands must not share: app id, product name, executable, URL scheme, command, Windows PATH key, updater cache, artifact stem, nine-port loopback block, home directory | Keep both manifests and keep their port blocks disjoint; upstream has no equivalent identity to take |
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
| Artifact-name derivations: `package-target.ts`, `package-macos.ts`, `prepare-cli.ts`, `smoke-packaged-runtime.ts`, `desktop-upload-plan.ts`, `desktop-build-version-discovery.ts`, `retain-desktop-ci.ts`, `installed-update-distribution.ts`, `scripts/release/assemble-github-release.ts` | Every produced, uploaded and retained file starts with the selected brand's `artifactPrefix` | Keep the derivation; a literal `deepseek-harness-`, `birdcoder-` or `daxuedazi-` stem is a merge defect |
| `packages/host/sdkwork-oem` | OEM profile schema, shipped display brand, IAM callback default whose scheme is the brand protocol | Keep the profile contract; the callback scheme must follow `desktop.protocol` |
| `packages/client/ui-primitives/src/oem-brand.ts` | Browser fallback of the same IAM callback | Keep both defaults in step |
| Docs and gates: `AGENTS.md` OEM sections, this page, `FORK_SYNC.md`, `INSTALL*.md`, `docs/user/guide/desktop*.md`, `apps/desktop/README*.md` | The described identities, paths, commands, artifact names and merge rules | Keep the OEM statements; merge upstream's new prose around them |
| Tests and snapshots: `apps/desktop/tests/*brand*`, `*identity*`, `*packaging*`, `*publication*`, `expected/*` | The assertions and fixtures that pin the OEM values | Keep the OEM expectations; refresh a snapshot only when the contract itself changes |

Merge rules:

- Resolve per file, never per tree: no `git checkout --ours .`, `--theirs .`, `-X ours`, `-X theirs`, and never delete a file to silence a conflict.
- When upstream rewrote a file this fork owns, take upstream's structure and re-apply the OEM fields above; a file that lost them is a merge defect, not a resolution.
- When upstream's launcher or builder reintroduces a fixed port, re-apply the brand-block derivation. A merge that leaves `19388`, `19389`, `9222`, `9229` or `9230` as a default in `apps/desktop/scripts/dev.ts` is a merge defect, even if every other OEM value survived.
- Run the verification below before `scripts/sync-upstream.sh anchor`; the sync's `verify` step calls the same gate.
- Snapshot and fixture updates are legitimate only when the contract changes; never regenerate them to turn a red OEM check green.

Re-verify after every upstream merge:

```sh
pnpm run verify-oem-identity
pnpm exec vitest run apps/desktop/tests/brand-manifest.spec.ts apps/desktop/tests/brand-home.spec.ts \
  apps/desktop/tests/brand-host-port.spec.ts apps/desktop/tests/development-identity.spec.ts \
  apps/desktop/tests/desktop-application-identity.spec.ts apps/desktop/tests/installer-packaging.spec.ts \
  scripts/verify-oem-identity.spec.ts
```

## Not brand-scoped yet

- Installer copy and native window strings come from `apps/desktop/scripts/locale*`
  and the NSIS include; they carry the shipped brand until an OEM build replaces
  them the way it replaces the rasters. The Desktop command-management copy in
  `apps/desktop/src/locale.ts` names the shipped `daxuedazi` command, so a build
  of another brand must re-spell those strings.
- Icon and artifact artwork is generated from the canonical BirdCoder raster.
- `desktop.executableName` names the installed binary; an OEM build must ship a
  binary of that name, which electron-builder derives from the same field.
