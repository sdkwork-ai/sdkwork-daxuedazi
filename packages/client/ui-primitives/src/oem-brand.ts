/**
 * Page-bootstrap OEM values shared by every fork surface: the display brand and
 * the SDKWork IAM app-api origin. The Host's OEM profile plugin publishes them
 * through the Web index injection; a page without that injection (tests,
 * upstream builds, an OEM-free deployment) keeps the shipped defaults. This is
 * immutable page-init data, not shared mutable state.
 *
 * @module @deepseek-ai/dsh-client-ui-primitives/oem-brand
 */

/** Page global carrying the Host-published OEM display brand. */
export const OEM_BOOT_GLOBAL = '__DSH_OEM__'
/** Page global carrying the brand manifest's per-locale installed application names. */
export const APP_NAMES_BOOT_GLOBAL = '__DSH_APP_NAMES__'
/** Brand rendered when the page carries no OEM projection. Keep in step with the Host's `DEFAULT_BRAND_NAME`. */
export const DEFAULT_BRAND_NAME = '学伴AI'
/** SDKWork IAM app-api origin shipped when the page carries no OEM projection. */
export const DEFAULT_IAM_BASE_URL = 'https://api.birdcoder.com'
/** Hosted SDKWork IAM authorization origin shipped when the page carries no OEM projection. */
export const DEFAULT_IAM_AUTHORIZE_BASE_URL = 'https://platform.birdcoder.com'
/** OAuth client the desktop browser login presents when the page carries no OEM projection: the shipped brand's deep-link scheme. */
export const DEFAULT_IAM_CLIENT_ID = 'daxuedazi'
/** Deep-link callback the hosted IAM login returns through when the page carries no OEM projection. */
export const DEFAULT_IAM_REDIRECT_URI = 'daxuedazi://auth/callback'

/** Lower-case OAuth public-client ids; mirrors the Host profile validator. */
const IAM_CLIENT_ID_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/u

/** Lifecycle the page projection carries. */
export type OemPageEnvironment = 'development' | 'testing' | 'staging' | 'production'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read the brand name from one page projection.
 * @param source - projection value; defaults to the page global.
 * @returns the validated brand name, or the shipped default.
 */
export function readOemBrandName(source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL]): string {
  if (!record(source)) return DEFAULT_BRAND_NAME
  const brand = source.brand
  if (!record(brand)) return DEFAULT_BRAND_NAME
  const name = brand.name
  if (typeof name !== 'string') return DEFAULT_BRAND_NAME
  const text = name.trim()
  if (text === '' || text.length > 64 || /[\u0000-\u001f\u007f]/u.test(text)) return DEFAULT_BRAND_NAME
  return text
}

/**
 * Resolve the installed application's display name for one browser language.
 *
 * The name map is published into the document by `apps/web/vite.config.ts` from
 * `brands/<key>.json`, so the same localized name reaches the framework-free
 * boot page, the wordmark, the document title and every dictionary string. A
 * deployment whose OEM profile actually renames the product keeps that name in
 * every language, preserving the OEM override.
 * @param locale - Browser language tag; defaults to the browser's preferred language.
 * @returns the localized display name, or the shipped name without a projection.
 */
export function readOemBrandNameForLocale(locale: string | undefined = browserLocale()): string {
  const oem = readOemBrandName()
  if (oem !== DEFAULT_BRAND_NAME) return oem
  const projected = (globalThis as Record<string, unknown>)[APP_NAMES_BOOT_GLOBAL]
  if (!record(projected)) return oem
  const language = (locale ?? '').toLowerCase().replaceAll('_', '-').split('-')[0]
  const key = language === 'zh' ? 'zh-CN' : language
  const value = (key === '' ? undefined : projected[key]) ?? projected.default
  return typeof value === 'string' && value.trim() !== '' && value.length <= 64
    && !/[\u0000-\u001f\u007f]/u.test(value) ? value : oem
}

/** @returns the browser's preferred language tag, or undefined outside a browser. */
export function browserLocale(): string | undefined {
  if (typeof navigator === 'undefined') return undefined
  const tag = navigator.languages?.[0] ?? navigator.language
  return typeof tag === 'string' && tag !== '' ? tag : undefined
}

/**
 * Read the per-locale installed application names the document published.
 *
 * The locale registry hands this map to every surface that spells the product
 * name, so switching the interface language also switches the name. An entry
 * with a malformed tag or name is dropped rather than rendering a broken label;
 * a page without the projection returns undefined and keeps the single brand.
 * @param source - projection value; defaults to the page global.
 * @returns locale → name, keyed by lower-case BCP 47 tags; undefined when absent.
 */
export function readOemAppNames(
  source: unknown = (globalThis as Record<string, unknown>)[APP_NAMES_BOOT_GLOBAL],
): Readonly<Record<string, string>> | undefined {
  if (!record(source)) return undefined
  const names: Record<string, string> = {}
  for (const [locale, value] of Object.entries(source)) {
    const tag = locale.trim().toLowerCase().replaceAll('_', '-')
    if (tag !== 'default' && (tag === '' || !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/u.test(tag))) continue
    if (typeof value !== 'string') continue
    const name = value.trim()
    if (name === '' || name.length > 64 || /[\u0000-\u001f\u007f]/u.test(name)) continue
    names[tag] = name
  }
  return Object.keys(names).length === 0 ? undefined : Object.freeze(names)
}

