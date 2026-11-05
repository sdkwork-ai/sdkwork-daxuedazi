/** Loopback port the Desktop Host serves the Web application on. */

/** Environment variable that names the Host's Web port. */
export const DESKTOP_HOST_WEB_PORT_ENV = 'DSH_DESKTOP_HOST_WEB_PORT'

/**
 * Resolve the Web port handed to the shared profile runner.
 *
 * The port belongs to the selected brand (`desktop.webPort`), and the Desktop
 * shell always passes it here. There is no fallback: every fixed value equals
 * some brand's port, so a fallback would re-create the collision this variable
 * exists to prevent — a second installed brand, or the workspace launcher, would
 * find the listener taken and the launch would fail with `EADDRINUSE`.
 * @param environment - Host process environment; the Desktop shell sets `DSH_DESKTOP_HOST_WEB_PORT`.
 * @returns Loopback TCP port for the Web application.
 * @throws Error when the variable is absent, empty, or not an integer from 1 through 65535.
 */
export function resolveDesktopHostWebPort(environment: NodeJS.ProcessEnv): number {
  const configured = environment[DESKTOP_HOST_WEB_PORT_ENV]
  if (configured === undefined || configured === '') {
    throw new Error(`desktop host: ${DESKTOP_HOST_WEB_PORT_ENV} must be set to the selected brand's Web port`)
  }
  const port = Number(configured)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`desktop host: ${DESKTOP_HOST_WEB_PORT_ENV} must be an integer from 1 through 65535`)
  }
  return port
}
