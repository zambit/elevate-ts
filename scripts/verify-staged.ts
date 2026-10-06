// pnpm verify-staged <version> [--review]
//
// Verifies a version that CI staged on npm, before it goes live:
//   1. Finds the staged entry with `npm stage list`
//   2. Downloads the exact staged tarball with `npm stage download`
//   3. Checks the tarball's sha1 against the registry's shasum
//   4. Installs it into a throwaway project and loads every entry point (ESM + CJS)
//   5. Prints the `npm stage approve` command. It never approves: that needs your 2FA.
//
// With --review it then walks you through the human checks on the same tarball
// (see scripts/review-tarball.ts) and writes a review record.
//
// Requires `npm login` (staged packages are only visible to maintainers).
// See docs/TESTING_STAGED_RELEASES.md.

import { readFileSync } from 'node:fs';

import { nodeReleaseDeps } from './lib/node-deps.js';
import { verifyStaged, type StagedReport } from './lib/release.js';
import { reviewTarball } from './lib/review-command.js';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const args = process.argv.slice(2);
const review = args.includes('--review');
const version = args.find((a) => !a.startsWith('--')) ?? '';
if (!SEMVER.test(version) || args.some((a) => a.startsWith('--') && a !== '--review')) {
  console.error('Usage: pnpm verify-staged <version> [--review]   (for example: pnpm verify-staged 0.9.0 --review)');
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
    ...(review
      ? ['Starting the human review...']
      : [
          'Next, the human checks (prompts you through each one):',
          '',
          `  pnpm review-tarball ${r.tarball}`,
          '',
          'Or follow docs/TESTING_STAGED_RELEASES.md by hand, then approve (prompts for 2FA):',
          '',
          `  npm stage approve ${r.item.id}`
        ])
  ].join('\n');

console.log(`[verify-staged] checking staged ${packageName}@${version}...`);
const result = await verifyStaged(nodeReleaseDeps)(packageName, version).run();

if (result.tag === 'Right') {
  console.log(report(result.right));
  if (review) process.exit(await reviewTarball(result.right.tarball, process.cwd(), { staged: result.right.item }));
} else {
  console.error(`[verify-staged] FAIL: ${result.left}`);
  process.exit(1);
}
