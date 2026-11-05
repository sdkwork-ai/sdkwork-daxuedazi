/**
 * The reverse-DNS application identifier one packaging run installs under.
 *
 * The selected brand manifest owns it; `DSH_DESKTOP_APP_ID` survives only as a
 * lane-owned exception and may not name another application this repository
 * ships or the upstream application.
 */

/**
 * Resolve the application identifier a packaging run must build and install under.
 * @param environment - Packaging environment; read for `DSH_DESKTOP_APP_ID`, `DSH_BRAND`, `DSH_BRAND_CONFIG`.
 * @param directory - Directory holding the repository's `<key>.json` manifests.
 * @returns Identifier to hand electron-builder.
 * @throws when the configured value is malformed or names another shipped application.
 */
export function resolveBrandApplicationId(environment?: Record<string, string | undefined>, directory?: string): string
