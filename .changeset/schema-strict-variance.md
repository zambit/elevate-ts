---
'@zambit/elevate-ts': patch
---

# Schema combinators compile again under `strict`

`Schema<T>` is assignable to `Schema<unknown>` again in projects with `strict` (specifically `strictFunctionTypes`).

In 0.8.0 and 0.9.0 the encoder slot on `Schema<T>` was declared as a function-typed property, which made `Schema<T>` contravariant in `T`.
As a result `object({ s: string() })`, `union(literal('a'), literal('b'))`, `array(...)` and the other combinators failed to compile in
strict consumer projects. It is now a method signature; runtime behavior is unchanged.

Also adds strict type-level tests for `Schema` (`tests/types/`, run by `pnpm check:types`), and makes `check:types` actually type-check
`src/`; it previously checked no files.
