/**
 * Verify the OEM brand contract that upstream merges must not drop.
 *
 * An upstream merge replaces the files this fork evolved; it must never replace
 * the OEM identity those files carry. This gate reads the files that own the
 * shipped brand and fails with the exact surface that stopped matching, so a
 * merge that reverts a brand value, an artifact-name derivation, the IAM
 * callback scheme, the Harness home rule or the OEM-owned copy fails here
 * instead of shipping a shell that collides with the other brand.
 *
 * The inventory and the merge rules live in `brands/README.md`
 * ("OEM-owned surfaces"). Re-run this gate after every upstream merge.
 *
 * @module verify-oem-identity
 */

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyBrandHome } from '../apps/desktop/src/brand.ts'
import { brandPortCollisions, readBrands, type DesktopBrand } from '../apps/desktop/scripts/brand-manifest.mjs'

/** Brand key the repository ships when nothing selects another manifest. */
const SHIPPED_KEY = 'daxuedazi'

/** Second brand the repository can still package; it must share no installed identity. */
const OTHER_KEY = 'birdcoder'

/** Every identity value the shipped manifest owns. */
const SHIPPED_IDENTITY = Object.freeze({
  appId: 'com.sdkwork.daxuedazi',
  productName: 'daxuedazi',
  executableName: 'daxuedazi',
  protocol: 'daxuedazi',
  commandName: 'daxuedazi',
  registryKey: 'DaXueDaZi',
  updaterCacheDirName: 'daxuedazi-updater',
  artifactPrefix: 'daxuedazi',
  webPort: 19400,
})

/** Harness home the shipped brand owns outright. */
const SHIPPED_HOME = Object.freeze({ dirName: '.daxuedazi', adoptLegacyDshHome: false })

/** Identity values two installed brands must never share. */
const SHARED_IDENTITY = ['appId', 'productName', 'executableName', 'protocol', 'commandName', 'registryKey', 'updaterCacheDirName', 'artifactPrefix', 'webPort'] as const

/** Packaging and publication modules that must derive names from the selected brand. */
const BRAND_DERIVED = [
  'apps/desktop/scripts/electron-builder-config.mjs',
  'apps/desktop/scripts/package-target.ts',
  'apps/desktop/scripts/package-macos.ts',
  'apps/desktop/scripts/prepare-cli.ts',
  'apps/desktop/scripts/smoke-packaged-runtime.ts',
  'apps/desktop/scripts/desktop-upload-plan.ts',
  'apps/desktop/scripts/desktop-build-version-discovery.ts',
  'apps/desktop/scripts/retain-desktop-ci.ts',
  'apps/desktop/scripts/installed-update-distribution.ts',
  'scripts/release/assemble-github-release.ts',
] as const

/** Surfaces whose content the OEM contract depends on; the spec copies exactly these. */
export const OEM_OWNED_FILES = [
  `brands/${SHIPPED_KEY}.json`,
  `brands/${OTHER_KEY}.json`,
  'apps/desktop/package.json',
  'apps/desktop/scripts/brand-manifest.mjs',
  'apps/desktop/scripts/dev.ts',
  'apps/desktop/scripts/development-identity.ts',
  'apps/desktop/scripts/electron-builder-config.mjs',
  'apps/desktop/cli/daxuedazi',
  'apps/desktop/cli/daxuedazi.cmd',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/app-icon.ts',
  'apps/desktop/src/welcome-window.ts',
  'apps/desktop/src/locale.ts',
  'apps/desktop/installer/uninstall.nsh',
  'apps/desktop/build/icon.png',
  'apps/desktop/build/icon.ico',
  'apps/desktop/build/icon.icns',
  'apps/desktop/resources/icon.png',
  'apps/desktop/resources/icon-windows.png',
  'apps/desktop/resources/icon-macos.png',
  'apps/desktop/resources/tray-windows.ico',
  'apps/desktop/renderer/assets/welcome-bird.png',
  'packages/host/sdkwork-oem/src/config.ts',
  'packages/client/ui-primitives/src/oem-brand.ts',
  'packages/client/ui-sdkwork-app-modes/src/client/index.ts',
  'packages/client/ui-sdkwork-skills/src/client/index.ts',
  'packages/client/ui-sdkwork-sidebar/src/client/layout.ts',
  'packages/client/ui-conversation/src/client/locales.ts',
  'AGENTS.md',
  'brands/README.md',
  'FORK_SYNC.md',
  ...BRAND_DERIVED,
] as const

