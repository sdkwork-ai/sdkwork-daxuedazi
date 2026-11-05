/**
 * The GitHub repository one brand publishes its desktop releases into.
 *
 * electron-updater reads `latest.yml` from the repository named in the packaged
 * `app-update.yml`, and a repository has exactly one `latest` pointer. Two
 * brands that name one repository therefore share one update stream: the newer
 * release of either product is offered to both, and installing it replaces the
 * other product. The brand manifest owns the value so a packaged shell can never
 * point at another product's releases — the constant this replaces named the
 * BirdCoder repository for every brand, which is how an OEM build picked up a
 * BirdCoder update.
 *
 * A lane that builds a brand in its release repository gets the same value from
 * both sides; a lane that builds it anywhere else is refused, because artifacts
 * assembled there could never be published where the packaged updater looks.
 *
 * @module brand-release-repository
 */

import { BRAND_DIRECTORY, resolveBrand } from './brand-manifest.mjs'

/** Environment variable Actions sets to the `owner/repo` running the workflow. */
export const GITHUB_REPOSITORY_ENV = 'GITHUB_REPOSITORY'

/** Reverse shape of the `owner/repo` pair a brand declares. */
const REPOSITORY_PATTERN = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/u

/**
 * Split one `owner/repo` value.
 * @param {string} value - Repository identity.
 * @returns {{ owner: string, repo: string, fullName: string }} Parsed identity.
 * @throws {Error} when the value is not an `owner/repo` pair.
 */
function parseRepository(value) {
  const match = REPOSITORY_PATTERN.exec(value)
  if (match === null) throw new Error(`desktop release repository: ${JSON.stringify(value)} is not a GitHub owner/repo pair`)
  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` }
}

/**
 * Resolve the release repository a packaging run must publish and update from.
 * @param {Record<string, string | undefined>} environment - Packaging environment; read for `GITHUB_REPOSITORY`, `DSH_BRAND`, `DSH_BRAND_CONFIG`.
 * @param {string} [directory] - Directory holding the repository's `<key>.json` manifests.
 * @returns {{ owner: string, repo: string, fullName: string }} Brand-owned release repository.
 * @throws {Error} when the selected brand is packaged outside its own release repository.
 */
export function resolveBrandReleaseRepository(environment = process.env, directory = BRAND_DIRECTORY) {
  const brand = resolveBrand(environment, directory)
  const declared = parseRepository(brand.desktop.releaseRepository)
  const running = environment[GITHUB_REPOSITORY_ENV]?.trim() ?? ''
  if (running === '') return declared
  const actual = parseRepository(running)
  if (actual.fullName.toLowerCase() !== declared.fullName.toLowerCase()) {
    throw new Error(`desktop package: brand ${JSON.stringify(brand.key)} publishes its releases from ${declared.fullName}, `
      + `but this run packages it in ${actual.fullName}. The packaged updater reads latest.yml from the brand's repository, so a build `
      + 'assembled here could never be published where the installed application looks for updates. Package the brand in its own '
      + 'repository, or change desktop.releaseRepository in its manifest if this repository is now its release home.')
  }
  return declared
}
