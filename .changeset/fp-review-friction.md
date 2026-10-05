---
'@zambit/elevate-ts': minor
---

# Async Exception Contract, tryMap / tryChain, and memoize Fix

Makes the async types' exception handling match their documentation, following an external FP review.

- **`MaybeAsync` now never rejects.** Its constructor turns any throw or rejection into `Nothing`, so a callback that throws inside `map`, `chain`, `filter`, `ap`, `alt` or `all` now yields
  `Nothing` instead of rejecting `run()`. Only `getOrElseL` and `fold` can reject, and only if the callback you pass them does. If you relied on a `MaybeAsync` pipeline rejecting, it now resolves to
  `Nothing`.
- **New `tryMap(f, onError)` and `tryChain(f, onError)`** on `EitherAsync`, `ReaderEitherAsync` and `CancellableEitherAsync`. They capture a throw in `f` (or, for `tryChain`, a rejection of the
  computation it returns) as `Left(onError(e))`; `CancellableEitherAsync.tryChain` turns an `AbortError` into `Cancelled`.
- **Docstrings corrected.** The `Either`-based async types capture throws only where you supply an error mapper (`tryCatch`, `fromPromise`, `tryMap`, `tryChain`). A throw inside a plain `map` /
  `chain` callback rejects `run()`; this was always the behavior, and the docs previously claimed otherwise.
- **`EitherAsync.toMaybeAsync` and `MaybeAsync.toEitherAsync`** no longer reject when their source does (the result is `Nothing` / `Left(onNothing)`), and use static imports instead of a dynamic
  `import()` per run.
- **`Function.memoize` now caches `undefined` results.** Previously a function returning `undefined` was re-invoked on every call.

See `docs/DESIGN_DECISIONS.md` for the rationale, and the new "Conventions Across Modules" section of `docs/API.md` for the exception contract, `fold` shapes and pair shapes side by side.
