---
'@zambit/elevate-ts': minor
---

# Codec Module and Schema Round-Trip Encoding

Add `Codec` — ready-made schemas for common types that JSON cannot represent natively, built purely from the existing `Schema` combinators. Each codec decodes the on-wire form into a typed value and
encodes it back, so values round-trip through `serialize` / `deserialize`:

- `date()` — ISO-8601 string ↔ `Date` (rejects invalid dates)
- `bigint()` — base-10 integer string ↔ `bigint` (pre-validated, so `BigInt()` never throws)
- `url()` — string ↔ `URL`
- `set(item)` — array ↔ `ReadonlySet<T>`
- `base64Bytes()` — base64 string ↔ `Uint8Array`

Available as the `Codec` namespace from the package root and as the `@zambit/elevate-ts/Codec` subpath export. See `docs/Codec.md`.

`Schema.serialize` now runs the encoder supplied to `transform(decode, encode)`. In 0.7.0 the encoder was accepted but ignored. Schemas built from the module's combinators carry their encoder, so
`serialize` converts typed values back to their JSON-native shape. User-defined schemas written as plain functions are still assignable to `Schema<T>` and serialize unchanged. If you previously
passed an `encode` argument to `transform`, `serialize` output now reflects it.