/** One OEM surface a merge must preserve. */
export interface OemIdentityReport {
  /** Every surface that no longer matches the contract, in file order. */
  readonly failures: string[]
  /** Files read for this report. */
  readonly checked: number
}

/**
 * Read one required file.
 * @param root - Repository root.
 * @param path - Repository-relative path.
 * @returns File contents, or the empty string when the file is missing.
 */
function read(root: string, path: string): string {
  const file = join(root, path)
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

/**
 * Parse one brand manifest.
 * @param root - Repository root.
 * @param key - Brand key naming `brands/<key>.json`.
 * @param failures - Receives the failure message when the file is missing or malformed.
 * @returns The parsed manifest, or undefined.
 */
function manifest(root: string, key: string, failures: string[]): DesktopBrand | undefined {
  const path = `brands/${key}.json`
  const text = read(root, path)
  if (text === '') {
    failures.push(`oem identity: ${path} is missing; the fork's shipped brand manifest must survive the merge`)
    return undefined
  }
  try {
    return JSON.parse(text) as DesktopBrand
  } catch {
    failures.push(`oem identity: ${path} is not valid JSON`)
    return undefined
  }
}

/**
 * Compare the shipped manifest with the identity the packaging lanes depend on.
 * @param brand - Parsed shipped manifest.
 * @param failures - Receives every mismatch.
 */
function checkShipped(brand: DesktopBrand | undefined, failures: string[]): void {
  if (brand === undefined) return
  if (brand.key !== SHIPPED_KEY) failures.push(`oem identity: brands/${SHIPPED_KEY}.json declares key ${JSON.stringify(brand.key)}`)
  if (brand.home.dirName !== SHIPPED_HOME.dirName) {
    failures.push(`oem identity: home.dirName is ${JSON.stringify(brand.home.dirName)}; the shipped brand owns ${JSON.stringify(SHIPPED_HOME.dirName)} and must never share another product's home`)
  }
  if (brand.home.adoptLegacyDshHome !== SHIPPED_HOME.adoptLegacyDshHome) {
    failures.push(`oem identity: home.adoptLegacyDshHome is ${JSON.stringify(brand.home.adoptLegacyDshHome)}; the shipped brand never takes over ~/.dsh`)
  }
  for (const [field, expected] of Object.entries(SHIPPED_IDENTITY)) {
    const actual = (brand.desktop as unknown as Record<string, unknown>)[field]
    if (actual !== expected) {
      failures.push(`oem identity: desktop.${field} is ${JSON.stringify(actual ?? null)}; expected ${JSON.stringify(expected)}. `
        + 'An upstream merge replaced the shipped brand manifest; restore the OEM identity from brands/README.md ("OEM-owned surfaces")')
    }
  }
}

/**
 * Compare the second brand with the shipped one.
 * @param shipped - Parsed shipped manifest.
 * @param other - Parsed second manifest.
 * @param failures - Receives every collision.
 */
function checkSecondBrand(shipped: DesktopBrand | undefined, other: DesktopBrand | undefined, failures: string[]): void {
  if (shipped === undefined || other === undefined) return
  if (other.key !== OTHER_KEY) failures.push(`oem identity: brands/${OTHER_KEY}.json declares key ${JSON.stringify(other.key)}`)
  if (other.home.dirName === shipped.home.dirName) {
    failures.push(`oem identity: brands/${OTHER_KEY}.json and the shipped brand share home.dirName ${JSON.stringify(other.home.dirName)}; two installed brands would read one Harness home`)
  }
  for (const field of SHARED_IDENTITY) {
    const a = (shipped.desktop as unknown as Record<string, unknown>)[field]
    const b = (other.desktop as unknown as Record<string, unknown>)[field]
    if (a === b) failures.push(`oem identity: desktop.${field} is ${JSON.stringify(a)} in both brands; two installed brands must not share it`)
  }
}

/**
 * Check that the packaging lanes derive identity from the selected brand.
 * @param root - Repository root.
 * @param failures - Receives every module that lost its brand derivation.
 */
function checkDerivation(root: string, failures: string[]): void {
  for (const path of BRAND_DERIVED) {
    if (!read(root, path).includes('resolveBrand')) {
      failures.push(`oem identity: ${path} no longer derives names from the selected brand (no resolveBrand); `
        + 'an upstream merge reverted it and the packaged name would stop carrying the OEM identity')
    }
  }
  const builder = read(root, 'apps/desktop/scripts/electron-builder-config.mjs')
  for (const token of ['productName: brand.desktop.productName', 'executableName: brand.desktop.executableName',
    'artifactName: `${brand.desktop.artifactPrefix}-', "{ from: brandManifest, to: 'brand.json' }"]) {
    if (!builder.includes(token)) failures.push(`oem identity: electron-builder-config.mjs no longer carries ${JSON.stringify(token)}`)
  }
  const manifestModule = read(root, 'apps/desktop/scripts/brand-manifest.mjs')
  if (!manifestModule.includes(`export const DEFAULT_BRAND_KEY = '${SHIPPED_KEY}'`)) {
    failures.push(`oem identity: brand-manifest.mjs no longer ships ${SHIPPED_KEY} as DEFAULT_BRAND_KEY`)
  }
}

/**
 * Check the shell derives its protocol and command copy from the manifest.
 * @param root - Repository root.
 * @param brand - Parsed shipped manifest.
 * @param failures - Receives every literal identity the shell hardcodes.
 */
function checkShell(root: string, brand: DesktopBrand | undefined, failures: string[]): void {
  const main = read(root, 'apps/desktop/src/main.ts')
  if (!main.includes('setAsDefaultProtocolClient(brand.desktop.protocol)')) {
    failures.push('oem identity: apps/desktop/src/main.ts no longer registers brand.desktop.protocol; the shell would claim the wrong URL scheme')
  }
  if (!main.includes('DSH_DESKTOP_HOST_WEB_PORT: hostWebPort(brand, hostEnvironment)')) {
    failures.push('oem identity: apps/desktop/src/main.ts no longer hands the Desktop Host the brand Web port; '
      + 'two installed brands would contend for one listener and the second launch would fail with EADDRINUSE')
  }
  if (main.includes(`${SHIPPED_IDENTITY.protocol}://`)) {
    failures.push(`oem identity: apps/desktop/src/main.ts spells ${JSON.stringify(`${SHIPPED_IDENTITY.protocol}://`)} literally; the scheme must come from the brand manifest`)
  }
  const packageManifest = read(root, 'apps/desktop/package.json')
  const productName = /"productName":\s*"([^"]+)"/u.exec(packageManifest)?.[1]
  if (productName !== SHIPPED_IDENTITY.productName) {
    failures.push(`oem identity: apps/desktop/package.json productName is ${JSON.stringify(productName ?? null)}; expected ${JSON.stringify(SHIPPED_IDENTITY.productName)}. `
      + 'Electron names userData, the logs directory, the single-instance lock and the installer directory after it')
  }
  const locale = read(root, 'apps/desktop/src/locale.ts')
  if (locale.includes('birdcoder')) {
    failures.push(`oem identity: apps/desktop/src/locale.ts still names the birdcoder command; the command copy must name ${SHIPPED_IDENTITY.commandName}`)
  }
  if (!locale.includes(`${SHIPPED_IDENTITY.commandName} --version`)) {
    failures.push(`oem identity: apps/desktop/src/locale.ts no longer tells users to run ${SHIPPED_IDENTITY.commandName} --version`)
  }
  for (const [path, token] of [
    ['apps/desktop/cli/daxuedazi', `MacOS/${SHIPPED_IDENTITY.executableName}`],
    ['apps/desktop/cli/daxuedazi.cmd', `${SHIPPED_IDENTITY.executableName}.exe`],
    ['apps/desktop/cli/daxuedazi', '@BRAND_HOME@'],
    ['apps/desktop/cli/daxuedazi.cmd', '@BRAND_HOME@'],
  ] as const) {
    if (!read(root, path).includes(token)) failures.push(`oem identity: ${path} no longer carries ${JSON.stringify(token)}`)
  }
  if (brand === undefined) return
  for (const suffix of ['', '.cmd']) {
    if (!existsSync(join(root, 'apps/desktop/cli', `${brand.desktop.commandName}${suffix}`))) {
      failures.push(`oem identity: apps/desktop/cli/${brand.desktop.commandName}${suffix} is missing; prepare-cli.ts reads the shipped brand's template`)
    }
  }
}

