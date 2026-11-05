/**
 * The installed application identifier belongs to the selected brand.
 *
 * Electron Builder hashes it into the NSIS GUID (`UUID.v5(appId,
 * ELECTRON_BUILDER_NS_UUID)`), and that GUID keys the `InstallLocation` record
 * the next installer reads. A packaging lane that carries another product's
 * identifier therefore installs over that product instead of beside it — the
 * failure mode a stale `packaging/windows.env` or a workflow default produced.
 */

import { expect, it } from 'vitest'
import { resolveBrandApplicationId } from '../scripts/brand-application-id.mjs'

it('defaults to the shipped brand identity', () => {
  expect(resolveBrandApplicationId({})).toBe('com.sdkwork.daxuedazi')
  expect(resolveBrandApplicationId({ DSH_DESKTOP_APP_ID: '  ' })).toBe('com.sdkwork.daxuedazi')
})

it('follows the selected brand', () => {
  expect(resolveBrandApplicationId({ DSH_BRAND: 'birdcoder' })).toBe('com.sdkwork.birdcoder')
})

it('accepts a value that repeats the selected brand', () => {
  expect(resolveBrandApplicationId({ DSH_BRAND: 'birdcoder', DSH_DESKTOP_APP_ID: 'com.sdkwork.birdcoder' }))
    .toBe('com.sdkwork.birdcoder')
})

it('accepts a lane-owned identifier that names no shipped application', () => {
  // The installed-update qualification lanes install an isolated test application.
  expect(resolveBrandApplicationId({ DSH_DESKTOP_APP_ID: 'com.deepseek.dsh.qualification.q1' }))
    .toBe('com.deepseek.dsh.qualification.q1')
})

it('refuses the sibling brand identity, naming both brands and the consequence', () => {
  // Regression: `apps/desktop/packaging/windows.env` carried this value, so every
  // packaged OEM build reused BirdCoder's Windows installer GUID and installed
  // into the existing BirdCoder directory.
  const packaging = { DSH_DESKTOP_APP_ID: 'com.sdkwork.birdcoder' }
  expect(() => resolveBrandApplicationId(packaging)).toThrow(/installed identity of brand "birdcoder"/u)
  expect(() => resolveBrandApplicationId(packaging)).toThrow(/packages brand "daxuedazi"/u)
  expect(() => resolveBrandApplicationId(packaging)).toThrow(/upgrade or remove that other application/u)
  // The value is still valid for the brand it belongs to.
  expect(() => resolveBrandApplicationId({ ...packaging, DSH_BRAND: 'birdcoder' })).not.toThrow()
})

it('refuses the upstream application identity', () => {
  expect(() => resolveBrandApplicationId({ DSH_DESKTOP_APP_ID: 'com.deepseek.harness' }))
    .toThrow(/upstream application/u)
})

it('refuses a malformed identifier instead of passing it to the builder', () => {
  expect(() => resolveBrandApplicationId({ DSH_DESKTOP_APP_ID: 'invalid' })).toThrow(/reverse-DNS/u)
})

it('stops electron-builder from building with another product identity', async () => {
  const { createElectronBuilderConfig } = await import('../scripts/electron-builder-config.mjs')
  expect(() => createElectronBuilderConfig({ DSH_DESKTOP_APP_ID: 'com.sdkwork.birdcoder' }, 'win32', 'x64'))
    .toThrow(/installed identity of brand "birdcoder"/u)
})
