/**
 * Brand home: which Harness home this application brand owns.
 *
 * Every user-data root — sessions, credentials, profiles, plugins, workspaces —
 * derives from `DSH_HOME`, which the launcher resolves before any plugin mounts.
 * A brand therefore cannot pick its home from `oem.json`: that file already lives
 * inside the home. The home directory name comes from the packaged brand
 * manifest instead (`resources/brand.json`), and the launcher exports the result
 * as `DSH_HOME` so the Electron shell, the Desktop Host and every child process
 * agree without touching the upstream home-paths default.
 *
 * Precedence, highest first: an explicit `DSH_HOME`, then the brand's own
 * directory, which this module creates when it is absent. The upstream `~/.dsh`
 * is never read, moved, linked or written: an installed DeepSeek Harness keeps
 * its sessions there, and the two products own disjoint data.
 *
 * @module brand
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import {
  BRAND_FILENAME,
  parseBrandManifest,
  readBrandManifest,
  resolveBrand,
  shippedBrand,
  type DesktopBrand,
} from '#brand-manifest'

/** Directory name of the upstream Harness home, which no brand reads or writes. */
export const UPSTREAM_DSH_HOME_DIR_NAME = '.dsh'

/**
 * Environment variable the Desktop Host reads for its loopback Web port.
 *
 * `apps/desktop-host/src/web-port.ts` reads the same name in the child process;
 * the shell writes it from the brand so two installed brands never contend for
 * one listener.
 */
export const HOST_WEB_PORT_ENV = 'DSH_DESKTOP_HOST_WEB_PORT'

/** File name an application may ship beside `brand.json` as its deployment OEM defaults. */
export const SHIPPED_OEM_FILENAME = 'oem.json'

/** Filesystem operations the brand-home decision needs; the shell passes the synchronous defaults. */
export interface BrandHomeFileSystem {
  /** @returns whether the path exists. */
  exists(path: string): boolean
  /** Create one directory, including missing parents. */
  create(path: string): void
}

const nodeFiles: BrandHomeFileSystem = {
  exists: path => existsSync(path),
  create: (path) => { mkdirSync(path, { recursive: true }) },
}

/** Where one launch's home came from. */
export type BrandHomeSource = 'env' | 'brand'

/** Resolved home of one launch. */
export interface BrandHomeResult {
  /** Absolute home this launch and every child process use. */
  readonly home: string
  /** Which input decided {@link home}. */
  readonly source: BrandHomeSource
}

/** Inputs for {@link applyBrandHome}. */
export interface ApplyBrandHomeOptions {
  /** Brand whose home this launch owns. */
  readonly brand: DesktopBrand
  /** Mutable launch environment; a resolved `DSH_HOME` is written back into it. */
  readonly env: Record<string, string | undefined>
  /** Operating-system home holding the brand directory; defaults to `os.homedir()`. */
  readonly homeDirectory?: string
  /** Filesystem facade; defaults to the synchronous `node:fs` operations. */
  readonly files?: BrandHomeFileSystem
  /** Sink for one-line diagnostics; omitted disables them. */
  readonly warn?: (line: string) => void
}

/**
 * Absolute home one brand owns under an operating-system home.
 * @param brand - Brand manifest.
 * @param homeDirectory - Operating-system home directory.
 * @returns Absolute brand home path.
 */
export function brandHomePath(brand: DesktopBrand, homeDirectory: string = homedir()): string {
  return join(homeDirectory, brand.home.dirName)
}

/**
 * Loopback port this launch hands the Desktop Host.
 *
 * The port belongs to the brand, so an installed copy of another brand keeps its
 * own listener instead of losing startup to `EADDRINUSE`; a launch that names a
 * port explicitly still wins, which is how the development lanes and a portable
 * install move it. A malformed explicit value is passed through unchanged so the
 * Host rejects it with its own message rather than the shell guessing a port.
 * @param brand - Brand this launch runs as.
 * @param environment - Launch environment naming the port, if any.
 * @returns Decimal port string for {@link HOST_WEB_PORT_ENV}.
 */
export function hostWebPort(brand: DesktopBrand, environment: Record<string, string | undefined>): string {
  const configured = environment[HOST_WEB_PORT_ENV]?.trim()
  return configured === undefined || configured === '' ? String(brand.desktop.webPort) : configured
}

/**
 * Resolve this launch's home and record it in `DSH_HOME`.
 *
 * An explicit `DSH_HOME` wins untouched. Otherwise the launch uses the brand's
 * own directory, creating it when it is missing so the first packaged start
 * begins with an empty home instead of inheriting another product's data. The
 * upstream `~/.dsh` is never consulted: DeepSeek Harness and the `dsh` CLI keep
 * every session, credential and workspace it holds, whichever brand is running.
 * @param options - Brand, mutable environment, and optional filesystem facade.
 * @returns the home this launch uses, and which input decided it.
 */
export function applyBrandHome(options: ApplyBrandHomeOptions): BrandHomeResult {
  const { brand, env } = options
  const homeDirectory = options.homeDirectory ?? homedir()
  const files = options.files ?? nodeFiles

  const configured = env.DSH_HOME
  if (configured !== undefined && configured.trim() !== '') {
    return { home: resolveDshHome(undefined, env), source: 'env' }
  }
  const brandHome = brandHomePath(brand, homeDirectory)
  if (!files.exists(brandHome)) {
    try {
      files.create(brandHome)
    } catch (error) {
      // A home that cannot be created fails at the first write, which names the
      // file it wanted; refusing to launch here would report less.
      options.warn?.(`brand home: could not create ${brandHome} (${String(error)}); using it anyway`)
    }
  }
  env.DSH_HOME = brandHome
  return { home: brandHome, source: 'brand' }
}

