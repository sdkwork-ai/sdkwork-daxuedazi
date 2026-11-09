/**
 * Static Web application files one Desktop shell serves.
 *
 * Every source lane builds into the shared `apps/web/dist`, and that directory
 * can be rewritten by the other lane, a manual build, or the `dev:web` watcher
 * while a shell is running. A lane therefore snapshots the page it verified at
 * launch and serves the snapshot, so the document a running shell shows cannot
 * change under it. A packaged application reads the signed runtime instead.
 *
 * @module apps/desktop/src/web-application
 */

import { cpSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Environment variable through which a launcher names the page a source shell serves. */
export const WEB_APPLICATION_DIST_ENV = 'DSH_DESKTOP_WEB_DIST'

/**
 * Resolve the Web application directory this shell serves.
 *
 * An unpackaged launch serves the snapshot its launcher took
 * ({@link WEB_APPLICATION_DIST_ENV}); a packaged launch, and an unpackaged one
 * whose launcher sets no snapshot, serves the Web frontend inside the runtime.
 * @param runtimeDsh - the shell's dsh runtime root.
 * @param environment - launch environment; read for the snapshot override.
 * @returns absolute directory of the page to serve.
 */
export function resolveWebApplicationDist(
  runtimeDsh: string,
  environment: Record<string, string | undefined> = process.env,
): string {
  const snapshot = environment[WEB_APPLICATION_DIST_ENV]?.trim()
  if (snapshot !== undefined && snapshot !== '') return resolve(snapshot)
  return join(runtimeDsh, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist')
}

/**
 * Replace the lane's page snapshot with the build this launch verified.
 *
 * The previous snapshot is removed first so a file the new build dropped cannot
 * survive and be served beside it.
 * @param source - the verified `apps/web/dist` directory.
 * @param destination - the lane-owned snapshot directory.
 */
export function snapshotWebApplicationDist(source: string, destination: string): void {
  rmSync(destination, { recursive: true, force: true })
  cpSync(source, destination, { recursive: true })
}
