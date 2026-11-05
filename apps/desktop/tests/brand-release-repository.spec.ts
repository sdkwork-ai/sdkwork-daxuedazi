/**
 * The packaged updater reads `latest.yml` from the brand's own release repository.
 *
 * A repository has one `latest` pointer, so a build that names another product's
 * repository — the BirdCoder constant this replaced — offers that product's
 * release as an update and replaces the installed application with it.
 */

import { expect, it } from 'vitest'
import { readBrands } from '../scripts/brand-manifest.mjs'
import { resolveBrandReleaseRepository } from '../scripts/brand-release-repository.mjs'

it('defaults to the shipped brand release repository', () => {
  expect(resolveBrandReleaseRepository({})).toEqual({ owner: 'sdkwork-ai', repo: 'sdkwork-daxuedazi', fullName: 'sdkwork-ai/sdkwork-daxuedazi' })
})

it('follows the selected brand instead of a product constant', () => {
  expect(resolveBrandReleaseRepository({ DSH_BRAND: 'birdcoder' }).fullName).toBe('sdkwork-ai/sdkwork-birdcoder2')
})

it('accepts the repository running the packaging lane when it is the brand home', () => {
  expect(resolveBrandReleaseRepository({ GITHUB_REPOSITORY: 'sdkwork-ai/sdkwork-daxuedazi' }).fullName)
    .toBe('sdkwork-ai/sdkwork-daxuedazi')
  // GitHub repository names are case-insensitive.
  expect(resolveBrandReleaseRepository({ GITHUB_REPOSITORY: 'SDKWork-AI/SDKWork-DaXueDaZi' }).fullName)
    .toBe('sdkwork-ai/sdkwork-daxuedazi')
})

it('refuses to package a brand outside its release repository', () => {
  // Regression: every brand used to publish and update through the BirdCoder
  // repository, so an OEM build installed that product's release.
  const packaging = { GITHUB_REPOSITORY: 'sdkwork-ai/sdkwork-birdcoder2' }
  expect(() => resolveBrandReleaseRepository(packaging)).toThrow(/publishes its releases from sdkwork-ai\/sdkwork-daxuedazi/u)
  expect(() => resolveBrandReleaseRepository(packaging)).toThrow(/packages it in sdkwork-ai\/sdkwork-birdcoder2/u)
  expect(() => resolveBrandReleaseRepository({ ...packaging, DSH_BRAND: 'birdcoder' })).not.toThrow()
})

it('refuses a malformed repository value', () => {
  expect(() => resolveBrandReleaseRepository({ GITHUB_REPOSITORY: 'sdkwork-ai' })).toThrow(/owner\/repo/u)
  expect(() => resolveBrandReleaseRepository({ GITHUB_REPOSITORY: 'sdkwork-ai/sdkwork-daxuedazi/extra' })).toThrow(/owner\/repo/u)
})

it('gives every shipped brand its own release repository', () => {
  const repositories = readBrands().map(brand => brand.desktop.releaseRepository)
  expect(new Set(repositories).size).toBe(repositories.length)
})
