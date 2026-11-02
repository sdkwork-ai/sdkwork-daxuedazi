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

it('fails when the merge instructions point nowhere', () => {
  const root = fixture()
  edit(root, 'FORK_SYNC.md', text => text.replaceAll('verify-oem-identity', 'nothing-here'))
  expect(verifyOemIdentity(root).failures.some(failure => failure.includes('FORK_SYNC.md'))).toBe(true)
})
