/**
 * Verify the source Desktop lanes stay independent of each other and of an
 * installed release.
 *
 * A developer runs `pnpm dev:desktop`, `pnpm desktop:prod`, and the installed
 * release on one machine. Each must own its installation, its Harness home, its
 * browser data, its loopback ports, and the SDKWork deployment baked into the
 * page it serves: a shared directory lets one lane delete or rewrite what another
 * is running, a shared port makes the second launch fail, and a shared built page
 * makes a development shell talk to production (or a release ship a development
 * deployment).
 *
 * This gate reads the modules and tracked env files that own those decisions and
 * fails with the exact surface that stopped holding, so an upstream merge or a
 * lane edit cannot quietly re-couple them. The contract lives in
 * `apps/desktop/README.md` ("Develop") and AGENTS.md ("Desktop application
 * identity").
 *
 * @module verify-desktop-lane-isolation
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readBrandManifest } from '../apps/desktop/scripts/brand-manifest.mjs'
import {
  developmentLaneDirectories,
  developmentLanePorts,
  developmentLaneWebEnvironment,
  type DevelopmentLaneName,
} from '../apps/desktop/scripts/development-identity.ts'
import {
  DEVELOPMENT_LANE_PROFILE,
  PRODUCTION_GATEWAY_URL,
  PRODUCTION_LANE_PROFILE,
} from '../apps/desktop/scripts/sdkwork-lane-profiles.ts'

/** Brand this checkout ships, and whose installed identity the lanes must avoid. */
const SHIPPED_KEY = 'daxuedazi'

/** Lanes a developer can start from this checkout. */
const LANES: readonly DevelopmentLaneName[] = ['development', 'online']

/** Files whose wiring the gate proves, with one representative token each. */
const LANE_WIRING: readonly { readonly file: string; readonly token: string; readonly why: string }[] = [
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'developmentLaneDirectories(BUILD_ROOT, lane)',
    why: 'each lane must resolve its own installation and state root',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'DSH_DESKTOP_DSH_DIR: directories.project',
    why: 'the shell must load the lane\'s own runtime project',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'DSH_DESKTOP_PRIMARY_RUNTIME_DIR: directories.primaryRuntime',
    why: 'the Host must run the lane\'s own prepared payload',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'preparePrimaryRuntime({ output: directories.runtimeRoot })',
    why: 'preparation must never write the release target directory',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'projectDir: directories.project',
    why: 'the disposable project must be lane-owned',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'assertLaneWebBuild(lane)',
    why: 'the lane must prove the built page carries its own deployment',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: '--user-data-dir=${userData}',
    why: 'browser data and the single-instance lock must follow the lane',
  },
  {
    file: 'apps/desktop/scripts/development-app.ts',
    token: 'DSH_DESKTOP_DSH_DIR: options.dshDir',
    why: 'the macOS development bundle must load the lane\'s own runtime project',
  },
  {
    file: 'apps/desktop/src/main.ts',
    token: 'DSH_DESKTOP_DSH_DIR',
    why: 'an unpackaged shell must honor the lane\'s runtime project',
  },
  {
    file: 'apps/desktop/scripts/prepare-primary-runtime.ts',
    token: 'options.output',
    why: 'payload preparation must accept a lane-owned output directory',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'DSH_DESKTOP_WEB_DIST: webDist',
    why: 'the shell must serve the page this lane verified instead of the shared bundle',
  },
  {
    file: 'apps/desktop/scripts/dev.ts',
    token: 'snapshotWebApplicationDist(join(REPOSITORY_ROOT, \'apps\', \'web\', \'dist\'), webDist)',
    why: 'the lane must snapshot the page it launches beside another lane\'s builds',
  },
  {
    file: 'apps/desktop/src/main.ts',
    token: 'resolveWebApplicationDist(resources.dsh)',
    why: 'the shell must honor the lane page snapshot',
  },
  {
    file: 'apps/desktop/scripts/development-app.ts',
    token: 'DSH_DESKTOP_WEB_DIST: options.webDist',
    why: 'the macOS development bundle must serve the lane page snapshot',
  },
  {
    file: 'apps/desktop/scripts/pack-local-packages.ts',
    token: 'assertWebBuildEnvironment(readWebBuildEnvironment(root)',
    why: 'a release must refuse a page a development lane baked',
  },
]

/** Result of {@link verifyDesktopLaneIsolation}. */
export interface DesktopLaneIsolationReport {
  /** Every broken invariant, in check order. */
  readonly failures: readonly string[]
  /** Number of files and lane decisions the gate inspected. */
  readonly checked: number
}

/**
 * Read one repository file.
 * @param root - Repository root.
 * @param path - Repository-relative path.
 * @returns the file text.
 */
function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/**
 * Parse the identity keys of one committed SDKWork env file.
 * @param root - Repository root.
 * @param path - Repository-relative env file.
 * @returns the declared `KEY=VALUE` pairs.
 */
function readEnvFile(root: string, path: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of read(root, path).split(/\r?\n/u)) {
    const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim())
    if (match === null) continue
    const name = match[1]
    const value = match[2]
    if (name !== undefined && value !== undefined) values.set(name, value.trim())
  }
  return values
}

