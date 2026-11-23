/** Build and launch the unpackaged Electron shell; `--online` targets the production tier with a request log. */

import { spawn, execFileSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pnpmInvocation } from '../../../scripts/pnpm-invocation.ts'
import { readClientBuildRecord } from '../../../scripts/client-build-environment.ts'
import { assertWebBuildEnvironment, readWebBuildEnvironment } from '../../../scripts/web-build-environment.ts'
import { resolveApplicationCode } from '../../../packages/boot/sdkwork-env-bootstrap/src/index.ts'
import { DESKTOP_HOST_PROTOCOL_VERSION } from '../src/host-protocol.ts'
import type { DesktopRelease } from '../src/release.ts'
import { snapshotWebApplicationDist } from '../src/web-application.ts'
import { resolveDesktopBuildTarget } from './desktop-build-paths.mjs'
import { prepareDevelopmentProject } from './development-project.ts'
import { prepareDevelopmentApp } from './development-app.ts'
import {
  developmentLaneDirectories,
  developmentLaneHome,
  developmentLanePorts,
  developmentLaneWebEnvironment,
  type DevelopmentLaneDirectories,
  type DevelopmentLaneName,
} from './development-identity.ts'
import { resolveBrand } from './brand-manifest.mjs'
import { preparePrimaryRuntime } from './prepare-primary-runtime.ts'
import { KEEP_INHERITED_SDKWORK_ENV, developmentLaunchEnvironment } from './development-sdkwork-env.ts'
import { selectDevelopmentHome } from './development-home.ts'
import { UPSTREAM_DSH_HOME_DIR_NAME, brandHomePath, resolveRuntimeBrand } from '../src/brand.ts'
import { applyDevelopmentGateway, resolveDevelopmentGateway } from './development-gateway.ts'
import { parseDevelopmentArguments, type DevelopmentArguments } from './development-arguments.ts'
import { assertDevelopmentLanePortFree } from './development-ports.ts'
import { INSECURE_TLS_ELECTRON_SWITCH, ONLINE_REQUEST_LOG_VARIABLE, PRODUCTION_GATEWAY_URL, PRODUCTION_PROFILE_ID, insecureTlsLaunchEnvironment, onlineBuildEnvironment, onlineLaunchEnvironment } from './online-debug-launch.ts'

const APP_ROOT = resolve(import.meta.dirname, '..')
const REPOSITORY_ROOT = resolve(APP_ROOT, '..', '..')
const BUILD_ROOT = join(APP_ROOT, '.desktop-build')
/** Local application-data subdirectory holding the staged Electron mirror of this checkout. */
const STAGED_ELECTRON_DIRECTORY = join('dsh-desktop-dev-electron', 'electron-dist')
/** Request logger preloaded into the `--online` Electron child through `NODE_OPTIONS`. */
const ONLINE_REQUEST_LOG_MODULE = join(APP_ROOT, 'scripts', 'online-request-log.cjs')

interface PackageManifest {
  readonly version?: string
}

function packageVersion(path: string, subject: string): string {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as PackageManifest
  if (typeof manifest.version !== 'string') throw new Error(`desktop development: ${subject} has no version`)
  return manifest.version
}

function debugPort(name: string, fallback: number): number {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  const port = Number(value)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`desktop development: ${name} must be an integer from 1 through 65535`)
  }
  return port
}

/** Child process failure that keeps the numeric exit status the launcher interprets. */
class ChildExitError extends Error {
  /** Exit status, or `undefined` when the child ended on a signal. */
  readonly status: number | undefined

  constructor(message: string, status: number | undefined) {
    super(message)
    this.name = 'ChildExitError'
    this.status = status
  }
}

async function run(command: string, args: readonly string[], cwd: string, environment = process.env): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise()
      else reject(new ChildExitError(`desktop development: ${args.join(' ')} exited with ${String(code ?? signal)}`,
        code ?? undefined))
    })
  })
}

