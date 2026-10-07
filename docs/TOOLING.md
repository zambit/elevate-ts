# Tooling

Project scripts live in [scripts/](../scripts/) and run through `pnpm`. They run in Node only and are never part of the published package.

## release-check

`pnpm release-check` smoke-tests, verifies and reviews release tarballs. It is a `commander` CLI in [scripts/release-check/](../scripts/release-check/). The behavior of each command is specified in
Gherkin under [features/](../scripts/release-check/features/), the logic lives in `handlers/` and [scripts/lib/](../scripts/lib/), and `commands/` only wires options to handlers.

```bash
pnpm release-check --help
pnpm release-check <command> --help
```

| Command                           | What it does                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `check <tarball> [--out <file>]`  | The full check of a tarball: the smoke test, then the guided human review. Ends with the approve or reject command.         |
| `smoke [tarball]`                 | Smoke test only. With no tarball it packs the current build with `pnpm pack` first (run `pnpm build` before).               |
| `verify <version> [--review]`     | Verifies a version CI staged on npm: downloads the staged tarball, checks its shasum, smoke-tests it. Requires `npm login`. |
| `review <tarball> [--out <file>]` | The guided human review on its own.                                                                                         |

Every command exits `0` on success and `1` on failure. Nothing in `release-check` approves or rejects a staged release; it prints the command for you to run, because approving needs your 2FA.

### Smoke test

Installs the tarball into a throwaway project (`pnpm add`), checks that every file named in the `exports` map of `package.json` ships, then loads every subpath export with ESM `import()` and CJS
`require()` and round-trips `Codec.bigint()`. CI runs `pnpm release-check smoke` before staging.

### Guided review

Shows five checks, each with the evidence it gathered and any warnings, and asks for `p` (pass), `f` (fail) or `s` (skip); `v` shows more where offered:

1. **Dist-tag**, looked up on npm by the tarball's shasum.
2. **Files**, compared with the previous published version, with flags for files that usually should not ship.
3. **Version and changelog**: the tarball's version next to its `CHANGELOG.md` entry.
4. **README** changes since the previous version.
5. **Real-code trial** (optional): runs a project's tests against the tarball in a temporary copy of that project. pnpm workspaces are supported through an override in the copy's
   `pnpm-workspace.yaml`.

It writes a review record to `reviews/releases/<version>.md` (or `--out`). See [TESTING_STAGED_RELEASES.md](./TESTING_STAGED_RELEASES.md) for the release procedure and troubleshooting.

### Aliases

The original script names still work: `pnpm smoke:package` is `release-check smoke`, `pnpm verify-staged` is `release-check verify`, and `pnpm review-tarball` is `release-check review`.

### Tests

Handler and library tests live in [tests/scripts/](../tests/scripts/) and use in-memory fakes for commands and files, so they never touch npm, the network or the terminal. They run as part of
`pnpm test`.

## Other scripts

| Script                                | Command                              | Purpose                                                                          |
| ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `make-release.mjs`                    | `pnpm make-release [--dry-run]`      | Prepares a release: version bump, CHANGELOG, README badge, release branch and PR |
| `check-exports.mjs`                   | `pnpm check:exports`                 | Checks the `exports` map against the built files                                 |
| `check-no-node-builtins.mjs`          | `pnpm check:nodeps`                  | Fails if a Node built-in import appears in the built ESM output (`dist/esm`)     |
| `check-readme-version.mjs`            | `pnpm check:readme`                  | Fails if the README's npm badge does not match `package.json`                    |
| `disambiguate-changelog-headings.mjs` | `pnpm fix:changelog`                 | Adds `(VERSION)` suffixes to CHANGELOG headings for markdownlint MD024           |
| `generate-cjs-package.mjs`            | part of `pnpm build`                 | Writes `dist/cjs/package.json` so the CJS build loads as CommonJS                |
| `publish-commercial.ts`               | `publish.yml` on a `-commercial` tag | Stages the commercial-license variant of a release                               |

See [PUBLISH_CHECKLIST.md](../PUBLISH_CHECKLIST.md) for how these fit into a release.
