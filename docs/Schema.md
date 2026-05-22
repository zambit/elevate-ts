# Schema Module: Declarative Parsers over Validation

## Why Schema?

`elevate-ts` already ships `Validation<E, A>` — an applicative functor that accumulates errors via `ap` and `sequence`. What was missing was a user-facing layer for declaring the shape of unknown
input (typically API responses, env config, or message payloads), parsing it, and getting back all the validation errors with paths into the nested structure.

`Schema` fills that gap. It is tree-shakable, function-based (not class-based), and composes with the existing `pipe` from [Function.ts](../src/Function.ts). The output of every schema is a
`Validation<Issue, T>` — the same substrate the rest of the library already uses.

The design is inspired by [valibot](https://valibot.dev), which made the case that schemas should be plain functions and pipelines should be data-last. We adopt that shape and back it with
`Validation`'s error accumulation.

## Quick Example

```typescript
import * as S from '@zambit/elevate-ts/Schema';
import { pipe } from '@zambit/elevate-ts/Function';

const User = S.object({
  name: pipe(S.string(), S.minLength(1)),
  age: pipe(
    S.number(),
    S.refine<number>((n) => n >= 0, 'must be non-negative')
  ),
  email: pipe(S.string(), S.regex(/^[^@]+@[^@]+$/)),
  tags: pipe(S.array(S.string()), S.maxLength(10))
});

type User = S.InferOutput<typeof User>;
//   { readonly name: string; readonly age: number; readonly email: string; readonly tags: readonly string[] }

const result = User(rawInput);
// Validation<Issue, User>
```

If validation fails on multiple fields, you get **all** of them back, each tagged with a path:

```typescript
const r = User({ name: '', age: -1, email: 'x@y', tags: [] });
// Failure([
//   { kind: 'refinement', path: ['name'], message: 'Expected length >= 1', ... },
//   { kind: 'refinement', path: ['age'],  message: 'must be non-negative',   ... },
// ])
```

## The `Issue` Shape

Every failure carries:

```typescript
type Issue = {
  readonly kind: 'type' | 'refinement' | 'transform';
  readonly expected: string; // e.g. "string", "length >= 3"
  readonly received: string; // typeof input or "null" / "array"
  readonly path: readonly (string | number)[];
  readonly message: string;
};
```

Object combinators prepend the field key to inner paths; array combinators prepend the index. So a failure inside `users[3].email` arrives as `path: ['users', 3, 'email']`.

## API Surface

### Primitives

| Function         | Output type                      |
| ---------------- | -------------------------------- |
| `string()`       | `Schema<string>`                 |
| `number()`       | `Schema<number>` (rejects `NaN`) |
| `boolean()`      | `Schema<boolean>`                |
| `literal(value)` | `Schema<typeof value>`           |
| `null_()`        | `Schema<null>`                   |
| `undefined_()`   | `Schema<undefined>`              |
| `unknown_()`     | `Schema<unknown>` (pass-through) |

### Combinators

| Function            | Behavior                                                    |
| ------------------- | ----------------------------------------------------------- |
| `object(shape)`     | Validates each field; accumulates errors across all keys    |
| `array(item)`       | Validates each index; accumulates errors with indexed paths |
| `union(...schemas)` | Returns first match; accumulates all errors if none match   |
| `optional(schema)`  | Accepts `undefined` OR the underlying schema                |
| `nullable(schema)`  | Accepts `null` OR the underlying schema                     |

### Refinements

Refinements are HOFs of shape `(args) => (schema: Schema<T>) => Schema<T>`, so they slot into `pipe`. v1 ships the three primitives that cover the 80% case; everything else can be built on top of
`refine` or `regex`.

| Function                        | Use                                                                       |
| ------------------------------- | ------------------------------------------------------------------------- |
| `refine<T>(predicate, message)` | Generic escape hatch — use for any custom rule                            |
| `minLength(n)`                  | Strings and arrays via `{ length: number }`                               |
| `maxLength(n)`                  | Strings and arrays via `{ length: number }`                               |
| `regex(pattern, message?)`      | Base for email, URL, UUID, phone — write these as one-liners over `regex` |

Example — derive `email()` in your app code:

```typescript
const email = (schema: S.Schema<string>): S.Schema<string> => S.regex(/^[^@]+@[^@]+\.[^@]+$/, 'must be a valid email')(schema);

const E = pipe(S.string(), email);
```

### Transform

```typescript
transform<A, B>(decodeFn: (a: A) => B, encodeFn?: (b: B) => A): (s: Schema<A>) => Schema<B>
```

Use `transform` to widen a schema's output beyond its input shape — for example, decoding an ISO string to a `Date`:

```typescript
const dateFromIso = pipe(
  S.string(),
  S.transform<string, Date>(
    (iso) => new Date(iso),
    (d) => d.toISOString() // optional inverse — see below
  )
);
```

The `encodeFn` argument is **optional**. v1's `serialize` delegates to `JSON.stringify` regardless, so providing an inverse does not yet affect serialization output. The signature is preserved so
future versions can use it for round-trip-aware serialization without breaking the API.

### Serialization

```typescript
serialize<T>(schema: Schema<T>, value: T): Validation<Issue, string>     // JSON.stringify
deserialize<T>(schema: Schema<T>, raw: string): Validation<Issue, T>     // JSON.parse → schema
```

For JSON-native types (`string`, `number`, `boolean`, plain objects, arrays), this round-trips cleanly:

```typescript
const ser = S.serialize(User, validUser);
if (ser.tag === 'Success') {
  const back = S.deserialize(User, ser.value);
  // Success(validUser)
}
```

For non-JSON-native types (`Date`, `Map`, `Set`, `BigInt`), you have two choices today:

1. Use `transform` to decode from a JSON-native form on the way in. Encoding on the way out is the caller's responsibility for now (e.g. call `.toISOString()` before `serialize`).
2. Wait for the v0.7 update that wires `transform`'s `encodeFn` into `serialize`.

### Type inference

```typescript
type T = S.InferOutput<typeof someSchema>;
```

Works for primitives, objects, arrays, unions, optional, nullable, and transformed schemas. Nested schemas infer recursively.

## Design Notes

### Why decode-only (not bidirectional codecs)?

A full codec library (io-ts style) carries an `encode` half on every combinator. That doubles the API surface and makes `union` and `transform` significantly harder — what's the inverse of "any of
these three schemas"? Valibot took the position that ~95% of consumers only decode, and we agreed.

Serialization for the common case (JSON-native values) is just `JSON.stringify`. For the rare exotic-type case, an opt-in `transform(decode, encode)` is a much smaller cost than threading an encoder
through every combinator.

See [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) for the longer write-up if/when this ships there.

### Why HOF refinements?

Refinements like `minLength` are written as `Schema<T> => Schema<T>` rather than as raw predicates. The HOF form runs at the schema layer, so it can produce richer `Issue` values (with
`kind: 'refinement'`) and downstream combinators can preserve path context properly. For one-off custom rules, the generic `refine(predicate, message)` helper hides the HOF wrapping.

### What stays out of v1

- **Async schemas** — defer to a future `SchemaAsync.ts` over `EitherAsync` if real demand appears.
- **Built-in `email()` / `url()` / `uuid()`** — one-liners over `regex`; ship in a follow-up if there's appetite.
- **Fantasy Land conformance** — `Schema<T>` is a function alias, not a typeclass instance. Nothing to expose.
- **Round-trip-aware `serialize`** — accepted as `transform(decode, encode?)` API surface but not yet plumbed through `serialize`.

## See Also

- [Validation.ts](../src/Validation.ts) — the substrate for error accumulation
- [Function.ts](../src/Function.ts) — `pipe` for composing refinements
- [elevate-ts-vs-purify-ts.md](elevate-ts-vs-purify-ts.md) — comparison with related libraries
