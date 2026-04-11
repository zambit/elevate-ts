# Branch Protection Rules for Main

This document describes the branch protection configuration for the `main` branch and how to manage it.

## Overview

All changes to `main` must come through a pull request with:

- Passing CI/CD checks (CLA, lint, test, build)
- At least 1 approval review
- Linear git history (rebase merge only)
- Up-to-date with latest main

This ensures code quality and creates an audit trail of all changes before they're published to npm.

## Rules

See [`branch-protection-main.json`](./branch-protection-main.json) for the complete configuration.

### Enforced Checks

- **Required status checks**: All CI/CD workflows must pass
  - CLA (contributor terms acknowledgment or maintainer override label)
  - Test (vitest + coverage)
  - Build (TypeScript compilation)
  - Lint & Type Check (ESLint, Prettier, TypeScript)

- **Linear history**: Prevents merge commits, requires rebase
- **Up-to-date requirement**: Branch must be rebased on latest main before merge
- **Pull request review**: 1 approval required (reviewer dismissal of stale reviews enforced)

### Not Enforced

- Force pushes by admins: Allowed (for your own PRs if needed)
- Deletions: Not allowed
- Code owner approvals: Not required (but CODEOWNERS documents ownership)

## Applying Changes

To apply or update the branch protection rules:

```bash
gh api -X PUT repos/zambit/elevate-ts/branches/main/protection \
  --input .github/branch-protection-main.json
```

## Important Gotchas

### The `restrictions` Field

The GitHub API requires a `restrictions` field in the JSON payload, even if you don't want any restrictions.

- **`"restrictions": null`** — No restrictions (anyone with write access can merge)
- **`"restrictions": { "users": [...], "teams": [...], "apps": [...] }`** — Specific users/teams only

Omitting this field entirely results in:

```
Invalid request.
"restrictions" wasn't supplied. (HTTP 422)
```

### Status Check Names

The `required_status_checks.contexts` array must match your actual GitHub Actions workflow names:

- These are the `name:` values from `.github/workflows/*.yml`
- They must exist and pass before merge is allowed
- If a workflow name changes, update this file

Current workflows:

- `CLA` (from cla.yml)
- `Test` (from test.yml)
- `Build` (from build.yml)
- `Lint & Type Check` (from lint.yml)

## Updating the Rules

When you need to change protection rules:

1. Edit `branch-protection-main.json`
2. Run the command above to apply
3. Verify in GitHub UI: Settings → Branches → Branch protection rules
4. Commit the JSON file so it's tracked in git

## Merging Strategy

This project uses **rebase merge only**. When merging a PR:

```bash
# GitHub UI or via CLI:
gh pr merge <pr-number> --rebase
```

This keeps the main branch history linear and clean for tracking changes.

## References

- [GitHub API: Update branch protection](https://docs.github.com/rest/branches/branch-protection#update-branch-protection)
- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
