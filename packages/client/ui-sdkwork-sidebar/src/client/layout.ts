/**
 * The left column's user-owned layout preference: which contributed entries the
 * column draws.
 *
 * One snapshot store persisted to localStorage holds two id lists: the ids the
 * user hid and the ids the user explicitly showed. The settings page is the
 * only writer and the shell is the reader. Storing the user's choices, not the
 * resolved visibility, is what lets the product ship an entry hidden: an id the
 * deployment's OEM profile marks hidden is hidden for every user who never
 * chose, while an id the user showed wins over that default, and an id the user
 * hid stays hidden even when the product ships it visible. An unknown id left
 * behind by a removed plugin is inert and applies again when that plugin
 * returns.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  OEM_BOOT_GLOBAL, readOemAppStore, readOemDemandHall, readOemTemplateLibrary,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** localStorage key the preference persists under. */
export const SIDEBAR_LAYOUT_STORAGE_KEY = 'dsh.sidebarLayout'

/**
 * Sidebar quick entries the shipped product hides until the user shows them.
 * Each entry names the OEM profile switch that ships it visible instead, so the
 * product default stays a deployment decision without changing the plugin
 * composition: the entry, its page, and its Settings switch are mounted either
 * way.
 */
const SHIPPED_HIDDEN_ENTRIES: readonly {
  /** Stable `sidebar.actions` registration id. */
  readonly id: string
  /** The `ui` profile switch whose `true` ships this row visible. */
  readonly shipsVisible: (source: unknown) => boolean
}[] = [
  { id: 'sdkwork-appstore', shipsVisible: readOemAppStore },
  { id: 'sdkwork-template-library', shipsVisible: readOemTemplateLibrary },
  { id: 'sdkwork-demand-hall', shipsVisible: readOemDemandHall },
]

/**
 * The quick-entry ids this deployment ships hidden. An OEM profile ships them
 * hidden by default; a page without the OEM projection (tests, an OEM-free
 * composition) ships every entry visible and keeps the developer stack.
 * @param source - OEM page projection; defaults to the page global.
 * @returns the shipped-hidden quick-entry ids, in stack order.
 */
export function shippedHiddenEntryIds(
  source: unknown = (globalThis as Record<string, unknown>)[OEM_BOOT_GLOBAL],
): readonly string[] {
  return SHIPPED_HIDDEN_ENTRIES.filter(entry => !entry.shipsVisible(source)).map(entry => entry.id)
}

/** The groups the settings page stacks, in display order. */
export const SIDEBAR_ITEM_GROUPS = ['actions', 'pages', 'panels'] as const

/** One group of entries the column draws: quick entries, registry pages, panel rows. */
export type SidebarItemGroup = typeof SIDEBAR_ITEM_GROUPS[number]

/** One row the column can draw and the settings page can show or hide. */
export interface SidebarItem {
  /** Stable id: the `sidebar.actions` registration id, the page id, or the panel id. */
  readonly id: string
  /** Which stack the row belongs to. */
  readonly group: SidebarItemGroup
  /** Display title, already resolved for the active locale. */
  readonly title: string
  /** Ascending position inside its group. */
  readonly order: number
}

/** What the shell and the settings page read: the rows the column can draw and the hidden ids. */
export interface SidebarLayoutSnapshot {
  /** Every row the column can draw, grouped and ordered. */
  readonly items: readonly SidebarItem[]
  /** Ids the user switched off; any id not listed here renders. */
  readonly hidden: readonly string[]
}

/** One contribution's resolved identity, as the item list collects it. */
export interface SidebarItemSource {
  /** The contribution's stable id. */
  readonly id: string
  /** Locale-resolved display title. */
  readonly title: string
  /** Ascending position inside its group. */
  readonly order: number
}

/** The three ledger projections the item list is built from. */
export interface SidebarLayoutSources {
  /** `sidebar.actions` quick-entry registrations. */
  readonly actions: readonly SidebarItemSource[]
  /** `ctx.sdkworkSidebar` registry pages. */
  readonly pages: readonly SidebarItemSource[]
  /** Global panel rows the column draws. */
  readonly panels: readonly SidebarItemSource[]
}

/**
 * Sort one contribution group into rows. Array.prototype.sort is stable, so
 * equal orders keep the ledger's registration order.
 * @param group - the group the rows belong to.
 * @param rows - the group's resolved contributions.
 * @returns the group's rows in display order.
 */
function groupItems(group: SidebarItemGroup, rows: readonly SidebarItemSource[]): readonly SidebarItem[] {
  return [...rows]
    .sort((left, right) => left.order - right.order)
    .map(row => ({ id: row.id, group, title: row.title, order: row.order }))
}

/**
 * Build the settings page's row list: each group sorted by its own order, the
 * groups stacked quick entries, then pages, then panels.
 * @param sources - the resolved contributions of the column.
 * @returns the grouped rows in display order.
 */
export function sidebarItems(sources: SidebarLayoutSources): readonly SidebarItem[] {
  return SIDEBAR_ITEM_GROUPS.flatMap(group => groupItems(group, sources[group]))
}

