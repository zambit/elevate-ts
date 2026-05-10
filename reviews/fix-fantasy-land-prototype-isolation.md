# Review: fix/fantasy-land-prototype-isolation

**Branch:** fix/fantasy-land-prototype-isolation **Date:** 2026-05-10 **Status:** Pushed to `origin/fix/fantasy-land-prototype-isolation`. PR open against `main`.

## What Was Implemented

This branch is one bug fix, one feature enabled by that fix, the documentation that explains both, and this review summary. It is structured as four independent commits that land in dependency order.
Each of commits 1–3 is independently buildable and testable.

### Commit 1 — `fix:` prevent Fantasy Land patching from polluting `Object.prototype`

The load-bearing change. `src/Either.ts` and `src/Maybe.ts` previously attached Fantasy Land methods (`fantasy-land/map`, etc.) to the prototype discovered via `Object.getPrototypeOf(Right(0))`.
Because `Right(0)` returned a plain object literal, that prototype was the global `Object.prototype`. The subsequent assignments therefore patched `Object.prototype` itself with **enumerable
string-keyed methods**, polluting every plain object in the runtime. The visible symptom was a misleading vitest failure at module-load time:

```text
TypeError: Spread syntax requires ...iterable[Symbol.iterator] to be a function
```

…with no stack trace through any reporter. Discovered while threading `ReaderEitherAsync` through the elevate-ts-learning todo demo.

**The fix.** Each module now defines a private prototype object (`_leftProto`, `_rightProto`, `_justProto`, `_nothingProto`). Constructors return values via
`Object.assign(Object.create(_proto), { tag: 'X' as const, … })`. The Fantasy Land methods are patched onto the private prototypes, never reaching `Object.prototype`. Existing FL semantics are
unchanged — third-party libraries doing `myRight['fantasy-land/map'](f)` still find the method via the prototype chain.

**Tests added (regression canary):**

- `tests/Either.test.ts` — asserts `Object.keys(Object.prototype)` does not contain any `fantasy-land/*` keys after constructing `Right(1)` / `Left('e')`. Plus a prototype-method-presence test that
  exercises `Right(5)['fantasy-land/map']`.
- `tests/Maybe.test.ts` — same shape, for `Just` / `Nothing`.

**Diff:** 4 files, 82 insertions, 36 deletions.

### Commit 2 — `feat:` enable Fantasy Land conformance for Reader, Tuple, and State

`src/Reader.ts`, `src/Tuple.ts`, and `src/State.ts` previously had their fantasy-land blocks commented out with a `TODO: Re-enable when vitest issue is resolved` note. The vitest issue _was_ the
prototype-pollution bug fixed in Commit 1, so they can now be enabled safely using the same isolated-proto pattern.

**Typeclasses enabled:**

| Module |      Functor       | Apply | Applicative | Chain | Monad | Bifunctor |
| ------ | :----------------: | :---: | :---------: | :---: | :---: | :-------: |
| Reader |       [YES]        | [YES] |    [YES]    | [YES] | [YES] |     —     |
| Tuple  | [YES] (over `snd`) |   —   |      —      |   —   |   —   |   [YES]   |
| State  |       [YES]        | [YES] |    [YES]    | [YES] | [YES] |     —     |

Each module follows the isolated-proto pattern: a private `_readerProto` / `_tupleProto` / `_stateProto` holds the methods, constructors use `Object.assign(Object.create(_proto), { … })`, and the
prototype methods delegate to the existing namespace functions. Behavior is identical between the namespace style (`Reader.map(f)(r)`) and the FL style (`r['fantasy-land/map'](f)`).

**Tests added (FL conformance + canary):**

- `tests/Reader.test.ts` — `fantasy-land/of` on the constructor; `fantasy-land/map` and `fantasy-land/chain` via the prototype; pollution canary.
- `tests/Tuple.test.ts` — `fantasy-land/map` (over `snd`) and `fantasy-land/bimap` via the prototype; pollution canary.
- `tests/State.test.ts` — `fantasy-land/of` on the constructor; `fantasy-land/map` and `fantasy-land/chain` via the prototype; pollution canary.

**Diff:** 6 files, 137 insertions, 39 deletions.

### Commit 3 — `docs:` explain prototype-isolation design and add deferred-module guards

The fix is correct, but the **shape** of the fix is not self-explanatory. Without documentation, the next maintainer who sees `Object.assign(Object.create(_rightProto), …)` is likely to "clean it up"
back to a plain object literal and reintroduce the bug. This commit is the contract that prevents that.

