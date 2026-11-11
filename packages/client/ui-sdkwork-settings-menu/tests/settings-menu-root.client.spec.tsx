// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsMenuRoot } from '../src/client/SettingsMenuRoot.tsx'
import type { SettingsMenuRootComponentProps, SettingsOnboardingStep, SettingsSectionRow } from '../src/client/shell-contract.ts'
import { zh } from '../src/client/locales.ts'
import type { AccountProfile } from '../src/client/account.ts'
import type { ThemeMenuSnapshot } from '../src/client/theme-source.ts'

afterEach(cleanup)

/** Shipped Chinese copy — the component spec asserts user-visible copy. */
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const EMPTY_SESSIONS = { phase: 'ready', current: 's1', byId: {} } as { phase: string; current: string | undefined; byId: Record<string, unknown> }
const EMPTY_ACCOUNT: AccountProfile = { signedIn: false }

interface RootOverrides {
  sections?: readonly SettingsSectionRow[]
  steps?: readonly SettingsOnboardingStep[]
  theme?: ThemeMenuSnapshot
  account?: AccountProfile
  sessions?: typeof EMPTY_SESSIONS
  updatesAvailable?: boolean
  desktopPluginsAvailable?: boolean
  desktopPluginsUsable?: boolean
  quitAvailable?: boolean
}

/** Render the root with stubbed framework hooks and inject callbacks. */
function root(over: RootOverrides = {}) {
  const setTheme = vi.fn()
  const signIn = vi.fn()
  const logout = vi.fn()
  const checkForUpdates = vi.fn()
  const openDesktopPlugins = vi.fn()
  const quitApp = vi.fn()
  const useSections = vi.fn((sel: (rows: readonly SettingsSectionRow[]) => readonly SettingsSectionRow[]) => sel(over.sections ?? []))
  const useOnboardingSteps = vi.fn(
    (sel: (steps: readonly SettingsOnboardingStep[]) => readonly SettingsOnboardingStep[]) => sel(over.steps ?? []),
  )
  const useTheme = vi.fn((sel: (theme: ThemeMenuSnapshot) => ThemeMenuSnapshot) => sel(over.theme ?? { preference: 'system', revision: 0 }))
  const useAccount = vi.fn((sel: (account: AccountProfile) => AccountProfile) => sel(over.account ?? EMPTY_ACCOUNT))
  const useSessions = vi.fn((sel: (sessions: typeof EMPTY_SESSIONS) => boolean) => sel(over.sessions ?? EMPTY_SESSIONS))
  const renderSlot = vi.fn((name: string, _owner: unknown, opts?: { only?: string }): ReactNode => (
    <span data-slot={name}>{name}{opts?.only !== undefined ? `:${opts.only}` : ''}</span>
  ))
  const props = {
    useSections: useSections as never,
    useOnboardingSteps: useOnboardingSteps as never,
    useTheme: useTheme as never,
    useAccount: useAccount as never,
    useSessions: useSessions as never,
    renderSlot: renderSlot as never,
    setTheme,
    signIn,
    logout,
    checkForUpdates,
    updatesAvailable: over.updatesAvailable ?? false,
    openDesktopPlugins,
    desktopPluginsAvailable: over.desktopPluginsAvailable ?? false,
    desktopPluginsUsable: over.desktopPluginsUsable ?? false,
    quitApp,
    quitAvailable: over.quitAvailable ?? false,
    t,
  }
  render(<SettingsMenuRoot {...props as unknown as SettingsMenuRootComponentProps} />)
  return { setTheme, signIn, logout, checkForUpdates, openDesktopPlugins, quitApp, renderSlot }
}

function trigger(): HTMLButtonElement {
  const button = document.querySelector('button[aria-haspopup="menu"]')
  if (button === null) throw new Error('settings trigger not rendered')
  return button as HTMLButtonElement
}

function openMenu() {
  act(() => { fireEvent.pointerEnter(trigger()) })
}

