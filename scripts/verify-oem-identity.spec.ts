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

it('fails when a container release asset is named with a foreign stem', () => {
  const packer = fixture()
  edit(packer, 'scripts/release/pack-container.ts',
    text => text.replace('containerBundleArchive(releaseVersion)', '`birdcoder-container-${releaseVersion}.tar.gz`'))
  expect(verifyOemIdentity(packer).failures.some(failure => failure.includes('scripts/release/pack-container.ts'))).toBe(true)

  const workflow = fixture()
  edit(workflow, '.github/workflows/container-release.yml',
    text => text.replace('${ARTIFACT_PREFIX}-container-${RELEASE_VERSION}.tar.gz', 'birdcoder-container-${RELEASE_VERSION}.tar.gz'))
  expect(verifyOemIdentity(workflow).failures.some(failure => failure.includes('hardcoded upstream stem'))).toBe(true)
})

it('fails when a packaging surface pins another product identity', () => {
  const lane = fixture()
  edit(lane, '.github/workflows/desktop-package-target.yml',
    text => text.replace('env:\n', 'env:\n  DSH_DESKTOP_APP_ID: com.sdkwork.birdcoder\n'))
  expect(verifyOemIdentity(lane).failures.some(failure => failure.includes('.github/workflows/desktop-package-target.yml')
    && failure.includes('DSH_DESKTOP_APP_ID'))).toBe(true)

  const template = fixture()
  edit(template, 'apps/desktop/packaging/windows.env.example',
    text => `DSH_DESKTOP_APP_ID=com.sdkwork.birdcoder\n${text}`)
  expect(verifyOemIdentity(template).failures.some(failure => failure.includes('packaging/windows.env.example'))).toBe(true)

  const derivation = fixture()
  edit(derivation, 'apps/desktop/scripts/electron-builder-config.mjs',
    text => text.replace('resolveBrandApplicationId(env)', 'resolveDesktopAppId(env)'))
  expect(verifyOemIdentity(derivation).failures.some(failure => failure.includes('resolveBrandApplicationId'))).toBe(true)

  const feed = fixture()
  edit(feed, 'apps/desktop/scripts/electron-builder-config.mjs',
    text => text.replace('resolveBrandReleaseRepository(env)', "{ owner: 'sdkwork-ai', repo: 'sdkwork-birdcoder2' }"))
  expect(verifyOemIdentity(feed).failures.some(failure => failure.includes('resolveBrandReleaseRepository'))).toBe(true)
})

it('fails when a brand-derived surface stops following the manifest', () => {
  const workflow = fixture()
  edit(workflow, 'agent.workflow.json', text => text.replace('"artifactPrefix": "daxuedazi"', '"artifactPrefix": "sdkwork-birdcoder2"'))
  expect(verifyOemIdentity(workflow).failures.some(failure => failure.includes('agent.workflow.json release.artifactPrefix'))).toBe(true)

  const store = fixture()
  edit(store, 'agent.app.config.json', text => text.replace('"desktopAppId": "com.sdkwork.daxuedazi"', '"desktopAppId": "com.sdkwork.birdcoder.desktop"'))
  expect(verifyOemIdentity(store).failures.some(failure => failure.includes('desktopAppId'))).toBe(true)

  const locale = fixture()
  edit(locale, 'apps/desktop/installer/locales/en_US.json', text => text.replace('{brand}', 'BirdCoder'))
  const localeFailures = verifyOemIdentity(locale).failures
  expect(localeFailures.some(failure => failure.includes('en_US.json') && failure.includes('{brand}'))).toBe(true)

  const guide = fixture()
  edit(guide, 'INSTALL.md', text => `${text}\nSee https://github.com/sdkwork-ai/sdkwork-birdcoder2/releases.\n`)
  expect(verifyOemIdentity(guide).failures.some(failure => failure.includes('INSTALL.md'))).toBe(true)

  const profile = fixture()
  rmSync(join(profile, 'brands/birdcoder.oem.json'))
  expect(verifyOemIdentity(profile).failures.some(failure => failure.includes('birdcoder.oem.json'))).toBe(true)

  const scheme = fixture()
  edit(scheme, 'brands/birdcoder.oem.json', text => text.replace('"birdcoder://auth/callback"', '"daxuedazi://auth/callback"'))
  expect(verifyOemIdentity(scheme).failures.some(failure => failure.includes('iamRedirectUri'))).toBe(true)

  const port = fixture()
  edit(port, 'apps/desktop-host/src/web-port.ts', text => text.replace('export const DESKTOP_HOST_WEB_PORT_ENV', 'export const DESKTOP_HOST_DEFAULT_WEB_PORT = 19387\nexport const DESKTOP_HOST_WEB_PORT_ENV'))
  expect(verifyOemIdentity(port).failures.some(failure => failure.includes('fixed default Web port'))).toBe(true)

  const command = fixture()
  edit(command, 'apps/desktop/src/locale.ts', text => text.replaceAll('DESKTOP_DEFAULT_COMMAND', 'DESKTOP_SHIPPED_COMMAND'))
  expect(verifyOemIdentity(command).failures.some(failure => failure.includes('brand command'))).toBe(true)

  const application = fixture()
  edit(application, 'agent.app.config.json', text => text.replace('"appId": "sdkwork-birdcoder2"', '"appId": "sdkwork-birdcoder"'))
  expect(verifyOemIdentity(application).failures.some(failure => failure.includes('splits one application') || failure.includes('application code'))).toBe(true)
})

it('fails when the OEM IAM callback leaves the shipped brand scheme', () => {
  const root = fixture()
  edit(root, 'packages/host/sdkwork-oem/src/config.ts',
    text => text.replace("DEFAULT_IAM_REDIRECT_URI = 'daxuedazi://auth/callback'", "DEFAULT_IAM_REDIRECT_URI = 'birdcoder://auth/callback'"))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('sdkwork-oem/src/config.ts'))).toBe(true)
})

it('fails when the OEM IAM client stops naming the shipped brand', () => {
  const root = fixture()
  edit(root, 'packages/client/ui-primitives/src/oem-brand.ts',
    text => text.replace("DEFAULT_IAM_CLIENT_ID = 'daxuedazi'", "DEFAULT_IAM_CLIENT_ID = 'birdcoder'"))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('OAuth client'))).toBe(true)
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