async function runPackageScript(script: string, cwd: string, environment: NodeJS.ProcessEnv): Promise<void> {
  if (process.env.npm_execpath === undefined || process.env.npm_execpath === '') {
    throw new Error('desktop development: invoke this launcher through pnpm run dev:desktop or start:desktop')
  }
  // FORK DIVERGENCE (upstream always runs `npm_execpath` through Node): the standalone
  // pnpm distribution reports `npm_execpath` as its native binary, which Node rejects with
  // ERR_UNKNOWN_FILE_EXTENSION, so resolve the invocation the shared way instead.
  const invocation = pnpmInvocation(['run', script])
  await run(invocation.command, invocation.args, cwd, environment)
}

/**
 * Root of the per-user application data on this machine, where the staged
 * Electron mirror lives: a build directory inside the checkout is itself a
 * location some machine-local security software refuses.
 * @returns absolute local application-data directory.
 */
function localApplicationDataDirectory(): string {
  const configured = process.env.LOCALAPPDATA
  if (configured !== undefined && configured.trim() !== '') return configured
  return join(homedir(), 'AppData', 'Local')
}

/**
 * Mirror the electron distribution to a per-user directory outside the checkout
 * and return the staged executable. Machine-local security software hooks
 * process creation by image path: Electron started from anywhere inside the
 * checkout dies with STATUS_BREAKPOINT before the main script runs, while a
 * byte-identical copy under the local application data starts.
 * @param electron - executable of the installed electron package.
 * @returns absolute path of the staged executable.
 */
function stagedElectronExecutable(electron: string): string {
  const source = resolve(electron, '..')
  const target = join(localApplicationDataDirectory(), STAGED_ELECTRON_DIRECTORY)
  const sourceBinary = join(source, 'electron.exe')
  const targetBinary = join(target, 'electron.exe')
  const stale = (() => {
    if (!existsSync(targetBinary)) return true
    const sourceSize = statSync(sourceBinary).size
    const targetSize = statSync(targetBinary).size
    return sourceSize !== targetSize
      || statSync(sourceBinary).mtimeMs > statSync(targetBinary).mtimeMs
  })()
  if (stale) {
    rmSync(target, { recursive: true, force: true })
    cpSync(source, target, { recursive: true })
  }
  return targetBinary
}

/** Windows exit status Chromium reports when something kills it before the main script runs. */
const STATUS_BREAKPOINT = 2_147_483_651

/** Meaning and remedies of {@link STATUS_BREAKPOINT}, whose number alone names no cause. */
const BREAKPOINT_HINT = 'desktop development: STATUS_BREAKPOINT means the operating system or a local security filter '
  + 'refused this Electron before the main script ran; allow the checkout and '
  + `${join(localApplicationDataDirectory(), STAGED_ELECTRON_DIRECTORY)} in that filter, or relaunch with `
  + 'DSH_DESKTOP_DEV_NO_SANDBOX=1 to relax the Chromium sandbox'

/**
 * Run the Electron child, reporting {@link STATUS_BREAKPOINT} with its remedies.
 * @param executable - Electron binary to launch.
 * @param args - command line switches followed by the application directory.
 * @param cwd - working directory of the child.
 * @param environment - composed launch environment.
 */
async function runElectron(
  executable: string,
  args: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  try {
    await run(executable, args, cwd, environment)
  } catch (error) {
    if (!(error instanceof ChildExitError) || error.status !== STATUS_BREAKPOINT) throw error
    throw new ChildExitError(`${error.message}\n${BREAKPOINT_HINT}`, error.status)
  }
}

/**
 * Harness homes a source lane must not adopt by inheritance: the installed
 * application's brand home, and the upstream `~/.dsh` a separately installed
 * `dsh` keeps writing.
 * @returns absolute home paths a source lane must not adopt by inheritance.
 */
