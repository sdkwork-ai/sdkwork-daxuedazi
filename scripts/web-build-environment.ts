/**
 * The SDKWork deployment one Web build baked into `apps/web/dist`.
 *
 * The Web frontend reads exactly one committed `.env.<deploymentProfile>.<environment>`
 * file and embeds that deployment's gateway, application identity, and bootstrap
 * credential into the page. The development lane, the online-debug lane, and the
 * release therefore consume different builds of the same output directory, and a
 * consumer that reuses another lane's artifacts would silently talk to that lane's
 * deployment. This record travels beside the client build record, and every
 * consumer that launches or packages the built page proves it first.
 *
 * @module scripts/web-build-environment
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/** Repository-relative record of the deployment the current Web build baked. */
export const WEB_BUILD_ENVIRONMENT_PATH = '.dsh-build/web-environment.json'

/** Deployment profile a Web build can target (`apps/web/vite.config.ts`). */
export type WebDeploymentProfile = 'standalone' | 'cloud'

/** Lifecycle environment a Web build can target. */
export type WebEnvironment = 'development' | 'test' | 'staging' | 'production'

/** Record schema this module reads and writes. */
const WEB_BUILD_ENVIRONMENT_FORMAT = 1

/** Deployment one built page carries, as a consumer reads it back. */
export interface WebBuildEnvironment {
  /** Record schema version. */
  readonly formatVersion: typeof WEB_BUILD_ENVIRONMENT_FORMAT
  /** Deployment profile whose env file the build read. */
  readonly deploymentProfile: WebDeploymentProfile
  /** Lifecycle environment whose env file the build read. */
  readonly environment: WebEnvironment
  /** Canonical profile id, `<deploymentProfile>.<environment>`. */
  readonly profileId: string
}

/** Profiles this build system ships; a lane may name only one of them. */
const PROFILES: Readonly<Record<string, readonly [WebDeploymentProfile, WebEnvironment]>> = {
  'cloud.development': ['cloud', 'development'],
  'cloud.test': ['cloud', 'test'],
  'cloud.staging': ['cloud', 'staging'],
  'cloud.production': ['cloud', 'production'],
  'standalone.development': ['standalone', 'development'],
  'standalone.test': ['standalone', 'test'],
  'standalone.staging': ['standalone', 'staging'],
  'standalone.production': ['standalone', 'production'],
}

/**
 * Compose the record a build of one deployment writes.
 * @param deploymentProfile - deployment profile the build read.
 * @param environment - lifecycle environment the build read.
 * @returns the record, with the canonical profile id.
 */
export function webBuildEnvironment(
  deploymentProfile: WebDeploymentProfile,
  environment: WebEnvironment,
): WebBuildEnvironment {
  return {
    formatVersion: WEB_BUILD_ENVIRONMENT_FORMAT,
    deploymentProfile,
    environment,
    profileId: `${deploymentProfile}.${environment}`,
  }
}

/**
 * Write the record of the deployment one Web build baked.
 * @param root - repository root that owns the build output.
 * @param record - deployment the build read.
 * @returns the written record.
 */
export function writeWebBuildEnvironment(
  root: string,
  record: WebBuildEnvironment,
): WebBuildEnvironment {
  const path = resolve(root, WEB_BUILD_ENVIRONMENT_PATH)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`)
  return record
}

/**
 * Read the deployment the current Web build baked.
 * @param root - repository root that owns the build output.
 * @returns the recorded deployment.
 * @throws When the record is missing or does not describe a shipped profile.
 */
export function readWebBuildEnvironment(root: string): WebBuildEnvironment {
  const path = resolve(root, WEB_BUILD_ENVIRONMENT_PATH)
  if (!existsSync(path)) {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} is missing; build the Web frontend `
      + '(`pnpm run build:artifacts`) before launching or packaging it')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} is invalid JSON: ${detail}`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} has an invalid document`)
  }
  const record = parsed as Record<string, unknown>
  if (record.formatVersion !== WEB_BUILD_ENVIRONMENT_FORMAT) {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} uses format ${String(record.formatVersion)}; `
      + `expected ${String(WEB_BUILD_ENVIRONMENT_FORMAT)}`)
  }
  const profileId = record.profileId
  if (typeof profileId !== 'string') {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} names no shipped profile: ${JSON.stringify(profileId)}`)
  }
  const known = PROFILES[profileId]
  if (known === undefined) {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} names no shipped profile: ${JSON.stringify(profileId)}`)
  }
  const [deploymentProfile, environment] = known
  if (record.deploymentProfile !== deploymentProfile || record.environment !== environment) {
    throw new Error(`Web build record ${WEB_BUILD_ENVIRONMENT_PATH} does not match profile ${profileId}`)
  }
  return { formatVersion: WEB_BUILD_ENVIRONMENT_FORMAT, deploymentProfile, environment, profileId }
}

/**
 * Require the built page to carry the deployment a consumer expects.
 * @param actual - record read from the built output.
 * @param expected - deployment the consumer resolves for its own lane.
 * @param consumer - short name of the consumer, used in the failure message.
 */
export function assertWebBuildEnvironment(
  actual: WebBuildEnvironment,
  expected: WebBuildEnvironment,
  consumer: string,
): void {
  if (actual.profileId === expected.profileId) return
  throw new Error(`${consumer} requires a Web build of ${expected.profileId}, but `
    + `${WEB_BUILD_ENVIRONMENT_PATH} records ${actual.profileId}; rebuild the Web frontend for this lane `
    + 'instead of reusing another environment\'s artifacts')
}