/**
 * Check the OEM IAM callback and client keep the shipped brand's URL scheme.
 * @param root - Repository root.
 * @param brand - Parsed shipped manifest.
 * @param failures - Receives every default that drifted from the brand protocol.
 */
function checkIamCallback(root: string, brand: DesktopBrand | undefined, failures: string[]): void {
  if (brand === undefined) return
  for (const path of ['packages/host/sdkwork-oem/src/config.ts', 'packages/client/ui-primitives/src/oem-brand.ts']) {
    const match = /DEFAULT_IAM_REDIRECT_URI\s*=\s*'([^']+)'/u.exec(read(root, path))
    if (match === null) {
      failures.push(`oem identity: ${path} no longer declares DEFAULT_IAM_REDIRECT_URI`)
      continue
    }
    const uri = match[1] ?? ''
    if (!uri.startsWith(`${brand.desktop.protocol}://`)) {
      failures.push(`oem identity: ${path} ships ${JSON.stringify(uri)}; the scheme must be the desktop brand's ${JSON.stringify(brand.desktop.protocol)} or the packaged login callback never arrives`)
    }
    const client = /DEFAULT_IAM_CLIENT_ID\s*=\s*'([^']+)'/u.exec(read(root, path))
    if (client === null) {
      failures.push(`oem identity: ${path} no longer declares DEFAULT_IAM_CLIENT_ID`)
    } else if (client[1] !== brand.desktop.protocol) {
      failures.push(`oem identity: ${path} ships OAuth client ${JSON.stringify(client[1])}; it must be the desktop brand's ${JSON.stringify(brand.desktop.protocol)} so a tenant registers one public client per brand`)
    }
  }
}