/**
 * Browser data directory Electron derives from the installed product name.
 * @param home - operating-system home directory.
 * @param productName - installed `productName` of the brand.
 * @returns the default userData directory of an installed release.
 */
function releaseUserData(home: string, productName: string): string {
  if (process.platform === 'win32') return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), productName)
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', productName)
  return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), productName)
}

/**
 * Whether one absolute path lies inside another directory.
 * @param path - absolute candidate.
 * @param parent - absolute parent directory.
 * @returns true when the candidate is the directory or lies below it.
 */
function inside(path: string, parent: string): boolean {
  const separator = process.platform === 'win32' ? '\\' : '/'
  const normalize = (value: string): string => process.platform === 'win32' ? value.toLowerCase() : value
  const candidate = normalize(path)
  const root = normalize(parent)
  return candidate === root || candidate.startsWith(`${root}${separator}`)
}

/**
 * Prove one lane's directories are its own and away from the installed release.
 * @param root - Repository root.
 * @param lane - lane whose directories are checked.
 * @param failures - Receives every collision.
 * @returns the lane's absolute directories, for the cross-lane check.
 */
function checkLaneDirectories(
  root: string,
  lane: DevelopmentLaneName,
  failures: string[],
): ReturnType<typeof developmentLaneDirectories> {
  const brand = readBrandManifest(join(root, 'brands', `${SHIPPED_KEY}.json`))
  const buildRoot = join(root, 'apps', 'desktop', '.desktop-build')
  const home = homedir()
  const directories = developmentLaneDirectories(buildRoot, lane)
  const releaseHome = join(home, brand.home.dirName)
  const releaseData = releaseUserData(home, brand.desktop.productName)
  const owned = [
    ['state root', directories.stateRoot],
    ['Harness home', directories.home],
    ['browser data', directories.userData],
    ['runtime project', directories.project],
    ['primary runtime', directories.primaryRuntime],
  ] as const
  for (const [label, path] of owned) {
    if (!isAbsolute(path)) failures.push(`lane isolation: the ${lane} lane's ${label} is not absolute (${path})`)
    if (inside(path, releaseHome)) {
      failures.push(`lane isolation: the ${lane} lane's ${label} lives inside the installed release's Harness home (${path})`)
    }
    if (inside(path, releaseData)) {
      failures.push(`lane isolation: the ${lane} lane's ${label} is inside the installed release's browser data (${path})`)
    }
  }
  if (directories.primaryRuntime !== join(directories.runtimeRoot, 'primary-runtime')) {
    failures.push(`lane isolation: the ${lane} lane's primary runtime is not prepared under its own runtime root`)
  }
  return directories
}

/**
 * Prove the two lanes share no directory.
 * @param development - development lane directories.
 * @param online - online lane directories.
 * @param failures - Receives every shared directory.
 */
function checkLaneSeparation(
  development: ReturnType<typeof developmentLaneDirectories>,
  online: ReturnType<typeof developmentLaneDirectories>,
  failures: string[],
): void {
  const keys = ['stateRoot', 'home', 'userData', 'project', 'runtimeRoot', 'primaryRuntime'] as const
  for (const key of keys) {
    if (development[key] === online[key]) {
      failures.push(`lane isolation: both lanes resolve ${key} to ${development[key]}; `
        + 'preparing one lane would replace what the other is running')
    }
  }
}

/**
 * Prove both lanes keep clear of the installed brand and of each other.
 * @param root - Repository root.
 * @param failures - Receives every port collision.
 * @returns the number of lane ports checked.
 */
function checkLanePorts(root: string, failures: string[]): number {
  const brand = readBrandManifest(join(root, 'brands', `${SHIPPED_KEY}.json`))
  const { web, inspectors } = developmentLanePorts(brand)
  const ports = [
    ['installed shell', brand.desktop.webPort],
    ['dev:desktop Web', web.development],
    ['dev:desktop main inspector', inspectors.development.main],
    ['dev:desktop renderer inspector', inspectors.development.renderer],
    ['dev:desktop Host inspector', inspectors.development.host],
    ['desktop:prod Web', web.online],
    ['desktop:prod main inspector', inspectors.online.main],
    ['desktop:prod renderer inspector', inspectors.online.renderer],
    ['desktop:prod Host inspector', inspectors.online.host],
  ] as const
  const seen = new Map<number, string>()
  for (const [label, port] of ports) {
    const owner = seen.get(port)
    if (owner !== undefined) failures.push(`lane isolation: ${label} reuses port ${String(port)} that ${owner} serves`)
    seen.set(port, label)
  }
  return ports.length
}

/**
 * Prove each lane's built page and launch identity name one deployment, and that
 * the tracked env files declare the same identity.
 * @param root - Repository root.
 * @param failures - Receives every divergence.
 * @returns the number of identity keys compared.
 */