function installedHarnessHomes(): string[] {
  const brand = resolveRuntimeBrand({ env: process.env })
  return [brandHomePath(brand), join(homedir(), UPSTREAM_DSH_HOME_DIR_NAME)]
}

async function launchElectron(
  sdkworkEnvironment: NodeJS.ProcessEnv,
  lane: DevelopmentLaneName,
  directories: DevelopmentLaneDirectories,
  webDist: string,
  insecureTls: boolean,
): Promise<void> {
  const require = createRequire(import.meta.url)
  const electron: unknown = require('electron')
  if (typeof electron !== 'string') throw new Error('desktop development: electron executable is unavailable')
  // FORK DIVERGENCE (AGENTS.md, "Desktop application identity"): ports and home
  // follow the brand this checkout ships, so this lane runs beside every installed
  // brand, beside the other lane and beside another checkout's lanes. The brand
  // owns nine consecutive ports: the installed shell serves the first, the two
  // lanes the next two, and each lane's main, renderer and Host inspectors the
  // rest.
  const brand = resolveBrand(process.env)
  const lanePorts = developmentLanePorts(brand)
  const inspectors = lanePorts.inspectors[lane]
  const mainPort = debugPort('DSH_DESKTOP_MAIN_INSPECT_PORT', inspectors.main)
  const rendererPort = debugPort('DSH_DESKTOP_RENDERER_DEBUG_PORT', inspectors.renderer)
  const hostPort = debugPort('DSH_DESKTOP_HOST_INSPECT_PORT', inspectors.host)
  // Every lane keeps its own Harness home, browser data, runtime project and
  // primary runtime, so neither the other lane nor the installed release of this
  // brand reads or rewrites what this launch serves.
  // An installed brand serves `desktop.webPort`, this lane the next port, and the
  // online lane the one after that.
  const webPort = process.env.DSH_DESKTOP_HOST_WEB_PORT ?? String(lanePorts.web[lane])
  const laneHome = developmentLaneHome({
    brand,
    environment: process.env,
    defaultHome: directories.home,
    warn: (line) => { console.warn(line) },
  })
  const userData = resolve(process.env.DSH_DESKTOP_USER_DATA_DIR ?? directories.userData)
  const environment: NodeJS.ProcessEnv = {
    ...sdkworkEnvironment,
    DSH_HOME: laneHome.home,
    // The shell loads the runtime project of this lane, not a shared
    // `.desktop-build/development/project` one: preparing a project replaces it,
    // and a lane that replaced the directory a running lane serves from would
    // break that lane's module resolution mid-session.
    DSH_DESKTOP_DSH_DIR: directories.project,
    DSH_DESKTOP_PRIMARY_RUNTIME_DIR: directories.primaryRuntime,
    // The shell serves the page snapshot this launch verified, not the shared
    // `apps/web/dist` another lane or the `dev:web` watcher may rewrite while this
    // shell runs.
    DSH_DESKTOP_WEB_DIST: webDist,
    DSH_DESKTOP_HOST_INSPECT_PORT: String(hostPort),
    // The Host reads its Web port from this variable; without it the development
    // shell would bind the brand's packaged port and lose startup to the installed
    // application of that brand.
    DSH_DESKTOP_HOST_WEB_PORT: webPort,
    DSH_DESKTOP_OPEN_DEVTOOLS: process.env.DSH_DESKTOP_OPEN_DEVTOOLS ?? '1',
    ELECTRON_ENABLE_LOGGING: process.env.ELECTRON_ENABLE_LOGGING ?? '1',
    // A shell inside an Electron host inherits ELECTRON_RUN_AS_NODE; left set, this Electron
    // starts as plain Node, which rejects the Chromium switches below with "bad option" and
    // exit 9. An undefined value omits the variable from the child environment.
    ELECTRON_RUN_AS_NODE: undefined,
  }
  if (insecureTls) {
    // A self-signed production gateway fails every side by default: the Node
    // Host with DEPTH_ZERO_SELF_SIGNED_CERT, the renderer with
    // net::ERR_CERT_AUTHORITY_INVALID. Both sides accept the certificate only
    // through this explicit debug-lane opt-in.
    console.warn('desktop development: TLS verification DISABLED '
      + `(${INSECURE_TLS_ELECTRON_SWITCH}, NODE_TLS_REJECT_UNAUTHORIZED=0) - debug lane only; prefer `
      + 'NODE_EXTRA_CA_CERTS with the gateway certificate for real use')
  }
  const launchEnvironment = insecureTls ? insecureTlsLaunchEnvironment(environment) : environment
  console.log(`desktop development: lane=${lane} brand=${brand.key} DSH_HOME=${laneHome.home} web port=${webPort}`)
  console.log(`desktop development: userData=${userData}`)
  console.log(`desktop development: project=${directories.project}`)
  console.log(`desktop development: primary runtime=${directories.primaryRuntime}`)
  console.log(`desktop development: web page=${webDist}`)
  console.log(`desktop development: inspectors main=${String(mainPort)}, renderer=${String(rendererPort)}, host=${String(hostPort)}`
    + (lane === 'online' ? '; attach the debugger through chrome://inspect (renderer console) or your IDE inspector (main and host)' : ''))
  if (process.platform === 'darwin') {
    const executable = prepareDevelopmentApp({ electron, appRoot: APP_ROOT, directory: directories.stateRoot,
      home: laneHome.home, dshDir: directories.project, webDist, userData, webPort, mainPort, rendererPort, hostPort,
      openDevtools: launchEnvironment.DSH_DESKTOP_OPEN_DEVTOOLS! })
    await runElectron(executable, [], APP_ROOT, launchEnvironment)
    return
  }
  let executable = electron
  // Windows development launches from the per-user staged mirror below by default:
  // machine-local security software kills an Electron image that lives anywhere
  // inside the checkout, whatever directory the copy keeps there. Set
  // DSH_DESKTOP_DEV_STAGED_ELECTRON=0 to launch from node_modules directly.
  if (process.platform === 'win32' && process.env.DSH_DESKTOP_DEV_STAGED_ELECTRON !== '0') {
    executable = stagedElectronExecutable(electron)
    console.log(`desktop development: electron staged to ${executable}`)
  }
  const arguments_: string[] = [
    `--inspect=127.0.0.1:${String(mainPort)}`,
    `--remote-debugging-port=${String(rendererPort)}`,
    `--user-data-dir=${userData}`,
  ]
  if (insecureTls) arguments_.push(INSECURE_TLS_ELECTRON_SWITCH)
  // Some machine-local security software (Defender off, an EDR kernel filter on top)
  // kills sandboxed Chromium child-process creation, so this Electron dies with
  // STATUS_BREAKPOINT before main runs. Opt in per machine with this variable;
  // packaged installs keep the sandbox.
  if (process.env.DSH_DESKTOP_DEV_NO_SANDBOX === '1') {
    arguments_.push('--no-sandbox')
    console.log('desktop development: chromium sandbox disabled (DSH_DESKTOP_DEV_NO_SANDBOX=1)')
  }
  arguments_.push(APP_ROOT)
  await runElectron(executable, arguments_, APP_ROOT, launchEnvironment)
}