**New: `docs/PROTOTYPE_ISOLATION.md`** — a single-topic design deep-dive in the same format as `docs/CANCELLABLE_DESIGN.md`. ~390 lines. Covers:

1. **Problem statement** — the pollution mechanism + the misleading vitest symptom.
2. **Why the symptom is misleading** — explicit warnings against the wrong debugging paths (greping `...`, switching reporters).
3. **Decision** — the isolated-proto pattern, with the safe vs. broken diff side-by-side.
4. **JS prototype mechanics, step by step** — assumes the reader knows JS but has not thought hard about prototypes. Explains why `{}.__proto__ === Object.prototype` is the trap, and walks through
   what `Object.create(_proto)` and `Object.assign` each contribute.
5. **Alternatives considered** — class-based instances, symbol-keyed methods, per-instance methods, non-enumerable property descriptors. Each with code, pros, cons, and the specific reason it lost.
6. **Comparison table** — five approaches against five criteria.
7. **Cascade** — explicit list of what fixing Either/Maybe also unblocks (EitherAsync, ReaderEitherAsync, MaybeAsync — verified by grep that they have no prototype patching of their own).
8. **Files implementing the pattern** — pointers to all six fixed source files.
9. **Test guarding the fix** — the regression canary, with a "do not delete or weaken it" note.
10. **When to revisit** — concrete triggers (build-tool change, class adoption, FL spec change, NEL/Validation re-enablement).

**Updated: `FANTASY_LAND.md`** — adds an "Implementation note: prototype isolation" section pointing at the design doc and showing the safe vs. antipattern forms with `[YES]` / `[NO]` labels.

**Updated: `docs/DESIGN_DECISIONS.md`** — appends a short entry under "Core Philosophy Decisions" referencing the design doc. Marks the constraint as load-bearing.

**Updated: `src/Validation.ts` and `src/NonEmptyList.ts`** — replaces the old `TODO: re-enable when vitest issue is resolved` comments with explicit warnings to consult `docs/PROTOTYPE_ISOLATION.md`
before re-enabling fantasy-land for these modules. These two are out of scope for this PR because each has a design wrinkle that needs resolution first:

- **Validation:** the conventional FL `ap` for Validation is an _accumulating_ applicative (combines Failure errors via Semigroup), distinct from Either's short-circuiting `ap`. Verify the namespace
  `ap` matches that contract before exposing on the prototype.
- **NonEmptyList:** currently branded as a readonly array, with no per-instance object to attach methods to. Re-enabling FL conformance requires either wrapping NEL values in an object (preferred —
  uses the isolated-proto pattern) or patching `Array.prototype` (rejected for the same global-pollution reason).

**Diff:** 5 files, 394 insertions, 17 deletions.

### Commit 4 — `docs:` add review summary for this branch

This file. Captures intent, scope, file list, verification state, and reviewer notes in the project's `reviews/` convention (matches `reviews/feat-reader-either-async.md` and
`reviews/feat-audit-subsystem.md`). Added in its own commit so the previous three commits remain fix/feat/docs-only and bisect cleanly without a meta-doc in the diff.

## Files in This Branch

### Commit 1 (`4eae1bf` — `fix:`)

| Status | Path                   |
| ------ | ---------------------- |
| M      | `src/Either.ts`        |
| M      | `src/Maybe.ts`         |
| M      | `tests/Either.test.ts` |
| M      | `tests/Maybe.test.ts`  |

### Commit 2 (`f267f25` — `feat:`)

| Status | Path                   |
| ------ | ---------------------- |
| M      | `src/Reader.ts`        |
| M      | `src/Tuple.ts`         |
| M      | `src/State.ts`         |
| M      | `tests/Reader.test.ts` |
| M      | `tests/Tuple.test.ts`  |
| M      | `tests/State.test.ts`  |

### Commit 3 (`b59128d` — `docs:`)

| Status | Path                          |
| ------ | ----------------------------- |
| A      | `docs/PROTOTYPE_ISOLATION.md` |
| M      | `FANTASY_LAND.md`             |
| M      | `docs/DESIGN_DECISIONS.md`    |
| M      | `src/Validation.ts`           |
| M      | `src/NonEmptyList.ts`         |

### Commit 4 (`docs:` review summary)

| Status | Path                                              |
| ------ | ------------------------------------------------- |
| A      | `reviews/fix-fantasy-land-prototype-isolation.md` |

## Commits

```text
<hash 4> docs: add review summary for fantasy-land prototype-isolation branch
b59128d  docs: explain prototype-isolation design and add deferred-module guards
f267f25  feat: enable Fantasy Land conformance for Reader, Tuple, and State
4eae1bf  fix: prevent Fantasy Land patching from polluting Object.prototype
```

