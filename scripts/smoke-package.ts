// pnpm smoke:package
//
// Packs the package with `pnpm pack`, installs the tarball into a
// throwaway consumer project, and loads every subpath export under ESM and CJS.
// Run after `pnpm build`. CI runs this before `npm stage publish`.

import { readFileSync } from 'node:fs';

import { nodeReleaseDeps } from './lib/node-deps.js';
import { packAndSmoke } from './lib/release.js';

const packageName = (JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }).name;

const result = await packAndSmoke(nodeReleaseDeps)(process.cwd(), packageName).run();

if (result.tag === 'Right') {
  console.log(`[smoke:package] OK: ${result.right.name}@${result.right.version}, ${result.right.entryPoints} entry points load under ESM and CJS`);
} else {
  console.error(`[smoke:package] FAIL: ${result.left}`);
  process.exit(1);
}
