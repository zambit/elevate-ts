# Review: feat/cancellable-either-async

**Branch:** feat/cancellable-either-async **Date:** 2026-05-11 **Status:** Ready for review

## What Was Implemented

### 1. CancellableEitherAsync Module (`src/CancellableEitherAsync.ts`, `tests/CancellableEitherAsync.test.ts`)

A new lazy, failable async monad sibling to `EitherAsync` that adds cooperative cancellation via `AbortSignal`. The type has **three** terminal states rather than two:

- `Right<R>` — succeeded
- `Left<L>` — failed
- `Cancelled` — we no longer care about the answer

Use it for timeouts, races, and request flows that need to abandon work cleanly without conflating cancellation with failure. Existing `EitherAsync` users are unaffected — this is purely additive.

**Type:**

```typescript
export type CancellableResult<L, R> = Either<L, R> | Cancelled;
export type CancellableEitherAsync<L, R> = {
  readonly tag: 'CancellableEitherAsync';
  readonly run: (signal?: AbortSignal) => Promise<CancellableResult<L, R>>;
};
```

**API surface:**

- **Constructors:** `CancellableEitherAsync(run)`, `of`, `right`, `left`, `cancelled`, `liftEither`
- **Promise lifts:** `fromPromise`, `fromAbortable` (primary signal-aware lift; splits `AbortError` → `Cancelled`, other rejections → `Left`), `tryCatch` (non-signal-aware, but still short-circuits to
  `Cancelled` if signal is already aborted at entry/exit)
- **Functor / Bifunctor / Monad / Applicative:** `map`, `mapLeft`, `bimap`, `chain`, `chainLeft` (does NOT recover from `Cancelled` — by design), `chainCancelled` (the explicit Cancelled recovery
  primitive), `ap`
- **Cancellation-specific:** `withTimeout`, `race`, `onCancel`
- **Interop:** `fromEitherAsync` (signal ignored), `toEitherAsync` (collapse `Cancelled` into `Left`)
- **Extraction:** `fold(onLeft, onRight, onCancelled)`
- **Sequence:** `all` (first non-Right wins; siblings share signal so downstream I/O can short-circuit)

**Wired in:**

- `src/index.ts` — `export * as CancellableEitherAsync from './CancellableEitherAsync.js'`
- `package.json` — new `./CancellableEitherAsync` subpath in the `exports` map (mirrors `./EitherAsync` and `./ReaderEitherAsync`)

**Test coverage:** 69 tests, 100% statement / 95% branch / 100% function / 100% line coverage on the new module.

### 2. Changeset (`.changeset/cancellable-either-async.md`)

Minor version bump entry for `@zambit/elevate-ts`. Describes the new module and references the design doc for v2 follow-ups. Will be consumed by `pnpm changeset:version` at release time.

## Files in This Branch

| Status | Path                                       |
| ------ | ------------------------------------------ |
| A      | `.changeset/cancellable-either-async.md`   |
| M      | `package.json`                             |
| A      | `src/CancellableEitherAsync.ts`            |
| M      | `src/index.ts`                             |
| A      | `tests/CancellableEitherAsync.test.ts`     |
| A      | `reviews/feat-cancellable-either-async.md` |

## Commits

| Hash    | Message                                            |
| ------- | -------------------------------------------------- |
| 246f61a | feat: add CancellableEitherAsync module            |
| _next_  | docs: add review for feat/cancellable-either-async |

## Testing & Verification

All checks run cleanly on the branch:

- [YES] `pnpm check:types` — no type errors
- [YES] `pnpm lint:check` (ESLint) — no warnings (`--max-warnings 0`)
- [YES] `pnpm test` — 666 tests pass across 16 files (69 new in `CancellableEitherAsync.test.ts`); 100% statement / 95% branch coverage on the new module
- [YES] `pnpm build` — ESM and CJS builds succeed
- [YES] `pnpm check:exports` — all 16 exports verified against `dist/`
- [YES] `pnpm check:nodeps` — no Node built-ins introduced (Workers compatibility preserved; `AbortController` / `AbortSignal` / `setTimeout` are global on Node 20+ and modern browsers)
- [YES] `pnpm lint:md` — markdown lint passes

## Notes for Reviewers

### Design Doc

The design rationale lives in `docs/CANCELLABLE_DESIGN.md`, shipped on a separate `docs/cancellable-design` branch per the [PRWorkflow](../llm-context/PRWorkflow.md) convention for design RFCs.
Merging that PR first gives this branch's `docs/CANCELLABLE_DESIGN.md` reference a live target. The doc captures the four §6 open questions and their resolutions (all accepted as recommended); this
branch implements exactly that design.

### Why a Sibling, Not a Refactor of `EitherAsync`

Adding a third terminal state to `EitherAsync.run(): Promise<Either<L, R>>` would either break its signature or collapse `Cancelled` into `Left` (which forces every caller to sniff their L payload to
tell failure from cancellation). A sibling keeps the simple, well-understood `EitherAsync` untouched and gives callers who need cancellation a type that surfaces it as a first-class case in `fold`.

### Why `chainLeft` Does NOT Recover from `Cancelled`

Cancellation means "we no longer care about this answer." If `chainLeft(retry)` swallowed `Cancelled`, retrying after the user clicked cancel would re-run work they explicitly abandoned — a real
footgun with real blast radius (wasted I/O, stale writes). `chainCancelled` is the explicit recovery primitive. The two stay separate by design; a future `chainTerminal(onLeft, onCancelled)`
convenience would be a non-breaking add.

### Why `onCancel` Fires on Any `Cancelled` (Including Propagation)

Users writing `.onCancel(closeConnection)` mean "clean up if we're cancelled" — they don't care whether the abort happened at the top-level signal or in a child stage. Firing only on external aborts
would silently leak resources in nested pipelines. Matches Effect-TS and fp-ts hook semantics.

### Cross-Runtime Notes

- Uses `AbortSignal.any([...])` (Node 20+, modern browsers 2024+) for composing external and internal signals in `withTimeout` and `race`. The project's `engines` field requires Node ≥ 20, so this is
  in-bounds.
- `AbortError` detection uses `e instanceof Error && e.name === 'AbortError'`, which matches both DOMException-derived browser aborts and Node's stdlib AbortError shape.
- `run()` upholds the never-rejects contract: `AbortError` → `Cancelled`, any other thrown/rejected value → `Left(onError(e))`, never re-throws. Verified by a dedicated `CRITICAL: run() never rejects`
  test in the suite, mirroring the same contract from `tests/EitherAsync.test.ts`.

### Deferred to v2 (Intentional Non-Goals)

These were explicitly out of v1 scope per design doc §8 and are documented both there and in the changeset:

- `Result<L, R>` 3-armed core type (vs the v1 inline union)
- `bracket(acquire, release, use)` for guaranteed resource cleanup
- `chainTerminal(onLeft, onCancelled)` combined recovery primitive
- Structured concurrency / `Scope` / supervisors
- Additional sequence partitioners (`cancelleds` / `lefts` / `rights` filters paralleling the EitherAsync helpers)

### Merge Strategy

Single feature + a follow-up review-doc commit. **Squash merge** gives a clean single entry on `main`; **merge commit** preserves the impl / review-doc split if you prefer the audit trail. Either
works.
