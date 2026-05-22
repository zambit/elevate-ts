---
'@zambit/elevate-ts': minor
---

# Schema Module

Add `Schema<T>` — declarative, tree-shakable parsers over `Validation<Issue, T>`.
Define the shape of unknown input (`object`, `array`, `union`, `optional`,
`nullable`), validate it with refinements (`refine`, `minLength`, `maxLength`,
`regex`), and get back all errors with paths into nested structures. Inspired
by valibot: function-based (no classes), data-last, composes with the existing
`pipe`. Includes `transform(decode, encode?)` for one-way (and forward-
compatible two-way) value mapping, plus `serialize` / `deserialize` helpers for
the common JSON-native path. Decode-only by design — see `docs/Schema.md` for
the rationale and the v1 surface.