/**
 * Check the uninstaller retires only this brand's Electron data.
 * @param root - Repository root.
 * @param failures - Receives a hardcoded or missing removal target.
 */
function checkUninstaller(root: string, failures: string[]): void {
  const script = read(root, 'apps/desktop/installer/uninstall.nsh')
  if (!script.includes('$APPDATA\\${PRODUCT_NAME}')) {
    failures.push('oem identity: apps/desktop/installer/uninstall.nsh no longer removes $APPDATA\\${PRODUCT_NAME}; it must target this brand\'s userData directory')
  }
  if (/\$APPDATA\\BirdCoder/u.test(script)) {
    failures.push('oem identity: apps/desktop/installer/uninstall.nsh hardcodes %APPDATA%\\BirdCoder; an uninstall must not delete the other brand\'s data')
  }
}

/**
 * Check the development lanes derive their ports and home from the brand.
 * @param root - Repository root.
 * @param failures - Receives every lane that lost its brand derivation.
 */
function checkDevelopmentLane(root: string, failures: string[]): void {
  const dev = read(root, 'apps/desktop/scripts/dev.ts')
  for (const token of ['developmentLanePorts(brand)', 'developmentLaneHome({', 'lanePorts.inspectors[lane]']) {
    if (!dev.includes(token)) {
      failures.push(`oem identity: apps/desktop/scripts/dev.ts no longer derives its lanes (${JSON.stringify(token)}); `
        + 'a development shell would bind an installed brand\'s Web port or inspector port, or write into another brand\'s Harness home')
    }
  }
  const lane = read(root, 'apps/desktop/scripts/development-identity.ts')
  for (const token of ['brand.desktop.webPort', 'BRAND_PORT_BLOCK']) {
    if (!lane.includes(token)) {
      failures.push(`oem identity: apps/desktop/scripts/development-identity.ts no longer takes the lane ports from the brand block (no ${JSON.stringify(token)})`)
    }
  }
}

/**
 * Check every brand the repository ships claims a disjoint block of loopback ports.
 *
 * Two installed brands, their two source lanes and each lane's three inspectors
 * draw from one block per brand, so an overlap would surface as the second
 * application failing to start rather than as a test failure.
 * @param root - Repository root.
 * @param failures - Receives every overlapping pair and every manifest the check cannot read.
 */
