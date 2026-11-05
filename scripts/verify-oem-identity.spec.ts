/** OEM identity gate: every mutation must name the surface the merge lost. */

import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { OEM_OWNED_FILES, verifyOemIdentity } from './verify-oem-identity.ts'

const REPOSITORY = resolve(import.meta.dirname, '..')
const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** @returns a checkout-shaped directory holding every OEM-owned surface. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-oem-identity-'))
  roots.push(root)
  for (const file of OEM_OWNED_FILES) {
    const target = join(root, file)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(join(REPOSITORY, file), target)
  }
  return root
}

/**
 * Rewrite one owned surface in a fixture.
 * @param root - Fixture root.
 * @param file - Repository-relative file.
 * @param mutate - Text transform; the result must differ or the case proves nothing.
 */
function edit(root: string, file: string, mutate: (text: string) => string): void {
  const path = join(root, file)
  const text = readFileSync(path, 'utf8')
  const next = mutate(text)
  expect(next, `${file} mutation changed nothing`).not.toBe(text)
  writeFileSync(path, next)
}

it('passes on this checkout, so a green run proves nothing was dropped', () => {
  expect(verifyOemIdentity(REPOSITORY).failures).toEqual([])
})

it('fails when the shipped brand manifest loses an identity value', () => {
  const root = fixture()
  edit(root, 'brands/daxuedazi.json', text => text.replace('"executableName": "daxuedazi"', '"executableName": "birdcoder"'))
  const failures = verifyOemIdentity(root).failures
  expect(failures.some(failure => failure.includes('desktop.executableName'))).toBe(true)
})

it('fails when two brands share an installed identity or a home', () => {
  const root = fixture()
  edit(root, 'brands/birdcoder.json', text => text.replace('"appId": "com.sdkwork.birdcoder"', '"appId": "com.sdkwork.daxuedazi"'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('both brands'))).toBe(true)

  const home = fixture()
  edit(home, 'brands/birdcoder.json', text => text.replace('"dirName": ".birdcoder"', '"dirName": ".daxuedazi"'))
  expect(verifyOemIdentity(home).failures.some(failure => failure.includes('share home.dirName'))).toBe(true)
})

it('fails when the packaged product name stops matching the shipped brand', () => {
  const root = fixture()
  edit(root, 'apps/desktop/package.json', text => text.replace('"productName": "daxuedazi"', '"productName": "BirdCoder"'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('apps/desktop/package.json productName'))).toBe(true)
})

it('fails when a packaging lane stops deriving names from the brand', () => {
  const root = fixture()
  edit(root, 'scripts/release/assemble-github-release.ts', text => text.replaceAll('resolveBrand', 'readBrand'))
  const failures = verifyOemIdentity(root).failures
  expect(failures.some(failure => failure.includes('scripts/release/assemble-github-release.ts'))).toBe(true)
})

it('fails when the OEM IAM callback leaves the shipped brand scheme', () => {
  const root = fixture()
  edit(root, 'packages/host/sdkwork-oem/src/config.ts',
    text => text.replace("DEFAULT_IAM_REDIRECT_URI = 'daxuedazi://auth/callback'", "DEFAULT_IAM_REDIRECT_URI = 'birdcoder://auth/callback'"))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('sdkwork-oem/src/config.ts'))).toBe(true)
})

it('fails when the uninstaller targets another brand data directory', () => {
  const root = fixture()
  edit(root, 'apps/desktop/installer/uninstall.nsh',
    text => text.replace('StrCpy $UnTarget "$APPDATA\\${PRODUCT_NAME}"', 'StrCpy $UnTarget "$APPDATA\\BirdCoder"'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('uninstall.nsh'))).toBe(true)
})

it('fails when a brand may take over the legacy home again', () => {
  const root = fixture()
  edit(root, 'brands/daxuedazi.json', text => text.replace('"adoptLegacyDshHome": false', '"adoptLegacyDshHome": true'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('adoptLegacyDshHome'))).toBe(true)
})

it('fails when two brands claim overlapping port blocks', () => {
  const root = fixture()
  edit(root, 'brands/birdcoder.json', text => text.replace('"webPort": 19387', '"webPort": 19395'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('disjoint blocks'))).toBe(true)
})

it('fails when a brand declares no port at all', () => {
  const root = fixture()
  edit(root, 'brands/birdcoder.json', text => text.replace(',\n    "webPort": 19387', ''))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('desktop.webPort'))).toBe(true)
})

