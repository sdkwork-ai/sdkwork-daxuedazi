/**
 * The Experts center's composer entry points.
 *
 * `ui-sdkwork-capabilities` owns the composer's Experts row, but the expert
 * flows belong to the Markets mode: the cloud catalog and the My-experts
 * roster live on this page, and the guided create-expert flow runs through
 * this plugin's prompt dispatch. This module publishes the optional
 * `ctx.marketsExperts` service those picks call, plus a request ledger the
 * page consumes. A landing is a published value rather than an event, so a
 * request made while the market surface is closed still lands when it opens.
 * @module @deepseek-ai/dsh-client-ui-sdkwork-markets/experts-entry
 */

import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

/** Which Experts surface a composer pick asked for. */
export type ExpertsEntryRequest = 'market' | 'mine'

/** Dependencies the entry points drive. */
export interface CreateExpertsEntryOptions {
  /** Open the market surface in the center column. */
  openPanel(): void
  /** Dispatch one composed prompt into a fresh conversation. */
  dispatchPrompt(text: string): void
  /** @returns the localized guided create-expert prompt. */
  createPrompt(): string
}

/** The optional service face published as `ctx.marketsExperts`. */
export interface ExpertsEntryService {
  /** Start a guided create-expert conversation. */
  createExpert(): void
  /** Open the cloud expert catalog on the Experts tab. */
  openMarket(): void
  /** Open the My-experts page, where experts are created and managed. */
  openMine(): void
}

/** The request ledger, its acknowledgement, and the published service. */
export interface ExpertsEntry {
  /** The pending landing the page binds beside its other live sources. */
  readonly hooks: { readonly expertsRequest: HostObservable<ExpertsEntryRequest | undefined> }
  /** Clear the request once the page has applied it. */
  handled(): void
  /** Register this as `ctx.marketsExperts`. */
  readonly service: ExpertsEntryService
}

/**
 * Create the Experts entry ledger and its service.
 * @param options - the market surface, prompt dispatch, and localized prompt.
 * @returns the page's request hook and the service to provide.
 */
export function createExpertsEntry(options: CreateExpertsEntryOptions): ExpertsEntry {
  let request: ExpertsEntryRequest | undefined
  const listeners = new Set<() => void>()
  const notify = (): void => { for (const listener of listeners) listener() }
  const publish = (next: ExpertsEntryRequest): void => {
    // Same order as `pluginNavigation.openBundle`: open the surface first,
    // then publish so a freshly mounted page observes the value too.
    options.openPanel()
    request = next
    notify()
  }
  return {
    hooks: {
      expertsRequest: {
        // A string or undefined between changes, so a subscriber's snapshot
        // stays reference-stable exactly as `useSyncExternalStore` requires.
        getSnapshot: () => request,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      },
    },
    handled() {
      if (request === undefined) return
      request = undefined
      notify()
    },
    service: {
      createExpert: () => { options.dispatchPrompt(options.createPrompt()) },
      openMarket: () => { publish('market') },
      openMine: () => { publish('mine') },
    },
  }
}
