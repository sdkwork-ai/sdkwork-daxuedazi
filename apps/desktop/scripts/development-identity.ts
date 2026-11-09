/**
 * Identity the source development lanes own: the loopback ports and the Harness
 * home one checkout's `pnpm dev:desktop` lanes use.
 *
 * FORK DIVERGENCE (AGENTS.md, "Desktop application identity"): both values belong
 * to the brand manifest, not to this launcher. A development shell runs beside the
 * installed applications of every brand and beside another checkout's lanes on the
 * same machine, so the fixed ports this file used to carry (19388, 19389, 9222,
 * 9229, 9230) collided with the second application's listener and with its
 * debugger. The brand's block of {@link BRAND_PORT_BLOCK} ports replaces them.
 * The Harness home would be an inherited `DSH_HOME`: a packaged application
 * exports its home into every child process, including a terminal a developer
 * starts this launcher from, so a lane that trusted it would write sessions,
 * credentials and profile rows into another application's home.
 *
 * @module development-identity
 */

import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { webBuildEnvironment, type WebBuildEnvironment } from '../../../scripts/web-build-environment.ts'
import { LEGACY_DSH_HOME_DIR_NAME } from '../src/brand.ts'
import { BRAND_DIRECTORY, BRAND_PORT_BLOCK, parseBrandManifest, type DesktopBrand } from './brand-manifest.mjs'
import { DEVELOPMENT_LANE_PROFILE, PRODUCTION_LANE_PROFILE, type LaneSdkworkProfile } from './sdkwork-lane-profiles.ts'

/** Inspector ports one lane exposes. */
export interface LaneInspectorPorts {
  /** Main-process Node inspector behind `--inspect`. */
  readonly main: number
  /** Renderer DevTools remote debugging port. */
  readonly renderer: number
  /** Desktop Host inspector. */
  readonly host: number
}

/** Every loopback port one brand's two source lanes use. */
export interface DevelopmentLanePorts {
  /** Web ports the lanes serve the Web application on. */
  readonly web: {
    /** Port of the `dev:desktop` lane. */
    readonly development: number
    /** Port of the `dev:desktop:online` lane. */
    readonly online: number
  }
  /** Inspector ports of each lane. */
  readonly inspectors: {
    /** Inspector ports of the `dev:desktop` lane. */
    readonly development: LaneInspectorPorts
    /** Inspector ports of the `dev:desktop:online` lane. */
    readonly online: LaneInspectorPorts
  }
}

/** Source lane whose installation and state one launch owns. */
export type DevelopmentLaneName = 'development' | 'online'

/** Every directory one source lane owns under the checkout's build root. */
export interface DevelopmentLaneDirectories {
  /** Root holding the lane's Harness home and browser data. */
  readonly stateRoot: string
  /** Default Harness home of the lane. */
  readonly home: string
  /** Electron browser data, including the single-instance lock. */
  readonly userData: string
  /**
   * Disposable npm project the lane's Electron shell loads.
   *
   * Each lane owns this directory rather than sharing one: preparing a project
   * replaces it, and a shared directory would let one lane delete the runtime a
   * running lane is serving from.
   */
  readonly project: string
  /** Directory the lane prepares its primary runtime payload into. */
  readonly runtimeRoot: string
  /** Prepared Node/pnpm/Python payload the lane's Host and plugin manager run. */
  readonly primaryRuntime: string
}

/**
 * Directories of one source lane.
 *
 * The lane's own state root keeps the installation the lane runs from and the
 * state it writes out of the checkout's release build target directory, so a
 * development launch can never rewrite the payload a release packaging run
 * consumes.
 * @param buildRoot - the checkout's `.desktop-build` directory.
 * @param lane - lane whose directories are resolved.
 * @returns absolute directories owned by the lane.
 */
export function developmentLaneDirectories(
  buildRoot: string,
  lane: DevelopmentLaneName,
): DevelopmentLaneDirectories {
  const stateRoot = resolve(buildRoot, lane)
  const runtimeRoot = join(stateRoot, 'runtime')
  return {
    stateRoot,
    home: join(stateRoot, 'home'),
    userData: join(stateRoot, 'electron-user-data'),
    project: join(stateRoot, 'project'),
    runtimeRoot,
    primaryRuntime: join(runtimeRoot, 'primary-runtime'),
  }
}

/**
 * SDKWork deployment one lane's built page must carry.
 *
 * The page embeds its deployment at build time, so the lane that launches it has
 * to prove the bundle matches its own profile instead of trusting that the last
 * build was its own.
 * @param lane - lane whose deployment is resolved.
 * @returns the record the lane's Web build must have written.
 */
export function developmentLaneWebEnvironment(lane: DevelopmentLaneName): WebBuildEnvironment {
  const profile: LaneSdkworkProfile = lane === 'online' ? PRODUCTION_LANE_PROFILE : DEVELOPMENT_LANE_PROFILE
  return webBuildEnvironment(profile.deploymentProfile, profile.environment)
}

