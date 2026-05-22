# Review: feat/reader-either-async

**Branch:** feat/reader-either-async **Date:** 2026-05-08 **Status:** Staged for commit, not yet committed

## What Was Implemented

### 1. ReaderEitherAsync Module (`src/ReaderEitherAsync.ts`, `tests/ReaderEitherAsync.test.ts`)

A new monad composing `Reader<R, A>` (sync dependency injection) with `EitherAsync<L, A>` (lazy failable async) into a single type `(env: R) => Promise<Either<L, A>>`. Equivalent in role to fp-ts
`ReaderTaskEither`. Use it for asynchronous, failable computations that need a threaded environment (clients, config, loggers) without manually plumbing the env through chains of `EitherAsync` calls.

**API surface:**

- **Constructors:** `ReaderEitherAsync(run)`, `of`, `right`, `left`
- **Lifts:** `liftEither`, `liftEitherAsync`, `liftReader`
- **Promise lifts:** `fromPromise`, `tryCatch` (env-aware, exception-safe)
- **Reader operations:** `ask`, `asks`, `asksEither`, `asksEitherAsync`, `local`, `provide`
- **Functor / Bifunctor / Monad:** `map`, `mapLeft`, `bimap`, `chain`, `chainLeft`, `ap`
- **Extraction:** `runReaderEitherAsync`, `getOrElse`, `fold`
- **Sequence:** `all` (parallel, all-or-Left, shared env)

**Wired in:**

- `src/index.ts` — `export * as ReaderEitherAsync from './ReaderEitherAsync.js'`
- `package.json` — new `./ReaderEitherAsync` subpath in the `exports` map (mirrors `./EitherAsync`)
- `docs/API.md` — full API reference section, parallel to `EitherAsync`

**Test coverage:** 40 tests, 100% statement / branch / function / line coverage on the new module.

### 2. Documentation: "Async Type Naming" Reconciliation

The library's `EitherAsync<L, R>` is the same monad that fp-ts and purify-ts call `Task<E, A>` / `TaskEither<E, A>`. The repo's docs predated this naming clarification and referred to a `Task` type
that doesn't exist in elevate-ts.

**Changes to `docs/elevate-ts-vs-purify-ts.md`:**

- New "Async Type Naming: `Task` vs `EitherAsync`" section before the migration guide.
- Comparison table mapping the failable-async type across fp-ts / purify-ts / elevate-ts.
- Note that elevate-ts deliberately omits a no-error-track `Task<A>` — `Promise<A>` already covers that case, with `EitherAsync<never, A>` available for monadic ops on non-failable async.
- Side-by-side example showing the elevate-ts data-last `pipe` idiom.

### 3. Cancellable EitherAsync — Design Proposal (`docs/CANCELLABLE_DESIGN.md`)

A design document only — **no code lands**. Recommends a new sibling type `CancellableEitherAsync<L, R>` (not a refactor of `EitherAsync`) with three terminal states (`Right` / `Left` / `Cancelled`),
built on `AbortSignal`, with a cooperative cancellation contract.

Includes:

- Motivation (Promises are uncancellable; `AbortSignal` is the platform standard)
- Recommendation rationale (sibling type vs. refactoring `EitherAsync`)
- Type definition and proposed v1 API surface
- Four open design questions with my recommendations:
  1. Terminal-state encoding (recommend distinct tag)
  2. Should `chainLeft` recover from `Cancelled` (recommend no)
  3. Cleanup hook firing semantics (recommend any propagation)
  4. Resource safety / `bracket` (recommend defer to v2)
- Explicit "what is NOT in v1" section to bound scope
- Acceptance criteria for sign-off before any implementation begins

> Note: `docs/CANCELLABLE_DESIGN.md` is **untracked** and would land in commit 2 of the two-commit plan. The user paused before committing.

### 4. Changeset (`.changeset/reader-either-async.md`)

Minor version bump entry for `@zambit/elevate-ts`. Describes the new module and the async-type-naming clarification. Will be consumed by `pnpm changeset:version` at release time.

