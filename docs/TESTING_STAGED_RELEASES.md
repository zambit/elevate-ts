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
pnpm verify-staged <VERSION>      # for example: pnpm verify-staged 0.9.0
```

On success it prints a summary and the approve command:

```text
[verify-staged] OK: @zambit/elevate-ts@0.9.0
  stage id:   1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
  dist-tag:   latest
  shasum:     5f0c7c3b... (matches download)
  smoke test: 18 entry points load under ESM and CJS
  tarball:    /tmp/elevate-ts-staged-XXXX/zambit-elevate-ts-0.9.0-1b9d6bcd-....tgz
```

Then do the [human checks](#human-checks) and [approve](#approve).

## What `pnpm verify-staged` checks

1. **The staged entry exists.** It runs `npm stage list @zambit/elevate-ts --json` and requires exactly one entry for the version.
2. **The tarball is the one npm holds.** It runs `npm stage download <stage-id>`, computes the tarball's sha1, and compares it with the registry's recorded `shasum`.
3. **Every export target ships.** It installs the tarball into a throwaway project and checks that every file named in the `exports` map of `package.json` (`import`, `require`, `types`) is present.
4. **Every entry point loads.** It imports every subpath export with ESM `import()` and with CJS `require()`, fails if any module has no exports, and round-trips `Codec.bigint()` as a behavior probe.

It never runs `npm stage approve`. Approval is a deliberate human step that needs your 2FA.

CI runs checks 3 and 4 against a freshly packed tarball before staging (`pnpm smoke:package`). `verify-staged` repeats them against the exact staged bytes.

## Human checks

The script cannot judge these. They take a minute; the tarball path is in the script's output.

- [ ] **Dist-tag.** The summary's `dist-tag` is `latest` for a normal release. A pre-release such as `1.0.0-beta.1` should use a different tag (for example `next`). The tag cannot be changed after
      staging; if it is wrong, reject and re-stage.
- [ ] **File list.** Nothing unexpected ships (test fixtures, local notes, `.env` files) and nothing expected is missing:

  ```bash
  tar -tzf <TARBALL> | sort
  ```

- [ ] **Version and changelog.** The version matches the release PR, and the version's entry in the repo's `CHANGELOG.md` describes what shipped. (`CHANGELOG.md` is not part of the package, so check
      the repo copy.)

  ```bash
  tar -xOzf <TARBALL> package/package.json | grep '"version"'
  ```

- [ ] **README.** It reads correctly; it becomes the npm package page:

  ```bash
  tar -xOzf <TARBALL> package/README.md | less
  ```

- [ ] **Optional: try it in real code.** Install the tarball into a project that uses the library and run its tests:

  ```bash
  pnpm add <TARBALL>
  ```

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

If `pnpm verify-staged` is broken, or the npm CLI has changed underneath it, the same checks by hand:

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

### Smoke test failures

- `Export targets missing from the tarball` — a file named in `package.json` `exports` did not ship. Usually a build or `files` problem; reproduce locally with `pnpm build && pnpm smoke:package`.
- A module fails to `import` or `require` — reproduce with `pnpm build && pnpm smoke:package`, which runs the same checks against a local pack.

## See Also

- [PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md) — the full release process
- [scripts/verify-staged.ts](../scripts/verify-staged.ts) — the verification script
- [scripts/smoke-package.ts](../scripts/smoke-package.ts) — the package smoke test CI runs before staging
- `npm help stage` — npm's staged publishing reference (subcommands, 2FA rules, tag behavior)