describe('SettingsMenuRoot', () => {
  it('renders the rail trigger with the trigger slot content and menu semantics', () => {
    const { renderSlot } = root()
    const button = trigger()
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(renderSlot).toHaveBeenCalledWith('settings.trigger', {})
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the hover menu with no account identity header, the product command group, and a disabled sign-out footer', () => {
    const { logout } = root()
    openMenu()
    expect(screen.getByRole('menu')).not.toBeNull()
    // No account identity header while signed out: the signed-out surface is
    // the sign-in row, which the anonymous default does not advertise.
    expect(screen.queryByText('未登录')).toBeNull()
    // The command group is the whole product menu, in row order: settings,
    // appearance, then the pinned sign-out footer.
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      '设置',
      '外观',
      '退出登录',
    ])
    // No update row without the desktop preload surface; no account group.
    expect(screen.queryByRole('menuitem', { name: '检查更新' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: '会员等级' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: '登录 / 注册' })).toBeNull()
    // Footer: the anonymous default disables sign-out.
    const signOut = screen.getByRole('menuitem', { name: '退出登录' })
    expect((signOut as HTMLButtonElement).disabled).toBe(true)
    act(() => { signOut.click() })
    expect(logout).not.toHaveBeenCalled()
  })

  it('keeps the cloud-console, help, feedback, and persona rows out of the product menu', () => {
    root()
    openMenu()
    const labels = screen.getAllByRole('menuitem').map(item => item.textContent ?? '')
    // The console surfaces (WeChat accounts, domain, certificate, deployments,
    // relay credential) are administration rather than product commands, the
    // help/feedback rows are gone with them, and 角色与兴趣 stays a first-run
    // surface rather than a menu entry. Their seats stay declared so the owning
    // plugins can still register — the entry list is the product decision, the
    // seat table is the runtime grant. The persona feature is not removed: its
    // picker still opens on first run and its seam is still provided.
    const hidden = [
      '公众号账号', '小程序账号', '域名管理', '证书管理', '我的应用部署', '中转站 API Key 管理', '帮助', '反馈',
      '角色与兴趣',
    ]
    expect(hidden.filter(label => labels.includes(label))).toEqual([])
    for (const seat of [
      'settings.officialAccounts', 'settings.miniPrograms', 'settings.dns',
      'settings.certificates', 'settings.myDeployments', 'settings.apiKeys',
    ]) {
      // No host is mounted for a hidden row, so no dialog can linger behind the
      // menu that used to open it.
      expect(screen.queryByText(seat)).toBeNull()
    }
  })

  it('renders the account card seat directly under the identity row, above the feature group', () => {
    const { renderSlot } = root({ account: { signedIn: true, username: 'Super Administrator' } })
    openMenu()

    const identity = screen.getByText('Super Administrator')
    const card = document.querySelector('[data-slot="settings.menu.account"]')
    expect(card).not.toBeNull()
    // The card sits below the user name and above the first command row.
    expect(identity.compareDocumentPosition(card!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const settingsRow = screen.getByRole('menuitem', { name: '设置' })
    expect(card!.compareDocumentPosition(settingsRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The card is a block, not a row: it never joins the menuitem walk.
    expect(card!.closest('[role="menuitem"]')).toBeNull()

    // The shell hands the card exactly one affordance: dismissing the menu it
    // was drawn in (the card opens the billing dashboard over it).
    const owner = renderSlot.mock.calls.find(([name]) => name === 'settings.menu.account')![1] as { close: () => void }
    act(() => { owner.close() })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders the wallet card under the usage card, above the feature group', () => {
    const { renderSlot } = root({ account: { signedIn: true, username: 'Super Administrator' } })
    openMenu()

    const usage = document.querySelector('[data-slot="settings.menu.account"]')
    const wallet = document.querySelector('[data-slot="settings.menu.plan"]')
    expect(wallet).not.toBeNull()
    // The wallet follows the spend card: the account group answers both
    // "what did I spend" and "what do I have left" before the commands.
    expect(usage!.compareDocumentPosition(wallet!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wallet!.compareDocumentPosition(screen.getByRole('menuitem', { name: '设置' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // It stays out of the menuitem walk like the account card.
    expect(wallet!.closest('[role="menuitem"]')).toBeNull()

    const owner = renderSlot.mock.calls.find(([name]) => name === 'settings.menu.plan')![1] as { close: () => void }
    act(() => { owner.close() })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the settings dialog from the settings row and closes it by every path', () => {
    const { renderSlot } = root({
      sections: [
        { id: 'general', order: 0, label: '通用设置' },
        { id: 'models', order: 10, label: '模型' },
      ],
    })
    openMenu()
    act(() => { screen.getByRole('menuitem', { name: '设置' }).click() })
    // The menu closes and the modal opens on the first section.
    expect(screen.queryByRole('menu')).toBeNull()
    const dialog = screen.getByRole('dialog', { name: 'settings.header' })
    expect(dialog).not.toBeNull()
    expect(renderSlot).toHaveBeenCalledWith('settings.section', { close: expect.any(Function) as () => void }, { only: 'general' })
    expect(screen.getByRole('button', { name: '通用设置' }).getAttribute('aria-current')).toBe('true')

    // Section switch moves the aria-current and the filtered section seat.
    act(() => { screen.getByRole('button', { name: '模型' }).click() })
    expect(screen.getByRole('button', { name: '模型' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: '通用设置' }).getAttribute('aria-current')).toBeNull()
    expect(renderSlot).toHaveBeenLastCalledWith('settings.section', { close: expect.any(Function) as () => void }, { only: 'models' })

    // Close path 1: Escape.
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Reopen; close path 2: the mask.
    act(() => { fireEvent.pointerEnter(trigger()) })
    act(() => { screen.getByRole('menuitem', { name: '设置' }).click() })
    const mask = document.querySelector('[aria-hidden="true"]')
    act(() => { fireEvent.click(mask!) })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Reopen; close path 3: the header close button (focused on open).
    act(() => { fireEvent.pointerEnter(trigger()) })
    act(() => { screen.getByRole('menuitem', { name: '设置' }).click() })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'settings.close' }))
    act(() => { screen.getByRole('button', { name: 'settings.close' }).click() })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('gives the Skills settings row its own glyph instead of the fallback gear', () => {
    root({
      sections: [
        { id: 'general', order: 0, label: '通用设置' },
        { id: 'skills', order: 12, label: '技能设置' },
        { id: 'skill-manager', order: 13, label: '技能' },
      ],
    })
    openMenu()
    act(() => { screen.getByRole('menuitem', { name: '设置' }).click() })
    // The fork's own page reads as skills, not as another gear row.
    expect(screen.getByRole('button', { name: '技能设置' }).querySelector('svg')?.getAttribute('data-icon'))
      .toBe('dsw-icon-skill-outline-regular')
    // Unknown section ids keep the settings gear, so a third-party page still
    // has a stable fallback glyph.
    expect(screen.getByRole('button', { name: '技能' }).querySelector('svg')?.getAttribute('data-icon'))
      .toBe('dsw-icon-settings-outline-regular')
  })

  it('switches the theme through the appearance submenu with the current preference checked', () => {
    const { setTheme } = root({ theme: { preference: 'light', revision: 2 } })
    openMenu()
    act(() => { fireEvent.mouseEnter(screen.getByRole('menuitem', { name: '外观' })) })
    const dark = screen.getByRole('menuitem', { name: '深色' })
    const light = screen.getByRole('menuitem', { name: '浅色' })
    const system = screen.getByRole('menuitem', { name: '跟随系统' })
    // The current preference carries the trailing check marker.
    expect(light.querySelector('svg[class*="check"]')).not.toBeNull()
    expect(dark.querySelector('svg[class*="check"]')).toBeNull()
    expect(system.querySelector('svg[class*="check"]')).toBeNull()
    act(() => { dark.click() })
    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders the account group and enables sign-out when a provider publishes a profile', () => {
    const { logout } = root({
      account: { signedIn: true, username: 'birdcoder', membership: 'Pro', points: 128 },
    })
    openMenu()
    expect(screen.getByText('birdcoder')).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Pro' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: '积分余额' })).not.toBeNull()
    // A signed-in profile never shows the sign-in row.
    expect(screen.queryByRole('menuitem', { name: '登录 / 注册' })).toBeNull()
    const signOut = screen.getByRole('menuitem', { name: '退出登录' })
    expect((signOut as HTMLButtonElement).disabled).toBe(false)
    act(() => { signOut.click() })
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('shows the sign-in row for a signed-out provider that advertises one and opens the flow on click', () => {
    const { signIn } = root({ account: { signedIn: false, signInAvailable: true } })
    openMenu()
    // Mutual exclusivity: the sign-in row replaces the account identity
    // header while signed out.
    expect(screen.queryByText('未登录')).toBeNull()
    const signInRow = screen.getByRole('menuitem', { name: '登录 / 注册' })
    expect(signInRow).not.toBeNull()
    // The footer sign-out stays disabled without a session.
    const signOut = screen.getByRole('menuitem', { name: '退出登录' })
    expect((signOut as HTMLButtonElement).disabled).toBe(true)
    act(() => { signInRow.click() })
    expect(signIn).toHaveBeenCalledTimes(1)
    // The selection closes the menu.
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('asks the desktop updater from the update row and closes the menu', () => {
    const { checkForUpdates } = root({ updatesAvailable: true })
    openMenu()
    expect(screen.getByRole('menuitem', { name: '检查更新' })).not.toBeNull()
    act(() => { screen.getByRole('menuitem', { name: '检查更新' }).click() })
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders the desktop shell group from the native menu migration and fires its callbacks', () => {
    const { checkForUpdates, openDesktopPlugins, quitApp } = root({
      updatesAvailable: true,
      desktopPluginsAvailable: true,
      desktopPluginsUsable: true,
      quitAvailable: true,
    })
    openMenu()
    // Native menu order preserved: plugins, check for updates, quit.
    const pluginsRow = screen.getByRole('menuitem', { name: '桌面插件…' })
    expect(screen.getByRole('menuitem', { name: '检查更新' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: '退出应用' })).not.toBeNull()
    act(() => { pluginsRow.click() })
    expect(openDesktopPlugins).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
    openMenu()
    act(() => { screen.getByRole('menuitem', { name: '退出应用' }).click() })
    expect(quitApp).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
    openMenu()
    act(() => { screen.getByRole('menuitem', { name: '检查更新' }).click() })
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('disables the desktop plugins row outside packaged applications', () => {
    const { openDesktopPlugins } = root({
      desktopPluginsAvailable: true,
      desktopPluginsUsable: false,
      quitAvailable: true,
    })
    openMenu()
    // The dev build keeps the row visible with the packaged-only copy.
    const pluginsRow = screen.getByRole('menuitem', { name: '桌面插件…（打包应用中可用）' })
    expect((pluginsRow as HTMLButtonElement).disabled).toBe(true)
    act(() => { pluginsRow.click() })
    expect(openDesktopPlugins).not.toHaveBeenCalled()
    // Quit stays usable regardless of the packaging fact.
    act(() => { screen.getByRole('menuitem', { name: '退出应用' }).click() })
    expect(openDesktopPlugins).not.toHaveBeenCalled()
  })

  it('mounts the first unfinished onboarding step while the empty-hero fact is active', () => {
    const { renderSlot } = root({
      sessions: { phase: 'ready', current: undefined, byId: {} },
      steps: [
        { id: 'first', order: 0 },
        { id: 'second', order: 1 },
      ],
    })
    const step = renderSlot.mock.calls.find(([name]) => name === 'settings.onboarding')
    expect(step).not.toBeUndefined()
    expect(step![1]).toMatchObject({ stepId: 'first' })
    expect(step![2]).toEqual({ only: 'first' })
    const owner = step![1] as { complete: () => void; openSection: (id: string) => void }
    // Completing the step transfers ownership to the next one.
    act(() => { owner.complete() })
    const next = renderSlot.mock.calls.findLast(([name, _owner, opts]) => name === 'settings.onboarding' && opts?.only === 'second')
    expect(next).not.toBeUndefined()
    // openSection opens the panel directly on the requested section.
    const firstOwner = renderSlot.mock.calls.find(([name]) => name === 'settings.onboarding')![1] as { openSection: (id: string) => void }
    act(() => { firstOwner.openSection('models') })
    expect(screen.getByRole('dialog')).not.toBeNull()
  })

  it('skips the coordinator without a blank hero and closes the menu via outside click', () => {
    const { renderSlot } = root()
    expect(renderSlot).not.toHaveBeenCalledWith('settings.onboarding', expect.anything(), expect.anything())
    openMenu()
    act(() => { fireEvent.pointerDown(document.body) })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('reopens the menu after a selection closes it', () => {
    root({ updatesAvailable: true })
    openMenu()
    act(() => { screen.getByRole('menuitem', { name: '检查更新' }).click() })
    expect(screen.queryByRole('menu')).toBeNull()
    openMenu()
    expect(screen.getByRole('menu')).not.toBeNull()
  })
})