function checkBrandPorts(root: string, failures: string[]): void {
  let brands: DesktopBrand[]
  try {
    brands = readBrands(join(root, 'brands'))
  } catch (error) {
    failures.push(`oem identity: brands/ is not readable as a manifest set: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  for (const collision of brandPortCollisions(brands)) {
    failures.push(`oem identity: ${collision}; give each brand its own desktop.webPort block so both installed applications can listen at once`)
  }
}

/**
 * Check the home implementation never falls back to another product's home.
 * @param brand - Parsed shipped manifest.
 * @param failures - Receives the home the shipped brand resolved instead of its own.
 */
function checkHomeIsolation(brand: DesktopBrand | undefined, failures: string[]): void {
  if (brand === undefined) return
  const directory = mkdtempSync(join(tmpdir(), 'dsh-oem-home-'))
  try {
    mkdirSync(join(directory, '.dsh'))
    const env: Record<string, string | undefined> = {}
    const result = applyBrandHome({ brand, env, homeDirectory: directory, allowAdoption: true })
    if (result.source !== 'brand' || result.home !== join(directory, brand.home.dirName)) {
      failures.push(`oem identity: a packaged launch of the shipped brand resolved ${JSON.stringify(result.home)} (${result.source}) `
        + `instead of ${JSON.stringify(join(directory, brand.home.dirName))}; the ~/.dsh fallback must not return for a brand that does not adopt it`)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/** One profile-gated developer scene surface and the client entry that must gate it. */
interface ProductSurface {
  /** The `ui` profile field the shipped defaults set to false. */
  readonly field: string
  /** The `ui-primitives` reader every client gate uses. */
  readonly reader: string
  /** Client entry file that reads the field. */
  readonly file: string
  /** Statement that must run before the surface registers any seat. */
  readonly gate: string
  /** Registration call sites the gate must precede when they exist. */
  readonly markers: readonly string[]
}

/** The developer scene chrome: a false flag means the seats never mount. */
const SCENE_SURFACES: readonly ProductSurface[] = [
  {
    field: 'sceneSwitcher',
    reader: 'readOemSceneSwitcher',
    file: 'packages/client/ui-sdkwork-app-modes/src/client/index.ts',
    gate: 'if (showSceneSwitcher) {',
    markers: [
      "ctx.slots.inject('conversation.hero.modeSwitch'",
      "ctx.slots.inject('conversation.hero.dock'",
      "ctx.slots.inject('settings.general.item'",
    ],
  },
  {
    field: 'skillTags',
    reader: 'readOemSkillTags',
    file: 'packages/client/ui-sdkwork-app-modes/src/client/index.ts',
    gate: 'if (showSkillTags) {',
    markers: [
      "id: 'hero-scene-skills'",
      "id: 'hero-scene-skills-cold'",
    ],
  },
]

/**
 * The SDKWork storefront quick entries the shipped profile hides. The plugins
 * stay mounted — the row, its page, and its Sidebar settings switch all exist —
 * so a false flag only ships the row hidden; the user's own switch always wins.
 */
const MARKETPLACE_ENTRIES: readonly {
  /** The `ui` profile field the shipped defaults set to false. */
  readonly field: string
  /** The `ui-primitives` reader the sidebar layout uses. */
  readonly reader: string
  /** The `sidebar.actions` registration id the row ships hidden under. */
  readonly id: string
}[] = [
  { field: 'appStore', reader: 'readOemAppStore', id: 'sdkwork-appstore' },
  { field: 'templateLibrary', reader: 'readOemTemplateLibrary', id: 'sdkwork-template-library' },
  { field: 'demandHall', reader: 'readOemDemandHall', id: 'sdkwork-demand-hall' },
]

/**
 * Check the OEM product-surface contract: the developer scene chrome never
 * mounts under the shipped profile, and the SDKWork storefront rows ship hidden
 * in the sidebar while staying switchable by the user.
 *
 * A merge that mounts the scene seats unconditionally, drops a storefront id
 * from the sidebar's shipped-hidden list, or removes the explicit-show list
 * changes what every user sees even though no brand value moved.
 * @param root - Repository root.
 * @param failures - Receives every surface that stopped matching the contract.
 */
function checkProductChrome(root: string, failures: string[]): void {
  const config = read(root, 'packages/host/sdkwork-oem/src/config.ts')
  const primitives = read(root, 'packages/client/ui-primitives/src/oem-brand.ts')
  const agents = read(root, 'AGENTS.md')
  const brands = read(root, 'brands/README.md')
  const layout = read(root, 'packages/client/ui-sdkwork-sidebar/src/client/layout.ts')
  for (const surface of SCENE_SURFACES) {
    const contract = 'AGENTS.md, "OEM scene chrome"'
    if (!config.includes(`readonly ${surface.field}: boolean`)) {
      failures.push(`oem identity: packages/host/sdkwork-oem/src/config.ts no longer declares the ${JSON.stringify(`ui.${surface.field}`)} field; `
        + `the shipped profile must hide that surface by default (${contract})`)
    }
    if (!config.includes(`${surface.field}: false`)) {
      failures.push(`oem identity: the shipped profile no longer defaults ${JSON.stringify(`ui.${surface.field}`)} to false; `
        + `the surface would mount on every deployment (${contract})`)
    }
    if (!primitives.includes(`export function ${surface.reader}`)
      || !primitives.includes(`readOemChromeFlag(source, '${surface.field}')`)) {
      failures.push(`oem identity: packages/client/ui-primitives/src/oem-brand.ts no longer exports ${JSON.stringify(surface.reader)} `
        + `reading ${JSON.stringify(surface.field)}; every client gate reads the page-projection flag through this module`)
    }
    const text = read(root, surface.file)
    if (!text.includes(surface.gate)) {
      failures.push(`oem identity: ${surface.file} no longer gates its registrations with ${JSON.stringify(surface.gate)}; `
        + `the surface would mount on every deployment (${contract})`)
      continue
    }
    const gateAt = text.indexOf(surface.gate)
    for (const marker of surface.markers) {
      const markerAt = text.indexOf(marker)
      if (markerAt !== -1 && markerAt < gateAt) {
        failures.push(`oem identity: ${surface.file} registers ${JSON.stringify(marker)} before the OEM gate; `
          + `a merge mounted the surface outside the profile-gated branch (${contract})`)
      }
    }
  }
  for (const entry of MARKETPLACE_ENTRIES) {
    const contract = 'AGENTS.md, "OEM marketplace surfaces"'
    if (!config.includes(`readonly ${entry.field}: boolean`)) {
      failures.push(`oem identity: packages/host/sdkwork-oem/src/config.ts no longer declares the ${JSON.stringify(`ui.${entry.field}`)} field; `
        + `the shipped profile must hide that sidebar row by default (${contract})`)
    }
    if (!config.includes(`${entry.field}: false`)) {
      failures.push(`oem identity: the shipped profile no longer defaults ${JSON.stringify(`ui.${entry.field}`)} to false; `
        + `the row would ship visible on every deployment (${contract})`)
    }
    if (!primitives.includes(`export function ${entry.reader}`)
      || !primitives.includes(`readOemChromeFlag(source, '${entry.field}')`)) {
      failures.push(`oem identity: packages/client/ui-primitives/src/oem-brand.ts no longer exports ${JSON.stringify(entry.reader)} `
        + `reading ${JSON.stringify(entry.field)}; the sidebar's shipped-hidden default reads the page projection through it`)
    }
    if (!layout.includes(`id: '${entry.id}', shipsVisible: ${entry.reader}`)) {
      failures.push(`oem identity: packages/client/ui-sdkwork-sidebar/src/client/layout.ts no longer ships ${JSON.stringify(entry.id)} hidden `
        + `through ${JSON.stringify(entry.reader)}; the storefront row would show in the sidebar of every shipped build (${contract})`)
    }
  }
  if (!layout.includes('export function shippedHiddenEntryIds')) {
    failures.push('oem identity: packages/client/ui-sdkwork-sidebar/src/client/layout.ts no longer exposes shippedHiddenEntryIds; '
      + 'the sidebar would lose the profile-driven shipped default (AGENTS.md, "OEM marketplace surfaces")')
  }
  if (!layout.includes('readonly shown: readonly string[]')) {
    failures.push('oem identity: packages/client/ui-sdkwork-sidebar/src/client/layout.ts no longer stores the ids the user explicitly showed; '
      + 'a merge would re-hide a storefront row the user turned on')
  }
  for (const field of [...SCENE_SURFACES.map(surface => surface.field), ...MARKETPLACE_ENTRIES.map(entry => entry.field)]) {
    if (!agents.includes(`ui.${field}`)) {
      failures.push(`oem identity: AGENTS.md no longer names ${JSON.stringify(`ui.${field}`)}; the product-surface contract was dropped`)
    }
    if (!brands.includes(`ui.${field}`)) {
      failures.push(`oem identity: brands/README.md no longer records ${JSON.stringify(`ui.${field}`)} in the OEM-owned surfaces`)
    }
  }
  if (!agents.includes('## OEM scene chrome (merge-stable contract)')) {
    failures.push('oem identity: AGENTS.md no longer states "## OEM scene chrome (merge-stable contract)"; '
      + 'the merge rule for the hero scene pills and the skill-tag strip was dropped')
  }
  if (!agents.includes('## OEM marketplace surfaces (merge-stable contract)')) {
    failures.push('oem identity: AGENTS.md no longer states "## OEM marketplace surfaces (merge-stable contract)"; '
      + 'the merge rule for the App Store, template library and demand hall was dropped')
  }
  const skills = read(root, 'packages/client/ui-sdkwork-skills/src/client/index.ts')
  if (!skills.includes('readOemSkillTags()')) {
    failures.push('oem identity: packages/client/ui-sdkwork-skills/src/client/index.ts no longer reads readOemSkillTags(); '
      + 'the Skills page would offer a strip switch that renders nothing')
  }
  const hero = read(root, 'packages/client/ui-conversation/src/client/locales.ts')
  if (!hero.includes("'hero.headline': '帮助大学生成长与实现梦想'")) {
    failures.push('oem identity: packages/client/ui-conversation/src/client/locales.ts no longer carries the shipped zh hero line; '
      + 'a merge restored the upstream tagline instead of the OEM positioning')
  }
  if ((hero.match(/'hero\.headline'/gu) ?? []).length !== 8) {
    failures.push('oem identity: packages/client/ui-conversation/src/client/locales.ts no longer carries one hero.headline per locale; '
      + 'a merge left a locale on the upstream tagline')
  }
}

