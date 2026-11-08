// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { BootPage } from '../src/boot-page.ts'

afterEach(() => { document.body.innerHTML = '' })

/** The installed application name the shipped brand manifest publishes for every language. */
const SHIPPED_NAME = '学伴AI'

function mount() {
  const el = document.createElement('div')
  document.body.append(el)
  return { el, page: new BootPage(el) }
}

describe('BootPage', () => {
  it('draws the startup lockup before any plugin state arrives', () => {
    const { el } = mount()
    expect(el.firstElementChild?.getAttribute('data-dsh-boot')).toBe('')
    expect(el.querySelector('[data-dsh-boot-logo]')?.getAttribute('src')).toBe('/favicon.png')
    expect(el.textContent).toContain(SHIPPED_NAME)
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Loading plugins…')
    expect(el.firstElementChild?.getAttribute('aria-busy')).toBe('true')
  })

  it('drops a mark that fails to load instead of showing a broken image', () => {
    const { el } = mount()
    const mark = el.querySelector<HTMLImageElement>('[data-dsh-boot-logo]')
    mark?.dispatchEvent(new Event('error'))
    expect(mark?.hidden).toBe(true)
    expect(el.textContent).toContain(SHIPPED_NAME)
  })

  it('keeps loading while entries are active or loading', () => {
    const { el, page } = mount()
    page.setTotal(2)
    const spinner = el.querySelector<HTMLElement>('[data-dsh-boot-spinner]')
    expect(spinner?.style.getPropertyValue('--dsh-boot-arc')).toBe('72deg')
    page.setState('a', 'active')
    expect(spinner?.style.getPropertyValue('--dsh-boot-arc')).toBe('180deg')
    page.setState('b', 'loading')
    expect(el.querySelector('[data-dsh-boot-spinner]')).toBe(spinner)
    page.setState('b', 'active')
    expect(spinner?.style.getPropertyValue('--dsh-boot-arc')).toBe('288deg')
    expect(el.textContent).toContain(SHIPPED_NAME)
    expect(el.textContent).toContain('Loading plugins…')
    expect(el.textContent).not.toContain('Failed to load plugins')
  })

  it('lists failed entries', () => {
    const { el, page } = mount()
    page.setState('@deepseek-ai/dsh-client-ui-layout', 'failed')
    page.setState('ok', 'active')
    page.setState('@deepseek-ai/dsh-client-ui-tool', 'failed')
    expect(el.textContent).toContain('@deepseek-ai/dsh-client-ui-layout')
    expect(el.textContent).toContain('@deepseek-ai/dsh-client-ui-tool')
    expect(el.textContent).not.toContain('ok')
    expect(el.textContent).not.toContain('Loading plugins…')
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Failed to load plugins')
    expect(el.firstElementChild?.getAttribute('aria-busy')).toBe('false')
    expect(el.textContent).toContain(SHIPPED_NAME)
  })

  it('shows the complete sweep report', () => {
    const { el, page } = mount()
    const report = 'web boot: 1 entry did not activate\nx: pending (waiting for service: y)'
    page.fail(report)
    page.setState('a', 'active')
    expect(el.textContent).toContain(report)
    expect(el.textContent).not.toContain('Loading plugins…')
  })

  it('detaches on disposal', () => {
    const { el, page } = mount()
    page.dispose()
    expect(el.childNodes).toHaveLength(0)
  })

  it('renders the name the document published for the browser language', () => {
    // The build injects the brand manifest's map before any plugin loads; the
    // very first frame must already carry the localized name.
    Reflect.set(globalThis, '__DSH_APP_NAMES__', { default: 'Xueban AI', en: 'Xueban AI', 'zh-CN': '学伴AI' })
    const language = Object.getOwnPropertyDescriptor(window.navigator, 'language')
    const languages = Object.getOwnPropertyDescriptor(window.navigator, 'languages')
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'zh-CN' })
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: ['zh-CN'] })
    try {
      const { el } = mount()
      expect(el.textContent).toContain('学伴AI')
      expect(el.textContent).not.toContain('Xueban AI')
    } finally {
      Reflect.deleteProperty(globalThis, '__DSH_APP_NAMES__')
      if (language === undefined) Reflect.deleteProperty(window.navigator, 'language')
      else Object.defineProperty(window.navigator, 'language', language)
      if (languages === undefined) Reflect.deleteProperty(window.navigator, 'languages')
      else Object.defineProperty(window.navigator, 'languages', languages)
    }
  })

  it('falls back to the manifest default for an untranslated browser language', () => {
    Reflect.set(globalThis, '__DSH_APP_NAMES__', { default: '学伴AI', en: 'Xueban AI' })
    const language = Object.getOwnPropertyDescriptor(window.navigator, 'language')
    const languages = Object.getOwnPropertyDescriptor(window.navigator, 'languages')
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'fr-FR' })
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: ['fr-FR'] })
    try {
      expect(mount().el.textContent).toContain('学伴AI')
    } finally {
      Reflect.deleteProperty(globalThis, '__DSH_APP_NAMES__')
      if (language === undefined) Reflect.deleteProperty(window.navigator, 'language')
      else Object.defineProperty(window.navigator, 'language', language)
      if (languages === undefined) Reflect.deleteProperty(window.navigator, 'languages')
      else Object.defineProperty(window.navigator, 'languages', languages)
    }
  })
})