/** Inputs for {@link resolveRuntimeBrand}. */
export interface RuntimeBrandOptions {
  /** `app.getAppPath()`; a source checkout resolves `brands/<key>.json` from it. */
  readonly appPath?: string
  /** `process.resourcesPath`; a packaged application carries `brand.json` here. */
  readonly resourcesPath?: string
  /** Launch environment; read for `DSH_BRAND`, `DSH_BRAND_CONFIG`. */
  readonly env?: Record<string, string | undefined>
  /** Sink for one-line diagnostics; omitted disables them. */
  readonly warn?: (line: string) => void
}

/**
 * Resolve the brand this application was packaged as.
 *
 * A packaged application reads `resources/brand.json`, the file packaging wrote
 * from the selected `brands/<key>.json`. A source launch reads the checkout's
 * manifest for `DSH_BRAND`, and a repository without one falls back to the
 * shipped brand. Nothing here writes user data.
 * @param options - Application paths and launch environment.
 * @returns the brand manifest this launch runs as.
 */
export function resolveRuntimeBrand(options: RuntimeBrandOptions = {}): DesktopBrand {
  const env = options.env ?? process.env
  const resourcesPath = options.resourcesPath
  if (resourcesPath !== undefined && isAbsolute(resourcesPath)) {
    const shippedPath = join(resourcesPath, BRAND_FILENAME)
    if (existsSync(shippedPath)) return readBrandManifest(shippedPath)
    options.warn?.(`brand: ${shippedPath} is missing; falling back to the checkout manifest`)
  }
  try {
    return resolveBrand(env)
  } catch (error) {
    options.warn?.(`brand: ${String(error)}; falling back to the shipped brand`)
    return shippedBrand()
  }
}

/** Inputs for {@link applyBrandBootstrap}. */
export interface BrandBootstrapOptions extends RuntimeBrandOptions {
  /** Brand this application runs as. */
  readonly brand: DesktopBrand
  /** Whether the shell runs from an installed application. */
  readonly packaged: boolean
  /** Operating-system home; defaults to `os.homedir()`. */
  readonly homeDirectory?: string
  /** Filesystem facade; defaults to the synchronous `node:fs` operations. */
  readonly files?: BrandHomeFileSystem
}

/** What a launch learned about its brand home. */
export interface BrandBootstrap {
  /** Brand this launch runs as. */
  readonly brand: DesktopBrand
  /** Resolved home, or undefined when this launch leaves `DSH_HOME` alone. */
  readonly home: BrandHomeResult | undefined
}

/**
 * Apply a launch's brand home and deployment OEM defaults.
 *
 * Only an installed application and the development launcher apply the brand
 * home; a bare Electron import (unit tests, a stray `electron .`) must not create
 * or adopt the user's home. Every launch still reports the brand it runs as through
 * `DSH_BRAND_PROTOCOL`, because that is manifest data the Host needs to derive
 * the brand's OAuth identity. A shipped `resources/oem.json` becomes the default
 * `DSH_OEM_CONFIG` when the home carries no `oem.json` of its own, so a
 * deployment can ship its endpoints read-only and a user can still override them
 * from the home.
 * @param options - Brand, application paths, packaged state and environment.
 * @returns the resolved brand and, when applied, the home this launch uses.
 */
export function applyBrandBootstrap(options: BrandBootstrapOptions): BrandBootstrap {
  const env = options.env ?? process.env
  const resourcesPath = options.resourcesPath
  const installed = options.packaged && resourcesPath !== undefined && isAbsolute(resourcesPath)
  // The scheme is manifest data, not user data: every launch reports the brand it
  // runs as, so the Host derives that brand's OAuth client and callback — and
  // rejects a profile naming another brand's — even when this launch leaves the
  // user's home alone (a bare `electron .` or a unit-test import).
  env.DSH_BRAND_PROTOCOL = options.brand.desktop.protocol
  if (!installed && env.DSH_DESKTOP_DEV_APP !== '1') return { brand: options.brand, home: undefined }
  const home = applyBrandHome({
    brand: options.brand,
    env,
    ...options.homeDirectory === undefined ? {} : { homeDirectory: options.homeDirectory },
    ...options.files === undefined ? {} : { files: options.files },
    ...options.warn === undefined ? {} : { warn: options.warn },
  })
  if ((env.DSH_OEM_CONFIG ?? '').trim() === '' && !existsSync(join(home.home, SHIPPED_OEM_FILENAME))
    && resourcesPath !== undefined && isAbsolute(resourcesPath)) {
    const shippedOem = join(resourcesPath, SHIPPED_OEM_FILENAME)
    if (existsSync(shippedOem)) env.DSH_OEM_CONFIG = shippedOem
  }
  return { brand: options.brand, home }
}

/**
 * Parse a manifest the shell already loaded as text, for diagnostics or tests.
 * @param text - JSON text.
 * @param source - File or label named in validation errors.
 * @returns Frozen manifest.
 */
export function parseBrandText(text: string, source = 'brand manifest'): DesktopBrand {
  return parseBrandManifest(JSON.parse(text), source)
}