### 5. Local Documentation Reconciliation (NOT in commit)

Updated `llm-context/*.md` files to:

- Replace `Task<E, A>` references with `EitherAsync<L, R>` everywhere they referred to the elevate-ts library itself
- Rewrite `AWSIntegration.md` and `CloudflareIntegration.md` examples in proper elevate-ts data-last `pipe` idiom (the originals used purify-ts method-chaining syntax that doesn't exist in this
  library)
- Reframe those two files as **example consumer integrations**, not project standards
- Update `Tooling.md` script template handler example to use `elevate-ts/EitherAsync`
- Add a "What about `Task`?" subsection to `CodingStandards.md` with the cross-library comparison table

> These edits are real on disk but **`llm-context/` and `CLAUDE.md` are gitignored** by design — they are local-only project instructions, not shipped artifacts. A separate workstream (in progress)
> will introduce a checked-in canonical `llm-context/` and rename the local working copy to `.llm-context/`. That refactor is **not part of this branch**.

## Files in This Branch

### Staged (commit 1 — feature)

| Status | Path                                |
| ------ | ----------------------------------- |
| A      | `.changeset/reader-either-async.md` |
| M      | `docs/API.md`                       |
| M      | `docs/elevate-ts-vs-purify-ts.md`   |
| M      | `package.json`                      |
| A      | `src/ReaderEitherAsync.ts`          |
| M      | `src/index.ts`                      |
| A      | `tests/ReaderEitherAsync.test.ts`   |

### Untracked (planned commit 2 — design proposal)

| Status | Path                         |
| ------ | ---------------------------- |
| A      | `docs/CANCELLABLE_DESIGN.md` |

## Commits

None yet. Two commits planned:

1. `feat: add ReaderEitherAsync module for dependency-injected async`
2. `docs: add cancellable EitherAsync design proposal`

(Pending user approval before commits are created.)

## Testing & Verification

All checks run cleanly on the working tree:

- [YES] `pnpm format` (Prettier) — applied
- [YES] `pnpm check:types` — no type errors
- [YES] `pnpm lint:check` (ESLint) — no warnings (`--max-warnings 0`)
- [YES] `pnpm test` — 582 tests pass across 15 files; ReaderEitherAsync at 100% coverage
- [YES] `pnpm build` — ESM and CJS builds succeed
- [YES] `pnpm check:exports` — all 15 exports verified against `dist/`
- [YES] `pnpm check:nodeps` — no Node built-ins introduced (Workers compatibility preserved)
- [YES] `pnpm lint:md` — markdown lint passes on all tracked `.md` files

## Notes for Reviewers

### Why a New Type Instead of Reader-of-EitherAsync

`Reader<R, EitherAsync<L, A>>` is technically expressible in the existing API, but it forces consumers to write `.run(env).run()` and pulls double-call ceremony into every use site.
`ReaderEitherAsync<R, L, A>` collapses the two layers into a single `run(env)` call, matching the ergonomics that fp-ts users get from `ReaderTaskEither` and that purify-ts users emulate manually.

### Type Inference Note

`map` and `mapLeft` declare their `<R, L>` (and `<R, A>`) bindings at both the inner function signature _and_ the body's lambda parameters, then inline the Left/Right branch explicitly rather than
calling `Either.map` / `Either.mapLeft`. This is required for `tsc -p src/tsconfig.json` (which has `composite: true` and `declaration: true`) to emit declaration files; the curried `Either.map` form
would otherwise resolve the inner generic to `unknown` at the declaration boundary. Functional behavior is identical.

### Cancellable Design — Awaiting Sign-Off

The design proposal in `docs/CANCELLABLE_DESIGN.md` is **not** an approved direction yet. It includes four explicit open questions with my recommendations and an "Acceptance criteria" section listing
what needs sign-off before implementation begins. Treat that file as an RFC, not a commitment.

### Merge Strategy

Both commits are small and logically distinct. Recommend **merge commit** (preserves the feat / docs separation) or **squash merge** (single-commit history if you want one entry per feature).
