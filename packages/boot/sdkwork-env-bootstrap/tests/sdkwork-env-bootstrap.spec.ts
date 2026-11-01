import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applySdkworkLaunchEnv,
  bootstrapCredentialBundlePath,
  clearInheritedInjectedSdkworkEnv,
  dropUnmarkedPackagedProductionDeployment,
  ensureSdkworkBootstrapToken,
  isLoopbackGatewayHostname,
  parseHostsLoopbackNames,
  markInjectedSdkworkEnv,
  materializeEnsuredBootstrapAccessToken,
  resolveSdkworkBootstrapProfile,
  resolveSdkworkLaunchProfile,
  readCredentialBundle,
  resolveSdkworkRepoRoot,
  SDKWORK_DEVELOPMENT_GATEWAY_URL,
  SDKWORK_INJECTED_ENV_MARKER,
  SDKWORK_STAGING_GATEWAY_URL,
  SDKWORK_TEST_GATEWAY_URL,
  SDKWORK_PRODUCTION_GATEWAY_URL,
  trackedSdkworkEnvPath,
  writeCredentialBundle,
} from '../src/index.ts'

const MANIFEST = JSON.stringify({
  schemaVersion: 3,
  app: { key: 'sdkwork-birdcoder', name: 'SDKWork Birdcoder', appType: 'APP_REACT' },
  backend: {
    appId: 'sdkwork-birdcoder',
    tenantId: '100001',
    organizationId: '0',
    accessTokenPermissionScope: ['iam.users.read'],
  },
})

/**
 * A gateway host that is never local. The tier domains cannot serve this role:
 * a developer publishes the local platform gateway under `api-dev.birdcoder.com`
 * by mapping it to `127.0.0.1` in the system hosts file, which is exactly what
 * `isLoopbackGatewayHostname` recognizes, so a tier domain asserts the machine's
 * own configuration rather than the module's behavior.
 */
const REMOTE_GATEWAY_URL = 'https://gateway.invalid'

/**
 * A disposable local fixture JWT: `alg: none`, an application id claim, and the
 * literal `signature` segment the module classifies as a fixture token.
 */
const FIXTURE_TOKEN = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhcHBfaWQiOiJzZGt3b3JrLWJpcmRjb2RlciJ9.signature'

let dir: string
/** Disposable home directory, so no test reads or writes the real `~/.sdkwork`. */
let home: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sdkwork-env-bootstrap-'))
  home = mkdtempSync(join(tmpdir(), 'sdkwork-env-bootstrap-home-'))
  writeFileSync(join(dir, 'agent.app.config.json'), MANIFEST)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

/**
 * The credential bundle path the module resolves for one lifecycle environment.
 * @param environment - canonical lifecycle environment.
 * @returns the absolute bundle path under the disposable home.
 */
function bundlePath(environment: string): string {
  return bootstrapCredentialBundlePath(dir, environment, { homeDir: home })
}

/**
 * Persist one bootstrap token as the module would find it, outside the checkout.
 * @param environment - canonical lifecycle environment.
 * @param accessToken - the bearer token to store.
 * @returns the bundle path that was written.
 */
function writeTokenBundle(environment: string, accessToken: string): string {
  const path = bundlePath(environment)
  writeCredentialBundle(path, {
    accessToken,
    environment,
    deploymentProfile: 'standalone',
    source: 'test-fixture',
  })
  return path
}

describe('resolveSdkworkRepoRoot', () => {
  it('walks up to the directory that owns agent.app.config.json', () => {
    const nested = join(dir, 'apps', 'desktop')
    mkdirSync(nested, { recursive: true })
    expect(resolveSdkworkRepoRoot(nested)).toBe(resolve(dir))
  })

  it('returns the start directory when no manifest exists', () => {
    const isolated = mkdtempSync(join(tmpdir(), 'sdkwork-env-nomarker-'))
    try {
      expect(resolveSdkworkRepoRoot(isolated)).toBe(resolve(isolated))
    } finally {
      rmSync(isolated, { recursive: true, force: true })
    }
  })
})

describe('resolveSdkworkLaunchProfile', () => {
  it('selects development inside a source checkout and production otherwise', () => {
    const nested = join(dir, 'apps', 'cli')
    mkdirSync(nested, { recursive: true })
    expect(resolveSdkworkLaunchProfile(nested)).toBe('development')
    expect(resolveSdkworkLaunchProfile(dir)).toBe('development')
    const isolated = mkdtempSync(join(tmpdir(), 'sdkwork-env-nolaunch-'))
    try {
      expect(resolveSdkworkLaunchProfile(isolated)).toBe('production')
    } finally {
      rmSync(isolated, { recursive: true, force: true })
    }
  })
})

