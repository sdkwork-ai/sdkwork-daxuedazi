/**
 * Each brand owns its Harness home: a packaged launch creates an empty
 * `~/.<home.dirName>` and never reads, moves, links or writes the upstream
 * `~/.dsh` that DeepSeek Harness keeps using.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { parseBrandManifest } from '../scripts/brand-manifest.mjs'
import type { BrandHomeFileSystem } from '../src/brand.ts'
import { applyBrandBootstrap, applyBrandHome, resolveRuntimeBrand } from '../src/brand.ts'

/** The brand this checkout ships. */
const SHIPPED = parseBrandManifest({
  schemaVersion: 1,
  key: 'daxuedazi',
  displayName: 'daxuedazi',
  companyName: 'SDKWork',
  home: { dirName: '.daxuedazi' },
  desktop: {
    appId: 'com.sdkwork.daxuedazi', releaseRepository: 'sdkwork-ai/sdkwork-daxuedazi', productName: 'daxuedazi',
    executableName: 'daxuedazi', protocol: 'daxuedazi', commandName: 'daxuedazi', registryKey: 'DaXueDaZi',
    updaterCacheDirName: 'daxuedazi-updater', artifactPrefix: 'daxuedazi', webPort: 19400,
  },
})

/** @returns a temporary operating-system home removed when the test finishes. */
function operatingSystemHome(): string {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-brand-home-'))
  onTestFinished(() => { rmSync(directory, { recursive: true, force: true }) })
  return directory
}

/** A filesystem facade whose directory creation can fail on demand. */
function recordingFiles(failure?: Error): BrandHomeFileSystem & { created: string[] } {
  const created: string[] = []
  return {
    created,
    exists: path => existsSync(path),
    create: (path) => {
      if (failure !== undefined) throw failure
      mkdirSync(path, { recursive: true })
      created.push(path)
    },
  }
}

it('keeps an explicit DSH_HOME and creates no home', () => {
  const home = operatingSystemHome()
  mkdirSync(join(home, '.dsh'))
  const files = recordingFiles()
  const env: Record<string, string | undefined> = { DSH_HOME: join(home, 'elsewhere') }
  const result = applyBrandHome({ brand: SHIPPED, env, homeDirectory: home, files })
  expect(result).toEqual({ home: join(home, 'elsewhere'), source: 'env' })
  expect(files.created).toEqual([])
  expect(existsSync(join(home, '.daxuedazi'))).toBe(false)
})

it('creates an empty brand home on the first packaged launch and leaves the upstream home alone', () => {
  const home = operatingSystemHome()
  mkdirSync(join(home, '.dsh'))
  writeFileSync(join(home, '.dsh', 'credentials.yaml'), 'upstream')
  const warnings: string[] = []
  const env: Record<string, string | undefined> = {}
  const result = applyBrandHome({
    brand: SHIPPED,
    env,
    homeDirectory: home,
    warn: (line) => { warnings.push(line) },
  })
  expect(result).toEqual({ home: join(home, '.daxuedazi'), source: 'brand' })
  expect(env.DSH_HOME).toBe(join(home, '.daxuedazi'))
  expect(readdirSync(join(home, '.daxuedazi'))).toEqual([])
  expect(readdirSync(join(home, '.dsh'))).toEqual(['credentials.yaml'])
  expect(readFileSync(join(home, '.dsh', 'credentials.yaml'), 'utf8')).toBe('upstream')
  expect(warnings).toEqual([])
})

it('reuses an existing brand home without rewriting it', () => {
  const home = operatingSystemHome()
  mkdirSync(join(home, '.daxuedazi'))
  writeFileSync(join(home, '.daxuedazi', 'credentials.yaml'), 'brand')
  const files = recordingFiles()
  const env: Record<string, string | undefined> = {}
  const result = applyBrandHome({ brand: SHIPPED, env, homeDirectory: home, files })
  expect(result).toEqual({ home: join(home, '.daxuedazi'), source: 'brand' })
  expect(files.created).toEqual([])
  expect(readFileSync(join(home, '.daxuedazi', 'credentials.yaml'), 'utf8')).toBe('brand')
})

it('keeps the brand home when it cannot be created, and reports it', () => {
  const home = operatingSystemHome()
  const warnings: string[] = []
  const env: Record<string, string | undefined> = {}
  const result = applyBrandHome({
    brand: SHIPPED,
    env,
    homeDirectory: home,
    files: recordingFiles(new Error('EACCES')),
    warn: (line) => { warnings.push(line) },
  })
  expect(result).toEqual({ home: join(home, '.daxuedazi'), source: 'brand' })
  expect(env.DSH_HOME).toBe(join(home, '.daxuedazi'))
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toContain('could not create')
})

