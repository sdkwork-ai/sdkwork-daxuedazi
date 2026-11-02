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
import type { DesktopBrand } from '../apps/desktop/scripts/brand-manifest.mjs'

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
})

/** Harness home the shipped brand owns outright. */
const SHIPPED_HOME = Object.freeze({ dirName: '.daxuedazi', adoptLegacyDshHome: false })

/** Identity values two installed brands must never share. */
const SHARED_IDENTITY = ['appId', 'productName', 'executableName', 'protocol', 'commandName', 'registryKey', 'updaterCacheDirName', 'artifactPrefix'] as const

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
  'apps/desktop/scripts/electron-builder-config.mjs',
  'apps/desktop/cli/daxuedazi',
  'apps/desktop/cli/daxuedazi.cmd',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/locale.ts',
  'apps/desktop/installer/uninstall.nsh',
  'packages/host/sdkwork-oem/src/config.ts',
  'packages/client/ui-primitives/src/oem-brand.ts',
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
 * Check the OEM IAM callback keeps the shipped brand's URL scheme.
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

/**
 * Check the merge instructions still point at this inventory and gate.
 * @param root - Repository root.
 * @param failures - Receives every missing contract statement.
 */
function checkMergeInstructions(root: string, failures: string[]): void {
  const agents = read(root, 'AGENTS.md')
  for (const token of [`brands/${SHIPPED_KEY}.json`, 'verify-oem-identity', 'brands/README.md']) {
    if (!agents.includes(token)) failures.push(`oem identity: AGENTS.md no longer states ${JSON.stringify(token)}; the merge standing order is gone`)
  }
  const brands = read(root, 'brands/README.md')
  for (const token of ['## OEM-owned surfaces', 'pnpm run verify-oem-identity']) {
    if (!brands.includes(token)) failures.push(`oem identity: brands/README.md no longer states ${JSON.stringify(token)}`)
  }
  const sync = read(root, 'FORK_SYNC.md')
  for (const token of ['OEM-owned surface', 'verify-oem-identity']) {
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
  checkDerivation(root, failures)
  checkShell(root, shipped, failures)
  checkIamCallback(root, shipped, failures)
  checkUninstaller(root, failures)
  checkHomeIsolation(shipped, failures)
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