/**
 * Whether two published snapshots describe the same layout. A locale refresh or
 * a slot tick that changed nothing must not wake every subscriber — the layout
 * store is read by the column on every render.
 * @param left - the published snapshot.
 * @param right - the candidate snapshot.
 * @returns whether the two describe the same rows and hidden set.
 */
export function sameSidebarLayout(left: SidebarLayoutSnapshot, right: SidebarLayoutSnapshot): boolean {
  if (left.hidden.length !== right.hidden.length) return false
  if (left.hidden.some((id, index) => id !== right.hidden[index])) return false
  if (left.items.length !== right.items.length) return false
  return left.items.every((item, index) => {
    const candidate = right.items[index]
    return candidate.id === item.id
      && candidate.group === item.group && candidate.title === item.title
  })
}

/**
 * Read/write face of the persisted layout choice (useSyncExternalStore-compatible).
 */
export interface SidebarLayoutPreference {
  /** @returns the current hidden ids (stable reference between changes). */
  get(): readonly string[]
  /**
   * Observe preference changes.
   * @param listener - called after every mutation that changes the hidden set.
   * @returns the unsubscribe disposer.
   */
  subscribe(listener: () => void): () => void
  /**
   * Show or hide one entry by id. An explicit show wins over the deployment's
   * shipped-hidden default; an explicit hide always wins.
   * @param id - the row's stable id.
   * @param visible - whether the column draws the row.
   */
  setVisible(id: string, visible: boolean): void
  /**
   * Clear every explicit choice, so the column returns to the deployment's
   * shipped defaults: the entries it ships hidden are hidden again and every
   * other entry shows.
   */
  reset(): void
}

/**
 * Normalize a rehydrated id list: drop blank ids and duplicates so the stored
 * value stays a set. Non-string entries arrive only from a corrupted blob and
 * are dropped rather than trusted.
 * @param value - the rehydrated field, read as unknown JSON.
 * @returns the normalized id list.
 */
function normalizeIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') continue
    seen.add(entry)
  }
  return [...seen]
}

/**
 * Whether rehydrated raw JSON already matches its normalized id list.
 * @param raw - the field as loaded from storage.
 * @param ids - its normalized form.
 * @returns whether a rewrite would change nothing.
 */
function matchesNormalized(raw: unknown, ids: readonly string[]): boolean {
  if (!Array.isArray(raw) || raw.length !== ids.length) return false
  return ids.every((id, index) => raw[index] === id)
}

/** The persisted layout choice: the ids the user hid and the ids the user explicitly showed. */
interface StoredSidebarLayout {
  readonly hidden: readonly string[]
  readonly shown: readonly string[]
}

/**
 * Create the left column's layout preference. The instance lives with the
 * plugin, so the choice survives column mount cycles; the localStorage blob
 * survives page loads, and storage failures only disable persistence.
 * @returns the preference face.
 */
export function createSidebarLayoutPreference(): SidebarLayoutPreference {
  const shipped = shippedHiddenEntryIds()
  const store = createSnapshotStore<StoredSidebarLayout>(
    { hidden: [], shown: [] },
    { persist: { name: SIDEBAR_LAYOUT_STORAGE_KEY } },
  )
  // Resolve visibility from both explicit lists plus the shipped defaults: a
  // shipped-hidden entry stays hidden until shown, a hidden entry stays hidden
  // even if a later build ships it visible, and `shown` wins over both.
  const resolveHidden = (state: StoredSidebarLayout): readonly string[] => {
    const shown = new Set(state.shown)
    return [...new Set([...shipped, ...state.hidden])].filter(id => !shown.has(id))
  }
  let snapshot: readonly string[] | undefined
  const read = (): readonly string[] => {
    snapshot ??= resolveHidden(store.getSnapshot())
    return snapshot
  }
  const write = (state: StoredSidebarLayout): void => {
    // Refresh before the store notifies, so a subscriber's `get()` during the
    // notification already returns the new list.
    snapshot = resolveHidden(state)
    store.set(state)
  }
  // Rehydration loads the stored blob verbatim. Normalize it once here — a blob
  // written before the explicit-show list existed carries only `hidden` — so
  // the set contract holds before any reader subscribes.
  const stored = store.getSnapshot()
  const legacyShown: unknown = (stored as { shown?: unknown }).shown
  const hidden = normalizeIds(stored.hidden)
  const shown = normalizeIds(legacyShown)
  if (!matchesNormalized(stored.hidden, hidden) || !matchesNormalized(legacyShown, shown)) {
    store.set({ hidden, shown })
  }
  return {
    get: read,
    subscribe: listener => store.subscribe(listener),
    setVisible: (id, visible) => {
      const state = store.getSnapshot()
      if (visible === !read().includes(id)) return
      write({
        hidden: visible
          ? state.hidden.filter(entry => entry !== id)
          : [...new Set([...state.hidden, id])],
        shown: visible
          ? [...new Set([...state.shown, id])]
          : state.shown.filter(entry => entry !== id),
      })
    },
    reset: () => {
      const state = store.getSnapshot()
      if (state.hidden.length === 0 && state.shown.length === 0) return
      write({ hidden: [], shown: [] })
    },
  }
}
