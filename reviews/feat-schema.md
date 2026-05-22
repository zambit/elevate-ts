# Review: feat/schema

**Branch:** feat/schema **Date:** 2026-05-22 **Status:** Ready for review

## What Was Implemented

### 1. Schema Module (`src/Schema.ts`, `tests/Schema.test.ts`)

A new declarative parser layer over the existing `Validation<E, A>` substrate. Consumers can now declare the shape of unknown input — typically API responses, env config, or message payloads — parse
it in one call, and get back **every** validation error with a path into the nested structure. The shape is inspired by [valibot](https://valibot.dev): function-based (no classes), data-last,
tree-shakable, and composes with the existing `pipe` from `Function.ts`.

**Surface (v1):**

- **Primitives** — `string()`, `number()`, `boolean()`, `literal(value)`, `null_()`, `undefined_()`, `unknown_()`
- **Combinators** — `object(shape)`, `array(item)`, `union(...schemas)`, `optional(schema)`, `nullable(schema)`
- **Refinements (HOF: `Schema<T> => Schema<T>`)** — `refine(predicate, message)`, `minLength(n)`, `maxLength(n)`, `regex(pattern, message?)`
- **Transform** — `transform(decodeFn, encodeFn?)` — encode half is optional and preserved on the returned schema for a future round-trip-aware `serialize`
- **Serialization** — `serialize(schema, value)` / `deserialize(schema, raw)`, delegating to `JSON.stringify` / `JSON.parse` for the v1 common path
- **Inference** — `InferOutput<typeof schema>`

**Errors carry a `path`:**

```typescript
const r = User({ name: '', age: -1, email: 'x@y' });
// Failure([
//   { kind: 'refinement', path: ['name'], message: 'Expected length >= 1', ... },
//   { kind: 'refinement', path: ['age'],  message: 'must be non-negative',   ... },
// ])
```

Nested combinators prepend keys/indices, so a failure inside `users[3].email` arrives as `path: ['users', 3, 'email']`.

### 2. Documentation (`docs/Schema.md`)

Long-form guide covering the API surface, the `Issue` shape, examples for building derived refinements (e.g. `email()` over `regex()`), the serialization story, and the design rationale — including
why decode-only beat bidirectional codecs for v1 and why refinements are written as HOFs.

### 3. Wiring

- `src/index.ts` — added `export * as Schema from './Schema.js'`
- `package.json` — added `./Schema` entry to the `exports` field, mirroring every other public module

### 4. Changeset

`.changeset/feat-schema.md` — `@zambit/elevate-ts: minor`. Captures the user-visible addition for the next release.

## Files Changed

| File                        | Change | Purpose                                                                |
| --------------------------- | ------ | ---------------------------------------------------------------------- |
| `src/Schema.ts`             | new    | Types + primitives + combinators + refinements + transform + serialize |
| `tests/Schema.test.ts`      | new    | 44 unit tests, 100% statement/func/line coverage; 99% branch           |
| `docs/Schema.md`            | new    | User-facing API guide and design rationale                             |
| `.changeset/feat-schema.md` | new    | Minor version bump for the next release                                |
| `src/index.ts`              | edit   | One-line export of the new namespace                                   |
| `package.json`              | edit   | One entry added to the `exports` field                                 |

## Commits

| Hash    | Message                                         |
| ------- | ----------------------------------------------- |
| ba36538 | feat: add Schema module for declarative parsers |

## Testing & Verification

All checks from [DefinitionOfDone.md](../llm-context/DefinitionOfDone.md) pass locally:

- [YES] `pnpm test` — 710/710 passing (full suite, not just Schema)
- [YES] `pnpm test:coverage` — Schema.ts at 100% statements / 100% funcs / 100% lines / 99% branches
- [YES] `pnpm check:types` — zero type errors
- [YES] `pnpm lint:check` — zero warnings
- [YES] `pnpm build` — tsc + cjs gen succeeds
- [YES] `pnpm check:exports` — 17/17 exports verified against `dist/`
- [YES] `pnpm check:nodeps` — Cloudflare Workers compatibility clean
- [YES] `pnpm lint:md` — markdown lint clean
- [YES] Commit GPG-signed

## Notes for Reviewers

### Why decode-only

A bidirectional codec API (`Codec<I, A>` with `decode` and `encode`) doubles the surface of every combinator and makes `union` / `transform` significantly harder. We took the valibot position: ~95% of
consumers only need decode, so ship that cleanly and treat serialization as a separate concern. The common case (JSON-native values) is just `JSON.stringify`; the exotic case (`Date`, `Map`, `Set`,
`BigInt`) is opt-in via `transform(decode, encode)` — and the `encode` half is accepted today but not yet plumbed into `serialize`. The signature is preserved so a future v0.7 can wire it through
without an API break.

### Why HOF refinements

Refinements like `minLength` are written as `Schema<T> => Schema<T>` rather than raw predicates. The HOF form runs at the schema layer, so it can produce `Issue` values with `kind: 'refinement'` and
downstream combinators preserve path context properly. The generic `refine(pred, msg)` helper hides the HOF wrapping for one-off custom rules.

### What's deliberately out of v1

- **Async schemas** — defer to a future `SchemaAsync.ts` over `EitherAsync` if real demand appears
- **Built-in `email()` / `url()` / `uuid()`** — one-liners over `regex`; ship in a follow-up if there's appetite
- **Fantasy Land conformance** — `Schema<T>` is a function alias, not a typeclass instance; nothing to expose
- **Round-trip-aware `serialize`** — accepted as `transform(decode, encode?)` API surface but not yet plumbed through `serialize`

### Merge strategy

Single commit, single logical addition. **Squash merge** or **merge commit** both work cleanly — preference is up to the merger.
