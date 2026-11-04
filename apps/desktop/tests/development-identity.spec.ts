/**
 * The development lanes own their Web ports, inspector ports and Harness home: a
 * lane runs beside every installed brand and beside another checkout's lanes, and
 * never writes into a home another application exports into the environment.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { BRAND_DIRECTORY, BRAND_PORT_BLOCK, readBrandManifest, shippedBrand } from '../scripts/brand-manifest.mjs'
import { developmentLaneHome, developmentLanePorts } from '../scripts/development-identity.ts'

/** Shipped brand directory name, used by the manifest fixtures below. */
const SHIPPED_KEY = 'daxuedazi'

/** @returns a temporary directory removed when the test finishes. */
function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  onTestFinished(() => { rmSync(directory, { recursive: true, force: true }) })
  return directory
}

/**
 * An operating-system home holding the two manifests this checkout ships, and
 * nothing else.
 * @returns Home directory and the brand directory holding both manifests.
 */
function brandHomes(): { homeDirectory: string; brandDirectory: string } {
  const homeDirectory = temporaryDirectory('dsh-lane-home-')
  const brandDirectory = join(homeDirectory, 'brands')
  mkdirSync(brandDirectory)
  for (const key of [SHIPPED_KEY, 'birdcoder']) {
    writeFileSync(join(brandDirectory, `${key}.json`), JSON.stringify(readBrandManifest(join(BRAND_DIRECTORY, `${key}.json`))))
  }
  return { homeDirectory, brandDirectory }
}

it('lays each lane and its inspectors out inside the brand port block', () => {
  expect(developmentLanePorts(shippedBrand())).toEqual({
    web: { development: 19401, online: 19402 },
    inspectors: {
      development: { main: 19403, renderer: 19404, host: 19405 },
      online: { main: 19406, renderer: 19407, host: 19408 },
    },
  })
  // The second brand keeps the Web ports this checkout used before the port was
  // brand-scoped; its inspectors sit in the rest of its own block.
  expect(developmentLanePorts(readBrandManifest(join(BRAND_DIRECTORY, 'birdcoder.json')))).toEqual({
    web: { development: 19388, online: 19389 },
    inspectors: {
      development: { main: 19390, renderer: 19391, host: 19392 },
      online: { main: 19393, renderer: 19394, host: 19395 },
    },
  })
})

it('never gives a lane or an inspector a port an installed brand or the other lane serves', () => {
  const ports = [shippedBrand(), readBrandManifest(join(BRAND_DIRECTORY, 'birdcoder.json'))]
    .flatMap((brand) => {
      const { web, inspectors } = developmentLanePorts(brand)
      return [
        brand.desktop.webPort,
        web.development,
        web.online,
        inspectors.development.main,
        inspectors.development.renderer,
        inspectors.development.host,
        inspectors.online.main,
        inspectors.online.renderer,
        inspectors.online.host,
      ]
    })
  // Nine ports per brand, all distinct: the block layout is what makes the set
  // collision-free rather than the individual values.
  expect(ports).toHaveLength(BRAND_PORT_BLOCK * 2)
  expect(new Set(ports).size).toBe(ports.length)
})

it('uses the lane home when the environment names none', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const defaultHome = join(homeDirectory, 'lane')
  for (const environment of [{}, { DSH_HOME: '' }, { DSH_HOME: '   ' }]) {
    expect(developmentLaneHome({ brand: shippedBrand(), environment, defaultHome, homeDirectory, brandDirectory }))
      .toEqual({ home: defaultHome })
  }
})

it('keeps an explicit home that no brand owns', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const scratch = join(homeDirectory, 'scratch')
  expect(developmentLaneHome({
    brand: shippedBrand(),
    environment: { DSH_HOME: scratch },
    defaultHome: join(homeDirectory, 'lane'),
    homeDirectory,
    brandDirectory,
  })).toEqual({ home: scratch })
})

it('keeps this brand own home, so a deliberate look at it still works', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const brandHome = join(homeDirectory, '.daxuedazi')
  expect(developmentLaneHome({
    brand: shippedBrand(),
    environment: { DSH_HOME: brandHome },
    defaultHome: join(homeDirectory, 'lane'),
    homeDirectory,
    brandDirectory,
  })).toEqual({ home: brandHome })
})

it('refuses a home another brand exports into the child environment', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const defaultHome = join(homeDirectory, 'lane')
  const foreign = join(homeDirectory, '.birdcoder')
  const notices: string[] = []
  const result = developmentLaneHome({
    brand: shippedBrand(),
    environment: { DSH_HOME: foreign },
    defaultHome,
    homeDirectory,
    brandDirectory,
    warn: (line) => { notices.push(line) },
  })
  expect(result).toEqual({ home: defaultHome, refused: foreign, owner: 'birdcoder' })
  expect(notices).toHaveLength(1)
  expect(notices[0]).toContain(foreign)
  expect(notices[0]).toContain(defaultHome)
})

it('refuses the upstream home as well', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const defaultHome = join(homeDirectory, 'lane')
  expect(developmentLaneHome({
    brand: shippedBrand(),
    environment: { DSH_HOME: join(homeDirectory, '.dsh') },
    defaultHome,
    homeDirectory,
    brandDirectory,
  })).toMatchObject({ home: defaultHome, owner: 'dsh' })
})

it.runIf(process.platform === 'win32')('refuses a foreign home that differs only in letter case', () => {
  const { homeDirectory, brandDirectory } = brandHomes()
  const defaultHome = join(homeDirectory, 'lane')
  const foreign = join(homeDirectory, '.BIRDCODER')
  expect(developmentLaneHome({
    brand: shippedBrand(),
    environment: { DSH_HOME: foreign },
    defaultHome,
    homeDirectory,
    brandDirectory,
  })).toMatchObject({ home: defaultHome, owner: 'birdcoder' })
})