it('applies nothing outside an installed application or the development launcher', () => {
  const home = operatingSystemHome()
  const env: Record<string, string | undefined> = {}
  const brand = resolveRuntimeBrand({ appPath: 'desktop-test-app', resourcesPath: 'relative-resources', env })
  expect(brand.key).toBe('daxuedazi')
  expect(applyBrandBootstrap({ brand, packaged: false, env, resourcesPath: 'relative-resources', homeDirectory: home }))
    .toEqual({ brand, home: undefined })
  expect(env.DSH_HOME).toBeUndefined()
})

it('reads a packaged brand manifest, creates its home, and defaults the OEM profile', () => {
  const home = operatingSystemHome()
  const resources = join(home, 'resources')
  mkdirSync(resources)
  writeFileSync(join(resources, 'brand.json'), JSON.stringify({
    schemaVersion: 1,
    key: 'acme',
    displayName: 'Acme',
    companyName: 'Acme',
    home: { dirName: '.acme' },
    desktop: {
      appId: 'com.acme.harness', releaseRepository: 'acme/harness-releases', productName: 'Acme Harness', executableName: 'acme', protocol: 'acme',
      commandName: 'acme', registryKey: 'Acme', updaterCacheDirName: 'acme-updater', artifactPrefix: 'Acme', webPort: 19500,
    },
  }))
  writeFileSync(join(resources, 'oem.json'), JSON.stringify({ brand: { name: 'Acme' } }))
  const env: Record<string, string | undefined> = { DSH_DESKTOP_DEV_APP: '1' }
  const brand = resolveRuntimeBrand({ resourcesPath: resources, env })
  expect(brand.home.dirName).toBe('.acme')

  const bootstrap = applyBrandBootstrap({ brand, packaged: false, env, resourcesPath: resources, homeDirectory: home })
  expect(bootstrap.home).toMatchObject({ home: join(home, '.acme'), source: 'brand' })
  expect(env.DSH_HOME).toBe(join(home, '.acme'))
  expect(existsSync(join(home, '.acme'))).toBe(true)
  expect(env.DSH_OEM_CONFIG).toBe(join(resources, 'oem.json'))
})

it('lets a home oem.json win over the shipped profile', () => {  const home = operatingSystemHome()
  const resources = join(home, 'resources')
  mkdirSync(resources)
  mkdirSync(join(home, '.acme'))
  writeFileSync(join(home, '.acme', 'oem.json'), JSON.stringify({ brand: { name: 'Local' } }))
  writeFileSync(join(resources, 'brand.json'), JSON.stringify({
    schemaVersion: 1, key: 'acme', displayName: 'Acme', companyName: 'Acme', home: { dirName: '.acme' },
    desktop: {
      appId: 'com.acme.harness', releaseRepository: 'acme/harness-releases', productName: 'Acme Harness', executableName: 'acme', protocol: 'acme',
      commandName: 'acme', registryKey: 'Acme', updaterCacheDirName: 'acme-updater', artifactPrefix: 'Acme', webPort: 19500,
    },
  }))
  writeFileSync(join(resources, 'oem.json'), JSON.stringify({ brand: { name: 'Shipped' } }))
  const env: Record<string, string | undefined> = { DSH_DESKTOP_DEV_APP: '1' }
  const brand = resolveRuntimeBrand({ resourcesPath: resources, env })
  applyBrandBootstrap({ brand, packaged: false, env, resourcesPath: resources, homeDirectory: home })
  expect(env.DSH_OEM_CONFIG).toBeUndefined()
})

it('renders the installed CLI launchers for a brand command and home', async () => {
  const directory = operatingSystemHome()
  const manifest = join(directory, 'acme.json')
  writeFileSync(manifest, JSON.stringify({
    schemaVersion: 1, key: 'acme', displayName: 'Acme', companyName: 'Acme', home: { dirName: '.acme' },
    desktop: {
      appId: 'com.acme.harness', releaseRepository: 'acme/harness-releases', productName: 'Acme Harness', executableName: 'acme', protocol: 'acme',
      commandName: 'acme', registryKey: 'Acme', updaterCacheDirName: 'acme-updater', artifactPrefix: 'Acme', webPort: 19500,
    },
  }))
  const { prepareDesktopCli } = await import('../scripts/prepare-cli.ts')
  prepareDesktopCli(directory, 'win32', { DSH_BRAND_CONFIG: manifest })
  const windows = readFileSync(join(directory, 'bin', 'acme.cmd'), 'utf8')
  expect(windows).toContain('acme.exe')
  expect(windows).toContain('%USERPROFILE%\\.acme')
  expect(windows).not.toContain('daxuedazi')

  prepareDesktopCli(directory, 'darwin', { DSH_BRAND_CONFIG: manifest })
  const unix = readFileSync(join(directory, 'bin', 'acme'), 'utf8')
  expect(unix).toContain('MacOS/acme')
  expect(unix).toContain('DSH_HOME="$HOME/.acme"')
})
