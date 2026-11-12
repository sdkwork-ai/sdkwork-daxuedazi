/**
 * Refuse a packaged Windows application whose installed layout cannot be extracted.
 *
 * NSIS creates the installed tree with plain Win32 calls, which stop at `MAX_PATH`, so an
 * over-long installed path fails the whole installation with
 * `Failed to decompress files ... Error opening output file(s)` before the application is
 * ever launched. The packaged directory is always built somewhere short and disposable
 * (`.desktop-build`, a CI workspace), so the build machine cannot observe the depth the
 * user's profile produces: the invariant has to be measured against the install directory
 * rather than against the path the packaging lane happens to use.
 */
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Characters reserved for `%LOCALAPPDATA%\Programs\<appName>`, the default per-user
 * installation directory the branded installer offers.
 *
 * `C:\Users\` (9) + a 20-character profile name + `\AppData\Local\Programs\` (24) +
 * `daxuedazi` (9). A profile name of 20 characters is the longest Windows reliably
 * creates; the branded display name never reaches the file system, because `productName`
 * and the executable stay ASCII.
 */
export const WINDOWS_INSTALL_PREFIX_BUDGET = 62

/** Usable characters in a Win32 path, one short of `MAX_PATH` for the terminator. */
export const WINDOWS_INSTALL_PATH_LIMIT = 259

/**
 * Find the longest path an installed copy of the application would produce.
 * @param appOutDir - Packaged application directory electron-builder assembled.
 * @returns Install-directory-relative path and its length; the directory itself at length 0 for an empty tree.
 */
export function longestInstalledPath(appOutDir) {
  const root = resolve(appOutDir)
  let longest = { path: '', length: 0 }
  const walk = (directory, relativeDirectory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = relativeDirectory === '' ? entry.name : `${relativeDirectory}\\${entry.name}`
      if (path.length > longest.length) longest = { path, length: path.length }
      if (entry.isDirectory()) walk(join(directory, entry.name), path)
    }
  }
  walk(root, '')
  return longest
}

/**
 * Fail when the packaged tree would install deeper than Win32 can create.
 *
 * The measurement is taken on the assembled directory and then offset by
 * `WINDOWS_INSTALL_PREFIX_BUDGET`, so a deeper payload is reported here with the offending
 * file instead of on a user's machine as a decompression failure.
 * @param appOutDir - Packaged application directory electron-builder assembled.
 * @returns The measured install-relative path for logging.
 */
export function verifyWindowsInstallPathBudget(appOutDir) {
  const longest = longestInstalledPath(appOutDir)
  const installed = WINDOWS_INSTALL_PREFIX_BUDGET + 1 + longest.length
  if (installed > WINDOWS_INSTALL_PATH_LIMIT) {
    throw new Error(`desktop package: the installed Windows tree reaches a ${installed}-character path `
      + `(${longest.path}) under a ${WINDOWS_INSTALL_PREFIX_BUDGET}-character default installation directory, `
      + `past the ${WINDOWS_INSTALL_PATH_LIMIT}-character ceiling the NSIS installer can create; `
      + 'shorten the packaged path (drop a duplicate nested dependency or a deep asset directory) before packaging')
  }
  return longest
}