/**
 * Check the startup icon: every surface resolves the canonical product raster,
 * the profile cannot select another image, and the packaged targets name it.
 * @param root - Repository root.
 * @param failures - Receives every surface that stopped carrying the icon.
 */
function checkStartupIcon(root: string, failures: string[]): void {
  const icon = read(root, 'apps/desktop/src/app-icon.ts')
  for (const token of ["WINDOW_ICON_RELATIVE_PATH = join('build', 'icon.png')",
    'export function resolveApplicationIcon', 'export function resolveWindowIcon']) {
    if (!icon.includes(token)) {
      failures.push(`oem identity: apps/desktop/src/app-icon.ts no longer carries ${JSON.stringify(token)}; `
        + 'the startup icon would fall back to the Electron default')
    }
  }
  if (icon.includes('readOem') || icon.includes('__DSH_OEM__')) {
    failures.push('oem identity: apps/desktop/src/app-icon.ts reads OEM state; the startup icon must stay build-time identity '
      + '(AGENTS.md, "OEM startup icon")')
  }
  const main = read(root, 'apps/desktop/src/main.ts')
  for (const token of ['resolveApplicationIcon(app.getAppPath())', 'app.dock?.setIcon(startupIcon)',
    'setAppUserModelId?.(brand.desktop.appId)']) {
    if (!main.includes(token)) {
      failures.push(`oem identity: apps/desktop/src/main.ts no longer carries ${JSON.stringify(token)}; `
        + 'the Dock or Windows taskbar would lose the product icon')
    }
  }
  const welcome = read(root, 'apps/desktop/src/welcome-window.ts')
  if (!welcome.includes('resolveWindowIcon(app.getAppPath())')) {
    failures.push('oem identity: apps/desktop/src/welcome-window.ts no longer gives the first window the product icon')
  }
  const builder = read(root, 'apps/desktop/scripts/electron-builder-config.mjs')
  for (const token of ["brandIcon('build/icon.icns')", "brandIcon('build/icon.ico')", "brandIcon('build/icon.png')", 'windowIcon,']) {
    if (!builder.includes(token)) {
      failures.push(`oem identity: apps/desktop/scripts/electron-builder-config.mjs no longer carries ${JSON.stringify(token)}`)
    }
  }
  const oemConfig = read(root, 'packages/host/sdkwork-oem/src/config.ts')
  if (!oemConfig.includes('if (source.icon !== undefined)')) {
    failures.push('oem identity: packages/host/sdkwork-oem/src/config.ts no longer rejects a profile-supplied startup icon; '
      + 'a deployment could select another image at runtime')
  }
  for (const asset of ['apps/desktop/build/icon.png', 'apps/desktop/build/icon.ico', 'apps/desktop/build/icon.icns',
    'apps/desktop/resources/icon.png', 'apps/desktop/resources/icon-windows.png', 'apps/desktop/resources/icon-macos.png',
    'apps/desktop/resources/tray-windows.ico', 'apps/desktop/renderer/assets/welcome-bird.png']) {
    if (!existsSync(join(root, asset))) {
      failures.push(`oem identity: ${asset} is missing; the startup icon rasters are build-time product identity`)
    }
  }
  const agents = read(root, 'AGENTS.md')
  if (!agents.includes('## OEM startup icon (merge-stable contract)')) {
    failures.push('oem identity: AGENTS.md no longer states "## OEM startup icon (merge-stable contract)"')
  }
  for (const token of ['brand.icon', 'ui.icon']) {
    if (!agents.includes(token)) {
      failures.push(`oem identity: AGENTS.md no longer states ${JSON.stringify(token)} is rejected for the startup icon`)
    }
  }
}

