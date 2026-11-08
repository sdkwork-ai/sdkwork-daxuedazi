// Web e2e: the settings rail menu — hover opens the popover with the
// anonymous account header, the account group's sign-in row (advertised by
// the installed ui-sdkwork-iam plugin while signed out), the product command
// group (Settings / Appearance), and the disabled sign-out footer; the
// Appearance submenu flips the real theme through the full cascade (ThemeRuntime
// preference -> Host settings -> theme/change -> presenter -> body attribute).
// The popover ships no cloud-console administration rows (公众号账号 / 小程序账号 /
// 域名管理 / 证书管理 / 我的应用部署 / 中转站 API Key 管理) and no help/feedback rows,
// and the desktop-only update row is hidden on the web composition. Zero model
// calls: everything is pure client + persistence state on a blank frame.
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'
import { ZH_BROWSER_LOCALE, saveFailureShot } from './support.ts'

/** Rows this product's popover deliberately does not ship. */
const HIDDEN_ROW_LABELS = [
  '公众号账号', '小程序账号', '域名管理', '证书管理', '我的应用部署', '中转站 API Key 管理', '帮助', '反馈',
] as const

describe('web e2e: the settings rail menu', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    browser = await chromium.launch()
    // Chinese browser: the shared page asserts the localized menu surface.
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('opens on hover with the anonymous header, the product command group, and disabled sign-out; closes by Escape and outside click', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-settings-menu-basics'))
    const trigger = page.getByRole('button', { name: '设置', exact: true })
    await trigger.hover()
    const menu = page.getByRole('menu')
    await menu.waitFor({ timeout: 10_000 })
    // The card paints the shared translucent menu material: `MenuSurface` owns
    // the fill and its backdrop blur. A card carrying the fill alone leaves the
    // sidebar rows behind the popover legible straight through it.
    const material = await menu.evaluate((card) => {
      const layer = card.querySelector(':scope > [aria-hidden="true"]')
      if (layer === null) return null
      const style = getComputedStyle(layer)
      return { fill: style.backgroundColor, filter: style.backdropFilter }
    })
    expect(material?.filter).toContain('blur(')
    expect(material?.fill).not.toBe('rgba(0, 0, 0, 0)')
    // The menu is its own surface: no dialog yet.
    expect(await page.getByRole('dialog', { name: '设置' }).count()).toBe(0)
    // Mutual exclusivity: no account identity header while signed out (the
    // sign-in row owns the signed-out surface).
    expect(await page.getByText('未登录', { exact: true }).count()).toBe(0)
    // The installed ui-sdkwork-iam plugin's account seam advertises the sign-in row
    // while signed out, with no IAM configuration required.
    expect(await page.getByRole('menuitem', { name: '登录 / 注册', exact: true }).count()).toBe(1)
    expect(await page.getByRole('menuitem', { name: '设置', exact: true }).count()).toBe(1)
    expect(await page.getByRole('menuitem', { name: '外观', exact: true }).count()).toBe(1)
    // The popover is the product menu: none of the cloud-console rows and
    // neither of the old help/feedback rows ship, even though their plugins
    // still register into the shell's seat table.
    for (const label of HIDDEN_ROW_LABELS) {
      expect(await page.getByRole('menuitem', { name: label, exact: true }).count()).toBe(0)
    }
    // The desktop-only update row never appears on the web composition.
    expect(await page.getByRole('menuitem', { name: '检查更新', exact: true }).count()).toBe(0)
    const signOut = page.getByRole('menuitem', { name: '退出登录', exact: true })
    await signOut.waitFor({ timeout: 10_000 })
    expect(await signOut.isDisabled()).toBe(true)

    // Escape closes the menu without side effects.
    await page.keyboard.press('Escape')
    await expect.poll(() => menu.count(), { timeout: 5_000 }).toBe(0)
    expect(await trigger.getAttribute('aria-expanded')).toBe('false')

    // Outside click closes too. The pointer still sits on the trigger from
    // the first hover, so park it away first — a same-position hover emits no
    // pointerenter and cannot reopen the menu. The click lands in the rail's
    // empty spacer (below the entries, above the settings seat) — mid-page
    // positions sit over the onboarding step's settings button.
    await page.mouse.move(5, 5)
    await trigger.hover()
    await menu.waitFor({ timeout: 10_000 })
    await page.mouse.click(30, 600)
    await expect.poll(() => menu.count(), { timeout: 5_000 }).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('switches the theme through the Appearance submenu with a checked current preference', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-settings-menu-appearance'))
    await page.emulateMedia({ colorScheme: 'light' })
    const trigger = page.getByRole('button', { name: '设置', exact: true })
    const openAppearance = async (): Promise<void> => {
      await trigger.hover()
      await page.getByRole('menu').waitFor({ timeout: 10_000 })
      await page.getByRole('menuitem', { name: '外观', exact: true }).hover()
      await page.getByRole('menuitem', { name: '深色', exact: true }).waitFor({ timeout: 10_000 })
    }
    await openAppearance()
    // One glyph per row by default (leading icon only); the active preference
    // gains the trailing check marker.
    const dark = page.getByRole('menuitem', { name: '深色', exact: true })
    const light = page.getByRole('menuitem', { name: '浅色', exact: true })
    expect(await dark.locator('svg').count()).toBe(1)
    expect(await light.locator('svg').count()).toBe(1)
    await dark.click()
    // The full cascade from one menu gesture.
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme')), {
      timeout: 5_000,
    }).toBe(true)
    try {
      await expect.poll(async () => readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8'), { timeout: 10_000 })
        .toMatch(/ui-theme:\n\s+preference: dark/)
    } catch {
      // Windows rename contention can drop one host write; the controller's
      // recovery read refreshes the revision, so a second gesture persists.
      await openAppearance()
      await dark.click()
      await expect.poll(async () => readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8'), { timeout: 10_000 })
        .toMatch(/ui-theme:\n\s+preference: dark/)
    }

    // Reopen: the dark row now carries the selection marker.
    await openAppearance()
    expect(await dark.locator('svg').count()).toBe(2)
    expect(await light.locator('svg').count()).toBe(1)

    // Restore the shared page to the light default for the specs that follow.
    await light.click()
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme')), {
      timeout: 5_000,
    }).toBe(false)
    expect(tripwire.pageErrors).toEqual([])
  }, 90_000)

  it('honors the ui-sdkwork-env environment profile without resurrecting a feedback row', async () => {
    // A dedicated home carrying the testing profile: the feedback service still
    // reads the environment's app key / access token, and the product menu owns
    // no 反馈 entry, so the advertised channel changes nothing about the rows.
    const home = join(await mkdtemp(join(tmpdir(), 'dsh-web-e2e-ui-sdkwork-env-')), 'home')
    await mkdir(home, { recursive: true })
    await writeFile(join(home, 'settings.yaml'), [
      'ui-sdkwork-env:',
      '  environment: testing',
      '  testing:',
      '    apiBaseUrl: https://api.staging.sdkwork.com',
      '    appKey: sdkwork-birdcoder-test',
      '    accessToken: env-token',
      '',
    ].join('\n'))
    const envScaffold = await launchWebScaffold({ harnessHome: home })
    const envPage = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ZH_BROWSER_LOCALE })
    const envTripwire = watchConsole(envPage)
    onTestFailed(() => saveFailureShot(envPage, 'web-e2e-settings-menu-ui-sdkwork-env'))
    try {
      await envPage.goto(envScaffold.authenticatedUrl, { waitUntil: 'load' })
      await envPage.waitForSelector('[class*="frame"]', { timeout: 30_000 })
      const envTrigger = envPage.getByRole('button', { name: '设置', exact: true })
      await envTrigger.hover()
      await envPage.getByRole('menu').waitFor({ timeout: 10_000 })
      // Same row set as the default profile: the configured channel is a
      // service fact, not a menu entry.
      for (const label of HIDDEN_ROW_LABELS) {
        expect(await envPage.getByRole('menuitem', { name: label, exact: true }).count()).toBe(0)
      }
      expect(await envPage.getByRole('menuitem', { name: '设置', exact: true }).count()).toBe(1)
      expect(envTripwire.pageErrors).toEqual([])
    } finally {
      await envPage.close()
      await envScaffold.close()
    }
  }, 90_000)
})
