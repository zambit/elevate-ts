# [REVIEW] An FP Practitioner's Review of elevate-ts

**Date:** 2026-06-03 **Reviewer perspective:** experienced FP practitioner familiar with fp-ts, purify-ts, Effect, Haskell, and the Fantasy Land spec. **Scope:** the runtime library under
[src/](../src/), tests under [tests/](../tests/), and the design docs under [docs/](../docs/).

The review is deliberately specific: every claim about behavior was either traced through the source or executed against the built artifact in [dist/](../dist/) on a small harness. Findings I could
not verify are flagged as such.

---

## [SUMMARY] At a glance

elevate-ts is a small (~3,100 LOC source, ~6,100 LOC tests), well-scoped, point-free, data-last FP toolkit for TypeScript. It targets edge runtimes (Cloudflare Workers, Deno) and refuses Node
built-ins or third-party runtime dependencies. The discipline around function length (≤10 lines), explicit return types, and railway-oriented error handling is uniformly enforced.

The library is genuinely useful and well-positioned. The core monads ([Either](../src/Either.ts), [Maybe](../src/Maybe.ts), [Reader](../src/Reader.ts), [State](../src/State.ts),
[Validation](../src/Validation.ts)) are correct and clean. The [Schema](../src/Schema.ts) module — a Valibot-style declarative parser over [Validation](../src/Validation.ts) — is the most polished
piece. The [CancellableEitherAsync](../src/CancellableEitherAsync.ts) module is a thoughtful piece of cancellation design, with a third terminal state (`Cancelled`) distinct from `Left` and explicit
`AbortSignal` threading.

The most consequential problem I found is a documentation/implementation gap in the async monads: the docstrings on [EitherAsync](../src/EitherAsync.ts) and [MaybeAsync](../src/MaybeAsync.ts) claim
that thrown exceptions in user-supplied transform functions become `Left`/`Nothing`, but the implementations of `map`, `chain`, `ap`, `mapLeft`, `bimap`, and friends do not catch them — the returned
`Promise<Either<...>>` rejects instead. This is a contract callers will rely on, and the gap is silent. Detail and a repro are below.

---

## [STRENGTHS] What this library does well

### Discipline you can feel

The constraints in [llm-context/MandatoryRules.md](../llm-context/MandatoryRules.md) and [llm-context/NeverDo.md](../llm-context/NeverDo.md) are visible in the code:

- Every function returns within 10 lines.
- Every type signature is explicit. No `any` anywhere I could find.
- Every function is curried for partial application; data-last is uniform.
- No mutations on input; every result is a fresh allocation.
- No Node built-ins or DOM APIs — code is portable to Workers, Deno, the browser, Node.

This is rare. Most FP libraries either compromise one of these or smuggle in a heavy runtime. elevate-ts ships a tight, edge-friendly bundle and the code reads as if a single person enforced taste
throughout.

### Prototype isolation is excellent engineering

The Fantasy Land patches in [Either.ts:15-22](../src/Either.ts#L15-L22) (and parallel in [Maybe.ts](../src/Maybe.ts), [Reader.ts](../src/Reader.ts), [State.ts](../src/State.ts),
[Tuple.ts](../src/Tuple.ts)) use a private `_*Proto` object as the prototype root for constructed values, rather than patching `Object.prototype`. The reasoning is laid out in
[docs/PROTOTYPE_ISOLATION.md](./PROTOTYPE_ISOLATION.md) and it is exactly correct: the obvious-looking pattern (`Object.getPrototypeOf(Right(0))['fantasy-land/map'] = ...`) silently pollutes
`Object.prototype` and breaks Vitest's loader with a misleading `Symbol.iterator` error. The document is a model of "what a returning maintainer needs to know in six months" and the in-code comments
backstop it.

### CancellableEitherAsync is the right design

[CancellableEitherAsync](../src/CancellableEitherAsync.ts) is a sibling type, not a refactor of [EitherAsync](../src/EitherAsync.ts), and that is the right call. Cancellation is a different algebra: a
third terminal state (`Cancelled`) carrying an opaque `reason`, distinct from `Left`. The design avoids two pitfalls I see in other libraries:

