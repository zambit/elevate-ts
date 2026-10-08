# Dual Publishing Strategy

elevate-ts is dual-licensed: AGPL-3.0-or-later for everyone, and a commercial license from Zambit for closed-source use. This document describes how each flavor is published.

## Overview

|                 | AGPL                                   | Commercial                                              |
| --------------- | -------------------------------------- | ------------------------------------------------------- |
| Package         | `@zambit/elevate-ts`                   | `@zambit/elevate-ts-commercial`                         |
| Registry        | npmjs.org (public)                     | GitHub Packages, `https://npm.pkg.github.com` (private) |
| `license` field | `AGPL-3.0-or-later`                    | `SEE LICENSE IN LICENSE`                                |
| `LICENSE` file  | AGPL-3.0 text                          | Contents of `COMMERCIAL-LICENSE.md`                     |
| Git tag         | `@zambit/elevate-ts@<version>`         | `@zambit/elevate-ts@<version>-commercial`               |
| Approval        | `npm stage approve` with 2FA           | Required reviewers on the `commercial` environment      |
| Published by    | `npm stage publish --provenance` in CI | `pnpm release-check publish-commercial --publish` in CI |

Both flavors are built from the same commit and contain the same code, at the same version number. They differ only in the package name, the license metadata and the `LICENSE` file. The commercial
grant itself comes from the agreement with Zambit. See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

## AGPL release

Releases are prepared locally and staged by CI. Nothing goes live until a maintainer approves it with 2FA.

1. Contributors add changesets during development (`pnpm changeset`).
2. A maintainer runs `pnpm make-release`, which bumps the version, updates `CHANGELOG.md` and opens a release PR.
3. After the PR merges, the maintainer pushes the tag `@zambit/elevate-ts@<version>`.
4. `.github/workflows/publish.yml` builds, tests, smoke-tests the packed tarball and **stages** the release on npm. It also creates a draft GitHub Release.
5. The maintainer verifies the staged tarball with `pnpm release-check verify <version> --review`.
6. The maintainer runs `npm stage approve <stage-id>` (2FA). The version goes live.
7. The maintainer publishes the draft GitHub Release.

Full procedures: [PUBLISH_CHECKLIST.md](./PUBLISH_CHECKLIST.md) and [docs/TESTING_STAGED_RELEASES.md](./docs/TESTING_STAGED_RELEASES.md).

## Commercial release

After the AGPL release is live, the maintainer pushes `@zambit/elevate-ts@<version>-commercial` on the same commit. The `publish-commercial` job in `publish.yml`:

1. Waits for a required reviewer to approve the `commercial` environment. GitHub Packages has no staging, so this approval is the gate.
2. Builds, tests and runs `pnpm release-check publish-commercial --publish`, which:
   - packs the package and unpacks it in a temporary directory, so the working tree is never changed;
   - renames it to `@zambit/elevate-ts-commercial`, sets the license fields, drops lifecycle scripts and points `publishConfig.registry` at GitHub Packages;
   - replaces `LICENSE` with `COMMERCIAL-LICENSE.md`;
   - packs it again, smoke-tests every entry point under ESM and CJS, and publishes it.

Run `pnpm release-check publish-commercial` (without `--publish`) locally to build and inspect the commercial tarball without publishing it.

## Audit trail

| Event                                 | Where it is recorded                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Commercial version published          | Org audit log: `packages.package_version_published` (actor, time, version)       |
| Commercial version or package deleted | Org audit log: `packages.package_version_deleted`, `packages.package_deleted`    |
| Who approved a commercial publish     | The workflow run's deployment review history for the `commercial` environment    |
| AGPL version approved                 | npm (the 2FA approval), and the review record in `reviews/releases/<version>.md` |

GitHub Packages does not record who downloads a package. Vendor access, and a per-vendor download log, will come through a separate registry proxy.

## Authentication

- **npm (AGPL):** CI authenticates with npm trusted publishing (OIDC), bound to `publish.yml` and the `prod` GitHub environment. No npm token is stored in GitHub. The trusted publisher may only stage,
  and the package requires 2FA for publishing, so approval always stays with a maintainer.
- **GitHub Packages (commercial):** the job's built-in `GITHUB_TOKEN` with `packages: write`. No personal access token is involved in publishing.
- **GitHub Release:** the AGPL job's `GITHUB_TOKEN` with `contents: write` creates the draft release.

Renaming `publish.yml` or the `prod` environment breaks AGPL publishing until the trusted publisher on npmjs.com is updated to match.

## See Also

- [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md): commercial license terms
- [DUAL-LICENSING.md](./DUAL-LICENSING.md): which license to choose
- [PUBLISH_CHECKLIST.md](./PUBLISH_CHECKLIST.md): the release process step by step, including the one-time commercial setup
- [docs/TESTING_STAGED_RELEASES.md](./docs/TESTING_STAGED_RELEASES.md): verifying and approving a staged release
- [docs/TOOLING.md](./docs/TOOLING.md): `make-release` and `release-check`
