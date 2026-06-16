# Review: fix/schema-encoder

**Branch:** fix/schema-encoder **Date:** 2026-06-06 **Status:** Ready for review

## What Was Implemented

Wires `transform`'s optional `encodeFn` through `serialize` so schemas with non-JSON-native value types (`Date`, `BigInt`, custom domain types) round-trip cleanly. Previously the `encodeFn` argument
was accepted by `transform`, stashed on a Symbol-keyed property of the returned schema, and never read by `serialize` — `serialize` only ever called `JSON.stringify` against the raw value. This was
documented in [reviews/feat-schema.md](./feat-schema.md) under "What's deliberately out of v1: Round-trip-aware `serialize`." This change closes that gap.

### 1. Schema becomes a callable with an attached encoder

`Schema<T>` is still a callable from outside the module, so all existing combinator wiring and the public `pipe` ergonomics are unchanged. Internally, every schema constructed via a combinator now
also carries a private `[_ENCODER]` property:

```typescript
export type Schema<T> = ((input: unknown) => Validation.Validation<Issue, T>) & {
  readonly [_ENCODER]?: (value: T) => unknown;
};
```

The property is **optional in the type** so ad-hoc user-defined schemas (plain functions assigned to `Schema<T>`) remain assignable. Schemas without an encoder fall back to direct `JSON.stringify` in
`serialize` — the v0.7.1 behavior is preserved for the ad-hoc case.

### 2. Every combinator gets a real encoder

| Constructor / combinator                                | Encoder behavior                                        |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `string`, `number`, `boolean`, `literal`, `null_`, etc. | Identity                                                |
| `object(shape)`                                         | Walks the shape, encodes each field with its encoder    |
| `array(item)`                                           | `value.map(item[_ENCODER])`                             |
| `optional(s)` / `nullable(s)`                           | Pass-through for `undefined` / `null`; else inner enc.  |
| `refine(p)(s)`                                          | Inherits `s[_ENCODER]` (refinement is value-preserving) |
| `transform(decode, encode)(s)`                          | `(b) => s[_ENCODER](encode(b))`                         |
| `transform(decode)(s)` (no `encodeFn`)                  | Throws at serialize time → `Failure` with clear message |
| `union(...schemas)`                                     | **First branch's encoder** (see "Limitations" below)    |

### 3. `serialize` walks the encoder chain

```typescript
export const serialize = <T>(schema: Schema<T>, value: T): Validation.Validation<Issue, string> => {
  try {
    const enc = schema[_ENCODER];
    const encoded = enc !== undefined ? enc(value) : (value as unknown);
    return Validation.Success(JSON.stringify(encoded));
  } catch (e) {
    return _fail('transform', 'serializable via schema', value, `serialize failed: ${(e as Error).message}`);
  }
};
```

Errors at any stage of encoding — a missing `encodeFn`, a throwing user encoder, a cyclic structure, `JSON.stringify` failing on a `BigInt` — are caught and surface as a `Failure` with a
`transform`-kind `Issue`.

### 4. Documentation (`docs/Schema.md`)

- Rewrote the `Transform` and `Serialization` sections to describe the new round-trip behavior and include a `Date` round-trip example.
- Added a new "Union encoding limitation" subsection with the discriminator-via-`transform` escape hatch.
- Updated the "What stays out of v1" list — the round-trip-aware serialize item is removed; a union encoding caveat replaces it.

### 5. Tests (`tests/Schema.test.ts`)

Added a new `describe('serialize / deserialize round-trip with encoders')` block with 10 tests covering:

- Round-trip of a `Date` via `transform(iso → Date, Date → iso)`
- Round-trip of a nested object with a transformed field
- Round-trip of an array of transformed values
- `serialize` failure when `transform` has no `encodeFn`, with assertion on the error message content
- Round-trip through `refine` (refinement preserves the inner encoder)
- `nullable` round-trip for both arms (`null` and value)
- `nullable` and `optional` with a transformed inner schema
- `union` first-branch encoding contract
- Ad-hoc `Schema<T>` (plain function) falling back to direct `JSON.stringify`

## Files Changed