- **Cancellation is not an error.** `chainLeft` does not recover `Cancelled`; only `chainCancelled` does. This stops callers from silently retrying work the caller already abandoned — see
  [CancellableEitherAsync.ts:158-168](../src/CancellableEitherAsync.ts#L158-L168).
- **AbortSignal is plumbed through `.run(signal?)`** rather than hidden in closures, so users opt into cancellation per pipeline. `withTimeout`, `race`, and `all` link internal controllers to the
  external signal via `AbortSignal.any` — see [CancellableEitherAsync.ts:41](../src/CancellableEitherAsync.ts#L41) and [CancellableEitherAsync.ts:201-227](../src/CancellableEitherAsync.ts#L201-L227).

`onCancel` is exception-swallowing by contract (line 234-247), which is the right call for a library with no logger.

### Schema is a small gem

[Schema.ts](../src/Schema.ts) is the cleanest module in the library. It is Valibot-style (tree-shakable, function-based, error-accumulating) and integrates naturally with
[Validation](../src/Validation.ts). `Issue` carries a `path: readonly (string | number)[]` that is correctly prepended as you descend into nested structures — see
[Schema.ts:36-38](../src/Schema.ts#L36-L38) and the per-key/per-index prepends in `_objectValidate` and `_arrayValidate`. `union` accumulates errors across all attempted branches, which is the right
thing to do for a parser. `refine` composes cleanly. The encoder hook on `transform` (a `Symbol`-keyed property) is dead-code today but at least non-leaky.

### Zero dependencies, with a principled answer for the corner case

[Audit.ts](../src/Audit.ts) needed an ID generator. The decision documented in [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) was to inject it (default `crypto.randomUUID()`) rather than ship
`@paralleldrive/cuid2`. This is the right trade-off for an edge-targeted library; users who need monotonic IDs inject cuid2 themselves.

### Test discipline

96.27% statement coverage on a 282ms test run, with most modules at 100%. The branches that remain uncovered are mostly the Fantasy Land mirror paths on the `Left`/`Nothing` side, which behave
identically to the namespace functions and are exercised through them. The mismatch is easy to close if 100% is a goal.

---

## [FINDINGS] Issues I found, ranked by impact

### [P0] Async monads silently break their own "never rejects" contract

The docstrings on every operator in [EitherAsync.ts](../src/EitherAsync.ts) and [MaybeAsync.ts](../src/MaybeAsync.ts) carry the line:

> Rejected Promises and thrown exceptions become Left; never throws or rejects.

This is enforced for `tryCatch` and `fromPromise`. It is **not** enforced for `map`, `chain`, `mapLeft`, `bimap`, `ap`, `chainLeft`, `swap`, or the `MaybeAsync` equivalents. Concretely,
[EitherAsync.ts:88-91](../src/EitherAsync.ts#L88-L91):

```ts
export const map =
  <L, A, B>(f: (a: A) => B): ((ea: EitherAsync<L, A>) => EitherAsync<L, B>) =>
  (ea) =>
    EitherAsync<L, B>(() => ea.run().then((either) => Either.map(f)(either)) as Promise<Either.Either<L, B>>);
```

If `f` throws synchronously, `Either.map(f)(either)` throws inside the `.then` callback, which causes the returned `Promise` to reject. So calling `.run()` on the result **rejects** rather than
resolving to `Left`. This is exactly the failure mode the docstring promises will not happen.

I confirmed this empirically against [dist/](../dist/):

```js
const ea = EA.of(1);
const broken = EA.map(() => {
  throw new Error('boom');
})(ea);
await broken.run();
//   EA.map throw -> run() REJECTED: boom
//   EA.chain throw -> run() REJECTED: boom
//   MA.map throw -> run() REJECTED: boom
```

Why this matters: callers using `pipe(ea, map(f), chain(g))` expect to handle errors by inspecting the `Either`. They will not wrap every `.run()` in `try/catch`. A throw in `f` will surface as an
unhandled rejection at the edge of the program — which is precisely the failure mode the library exists to prevent.

**Fix.** Each operator that takes a user-supplied function should catch inside the async path. The minimal change for `map`:

```ts
export const map =
  <L, A, B>(f: (a: A) => B) =>
  (ea: EitherAsync<L, A>): EitherAsync<L, B> =>
    EitherAsync(async () => {
      const either = await ea.run().catch((e) => {
        throw e;
      }); // upstream still rejects; see note
      if (either.tag === 'Left') return either;
      try {
        return Either.Right(f(either.right));
      } catch (e) {
        // No onError available — either narrow the contract, or take onError parameter
        throw e;
      }
    });
```

That immediately exposes the real design question: `map` has no `onError` argument, so the library has to choose one of:

1. **Narrow the contract.** Change the docstring to "the user is responsible for not throwing in `f`; if `f` throws, `run()` rejects." This is the fp-ts convention and is honest, but it weakens the
   "never rejects" promise.
2. **Require an onError on every operator.** Inconsistent with the rest of the API surface, and ugly to use.
3. **Add `mapSafe(f, onError)` / `chainSafe(f, onError)` variants** that catch, and keep the existing operators as "fast path / caller-disciplined." This is what fp-ts does with `chainW` /
   `chainEitherKW` etc. and is probably the cleanest answer here.

Whichever path is chosen, the docstring needs to match the implementation. Right now it does not, and that is a latent footgun for every user of the async types.

`ReaderEitherAsync` has the same issue at [ReaderEitherAsync.ts:94-98](../src/ReaderEitherAsync.ts#L94-L98). Same for `CancellableEitherAsync.map` at
[CancellableEitherAsync.ts:118-124](../src/CancellableEitherAsync.ts#L118-L124).

### [P1] `Function.memoize` does not cache `undefined` returns

[Function.ts:262-273](../src/Function.ts#L262-L273):

```ts
export const memoize = <A, B>(f: (a: A) => B): ((a: A) => B) => {
  const cache = new Map<A, B>();
  return (a: A) => {
    const cached = cache.get(a);
    if (cached !== undefined) {
      return cached;
    }
    const result = f(a);
    cache.set(a, result);
    return result;
  };
};
```

If `f(a)` legitimately returns `undefined`, `cache.get(a)` will return `undefined` on every subsequent call and the function will be re-invoked every time. Verified:

```js
let calls = 0;
const f = memoize(() => {
  calls++;
  return undefined;
});
f(1);
f(1);
f(1);
// calls === 3
```

**Fix.** Use `cache.has(a)`:

```ts
if (cache.has(a)) return cache.get(a) as B;
```

### [P1] Fantasy Land conformance is incomplete for type conversions

`Maybe.toEither`, `Either.toMaybe`, and `Validation.toEither` all return inline object literals rather than using the constructors. Examples:

- [Maybe.ts:201-207](../src/Maybe.ts#L201-L207)
- [Either.ts:43-48](../src/Either.ts#L43-L48)
- [Validation.ts:39](../src/Validation.ts#L39)

The structural types match the public types, so pipe-based usage (`pipe(toEither(...), Either.map(f))`) works. But the prototype chain of those objects is `Object.prototype`, not the private
`_rightProto` / `_leftProto`, so Fantasy Land methods are **missing** on those values. Verified:

```js
const fromCtor = E.Right(1);
const fromConv = M.toEither('e')(M.Just(1));
fromCtor['fantasy-land/map']; // function
fromConv['fantasy-land/map']; // undefined
```

This means a downstream library doing `result['fantasy-land/map'](f)` against a Right produced by `Maybe.toEither` will throw. Either every constructor path or none should be FL-conformant; the
current state is "most are, except across conversions."

**Fix.** Have the conversion functions call the real constructors. For [Maybe.toEither](../src/Maybe.ts#L201-L207):

```ts
import * as Either from './Either.js'; // already imported elsewhere; not circular
export const toEither =
  <E, A>(onNothing: E) =>
  (ma: Maybe<A>): Either.Either<E, A> =>
    ma.tag === 'Just' ? Either.Right(ma.value) : Either.Left(onNothing);
```

`Either.toMaybe` and `Validation.toEither` need the symmetric change.

### [P1] `Validation` exposes `chain`, but the type cannot be a lawful Monad

[Validation.ts:66-69](../src/Validation.ts#L66-L69) exposes `chain` that short-circuits on the first `Failure`. But `ap` at [Validation.ts:54-63](../src/Validation.ts#L54-L63) accumulates errors.
These are incompatible: any type whose Applicative is accumulating cannot also be a lawful Monad over the same `ap` (because `ap = chain` for a Monad implies the short-circuiting behavior on the
second computation, which contradicts the accumulating semantics).

The Fantasy Land block at the bottom of [Validation.ts:114-125](../src/Validation.ts#L114-L125) explicitly notes this concern and defers FL conformance for `ap` until the design is settled. Good — but
`chain` is still exported as a namespace function, with no docstring warning that it diverges from `ap`'s semantics. Callers who write `pipe(va, chain(f))` expecting "applicative-style error
accumulation" will be silently wrong.

**Fix.** Either remove `chain` from `Validation` (the conventional answer; users wanting chaining convert to `Either` first), or document very explicitly that `Validation`'s `chain` short-circuits and
that the two operators are not interchangeable. A `chainE` that converts `Validation -> Either -> Validation` is sometimes provided as an explicit escape hatch in other libraries.

### [P2] `List.head` / `List.last` return `A | undefined` instead of `Maybe<A>`

[List.ts:10](../src/List.ts#L10), [List.ts:24](../src/List.ts#L24). The library elsewhere fights hard against in-band absence: `uncons` correctly returns `Maybe<readonly [A, readonly A[]]>` at
[List.ts:38](../src/List.ts#L38). `head` and `last` exposing raw `undefined` is inconsistent with the surrounding discipline and forces every call site to wrap with `Maybe.fromNullable`.

**Fix.** Return `Maybe<A>`. Add `headOr` / `lastOr` for callers who really do want a default. The current behavior can stay as `headUnsafe` if a partial function is needed for perf hotspots, but the
default name should be the safe one.

### [P2] `List.nubBy` is misnamed

[List.ts:165-176](../src/List.ts#L165-L176). In Haskell and every library that borrows the name, `nub` / `nubBy` removes **all** duplicates (`O(n²)` in the general case). elevate-ts's `nubBy` removes
only **consecutive** duplicates — that's the operation Haskell calls `group >>= take 1` or what most libraries call `dedupConsecutive`. The docstring says "consecutive" so the implementation is
consistent with itself, but the name carries the wrong intuition for any reader who has used the operator before.

**Fix.** Rename to `dedupConsecutiveBy` (or `groupedNub`) and add a real `nubBy` if the unconstrained-position dedup operation is also wanted.

### [P2] `List.zip` returns `[pairs, remainder]` with no tag for which side the remainder is from

[List.ts:193-203](../src/List.ts#L193-L203):

```ts
const remainder = arr1.length > arr2.length ? arr1.slice(len) : arr2.slice(len);
return [pairs, remainder] as const;
```

If `arr1` is `[1,2,3,4]: number[]` and `arr2` is `['a','b']: string[]`, you get `[[[1,'a'],[2,'b']], [3,4]]` — but you cannot tell from the type whether the remainder is `A[]` or `B[]`. It is typed as
`A[] | B[]`, which is correct but unhelpful.

Most FP libraries do not return the remainder at all (Haskell's `zip` just truncates). The combined return value here looks like an attempt at `zipLongest`, but it does not deliver that semantic
either (the missing side just isn't there at all). I would either drop the remainder or expose `zipLongest` / `zipWithLongest` separately.

### [P2] `MaybeAsync.all` is `MaybeAsync<A[]>`, not `MaybeAsync<readonly A[]>`

[MaybeAsync.ts:209](../src/MaybeAsync.ts#L209). Out of step with `EitherAsync.all` at [EitherAsync.ts:233](../src/EitherAsync.ts#L233), which returns `EitherAsync<L, readonly R[]>`, and out of step
with the library's pervasive `readonly` convention.

### [P2] `Tuple` is `{ fst, snd }` but `State` runs to `readonly [A, S]`

[Tuple.ts:4](../src/Tuple.ts#L4) and [State.ts:4](../src/State.ts#L4). The library has two representations of a pair, one for `Tuple` (object form, with `mapFst` / `mapSnd` / `bimap` / `fanout`
operators) and one for `State` (array tuple, destructured at every call site). Either is defensible in isolation but the inconsistency means there is no single canonical "pair" in the library. Code
passing the result of `State.runState` to something that expects a `Tuple` has to convert.

This is the kind of thing the library will be hard to change later, so I would either (a) push `State` to also use `Tuple` internally and convert on the boundary, or (b) document explicitly that
array-tuples are the canonical pair and `Tuple` is for cases that need named accessors / a Functor instance.

### [P2] Dynamic imports inside `toEitherAsync` / `toMaybeAsync` are unnecessary

[MaybeAsync.ts:173](../src/MaybeAsync.ts#L173) and [EitherAsync.ts:221](../src/EitherAsync.ts#L221) use `await import('./Either.js')` with a comment "Dynamic import to avoid circular dependencies."
But `Maybe` does not import `MaybeAsync`, and `Either` does not import `EitherAsync`. The circularity, if any, is between `MaybeAsync` and `EitherAsync` themselves — and the existing `import type`
declarations at the top of each file already handle that with no runtime weight.

Each dynamic import adds an extra microtask per call and complicates bundler analysis (some bundlers will refuse to inline the module). Static `import * as Maybe from './Maybe.js'` is already used
elsewhere in `MaybeAsync` (line 4) without issue.

**Fix.** Replace with static imports.

### [P3] `Function.once` has a confusing signature

[Function.ts:280-290](../src/Function.ts#L280-L290):

```ts
export const once = <A, B>(f: (a: A) => B): ((a: A) => B) => {
  let called = false;
  let result: B;
  return (a: A) => {
    if (!called) {
      result = f(a);
      called = true;
    }
    return result;
  };
};
```

This takes a unary function but caches the first call's result and ignores subsequent arguments. `once(f)(1)` returns `f(1)`. `once(f)(2)` returns the cached `f(1)`. This is almost never what callers
want.

The conventional `once` takes a thunk `() => B` and is used for lazy initialization:

```ts
export const once = <B>(f: () => B): (() => B) => { ... };
```

The current shape risks bugs where a memoize is meant. Either the type should be `() => B`, or the doc should warn loudly. I suspect the current shape is a leftover from intending `memoize`.

### [P3] `fold` shapes vary across modules; payload-less variants are slightly surprising

- `Either.fold(onLeft, onRight)(ea)` — both functions
- `EitherAsync.fold(onLeft, onRight)(ea)` — both async functions
- `Maybe.fold(onNothing, onJust)(ma)` — `onNothing: B`, `onJust: (a: A) => B`
- `MaybeAsync.fold(onNothing, onJust)(ma)` — `onNothing: B`, `onJust: (a: A) => Promise<B>`
- `Validation.fold(onFailure, onSuccess)(va)` — `onFailure` takes `readonly E[]`
- `ReaderEitherAsync.fold(onLeft, onRight)(rea)(env)` — extra curry layer

The Maybe variant taking `B` (not `() => B`) for `onNothing` is principled — `Nothing` has no payload, so requiring a thunk would be busywork. But it means callers cannot unify on a single `fold`
mental model. I would either accept this and call it out prominently in [docs/API.md](./API.md), or normalize to functions everywhere with a lazy `B` thunk for symmetry.

### [P3] `Audit.replay` is a thin alias for `getEntries`

[Audit.ts:141](../src/Audit.ts#L141) returns `log.entries` exactly the way `Audit.getEntries(log)` does at line 124. The name "replay" implies re-executing operations against state, which I would
expect from the time-travel narrative in the file's header comment. As implemented, it's a getter under a misleading name.

If actual replay (drive a fresh `AuditSession` through the recorded inputs and verify outputs match) is on the roadmap, leave the slot reserved with a `TODO`. If it's not, remove the alias.

---

## [DESIGN-NOTES] Higher-level observations

### The "never throws" promise is the library's most valuable contract — protect it

elevate-ts's positioning vs. fp-ts is largely "smaller, edge-first, point-free, no dependencies." That positioning is real and well-defended. But the most valuable _semantic_ differentiator vs. raw
Promises is the "never throws" promise on the async types: if I write a pipeline, I never have to wrap it in `try/catch`. That promise needs to be tighter than it currently is (see P0 above). Once
it's airtight, it becomes a one-line answer for why an edge developer should adopt the library over rolling their own.

### The lack of a fan-in / `Do` notation will be felt

elevate-ts has `all` (parallel sequence), `traverse` (serial sequence), and `ap`. It does not have a `Do` notation or `liftAN`-style helpers for combining heterogeneous effects
(`combine(eaUser, eaConfig, eaPermissions)` → `EitherAsync<L, {user, config, permissions}>`). Today users either write nested `chain`s or unpack `all`'s `readonly R[]` manually with index access.

This is the single piece of ergonomics where library users (myself included) will most notice an absence vs. fp-ts (`Apply.sequenceS`). The Validation use case especially benefits from this. A
`sequenceS` / `apS` analogue would slot in naturally.

### The Reader / ReaderEitherAsync split is right; one more lift would help

`ReaderEitherAsync` lifts an `EitherAsync` via `liftEitherAsync`. It does not lift a `Reader<R, A>` _as a failable computation_ — you can lift it as `Right` via `liftReader`, but if
`Reader<R, Either<L, A>>` is what you have (a common shape when validating an env), you have to manually unwrap. An `asksEither` already exists; an `asksEitherAsync` already exists. A
`liftReaderEither` that takes `Reader<R, Either<L, A>>` would close the obvious gap.

### `CancellableEitherAsync` deserves a `Reader`-aware sibling

Cancellation and dependency injection are commonly needed together. Today writing a cancellable, env-aware async pipeline requires either provisioning the env outside the pipeline (losing `local` /
`provide`) or threading it manually. A `ReaderCancellableEitherAsync<R, L, A> = (env, signal?) => Promise<CancellableResult<L, A>>` would be a heavy lift but matches what a Workers backend actually
wants.

### Fantasy Land conformance: commit or retreat

Right now FL conformance is patchwork: most types have it, `Validation` and `NonEmptyList` defer (with comments explaining why), `Tuple` is Functor-only, conversions silently break it (P1 above), and
the FL mirror branches are mostly test-uncovered. Either close the remaining gaps and add Fantasy Land law tests (there are off-the-shelf law suites that can be wired against the FL methods), or step
back to "we use a structural representation; FL conformance is best-effort and not guaranteed across conversions" and remove the half-implementations. The middle ground is the most expensive place to
be.

### Performance: the lazy async path allocates more than necessary

Every operator on `EitherAsync` allocates a new `EitherAsync` wrapper _and_ a new `Promise` chain. Heavy pipelines (10+ stages) create 20+ allocations. This is fine for I/O-bound code (the allocations
are dwarfed by the wait), but is something to keep in mind if elevate-ts is ever used for tight CPU-bound transforms. fp-ts has a fusion pass via interpretation for `TaskEither` chains; elevate-ts
does not, and probably shouldn't (it would compromise the "small library" promise). Worth a note in [docs/DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md).

---

## [PRIORITIZED-PATCH-LIST] If I had a half-day

In rough order of value-per-effort:

1. **Fix the `EitherAsync` / `MaybeAsync` exception-safety claim.** Either tighten the implementations to actually catch, or relax the docstring and add explicit `*Safe` variants. **(P0)**
2. **Fix `Function.memoize`** to use `cache.has(a)`. **(P1)** — one-line change.
3. **Route `Maybe.toEither` / `Either.toMaybe` / `Validation.toEither` through the real constructors.** Closes the FL conformance gap. **(P1)** — three edits.
4. **Remove or document `Validation.chain`'s short-circuiting semantics.** **(P1)**
5. **Return `Maybe<A>` from `List.head` / `List.last`**, add `headUnsafe` / `lastUnsafe` for callers who really want raw access. **(P2)**
6. **Rename `List.nubBy`** to `dedupConsecutiveBy`. **(P2)**
7. **Replace dynamic imports in `MaybeAsync.toEitherAsync` and `EitherAsync.toMaybeAsync` with static imports.** **(P2)**
8. **Reconsider `Function.once`'s signature** (probably should be `() => B`). **(P3)**
9. **Add `sequenceS` / `apS`-style helper for heterogeneous combine.** **(design)**
10. **Decide on Fantasy Land all-in vs. step-back, and execute.** **(design)**

---

<!-- markdownlint-disable MD025 -->

# [EXPERIENCE] Working with elevate-ts as a reviewer

<!-- markdownlint-enable MD025 -->

This section is my honest take, separate from the findings above, on what it was like to spend a few hours inside this codebase.

## Reading the code was unusually pleasant

Most TypeScript FP libraries pay for their power with cognitive overhead: deeply nested type signatures, three or four type parameters per operator, conditional-type machinery that resists eyeballing.
elevate-ts is not that. Every operator I read was small, single-purpose, and immediately legible. The 10-line rule is not a slogan here — it is load-bearing and it pays off when you are reading.

The point-free / data-last convention also pays off when reading namespace-imported code: `pipe(value, map(f), chain(g))` reads as a sequence of operations applied to a known value, with no
intermediate names you have to track in your head. Once your eye is trained on it, this is genuinely faster to scan than the chained-method form.

The docstrings are dense but useful, and the `[NOTE]` / `[YES]` / `[NO]` text-label convention from [SymbolGuidelines.md](../llm-context/SymbolGuidelines.md) (avoiding complex emojis for
PDF-generation reasons) feels slightly old-school but is consistent and never gets in the way.

## The design docs are doing real work

`docs/PROTOTYPE_ISOLATION.md`, `docs/CANCELLABLE_DESIGN.md`, and `docs/DESIGN_DECISIONS.md` are doing the job that "tribal knowledge" usually does, and they are written for the returning maintainer,
not for marketing. I learned things from them that I would have otherwise had to reverse-engineer from the code. This is rare and valuable. Most libraries' docs are either tutorials (good for the
reader, useless for the maintainer) or autogenerated API reference (useless for both). elevate-ts has tutorials _and_ design rationale, and the rationale is what survives.

The one place this falters is the gap between the docstrings on the async types and what the code actually does (the P0 above). The docs are doing work, but they are overpromising in one specific
place, and the cost of that overpromise lands on every user.

## Where I felt friction

A few specific moments where I had to work harder than I expected:

- **The pair representation split.** I read `State` first, then `Tuple`, and was briefly confused that they used different shapes. I would have caught it eventually — but a one-liner in `Tuple.ts`
  saying "use this when you want a Functor instance or named accessors; `State` uses array tuples by convention" would have saved me the trip.

- **`fold`'s shape varies.** When I switched from `Either.fold` to `Maybe.fold` I briefly typed an `() => B` for `onNothing` before remembering it takes a `B`. Minor, but a consistent shape would have
  been nicer.

- **`MaybeAsync.toEitherAsync` doing a dynamic import.** I stared at the code for a while trying to figure out what circularity it was avoiding, then went and read `Maybe.ts` and `Either.ts` and
  confirmed there was no circularity to avoid. That's a small but real cost paid by every reader.

- **Verifying claims.** Several docstrings are strong assertions about runtime behavior ("never throws," "rejects become Left"). I cannot tell from a docstring alone whether the claim is enforced or
  merely intended. I ended up running small repros against `dist/` to confirm, and I caught two cases (the P0 and the memoize bug) where the code did not match the docstring or the obvious intent. If
  I were a new user, I would have hit one of those in production rather than in review. A small test-suite section that exists specifically to lock down the "never throws" contract — written in the
  paranoid mode of "what could go wrong if a user passes a function that throws in `f`?" — would shift these from latent bugs to fenced-off behaviors.

## What I think elevate-ts is for

After several hours inside the library: this is a tool for someone who has decided that they want railway-oriented programming and dependency injection in a Cloudflare Worker (or anywhere else `fetch`
is the only API), and who is not interested in the cost or the ceremony of Effect-TS. The Schema + Validation + Either + EitherAsync stack covers parsing-to-domain-types and async I/O cleanly, the
Cancellable layer handles the cases where you need to abort, and the whole thing fits in a sub-30KB bundle. That is a real, defensible slot in the ecosystem, and I think the library lands in it well.

The things I would not reach for elevate-ts for: anything where I need fiber-style structured concurrency, anything where I want Effect's `Layer` for resource acquisition, or anything where I want
`Do` notation for combining heterogeneous computations. Those are the gaps that, if filled (selectively, without compromising the small-library promise), would broaden elevate-ts's range without
changing its character.

## A small piece of evidence the library is well-tended

When I wrote a quick repro against `dist/` to verify the P0 finding, the build artifact in `dist/` was up to date with the source, the ESM entry points resolved cleanly, and the test suite ran in
under 300ms with 96% coverage. Those three things are mundane but they are the surface tension of a library that gets shipped on time. A lot of FP libraries fail at one or more of them.

## In one line

If the P0 in `EitherAsync` / `MaybeAsync` is closed and the smaller cleanups land, elevate-ts is, to my eye, the best library in its weight class for edge TypeScript.
