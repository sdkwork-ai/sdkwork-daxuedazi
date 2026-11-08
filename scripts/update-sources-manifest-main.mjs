// One-off helper: update every sdkwork-sources.manifest.json commit to the
// repository's current main branch head. Usage: node scripts/update-sources-manifest-main.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const manifestPath = new URL('./sdkwork-sources.manifest.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const rows = [...manifest.repositories, ...(manifest.rustRepositories ?? [])]
const failures = []

for (const row of rows) {
  const api = `https://api.github.com/repos/sdkwork-ai/${row.name}/branches/main`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(api, { headers: { 'User-Agent': 'sdkwork-manifest-sync' } })
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

if (failures.length > 0) {
  console.error('FAILED:\n' + failures.join('\n'))
  process.exit(1)
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log('manifest updated')
