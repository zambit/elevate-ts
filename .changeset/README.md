# Changesets

This directory manages version bumps and changelog generation.

## Adding a Changeset

When you've made changes that should be documented in a release:

```bash
pnpm changeset
```

You'll be prompted to:
1. Select changed packages (elevate-ts)
2. Select bump type:
   - **patch** — Bug fixes, no API changes
   - **minor** — New features, backward compatible
   - **major** — Breaking changes
3. Write a summary of the change

This creates a file in `.changeset/` like:

```markdown
---
"elevate-ts": minor
---

Added Reader monad for dependency injection
```

## Publishing a Release

When ready to publish:

```bash
# 1. Bump versions and generate CHANGELOG
pnpm changeset version

# 2. Publish to npm
pnpm changeset publish
```

Or let GitHub Actions handle it automatically (see `.github/workflows/release.yml`).

## Commit Message Format

Changesets work best when commits follow conventional format:

- `feat: ...` → minor bump
- `fix: ...` → patch bump  
- `docs: ...` → no bump
- `refactor: ...` → no bump
- `BREAKING CHANGE: ...` → major bump

## More Info

- [Changesets docs](https://github.com/changesets/changesets)
- [Conventional Commits](https://www.conventionalcommits.org/)
