// @vitest-environment jsdom
/** The OEM page projection drives the fork wordmark; malformed values fall back to the shipped brand. */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { BirdWordmark } from '../src/BirdWordmark.tsx'
import {
  DEFAULT_BRAND_NAME, DEFAULT_IAM_CLIENT_ID, DEFAULT_IAM_REDIRECT_URI, OEM_BOOT_GLOBAL,
  readOemAppStore, readOemBrandName, readOemDemandHall, readOemEnvironment, readOemIamAuthorizeBaseUrl,
  readOemIamBaseUrl, readOemIamClientId, readOemIamRedirectUri, readOemSceneSwitcher,
  readOemShowApiKeyEntry, readOemSkillTags, readOemTemplateLibrary,
} from '../src/oem-brand.ts'

const BOOT = { brand: { name: 'Acme Coder', companyName: 'Acme' } }

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(globalThis, OEM_BOOT_GLOBAL)
})

describe('readOemBrandName', () => {
  it('falls back to the shipped brand without a projection or with a malformed one', () => {
    expect(readOemBrandName()).toBe(DEFAULT_BRAND_NAME)
    expect(readOemBrandName({ brand: { name: '   ' } })).toBe(DEFAULT_BRAND_NAME)
    expect(readOemBrandName({ brand: { name: 7 } })).toBe(DEFAULT_BRAND_NAME)
    expect(readOemBrandName({ brand: { name: 'bad\u0000name' } })).toBe(DEFAULT_BRAND_NAME)
    expect(readOemBrandName({ brand: { name: 'x'.repeat(65) } })).toBe(DEFAULT_BRAND_NAME)
  })

  it('reads the brand from a complete projection and ignores unrelated fields', () => {
    expect(readOemBrandName(BOOT)).toBe('Acme Coder')
    expect(readOemBrandName({ brand: { name: 'Acme' }, extra: true })).toBe('Acme')
    expect(readOemBrandName({ brand: { name: 'Acme' } })).toBe('Acme')
  })
})

describe('readOemShowApiKeyEntry', () => {
  it('shows the fallback only when the deployment opts in', () => {
    expect(readOemShowApiKeyEntry()).toBe(false)
    expect(readOemShowApiKeyEntry({ brand: { name: 'Acme' } })).toBe(false)
    expect(readOemShowApiKeyEntry({ brand: { showApiKeyEntry: 'yes' } })).toBe(false)
    expect(readOemShowApiKeyEntry({ brand: { showApiKeyEntry: false } })).toBe(false)
    expect(readOemShowApiKeyEntry({ brand: { showApiKeyEntry: true } })).toBe(true)
  })
})

describe('OEM scene chrome', () => {
  it('hides each surface only when the projection turns it off explicitly', () => {
    // No page projection: an OEM-free composition keeps the fork's developer
    // chrome, which is what tests and upstream builds mount.
    expect(readOemSceneSwitcher()).toBe(true)
    expect(readOemSkillTags()).toBe(true)
    expect(readOemSceneSwitcher({ brand: { name: 'Acme' } })).toBe(true)
    expect(readOemSkillTags({ brand: { name: 'Acme' } })).toBe(true)
    expect(readOemSceneSwitcher({ ui: { sceneSwitcher: 'no' } })).toBe(true)
    expect(readOemSkillTags({ ui: { skillTags: 0 } })).toBe(true)
    // The shipped Host projection publishes the hidden defaults.
    expect(readOemSceneSwitcher({ ui: { sceneSwitcher: false, skillTags: true } })).toBe(false)
    expect(readOemSkillTags({ ui: { sceneSwitcher: true, skillTags: false } })).toBe(false)
    expect(readOemSceneSwitcher({ ui: { sceneSwitcher: true, skillTags: false } })).toBe(true)
    expect(readOemSkillTags({ ui: { sceneSwitcher: false, skillTags: true } })).toBe(true)
  })
})

describe('OEM marketplace surfaces', () => {
  it('hides each storefront surface only when the projection turns it off explicitly', () => {
    // No page projection: an OEM-free composition keeps the fork's storefront
    // surfaces, which is what the component specs and the assembled fixtures mount.
    expect(readOemAppStore()).toBe(true)
    expect(readOemTemplateLibrary()).toBe(true)
    expect(readOemDemandHall()).toBe(true)
    expect(readOemAppStore({ brand: { name: 'Acme' } })).toBe(true)
    expect(readOemTemplateLibrary({ ui: { appStore: false } })).toBe(true)
    expect(readOemDemandHall({ ui: { templateLibrary: false } })).toBe(true)
    expect(readOemAppStore({ ui: { appStore: 'no' } })).toBe(true)
    expect(readOemTemplateLibrary({ ui: { templateLibrary: 0 } })).toBe(true)
    expect(readOemDemandHall({ ui: { demandHall: null } })).toBe(true)
    // The shipped Host projection publishes the hidden defaults, one flag each.
    expect(readOemAppStore({ ui: { appStore: false } })).toBe(false)
    expect(readOemTemplateLibrary({ ui: { templateLibrary: false } })).toBe(false)
    expect(readOemDemandHall({ ui: { demandHall: false } })).toBe(false)
    expect(readOemAppStore({ ui: { appStore: true, templateLibrary: false } })).toBe(true)
    expect(readOemTemplateLibrary({ ui: { templateLibrary: true, demandHall: false } })).toBe(true)
    expect(readOemDemandHall({ ui: { demandHall: true, appStore: false } })).toBe(true)
  })
})

