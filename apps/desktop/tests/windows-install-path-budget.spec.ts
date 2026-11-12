import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import {
  longestInstalledPath,
  verifyWindowsInstallPathBudget,
  WINDOWS_INSTALL_PATH_LIMIT,
  WINDOWS_INSTALL_PREFIX_BUDGET,
} from '../scripts/windows-install-path-budget.mjs'

const directories: string[] = []

/** Create a throwaway packaged application directory. */
async function packagedDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-install-path-'))
  directories.push(directory)
  return directory
}

/** Create a file at an install-relative path, one segment per argument. */
async function plantFile(root: string, ...segments: string[]): Promise<string> {
  const path = join(root, ...segments)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, '')
  return segments.join('\\')
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

it('measures the deepest install-relative path with Windows separators', async () => {
  const root = await packagedDirectory()
  await plantFile(root, 'resources', 'app.asar.unpacked', 'deep', 'file.xml')
  const longest = longestInstalledPath(root)
  expect(longest.path).toBe('resources\\app.asar.unpacked\\deep\\file.xml')
  expect(longest.length).toBe(longest.path.length)
  expect(longest.path).not.toContain('/')
})

it('reports an empty tree as the installation directory itself', async () => {
  const root = await packagedDirectory()
  expect(longestInstalledPath(root)).toEqual({ path: '', length: 0 })
})

it('accepts a payload that fits the installer budget', async () => {
  const root = await packagedDirectory()
  await plantFile(root, 'resources', 'app.asar', 'x'.repeat(40))
  expect(() => verifyWindowsInstallPathBudget(root)).not.toThrow()
})

it('refuses a payload the NSIS installer could not extract', async () => {
  const root = await packagedDirectory()
  // Every segment stays inside the 255-character component limit so the fixture itself is
  // creatable; the total is what the installer cannot create.
  await plantFile(root, 'resources', 'app.asar.unpacked', 'y'.repeat(100), 'z'.repeat(100), 'file.xml')
  expect(() => verifyWindowsInstallPathBudget(root)).toThrow(/the installer can create/u)
  // The failure names the install-relative path, not the build directory, so the message
  // stays readable on a CI workspace whose own path is already long.
  expect(() => verifyWindowsInstallPathBudget(root)).toThrow(/^desktop package: .*\(resources\\/u)
})

it('keeps the reported depth equal to prefix plus the relative path', async () => {
  const root = await packagedDirectory()
  await plantFile(root, 'resources', 'a', 'b')
  const longest = verifyWindowsInstallPathBudget(root)
  expect(WINDOWS_INSTALL_PREFIX_BUDGET + 1 + longest.length).toBeLessThanOrEqual(WINDOWS_INSTALL_PATH_LIMIT)
})
