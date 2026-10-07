# Testing Staged Releases

When a release tag is pushed, CI does not publish `@zambit/elevate-ts` directly. It **stages** the release on npm with `npm stage publish`. A staged version is held by the registry but cannot be
installed by name until a maintainer approves it with 2FA. This page covers testing a staged release and approving it.

For the end-to-end release process, see [PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md).

## Prerequisites

- You are a maintainer of `@zambit/elevate-ts` on npm, with 2FA enabled.
- npm 11.17 or newer (`npm stage` was added in 11.17). Check with `npm -v`. Staged publishing exists only in the npm CLI, so the `npm stage` / `npm login` commands on this page use npm; everything
  else uses pnpm.
- You are logged in: `npm login`. Staged versions are visible only to maintainers.
- The `publish.yml` run for the tag has finished. Check the run under the repository's Actions tab.

## Quick path

```bash
pnpm release-check verify <VERSION> --review      # for example: pnpm release-check verify 0.9.0 --review
```

This runs the automated checks, then walks you through the [human checks](#human-checks) on the same tarball and writes a [review record](#review-record). Without `--review`, it stops after the
automated checks and prints a summary:

```text
[release-check] verify OK: @zambit/elevate-ts@0.9.0
  stage id:   1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
  dist-tag:   latest
  shasum:     5f0c7c3b... (matches download)
  smoke test: 18 entry points load under ESM and CJS
  tarball:    /tmp/elevate-ts-staged-XXXX/zambit-elevate-ts-0.9.0-1b9d6bcd-....tgz
```

Then run the [human checks](#human-checks) with `pnpm release-check review <TARBALL>`, and [approve](#approve).

To check a tarball you already have (smoke test plus the guided review in one command):

```bash
pnpm release-check check <TARBALL>
```

All commands are listed in [TOOLING.md](./TOOLING.md#release-check). The older names `pnpm verify-staged`, `pnpm review-tarball` and `pnpm smoke:package` still work as aliases.

## What `release-check verify` checks

1. **The staged entry exists.** It runs `npm stage list @zambit/elevate-ts --json` and requires exactly one entry for the version.
2. **The tarball is the one npm holds.** It runs `npm stage download <stage-id>`, computes the tarball's sha1, and compares it with the registry's recorded `shasum`.
3. **Every export target ships.** It installs the tarball into a throwaway project and checks that every file named in the `exports` map of `package.json` (`import`, `require`, `types`) is present.
4. **Every entry point loads.** It imports every subpath export with ESM `import()` and with CJS `require()`, fails if any module has no exports, and round-trips `Codec.bigint()` as a behavior probe.

It never runs `npm stage approve`. Approval is a deliberate human step that needs your 2FA.

CI runs checks 3 and 4 against a freshly packed tarball before staging (`pnpm release-check smoke`). `verify` repeats them against the exact staged bytes.

## Human checks

A script cannot judge these, but it can gather the evidence. `pnpm release-check review` (or `verify --review`, or `check`) shows each check with its facts and any warnings, and asks you for a
verdict:

```bash
pnpm release-check review <TARBALL> [--out <file>]
```

Answer `p` (pass), `f` (fail), `s` (skip), or `v` to view more where offered. A fail or skip asks for a short note.

1. **Dist-tag.** Shows the tag the version is staged with (looked up by the tarball's shasum). Warns if a pre-release such as `1.0.0-beta.1` is tagged `latest`, or a normal release is not. The tag
   cannot be changed after staging; if it is wrong, fail and re-stage.
2. **Files.** Shows the file count and what was added or removed since the previous published version, and flags files that usually should not ship (`.env`, `.DS_Store`, tests, `reviews/`, `.claude/`,
   `*.dontkeep.md`, ...). `v` lists every file.
3. **Version and changelog.** Shows the tarball's version next to that version's entry in the repo's `CHANGELOG.md`, and warns if the entry is missing.
4. **README.** Shows what changed in the README since the previous version. The README becomes the npm package page. `v` shows the rest of a long diff.
5. **Real-code trial (optional).** Give the path to a project that uses the library, or press Enter to skip. It copies the project to a temporary directory (without `node_modules` and `.git`),
   installs the tarball there, runs the tests and reports the result. Your project is not modified.
   - **Single project:** runs `pnpm install`, `pnpm add <TARBALL>` and `pnpm test`.
   - **pnpm workspace** (the project has a `pnpm-workspace.yaml`): adds an `overrides` entry to the copy's `pnpm-workspace.yaml` that points the package at the tarball, so every workspace member uses
     it, then runs `pnpm install` and `pnpm -r --include-workspace-root test`. If the file already has an `overrides` block, the trial stops and you run it by hand (see the checklist below).

At the end it prints a summary. If no check failed, it prints the `npm stage approve` command. If one failed, it prints the `npm stage reject` command instead. It never approves or rejects for you.

### Review record

Each review writes a markdown record to `reviews/releases/<VERSION>.md` (or `--out <file>`): the outcome, reviewer (npm and git identity), date, stage id, dist-tag, shasum, and each check's verdict,
note and findings. Commit it with the next change, or attach it to the GitHub Release (`gh release upload '@zambit/elevate-ts@<VERSION>' reviews/releases/<VERSION>.md`). Records are excluded from
markdownlint and Prettier because reviewer notes are free text.

### By hand

If `release-check` is unavailable, the same checks manually:

- [ ] **Dist-tag:** `npm stage list @zambit/elevate-ts --json` shows the tag for the version.
- [ ] **File list:** `tar -tzf <TARBALL> | sort`
- [ ] **Version:** `tar -xOzf <TARBALL> package/package.json | grep '"version"'`, then read that version's entry in the repo's `CHANGELOG.md`.
- [ ] **README:** `tar -xOzf <TARBALL> package/README.md | less`
- [ ] **Optional real-code trial:** `pnpm add <TARBALL>` in a copy of a project that uses the library, then run its tests. For a pnpm workspace, add `"@zambit/elevate-ts": "file:<TARBALL>"` under
      `overrides:` in the copy's `pnpm-workspace.yaml` instead, then run `pnpm install` and `pnpm -r --include-workspace-root test`.

## Approve

```bash
npm stage approve <STAGE-ID>
```

npm prompts for 2FA, then publishes the version. Afterwards:

1. Confirm it is live: `npm view @zambit/elevate-ts version` prints the new version.
2. Publish the **draft** GitHub Release that CI created, at [github.com/zambit/elevate-ts/releases](https://github.com/zambit/elevate-ts/releases).
3. Finish the post-publication checks in [PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md#post-publication-verification).

## If a check fails

Do not approve. Reject the staged version (prompts for 2FA):

```bash
npm stage reject <STAGE-ID>
```

A rejected version never went live, so no one can have installed it. Then:

1. Fix the problem on a branch and merge it.
2. Release a **new version**. npm documents that a staged version occupies its version number, but not whether a rejected number can be reused, so do not plan on reusing it. Add a `patch` changeset,
   run `pnpm make-release`, merge the release PR, and push the new tag.
3. Delete the draft GitHub Release for the rejected version.

## Manual fallback

If `pnpm release-check verify` is broken, or the npm CLI has changed underneath it, the same checks by hand:

```bash
WORK=$(mktemp -d) && cd "$WORK"

# 1. Find the stage id (the "id" field of the entry for your version)
npm stage list @zambit/elevate-ts --json

# 2. Download the staged tarball
npm stage download <STAGE-ID>
TARBALL=$(ls zambit-elevate-ts-*.tgz)

# 3. Compare its sha1 with the "shasum" field from step 1
shasum -a 1 "$TARBALL"

# 4. Install it into a throwaway project and load it both ways
echo '{"name":"smoke","private":true,"type":"module"}' > package.json
pnpm add "./$TARBALL" --ignore-scripts --config.lockfile=false
node -e "import('@zambit/elevate-ts').then(m => console.log('esm', Object.keys(m).length))"
node -e "console.log('cjs', Object.keys(require('@zambit/elevate-ts')).length)"
node -e "import('@zambit/elevate-ts/Codec').then(({ bigint }) => console.log(bigint()('42')))"
```

## Troubleshooting

### `E401` / `ENEEDAUTH` from `npm stage list`

You are not logged in, or your session expired. Run `npm login` and retry.

### `No staged version @zambit/elevate-ts@<VERSION>`

CI has not staged it. Check the `publish.yml` run for the tag: it may still be running, or it failed before the stage step (tests, smoke test) or at it (trusted publisher settings; see
[PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md#troubleshooting)).

### `Several staged entries for @zambit/elevate-ts@<VERSION>`

The version was staged more than once, for example with different dist-tags. Inspect each with `npm stage view <STAGE-ID>`, reject the ones you do not want, and re-run.

### `Shasum mismatch`

The downloaded tarball is not the one the registry recorded. **Do not approve.** Retry once in case the download was corrupted. If it still mismatches, reject the staged version and investigate before
releasing.

### `release-check review` shows "staged entry not confirmed"

The `npm stage list` lookup failed or found no entry with the tarball's shasum. Usually you are not logged in (run `npm login`); otherwise the tarball is not the staged one. Confirm with
`npm stage list @zambit/elevate-ts --json` before approving.

### `release-check review` says "Input ended before the review finished"

Its input closed before every check was answered (for example, piped answers ran out). Nothing was recorded; run it again.

### Smoke test failures

- `Export targets missing from the tarball` — a file named in `package.json` `exports` did not ship. Usually a build or `files` problem; reproduce locally with
  `pnpm build && pnpm release-check smoke`.
- A module fails to `import` or `require` — reproduce with `pnpm build && pnpm release-check smoke`, which runs the same checks against a local pack.

## See Also

- [PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md) — the full release process
- [TOOLING.md](./TOOLING.md#release-check) — `release-check` commands and options
- [scripts/release-check/](../scripts/release-check/) — the CLI (commands, handlers, feature specs)
- `npm help stage` — npm's staged publishing reference (subcommands, 2FA rules, tag behavior)
