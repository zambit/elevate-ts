// pnpm verify-staged <version>
//
// Verifies a version that CI staged on npm, before it goes live:
//   1. Finds the staged entry with `npm stage list`
//   2. Downloads the exact staged tarball with `npm stage download`
//   3. Checks the tarball's sha1 against the registry's shasum
//   4. Installs it into a throwaway project and loads every entry point (ESM + CJS)
//   5. Prints the `npm stage approve` command. It never approves: that needs your 2FA.
//
// Requires `npm login` (staged packages are only visible to maintainers).
// See docs/TESTING_STAGED_RELEASES.md.

import { readFileSync } from 'node:fs';

import { nodeReleaseDeps } from './lib/node-deps.js';
import { verifyStaged, type StagedReport } from './lib/release.js';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const version = process.argv[2] ?? '';
if (!SEMVER.test(version)) {
  console.error('Usage: pnpm verify-staged <version>   (for example: pnpm verify-staged 0.9.0)');
  process.exit(1);
}

const packageName = (JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }).name;

const report = (r: StagedReport): string =>
  [
    `[verify-staged] OK: ${r.item.packageName}@${r.item.version}`,
    `  stage id:   ${r.item.id}`,
    `  dist-tag:   ${r.item.tag}`,
    `  shasum:     ${r.item.shasum} (matches download)`,
    `  smoke test: ${r.smoke.entryPoints} entry points load under ESM and CJS`,
    `  tarball:    ${r.tarball}`,
    '',
    'Finish the human checks in docs/TESTING_STAGED_RELEASES.md, then approve (prompts for 2FA):',
    '',
    `  npm stage approve ${r.item.id}`
  ].join('\n');

console.log(`[verify-staged] checking staged ${packageName}@${version}...`);
const result = await verifyStaged(nodeReleaseDeps)(packageName, version).run();

if (result.tag === 'Right') {
  console.log(report(result.right));
} else {
  console.error(`[verify-staged] FAIL: ${result.left}`);
  process.exit(1);
}
