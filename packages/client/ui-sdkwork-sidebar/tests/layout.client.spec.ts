// @vitest-environment jsdom
/**
 * The left column's layout preference: the grouped item list the settings page
 * edits, the snapshot equality guard, and the persisted choice — including the
 * shipped-hidden defaults, the explicit-show override, rehydration
 * normalization, and reset.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OEM_BOOT_GLOBAL } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  SIDEBAR_LAYOUT_STORAGE_KEY,
  createSidebarLayoutPreference,
  sameSidebarLayout,
  shippedHiddenEntryIds,
  sidebarItems,
  type SidebarLayoutSnapshot,
} from '../src/client/layout.ts'

/** The shipped profile's hidden storefront rows, in stack order. */
const SHIPPED_HIDDEN = ['sdkwork-appstore', 'sdkwork-template-library', 'sdkwork-demand-hall']

/** Publish one OEM page projection for the test's duration. */
function withOem(ui: Record<string, unknown>): void {
  Reflect.set(globalThis, OEM_BOOT_GLOBAL, { ui })
}

beforeEach(() => {
  localStorage.clear()
  Reflect.deleteProperty(globalThis, OEM_BOOT_GLOBAL)
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, OEM_BOOT_GLOBAL)
})

describe('sidebarItems', () => {
  it('groups the three stacks in display order and sorts each by its own order', () => {
    const items = sidebarItems({
      actions: [
        { id: 'b', title: 'Second', order: 20 },
        { id: 'a', title: 'First', order: 10 },
      ],
      pages: [{ id: 'page', title: 'Page', order: 5 }],
      panels: [{ id: 'panel', title: 'Panel', order: 1 }],
    })
    expect(items).toEqual([
      { id: 'a', group: 'actions', title: 'First', order: 10 },
      { id: 'b', group: 'actions', title: 'Second', order: 20 },
      { id: 'page', group: 'pages', title: 'Page', order: 5 },
      { id: 'panel', group: 'panels', title: 'Panel', order: 1 },
    ])
  })

  it('keeps registration order for equal orders and returns an empty list for no contributions', () => {
    expect(sidebarItems({
      actions: [{ id: 'first', title: 'First', order: 0 }, { id: 'second', title: 'Second', order: 0 }],
      pages: [],
      panels: [],
    }).map(item => item.id)).toEqual(['first', 'second'])
    expect(sidebarItems({ actions: [], pages: [], panels: [] })).toEqual([])
  })
})

describe('sameSidebarLayout', () => {
  const base: SidebarLayoutSnapshot = {
    items: [{ id: 'a', group: 'actions', title: 'A', order: 0 }],
    hidden: ['b'],
  }

  it('treats two independently built snapshots with the same content as equal', () => {
    expect(sameSidebarLayout(base, { ...base, items: [...base.items], hidden: [...base.hidden] })).toBe(true)
  })

  it('detects a changed hidden set, row set, or row title', () => {
    expect(sameSidebarLayout(base, { ...base, hidden: [] })).toBe(false)
    expect(sameSidebarLayout(base, { ...base, hidden: ['c'] })).toBe(false)
    expect(sameSidebarLayout(base, { items: [], hidden: base.hidden })).toBe(false)
    expect(sameSidebarLayout(base, {
      ...base,
      items: [{ id: 'a', group: 'actions', title: 'Renamed', order: 0 }],
    })).toBe(false)
    expect(sameSidebarLayout(base, { ...base, items: [{ id: 'a', group: 'pages', title: 'A', order: 0 }] })).toBe(false)
  })
})

describe('shippedHiddenEntryIds', () => {
  it('reads the deployment switches, one row each, and keeps the stack order', () => {
    // No projection: an OEM-free composition keeps the developer stack.
    expect(shippedHiddenEntryIds({})).toEqual([])
    expect(shippedHiddenEntryIds({ ui: { skillTags: false } })).toEqual([])
    // The shipped profile publishes all three as false.
    expect(shippedHiddenEntryIds({ ui: { appStore: false, templateLibrary: false, demandHall: false } }))
      .toEqual(SHIPPED_HIDDEN)
    // One deployment-visible storefront leaves the other two hidden.
    expect(shippedHiddenEntryIds({ ui: { appStore: true, templateLibrary: false, demandHall: false } }))
      .toEqual(['sdkwork-template-library', 'sdkwork-demand-hall'])
  })
})

