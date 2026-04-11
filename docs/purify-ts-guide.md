# Pure Functional Programming with purify-ts

A practical guide to using [purify-ts](https://gigobyte.github.io/purify/) for pure functional programming in TypeScript.

## Installation

```bash
pnpm add purify-ts
```

## Core Types

purify-ts provides Haskell-inspired algebraic data types that eliminate `null`, `undefined`, and thrown exceptions from your code.

### Maybe — nullable values without null

`Maybe<A>` represents a value that may or may not exist. Use it instead of `T | null | undefined`.

```typescript
import { Maybe, Just, Nothing } from 'purify-ts/Maybe.js';

const findUser = (id: number): Maybe<string> => (id > 0 ? Just(`user-${id}`) : Nothing);

const greeting = findUser(42)
  .map((name) => `Hello, ${name}`)
  .getOrElse('User not found');

// greeting === 'Hello, user-42'
```

### Either — errors without exceptions

`Either<L, R>` represents a computation that can fail. `Left` holds the error, `Right` holds success.

```typescript
import { Either, Left, Right } from 'purify-ts/Either.js';

const parseAge = (raw: string): Either<string, number> => {
  const n = Number(raw);
  return isNaN(n) ? Left('Not a number') : Right(n);
};

const result = parseAge('25')
  .chain((age) => (age >= 0 ? Right(age) : Left('Age must be non-negative')))
  .map((age) => `Age: ${age}`)
  .getOrElse('Invalid input');

// result === 'Age: 25'
```

### EitherAsync — async operations that can fail

`EitherAsync<L, R>` is the async counterpart to `Either`. No try/catch needed.

```typescript
import { EitherAsync } from 'purify-ts/EitherAsync.js';
import { Left, Right } from 'purify-ts/Either.js';

const fetchUser = (id: number): EitherAsync<string, { name: string }> =>
  EitherAsync(async ({ liftEither, fromPromise }) => {
    const validated = await liftEither(id > 0 ? Right(id) : Left('Invalid id'));
    return fromPromise(
      fetch(`/api/users/${validated}`)
        .then((r) => r.json())
        .catch(() => Promise.reject('Network error'))
    );
  });

const result = await fetchUser(1).run();
// result is Either<string, { name: string }>
```

### MaybeAsync — async nullable values

```typescript
import { MaybeAsync } from 'purify-ts/MaybeAsync.js';
import { Just, Nothing } from 'purify-ts/Maybe.js';

const findSession = (token: string): MaybeAsync<string> =>
  MaybeAsync(async ({ liftMaybe }) => {
    const cached = sessionCache.get(token);
    return liftMaybe(cached ? Just(cached) : Nothing);
  });
```

## Composition Patterns

### Chaining with `chain`

`chain` (aka `flatMap`) sequences operations that each return a `Maybe` or `Either`.

```typescript
import { Maybe } from 'purify-ts/Maybe.js';

const getCity = (userId: number): Maybe<string> =>
  findUser(userId)
    .chain((user) => findProfile(user.id))
    .chain((profile) => findAddress(profile.addressId))
    .map((address) => address.city);
```

### Combining multiple Maybes with `sequence`

```typescript
import { Maybe } from 'purify-ts/Maybe.js';

const buildConfig = (host: Maybe<string>, port: Maybe<number>): Maybe<{ host: string; port: number }> => Maybe.sequence([host, port] as const).map(([h, p]) => ({ host: h, port: p }));
```

### Pattern matching with `caseOf`

```typescript
import { Either } from 'purify-ts/Either.js';

const formatResult = (result: Either<string, number>): string =>
  result.caseOf({
    Left: (err) => `Error: ${err}`,
    Right: (val) => `Value: ${val}`
  });
```

## Codec — runtime type validation

`Codec` provides safe parsing and encoding of external data (API responses, user input, etc.).

```typescript
import { Codec, string, number, array, GetType } from 'purify-ts/Codec.js';

const UserCodec = Codec.interface({
  id: number,
  name: string,
  tags: array(string)
});

type User = GetType<typeof UserCodec>;

const parseUser = (raw: unknown): Either<string, User> => UserCodec.decode(raw);

const user = parseUser({ id: 1, name: 'Alice', tags: ['admin'] });
// Right({ id: 1, name: 'Alice', tags: ['admin'] })

const bad = parseUser({ id: 'oops' });
// Left("Property 'id': expected number, got string")
```

## NonEmptyList — safe non-empty arrays

```typescript
import { NonEmptyList } from 'purify-ts/NonEmptyList.js';
import { Maybe } from 'purify-ts/Maybe.js';

const safeHead = <A>(xs: A[]): Maybe<A> => NonEmptyList.fromArray(xs).map((nel) => nel[0]);

const first = safeHead([1, 2, 3]); // Just(1)
const empty = safeHead([]); // Nothing
```

## Practical Example — a full pipeline

Composing `Codec`, `EitherAsync`, and `Maybe` for a real-world fetch-and-transform flow.

```typescript
import { Codec, string, number, GetType } from 'purify-ts/Codec.js';
import { EitherAsync } from 'purify-ts/EitherAsync.js';

const ProductCodec = Codec.interface({ id: number, name: string, price: number });
type Product = GetType<typeof ProductCodec>;

const fetchProduct = (id: number): EitherAsync<string, Product> =>
  EitherAsync(async ({ fromPromise, liftEither }) => {
    const raw = await fromPromise(fetch(`/api/products/${id}`).then((r) => r.json()));
    return liftEither(ProductCodec.decode(raw));
  });

const formatPrice = (product: Product): string => `${product.name}: $${product.price.toFixed(2)}`;

const getFormattedPrice = (id: number): EitherAsync<string, string> => fetchProduct(id).map(formatPrice);
```

## Key Principles

- Use `Maybe` instead of `null` / `undefined` checks.
- Use `Either` instead of `try`/`catch` for expected failure cases.
- Use `Codec` to validate all data crossing trust boundaries (API, user input).
- Use `chain` to sequence dependent operations without nesting.
- Use `caseOf` for exhaustive pattern matching — the compiler enforces completeness.

## Further Reading

- [purify-ts documentation](https://gigobyte.github.io/purify/)
- [API reference](https://gigobyte.github.io/purify/adts/Maybe)