/**
 * Check the merge instructions still point at this inventory and gate.
 * @param root - Repository root.
 * @param failures - Receives every missing contract statement.
 */
function checkMergeInstructions(root: string, failures: string[]): void {
  const agents = read(root, 'AGENTS.md')
  for (const token of [`brands/${SHIPPED_KEY}.json`, 'verify-oem-identity', 'brands/README.md', '帮助大学生成长与实现梦想']) {
    if (!agents.includes(token)) failures.push(`oem identity: AGENTS.md no longer states ${JSON.stringify(token)}; the merge standing order is gone`)
  }
  const brands = read(root, 'brands/README.md')
  for (const token of ['## OEM-owned surfaces', 'pnpm run verify-oem-identity']) {
    if (!brands.includes(token)) failures.push(`oem identity: brands/README.md no longer states ${JSON.stringify(token)}`)
  }
  const sync = read(root, 'FORK_SYNC.md')
  for (const token of ['OEM-owned surface', 'verify-oem-identity', 'ui.sceneSwitcher', 'ui.appStore', 'brand.icon']) {
    if (!sync.includes(token)) failures.push(`oem identity: FORK_SYNC.md no longer states ${JSON.stringify(token)}; the sync playbook lost the OEM merge rule`)
  }
}

/**
 * Verify the OEM brand contract that an upstream merge must preserve.
 * @param root - Repository root; defaults to the checkout holding this script.
 * @returns Every failed surface, and how many files were read.
 */
