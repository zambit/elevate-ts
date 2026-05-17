# Cancellable EitherAsync — Design Proposal

**Status:** Design draft, not yet implemented. Awaiting sign-off on the open questions in §6 before code is written.

## 1. Motivation

`EitherAsync<L, R>` is a lazy, failable async monad. It cannot be cancelled, because the underlying `Promise<Either<L, R>>` it produces cannot be cancelled — JavaScript has no preemptive Promise
cancellation, and `await` does not interrupt.

In practice, callers want cancellation in three common cases:

1. **Timeouts.** "Give up if it's not done in 2 seconds."
2. **Races.** "Whichever finishes first wins; cancel the others."
3. **Caller no longer cares.** Component unmounted, request aborted, parent operation already failed — finishing the work is wasted I/O and may write stale state.

The only mechanism JavaScript offers for this is **cooperative** cancellation through `AbortSignal`. Underlying I/O (`fetch`, `setTimeout`, Node `fs`, Cloudflare KV/D1, etc.) must accept a signal and
short-circuit when it's aborted. A cancellable monad's job is to plumb that signal through the pipeline without forcing every stage to handle it manually.

## 2. Design recommendation: a new sibling type, not a refactor

Cancellation should live in a **new module** `CancellableEitherAsync`, sibling to `EitherAsync`, not bolted onto `EitherAsync`. Reasons:

- **Backward compatibility.** Every existing `EitherAsync` user assumes `run(): Promise<Either<L, R>>`. Adding a required `signal` parameter is a breaking change; making it optional lets the
  cancellation contract be silently ignored.
- **Cancellation is a distinct semantic concern.** "Lazy failable async" is a clean, small abstraction. "Lazy failable async with cooperative cancellation and a third terminal state" is a different
  (and heavier) one. Conflating the two costs clarity for every user, including the majority who never need cancellation.
- **Different ergonomics.** Cancellable code wants `.run({ signal })` and a `Cancelled` outcome distinct from `Left`. Non-cancellable code shouldn't have to think about either.

## 3. Type

```typescript
export type Cancelled = { readonly tag: 'Cancelled'; readonly reason: unknown };

export const Cancelled = (reason: unknown): Cancelled => ({ tag: 'Cancelled', reason });

export type CancellableResult<L, R> = Either.Either<L, R> | Cancelled;

export type CancellableEitherAsync<L, R> = {
  readonly tag: 'CancellableEitherAsync';
  readonly run: (signal?: AbortSignal) => Promise<CancellableResult<L, R>>;
};
```

Three terminal states: `Right` (success), `Left` (failure), `Cancelled` (no longer cared about). Cancellation is **not** an error — it's a separate algebraic case. This lets call sites distinguish
"the operation failed" from "we no longer care about the answer," which matters for telemetry, retries, and downstream cleanup.

## 4. Why `AbortSignal`

- **Web standard.** Every modern `fetch`, every Cloudflare Workers binding, every Node 16+ stdlib (`setTimeout`, `fs.readFile`, `events.once`, etc.) already accepts an `AbortSignal`. Reusing it means
  cancellation propagates naturally through underlying I/O without library plumbing.
- **Composability.** `AbortSignal.any([s1, s2])` (Node 20+ / browsers 2024) gives free composition: cancellation flows through nested operations and timeouts.
- **Zero-dependency.** elevate-ts ships no runtime deps and uses no Node built-ins. `AbortSignal` is global on every supported runtime; a custom token would either bloat the bundle or duplicate
  functionality that already exists.

A custom cancellation token would be more flexible (e.g. attaching cleanup metadata) but the cost — every consumer would have to translate at the I/O boundary — is not worth it for elevate-ts's
audience.

## 5. Cooperative cancellation contract

Cancellation in this design is **cooperative**. JavaScript has no preemption. The contract for `CancellableEitherAsync<L, R>`:

1. **The body of `run(signal)` is responsible for forwarding the signal** to underlying async operations (`fetch(url, { signal })`, `kv.get(key, { signal })`, etc.).
2. **Combinators (`map`, `chain`, etc.) check `signal.aborted` at composition boundaries** and short-circuit to `Cancelled` when the signal is aborted before the stage runs.
3. **Once a stage produces `Cancelled`, downstream stages do not run** — same short-circuit pattern as `Left`, but with `Cancelled` as a third absorbing element.
4. **The primary lift `fromAbortable(f, onError, onCancel)`** splits `AbortError` rejections into `Cancelled` and other rejections into `Left` automatically.

The contract does **not** include preemption: a long synchronous loop, a CPU-bound computation, or a Promise that never resolves cannot be forced to stop. That is a limitation of the JavaScript
runtime, not the library.

## 6. Open design questions

These need decisions before implementation begins.

### 6.1 Terminal-state encoding

Three options:

| Option                       | Encoding                                                    | Trade-off                                                      |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| (1) **Distinct tag**         | `Either<L, R> \| Cancelled`                                 | Minimal new types, distinct case at fold time, easy to migrate |
| (2) **Collapse into Left**   | `Either<L \| { _cancelled: true }, R>`                      | Reuses Either; conflates failure with cancellation             |
| (3) **Three-armed sum type** | `Result<L, R> = Left \| Right \| Cancelled` (new core type) | Cleanest semantically; introduces a new core algebraic type    |

