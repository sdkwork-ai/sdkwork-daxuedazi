/**
 * Canonical SDKWork deployment each source Desktop lane targets.
 *
 * `dev:desktop` is the standalone development deployment the checkout's
 * `.env.standalone.development` materializes. `desktop:prod` is the cloud
 * production deployment a packaged release bakes from `.env.cloud.production`,
 * which is also the deployment profile `PNPM_SCRIPT_SPEC.md` section 3.1 fixes
 * for a local surface against a deployed environment.
 *
 * The launch identity, the page a lane builds, and the release guard all read
 * these records, so a lane can never pair one deployment's built page with
 * another deployment's Host.
 *
 * @module apps/desktop/scripts/sdkwork-lane-profiles
 */

/** One lane's SDKWork deployment. */
export interface LaneSdkworkProfile {
  /** Lifecycle environment the lane declares. */
  readonly environment: 'development' | 'production'
  /** Deployment profile whose committed env file the lane reads. */
  readonly deploymentProfile: 'standalone' | 'cloud'
  /** Canonical profile id, `<deploymentProfile>.<environment>`. */
  readonly profileId: string
}

/** Deployment of the `dev:desktop` lane. */
export const DEVELOPMENT_LANE_PROFILE: LaneSdkworkProfile = Object.freeze({
  environment: 'development',
  deploymentProfile: 'standalone',
  profileId: 'standalone.development',
})

/** Deployment of the `desktop:prod` lane, which mirrors a packaged release. */
export const PRODUCTION_LANE_PROFILE: LaneSdkworkProfile = Object.freeze({
  environment: 'production',
  deploymentProfile: 'cloud',
  profileId: 'cloud.production',
})

/** Platform API gateway origin of {@link PRODUCTION_LANE_PROFILE}. */
export const PRODUCTION_GATEWAY_URL = 'https://api.sdkwork.com'
