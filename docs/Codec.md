# Codec Module: Ready-Made Schemas with Both Halves Wired

## Why Codec?

`Schema` gives you primitives, combinators, refinements, and `transform(decode, encode)`. With `transform`'s encoder wired through `serialize` in v0.7.1, schemas with non-JSON-native value types
(`Date`, `BigInt`, `URL`, `Set`, `Uint8Array`) round-trip cleanly — but rebuilding the same `transform(decode, encode)` boilerplate at every call site is busywork.

`Codec` ships ready-made schemas for the predictable cases. Every codec is a thin composition over the existing `Schema` combinators — no new mechanism, no new types, no dependency growth. Pure
tree-shaking: import only the codecs you use.

```typescript
import { date, bigint, url } from '@zambit/elevate-ts/Codec';
import { object, string, serialize, deserialize } from '@zambit/elevate-ts/Schema';
import { pipe } from '@zambit/elevate-ts/Function';

const Event = object({
  name: string(),
  scheduledAt: date(),
  ticketId: bigint(),
  homepage: url()
});

// Round-trips cleanly through serialize/deserialize.
```

## API Surface

| Function        | Wire form              | Decoded type     |
| --------------- | ---------------------- | ---------------- |
| `date()`        | ISO-8601 string        | `Date`           |
| `bigint()`      | base-10 integer string | `bigint`         |
| `url()`         | string                 | `URL`            |
| `set(item)`     | array                  | `ReadonlySet<T>` |
| `base64Bytes()` | base64 string          | `Uint8Array`     |

## Per-codec notes

### `date()`

Decodes any string `new Date(s)` can parse and refines to reject `Invalid Date`. Encodes via `d.toISOString()`. This means decode is permissive (accepts most date-ish strings) but round-trip is
strictly ISO-8601.

```typescript
date()('2026-05-22T00:00:00.000Z');
// Success(Date(2026-05-22T00:00:00.000Z))

date()('not-a-date');
// Failure([{ kind: 'refinement', message: 'Expected a valid ISO-8601 date string', ... }])
```

### `bigint()`

JSON cannot carry `bigint` natively. The on-wire form is a decimal string. The decoder pre-validates with `/^-?\d+$/` so the underlying `BigInt(s)` call never throws.

```typescript
bigint()('12345678901234567890');
// Success(12345678901234567890n)

bigint()('3.14'); // Failure — bigint() does not accept floats
bigint()('abc'); // Failure — non-numeric
```

If you need decimal numbers larger than `Number.MAX_SAFE_INTEGER`, use `bigint()`, not `number()` (which rounds).

### `url()`

Validates via `URL.canParse` before constructing, so `new URL(s)` never throws. Encodes via `u.toString()`, which normalizes the input (trailing slashes, percent-encoding). For exact-byte
round-tripping, store the raw string separately and parse on demand.

```typescript
url()('https://example.com/path?q=1');
// Success(URL { host: 'example.com', ... })
```

`URL.canParse` is available in Cloudflare Workers, Node 19+, and all modern browsers. If you target older runtimes, this codec will fail at decode time.

### `set(item)`

`Set<T>` has no JSON representation; the on-wire form is an array. `set(item)` composes over `array(item)` and adds the `Array ↔ Set` step. The inner schema's encoder runs over each element first, so
`set(date())` round-trips Dates correctly.

```typescript
const Tags = set(string());
Tags(['a', 'b', 'b', 'c']);
// Success(Set { 'a', 'b', 'c' })   — duplicates collapse
```

Duplicates in the on-wire array collapse to a single Set entry. That is `new Set(array)` semantics; if duplicates are a validation error in your domain, add a `refine` over `array(item)` before
passing to `set`.

### `base64Bytes()`

Base64-encoded string ↔ `Uint8Array`. Useful for transporting binary payloads through JSON (Workers KV/R2 blobs, signed-blob payloads, image bytes for an API).

```typescript
base64Bytes()('aGVsbG8=');
// Success(Uint8Array [104, 101, 108, 108, 111])   // 'hello'
```

Validates the base64 alphabet (`A-Z`, `a-z`, `0-9`, `+`, `/`) and length-mod-4 before calling `atob`. Strings outside the alphabet or with the wrong padding are rejected with a refinement issue.

This codec uses standard base64, not URL-safe base64. If you need URL-safe encoding, transform the wire string before decoding.

## What stays out

- **`uuid()`, `email()`, `url()` validations as `string` refinements** — these are already one-liners over `regex` or `refine`. Use `Schema.regex(...)` or write a project-local helper.
- **`map(value)`** — needs a `record(value)` combinator in `Schema` first (currently only `object(shape)` with static keys exists). Land that and `map` is a natural follow-up.
- **`bigint(radix)`** — base-10 is overwhelmingly the common case. If hex/binary serialization is needed, add `bigintHex()` later.
- **URL-safe base64** — single-purpose codec for a niche format; ship if asked.
- **`temporal` (Temporal API)** — wait until Temporal lands in stable Workers + Node + browsers.

## Implementation notes

Every codec is a pure composition of `Schema` primitives. There is no new mechanism, no new type, no module-level state. The full source is short enough that you can read it as documentation if a
behavior is unclear: [src/Codec.ts](../src/Codec.ts).

## See Also

- [Schema.md](Schema.md) — the underlying schema toolkit
- [src/Codec.ts](../src/Codec.ts) — short, readable source