describe('applySdkworkLaunchEnv', () => {
  const warn = (): void => {}

  it('applies the development gateway from the tracked env file when launched from a subdirectory', () => {
    writeFileSync(join(dir, '.env.standalone.development'), [
      'SDKWORK_ENVIRONMENT=development',
      'SDKWORK_PROFILE_ID=standalone.development',
      'SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=http://api-dev.birdcoder.com',
      'SDKWORK_ACCESS_TOKEN=',
      'DEEPSEEK_API_KEY=',
      '',
    ].join('\n'))
    const nested = join(dir, 'apps', 'desktop')
    mkdirSync(nested, { recursive: true })
    const env: Record<string, string | undefined> = {}
    expect(applySdkworkLaunchEnv({ cwd: nested, profile: 'development', env, homeDir: home, warn }).cwd).toBe(resolve(dir))
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_DEVELOPMENT_GATEWAY_URL)
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.development')
    expect(env.SDKWORK_ACCESS_TOKEN).toBeUndefined()
    expect(env.DEEPSEEK_API_KEY).toBeUndefined()
  })

  it('falls back to the development gateway when the tracked file is absent', () => {
    const env: Record<string, string | undefined> = {}
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_DEVELOPMENT_GATEWAY_URL)
    expect(env.SDKWORK_ENVIRONMENT).toBe('development')
  })

  it('prefers the repo-root .env lifecycle over the development launch default', () => {
    writeFileSync(join(dir, '.env'), [
      'SDKWORK_PROFILE_ID=standalone.test',
      'SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=https://api-test.birdcoder.com',
      '',
    ].join('\n'))
    writeFileSync(trackedSdkworkEnvPath(dir, 'test'), [
      'SDKWORK_ENVIRONMENT=test',
      'SDKWORK_PROFILE_ID=standalone.test',
      'SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=https://api-test.birdcoder.com',
      '',
    ].join('\n'))
    const nested = join(dir, 'apps', 'desktop')
    mkdirSync(nested, { recursive: true })
    const env: Record<string, string | undefined> = {}
    expect(applySdkworkLaunchEnv({ cwd: nested, profile: 'development', env, homeDir: home, warn }).cwd).toBe(resolve(dir))
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.test')
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_TEST_GATEWAY_URL)
  })

  it('applies the production gateway for a packaged build without walking to a repo root', () => {
    const nested = join(dir, 'apps', 'desktop')
    mkdirSync(nested, { recursive: true })
    const env: Record<string, string | undefined> = {}
    const cwd = applySdkworkLaunchEnv({ cwd: nested, profile: 'production', env, homeDir: home, warn }).cwd
    expect(cwd).toBe(resolve(nested))
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_PRODUCTION_GATEWAY_URL)
    expect(env.SDKWORK_ENVIRONMENT).toBe('production')
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.production')
  })

  it('does not replace an inherited process-env gateway URL', () => {
    const env: Record<string, string | undefined> = {
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'https://api-custom.example',
    }
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe('https://api-custom.example')
  })

  it('ignores a deployment another application injected into this process tree', () => {
    const env: Record<string, string | undefined> = {
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_PROFILE_ID: 'standalone.production',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    }
    markInjectedSdkworkEnv(env)
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.development')
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_DEVELOPMENT_GATEWAY_URL)
    expect(env[SDKWORK_INJECTED_ENV_MARKER]).toBeUndefined()
  })

  it('keeps an operator override that differs from the injected value', () => {
    const env: Record<string, string | undefined> = {
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    }
    markInjectedSdkworkEnv(env)
    env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL = 'http://127.0.0.1:10240'
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe('http://127.0.0.1:10240')
  })

  it('copies a credential-bundle token into a blank launch environment', () => {
    writeFileSync(join(dir, '.env.standalone.development'), [
      'SDKWORK_PROFILE_ID=standalone.development',
      'SDKWORK_ACCESS_TOKEN=',
      '',
    ].join('\n'))
    writeTokenBundle('development', 'overlay-jwt')
    const env: Record<string, string | undefined> = {
      SDKWORK_ACCESS_TOKEN: '',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:10240',
    }
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('overlay-jwt')
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.development')
  })

  it('copies the development fixture bundle token for a remote development gateway', () => {
    writeTokenBundle('development', FIXTURE_TOKEN)
    writeFileSync(trackedSdkworkEnvPath(dir, 'development'), [
      `SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=${REMOTE_GATEWAY_URL}`,
      '',
    ].join('\n'))
    const env: Record<string, string | undefined> = {}
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(REMOTE_GATEWAY_URL)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe(FIXTURE_TOKEN)
  })

  it('does not copy a fixture bundle token outside the development tier', () => {
    writeTokenBundle('test', FIXTURE_TOKEN)
    writeFileSync(trackedSdkworkEnvPath(dir, 'test'), [
      `SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=${REMOTE_GATEWAY_URL}`,
      '',
    ].join('\n'))
    const env: Record<string, string | undefined> = { SDKWORK_PROFILE_ID: 'standalone.test' }
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_ACCESS_TOKEN).toBeUndefined()
  })

  it('prefers the credential bundle over the retired registration output', () => {
    writeTokenBundle('development', FIXTURE_TOKEN)
    writeFileSync(join(dir, '.sdkwork.local.env'), 'SDKWORK_ACCESS_TOKEN=registered-dev-token\n')
    const env: Record<string, string | undefined> = {}
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_ACCESS_TOKEN).toBe(FIXTURE_TOKEN)
  })

  it('fills a blank token from the retired registration output when no bundle exists', () => {
    writeFileSync(join(dir, '.sdkwork.local.env'), 'SDKWORK_ACCESS_TOKEN=registered-dev-token\n')
    const env: Record<string, string | undefined> = {}
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('registered-dev-token')
  })

  /** The complete production deployment a packaged parent leaks into its children. */
  function packagedProductionDeployment(): Record<string, string | undefined> {
    return {
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_DEPLOYMENT_PROFILE: 'standalone',
      SDKWORK_PROFILE_ID: 'standalone.production',
      SDKWORK_BIRDCODER_ENVIRONMENT: 'production',
      SDKWORK_BIRDCODER_DEPLOYMENT_PROFILE: 'standalone',
      SDKWORK_BIRDCODER_PROFILE_ID: 'standalone.production',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    }
  }

  it('drops an unmarked packaged production deployment inherited from the parent process', () => {
    const env = packagedProductionDeployment()
    const lines: string[] = []
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn: line => lines.push(line) })
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.development')
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_DEVELOPMENT_GATEWAY_URL)
    expect(lines.join('')).toContain("ignoring the packaged application's production deployment")
  })

  it('keeps the whole inherited deployment once any of its keys differs from the production default', () => {
    const env: Record<string, string | undefined> = { ...packagedProductionDeployment(), SDKWORK_ENVIRONMENT: 'staging' }
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_PRODUCTION_GATEWAY_URL)
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.production')
  })

  it('keeps a production gateway the operator exported without a production profile id', () => {
    const env: Record<string, string | undefined> = {
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    }
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_PRODUCTION_GATEWAY_URL)
  })

  it('uses the selected lifecycle bundle instead of always reading development', () => {
    writeFileSync(join(dir, '.env'), [
      'SDKWORK_PROFILE_ID=standalone.staging',
      'SDKWORK_ACCESS_TOKEN=',
      '',
    ].join('\n'))
    writeFileSync(trackedSdkworkEnvPath(dir, 'staging'), [
      'SDKWORK_ENVIRONMENT=staging',
      'SDKWORK_PROFILE_ID=standalone.staging',
      'SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL=https://api-staging.birdcoder.com',
      '',
    ].join('\n'))
    writeTokenBundle('staging', 'staging-jwt')
    const env: Record<string, string | undefined> = {}
    applySdkworkLaunchEnv({ cwd: dir, profile: 'development', env, homeDir: home, warn })
    expect(env.SDKWORK_PROFILE_ID).toBe('standalone.staging')
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBe(SDKWORK_STAGING_GATEWAY_URL)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('staging-jwt')
  })
})

