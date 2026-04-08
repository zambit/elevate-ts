# Publication Checklist for elevate-ts

This project uses [Changesets](https://github.com/changesets/changesets) for semantic versioning and
automated changelog generation. Follow this process to publish a new version.

## Release Process

### Step 1: Create Changesets

Throughout development, contributors use `pnpm changeset` to document changes.

```bash
pnpm changeset
```

You'll be prompted to:

1. **Select packages** — Choose `elevate-ts`
2. **Select bump type**:
   - `patch` — Bug fixes, no API changes (0.1.0 → 0.1.1)
   - `minor` — New features, backward compatible (0.1.0 → 0.2.0)
   - `major` — Breaking changes (0.1.0 → 1.0.0)
3. **Write description** — Summarize the change

This creates a file in `.changeset/` like:

```markdown
---
"elevate-ts": minor
---

Added Reader monad for dependency injection
```

**Note:** You can commit multiple changesets before releasing. Each documents a separate logical change.

### Step 2: Create Release PR

When ready to release, trigger the `release.yml` workflow or run locally:

```bash
pnpm changeset:version
```

This:

- ✅ Bumps version in `package.json` (e.g., 0.1.0 → 0.2.0)
- ✅ Updates `CHANGELOG.md` with all changes
- ✅ Removes changeset files (they're incorporated into CHANGELOG)
- ✅ Creates a git commit with the bumped version

### Step 3: Review and Merge

Create a PR with the version bump:

```bash
git push origin release/my-release
# Create PR on GitHub
```

Have someone review:

- [ ] Version bump is correct (patch/minor/major)
- [ ] CHANGELOG.md is accurate
- [ ] All CI checks pass (lint, test, build)
- [ ] Git history is clean

Merge to `main` or `initial` branch.

### Step 4: Publish

Once merged, GitHub Actions automatically publishes to npm:

**Automatic (Recommended):**

- Merge the version bump PR
- GitHub Actions `publish.yml` detects the version change → publishes to npm
- GitHub creates a release tag
- Done! ✅

**Manual:**

```bash
pnpm changeset:publish
```

This runs:

1. `pnpm build` — Compile TypeScript
2. `changeset publish` — Upload to npm

## Pre-Publication Checklist

Before merging the version bump PR:

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No Node.js built-ins detected: `pnpm check:nodeps`
- [ ] Markdown linting passes: `pnpm lint:md`
- [ ] Type checking passes: `pnpm check:types`
- [ ] ESLint passes: `pnpm lint:check`
- [ ] Git status is clean
- [ ] Version bump in CHANGELOG.md is correct
- [ ] All CI workflows pass (lint.yml, test.yml, build.yml)

## Post-Publication Verification

Once published:

- [ ] Verify the package on [npmjs.com/package/elevate-ts](https://www.npmjs.com/package/elevate-ts)
- [ ] Verify all files are present: `npm view elevate-ts`
- [ ] Test installation in fresh project:

  ```bash
  mkdir test-install && cd test-install
  npm init -y
  npm install elevate-ts
  ```

- [ ] Verify GitHub release was created with changelog
- [ ] Announce the release (Discord, Twitter, GitHub Discussions, etc.)

## Troubleshooting

### "npm ERR! 403 Forbidden"

Make sure you're logged in:

```bash
npm login
npm whoami  # Should show your username
```

Or check that your npm token has publish permissions.

### "Version already published"

The version in `package.json` matches an existing npm version. Increment it again:

```bash
pnpm changeset:version
git add . && git commit -m "release: version bump"
```

### Rollback (if critical issue discovered)

npm allows unpublishing only within 24 hours of publication:

```bash
npm unpublish elevate-ts@VERSION --force
```

Then:

1. Fix the issue
2. Create new changeset
3. Run `pnpm changeset:version` again
4. Publish the new version

After 24 hours, create a patch version instead of unpublishing.

## Automation

The following processes are automated:

| Part                 | Automated | Tool                          |
| -------------------- | --------- | ----------------------------- |
| Version detection    | ✅        | Changesets (based on commits) |
| Changelog generation | ✅        | Changesets + git history      |
| Git tagging          | ✅        | GitHub Actions                |
| npm publishing       | ✅        | GitHub Actions                |
| GitHub Releases      | ✅        | GitHub Actions                |

## See Also

- `.changeset/` — Changeset configuration and documentation
- `.github/workflows/release.yml` — Release workflow (creates version bump PR)
- `.github/workflows/publish.yml` — Publish workflow (uploads to npm)
- [Changesets Documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)

---

**Good luck with the release!**
