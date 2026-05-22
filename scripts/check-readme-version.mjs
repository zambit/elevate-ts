// Verifies the README's npm version badge matches package.json's version.
// Catches the case where a release lands without bumping the README badge,
// so consumers see a stale version on the repo's front page.

import fs from 'fs';
import path from 'path';

const pkgPath = path.join(process.cwd(), 'package.json');
const readmePath = path.join(process.cwd(), 'README.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const readme = fs.readFileSync(readmePath, 'utf8');

const expectedVersion = pkg.version;
const badgeRe = /img\.shields\.io\/badge\/npm-([0-9]+\.[0-9]+\.[0-9]+(?:[-+][\w.]+)?)-/;
const match = readme.match(badgeRe);

if (!match) {
  console.error('[check-readme-version] FAIL: no npm shields.io badge found in README.md');
  console.error('Expected a line containing: img.shields.io/badge/npm-<version>-...');
  process.exit(1);
}

const badgeVersion = match[1];

if (badgeVersion !== expectedVersion) {
  console.error(`[check-readme-version] FAIL: README badge (${badgeVersion}) does not match package.json version (${expectedVersion}).`);
  console.error(`Update the badge in README.md to: ![npm](https://img.shields.io/badge/npm-${expectedVersion}-lightgrey)`);
  process.exit(1);
}

console.log(`[check-readme-version] OK: README badge matches package.json (${expectedVersion})`);