describe('gateway loopback resolution', () => {
  it('accepts loopback literals without consulting the hosts file', () => {
    expect(isLoopbackGatewayHostname('localhost')).toBe(true)
    expect(isLoopbackGatewayHostname('127.0.0.1')).toBe(true)
    expect(isLoopbackGatewayHostname('127.9.9.9')).toBe(true)
    expect(isLoopbackGatewayHostname('[::1]')).toBe(true)
    expect(isLoopbackGatewayHostname('LOCALHOST')).toBe(true)
    expect(isLoopbackGatewayHostname('128.0.0.1')).toBe(false)
    expect(isLoopbackGatewayHostname('1270.0.0.1')).toBe(false)
  })

  it('publishes the local platform gateway under a tier domain through the hosts file', () => {
    const hosts = [
      '# Tier domains are the local platform gateway on a developer machine.',
      '127.0.0.1\tapi-dev.birdcoder.com   api.birdcoder.com',
      '127.0.0.1   localhost',
      '::1         ipv6-localhost',
      '10.0.0.7    remote.example.com   # a real remote host changes nothing',
      '',
    ].join('\n')
    expect(isLoopbackGatewayHostname('api-dev.birdcoder.com', hosts)).toBe(true)
    expect(isLoopbackGatewayHostname('API-DEV.BIRDCODER.COM', hosts)).toBe(true)
    expect(isLoopbackGatewayHostname('api.birdcoder.com', hosts)).toBe(true)
    expect(isLoopbackGatewayHostname('localhost', hosts)).toBe(true)
    expect(isLoopbackGatewayHostname('remote.example.com', hosts)).toBe(false)
    expect(isLoopbackGatewayHostname('unmapped.example.com', hosts)).toBe(false)
  })

  it('reads the loopback names a hosts file declares and ignores every other mapping', () => {
    const names = parseHostsLoopbackNames([
      '127.0.0.1 api-dev.birdcoder.com api.birdcoder.com',
      '10.0.0.7 remote.example.com',
      '::1 ipv6-localhost',
      'not-an-address  ignored.example.com',
      '# 127.0.0.1 commented.example.com',
      '',
    ].join('\n'))
    expect([...names].sort()).toEqual([
      'api-dev.birdcoder.com',
      'api.birdcoder.com',
      'ipv6-localhost',
    ])
  })
})