Each of commits 1–3 independently passes `pnpm test` and `pnpm build`. Order is load-bearing: Commit 2 uses the pattern Commit 1 introduces.

## Testing & Verification

- [YES] `pnpm test` — 557 tests pass across 14 files (REA module is on the separate `feat/reader-either-async` branch and not present here).
- [YES] `pnpm build` — ESM and CJS builds succeed.
- [YES] Dist spot-check — `grep -c "Object.getPrototypeOf"` on `dist/esm/Either.js` and `dist/esm/Maybe.js` returns `0`. Pre-fix, both contained the antipattern.
- [YES] No-pollution canary tests pass in all five module test files (Either, Maybe, Reader, Tuple, State).
- [YES] FL prototype-method tests pass for the newly-enabled modules (Reader, Tuple, State).
- [YES] Coverage: `Tuple.ts` 100%, `Reader.ts` 97.91%, `State.ts` 98.49% (uncovered lines are the FL `ap` branches in Reader/State, which exist but are not yet exercised — could be tightened in a
  follow-up).

## Cascade — what this PR unblocks downstream

Confirmed by grep that the following modules have no prototype patching of their own and therefore start working as soon as this fix lands:

- `EitherAsync.ts` (imports `Either`)
- `ReaderEitherAsync.ts` (imports `Either`, `EitherAsync`, `Reader`)
- `MaybeAsync.ts` (imports `Maybe`)

The downstream effect is concrete: in the elevate-ts-learning todo demo, `example-elevate-ts-todo`'s `domain.ts` was rewritten to model storage as `ReaderEitherAsync<StorageEnv, StorageError, A>`.
Those tests previously crashed at module-load with the spread-syntax error. After this PR lands and a new elevate-ts is published, that demo's tests pass cleanly (verified locally by packing this
branch into a tarball and reinstalling — 36/36 tests pass in the demo).

## Notes for Reviewers

### Why this is a `fix:` branch and not a `feat:`

The bug existed on `main` long before `feat/reader-either-async` was opened. REA only revealed it because REA imports `Either`, which dragged the pollution into vitest's path. The fix corrects
existing-module behavior; the new fantasy-land conformance for Reader/Tuple/State is incidental. Hence the branch name and PR title.

### Why the existing `flMap` / `flAp` / etc. namespace re-export constants in `Either.ts` were not changed

Those constants are unrelated to the bug. Per `FANTASY_LAND.md`, they exist as namespace re-exports for library consumers (the ESLint hints that mark them "unused" are an intentional documented
compromise). Out of scope for this PR.

### Why Validation and NonEmptyList stay deferred

Both have _design decisions_ that need resolution before exposing FL methods, not just _mechanics_. Conflating the design work with the bug fix would make the PR harder to review and harder to revert
if a Validation / NEL FL design turned out to need iteration. The warning comments left in those files (Commit 3) make sure the next person who tries to re-enable them will read the design doc first.

### Why a new design doc instead of a long commit message

Commit messages live in `git log`. Design docs live where contributors look (`docs/`) and survive git operations (rebase, squash) cleanly. `docs/PROTOTYPE_ISOLATION.md` is also referenced from
`FANTASY_LAND.md` and `docs/DESIGN_DECISIONS.md`, which gives the rationale a discoverable home alongside the rest of the project's design log.

### Merge strategy recommendation

**Merge commit.** The four logical commits tell a story (fix → enable → explain → review summary) that's worth preserving in `git log`. Squashing collapses that story into one entry and obscures
bisect granularity. If a regression is ever traced to "between 0.4.2 and the next release," reviewers want to narrow it to one of the four commits, not the whole change set.

If the team policy is squash-only, the squash commit message should include the per-commit subjects as bullets so the narrative survives.

### Sequencing with the open `feat/reader-either-async` PR

The REA PR is currently open against `main` and cannot be merged in its current form because its tests would fail under the pre-fix `Either.ts` on `main`. After this fix PR merges, the REA branch can
rebase onto the new `main` (no conflicts expected — REA only adds new files and does not touch `Either.ts`), at which point the REA PR's CI will go green and it can be merged.

This is a deliberate two-PR sequence:

1. This PR (fix) → merges to `main`.
2. REA PR → rebases on new `main`, becomes mergeable, merges to `main`.

Both can land in the same minor version bump (proposed `0.5.0`): the fix is technically a patch, but it ships alongside the REA feature to keep the release notes coherent.
