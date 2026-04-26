# elevate-ts

[![Coverage](https://img.shields.io/badge/coverage-77%25-brightgreen)](./coverage/index.html) [![npm](https://img.shields.io/badge/npm-0.1.2-lightgrey)](https://npmjs.com/package/@zambit/elevate-ts)
[![License: AGPL%20v3%2B](https://img.shields.io/badge/license-AGPL%20v3%2B-green.svg)](https://github.com/zambit/elevate-ts/blob/main/LICENSE)

Point-free, data-last functional programming for TypeScript. Fantasy Land 5 compliant. Zero dependencies. Cloudflare Workers ready.

## Install

```bash
pnpm add @zambit/elevate-ts
```

## Quick Start

```typescript
import { pipe } from '@zambit/elevate-ts/Function';
import { Just, Nothing, map, chain } from '@zambit/elevate-ts/Maybe';

/** Create a Just value */
const ma = Just(5);

/** Use pipe to compose operations */
const result = pipe(
  ma,
  map((a) => a * 2),
  chain((b) => (b > 5 ? Just(b) : Nothing))
);

// result is Just(10)
```

## Modules

| Module       | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| Maybe        | Optional values; Functor, Applicative, Monad, Alt, Filter                 |
| Either       | Values with a Left error branch; Bifunctor, Monad, Alt                    |
| Validation   | Functor for collecting all errors during applicative (not short-circuit)  |
| Reader       | Dependency injection / environment access; Monad                          |
| State        | Pure stateful computation; track state through a sequence of operations   |
| Tuple        | Immutable 2-tuple; Bifunctor, Monoid                                      |
| NonEmptyList | Guaranteed-nonempty array; Functor, Applicative, Monad, Monoid            |
| List         | Utilities over plain readonly arrays; map, filter, partition, zip, etc.   |
| Function     | Function composition and utilities; pipe, flow, curry, memoize, once, tap |
| MaybeAsync   | Lazy async Maybe; rejects or throws become Nothing; never rejects         |
| EitherAsync  | Lazy async Either; rejects become Left; never throws                      |

## Quick API Reference

Browse the [complete API reference →](./docs/API.md) for all functions and types.

### Maybe

```typescript
Just(value) | Nothing
map(f) | chain(f) | getOrElse(default)
fromNullable(a) | filter(predicate) | fold(onNothing, onJust)
```

### Either

```typescript
Left(error) | Right(value)
map(f) | mapLeft(f) | bimap(f, g) | chain(f)
getOrElse(default) | fold(onLeft, onRight)
fromPredicate(p, onFalse) | tryCatch(f, onError)
```

### Validation

```typescript
Failure(errors) | Success(value);
ap(vf) | chain(f) | fold(onFailure, onSuccess);
fromEither(ea) | sequence(validations);
```

### Reader

```typescript
Reader(run) | ask() | asks(f) | local(f);
map(f) | chain(f) | runReader(env);
```

### State

```typescript
State(run) | get() | put(s) | modify(f) | gets(f);
map(f) | chain(f);
runState(s) | evalState(s) | execState(s);
```

### Tuple

```typescript
Tuple(fst, snd);
fst | snd | mapFst(f) | mapSnd(f) | bimap(f, g) | swap();
fanout(f, g);
```

### NonEmptyList

```typescript
fromArray(arr) | fromArrayUnsafe(arr);
head(nel) | tail(nel) | last(nel) | init(nel);
map(f) | chain(f) | concat(nel2);
```

### List

```typescript
head(arr) | tail(arr) | take(n) | drop(n);
partition(p) | groupBy(eq) | sortBy(ord);
zip(arr2) | zipWith(f) | flatten();
```

### Function

```typescript
identity | constant(a) | flip(f)
pipe(a, f1, f2, ...) | flow(f1, f2, ...)
curry2(f) | curry3(f) | curry4(f)
memoize(f) | once(f) | tap(f)
```

### MaybeAsync

```typescript
MaybeAsync(run) | liftMaybe(ma)
of(value) | nothing()
map(f) | chain(f) | getOrElse(default)
fromPromise(p) | tryCatch(f)
fold(onNothing, onJust) | toEitherAsync(onNothing)
```

### EitherAsync

```typescript
EitherAsync(run) | liftEither(ea)
of(value) | right(value) | left(error)
map(f) | mapLeft(f) | chain(f)
getOrElse(default) | fold(onLeft, onRight)
fromPromise(p, onError) | tryCatch(f, onError)
toMaybeAsync(ea)
```

## Philosophy

- **Point-free**: Functions are composed by shape, not by naming intermediate values
- **Data-last**: Configuration arguments precede the data being transformed
- **Pure**: No classes, no mutations, ≤15 lines per function
- **Cloudflare Workers**: No Node.js built-ins, no DOM APIs
- **Fantasy Land 5**: All applicable types implement the spec
- **Zero runtime dependencies**: Ship only pure TypeScript

## Quick API Reference

Browse the [complete API reference →](./docs/API.md) for all functions and types.

### Maybe

```typescript
Just(value) | Nothing
map(f) | chain(f) | getOrElse(default)
fromNullable(a) | filter(predicate) | fold(onNothing, onJust)
```

### Either

```typescript
Left(error) | Right(value)
map(f) | mapLeft(f) | bimap(f, g) | chain(f)
getOrElse(default) | fold(onLeft, onRight)
fromPredicate(p, onFalse) | tryCatch(f, onError)
```

### Validation

```typescript
Failure(errors) | Success(value);
ap(vf) | chain(f) | fold(onFailure, onSuccess);
fromEither(ea) | sequence(validations);
```

### Reader

```typescript
Reader(run) | ask() | asks(f) | local(f);
map(f) | chain(f) | runReader(env);
```

### State

```typescript
State(run) | get() | put(s) | modify(f) | gets(f);
map(f) | chain(f);
runState(s) | evalState(s) | execState(s);
```

### Tuple

```typescript
Tuple(fst, snd);
fst | snd | mapFst(f) | mapSnd(f) | bimap(f, g) | swap();
fanout(f, g);
```

### NonEmptyList

```typescript
fromArray(arr) | fromArrayUnsafe(arr);
head(nel) | tail(nel) | last(nel) | init(nel);
map(f) | chain(f) | concat(nel2);
```

### List

```typescript
head(arr) | tail(arr) | take(n) | drop(n);
partition(p) | groupBy(eq) | sortBy(ord);
zip(arr2) | zipWith(f) | flatten();
```

### Function

```typescript
identity | constant(a) | flip(f)
pipe(a, f1, f2, ...) | flow(f1, f2, ...)
curry2(f) | curry3(f) | curry4(f)
memoize(f) | once(f) | tap(f)
```

### MaybeAsync

```typescript
MaybeAsync(run) | liftMaybe(ma)
of(value) | nothing()
map(f) | chain(f) | getOrElse(default)
fromPromise(p) | tryCatch(f)
fold(onNothing, onJust) | toEitherAsync(onNothing)
```

### EitherAsync

```typescript
EitherAsync(run) | liftEither(ea)
of(value) | right(value) | left(error)
map(f) | mapLeft(f) | chain(f)
getOrElse(default) | fold(onLeft, onRight)
fromPromise(p, onError) | tryCatch(f, onError)
toMaybeAsync(ea)
```

## Philosophy

- **Point-free**: Functions are composed by shape, not by naming intermediate values
- **Data-last**: Configuration arguments precede the data being transformed
- **Pure**: No classes, no mutations, ≤15 lines per function
- **Cloudflare Workers**: No Node.js built-ins, no DOM APIs
- **Fantasy Land 5**: All applicable types implement the spec
- **Zero runtime dependencies**: Ship only pure TypeScript

## Learning & Examples

- **[elevate-ts-learning](https://github.com/zambit/elevate-ts-learning)** - Comprehensive tutorial with interactive todo app and 4 learning guides
- **[elevate-ts-samples](https://github.com/zambit/elevate-ts-samples)** - Production-ready examples (form validation, state management, list operations, workers)

## Roadmap

- Audit subsystem with time-travel replay (will use `@paralleldrive/cuid2` for operation-level ID stamping)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to contribute. Non-trivial contributions must be covered by the applicable contributor license agreement:
[CLA-INDIVIDUAL.md](./CLA-INDIVIDUAL.md) or [CLA-CORPORATE.md](./CLA-CORPORATE.md).

## License

Dual-licensed:

- Public license: GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`). See [LICENSE](./LICENSE).
- Commercial license: available from Zambit for customers who want to use `elevate-ts` in closed-source products or services. See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).