describe('resolveSdkworkBootstrapProfile', () => {
  it('prefers the exact profile id over the pair', () => {
    expect(resolveSdkworkBootstrapProfile({
      SDKWORK_PROFILE_ID: 'standalone.test',
      SDKWORK_BIRDCODER_ENVIRONMENT: 'production',
    })).toEqual({ environment: 'test', deploymentProfile: 'standalone', profileId: 'standalone.test' })
  })

  it('falls back to the application-scoped environment keys', () => {
    expect(resolveSdkworkBootstrapProfile({
      SDKWORK_BIRDCODER_ENVIRONMENT: 'development',
    })).toEqual({ environment: 'development', deploymentProfile: 'standalone', profileId: 'standalone.development' })
    expect(resolveSdkworkBootstrapProfile({
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_DEPLOYMENT_PROFILE: 'cloud',
    })).toEqual({ environment: 'production', deploymentProfile: 'cloud', profileId: 'cloud.production' })
  })

  it('normalizes dev/prod aliases', () => {
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_PROFILE_ID: 'standalone.dev' })?.environment).toBe('development')
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_BIRDCODER_ENVIRONMENT: 'prod' })?.environment).toBe('production')
  })

  it('accepts single-segment SDKWORK_PROFILE_ID aliases as standalone profiles', () => {
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_PROFILE_ID: 'test' })).toEqual({
      environment: 'test',
      deploymentProfile: 'standalone',
      profileId: 'standalone.test',
    })
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_PROFILE_ID: 'staging' })).toEqual({
      environment: 'staging',
      deploymentProfile: 'standalone',
      profileId: 'standalone.staging',
    })
  })

  it('returns undefined without any SDKWork identity key or for unknown values', () => {
    expect(resolveSdkworkBootstrapProfile({})).toBeUndefined()
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_PROFILE_ID: 'local.private' })).toBeUndefined()
    expect(resolveSdkworkBootstrapProfile({ SDKWORK_ENVIRONMENT: 'sandbox' })).toBeUndefined()
  })
})

describe('bootstrapCredentialBundlePath', () => {
  it('resolves the profile bundle inside the user credential store', () => {
    expect(bootstrapCredentialBundlePath('/repo', 'test', { homeDir: home, applicationCode: 'demo' }))
      .toBe(join(home, '.sdkwork', 'demo', 'credentials', 'standalone.test.json'))
  })

  it('derives the application code from the manifest and never writes inside the checkout', () => {
    expect(bundlePath('development')).toBe(join(home, '.sdkwork', 'birdcoder', 'credentials', 'standalone.development.json'))
    expect(bundlePath('development').startsWith(resolve(dir))).toBe(false)
  })
})

