/**
 * Refuse a packaged Windows application whose extraction would exceed `MAX_PATH`.
 *
 * The installer unzips the payload with plain Win32 calls, which stop at `MAX_PATH`, so an
 * over-long path aborts the whole installation with
 * `Failed to decompress files ... Error opening output file(s)` before the application is
 * ever launched. The packaged directory is always built somewhere short and disposable
 * (`.desktop-build`, a CI workspace), so the build machine cannot observe the depth the
 * user's staging directory produces: the invariant has to be measured against the
 * installation root rather than against the path the packaging lane happens to use.
 */
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Characters reserved ahead of the packaged tree while the installer extracts it.
 *
 * The branded installer stages the application in `$INSTDIR.new-{GUID}` and renames it
 * into place afterwards (`installer-directories.nsh`, `dshStageApplication`), so every
 * file is created one staging suffix deeper than its final home. With the shipped
 * per-machine default that root is:
 *
 *   `C:\Program Files\` (16) + the application directory (16, covering `daxuedazi` and a
 *   localized product name) + `.new-` and a braced GUID (43) = 75 characters.
 *
 * Measured against that root rather than a bare installation directory, the released
 * `0.2.2-rc.6` payload reaches 291 characters and fails, while the single-engine payload is
 * 248 and fits.
 */
export const WINDOWS_INSTALL_PREFIX_BUDGET = 76

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
    throw new Error(`desktop package: the extracted Windows tree reaches a ${installed}-character path `
      + `(${longest.path}) below a ${WINDOWS_INSTALL_PREFIX_BUDGET}-character staging root, `
      + `past the ${WINDOWS_INSTALL_PATH_LIMIT}-character ceiling the installer can create; `
      + 'shorten the packaged path (drop a duplicate nested dependency or a deep asset directory) before packaging')
  }
  return longest
}
