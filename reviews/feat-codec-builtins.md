# Review: feat/codec-builtins

**Branch:** feat/codec-builtins **Date:** 2026-06-06 **Status:** Ready for review

**Depends on:** `fix/schema-encoder` (this branch is built on top of it; rebase onto `main` after `fix/schema-encoder` is merged).

## What Was Implemented

A new sibling namespace `Codec` that ships ready-made schemas for the predictable non-JSON-native types. Every codec is a pure composition over the existing `Schema` combinators — no new mechanism, no
new types, no new runtime state. With `transform`'s encoder wired through `serialize` in `fix/schema-encoder`, these round-trip cleanly.

### 1. `src/Codec.ts` — five codecs

| Codec           | Wire form              | Decoded type     |
| --------------- | ---------------------- | ---------------- |
| `date()`        | ISO-8601 string        | `Date`           |
| `bigint()`      | base-10 integer string | `bigint`         |
| `url()`         | string                 | `URL`            |
| `set(item)`     | array                  | `ReadonlySet<T>` |
| `base64Bytes()` | base64 string          | `Uint8Array`     |

Each codec uses only `string()`, `array()`, `refine()`, and `transform()` from the existing Schema API. The pattern is:

1. Start from a JSON-native primitive (usually `string()` or `array()`).
2. `refine` to validate the wire form before the underlying parser is invoked — so `new Date`, `BigInt`, `new URL`, `atob` never throw.
3. `transform(decode, encode)` to lift to the domain type and back.

For `date()`, the refinement runs **after** the transform (because `new Date` returns `Invalid Date` for unparsable input rather than throwing). For `bigint`, `url`, and `base64Bytes`, the refinement
runs **before** the transform (because the underlying constructors throw on bad input).

### 2. `tests/Codec.test.ts` — 25 tests

Every codec is covered for:

- Valid decode (Success + type identity)
- Invalid decode (Failure with correct `kind` and message)
- Non-string input (where applicable; rejected with `kind: 'type'`)
- Full `serialize` → `deserialize` round-trip

Codec-specific edge cases:

- `bigint`: floats rejected, empty string rejected, value larger than `Number.MAX_SAFE_INTEGER` round-trips byte-for-byte
- `url`: invalid URLs rejected; `u.toString()` normalization noted
- `set`: dedupe semantics locked in; round-trip of `Set<Date>` (compositional encoding); inner-item errors accumulate
- `base64Bytes`: empty string decodes to empty `Uint8Array`; arbitrary bytes (0–255) round-trip; wrong-length-mod-4 rejected

### 3. Wiring

- `src/index.ts` — added `export * as Codec from './Codec.js'`
- `package.json` — added `./Codec` entry to the `exports` field, mirroring every other public namespace

### 4. Documentation (`docs/Codec.md`)

User-facing guide:

- Why Codec exists (vs. inlining `transform`)
- API table + per-codec notes with examples
- Per-codec gotchas (`URL.canParse` availability, base64 alphabet, dedupe semantics)
- "What stays out" section (uuid/email/url as `string` refinements, `map(value)` waiting on `record(value)`, URL-safe base64, Temporal)
- Pointer to `src/Codec.ts` as readable source

## Files Changed

| File                  | Change | Purpose                                                 |
| --------------------- | ------ | ------------------------------------------------------- |
| `src/Codec.ts`        | new    | Five built-in codecs                                    |
| `tests/Codec.test.ts` | new    | 25 unit tests, 100% statement/func/line/branch coverage |
| `docs/Codec.md`       | new    | User-facing API guide                                   |
| `src/index.ts`        | edit   | One-line export of the new namespace                    |
| `package.json`        | edit   | One entry added to the `exports` field                  |

## Commits

| Hash    | Message                                                                 |
| ------- | ----------------------------------------------------------------------- |
| _(TBD)_ | feat(codec): add built-in codecs for Date, BigInt, URL, Set, Uint8Array |

## Testing & Verification

- [YES] `pnpm test` — 745/745 passing (was 720 on the parent branch; +25 Codec tests)
- [YES] Coverage — `Codec.ts` 100% across the board
- [YES] `pnpm build` — succeeds
- [YES] `pnpm lint` — clean

## Notes for Reviewers

### Why these five

These are the cases where JSON's native types fail closed and a developer is left to either roll their own `transform` or stringify-by-hand. Other candidates that were considered and deliberately
deferred:

- **`uuid()`, `email()`** — already trivial via `regex` + `refine`. Adding them as codecs would suggest there's a domain transform involved when there isn't.
- **`map(value)`** — would need a `record(value)` combinator added to `Schema` first (currently only `object(shape)` with statically-known keys exists). That's a Schema PR, not a Codec PR.
- **URL-safe base64** — single-purpose niche format; ship if a user asks.
- **`temporal`** — wait for Temporal API stability across Workers + Node + browsers.

### Tree-shaking story

Codec is its own sibling namespace with its own `./Codec` entry in `package.json`. Users who never import from `@zambit/elevate-ts/Codec` pay zero bytes for it. Within the module, every codec is a
separate named export, so a user importing only `date` does not pull `base64Bytes` into their bundle either.

This was the explicit reason for putting these in a new module rather than folding them into `Schema.ts` — it keeps `Schema.ts` focused on the mechanism (primitives + combinators) and `Codec.ts`
focused on the convenience layer.

### Worker compatibility

All five codecs use only:

- `new Date`, `Date.prototype.toISOString`, `Date.prototype.getTime`, `Number.isNaN`
- `BigInt`, `BigInt.prototype.toString`
- `new URL`, `URL.canParse` (Workers, Node 19+, modern browsers), `URL.prototype.toString`
- `Array.prototype`, `new Set`, spread/iteration
- `atob`, `btoa`, `Uint8Array`, `String.fromCharCode`, `String.prototype.charCodeAt`

All are available unmodified in Cloudflare Workers. No Node built-ins, no `Buffer`. Verified against the project's `check:nodeps` posture (zero runtime dependencies, zero Node imports).

### Rebase plan

Built on `fix/schema-encoder`. After `fix/schema-encoder` is merged into `main`:

```bash
git checkout feat/codec-builtins
git fetch origin
git rebase origin/main
git push -f origin feat/codec-builtins  # or open PR pre-rebase and rebase via GitHub UI
```

The two PRs are conceptually distinct (encoder wiring vs. ready-made codecs), and either can be reviewed independently of the other. The Codec PR will not compile against `main` until the encoder PR
lands, because `serialize` round-trips depend on `transform`'s `encodeFn` being plumbed through.

### Changeset

A changeset entry is **not yet added**. Suggested classification: **minor** — purely additive new namespace, no breaking changes.
