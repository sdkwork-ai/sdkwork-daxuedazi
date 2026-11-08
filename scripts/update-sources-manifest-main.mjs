// One-off helper: update every sdkwork-sources.manifest.json commit to the
// repository's current main branch head. Usage: node scripts/update-sources-manifest-main.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const manifestPath = new URL('./sdkwork-sources.manifest.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const rows = [...manifest.repositories, ...(manifest.rustRepositories ?? [])]
const failures = []

for (const row of rows) {
  const api = `https://api.github.com/repos/sdkwork-ai/${row.name}/branches/main`
  const headers = { 'User-Agent': 'sdkwork-manifest-sync' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(api, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const sha = data?.commit?.sha
      if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) throw new Error('no sha in response')
      if (sha !== row.commit) {
        console.log(`${row.name}: ${row.commit.slice(0, 10)} -> ${sha.slice(0, 10)}`)
        row.commit = sha
      } else {
        console.log(`${row.name}: already at main ${sha.slice(0, 10)}`)
      }
      break
    } catch (error) {
      if (attempt === 3) failures.push(`${row.name}: ${error.message}`)
      else await new Promise(resolve => setTimeout(resolve, 1500))
    }
  }
}

// Repositories the GitHub API cannot see (org-private) keep their pinned
// commit; sync them from a local clone out of band. A partial result is still
// written so one unreachable repo never blocks the other 35.
if (failures.length > 0) {
  console.log('KEPT PINNED (API unreachable, sync out of band):\n' + failures.join('\n'))
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log('manifest updated')
if (failures.length > 0) process.exit(2)
