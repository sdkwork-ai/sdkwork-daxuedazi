/**
 * The reverse-DNS application identifier one packaging run installs under.
 *
 * The brand manifest owns the installed identity, because the identifier is
 * what electron-builder hashes into the NSIS GUID
 * (`UUID.v5(appId, ELECTRON_BUILDER_NS_UUID)`, AGENTS.md → "Windows installer
 * install mode"): the GUID keys the machine-wide `Software\<GUID>\
 * InstallLocation` entry the next installer reads, the uninstall registration,
 * the per-brand PATH ownership and the macOS bundle identifier. Two products
 * that ship one GUID cannot be installed side by side — the second installer
 * treats the first one's directory as its own previous installation, upgrades
 * it in place and registers itself over it.
 *
 * `DSH_DESKTOP_APP_ID` therefore stays only as a lane-owned exception for a
 * packaging run that deliberately installs an isolated test application (the
 * installed-update qualification lanes). A value that names another application
 * this repository ships — or the upstream application — is refused: that is the
 * shape of a stale `packaging/<platform>.env` or a lane default left behind by
 * a previous product, and it silently turns an OEM build into an upgrade of
 * that other product.
 *
 * @module brand-application-id
 */

import { BRAND_DIRECTORY, UPSTREAM_APP_ID, readBrands, resolveBrand } from './brand-manifest.mjs'
import { DESKTOP_APP_ID_ENV } from './desktop-release-environment.mjs'

/** Reverse-DNS grammar the identifier must satisfy. */
const APP_ID_PATTERN = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/u

/**
 * Resolve the application identifier a packaging run must build and install under.
 * @param {Record<string, string | undefined>} environment - Packaging environment; read for `DSH_DESKTOP_APP_ID`, `DSH_BRAND`, `DSH_BRAND_CONFIG`.
 * @param {string} [directory] - Directory holding the repository's `<key>.json` manifests.
 * @returns {string} Identifier to hand electron-builder.
 * @throws {Error} when the configured value is malformed or names another shipped application.
 */
export function resolveBrandApplicationId(environment = process.env, directory = BRAND_DIRECTORY) {
  const brand = resolveBrand(environment, directory)
  const configured = environment[DESKTOP_APP_ID_ENV]?.trim() ?? ''
  if (configured === '') return brand.desktop.appId
  if (!APP_ID_PATTERN.test(configured)) {
    throw new Error(`desktop release environment: ${DESKTOP_APP_ID_ENV} must be a reverse-DNS identifier`)
  }
  const matches = (candidate) => candidate.toLowerCase() === configured.toLowerCase()
  if (matches(brand.desktop.appId)) return configured
  const sibling = readBrands(directory).find(candidate => candidate.key !== brand.key && matches(candidate.desktop.appId))
  if (sibling === undefined && !matches(UPSTREAM_APP_ID)) return configured
  const owner = sibling === undefined
    ? `the upstream application (${UPSTREAM_APP_ID})`
    : `brand ${JSON.stringify(sibling.key)} (${sibling.desktop.appId})`
  throw new Error(`desktop package: ${DESKTOP_APP_ID_ENV} names ${configured}, which is the installed identity of ${owner}; `
    + `this run packages brand ${JSON.stringify(brand.key)} (${brand.desktop.appId}). `
    + 'electron-builder hashes the application identifier into the Windows installer GUID, so this build would upgrade or '
    + 'remove that other application inside its own directory and take over its uninstall registration instead of installing '
    + `beside it. Remove ${DESKTOP_APP_ID_ENV} to use the brand's identity, or package that product by selecting it with DSH_BRAND.`)
}
