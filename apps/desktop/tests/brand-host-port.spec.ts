/**
 * The Desktop Host's loopback Web port belongs to the brand: an installed copy of
 * another brand keeps its own listener instead of losing startup to `EADDRINUSE`.
 */

import { join } from 'node:path'
import { expect, it } from 'vitest'
import { BRAND_DIRECTORY, readBrandManifest, shippedBrand } from '../scripts/brand-manifest.mjs'
import { HOST_WEB_PORT_ENV, hostWebPort } from '../src/brand.ts'

it('serves the shipped brand on its own port', () => {
  expect(shippedBrand().desktop.webPort).toBe(19400)
  expect(hostWebPort(shippedBrand(), {})).toBe('19400')
})

it('never shares a port with the second brand', () => {
  const other = readBrandManifest(join(BRAND_DIRECTORY, 'birdcoder.json'))
  expect(other.desktop.webPort).toBe(19387)
  expect(hostWebPort(other, {})).not.toBe(hostWebPort(shippedBrand(), {}))
})

it('lets a launch that names a port win, including the empty override', () => {
  expect(hostWebPort(shippedBrand(), { [HOST_WEB_PORT_ENV]: '19500' })).toBe('19500')
  // A blank value is not a port: the brand default applies.
  expect(hostWebPort(shippedBrand(), { [HOST_WEB_PORT_ENV]: '' })).toBe('19400')
  expect(hostWebPort(shippedBrand(), { [HOST_WEB_PORT_ENV]: '  ' })).toBe('19400')
})

it('passes a malformed explicit port through so the Host reports it', () => {
  expect(hostWebPort(shippedBrand(), { [HOST_WEB_PORT_ENV]: 'not-a-port' })).toBe('not-a-port')
})
