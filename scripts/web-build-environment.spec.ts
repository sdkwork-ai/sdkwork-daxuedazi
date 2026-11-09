/** The Web build record is the only proof that a lane's page carries its own deployment. */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import {
  WEB_BUILD_ENVIRONMENT_PATH,
  assertWebBuildEnvironment,
  readWebBuildEnvironment,
  webBuildEnvironment,
  writeWebBuildEnvironment,
} from './web-build-environment.ts'

/** @returns a temporary repository root removed when the test finishes. */
function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-web-build-environment-'))
  onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
  return root
}

it('composes the canonical profile id of one deployment', () => {
  expect(webBuildEnvironment('cloud', 'production')).toEqual({
    formatVersion: 1,
    deploymentProfile: 'cloud',
    environment: 'production',
    profileId: 'cloud.production',
  })
  expect(webBuildEnvironment('standalone', 'development').profileId).toBe('standalone.development')
})

it('round-trips the deployment a build recorded', () => {
  const root = fixtureRoot()
  const record = writeWebBuildEnvironment(root, webBuildEnvironment('cloud', 'production'))
  expect(JSON.parse(readFileSync(join(root, WEB_BUILD_ENVIRONMENT_PATH), 'utf8'))).toEqual(record)
  expect(readWebBuildEnvironment(root)).toEqual(record)
})

it('refuses a missing record with the build it needs', () => {
  expect(() => readWebBuildEnvironment(fixtureRoot())).toThrow(/missing/u)
  expect(() => readWebBuildEnvironment(fixtureRoot())).toThrow(/build:artifacts/u)
})

it('refuses a malformed record', () => {
  const root = fixtureRoot()
  writeWebBuildEnvironment(root, webBuildEnvironment('cloud', 'production'))
  writeFileSync(join(root, WEB_BUILD_ENVIRONMENT_PATH), '{not json')
  expect(() => readWebBuildEnvironment(root)).toThrow(/invalid JSON/u)
})

it('refuses a record that names no shipped profile', () => {
  const root = fixtureRoot()
  writeWebBuildEnvironment(root, webBuildEnvironment('cloud', 'production'))
  writeFileSync(join(root, WEB_BUILD_ENVIRONMENT_PATH), JSON.stringify({
    formatVersion: 1, deploymentProfile: 'cloud', environment: 'production', profileId: 'cloud.local',
  }))
  expect(() => readWebBuildEnvironment(root)).toThrow(/no shipped profile/u)
})

it('refuses a record whose keys disagree with its profile id', () => {
  const root = fixtureRoot()
  writeWebBuildEnvironment(root, webBuildEnvironment('cloud', 'production'))
  writeFileSync(join(root, WEB_BUILD_ENVIRONMENT_PATH), JSON.stringify({
    formatVersion: 1, deploymentProfile: 'standalone', environment: 'production', profileId: 'cloud.production',
  }))
  expect(() => readWebBuildEnvironment(root)).toThrow(/does not match profile cloud\.production/u)
})

it('refuses a record from another format', () => {
  const root = fixtureRoot()
  writeWebBuildEnvironment(root, webBuildEnvironment('cloud', 'production'))
  writeFileSync(join(root, WEB_BUILD_ENVIRONMENT_PATH), JSON.stringify({
    formatVersion: 2, deploymentProfile: 'cloud', environment: 'production', profileId: 'cloud.production',
  }))
  expect(() => readWebBuildEnvironment(root)).toThrow(/uses format 2/u)
})

it('accepts the deployment a consumer expects', () => {
  const production = webBuildEnvironment('cloud', 'production')
  expect(() => { assertWebBuildEnvironment(production, production, 'the online lane') }).not.toThrow()
})

it('rejects the deployment another lane built, naming both sides', () => {
  const development = webBuildEnvironment('standalone', 'development')
  const production = webBuildEnvironment('cloud', 'production')
  expect(() => { assertWebBuildEnvironment(development, production, 'the online lane') })
    .toThrow(/the online lane requires a Web build of cloud\.production/u)
  expect(() => { assertWebBuildEnvironment(development, production, 'the online lane') })
    .toThrow(/records standalone\.development/u)
})