| File                   | Change | Purpose                                                                       |
| ---------------------- | ------ | ----------------------------------------------------------------------------- |
| `src/Schema.ts`        | edit   | Type + every combinator now attach `[_ENCODER]`; `serialize` walks the chain  |
| `tests/Schema.test.ts` | edit   | 10 new round-trip tests; existing 44 tests unchanged and still passing        |
| `docs/Schema.md`       | edit   | Rewrote `Transform` / `Serialization` sections; documented `union` limitation |

## Commits

| Hash    | Message                                                |
| ------- | ------------------------------------------------------ |
| 4d2ade6 | feat(schema): wire transform encoder through serialize |

## Testing & Verification

All checks from [DefinitionOfDone.md](../llm-context/DefinitionOfDone.md) pass locally:

- [YES] `pnpm test` — 720/720 passing (was 710 before; +10 round-trip tests)
- [YES] Coverage — `Schema.ts` 100% statements / 100% funcs / 100% lines / 91.79% branches. The uncovered branches are the `[_ENCODER] === undefined` fallback paths inside the combinator encoders,
  reached only when an ad-hoc user-supplied function (no encoder attached) is composed inside a combinator. That path is exercised at the top level by the "ad-hoc Schema without an encoder" test;
  per-combinator coverage is not added because it is mechanical and already covered by the type contract.
- [YES] `pnpm build` — tsc + cjs gen succeeds
- [YES] `pnpm lint` — zero warnings

## Notes for Reviewers

### Behavior change: `transform` without `encodeFn`

Before this change, calling `serialize` on a schema like `pipe(string(), transform<string, Date>(s => new Date(s)))` (no encoder) would delegate to `JSON.stringify(dateValue)`, which **happens to
work** for `Date` because `Date.prototype.toJSON` exists. It would not have worked for `BigInt`, `Map`, or `Set`, but Date callers may have relied on the coincidence.

After this change, the same schema returns `Failure` with the message "Schema.transform: encodeFn is required for serialize; pass encodeFn to transform to enable round-tripping." Existing Date callers
should add the trivial `(d) => d.toISOString()` encoder.

This is the only user-visible behavior change. It's strictly more honest — the old behavior silently disagreed with the docstring claim that `transform`'s inverse "is preserved for round-trip-aware
serialization."

### Non-breaking type-level

`[_ENCODER]` is **optional** in `Schema<T>`. A user-supplied schema written as a plain function (no encoder attached) still type-checks as `Schema<T>` and still serializes via the pre-change fallback
(`JSON.stringify(value)` directly). No `Schema<T>` annotation anywhere needs to change.

### Why the Symbol stays private

`_ENCODER` is module-private. Users can attach encoders to ad-hoc schemas only by routing through the combinators (the intended path). A public `makeSchema(decode, encode)` constructor was considered
and rejected for v1 — the combinator surface covers every practical case, and exposing the Symbol would leak an implementation detail.

### Union encoding limitation

`union(...schemas)` decoding picks the first matching branch by trying each sub-schema's decoder. Encoding has no equivalent signal — at encode time the value has already been decoded into
`T = A | B | ...`, and we have no reliable, fast way to tell which branch it came from. v1 picks the first branch's encoder unconditionally. For unions whose branches transform divergently (e.g. one
branch is a `transform` to `Date` and the other is a plain `string`), users should wrap the union in a `transform(decode, encode)` that owns the discriminator. The trade-off is documented in
`docs/Schema.md`.

### What's still out

- **Branch-aware union encoding** — see above; user-driven via outer `transform`.
- **Async schemas** — still deferred to a future `SchemaAsync` over `EitherAsync`.
- **Built-in `email()` / `url()` / `uuid()`** — still one-liners over `regex`.

### Merge strategy

Single commit, single logical change. **Squash merge** or **merge commit** both work cleanly — preference is up to the merger.

### Changeset

A changeset entry is **not yet added**. Suggested classification: **minor**. Two arguments for minor (rather than patch):

1. Behavior change for transforms without `encodeFn` (a `Date`-using caller relying on the coincidence will now see `Failure` instead of a JSON string).
2. New capability: schemas with explicit encoders now round-trip cleanly, which is a user-visible feature, even though the API surface is unchanged.

If a changeset is wanted before merge, the entry should describe the new round-trip capability and call out the `Date`-without-encoder behavior change.
