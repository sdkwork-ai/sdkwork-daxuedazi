/** The Desktop Host Web port is a launch fact; every launch names the selected brand's port. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readBrands } from '../../desktop/scripts/brand-manifest.mjs'
import { DESKTOP_HOST_WEB_PORT_ENV, resolveDesktopHostWebPort } from '../src/web-port.ts'

const DEVELOPMENT_LAUNCHER = fileURLToPath(new URL('../../desktop/scripts/dev.ts', import.meta.url))

describe('Desktop Host Web port', () => {
  it('requires the launch environment to name the port', () => {
    // Any fixed fallback equals some brand's port, so a missing value is a
    // launch bug rather than a reason to reuse another brand's listener.
    expect(() => resolveDesktopHostWebPort({})).toThrow(`${DESKTOP_HOST_WEB_PORT_ENV} must be set`)
    expect(() => resolveDesktopHostWebPort({ [DESKTOP_HOST_WEB_PORT_ENV]: '' })).toThrow(`${DESKTOP_HOST_WEB_PORT_ENV} must be set`)
  })

  it('takes the port the launch environment selects', () => {
    expect(resolveDesktopHostWebPort({ [DESKTOP_HOST_WEB_PORT_ENV]: '19388' })).toBe(19388)
    expect(resolveDesktopHostWebPort({ [DESKTOP_HOST_WEB_PORT_ENV]: '65535' })).toBe(65_535)
  })

  it.each(['0', '65536', '-1', '1.5', 'http'])('rejects %s instead of falling back to a default', (value) => {
    expect(() => resolveDesktopHostWebPort({ [DESKTOP_HOST_WEB_PORT_ENV]: value }))
      .toThrow(`${DESKTOP_HOST_WEB_PORT_ENV} must be an integer from 1 through 65535`)
  })

  it('keeps the workspace launcher on its own brand-derived lane port', () => {
    // A rename on either side would put development back on the packaged port and let the
    // launcher's own availability probe pass while the Host still fails to bind.
    const launcher = readFileSync(DEVELOPMENT_LAUNCHER, 'utf8')
    expect(launcher).toContain(DESKTOP_HOST_WEB_PORT_ENV)
    expect(launcher).toMatch(/lanePorts\.web\[lane\]/u)
    // The launcher derives its port from the brand's block; a predecessor literal
    // here would collide with an installed brand.
    for (const brand of readBrands()) expect(launcher).not.toContain(String(brand.desktop.webPort))
    expect(launcher).not.toContain('19387')
  })
})