async function main(): Promise<void> {
  const arguments_ = parseDevelopmentArguments(process.argv.slice(2))
  const online = arguments_.online
  if (online) {
    // FORK DIVERGENCE: the online debug lane targets the deployed production tier
    // (AGENTS.md, "Desktop application identity" applies to state isolation; the
    // production identity and request-log wiring live in online-debug-launch.ts).
    // The profile and gateway are guaranteed: identity and gateway keys are
    // forced to the canonical cloud.production values a packaged release bakes,
    // and every other SDKWork value is inherited untouched.
    if (!existsSync(ONLINE_REQUEST_LOG_MODULE)) {
      throw new Error(`desktop development: missing request logger ${ONLINE_REQUEST_LOG_MODULE}`)
    }
    const onlineLaunch = onlineLaunchEnvironment(process.env, {
      requestLogModule: ONLINE_REQUEST_LOG_MODULE,
      applicationCode: resolveApplicationCode(REPOSITORY_ROOT),
    })
    console.log(`desktop development: ONLINE tier (profile ${PRODUCTION_PROFILE_ID}) - local source talks to `
      + 'the deployed production environment')
    console.log(`desktop development: SDK gateway=${PRODUCTION_GATEWAY_URL}`)
    console.log(`desktop development: request log ${process.env[ONLINE_REQUEST_LOG_VARIABLE] === '0' ? 'off' : 'on'} `
      + `(${ONLINE_REQUEST_LOG_VARIABLE}=${onlineLaunch.environment[ONLINE_REQUEST_LOG_VARIABLE]})`)
    if (arguments_.printGateway) return
    await launchDevelopment(onlineBuildEnvironment(onlineLaunch.environment, process.env),
      onlineLaunch.environment, 'online', arguments_)
    return
  }
  // A packaged Desktop application exports the deployment it resolved into every child
  // process, so a shell that carries that environment would otherwise point this source
  // run at the packaged deployment. The checkout owns the development tier, so both builds
  // below run under the development environment: the client artifacts project its gateway
  // into the browser, and the Desktop Host resolves the matching bootstrap token from the
  // same environment when it starts.
  const sdkwork = developmentLaunchEnvironment(process.env, {
    applicationCode: resolveApplicationCode(REPOSITORY_ROOT),
  })
  if (sdkwork.dropped.length > 0) {
    console.log('desktop development: declaring the development SDKWork environment, dropping the inherited '
      + `production values (${sdkwork.dropped.join(', ')}); set ${KEEP_INHERITED_SDKWORK_ENV}=1 to keep them`)
  }
  const gatewayPort = arguments_.gatewayPort === undefined ? undefined : Number(arguments_.gatewayPort)
  const gateway = resolveDevelopmentGateway(arguments_.gateway, gatewayPort)
  console.log(`desktop development: SDKWork gateway=${gateway.url} (${gateway.mode})`)
  if (arguments_.printGateway) return
  const sdkworkEnvironment = applyDevelopmentGateway(sdkwork.environment, gateway)
  await launchDevelopment(sdkworkEnvironment, sdkworkEnvironment, 'development', arguments_)
}