describe('readOemIamBaseUrl', () => {
  it('reads a valid IAM origin and rejects malformed values', () => {
    expect(readOemIamBaseUrl({ sdkwork: { iamBaseUrl: 'https://iam.acme.test' } })).toBe('https://iam.acme.test')
    expect(readOemIamBaseUrl({ sdkwork: { iamBaseUrl: 'https://iam.acme.test/' } })).toBe('https://iam.acme.test')
    expect(readOemIamBaseUrl({ sdkwork: { iamBaseUrl: 'https://iam.acme.test/app' } })).toBeUndefined()
    expect(readOemIamBaseUrl({ sdkwork: { iamBaseUrl: 'ftp://iam.acme.test' } })).toBeUndefined()
    expect(readOemIamBaseUrl({ sdkwork: { iamBaseUrl: 7 } })).toBeUndefined()
    expect(readOemIamBaseUrl({ brand: { name: 'Acme' } })).toBeUndefined()
    expect(readOemIamBaseUrl()).toBeUndefined()
  })

  it('reads the hosted authorization origin independently', () => {
    expect(readOemIamAuthorizeBaseUrl({
      sdkwork: { iamBaseUrl: 'https://api.acme.test', iamAuthorizeBaseUrl: 'https://platform.acme.test' },
    })).toBe('https://platform.acme.test')
    expect(readOemIamAuthorizeBaseUrl({ sdkwork: { iamBaseUrl: 'https://api.acme.test' } })).toBeUndefined()
  })

  it('reads the resolved lifecycle and rejects unknown values', () => {
    expect(readOemEnvironment({ environment: 'development' })).toBe('development')
    expect(readOemEnvironment({ environment: 'staging' })).toBe('staging')
    expect(readOemEnvironment({ environment: 'preview' })).toBeUndefined()
    expect(readOemEnvironment({})).toBeUndefined()
  })
})

describe('readOemIamClientId', () => {
  it('reads a valid OAuth client id and rejects malformed values', () => {
    expect(readOemIamClientId({ sdkwork: { iamClientId: 'acme-coder' } })).toBe('acme-coder')
    expect(readOemIamClientId({ sdkwork: { iamClientId: ' acme-coder ' } })).toBe('acme-coder')
    for (const value of ['Acme', 'acme coder', '', 'a'.repeat(65), 7]) {
      expect(readOemIamClientId({ sdkwork: { iamClientId: value } })).toBeUndefined()
    }
    expect(readOemIamClientId({ brand: { name: 'Acme' } })).toBeUndefined()
    expect(readOemIamClientId()).toBeUndefined()
    expect(DEFAULT_IAM_CLIENT_ID).toBe('daxuedazi')
  })
})

describe('readOemIamRedirectUri', () => {
  it('reads a custom-scheme callback and rejects values the desktop cannot receive', () => {
    expect(readOemIamRedirectUri({ sdkwork: { iamRedirectUri: 'acme://auth/callback' } })).toBe('acme://auth/callback')
    expect(readOemIamRedirectUri({ sdkwork: { iamRedirectUri: ' acme://auth/callback ' } })).toBe('acme://auth/callback')
    for (const value of [
      'https://app.acme.test/auth/callback',
      'http://app.acme.test/auth/callback',
      'acme:auth/callback',
      'acme://',
      'acme://user:secret@auth/callback',
      'acme://auth/callback?code=x',
      'not a uri',
      7,
    ]) {
      expect(readOemIamRedirectUri({ sdkwork: { iamRedirectUri: value } })).toBeUndefined()
    }
    expect(readOemIamRedirectUri({ sdkwork: {} })).toBeUndefined()
    expect(readOemIamRedirectUri()).toBeUndefined()
    expect(DEFAULT_IAM_REDIRECT_URI).toBe('daxuedazi://auth/callback')
  })
})

describe('BirdWordmark', () => {
  it('renders the page brand by default and steps the type down for long names', () => {
    Reflect.set(globalThis, OEM_BOOT_GLOBAL, BOOT)
    const short = render(<BirdWordmark />)
    expect(short.container.querySelector('text')?.textContent).toBe('Acme Coder')
    short.unmount()

    const long = { ...BOOT, brand: { name: 'Acme Coder Enterprise Edition', companyName: 'Acme' } }
    Reflect.set(globalThis, OEM_BOOT_GLOBAL, long)
    const rendered = render(<BirdWordmark />)
    expect(rendered.container.querySelector('text')?.textContent).toBe('Acme Coder Enterprise Edition')
    expect(rendered.container.querySelector('text')?.getAttribute('font-size')).toBe('15')
    rendered.unmount()
  })

  it('keeps the shipped text and box when no projection exists', () => {
    const rendered = render(<BirdWordmark />)
    expect(rendered.container.querySelector('text')?.textContent).toBe(DEFAULT_BRAND_NAME)
    expect(rendered.container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 156 24')
  })
})