describe('materializeEnsuredBootstrapAccessToken', () => {
  it('copies generated and registered tokens into the launch environment', () => {
    const env: Record<string, string | undefined> = {}
    materializeEnsuredBootstrapAccessToken({ status: 'generated', path: '/tmp/overlay', token: 'generated' }, env)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('generated')
    materializeEnsuredBootstrapAccessToken({ status: 'registered', token: 'registered' }, env)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('registered')
  })

  it('leaves configured, unconfigured, and unavailable outcomes unchanged', () => {
    const env: Record<string, string | undefined> = { SDKWORK_ACCESS_TOKEN: 'existing' }
    materializeEnsuredBootstrapAccessToken({ status: 'configured' }, env)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('existing')
    materializeEnsuredBootstrapAccessToken({ status: 'unconfigured' }, env)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('existing')
    materializeEnsuredBootstrapAccessToken({ status: 'unavailable', reason: 'missing package' }, env)
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('existing')
  })
})

describe('ensureSdkworkBootstrapToken', () => {
  const warn = (): void => {}

  it('reports unconfigured without any SDKWork identity key', async () => {
    expect(await ensureSdkworkBootstrapToken({ cwd: dir, env: {}, warn })).toEqual({ status: 'unconfigured' })
  })

  it('keeps an explicitly configured token', async () => {
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_ACCESS_TOKEN: 'already-there',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:10240',
    }
    expect(await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })).toEqual({ status: 'configured' })
  })

  it('accepts a configured development fixture token on the remote development gateway', async () => {
    const fixture = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhcHBfaWQiOiJzZGt3b3JrLWJpcmRjb2RlciJ9.signature'
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
      SDKWORK_ACCESS_TOKEN: fixture,
    }
    expect(await ensureSdkworkBootstrapToken({
      cwd: dir,
      env,
      homeDir: home,
      warn,
      tryApplicationBootstrap: false,
    })).toEqual({ status: 'configured' })
    expect(env.SDKWORK_ACCESS_TOKEN).toBe(fixture)
  })

  it('rejects a fixture token outside the development tier on a remote gateway', async () => {
    const fixture = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhcHBfaWQiOiJzZGt3b3JrLWJpcmRjb2RlciJ9.signature'
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.test',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
      SDKWORK_ACCESS_TOKEN: fixture,
    }
    expect(await ensureSdkworkBootstrapToken({
      cwd: dir,
      env,
      homeDir: home,
      warn,
      tryApplicationBootstrap: false,
      allowTestTokenGeneration: true,
    })).toEqual({
      status: 'unavailable',
      reason: 'fixture bootstrap tokens outside the development tier require a loopback SDKWork gateway',
    })
    expect(env.SDKWORK_ACCESS_TOKEN).toBeUndefined()
  })

  it('replaces a locally issued IAM token on a remote development gateway with a disposable fixture', async () => {
    const local = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${Buffer.from(JSON.stringify({ iss: 'sdkwork-iam-local' })).toString('base64url')}.signature`
    const env: Record<string, string | undefined> = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
      SDKWORK_ACCESS_TOKEN: local,
    }
    const result = await ensureSdkworkBootstrapToken({
      cwd: dir,
      env,
      homeDir: home,
      warn,
      tryApplicationBootstrap: false,
    })
    expect(result.status).toBe('generated')
    expect(env.SDKWORK_ACCESS_TOKEN).toBeUndefined()
  })

  it('treats an empty SDKWORK_ACCESS_TOKEN as unset and reuses the credential bundle', async () => {
    const path = writeTokenBundle('development', 'overlay-jwt')
    const env = { SDKWORK_PROFILE_ID: 'standalone.development', SDKWORK_ACCESS_TOKEN: '' }
    expect(await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })).toEqual({
      status: 'generated',
      path,
      token: 'overlay-jwt',
    })
  })

  it('reuses the registration output token', async () => {
    writeFileSync(join(dir, '.sdkwork.local.env'), 'SDKWORK_ACCESS_TOKEN=registered-token\n')
    const env = { SDKWORK_PROFILE_ID: 'standalone.development' }
    expect(await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })).toEqual({
      status: 'registered',
      token: 'registered-token',
    })
  })

  it('rejects a registered fixture token outside the development tier on a remote gateway', async () => {
    const fixture = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhcHBfaWQiOiJzZGt3b3JrLWJpcmRjb2RlciJ9.signature'
    writeFileSync(join(dir, '.sdkwork.local.env'), `SDKWORK_ACCESS_TOKEN=${fixture}\n`)
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.test',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
    }
    expect(await ensureSdkworkBootstrapToken({
      cwd: dir,
      env,
      homeDir: home,
      warn,
      tryApplicationBootstrap: false,
      allowTestTokenGeneration: true,
    })).toEqual({
      status: 'unavailable',
      reason: 'fixture bootstrap tokens outside the development tier require a loopback SDKWork gateway',
    })
  })

  it('generates a development fixture JWT into the user credential store and is idempotent', async () => {
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:10240',
    }
    const path = bundlePath('development')
    const first = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })
    expect(first.status).toBe('generated')
    expect(first.status === 'generated' ? first.path : '').toBe(path)
    expect(existsSync(path)).toBe(true)
    const bundle = readCredentialBundle(path)
    expect(bundle?.accessToken.split('.')).toHaveLength(3)
    expect(bundle?.environment).toBe('development')
    expect(bundle?.deploymentProfile).toBe('standalone')
    expect(bundle?.source).toBe('local-fixture')
    // Nothing is ever written inside the checkout.
    expect(readdirSync(dir).filter(name => name.includes('bootstrap'))).toEqual([])
    const before = readFileSync(path, 'utf8')
    const second = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })
    expect(second.status).toBe('generated')
    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  it('reuses a cached token without calling IAM bootstrap or the network', async () => {
    const token = [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({
        app_id: 'sdkwork-birdcoder',
        environment: 'development',
        exp: Math.floor(Date.now() / 1000) + 3600,
        token_version: 1,
      })).toString('base64url'),
      'signature',
    ].join('.')
    writeTokenBundle('development', token)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    try {
      const env = {
        SDKWORK_PROFILE_ID: 'standalone.development',
        SDKWORK_ACCESS_TOKEN: token,
        SDKWORK_BACKEND_BASE_URL: 'http://127.0.0.1:3900',
        SDKWORK_IAM_BOOTSTRAP_OPERATOR_PASSWORD: 'operator-password',
        SDKWORK_IAM_BOOTSTRAP_OPERATOR_USERNAME: 'admin',
        SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
      }
      const result = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })
      expect(result.status).toBe('configured')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('generates for test only with the explicit allowance', async () => {
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.test',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:10240',
    }
    expect(await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })).toEqual({
      status: 'unavailable',
      reason: 'test token generation requires allowTestTokenGeneration',
    })
    expect(existsSync(bundlePath('test'))).toBe(false)
    const allowed = await ensureSdkworkBootstrapToken({ cwd: dir, env, allowTestTokenGeneration: true, homeDir: home, warn })
    expect(allowed.status).toBe('generated')
  })

  it('generates a development fixture token for the remote development gateway', async () => {
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
    }
    const result = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn, tryApplicationBootstrap: false })
    expect(result.status).toBe('generated')
    expect(existsSync(bundlePath('development'))).toBe(true)
  })

  it('reuses an existing local fixture bundle for the remote development gateway', async () => {
    const path = writeTokenBundle('development', FIXTURE_TOKEN)
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: REMOTE_GATEWAY_URL,
    }
    await expect(ensureSdkworkBootstrapToken({
      cwd: dir,
      env,
      homeDir: home,
      warn,
      tryApplicationBootstrap: false,
    })).resolves.toEqual({
      status: 'generated',
      path,
      token: FIXTURE_TOKEN,
    })
  })

  it('fails closed for production and staging', async () => {
    const env = { SDKWORK_PROFILE_ID: 'standalone.production' }
    const result = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })
    expect(result.status).toBe('unavailable')
    expect(result.status === 'unavailable' ? result.reason : '').toContain('private secret source')
    expect(existsSync(bundlePath('production'))).toBe(false)
  })

  it('reports unavailable when the manifest is missing', async () => {
    rmSync(join(dir, 'agent.app.config.json'))
    const env = {
      SDKWORK_PROFILE_ID: 'standalone.development',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:10240',
    }
    const result = await ensureSdkworkBootstrapToken({ cwd: dir, env, homeDir: home, warn })
    expect(result.status).toBe('unavailable')
    expect(result.status === 'unavailable' ? result.reason : '').toContain('agent.app.config.json')
  })
})

describe('injected environment provenance', () => {
  it('marks every non-empty SDKWork value this process resolved', () => {
    const env: Record<string, string | undefined> = {
      PATH: '/usr/bin',
      SDKWORK_ENVIRONMENT: 'production',
      VITE_SDKWORK_BIRDCODER_ENVIRONMENT: 'production',
      SDKWORK_ACCESS_TOKEN: '',
    }
    markInjectedSdkworkEnv(env)
    expect(env[SDKWORK_INJECTED_ENV_MARKER]?.split('\n')).toEqual([
      'SDKWORK_ENVIRONMENT=production',
      'VITE_SDKWORK_BIRDCODER_ENVIRONMENT=production',
    ])
  })

  it('marks nothing when the environment carries no SDKWork value', () => {
    const env: Record<string, string | undefined> = { PATH: '/usr/bin' }
    markInjectedSdkworkEnv(env)
    expect(env[SDKWORK_INJECTED_ENV_MARKER]).toBeUndefined()
  })

  it('drops only the values that still match the marker and consumes it', () => {
    const env: Record<string, string | undefined> = {
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: 'https://api.birdcoder.com',
      SDKWORK_ACCESS_TOKEN: 'production-token',
    }
    markInjectedSdkworkEnv(env)
    env.SDKWORK_ACCESS_TOKEN = 'operator-token'
    expect(clearInheritedInjectedSdkworkEnv(env)).toEqual([
      'SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL',
      'SDKWORK_ENVIRONMENT',
    ])
    expect(env.SDKWORK_ENVIRONMENT).toBeUndefined()
    expect(env.SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL).toBeUndefined()
    expect(env.SDKWORK_ACCESS_TOKEN).toBe('operator-token')
    expect(env[SDKWORK_INJECTED_ENV_MARKER]).toBeUndefined()
  })

  it('ignores an absent marker and a malformed entry', () => {
    expect(clearInheritedInjectedSdkworkEnv({ SDKWORK_ENVIRONMENT: 'production' })).toEqual([])
    const env: Record<string, string | undefined> = {
      [SDKWORK_INJECTED_ENV_MARKER]: 'no-separator\n=empty-key',
      SDKWORK_ENVIRONMENT: 'production',
    }
    expect(clearInheritedInjectedSdkworkEnv(env)).toEqual([])
    expect(env.SDKWORK_ENVIRONMENT).toBe('production')
  })

  it('recognizes only a complete, default-valued production deployment', () => {
    const complete: Record<string, string | undefined> = {
      SDKWORK_ENVIRONMENT: 'production',
      SDKWORK_DEPLOYMENT_PROFILE: 'standalone',
      SDKWORK_PROFILE_ID: 'standalone.production',
      SDKWORK_BIRDCODER_ENVIRONMENT: 'production',
      SDKWORK_BIRDCODER_DEPLOYMENT_PROFILE: 'standalone',
      SDKWORK_BIRDCODER_PROFILE_ID: 'standalone.production',
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    }
    expect(dropUnmarkedPackagedProductionDeployment({ ...complete }).sort()).toEqual(Object.keys(complete).sort())
    // A profile id without the production gateway is an operator choosing the
    // tier, not a packaged deployment: nothing is dropped.
    expect(dropUnmarkedPackagedProductionDeployment({ SDKWORK_PROFILE_ID: 'standalone.production' })).toEqual([])
    expect(dropUnmarkedPackagedProductionDeployment({
      SDKWORK_BIRDCODER_PLATFORM_API_GATEWAY_HTTP_URL: SDKWORK_PRODUCTION_GATEWAY_URL,
    })).toEqual([])
    // One changed key keeps the whole set, and unrelated SDKWork values survive.
    const customized = { ...complete, SDKWORK_ENVIRONMENT: 'staging', SDKWORK_BACKEND_BASE_URL: 'https://internal.example' }
    expect(dropUnmarkedPackagedProductionDeployment(customized)).toEqual([])
    expect(customized.SDKWORK_ENVIRONMENT).toBe('staging')
    expect(customized.SDKWORK_BACKEND_BASE_URL).toBe('https://internal.example')
  })
})
