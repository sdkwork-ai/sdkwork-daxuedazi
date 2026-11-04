/**
 * Windows runtime patch loaded with `--require` into the pnpm bundled in the
 * desktop runtime (see `prepare-dsh.ts`).
 *
 * pnpm registers every project that uses a store as `store/v11/projects/<hash>`
 * and rewrites that entry with `fs.promises.unlink`. On Windows the entry is a
 * directory junction, and `unlink` answers a reparse point with `EPERM`, so the
 * second `install` of one packaging run aborts while it re-registers the project
 * the first one created. `rmSync` deletes the reparse point itself without
 * following it into the project directory, which is what the entry means.
 */

'use strict'

if (process.platform === 'win32') {
  const fs = require('node:fs')
  const { unlink } = fs.promises
  fs.promises.unlink = async function unlinkOrRemoveJunction(path) {
    try {
      return await unlink.call(fs.promises, path)
    } catch (error) {
      if (error === null || typeof error !== 'object' || error.code !== 'EPERM' || error.syscall !== 'unlink') throw error
      fs.rmSync(path, { recursive: true, force: true })
    }
  }
}