/**
 * Read whether the login surfaces offer the "Add API Key" entry.
 * @param source - projection value; defaults to the page global.
 * @returns true only when the deployment explicitly asks for the fallback.
 */
export function readOemShowApiKeyEntry(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  if (!record(source)) return false
  const brand = source.brand
  if (!record(brand)) return false
  return brand.showApiKeyEntry === true
}

/**
 * Read whether the deployment renders the new-session scene switcher.
 * @param source - projection value; defaults to the page global.
 * @returns false only when the deployment turned the switcher off; a page
 *   without the OEM projection keeps the fork's developer chrome.
 */
export function readOemSceneSwitcher(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  return readOemChromeFlag(source, 'sceneSwitcher')
}

/**
 * Read whether the deployment renders the staged scene's skill-tag strip.
 * @param source - projection value; defaults to the page global.
 * @returns false only when the deployment turned the strip off; a page
 *   without the OEM projection keeps the fork's developer chrome.
 */
export function readOemSkillTags(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  return readOemChromeFlag(source, 'skillTags')
}

/**
 * Read whether the deployment ships the App Store's sidebar quick entry
 * visible by default.
 * @param source - projection value; defaults to the page global.
 * @returns false only when the deployment ships the row hidden (the user's own
 *   switch still applies); a page without the OEM projection ships it visible.
 */
export function readOemAppStore(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  return readOemChromeFlag(source, 'appStore')
}

/**
 * Read whether the deployment ships the template library's sidebar quick entry
 * visible by default.
 * @param source - projection value; defaults to the page global.
 * @returns false only when the deployment ships the row hidden (the user's own
 *   switch still applies); a page without the OEM projection ships it visible.
 */
export function readOemTemplateLibrary(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  return readOemChromeFlag(source, 'templateLibrary')
}

/**
 * Read whether the deployment ships the demand hall's sidebar quick entry
 * visible by default.
 * @param source - projection value; defaults to the page global.
 * @returns false only when the deployment ships the row hidden (the user's own
 *   switch still applies); a page without the OEM projection ships it visible.
 */
export function readOemDemandHall(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): boolean {
  return readOemChromeFlag(source, 'demandHall')
}

/** The `ui` fields one deployment profile can turn off. */
type OemChromeFlag = 'sceneSwitcher' | 'skillTags' | 'appStore' | 'templateLibrary' | 'demandHall'

function readOemChromeFlag(source: unknown, field: OemChromeFlag): boolean {
  if (!record(source)) return true
  const ui = source.ui
  if (!record(ui)) return true
  return ui[field] !== false
}

/**
 * Read the SDKWork IAM app-api origin from one page projection.
 * @param source - projection value; defaults to the page global.
 * @returns the validated origin, or undefined when the page carries none.
 */
export function readOemIamBaseUrl(source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL]): string | undefined {
  return readOemSdkworkOrigin(source, 'iamBaseUrl')
}

/**
 * Read the hosted SDKWork IAM authorization origin from one page projection.
 * @param source - projection value; defaults to the page global.
 * @returns the validated origin, or undefined when the page carries none.
 */
export function readOemIamAuthorizeBaseUrl(source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL]): string | undefined {
  return readOemSdkworkOrigin(source, 'iamAuthorizeBaseUrl')
}

/**
 * Read the OAuth client id the desktop browser login presents.
 * @param source - projection value; defaults to the page global.
 * @returns the validated client id, or undefined when the page carries none.
 */
export function readOemIamClientId(source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL]): string | undefined {
  if (!record(source)) return undefined
  const sdkwork = source.sdkwork
  if (!record(sdkwork)) return undefined
  const value = sdkwork.iamClientId
  return typeof value === 'string' && IAM_CLIENT_ID_PATTERN.test(value.trim()) ? value.trim() : undefined
}

/**
 * Read the registered deep-link callback the hosted IAM login returns through.
 * @param source - projection value; defaults to the page global.
 * @returns the validated custom-scheme URI, or undefined when the page carries none.
 */
export function readOemIamRedirectUri(source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL]): string | undefined {
  if (!record(source)) return undefined
  const sdkwork = source.sdkwork
  if (!record(sdkwork)) return undefined
  const value = sdkwork.iamRedirectUri
  if (typeof value !== 'string') return undefined
  let url: URL
  try { url = new URL(value.trim()) } catch { return undefined }
  const text = value.trim()
  if (url.protocol === 'http:' || url.protocol === 'https:') return undefined
  if (url.host === '' || url.username || url.password || url.search || url.hash) return undefined
  return text
}

/**
 * Read the resolved lifecycle from one page projection.
 * @param source - projection value; defaults to the page global.
 * @returns the validated lifecycle, or undefined when the page carries none.
 */
export function readOemEnvironment(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): OemPageEnvironment | undefined {
  if (!record(source)) return undefined
  const value = source.environment
  return value === 'development' || value === 'testing' || value === 'staging' || value === 'production'
    ? value
    : undefined
}

function readOemSdkworkOrigin(source: unknown, field: 'iamBaseUrl' | 'iamAuthorizeBaseUrl'): string | undefined {
  if (!record(source)) return undefined
  const sdkwork = source.sdkwork
  if (!record(sdkwork)) return undefined
  const value = sdkwork[field]
  if (typeof value !== 'string') return undefined
  let url: URL
  try { url = new URL(value) } catch { return undefined }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) return undefined
  return url.origin
}
