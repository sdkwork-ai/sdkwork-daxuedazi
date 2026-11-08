import { SHIPPED_LOCALE_IDS } from '../../../scripts/shipped-locales.ts'
import { describe, expect, it } from 'vitest'
import { BRAND_DISPLAY_LOCALES, DESKTOP_DEFAULT_BRAND, en, formatDesktopMessage, normalizeBrandLocale, resolveDesktopLocale, resolveDesktopStartupLocale, ja, zh, es, fr, de, ru, pt } from '../src/locale.ts'

describe('desktop locale dictionaries', () => {
  it('uses the same concise Chinese configuration error in the toast and details', () => {
    for (const message of [zh.updateConfigurationRead, zh.updateConfigurationFormat, zh.updateConfigurationChannel]) {
      expect(message).toBe('配置文件异常，更新已暂停')
    }
  })

  it('ships baseline and Japanese keys and falls back for unsupported languages', () => {
    expect(Object.keys(zh)).toEqual(Object.keys(en))
    expect(Object.keys(ja)).toEqual(Object.keys(en))
    // The fork's resolver also reports the brand it applied to the copy.
    expect(resolveDesktopLocale('JA-jp')).toEqual({ id: 'ja', brand: DESKTOP_DEFAULT_BRAND, messages: ja })
    expect(resolveDesktopLocale('zh-Hans-CN').messages).toEqual(zh)
    expect(resolveDesktopLocale('en-US').messages).toEqual(en)
    expect(resolveDesktopLocale('it-IT').messages).toEqual(en)
  })

  it.each([
    ['es', 'es-MX', es], ['fr', 'fr-CA', fr], ['de', 'de-DE', de],
    ['ru', 'ru-RU', ru], ['pt', 'pt-BR', pt],
  ] as const)('resolves %s, preserves placeholders, and honors saved preferences', (id, tag, messages) => {
    expect(resolveDesktopLocale(tag.toUpperCase())).toEqual({ id, brand: DESKTOP_DEFAULT_BRAND, messages })
    expect(resolveDesktopStartupLocale(id, ['zh-CN']).id).toBe(id)
    expect(resolveDesktopStartupLocale(null, ['it-IT', tag, 'en-US']).id).toBe(id)
    expect(Object.keys(messages)).toEqual(Object.keys(en))
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const placeholders = (text: string): string[] => (text.match(/\{\w+\}/gu) ?? []).sort()
      expect(placeholders(messages[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it.each(SHIPPED_LOCALE_IDS)('resolves every shipped language %s without fallback', (id) => {
    expect(resolveDesktopLocale(id).id).toBe(id === 'zh' ? 'zh-CN' : id)
    expect(resolveDesktopStartupLocale(null, [id]).id).toBe(id === 'zh' ? 'zh-CN' : id)
  })

  it('formats named values without consuming unknown placeholders', () => {
    expect(formatDesktopMessage('{name}@{version} {missing}', { name: 'plugin', version: '1.2.3' }))
      .toBe('plugin@1.2.3 {missing}')
  })

  it('prefers an explicit supported choice, then the first supported system language', () => {
    expect(resolveDesktopStartupLocale('zh', ['en-US']).id).toBe('zh-CN')
    expect(resolveDesktopStartupLocale('EN', ['zh-CN']).id).toBe('en')
    expect(resolveDesktopStartupLocale(null, ['ja-JP', 'zh-Hant', 'en-US']).id).toBe('ja')
    expect(resolveDesktopStartupLocale(null, ['en-US', 'zh-CN']).id).toBe('en')
    expect(resolveDesktopStartupLocale(null, ['ja-JP']).id).toBe('ja')
    expect(resolveDesktopStartupLocale(null, []).id).toBe('en')
    expect(resolveDesktopStartupLocale('ja', ['zh-CN']).id).toBe('ja')
  })

  it('replaces the shipped brand in every native string without touching other copy', () => {
    const branded = resolveDesktopLocale('en', 'Acme Coder')
    expect(branded.brand).toBe('Acme Coder')
    expect(branded.messages.aboutMenu).toBe('About Acme Coder')
    expect(branded.messages.aboutProduct).toBe('Acme Coder')
    expect(branded.messages.quitTitle).toBe('Quit Acme Coder?')
    expect(branded.messages.welcomeKeyDescription).toBe('Configure official DeepSeek models to start using Acme Coder')
    // The terminal command is build-time identity, not the display brand: with no
    // command argument the copy keeps the shipped command.
    expect(branded.messages.cliCommandMenu).toBe('Manage daxuedazi Command…')
    expect(resolveDesktopStartupLocale('zh', [], 'Acme Coder').messages.aboutMenu).toBe('关于 Acme Coder')
  })

  it('follows the selected brand command so two brands never teach each other\'s command', () => {
    const birdcoder = resolveDesktopLocale('en', 'BirdCoder', 'birdcoder')
    expect(birdcoder.messages.cliCommandMenu).toBe('Manage birdcoder Command…')
    expect(birdcoder.messages.cliCommandNewTerminal).toContain('birdcoder --version')
    expect(birdcoder.messages.cliCommandShadowed).not.toContain('daxuedazi')
    const chinese = resolveDesktopLocale('zh', 'BirdCoder', 'birdcoder')
    expect(chinese.messages.cliCommandMenu).toContain('birdcoder')
    expect(chinese.messages.cliCommandMenu).not.toContain('daxuedazi')
  })

  it('resolves a per-locale application name against the selected dictionary', () => {
    const names = { default: '学伴AI', en: 'Xueban AI', 'zh-CN': '学伴AI', ja: '学伴AI' }
    const english = resolveDesktopLocale('en-US', names)
    expect(english.brand).toBe('Xueban AI')
    expect(english.messages.aboutMenu).toBe('About Xueban AI')
    const chinese = resolveDesktopLocale('zh_CN', names)
    expect(chinese.brand).toBe('学伴AI')
    expect(chinese.messages.aboutMenu).toBe('关于 学伴AI')
    expect(resolveDesktopStartupLocale(null, ['ja-JP'], names).brand).toBe('学伴AI')
    // An untranslated locale falls back to `default`, never to the dictionary token.
    const german = resolveDesktopLocale('de-DE', names)
    expect(german.brand).toBe('学伴AI')
    expect(german.messages.aboutProduct).toBe('学伴AI')
    // A single OEM name still overrides every language.
    expect(resolveDesktopLocale('ja', 'Acme Coder').messages.aboutProduct).toBe('Acme Coder')
  })

  it('normalizes locale tags exactly like the build-time brand manifest', async () => {
    const manifest = await import('../scripts/brand-manifest.mjs')
    expect([...manifest.BRAND_DISPLAY_LOCALES]).toEqual([...BRAND_DISPLAY_LOCALES])
    for (const tag of ['zh-CN', 'zh', 'zh_CN', 'zh-Hans-CN', 'en-US', 'en_US', 'ja_JP', 'pt-BR', 'fr_FR', 'xx-XX', undefined]) {
      expect(normalizeBrandLocale(tag)).toBe(manifest.normalizeBrandLocale(tag))
    }
  })
})
