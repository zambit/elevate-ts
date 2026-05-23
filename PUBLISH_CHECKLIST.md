# Publication Checklist for elevate-ts

This project uses [Changesets](https://github.com/changesets/changesets) for semantic versioning and changelog generation. Release prep is driven from your local machine via `pnpm make-release`; the
actual `npm publish` runs in CI on tag push.

> **Why local prep?** The `zambit` GitHub org disallows GitHub Actions from creating pull requests. Rather than route around that with a PAT or App, the release PR is opened from your machine (under
> your identity) where you already have full credentials. CI still handles the half it does well — npm publish, GitHub Release — once you push the tag. See PRs #26–#28 in the project history for the
> full reasoning.

## Release Process

### Step 1 — During development: contributors add changesets

For every PR with a user-visible change (feature, bug fix, behavior change), include a `.changeset/<short-name>.md` file:

```markdown
---
'@zambit/elevate-ts': minor
---

Short description of the change.
```

Or run `pnpm changeset` to be prompted interactively. Bump levels:

- `patch` — Bug fixes, no API changes (0.1.0 → 0.1.1)
- `minor` — New features, backward compatible (0.1.0 → 0.2.0)
- `major` — Breaking changes (0.1.0 → 1.0.0)

Multiple changesets can accumulate on `main` between releases — they're all consumed at once when you cut the release.

### Step 2 — Cut the release locally

From a clean checkout of `main`:

```bash
pnpm make-release
```

That script (see [scripts/make-release.mjs](scripts/make-release.mjs)):

1. Verifies the working tree is clean and you're on `main`
2. Pulls `main` from origin
3. Confirms pending changesets exist (otherwise aborts)
4. Runs `changeset version` — bumps `package.json`, appends to `CHANGELOG.md`, deletes consumed changeset files
5. Runs `pnpm fix:changelog` — disambiguates new `### Minor|Patch Changes` headings per the project's MD024 convention (commit `13eeb15`)
6. Updates the README's npm version badge to match the new version
7. Runs sanity checks (`check:readme`, `lint:md`)
8. Creates a `release/<version>` branch, commits the precise set of files it modified (no `git add -A`), pushes the branch, opens a PR via `gh`

Pass `--dry-run` to walk through steps 1–7 without touching the branch / remote / PR.

### Step 3 — Review and merge the release PR

The PR shows up under your account. Verify:

- [ ] Version bump matches the highest-level changeset present
- [ ] `CHANGELOG.md` entry reflects everything since the last release
- [ ] README badge reads the new version
- [ ] CI is green (test, lint, build, check:exports, check:nodeps, check:readme, lint:md)

Squash-merge or merge-commit, your call. Both are fine.

### Step 4 — Push the tag to trigger publish.yml

After the PR merges:

```bash
git fetch origin && git checkout main && git pull
git tag '@zambit/elevate-ts@<VERSION>' -m 'Release <VERSION>'
git push origin '@zambit/elevate-ts@<VERSION>'
```

`publish.yml` fires on the tag push:

1. Build + test
2. `npm publish --provenance` (uses `NPM_TOKEN` from the `prod` environment, defaults to `latest` dist-tag)
3. Create a GitHub Release with the tag and CHANGELOG snippet

For a **commercial** publish, suffix the tag with `-commercial`: `@zambit/elevate-ts@<VERSION>-commercial`. `publish.yml` routes that to the commercial-publish script instead.

## Pre-Publication Checklist

`pnpm make-release` enforces most of these automatically, but if you ever prepare a release by hand, verify:

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No Node.js built-ins leaked into the package: `pnpm check:nodeps`
- [ ] Markdown linting passes: `pnpm lint:md`
- [ ] Type checking passes: `pnpm check:types`
- [ ] ESLint passes: `pnpm lint:check`
- [ ] README badge matches package.json: `pnpm check:readme`
- [ ] Git status is clean (no `.DS_Store`, no stray review notes from other branches)

## Post-Publication Verification

Once `publish.yml` finishes:

- [ ] Verify the package on [npmjs.com/package/@zambit/elevate-ts](https://www.npmjs.com/package/@zambit/elevate-ts)
- [ ] Verify all files are present: `npm view @zambit/elevate-ts`
- [ ] Verify the README on the npm page mentions the modules you intended to ship (if the README was updated in this release, the npm page should now reflect that)
- [ ] Test installation in a fresh project:

  ```bash
  mkdir /tmp/test-install && cd /tmp/test-install
  npm init -y && npm install @zambit/elevate-ts
  node -e "import('@zambit/elevate-ts/Schema').then(m => console.log(Object.keys(m).length, 'Schema exports'))"
  ```

- [ ] Verify the GitHub Release exists at `https://github.com/zambit/elevate-ts/releases/tag/@zambit%2Felevate-ts@<VERSION>`
- [ ] Announce the release (Discord, Twitter, GitHub Discussions, etc.)

## Fallback — fully manual release

If `pnpm make-release` is broken or unavailable (e.g., `gh` not installed on the machine), the equivalent by hand:

```bash
git switch main && git pull --ff-only origin main
pnpm changeset:version       # bumps package.json + CHANGELOG, consumes changesets
pnpm fix:changelog           # disambiguates new headings
# manually update the README badge to match new package.json version
pnpm check:readme && pnpm lint:md

NEW_VERSION=$(node -p "require('./package.json').version")
git switch -c release/$NEW_VERSION
git add package.json CHANGELOG.md README.md .changeset
git commit -m "release: $NEW_VERSION"
git push -u origin release/$NEW_VERSION
gh pr create \
  --title "release: $NEW_VERSION" \
  --label cla-signed \
  --assignee "$(git config user.name)" \
  --body "Release of @zambit/elevate-ts@$NEW_VERSION"
```

Then continue with steps 3–4 above.

## Bypassing the release PR entirely

If you have main-branch bypass permissions and want to ship without the review step:

```bash
git switch main && git pull --ff-only origin main
pnpm changeset:version && pnpm fix:changelog
# update README badge manually
pnpm check:readme && pnpm lint:md && pnpm test && pnpm build && pnpm check:exports
git add package.json CHANGELOG.md README.md .changeset
git commit -m "release: $(node -p "require('./package.json').version")"
git push origin main
NEW_VERSION=$(node -p "require('./package.json').version")
git tag "@zambit/elevate-ts@$NEW_VERSION" -m "Release $NEW_VERSION"
git push origin "@zambit/elevate-ts@$NEW_VERSION"
```

Use sparingly — the release PR is a useful audit trail.

## Troubleshooting

### `pnpm make-release` aborts: "no pending changesets"

There's nothing to release. Either:

- The previous release consumed everything and no new PRs have added changesets since
- A merged PR forgot to add a `.changeset/*.md` file (fix: add the changeset on `main` directly, then re-run)

### `pnpm make-release` aborts: "uncommitted changes present"

Commit, stash, or `git restore` whatever's dirty in the working tree. The CLAUDE.md / local llm-context edits are gitignored and won't trigger this — only tracked-file modifications do.

### Markdown lint fails on `CHANGELOG.md` mid-release

The `fix:changelog` step should have prevented this, but if a regression slips through: each `### Minor|Patch|Major Changes` heading in a `## VERSION` block must carry a `(VERSION)` suffix. Either
manually edit or run `pnpm fix:changelog` and re-stage.

### `npm publish` fails with `ENEEDAUTH` in CI

`NPM_TOKEN` is missing or expired on the `prod` GitHub environment. Regenerate at npmjs.com (granular automation token scoped to `@zambit/elevate-ts`, read+write), then:

```bash
gh secret set NPM_TOKEN --env prod
```

### Rollback (within 24 h of publish)

npm allows unpublishing only within 24 hours:

```bash
npm unpublish @zambit/elevate-ts@<VERSION> --force
```

Then fix the issue, add a new changeset, run `pnpm make-release` to produce a successor version. After 24 hours, ship a patch instead of unpublishing.

## Automation status

| Part                 | Automated | Where                                                                |
| -------------------- | --------- | -------------------------------------------------------------------- |
| Changeset capture    | manual    | Contributors add `.changeset/*.md` files in PRs                      |
| Version bump         | ✅        | `pnpm make-release` (local) → `changeset version`                    |
| Changelog generation | ✅        | `pnpm make-release` → `changeset version` + `fix:changelog`          |
| README badge sync    | ✅        | `pnpm make-release` updates and verifies via `check:readme`          |
| Release branch + PR  | ✅        | `pnpm make-release` opens the PR via `gh` under your account         |
| Git tagging          | manual    | After release PR merges, push `@zambit/elevate-ts@<VERSION>` by hand |
| npm publishing       | ✅        | `publish.yml` on tag push, uses `NPM_TOKEN` from `prod` env          |
| GitHub Releases      | ✅        | `publish.yml` after a successful npm publish                         |

## See Also

- [scripts/make-release.mjs](scripts/make-release.mjs) — the release-prep script
- [scripts/check-readme-version.mjs](scripts/check-readme-version.mjs) — README badge / version drift check
- [scripts/disambiguate-changelog-headings.mjs](scripts/disambiguate-changelog-headings.mjs) — MD024-safe heading rewriter
- [.github/workflows/publish.yml](.github/workflows/publish.yml) — tag-triggered npm publish
- [.changeset/](.changeset/) — Changesets config and pending changesets
- [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
