/** A running lane must keep serving the page its own build produced. */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import {
  WEB_APPLICATION_DIST_ENV,
  resolveWebApplicationDist,
  snapshotWebApplicationDist,
} from '../src/web-application.ts'

/** @returns a temporary directory removed when the test finishes. */
function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  onTestFinished(() => { rmSync(directory, { recursive: true, force: true }) })
  return directory
}

it('serves the runtime Web frontend when no lane snapshot is named', () => {
  expect(resolveWebApplicationDist('/runtime/dsh', {}))
    .toBe(join('/runtime/dsh', 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist'))
  expect(resolveWebApplicationDist('/runtime/dsh', { [WEB_APPLICATION_DIST_ENV]: '   ' }))
    .toBe(join('/runtime/dsh', 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist'))
})

it('serves the lane snapshot a launcher verified', () => {
  expect(resolveWebApplicationDist('/runtime/dsh', { [WEB_APPLICATION_DIST_ENV]: join('/lane', 'web') }))
    .toBe(resolve(join('/lane', 'web')))
})

it('replaces the previous snapshot so a dropped file cannot survive', () => {
  const root = temporaryDirectory('dsh-web-snapshot-')
  const source = join(root, 'dist')
  const destination = join(root, 'lane', 'web')
  mkdirSync(source, { recursive: true })
  mkdirSync(destination, { recursive: true })
  writeFileSync(join(source, 'index.html'), 'fresh')
  writeFileSync(join(source, 'app.js'), 'script')
  writeFileSync(join(destination, 'index.html'), 'stale')
  writeFileSync(join(destination, 'removed-by-new-build.js'), 'stale')
  snapshotWebApplicationDist(source, destination)
  expect(readFileSync(join(destination, 'index.html'), 'utf8')).toBe('fresh')
  expect(existsSync(join(destination, 'removed-by-new-build.js'))).toBe(false)
})
