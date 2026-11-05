/**
 * Two OEM brands must never collide when installed side by side.
 *
 * The pair checked here is every brand this repository ships, not only the
 * shipped one: two installed applications that share an app id inherit each
 * other's install directory and uninstall entry, a shared home or userData
 * directory mixes credentials and sessions, a shared protocol or command
 * silently replaces the other product's handler, and an overlapping port block
 * makes the second launch fail with `EADDRINUSE`.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { BRAND_DIRECTORY, brandPortCollisions, readBrands, shippedBrand } from '../scripts/brand-manifest.mjs'

/** Every installed identity field two brands cannot share. */
const IDENTITY_FIELDS = [
  'appId',
  'releaseRepository',
  'productName',
  'executableName',
  'protocol',
  'commandName',
  'registryKey',
  'updaterCacheDirName',
  'artifactPrefix',
  'webPort',
] as const

it('gives every shipped brand a disjoint installed identity', () => {
  const brands = readBrands(BRAND_DIRECTORY)
  expect(brands.length).toBeGreaterThan(1)
  for (const [index, first] of brands.entries()) {
    for (const second of brands.slice(index + 1)) {
      for (const field of IDENTITY_FIELDS) {
        expect(first.desktop[field], `${first.key} vs ${second.key}: desktop.${field}`).not.toBe(second.desktop[field])
      }
      expect(first.home.dirName, `${first.key} vs ${second.key}: home.dirName`).not.toBe(second.home.dirName)
      expect(brandPortCollisions([first, second]), `${first.key} vs ${second.key}: port blocks`).toEqual([])
    }
  }
})

it('ships an OEM profile that keeps a second brand out of the shipped copy and callback', () => {
  const shipped = shippedBrand()
  for (const brand of readBrands(BRAND_DIRECTORY)) {
    if (brand.key === shipped.key) continue
    const profile = JSON.parse(readFileSync(join(BRAND_DIRECTORY, `${brand.key}.oem.json`), 'utf8')) as {
      brand?: { name?: unknown }
      sdkwork?: { iamRedirectUri?: unknown }
    }
    expect(profile.brand?.name).toBe(brand.displayName)
    expect(profile.brand?.name).not.toBe(shipped.displayName)
    expect(profile.sdkwork?.iamRedirectUri).toBe(`${brand.desktop.protocol}://auth/callback`)
    expect(profile.sdkwork?.iamRedirectUri).not.toBe(`${shipped.desktop.protocol}://auth/callback`)
  }
})