function checkLaneDeployments(root: string, failures: string[]): number {
  const expectations = [
    { lane: 'development', profile: DEVELOPMENT_LANE_PROFILE, envFile: '.env.standalone.development',
      runtimeTarget: 'server' },
    { lane: 'online', profile: PRODUCTION_LANE_PROFILE, envFile: '.env.cloud.production',
      runtimeTarget: 'server' },
  ] as const
  let compared = 0
  for (const { lane, profile, envFile, runtimeTarget } of expectations) {
    const expected = developmentLaneWebEnvironment(lane)
    if (expected.profileId !== profile.profileId) {
      failures.push(`lane isolation: the ${lane} lane's built page targets ${expected.profileId}, `
        + `but its launch identity targets ${profile.profileId}`)
    }
    const values = existsSync(join(root, envFile)) ? readEnvFile(root, envFile) : undefined
    if (values === undefined) {
      failures.push(`lane isolation: the ${lane} lane reads ${envFile}, which is missing`)
      continue
    }
    const declared = [
      ['SDKWORK_ENVIRONMENT', profile.environment],
      ['SDKWORK_DEPLOYMENT_PROFILE', profile.deploymentProfile],
      ['SDKWORK_PROFILE_ID', profile.profileId],
      ['SDKWORK_BIRDCODER_PROFILE_ID', profile.profileId],
      ['SDKWORK_RUNTIME_TARGET', runtimeTarget],
    ] as const
    for (const [key, value] of declared) {
      compared += 1
      if (values.get(key) !== value) {
        failures.push(`lane isolation: ${envFile} declares ${key}=${JSON.stringify(values.get(key))}; `
          + `the ${lane} lane expects ${JSON.stringify(value)}`)
      }
    }
    if (lane === 'online') {
      compared += 1
      const gateway = values.get('SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL')
      if (gateway !== PRODUCTION_GATEWAY_URL) {
        failures.push(`lane isolation: ${envFile} declares gateway ${JSON.stringify(gateway)}; `
          + `the online lane and a packaged release use ${PRODUCTION_GATEWAY_URL}`)
      }
    }
  }
  return compared
}

/**
 * Prove the launcher modules still derive their identity from the shared lane
 * profiles instead of restating a deployment.
 * @param root - Repository root.
 * @param failures - Receives every restated deployment.
 * @returns the number of module tokens checked.
 */
function checkLauncherIdentity(root: string, failures: string[]): number {
  const online = read(root, 'apps/desktop/scripts/online-debug-launch.ts')
  const development = read(root, 'apps/desktop/scripts/development-sdkwork-env.ts')
  const checks = [
    [online, 'PRODUCTION_LANE_PROFILE', 'the online lane must derive from the shared production profile'],
    [development, 'DEVELOPMENT_LANE_PROFILE', 'the development lane must derive from the shared development profile'],
    [online, 'api.sdkwork.com', 'the online lane still names the release gateway'],
  ] as const
  for (const [text, token, why] of checks) {
    if (!text.includes(token)) failures.push(`lane isolation: ${why} (missing ${JSON.stringify(token)})`)
  }
  for (const stale of ['api.birdcoder.com', "'standalone.production'"]) {
    if (online.includes(stale)) {
      failures.push(`lane isolation: apps/desktop/scripts/online-debug-launch.ts still restates ${stale}; `
        + 'a packaged release bakes cloud.production and the online lane must mirror it')
    }
  }
  return checks.length + 2
}

/**
 * Verify the Desktop source lanes against each other and against an installed
 * release.
 * @param root - Repository root; defaults to the checkout holding this script.
 * @returns every broken invariant, and how many surfaces were inspected.
 */
export function verifyDesktopLaneIsolation(
  root: string = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
): DesktopLaneIsolationReport {
  const failures: string[] = []
  let checked = 0
  const development = checkLaneDirectories(root, 'development', failures)
  const online = checkLaneDirectories(root, 'online', failures)
  checkLaneSeparation(development, online, failures)
  checked += LANES.length * 5 + 6
  checked += checkLanePorts(root, failures)
  checked += checkLaneDeployments(root, failures)
  checked += checkLauncherIdentity(root, failures)
  for (const { file, token, why } of LANE_WIRING) {
    checked += 1
    if (!existsSync(join(root, file))) {
      failures.push(`lane isolation: ${file} is missing`)
      continue
    }
    if (!read(root, file).includes(token)) {
      failures.push(`lane isolation: ${file} no longer states ${JSON.stringify(token)}; ${why}`)
    }
  }
  checked += 1
  if (!read(root, 'AGENTS.md').includes('verify-desktop-lane-isolation')) {
    failures.push('lane isolation: AGENTS.md no longer states `verify-desktop-lane-isolation`; '
      + 'the merge standing order that keeps the lanes independent is gone')
  }
  return { failures, checked }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = verifyDesktopLaneIsolation()
  for (const failure of report.failures) console.error(failure)
  if (report.failures.length > 0) {
    console.error(`Desktop lanes: ${String(report.failures.length)} isolation invariant(s) broken. `
      + 'Resolve them against apps/desktop/README.md ("Develop") before launching a lane or packaging a release.')
    process.exitCode = 1
  }
  else console.log(`Desktop lanes: development, online and the installed release stay independent across ${String(report.checked)} checks.`)
}