export function verifyOemIdentity(root: string = resolve(dirname(fileURLToPath(import.meta.url)), '..')): OemIdentityReport {
  const failures: string[] = []
  const shipped = manifest(root, SHIPPED_KEY, failures)
  const other = manifest(root, OTHER_KEY, failures)
  checkShipped(shipped, failures)
  checkSecondBrand(shipped, other, failures)
  checkBrandPorts(root, failures)
  checkDerivation(root, failures)
  checkShell(root, shipped, failures)
  checkDevelopmentLane(root, failures)
  checkIamCallback(root, shipped, failures)
  checkUninstaller(root, failures)
  checkHomeIsolation(shipped, failures)
  checkProductChrome(root, failures)
  checkStartupIcon(root, failures)
  checkMergeInstructions(root, failures)
  return { failures, checked: OEM_OWNED_FILES.length }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = verifyOemIdentity()
  for (const failure of report.failures) console.error(failure)
  if (report.failures.length > 0) {
    console.error(`OEM identity: ${String(report.failures.length)} surface(s) no longer match. `
      + 'Resolve them against brands/README.md ("OEM-owned surfaces") before anchoring an upstream sync.')
    process.exitCode = 1
  }
  else console.log(`OEM identity: ${SHIPPED_KEY} brand intact across ${String(report.checked)} owned surfaces.`)
}
