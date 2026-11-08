import { SHIPPED_LOCALE_IDS } from '../../../scripts/shipped-locales.ts'
import { createRequire } from 'node:module'
/** Per-language installer resources feed both the packaging language list and the NSIS compiler. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { readInstallerLocales, renderInstallerStrings } from '../scripts/installer-locales.mjs'
import { shippedBrand } from '../scripts/brand-manifest.mjs'

/** Display name the packaging run substitutes into every `{brand}` installer string. */
const BRAND_NAME = shippedBrand().displayName

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-installer-locales-'))
  onTestFinished(() => { rmSync(directory, { recursive: true, force: true }) })
  for (const id of ['en_US', 'zh_CN', 'ja_JP', 'es_ES', 'fr_FR', 'de_DE', 'ru_RU', 'pt_BR']) {
    writeFileSync(join(directory, `${id}.json`), readFileSync(new URL(`../installer/locales/${id}.json`, import.meta.url)))
  }
  return directory
}

it('generates Japanese NSIS strings from the same files that select packaged languages', () => {
  const locales = readInstallerLocales()
  expect(locales.map(locale => locale.id)).toEqual(['en_US', 'de_DE', 'es_ES', 'fr_FR', 'ja_JP', 'pt_BR', 'ru_RU', 'zh_CN'])
  const source = renderInstallerStrings(locales, BRAND_NAME)
  expect(source).toContain('LangString INSTALLER_INSTALL ${LANG_JAPANESE} "今すぐインストール"')
  expect(source).toContain('LangString INSTALLER_NATIVE_PROGRESS ${LANG_JAPANESE} "インストールを準備しています… %d%%"')
  expect(source).toContain('!ifdef LANG_JAPANESE\n')
  // One line per translated key, plus the localized application name NSIS chrome reads.
  expect(source.match(/^LangString /gmu)).toHaveLength((Object.keys(locales[0]!.strings).length + 1) * locales.length)
  // Installer copy names the selected brand, never a literal product token.
  expect(source).not.toContain('{brand}')
  expect(source).not.toContain('BirdCoder')
  expect(source).toContain(BRAND_NAME)
  const japanese = locales.filter(locale => locale.id === 'ja_JP')
  expect(renderInstallerStrings(japanese, BRAND_NAME)).not.toContain('${LANG_ENGLISH}')
})

it.each(['en_US', 'zh_CN', 'ja_JP', 'es_ES', 'fr_FR', 'de_DE', 'ru_RU', 'pt_BR'])('rejects a missing %s configuration', (id) => {
  const directory = fixture()
  rmSync(join(directory, `${id}.json`))
  expect(() => readInstallerLocales(directory)).toThrow(`missing ${id}.json`)
})

it.each([
  ['missing key', (resource: ReturnType<typeof readInstallerLocales>[number]) => { delete resource.strings.INSTALLER_INSTALL }, 'keys differ'],
  ['extra key', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_EXTRA = 'extra' }, 'keys differ'],
  ['empty text', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_INSTALL = '' }, 'nonempty text'],
  ['changed placeholder', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_NATIVE_PROGRESS = '%s%%' }, 'format placeholders'],
  ['missing percent escape', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_NATIVE_PROGRESS = '%d%' }, 'format placeholders'],
  ['extra format specifier', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_NATIVE_PROGRESS = '%d%% %q' }, 'format placeholders'],
  ['translated command', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_THEME_ERROR = 'Use /THEME=claro.' }, 'format placeholders'],
  ['duplicate language', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.nsisLanguage = 'ENGLISH' }, 'duplicate NSIS language'],
  ['invisible character', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_INSTALL = 'Install\u200b' }, 'invisible'],
  ['byte-order mark', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.strings.INSTALLER_INSTALL = 'Install\ufeff' }, 'invisible'],
  ['invalid compiler token', (resource: ReturnType<typeof readInstallerLocales>[number]) => { resource.nsisLanguage = 'JA\n!error' }, 'invalid NSIS language'],
])('rejects %s', (_name, mutate, diagnostic) => {
  const directory = fixture()
  const resource = readInstallerLocales(directory).find(locale => locale.id === 'ja_JP')!
  mutate(resource)
  writeFileSync(join(directory, 'ja_JP.json'), JSON.stringify(resource))
  expect(() => readInstallerLocales(directory)).toThrow(diagnostic)
})

it('escapes literal NSIS syntax without changing translated text', () => {
  const locale = readInstallerLocales()[0]!
  expect(renderInstallerStrings([{ ...locale, strings: { INSTALLER_INSTALL: '"$name"\nnext\rline' } }], BRAND_NAME))
    .toContain('"$\\"$$name$\\"$\\nnext$\\rline"')
})

it('resolves the installed application name once per installer language', () => {
  const locales = readInstallerLocales()
  const seen: string[] = []
  const source = renderInstallerStrings(locales, (id) => {
    seen.push(id)
    return `Name-${id}`
  })
  expect(seen).toEqual(locales.map(locale => locale.id))
  for (const locale of locales) {
    expect(source).toContain(`LangString INSTALLER_APP_NAME \${LANG_${locale.nsisLanguage}} "Name-${locale.id}"`)
  }
  // The same per-language value also replaces the `{brand}` copy placeholder.
  expect(source).toContain('Name-zh_CN 正在运行')
  expect(source).not.toContain('{brand}')
})

it('requires a brand display name and substitutes it into every placeholder', () => {
  const locales = readInstallerLocales()
  expect(() => renderInstallerStrings(locales, '')).toThrow(/brand display name/u)
  const source = renderInstallerStrings(locales, BRAND_NAME)
  expect(source.match(new RegExp(BRAND_NAME, 'gu'))?.length ?? 0).toBeGreaterThanOrEqual(24)
})

it('uses the real electron-builder language identifiers and English fallback', () => {
  const require = createRequire(import.meta.url)
  const { LangConfigurator, createAddLangsMacro } = require('app-builder-lib/out/targets/nsis/nsisLang.js') as {
    LangConfigurator: new (options: { installerLanguages: string[] }) => object
    createAddLangsMacro: (generator: { macro: (name: string, lines: string[]) => void }, languages: object) => void
  }
  const locales = readInstallerLocales()
  expect(locales[0]?.id).toBe('en_US')
  expect(locales.map(locale => locale.id.split('_')[0]).sort()).toEqual([...SHIPPED_LOCALE_IDS].sort())
  createAddLangsMacro({ macro: (_name, lines) => {
    expect(lines.map(line => /MUI_LANGUAGE "([^" ]+)"/u.exec(line)?.[1]?.toUpperCase()))
      .toEqual(locales.map(locale => locale.nsisLanguage))
  } }, new LangConfigurator({ installerLanguages: locales.map(locale => locale.id) }))
})
