/** Characters reserved for the default per-user Windows installation directory. */
export const WINDOWS_INSTALL_PREFIX_BUDGET: number

/** Usable characters in a Win32 path, one short of `MAX_PATH` for the terminator. */
export const WINDOWS_INSTALL_PATH_LIMIT: number

/** Longest install-directory-relative path the packaged tree would produce. */
export interface LongestInstalledPath {
  /** Path relative to the installation directory, using Windows separators. */
  path: string
  /** Characters in `path`. */
  length: number
}

/**
 * Find the longest path an installed copy of the application would produce.
 * @param appOutDir Packaged application directory electron-builder assembled.
 * @returns Install-directory-relative path and its length; the directory itself at length 0 for an empty tree.
 */
export function longestInstalledPath(appOutDir: string): LongestInstalledPath

/**
 * Fail when the packaged tree would install deeper than Win32 can create.
 * @param appOutDir Packaged application directory electron-builder assembled.
 * @returns The measured install-relative path for logging.
 */
export function verifyWindowsInstallPathBudget(appOutDir: string): LongestInstalledPath
