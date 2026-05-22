// Appends "(VERSION)" to any `### Minor|Major|Patch Changes` heading in
// CHANGELOG.md that does not already carry a suffix. Run automatically by
// release.yml right after `changeset version` so the project's "unique
// heading per release" convention (see commit 13eeb15) stays enforced
// without manual editing.
//
// Idempotent: re-running on an already-fixed file makes no changes.
// Conservative: only touches headings that exactly match the unsuffixed
// form, so existing `(0.6.0)` / `for 2026-04-09` style headings are
// left as-is.

import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'CHANGELOG.md');
const original = fs.readFileSync(file, 'utf8');
const lines = original.split('\n');

const versionRe = /^## ([0-9]+\.[0-9]+\.[0-9]+(?:[-+][\w.]+)?)\s*$/;
const headingRe = /^(### (?:Minor|Major|Patch) Changes)\s*$/;

let currentVersion = null;
let changed = false;

const out = lines.map((line) => {
  const v = line.match(versionRe);
  if (v) {
    currentVersion = v[1];
    return line;
  }
  if (currentVersion === null) return line;
  const h = line.match(headingRe);
  if (!h) return line;
  changed = true;
  return `${h[1]} (${currentVersion})`;
});

if (changed) {
  fs.writeFileSync(file, out.join('\n'));
  console.log('[disambiguate-changelog] applied version suffixes to changeset headings');
} else {
  console.log('[disambiguate-changelog] no changes needed');
}