/**
 * Ports of the two lanes, taken from the brand's {@link BRAND_PORT_BLOCK}:
 *
 * | Offset | Owner |
 * | --- | --- |
 * | `+0` | Installed shell, Web application (`desktop.webPort`) |
 * | `+1` | `dev:desktop` Web application |
 * | `+2` | `dev:desktop:online` Web application |
 * | `+3`-`+5` | `dev:desktop` main, renderer, Host inspectors |
 * | `+6`-`+8` | `dev:desktop:online` main, renderer, Host inspectors |
 *
 * The manifest validator caps a brand port so the whole block stays usable, and
 * `brandPortCollisions` refuses two brands whose blocks overlap, which is what
 * keeps every lane and every debugger clear of every installed brand and of the
 * other lane.
 * @param brand - Brand this checkout ships.
 * @returns Web and inspector ports of each lane.
 */
export function developmentLanePorts(brand: DesktopBrand): DevelopmentLanePorts {
  const base = brand.desktop.webPort
  const inspectors = (offset: number): LaneInspectorPorts => ({
    main: base + offset,
    renderer: base + offset + 1,
    host: base + offset + 2,
  })
  return {
    web: { development: base + 1, online: base + 2 },
    inspectors: { development: inspectors(3), online: inspectors(6) },
  }
}

/** Home one lane launch resolved, and the foreign home it refused. */
export interface DevelopmentLaneHome {
  /** Absolute Harness home this launch and every child process use. */
  readonly home: string
  /** Inherited `DSH_HOME` this launch refused, when another brand owns it. */
  readonly refused?: string
  /** Brand key, or `dsh`, that owns {@link refused}. */
  readonly owner?: string
}

/** Inputs of {@link developmentLaneHome}. */
export interface DevelopmentLaneHomeOptions {
  /** Brand this checkout ships. */
  readonly brand: DesktopBrand
  /** Launch environment; read for `DSH_HOME`. */
  readonly environment: Record<string, string | undefined>
  /** Absolute home to use when the environment names none this brand may use. */
  readonly defaultHome: string
  /** Operating-system home holding the brand directories; defaults to `os.homedir()`. */
  readonly homeDirectory?: string
  /** Directory of `<key>.json` manifests whose homes are refused; defaults to the checkout's `brands/`. */
  readonly brandDirectory?: string
  /** Sink for the one-line notice explaining a refused home; omitted stays silent. */
  readonly warn?: (line: string) => void
}

/**
 * Two absolute paths that name one location on this platform.
 * @param left - First absolute path.
 * @param right - Second absolute path.
 * @returns Whether both name the same directory.
 */
function samePath(left: string, right: string): boolean {
  const normalizedLeft = resolve(left)
  const normalizedRight = resolve(right)
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight
}

/**
 * Brand key owning a Harness home under the operating-system home.
 *
 * The legacy `~/.dsh` belongs to the upstream application, not to any brand.
 * A manifest that cannot be read is skipped: this check only refuses a home it
 * can prove another application owns, and the brand this launch runs as has
 * already been validated.
 * @param home - Absolute candidate home.
 * @param options - Brand, home directory, and manifest directory.
 * @returns Owning brand key, `dsh` for the legacy home, or undefined when no brand owns it.
 */
function foreignOwner(home: string, options: DevelopmentLaneHomeOptions): string | undefined {
  const homeDirectory = options.homeDirectory ?? homedir()
  const directory = options.brandDirectory ?? BRAND_DIRECTORY
  if (samePath(home, join(homeDirectory, LEGACY_DSH_HOME_DIR_NAME))) return 'dsh'
  let names: string[]
  try {
    names = readdirSync(directory).filter(name => name.endsWith('.json'))
  } catch {
    return undefined
  }
  for (const name of names) {
    let candidate: DesktopBrand
    try {
      candidate = parseBrandManifest(JSON.parse(readFileSync(join(directory, name), 'utf8')), name)
    } catch {
      continue
    }
    if (candidate.key === options.brand.key) continue
    if (samePath(home, join(homeDirectory, candidate.home.dirName))) return candidate.key
  }
  return undefined
}

/**
 * Resolve the Harness home one lane launch owns.
 *
 * An explicit `DSH_HOME` is honored, which is how tests, portable setups and a
 * deliberate look at another home work, except when another brand owns it: a
 * packaged application exports its home into every child process, so that value
 * arrives from outside this launch and using it would let this checkout edit the
 * other application's sessions, credentials and profile. The lane's own state
 * root is used instead, and the notice names the refused home so the cause is
 * visible in the launcher log.
 * @param options - Launch environment, lane state root, brand and brand directories.
 * @returns The home to use, and the refused home when there was one.
 */
export function developmentLaneHome(options: DevelopmentLaneHomeOptions): DevelopmentLaneHome {
  const configured = options.environment.DSH_HOME?.trim()
  if (configured === undefined || configured === '') return { home: options.defaultHome }
  const home = resolve(configured)
  const owner = foreignOwner(home, options)
  if (owner === undefined) return { home }
  options.warn?.(`desktop development: ignoring DSH_HOME=${home}; ${owner} owns that home and a packaged ${owner} exports it `
    + 'into every child process. Set DSH_HOME to a directory no brand owns to keep another Harness home here. '
    + `This lane uses ${options.defaultHome}`)
  return { home: options.defaultHome, refused: home, owner }
}
