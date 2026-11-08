/**
 * Composer Experts entry spec: the optional `ctx.marketsExperts` service
 * publishes page landings as acknowledged values (so a request made while the
 * market surface is closed still lands when it opens) and routes the guided
 * create flow through the market's prompt dispatch.
 */
import { describe, expect, it, vi } from 'vitest'
import { createExpertsEntry } from '../src/client/expertsEntry.ts'

function harness() {
  const openPanel = vi.fn()
  const dispatchPrompt = vi.fn()
  const entry = createExpertsEntry({
    openPanel,
    dispatchPrompt,
    createPrompt: () => 'create an expert',
  })
  return { entry, openPanel, dispatchPrompt }
}

describe('composer Experts entry', () => {
  it('publishes a landing, opens the surface, and acknowledges it once', () => {
    const { entry, openPanel } = harness()
    const listener = vi.fn()
    const unsubscribe = entry.hooks.expertsRequest.subscribe(listener)
    expect(entry.hooks.expertsRequest.getSnapshot()).toBeUndefined()

    entry.service.openMarket()
    expect(openPanel).toHaveBeenCalledOnce()
    expect(entry.hooks.expertsRequest.getSnapshot()).toBe('market')
    expect(listener).toHaveBeenCalledTimes(1)

    entry.handled()
    expect(entry.hooks.expertsRequest.getSnapshot()).toBeUndefined()
    expect(listener).toHaveBeenCalledTimes(2)
    // Acknowledging an already-consumed request publishes nothing.
    entry.handled()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('replaces a pending landing with the latest pick', () => {
    const { entry, openPanel } = harness()
    entry.service.openMarket()
    entry.service.openMine()
    expect(openPanel).toHaveBeenCalledTimes(2)
    expect(entry.hooks.expertsRequest.getSnapshot()).toBe('mine')
    entry.handled()
    expect(entry.hooks.expertsRequest.getSnapshot()).toBeUndefined()
  })

  it('dispatches the guided create prompt without opening a page', () => {
    const { entry, openPanel, dispatchPrompt } = harness()
    entry.service.createExpert()
    expect(dispatchPrompt).toHaveBeenCalledWith('create an expert')
    expect(openPanel).not.toHaveBeenCalled()
    expect(entry.hooks.expertsRequest.getSnapshot()).toBeUndefined()
  })
})