describe('createSidebarLayoutPreference', () => {
  it('starts with nothing hidden without an OEM projection and keeps one snapshot reference', () => {
    const preference = createSidebarLayoutPreference()
    const first = preference.get()
    expect(first).toEqual([])
    expect(preference.get()).toBe(first)
  })

  it('hides the shipped storefronts by default and shows them again on request', () => {
    withOem({ appStore: false, templateLibrary: false, demandHall: false })
    const preference = createSidebarLayoutPreference()
    expect(preference.get()).toEqual(SHIPPED_HIDDEN)
    // An explicit show wins over the shipped default and persists the choice.
    preference.setVisible('sdkwork-appstore', true)
    expect(preference.get()).toEqual(['sdkwork-template-library', 'sdkwork-demand-hall'])
    expect(JSON.parse(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)!))
      .toEqual({ hidden: [], shown: ['sdkwork-appstore'] })
    // A later page load honours the choice even though the profile still hides it.
    expect(createSidebarLayoutPreference().get()).toEqual(['sdkwork-template-library', 'sdkwork-demand-hall'])
    // Hiding it again is one more explicit choice, not a return to the default.
    preference.setVisible('sdkwork-appstore', false)
    expect(preference.get()).toEqual(SHIPPED_HIDDEN)
    expect(JSON.parse(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)!))
      .toEqual({ hidden: ['sdkwork-appstore'], shown: [] })
  })

  it('ships a storefront visible when the OEM profile says so, and still hides it on request', () => {
    withOem({ appStore: true, templateLibrary: false, demandHall: false })
    const preference = createSidebarLayoutPreference()
    expect(preference.get()).toEqual(['sdkwork-template-library', 'sdkwork-demand-hall'])
    preference.setVisible('sdkwork-appstore', false)
    const hidden = ['sdkwork-template-library', 'sdkwork-demand-hall', 'sdkwork-appstore']
    expect(preference.get()).toEqual(hidden)
    // An explicit hide survives a build that ships the row visible.
    expect(createSidebarLayoutPreference().get()).toEqual(hidden)
  })

  it('hides and restores one id, and ignores writes that ask for the current state', () => {
    const preference = createSidebarLayoutPreference()
    const listener = vi.fn()
    const off = preference.subscribe(listener)
    preference.setVisible('a', true)
    expect(listener).not.toHaveBeenCalled()
    preference.setVisible('a', false)
    expect(preference.get()).toEqual(['a'])
    expect(listener).toHaveBeenCalledTimes(1)
    preference.setVisible('a', false)
    expect(listener).toHaveBeenCalledTimes(1)
    preference.setVisible('a', true)
    expect(preference.get()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
    off()
    preference.setVisible('a', false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('persists the hidden set and rehydrates it in a later instance', () => {
    createSidebarLayoutPreference().setVisible('a', false)
    expect(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY))
      .toBe(JSON.stringify({ hidden: ['a'], shown: [] }))
    expect(createSidebarLayoutPreference().get()).toEqual(['a'])
  })

  it('migrates the legacy single-list blob and applies the shipped defaults once', () => {
    withOem({ appStore: false, templateLibrary: false, demandHall: false })
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify({ hidden: ['a'] }))
    const preference = createSidebarLayoutPreference()
    expect(preference.get()).toEqual([...SHIPPED_HIDDEN, 'a'])
    // The migration records the explicit hide and the explicit-show list, so a
    // later load no longer treats the blob as legacy.
    expect(JSON.parse(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)!))
      .toEqual({ hidden: ['a'], shown: [] })
  })

  it('normalizes a corrupted or duplicated stored blob', () => {
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify({ hidden: ['a', 'a', '', 7, 'b'] }))
    expect(createSidebarLayoutPreference().get()).toEqual(['a', 'b'])
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify({ hidden: 'not-a-list' }))
    expect(createSidebarLayoutPreference().get()).toEqual([])
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify({}))
    expect(createSidebarLayoutPreference().get()).toEqual([])
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify({ shown: ['a', 'a', 7] }))
    expect(createSidebarLayoutPreference().get()).toEqual([])
  })

  it('resets every explicit choice back to the shipped defaults', () => {
    withOem({ appStore: false, templateLibrary: false, demandHall: false })
    const preference = createSidebarLayoutPreference()
    const listener = vi.fn()
    preference.subscribe(listener)
    preference.reset()
    expect(listener).not.toHaveBeenCalled()
    preference.setVisible('sdkwork-appstore', true)
    preference.setVisible('b', false)
    preference.reset()
    expect(preference.get()).toEqual(SHIPPED_HIDDEN)
    expect(JSON.parse(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)!))
      .toEqual({ hidden: [], shown: [] })
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
