#!/usr/bin/env node
/**
 * Print the selected brand's release artifact prefix.
 *
 * The container release workflow runs this before it installs any toolchain, so
 * the prefix comes from the brand manifest instead of a value a step spells out.
 * Every container release file name is derived from the same manifest through
 * `container-artifacts.ts`; this entry point exists so a workflow step can read
 * the one value it needs without a TypeScript runner.
 *
 * @module brand-artifact-prefix
 */

import { resolveBrand } from '../../apps/desktop/scripts/brand-manifest.mjs'

process.stdout.write(resolveBrand().desktop.artifactPrefix)
