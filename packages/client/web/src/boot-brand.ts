/**
 * Brand lockup of the framework-free boot page: the product mark above the
 * product name.
 *
 * FORK-OWNED FILE: the boot page itself is upstream-owned and every upstream
 * merge has reverted at least one brand surface, so the fork renders its
 * identity from here (AGENTS.md, "BirdCoder brand assets"). A sync can change
 * how the boot page composes this lockup, but it cannot put the upstream name
 * back on the startup surface.
 * @module @deepseek-ai/dsh-client-web/src/boot-brand
 */
import css from './boot-brand.module.css'

/**
 * Fallback name for a page the brand projection did not reach (an assembled
 * test page, a package consumer, an upstream-shaped build). The startup page
 * paints before client plugins load, so it cannot wait for the OEM profile:
 * `apps/web/vite.config.ts` publishes the selected brand manifest's names into
 * the document instead, and this literal is only the last resort.
 */
const FALLBACK_PRODUCT_NAME = '学伴AI'

/**
 * Page global carrying the per-locale installed application names. Keep in step
 * with `ui-primitives/oem-brand.ts`; this package cannot depend on that one
 * (the boot kernel ships standalone), so both read the same window property.
 */
const APP_NAMES_BOOT_GLOBAL = '__DSH_APP_NAMES__'

/**
 * Mark raster served from the web root: the fork's canonical raster
 * (`apps/web/public/favicon.png`), never a second copy of the artwork, and the
 * same URL the document already requests for its favicon.
 */
const LOGO_URL = '/favicon.png'

/** Rendered mark edge in CSS pixels; the raster is square, so both axes share it. */
const LOGO_SIZE = 72

type AppDisplayNames = Readonly<Record<string, string>>

/** @returns the names the document published, or undefined on a page without the projection. */
function pageAppNames(): AppDisplayNames | undefined {
  const value = (globalThis as Record<string, unknown>)[APP_NAMES_BOOT_GLOBAL]
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as AppDisplayNames
    : undefined
}

/** @returns the browser's preferred language tag, normalized to BCP-47 separators. */
function pageLocale(): string {
  const tag = typeof navigator === 'undefined' ? '' : (navigator.languages?.[0] ?? navigator.language ?? '')
  return tag.toLowerCase().replaceAll('_', '-')
}

/**
 * Resolve the installed application's name for the browser's language.
 *
 * The map comes from `brands/<key>.json` through the built HTML, so a brand that
 * ships a translated name renders it on the very first frame instead of waiting
 * for a plugin. Unknown languages fall back to the manifest's `default`.
 * @returns the localized display name.
 */
export function bootProductName(): string {
  const names = pageAppNames()
  if (names === undefined) return FALLBACK_PRODUCT_NAME
  const language = pageLocale().split('-')[0]
  const key = language === 'zh' ? 'zh-CN' : language
  const value = (key === '' ? undefined : names[key]) ?? names.default
  return typeof value === 'string' && value.trim() !== '' ? value : FALLBACK_PRODUCT_NAME
}

/**
 * Build the startup lockup: the product mark above the product name.
 *
 * The mark is decorative (`alt=""`) so each screen reads one product name
 * instead of a redundant description of the artwork, and a mark that fails to
 * load removes itself rather than leaving a broken-image glyph on the one page
 * that must always look intentional.
 * @returns the lockup element the boot page keeps through every state.
 */
export function createBootBrand(): HTMLDivElement {
  const brand = document.createElement('div')
  brand.className = css.brand

  const mark = document.createElement('img')
  mark.className = css.mark
  mark.src = LOGO_URL
  // Attributes reserve both axes before the stylesheet arrives, so an icon that
  // lands a frame late cannot shift the name and spinner below it.
  mark.width = LOGO_SIZE
  mark.height = LOGO_SIZE
  mark.alt = ''
  mark.decoding = 'async'
  mark.setAttribute('aria-hidden', 'true')
  mark.dataset.dshBootLogo = ''
  mark.addEventListener('error', () => { mark.hidden = true })

  const name = document.createElement('div')
  name.className = css.name
  name.textContent = bootProductName()

  brand.append(mark, name)
  return brand
}
