// Local release script. Replaces the old .github/workflows/release.yml
// (which couldn't open PRs under the org's Actions policy without a PAT).
//
// What it does, in order:
//   1. Verifies the working tree is clean and you're on main
//   2. Pulls main from origin
//   3. Confirms there are pending changesets to consume
//   4. Runs `changeset version` (bumps package.json, updates CHANGELOG,
//      removes consumed changesets)
//   5. Runs `fix:changelog` to disambiguate new ### headings per the
//      project's MD024 convention
//   6. Updates the README's npm version badge to match the new version
//   7. Runs sanity checks (check:readme, lint:md)
//   8. Creates a release/<version> branch, stages exactly the files that
//      changed (no `git add -A`), commits, pushes, and opens a PR via gh
//
// Recovery: if the script aborts after step 4 but before commit, you'll
// have modified files on main. Run `git restore package.json CHANGELOG.md
// README.md && git checkout .changeset/` to undo cleanly.
//
// Pass --dry-run to skip the branch / push / PR steps (useful for testing).

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry-run');

const log = (msg) => console.log(`[make-release] ${msg}`);
const die = (msg) => {
  console.error(`[make-release] FAIL: ${msg}`);
  process.exit(1);
};
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const capture = (cmd) => execSync(cmd).toString().trim();

// 1. Clean working tree
const dirty = capture('git status --porcelain');
if (dirty) die(`uncommitted changes present:\n${dirty}\nCommit or stash before releasing.`);

// 2. On main
const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') die(`expected to be on 'main', currently on '${branch}'`);

// 3. Sync with origin/main
log('syncing with origin/main...');
run('git fetch origin main');
run('git pull --ff-only origin main');

// 4. Confirm pending changesets exist
const changesetDir = path.join(process.cwd(), '.changeset');
const pending = fs.readdirSync(changesetDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
if (pending.length === 0) {
  die('no pending changesets in .changeset/. Add one with `pnpm changeset` before releasing.');
}
log(`found ${pending.length} pending changeset(s): ${pending.join(', ')}`);

// 5. Run changeset version
log('running changeset version...');
run('pnpm changeset:version');

// 6. Disambiguate CHANGELOG headings
log('disambiguating CHANGELOG headings...');
run('pnpm fix:changelog');

// 7. Read new version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
log(`new version: ${version}`);

// 8. Sync the README badge
log(`updating README npm badge to ${version}...`);
const readmePath = path.join(process.cwd(), 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const updated = readme.replace(
  /(img\.shields\.io\/badge\/npm-)[0-9]+\.[0-9]+\.[0-9]+(?:[-+][\w.]+)?(-)/,
  `$1${version}$2`
);
if (updated === readme) {
  die(`could not find the npm badge in README.md to update — check the regex and the badge line`);
}
fs.writeFileSync(readmePath, updated);

// 9. Sanity checks
log('running check:readme and lint:md...');
run('pnpm check:readme');
run('pnpm lint:md');

if (DRY) {
  log(`DRY RUN — stopping before git branch / push / PR. Inspect the changes:`);
  run('git status');
  log(`To undo: git restore package.json CHANGELOG.md README.md && git checkout .changeset/`);
  process.exit(0);
}

// 10. Branch, stage, commit
const branchName = `release/${version}`;
log(`creating branch ${branchName}...`);
run(`git switch -c ${branchName}`);

log('staging release files...');
run('git add package.json CHANGELOG.md README.md .changeset');

log(`committing as 'release: ${version}'...`);
run(`git commit -m "release: ${version}"`);

// 11. Push
log(`pushing ${branchName}...`);
run(`git push -u origin ${branchName}`);

// 12. Open PR via gh — write body to tmp file to avoid shell quoting issues
const bodyPath = `/tmp/make-release-${version}-body.md`;
const body = `Release of \`@zambit/elevate-ts@${version}\`, prepared by \`pnpm make-release\`.

## What this PR contains

- \`package.json\` version bumped to \`${version}\`
- \`CHANGELOG.md\` appended with the consumed changesets (headings disambiguated per the MD024 convention)
- Consumed \`.changeset/*.md\` files removed
- README npm version badge updated to \`${version}\`

## Reviewer checklist

- [ ] Version bump matches the highest-level changeset (\`patch\` / \`minor\` / \`major\`)
- [ ] CHANGELOG entry reflects everything that shipped since the last release
- [ ] README badge reads \`${version}\`
- [ ] CI is green

## After merge

Push the tag from your local main to trigger \`publish.yml\`:

\`\`\`sh
git fetch origin && git checkout main && git pull
git tag '@zambit/elevate-ts@${version}' -m 'Release ${version}'
git push origin '@zambit/elevate-ts@${version}'
\`\`\`

\`publish.yml\` will then build, test, \`npm publish\` against the \`prod\` environment, and create the GitHub Release. See [PUBLISH_CHECKLIST.md](PUBLISH_CHECKLIST.md) for the full procedure.
`;
fs.writeFileSync(bodyPath, body);

log('opening PR via gh...');
const assignee = capture('git config user.name');
run(`gh pr create --title "release: ${version}" --label cla-signed --assignee "${assignee}" --body-file ${bodyPath}`);

log(`done. PR opened for ${branchName}. After it merges, push tag '@zambit/elevate-ts@${version}'.`);
