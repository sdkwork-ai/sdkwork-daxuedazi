/**
 * OEM brand manifest: one JSON file per application brand, shared by the
 * packaging scripts and the Electron shell.
 *
 * Precedence: `DSH_BRAND_CONFIG` (an explicit manifest path) wins, then
 * `DSH_BRAND` (a key under `brands/`), then `daxuedazi`.
 */

/** Environment variable naming one brand key under `brands/`. */
export const BRAND_ENV: 'DSH_BRAND'

/** Environment variable naming an explicit brand manifest path. */
export const BRAND_CONFIG_ENV: 'DSH_BRAND_CONFIG'

/** File name a packaged application carries its brand manifest under, inside `resources/`. */
export const BRAND_FILENAME: 'brand.json'

/** Brand shipped without a selection. */
export const DEFAULT_BRAND_KEY: 'daxuedazi'

/** Directory holding the repository's brand manifests. */
export const BRAND_DIRECTORY: string

/** Reverse-DNS application identifier the upstream application owns; no brand may take it. */
export const UPSTREAM_APP_ID: string

/**
 * Loopback ports one brand owns, starting at `desktop.webPort`: the packaged shell
 * serves the first, the two source lanes the next two, and each lane's main,
 * renderer and Host inspectors the remaining six.
 */
export const BRAND_PORT_BLOCK: 9

/** Locale keys a brand's localized application name may declare, plus the `default` fallback key. */
export const BRAND_DISPLAY_LOCALES: readonly string[]

/**
 * Localized application display names. `parseBrandManifest()` fills every
 * {@link BRAND_DISPLAY_LOCALES} key plus `default`, so callers index it directly.
 */
export type BrandDisplayNames = Readonly<Record<string, string>>

/**
 * Normalize an OS, Electron or installer locale tag to a shipped brand locale.
 * @param locale - BCP-47-ish tag or installer locale id.
 * @returns A `BRAND_DISPLAY_LOCALES` key, or undefined when unsupported.
 */
export function normalizeBrandLocale(locale: unknown): string | undefined

/**
 * Validate and complete a brand's localized application names.
 * @param raw - `displayNames` section, or undefined.
 * @param fallback - Locale-independent `displayName`.
 * @param source - File or label named in validation errors.
 * @returns Frozen, complete map.
 */
export function parseBrandDisplayNames(raw: unknown, fallback: string, source?: string): BrandDisplayNames

/**
 * Resolve the installed application's display name for one locale.
 * @param brand - Validated manifest, or its name map.
 * @param locale - OS/Electron/installer locale tag.
 * @returns Localized application name; display copy only, never an identity or path.
 */
export function resolveBrandDisplayName(brand: DesktopBrand | BrandDisplayNames, locale: string | undefined): string

/** Harness home and legacy-adoption behavior of one brand. */
export interface DesktopBrandHome {
  /** Directory name under the operating-system home; dot-prefixed and lower case so two brands cannot collide. */
  readonly dirName: string
  /** Whether a first launch may take over the legacy `~/.dsh` data. */
  readonly adoptLegacyDshHome: boolean
}

/** Desktop application identity of one brand. */
export interface DesktopBrandDesktop {
  /** Reverse-DNS application identifier packaging falls back to when `DSH_DESKTOP_APP_ID` is unset. */
  readonly appId: string
  /** GitHub `owner/repo` that publishes this brand's releases; the packaged updater reads `latest.yml` from it. */
  readonly releaseRepository: string
  /** Electron product name; names userData, the single-instance lock and the logs directory. */
  readonly productName: string
  /** Installed executable (and macOS `MacOS/<name>`) every launcher names. */
  readonly executableName: string
  /** Custom URL scheme the installed shell registers. */
  readonly protocol: string
  /** Desktop command the installed launchers answer to. */
  readonly commandName: string
  /** Windows PATH-ownership registry key and mutex stem. */
  readonly registryKey: string
  /** electron-updater cache directory the packaged shell owns. */
  readonly updaterCacheDirName: string
  /** Release artifact stem before `-<version>-<os>-<arch>`. */
  readonly artifactPrefix: string
  /** First of the {@link BRAND_PORT_BLOCK} loopback ports this brand owns: the packaged shell serves it, the source lanes and their inspectors take the rest. */
  readonly webPort: number
}

/** One validated brand manifest. */
export interface DesktopBrand {
  readonly schemaVersion: 1
  readonly key: string
  /** Locale-independent fallback display name; keep for callers that have no locale. */
  readonly displayName: string
  /** Installed application name per shipped locale, plus `default`. */
  readonly displayNames: BrandDisplayNames
  readonly companyName: string
  readonly home: DesktopBrandHome
  readonly desktop: DesktopBrandDesktop
}

/**
 * Resolve the manifest path a launch or packaging run selects.
 * @param env - Launch or packaging environment.
 * @param directory - Directory holding `<key>.json` manifests; defaults to the repository's `brands/`.
 * @returns Absolute manifest path.
 */
export function brandManifestPath(env: Record<string, string | undefined>, directory?: string): string

/**
 * Validate one parsed brand manifest and detach it from the caller's object.
 * @param raw - Parsed JSON value.
 * @param source - File or label named in validation errors.
 * @returns Frozen, normalized manifest.
 * @throws Error when a field is missing or malformed.
 */
export function parseBrandManifest(raw: unknown, source?: string): DesktopBrand

/**
 * Read and validate one brand manifest file.
 * @param filename - Absolute manifest path.
 * @returns Frozen manifest.
 * @throws Error when the file cannot be read, parsed or validated.
 */
export function readBrandManifest(filename: string): DesktopBrand

/**
 * Resolve the brand one launch or packaging run selects.
 * @param env - Launch or packaging environment.
 * @param directory - Directory holding `<key>.json` manifests; defaults to the repository's `brands/`.
 * @returns Frozen manifest.
 */
export function resolveBrand(env?: Record<string, string | undefined>, directory?: string): DesktopBrand

/**
 * The repository's shipped brand, read once.
 * @returns Frozen manifest of `brands/daxuedazi.json`.
 */
export function shippedBrand(): DesktopBrand

/**
 * Read every brand manifest in one directory.
 * @param directory - Directory holding `<key>.json` manifests; defaults to the repository's `brands/`.
 * @returns Manifests sorted by file name; `<key>.oem.json` profiles are skipped.
 * @throws Error when a manifest cannot be read, parsed or validated.
 */
export function readBrands(directory?: string): DesktopBrand[]

/**
 * Port blocks two brands would contend for.
 * @param brands - Manifests that end up installed on one machine.
 * @returns One message per colliding pair, naming both blocks.
 */
export function brandPortCollisions(brands: readonly DesktopBrand[]): string[]