**Recommended: (1).** Minimal addition, distinct case for folding, no new core type. Option (3) is more principled but adds a library-wide commitment to a new union. Option (2) is wrong — call sites
cannot tell "I failed" from "I was cancelled" without runtime tag-sniffing inside the L value.

### 6.2 Should `chainLeft` recover from `Cancelled`?

**Recommended: no.** `chainLeft` only recovers from `Left`. To recover from `Cancelled`, callers use a separate `chainCancelled(f)`. This keeps the two semantically distinct cases from being silently
swallowed by code that meant "handle errors."

### 6.3 Cleanup hooks (`onCancel`)

When a user attaches `onCancel(handler)`, when does the handler fire?

- (a) Only when the _external_ signal aborts.
- (b) Whenever the stage produces `Cancelled`, including propagation from a parent.

**Recommended: (b).** A handler should fire whenever this stage stops because the signal aborted, regardless of whether the abort happened upstream or downstream of this stage's lift. This matches
user intuition ("clean up when we're cancelled") and is what Effect / fp-ts cleanup hooks do.

### 6.4 Resource safety: bracket?

Should v1 ship `bracket(acquire, release, use)` (acquire-use-release pattern, as in fp-ts/Effect)? This is the only sound way to guarantee resource cleanup under cancellation.

**Recommended: defer to v2.** v1 ships `onCancel` (hook-based cleanup) which covers ~80% of cases. `bracket` is a worthwhile follow-up but not v1.

## 7. Proposed API surface (v1)

```typescript
// Constructors
ReaderEitherAsync(...)              // raw
of<A>(a): CEA<never, A>
right<A>(a): CEA<never, A>
left<L>(l): CEA<L, never>
cancelled(reason): CEA<never, never>

fromPromise<L, A>(p, onError): CEA<L, A>
fromAbortable<L, A>(
  f: (signal: AbortSignal) => Promise<A>,
  onError: (e: unknown) => L
): CEA<L, A>
tryCatch<L, A>(f, onError): CEA<L, A>

// Functor / Bifunctor / Monad — all propagate Cancelled
map(f): (cea) => CEA<L, B>
mapLeft(f): (cea) => CEA<L2, A>
bimap(f, g): (cea) => CEA<L2, B>
chain(f): (cea) => CEA<L, B>
chainLeft(f): (cea) => CEA<L2, A>      // does NOT recover from Cancelled
chainCancelled(f): (cea) => CEA<L, A>  // recover from Cancelled
ap(cef): (cea) => CEA<L, B>

// Cancellation-specific
withTimeout(ms): (cea) => CEA<L, A>
race(ceas): CEA<L, A>                  // first to settle wins; others get cancelled
onCancel(handler: (reason) => void): (cea) => CEA<L, A>

// Interop
fromEitherAsync(ea): CEA<L, A>         // signal ignored; never cancels
toEitherAsync(
  cea,
  onCancel: (reason) => L
): EitherAsync<L, A>                   // collapse Cancelled into Left

// Extraction
fold(onLeft, onRight, onCancelled): (cea) => Promise<B>
runCancellable(signal?: AbortSignal): (cea) => Promise<CancellableResult<L, A>>

// Sequence
all(ceas): CEA<L, readonly A[]>        // first Left or Cancelled aborts the rest
```

## 8. What is NOT in v1

Explicit non-goals so scope stays small:

- **No preemption.** A pipeline that's already in synchronous CPU-bound work cannot be stopped. Cancellation only takes effect at await boundaries.
- **No automatic resource cleanup beyond `onCancel`.** No `bracket`, no `Scope` primitive. v2 work.
- **No structured concurrency / supervisors.** No "kill the whole tree on first failure." Composing via `race` / `all` covers the common cases.
- **No backpressure / pull-based streaming.** Out of scope; that is an `Observable` / `AsyncIterable` problem, not a `Task` problem.

## 9. Acceptance criteria for sign-off

Before implementation begins, the user (or a designated reviewer) should explicitly confirm:

1. Recommendation in §2 (new sibling type) is accepted.
2. Choice in §6.1 (distinct `Cancelled` tag, option 1) is accepted.
3. Choice in §6.2 (no `chainLeft` recovery from `Cancelled`) is accepted.
4. Choice in §6.3 (cleanup fires on any `Cancelled`, option b) is accepted.
5. v1 scope in §7 / §8 is accepted; `bracket` is deferred.

After sign-off, implementation order:

1. `src/CancellableEitherAsync.ts` + `tests/CancellableEitherAsync.test.ts`
2. Wire into `src/index.ts` and `package.json` exports
3. Add API section to `docs/API.md`
4. Changeset entry (minor version bump)
5. Run full verification suite (format, lint, typecheck, test, check:exports, check:nodeps, lint:md, build)

## 10. Open prior art for reference

- **fp-ts** has no first-class cancellation; you compose `AbortSignal` manually.
- **Effect-TS** has a full `Fiber` model with structured concurrency, interruption, and resource scopes. This is the gold standard, but a much larger undertaking than v1 here. It would inform a v3+
  design if elevate-ts ever wants that breadth.
- **Fluture** has cancellable Futures via a disposer-returning constructor. Conceptually closer to v1 here than fp-ts, but uses a custom token instead of `AbortSignal`.

This proposal aims for "smallest useful cancellable monad on top of the JavaScript platform's built-in cancellation primitive," not a full effect system.
