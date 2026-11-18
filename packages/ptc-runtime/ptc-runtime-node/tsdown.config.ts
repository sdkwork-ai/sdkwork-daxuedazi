import { defineConfig } from 'tsdown'
import { hostOnlyTsdownConfig } from '../../../scripts/tsdown-build-face.ts'

/**
 * The Node provider and its private process bootstraps are published bundles.
 *
 * Their entries are the Host compiler's emitted JavaScript (`lib/types/*.js`),
 * and this package belongs to `tsconfig.host.json` only, so the Client tsdown
 * pass must not rebuild them: that pass runs after the Client compiler, which
 * never emits this package, and on a clean Linux checkout the entries are
 * absent — the pass then aborts with `UNRESOLVED_ENTRY`. `sandbox-windows-acl`
 * and `liveshare-protocol` state the same host-only rule.
 */
const HOST_LIBRARY = [
  { entry: ['lib/types/index.js', 'lib/types/configuration.js'], outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  {
    entry: { process: 'lib/types/process-entry.js' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      alwaysBundle: ['@deepseek-ai/dsh-subprocess/control', 'acorn', 'acorn-walk', 'birpc'],
    },
  },
  {
    entry: { 'persistent-process': 'lib/types/persistent-process-entry.js' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      alwaysBundle: ['@deepseek-ai/dsh-subprocess/control', 'acorn', 'acorn-walk', 'birpc'],
    },
  },
] as const

export default defineConfig((options, meta) => hostOnlyTsdownConfig(HOST_LIBRARY, options, meta))
