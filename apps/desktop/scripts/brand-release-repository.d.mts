/**
 * The GitHub repository one brand publishes its desktop releases into.
 *
 * The brand manifest owns the value; a packaging run in another repository is
 * refused rather than shipping an updater that points at another product's
 * releases.
 */

/**
 * Resolve the release repository a packaging run must publish and update from.
 * @param environment - Packaging environment; read for `GITHUB_REPOSITORY`, `DSH_BRAND`, `DSH_BRAND_CONFIG`.
 * @param directory - Directory holding the repository's `<key>.json` manifests.
 * @returns Brand-owned release repository.
 * @throws when the selected brand is packaged outside its own release repository.
 */
export function resolveBrandReleaseRepository(
  environment?: Record<string, string | undefined>,
  directory?: string,
): { owner: string; repo: string; fullName: string }
