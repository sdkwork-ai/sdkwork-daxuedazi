/**
 * OEM brand plugin, browser half: reads the page projection the Host's OEM
 * profile published, hands the brand manifest's per-language application names
 * to the locale registry (every shipped dictionary string that spells
 * `BirdCoder` renders the deployment's name from then on), and titles the
 * document with the name of the active interface language. Without an OEM
 * profile the projection is absent and everything stays on the shipped 学伴AI.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  DEFAULT_BRAND_NAME, readOemAppNames, readOemBrandName, readOemEnvironment,
} from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: pulls ctx.locale (the LocaleRuntime) into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'

/** Service required by this plugin: the locale registry that owns translated copy. */
export const inject = ['locale']

/**
 * Apply the page's OEM brand once at boot.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // An OEM profile that renames the product wins in every language; otherwise
  // the brand manifest's name map is the whole internationalization channel.
  const oemName = readOemBrandName()
  const names = oemName === DEFAULT_BRAND_NAME ? readOemAppNames() : undefined
  if (names === undefined) ctx.locale.setBrand(oemName)
  else ctx.locale.setBrandNames(names)

  if (typeof document !== 'undefined') {
    // The shell ships the product name as the document title; keep it in step
    // with the interface language so window titles, tab labels, and task
    // switchers agree after a language switch too.
    const syncTitle = (): void => { document.title = ctx.locale.brandNameFor() }
    ctx.effect(() => {
      syncTitle()
      return ctx.locale.subscribe(syncTitle)
    }, 'oem: document title')
    // Diagnostics for test/dev builds: inspect the resolved tier without
    // opening settings or reading the Host environment.
    const environment = readOemEnvironment()
    if (environment !== undefined) document.documentElement.dataset.dshEnvironment = environment
  }
}