/**
 * Require the artifacts this lane is about to run to be its own.
 *
 * The Web page embeds exactly one SDKWork deployment, and every lane builds into
 * the same `apps/web/dist`. The lane proves both the recorded deployment and the
 * complete-build digest before launch, so `--skip-build` (or a build another lane
 * left behind) cannot make a development shell load production credentials, or
 * the online shell load a development page.
 * @param lane - lane whose deployment the page must carry.
 * @throws When the page or the client artifacts belong to another environment.
 */
function assertLaneWebBuild(lane: DevelopmentLaneName): void {
  assertWebBuildEnvironment(readWebBuildEnvironment(REPOSITORY_ROOT), developmentLaneWebEnvironment(lane),
    `the desktop ${lane} lane`)
  readClientBuildRecord(REPOSITORY_ROOT)
}

/** Shared tail of both lanes: build the lane's deployment, stage its installation, launch Electron. */
async function launchDevelopment(
  buildEnvironment: NodeJS.ProcessEnv,
  launchEnvironment: NodeJS.ProcessEnv,
  lane: DevelopmentLaneName,
  options: DevelopmentArguments,
): Promise<void> {
  const directories = developmentLaneDirectories(BUILD_ROOT, lane)
  const webEnvironment = developmentLaneWebEnvironment(lane)
  // Adopt the upstream home-selection diagnostic, scoped to this lane's own state
  // directory so an installed application's home is never adopted by inheritance.
  // `developmentLaneHome` in launchElectron stays authoritative: it also refuses a
  // home owned by any other brand on the machine, which this check cannot see.
  const homeSelection = selectDevelopmentHome({
    environment: process.env,
    laneHome: directories.home,
    installedHomes: installedHarnessHomes(),
    allowInstalledHome: process.env.DSH_DESKTOP_DEV_INSTALLED_HOME === '1',
  })
  if (homeSelection.notice !== undefined) console.log(homeSelection.notice)
  // A previous window of this lane owns this brand's lane web port; the Electron
  // single-instance lock would only focus it and render that old Host's plugin
  // snapshots instead of this build. Refuse before building, probing the same
  // brand-derived port this lane will actually bind.
  const launchBrand = resolveBrand(process.env)
  await assertDevelopmentLanePortFree({
    lane,
    port: debugPort('DSH_DESKTOP_HOST_WEB_PORT', developmentLanePorts(launchBrand).web[lane]),
  })
  if (!options.skipBuild) {
    // Each lane bakes its own deployment into the Web page: the development lane
    // reads `.env.standalone.development`, the online lane the release's
    // `.env.cloud.production`. The resolved gateway is the one launch-time value
    // the file cannot carry (`--gateway`), so it goes through the build's
    // explicit override channel.
    const gatewayOverride = buildEnvironment.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL?.trim()
    await runPackageScript('build:artifacts', REPOSITORY_ROOT, {
      ...buildEnvironment,
      DSH_WEB_BUILD_MODE: webEnvironment.environment,
      DSH_WEB_DEPLOYMENT_PROFILE: webEnvironment.deploymentProfile,
      ...gatewayOverride === undefined || gatewayOverride === ''
        ? {}
        : { DSH_WEB_SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: gatewayOverride },
    })
    await runPackageScript('build', APP_ROOT, buildEnvironment)
  }
  assertLaneWebBuild(lane)
  // Serve a snapshot of the page this launch verified: a later build for another
  // lane rewrites the shared `apps/web/dist`, and a running shell must keep the
  // document its own deployment produced.
  const webDist = join(directories.stateRoot, 'web')
  snapshotWebApplicationDist(join(REPOSITORY_ROOT, 'apps', 'web', 'dist'), webDist)
  for (const path of [
    join(APP_ROOT, 'lib', 'main.js'),
    join(REPOSITORY_ROOT, 'apps', 'desktop-host', 'lib', 'index.js'),
  ]) {
    if (!existsSync(path)) throw new Error(`desktop development: missing built artifact ${path}`)
  }
  const version = packageVersion(join(APP_ROOT, 'package.json'), 'desktop package')
  const pnpmVersion = packageVersion(join(APP_ROOT, 'node_modules', 'pnpm', 'package.json'), 'pnpm package')
  const release: DesktopRelease = {
    schemaVersion: 1,
    version,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    nodeVersion: execFileSync(createRequire(import.meta.url)('electron') as string, ['-p', 'process.versions.node'],
      { encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }).trim(),
    pnpmVersion,
  }
  prepareDevelopmentProject({
    // One project per lane: the directory is replaced on every preparation, so a
    // shared one would let the other lane delete the runtime this lane serves from.
    projectDir: directories.project,
    cliDir: join(REPOSITORY_ROOT, 'apps', 'cli'),
    hostDir: join(REPOSITORY_ROOT, 'apps', 'desktop-host'),
    dependencyDir: join(REPOSITORY_ROOT, 'node_modules', '.pnpm', 'node_modules'),
    release,
    target: resolveDesktopBuildTarget(),
  })
  // The lane's own payload, never the release target directory a packaging run
  // consumes and verifies.
  await preparePrimaryRuntime({ output: directories.runtimeRoot })
  await launchElectron(launchEnvironment, lane, directories, webDist, options.insecureTLS)
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