it('fails when the OEM scene chrome loses its hidden defaults or its client gate', () => {
  const defaults = fixture()
  edit(defaults, 'packages/host/sdkwork-oem/src/config.ts',
    text => text.replace('sceneSwitcher: false, skillTags: false', 'sceneSwitcher: true, skillTags: true'))
  expect(verifyOemIdentity(defaults).failures.some(failure => failure.includes('ui.sceneSwitcher'))).toBe(true)

  const gate = fixture()
  edit(gate, 'packages/client/ui-sdkwork-app-modes/src/client/index.ts',
    text => text.replace('if (showSceneSwitcher) {', 'if (true) {'))
  expect(verifyOemIdentity(gate).failures.some(failure => failure.includes('before the OEM gate')
    && failure.includes('ui-sdkwork-app-modes'))).toBe(true)

  const skills = fixture()
  edit(skills, 'packages/client/ui-sdkwork-skills/src/client/index.ts',
    text => text.replace('readOemSkillTags()', 'true'))
  expect(verifyOemIdentity(skills).failures.some(failure => failure.includes('strip switch that renders nothing'))).toBe(true)
})

it('fails when a storefront row loses its hidden default or its sidebar mapping', () => {
  const defaults = fixture()
  edit(defaults, 'packages/host/sdkwork-oem/src/config.ts',
    text => text.replace('appStore: false, templateLibrary: false, demandHall: false',
      'appStore: true, templateLibrary: true, demandHall: true'))
  const droppedDefaults = verifyOemIdentity(defaults).failures
  for (const field of ['ui.appStore', 'ui.templateLibrary', 'ui.demandHall']) {
    expect(droppedDefaults.some(failure => failure.includes(field))).toBe(true)
  }

  const unmapped = fixture()
  edit(unmapped, 'packages/client/ui-sdkwork-sidebar/src/client/layout.ts',
    text => text.replace("{ id: 'sdkwork-template-library', shipsVisible: readOemTemplateLibrary },", ''))
  expect(verifyOemIdentity(unmapped).failures.some(failure => failure.includes('sdkwork-template-library')
    && failure.includes('would show in the sidebar'))).toBe(true)

  const override = fixture()
  edit(override, 'packages/client/ui-sdkwork-sidebar/src/client/layout.ts',
    text => text.replace('readonly shown: readonly string[]', 'readonly ignored: readonly string[]'))
  expect(verifyOemIdentity(override).failures.some(failure => failure.includes('explicitly showed'))).toBe(true)
})

it('fails when the merge instructions drop the product-surface contracts', () => {
  const root = fixture()
  edit(root, 'AGENTS.md', text => text.replace('## OEM scene chrome (merge-stable contract)', '## Something else'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('OEM scene chrome'))).toBe(true)

  const marketplace = fixture()
  edit(marketplace, 'AGENTS.md', text => text.replace('## OEM marketplace surfaces (merge-stable contract)', '## Something else'))
  expect(verifyOemIdentity(marketplace).failures.some(failure => failure.includes('OEM marketplace surfaces'))).toBe(true)

  const brands = fixture()
  edit(brands, 'brands/README.md', text => text.replaceAll('ui.sceneSwitcher', 'ui.somethingElse'))
  expect(verifyOemIdentity(brands).failures.some(failure => failure.includes('brands/README.md'))).toBe(true)
})

it('fails when a merge restores the upstream hero tagline', () => {
  const root = fixture()
  edit(root, 'packages/client/ui-conversation/src/client/locales.ts',
    text => text.replace("'hero.headline': '帮助大学生成长与实现梦想'", "'hero.headline': '探索未至之境'"))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('shipped zh hero line'))).toBe(true)
})

it('fails when the startup icon wiring or raster disappears', () => {
  const wiring = fixture()
  edit(wiring, 'apps/desktop/src/main.ts', text => text.replace('app.dock?.setIcon(startupIcon)', ''))
  expect(verifyOemIdentity(wiring).failures.some(failure => failure.includes('Dock or Windows taskbar'))).toBe(true)

  const reader = fixture()
  edit(reader, 'apps/desktop/src/app-icon.ts', text => text.replace('export function resolveApplicationIcon', 'function resolveApplicationIcon'))
  expect(verifyOemIdentity(reader).failures.some(failure => failure.includes('resolveApplicationIcon'))).toBe(true)

  const raster = fixture()
  rmSync(join(raster, 'apps/desktop/build/icon.ico'))
  expect(verifyOemIdentity(raster).failures.some(failure => failure.includes('build/icon.ico'))).toBe(true)
})

it('fails when the OEM profile tries to select another startup icon', () => {
  const root = fixture()
  edit(root, 'packages/host/sdkwork-oem/src/config.ts',
    text => text.replace('if (source.icon !== undefined) {', 'if (false) {'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('rejects a profile-supplied startup icon'))).toBe(true)
})

it('fails when the merge instructions point nowhere', () => {
  const root = fixture()
  edit(root, 'FORK_SYNC.md', text => text.replaceAll('verify-oem-identity', 'nothing-here'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('FORK_SYNC.md'))).toBe(true)
})
