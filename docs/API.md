# elevate-ts API Reference

<!-- markdownlint-disable MD024 -->

Complete API documentation for all elevate-ts modules. Each module is exported with a namespace prefix (e.g., `Maybe.Just`, `Either.Right`) to avoid naming conflicts across monads.

---

## Maybe — Optional Values

Optional value container: present (`Just<A>`) or absent (`Nothing`).

### Types

- **`Maybe<A>`** — Union type: `Just<A> | Nothing`
- **`Just<A>`** — Represents a value
- **`Nothing`** — Represents absence

### Constructors & Guards

- **`Just(value: A): Just<A>`** — Create a Just value
- **`Nothing`** — The Nothing singleton
- **`isJust(ma: Maybe<A>): boolean`** — Test if Just
- **`isNothing(ma: Maybe<A>): boolean`** — Test if Nothing

### Conversion

- **`fromNullable(a: A | null | undefined): Maybe<A>`** — Lift nullable value
- **`fromPredicate(predicate: (a: A) => boolean): (a: A) => Maybe<A>`** — Construct based on predicate
- **`toNullable(ma: Maybe<A>): A | null`** — Extract value or null
- **`toArray(ma: Maybe<A>): readonly A[]`** — Convert to 0 or 1 element array
- **`toEither(onNothing: L): (ma: Maybe<A>) => Either<L, A>`** — Convert to Either

### Functor & Monad Operations

- **`map(f: (a: A) => B): (ma: Maybe<A>) => Maybe<B>`** — Functor map
- **`chain(f: (a: A) => Maybe<B>): (ma: Maybe<A>) => Maybe<B>`** — Monadic bind
- **`chainNullable(f: (a: A) => B | null | undefined): (ma: Maybe<A>) => Maybe<B>`** — Chain with nullable result
- **`ap(mf: Maybe<(a: A) => B>): (ma: Maybe<A>) => Maybe<B>`** — Applicative apply

### Alternatives & Filtering

- **`alt(malt: Maybe<A>): (ma: Maybe<A>) => Maybe<A>`** — Provide alternative if Nothing
- **`altL(f: () => Maybe<A>): (ma: Maybe<A>) => Maybe<A>`** — Lazy alternative
- **`filter(predicate: (a: A) => boolean): (ma: Maybe<A>) => Maybe<A>`** — Keep if predicate holds

### Extraction & Analysis

- **`getOrElse(a: A): (ma: Maybe<A>) => A`** — Extract value or default
- **`getOrElseL(f: (void) => A): (ma: Maybe<A>) => A`** — Extract or compute lazily
- **`fold(onNothing: B, onJust: (a: A) => B): (ma: Maybe<A>) => B`** — Case analysis

### Array Operations

- **`catMaybes(maybes: readonly Maybe<A>[]): readonly A[]`** — Collect Just values
- **`mapMaybe(f: (a: A) => Maybe<B>): (as: readonly A[]) => readonly B[]`** — Map then collect
- **`sequence(maybes: readonly Maybe<A>[]): Maybe<readonly A[]>`** — Sequence all-or-Nothing
- **`traverse(f: (a: A) => Maybe<B>): (as: readonly A[]) => Maybe<readonly B[]>`** — Traverse a sequence

---

## Either — Values with Error Branch

Result type with error (`Left<L>`) or success (`Right<R>`) branch. Does not throw; use for recoverable errors.

### Types

- **`Either<L, R>`** — Union type: `Left<L> | Right<R>`
- **`Left<L>`** — Represents an error
- **`Right<R>`** — Represents a success

### Constructors & Guards

- **`Left(left: L): Left<L>`** — Create a Left
- **`Right(right: R): Right<R>`** — Create a Right
- **`isLeft(ea: Either<L, R>): boolean`** — Test if Left
- **`isRight(ea: Either<L, R>): boolean`** — Test if Right

### Conversion

- **`fromNullable(onNull: L): (value: R | null | undefined) => Either<L, R>`** — Lift nullable value
- **`fromPredicate(predicate: (a: A) => boolean, onFalse: (a: A) => L): (a: A) => Either<L, A>`** — Construct based on predicate
- **`toMaybe(ea: Either<L, R>): Maybe<R>`** — Convert to Maybe, discarding Left
- **`toNullable(ea: Either<L, R>): R | null`** — Extract Right or null
- **`tryCatch(f: () => R, onError: (e: unknown) => L): Either<L, R>`** — Wrap throwing function

### Functor & Monad Operations

- **`map(f: (a: A) => B): (ea: Either<L, A>) => Either<L, B>`** — Functor map over Right
- **`mapLeft(f: (l: L) => L2): (ea: Either<L, R>) => Either<L2, R>`** — Map over Left
- **`bimap(f: (l: L) => L2, g: (a: A) => B): (ea: Either<L, A>) => Either<L2, B>`** — Bifunctor map
- **`chain(f: (a: A) => Either<L, B>): (ea: Either<L, A>) => Either<L, B>`** — Monadic bind
- **`chainLeft(f: (l: L) => Either<L2, R>): (ea: Either<L, R>) => Either<L2, R>`** — Chain over Left
- **`ap(ef: Either<L, (a: A) => B>): (ea: Either<L, A>) => Either<L, B>`** — Applicative apply

### Extraction & Analysis

- **`getOrElse(r: R): (ea: Either<L, R>) => R`** — Extract Right or default
- **`getOrElseL(f: (l: L) => R): (ea: Either<L, R>) => R`** — Extract Right or compute from Left
- **`fold(onLeft: (l: L) => B, onRight: (r: R) => B): (ea: Either<L, R>) => B`** — Case analysis
- **`swap(ea: Either<L, R>): Either<R, L>`** — Swap Left and Right

### Array Operations

- **`partitionEithers(eithers: readonly Either<L, R>[]): readonly [L[], R[]]`** — Partition into Lefts and Rights
- **`lefts(eithers: readonly Either<L, R>[]): readonly L[]`** — Extract all Lefts
- **`rights(eithers: readonly Either<L, R>[]): readonly R[]`** — Extract all Rights
- **`sequence(eithers: readonly Either<L, R>[]): Either<L, readonly R[]>`** — Sequence all-or-Left
- **`traverse(f: (a: A) => Either<L, B>): (as: readonly A[]) => Either<L, readonly B[]>`** — Traverse a sequence

---

## Validation — Error Accumulation

Like Either, but applicative functor accumulates errors (not short-circuit like Monad).

### Types

- **`Validation<E, A>`** — Union type: `Failure<E> | Success<A>`
- **`Failure<E>`** — Represents one or more accumulated errors
- **`Success<A>`** — Represents a success

### Constructors & Guards

- **`Failure(errors: readonly E[]): Failure<E>`** — Create a Failure with errors
- **`Success(value: A): Success<A>`** — Create a Success
- **`isFailure(va: Validation<E, A>): boolean`** — Test if Failure
- **`isSuccess(va: Validation<E, A>): boolean`** — Test if Success

### Conversion

- **`fromEither(ea: Either<E, A>): Validation<E, A>`** — Lift an Either
- **`toEither(va: Validation<E, A>): Either<readonly E[], A>`** — Convert to Either with errors array
- **`fromPredicate(predicate: (a: A) => boolean, onFalse: (a: A) => E): (a: A) => Validation<E, A>`** — Construct based on predicate

### Functor & Applicative Operations

- **`map(f: (a: A) => B): (va: Validation<E, A>) => Validation<E, B>`** — Functor map
- **`ap(vf: Validation<E, (a: A) => B>): (va: Validation<E, A>) => Validation<E, B>`** — Applicative apply (accumulates errors)
- **`chain(f: (a: A) => Validation<E, B>): (va: Validation<E, A>) => Validation<E, B>`** — Monadic bind (short-circuits)

### Extraction & Analysis

- **`getOrElse(a: A): (va: Validation<E, A>) => A`** — Extract success or default
- **`fold(onFailure: (es: readonly E[]) => B, onSuccess: (a: A) => B): (va: Validation<E, A>) => B`** — Case analysis

### Error Handling

- **`concat(va2: Validation<E, A>): (va: Validation<E, A>) => Validation<E, A>`** — Merge two Validations; concatenate errors if both fail

### Array Operations

- **`sequence(validations: readonly Validation<E, A>[]): Validation<E, readonly A[]>`** — Sequence all; accumulate all errors
- **`traverse(f: (a: A) => Validation<E, B>): (as: readonly A[]) => Validation<E, readonly B[]>`** — Traverse; accumulate all errors

---

## Reader — Dependency Injection

Deferred computation with environment access: `(env: R) => A`.

### Types

- **`Reader<R, A>`** — Represents a function awaiting environment

### Constructors

- **`Reader(run: (env: R) => A): Reader<R, A>`** — Create a Reader from a function
- **`ask(): Reader<R, R>`** — Retrieve the environment as a value
- **`asks(f: (env: R) => A): Reader<R, A>`** — Retrieve and transform the environment

### Operations

- **`local(f: (env: R) => R): (reader: Reader<R, A>) => Reader<R, A>`** — Modify environment for a sub-computation
- **`map(f: (a: A) => B): (reader: Reader<R, A>) => Reader<R, B>`** — Functor map
- **`chain(f: (a: A) => Reader<R, B>): (reader: Reader<R, A>) => Reader<R, B>`** — Monadic bind
- **`ap(rf: Reader<R, (a: A) => B>): (reader: Reader<R, A>) => Reader<R, B>`** — Applicative apply

### Execution

- **`runReader(env: R): (reader: Reader<R, A>) => A`** — Execute a Reader with an environment

---

## State — Stateful Computation

Pure stateful computation: `(state: S) => [value: A, nextState: S]`.

### Types

- **`State<S, A>`** — Represents a stateful computation

### Constructors

- **`State(run: (state: S) => readonly [A, S]): State<S, A>`** — Create a State from a function
- **`get(): State<S, S>`** — Retrieve the current state as a value
- **`put(state: S): State<S, void>`** — Replace the state
- **`modify(f: (state: S) => S): State<S, void>`** — Transform the state
- **`gets(f: (state: S) => A): State<S, A>`** — Retrieve and transform the state

### Operations

- **`map(f: (a: A) => B): (state: State<S, A>) => State<S, B>`** — Functor map
- **`chain(f: (a: A) => State<S, B>): (state: State<S, A>) => State<S, B>`** — Monadic bind
- **`ap(sf: State<S, (a: A) => B>): (state: State<S, A>) => State<S, B>`** — Applicative apply

### Execution

- **`runState(state: S): (computation: State<S, A>) => readonly [A, S]`** — Execute a State computation
- **`evalState(state: S): (computation: State<S, A>) => A`** — Execute and extract only the value
- **`execState(state: S): (computation: State<S, A>) => S`** — Execute and extract only the final state

---

## Tuple — Immutable 2-Tuple

Pair of values with bifunctor operations.

### Types

- **`Tuple<A, B>`** — Immutable 2-tuple

### Constructors

- **`Tuple(fst: A, snd: B): Tuple<A, B>`** — Create a Tuple
- **`fromArray(arr: readonly [A, B]): Tuple<A, B>`** — Construct from a 2-element array

### Accessors

- **`fst(tuple: Tuple<A, B>): A`** — Extract the first component
- **`snd(tuple: Tuple<A, B>): B`** — Extract the second component
- **`toArray(tuple: Tuple<A, B>): readonly [A, B]`** — Convert to a 2-element array

### Operations

- **`mapFst(f: (a: A) => A2): (tuple: Tuple<A, B>) => Tuple<A2, B>`** — Map over the first component
- **`mapSnd(f: (b: B) => B2): (tuple: Tuple<A, B>) => Tuple<A, B2>`** — Map over the second component
- **`bimap(f: (a: A) => A2, g: (b: B) => B2): (tuple: Tuple<A, B>) => Tuple<A2, B2>`** — Bifunctor map
- **`swap(tuple: Tuple<A, B>): Tuple<B, A>`** — Swap the components
- **`fanout(f: (a: A) => B, g: (a: A) => C): (a: A) => Tuple<B, C>`** — Apply two functions to same input

---

## NonEmptyList — Guaranteed-Nonempty Array

Array guaranteed to have at least one element. Branded type for safety.

### Types

- **`NonEmptyList<A>`** — Branded nonempty array type

### Constructors

- **`fromArray(arr: readonly A[]): Maybe<NonEmptyList<A>>`** — Safely lift an array (returns Nothing if empty)
- **`fromArrayUnsafe(arr: readonly A[]): NonEmptyList<A>`** — Unsafely cast an array (no check)

### Conversion

- **`toArray(nel: NonEmptyList<A>): readonly A[]`** — Convert back to plain array

### Accessors

- **`head(nel: NonEmptyList<A>): A`** — Get the first element (guaranteed to exist)
- **`tail(nel: NonEmptyList<A>): readonly A[]`** — Get all elements after the first
- **`last(nel: NonEmptyList<A>): A`** — Get the last element
- **`init(nel: NonEmptyList<A>): readonly A[]`** — Get all elements except the last

### Operations

- **`map(f: (a: A) => B): (nel: NonEmptyList<A>) => NonEmptyList<B>`** — Functor map
- **`chain(f: (a: A) => NonEmptyList<B>): (nel: NonEmptyList<A>) => NonEmptyList<B>`** — Monadic bind
- **`ap(nf: NonEmptyList<(a: A) => B>): (nel: NonEmptyList<A>) => NonEmptyList<B>`** — Applicative apply
- **`concat(nel2: NonEmptyList<A>): (nel: NonEmptyList<A>) => NonEmptyList<A>`** — Concatenate two nonempty lists

### Aggregation

- **`min(ord: (a: A, b: A) => number): (nel: NonEmptyList<A>) => A`** — Find minimum element
- **`max(ord: (a: A, b: A) => number): (nel: NonEmptyList<A>) => A`** — Find maximum element

---

## List — Array Utilities

Pure functional array operations.

### Basics

- **`head(arr: readonly A[]): A | undefined`** — Get the first element
- **`tail(arr: readonly A[]): readonly A[]`** — Get all but the first element
- **`last(arr: readonly A[]): A | undefined`** — Get the last element
- **`init(arr: readonly A[]): readonly A[]`** — Get all but the last element
- **`uncons(arr: readonly A[]): [A, readonly A[]] | undefined`** — Deconstruct into head and tail
- **`cons(a: A): (arr: readonly A[]) => readonly A[]`** — Prepend an element
- **`snoc(a: A): (arr: readonly A[]) => readonly A[]`** — Append an element

### Slicing & Filtering

- **`take(n: number): (arr: readonly A[]) => readonly A[]`** — Take first n elements
- **`drop(n: number): (arr: readonly A[]) => readonly A[]`** — Drop first n elements
- **`takeWhile(predicate: (a: A) => boolean): (arr: readonly A[]) => readonly A[]`** — Take while predicate holds
- **`dropWhile(predicate: (a: A) => boolean): (arr: readonly A[]) => readonly A[]`** — Drop while predicate holds
- **`partition(predicate: (a: A) => boolean): (arr: readonly A[]) => [readonly A[], readonly A[]]`** — Partition into two arrays
- **`span(predicate: (a: A) => boolean): (arr: readonly A[]) => [readonly A[], readonly A[]]`** — Split at first failure

### Grouping & Sorting

- **`groupBy(eq: (a: A, b: A) => boolean): (arr: readonly A[]) => readonly (readonly A[])[]`** — Group consecutive equal elements
- **`nubBy(eq: (a: A, b: A) => boolean): (arr: readonly A[]) => readonly A[]`** — Remove consecutive duplicates
- **`sortBy(ord: (a: A, b: A) => number): (arr: readonly A[]) => readonly A[]`** — Sort with comparator function

### Zipping & Transposing

- **`zip(arr2: readonly B[]): (arr: readonly A[]) => readonly [A, B][]`** — Zip two arrays into pairs
- **`zipWith(f: (a: A, b: B) => C): (arr2: readonly B[]) => (arr: readonly A[]) => readonly C[]`** — Zip with function
- **`unzip(pairs: readonly [A, B][]): [readonly A[], readonly B[]]`** — Unzip array of pairs
- **`transpose(matrix: readonly (readonly A[])[]): readonly (readonly A[])[]`** — Transpose a matrix

### Transformation

- **`flatten(arr: readonly (readonly A[])[]): readonly A[]`** — Flatten one level
- **`intersperse(sep: A): (arr: readonly A[]) => readonly A[]`** — Insert separator between elements

---

## Function — Function Utilities

Functional composition and utility functions.

### Identity & Constants

- **`identity(a: A): A`** — Identity function
- **`constant(a: A): () => A`** — Always return the same value
- **`absurd(_: never): never`** — Function that takes a never value

### Composition & Piping

- **`pipe(a: A, f1: (a: A) => B, f2: (b: B) => C, ...): Z`** — Pipe left-to-right (supports arities 1-10)
- **`flow(f1: (a: A) => B, f2: (b: B) => C, ...): (a: A) => Z`** — Compose left-to-right (supports arities 1-10)

### Argument Manipulation

- **`flip(f: (a: A, b: B) => C): (b: B, a: A) => C`** — Flip first two arguments
- **`curry2(f: (a: A, b: B) => C): (a: A) => (b: B) => C`** — Curry a 2-argument function
- **`curry3(f: (a: A, b: B, c: C) => D): (a: A) => (b: B) => (c: C) => D`** — Curry a 3-argument function
- **`curry4(f: (a: A, b: B, c: C, d: D) => E): (a: A) => (b: B) => (c: C) => (d: D) => E`** — Curry a 4-argument function

### Memoization & Side Effects

- **`memoize(f: (a: A) => B): (a: A) => B`** — Memoize with single-level cache
- **`once(f: () => A): () => A`** — Execute at most once; cache the result
- **`tap(f: (a: A) => void): (a: A) => A`** — Execute side effect and pass value through

---

## MaybeAsync — Lazy Async Maybe

Optional value wrapped in a lazy Promise. Any rejection becomes `Nothing`; never rejects.

### Types

- **`MaybeAsync<A>`** — Lazy wrapper around `Promise<Maybe<A>>`

### Constructors

- **`MaybeAsync(run: () => Promise<Maybe<A>>): MaybeAsync<A>`** — Create from a lazy computation
- **`liftMaybe(ma: Maybe<A>): MaybeAsync<A>`** — Lift a synchronous Maybe
- **`of(value: A): MaybeAsync<A>`** — Lift a pure value as Just
- **`nothing(): MaybeAsync<A>`** — Lift Nothing

### Promise Lifting

- **`fromPromise(p: Promise<A>): MaybeAsync<A>`** — Lift a Promise (rejects become Nothing)
- **`tryCatch(f: () => Promise<A>): MaybeAsync<A>`** — Wrap an async function (throws/rejects become Nothing)

### Functor & Monad Operations

- **`map(f: (a: A) => B): (ma: MaybeAsync<A>) => MaybeAsync<B>`** — Functor map
- **`chain(f: (a: A) => MaybeAsync<B>): (ma: MaybeAsync<A>) => MaybeAsync<B>`** — Monadic bind
- **`ap(mf: MaybeAsync<(a: A) => B>): (ma: MaybeAsync<A>) => MaybeAsync<B>`** — Applicative apply

### Alternatives & Filtering

- **`alt(alt_ma: MaybeAsync<A>): (ma: MaybeAsync<A>) => MaybeAsync<A>`** — Provide alternative if Nothing
- **`filter(predicate: (a: A) => boolean): (ma: MaybeAsync<A>) => MaybeAsync<A>`** — Keep if predicate holds

### Extraction & Analysis

- **`getOrElse(a: A): (ma: MaybeAsync<A>) => Promise<A>`** — Extract value or default
- **`getOrElseL(f: () => Promise<A>): (ma: MaybeAsync<A>) => Promise<A>`** — Extract or compute lazily
- **`fold(onNothing: B, onJust: (a: A) => Promise<B>): (ma: MaybeAsync<A>) => Promise<B>`** — Case analysis

### Conversion

- **`toEitherAsync(onNothing: E): (ma: MaybeAsync<A>) => EitherAsync<E, A>`** — Convert to EitherAsync

### Array Operations

- **`catMaybes(maybes: readonly MaybeAsync<A>[]): Promise<readonly A[]>`** — Collect Just values
- **`all(maybes: readonly MaybeAsync<A>[]): MaybeAsync<readonly A[]>`** — All-or-Nothing

### Execution

- **`run(): Promise<Maybe<A>>`** — Execute a MaybeAsync (property on the type)

---

## EitherAsync — Lazy Async Either

Result with error branch wrapped in a lazy Promise. Rejections become `Left`; never rejects.

### Types

- **`EitherAsync<L, R>`** — Lazy wrapper around `Promise<Either<L, R>>`

### Constructors

- **`EitherAsync(run: () => Promise<Either<L, R>>): EitherAsync<L, R>`** — Create from a lazy computation
- **`liftEither(ea: Either<L, R>): EitherAsync<L, R>`** — Lift a synchronous Either
- **`of(value: R): EitherAsync<never, R>`** — Lift a pure Right value
- **`right(value: R): EitherAsync<never, R>`** — Lift a pure Right value (explicit)
- **`left(error: L): EitherAsync<L, never>`** — Lift a pure Left error

### Promise Lifting

- **`fromPromise(p: Promise<R>, onError: (e: unknown) => L): EitherAsync<L, R>`** — Lift a Promise
- **`tryCatch(f: () => Promise<R>, onError: (e: unknown) => L): EitherAsync<L, R>`** — Wrap an async function

### Functor & Monad Operations

- **`map(f: (a: A) => B): (ea: EitherAsync<L, A>) => EitherAsync<L, B>`** — Functor map over Right
- **`mapLeft(f: (l: L) => L2): (ea: EitherAsync<L, R>) => EitherAsync<L2, R>`** — Map over Left
- **`bimap(f: (l: L) => L2, g: (a: A) => B): (ea: EitherAsync<L, A>) => EitherAsync<L2, B>`** — Bifunctor map
- **`chain(f: (a: A) => EitherAsync<L, B>): (ea: EitherAsync<L, A>) => EitherAsync<L, B>`** — Monadic bind
- **`chainLeft(f: (l: L) => EitherAsync<L2, R>): (ea: EitherAsync<L, R>) => EitherAsync<L2, R>`** — Chain over Left
- **`ap(ef: EitherAsync<L, (a: A) => B>): (ea: EitherAsync<L, A>) => EitherAsync<L, B>`** — Applicative apply

### Extraction & Analysis

- **`getOrElse(r: R): (ea: EitherAsync<L, R>) => Promise<R>`** — Extract Right or default
- **`getOrElseL(f: (l: L) => Promise<R>): (ea: EitherAsync<L, R>) => Promise<R>`** — Extract Right or compute from Left
- **`fold(onLeft: (l: L) => Promise<B>, onRight: (r: R) => Promise<B>): (ea: EitherAsync<L, R>) => Promise<B>`** — Case analysis
- **`swap(ea: EitherAsync<L, R>): EitherAsync<R, L>`** — Swap Left and Right

### Conversion

- **`toMaybeAsync(ea: EitherAsync<L, R>): MaybeAsync<R>`** — Convert to MaybeAsync, discarding Left

### Array Operations

- **`all(eas: readonly EitherAsync<L, R>[]): EitherAsync<L, readonly R[]>`** — All-or-Left with first error
- **`lefts(eas: readonly EitherAsync<L, R>[]): Promise<readonly L[]>`** — Extract all Lefts
- **`rights(eas: readonly EitherAsync<L, R>[]): Promise<readonly R[]>`** — Extract all Rights

### Execution

- **`run(): Promise<Either<L, R>>`** — Execute an EitherAsync (property on the type)

---

## ReaderEitherAsync — Lazy Async Either with Dependency Injection

Composes `Reader<R, A>` with `EitherAsync<L, A>`: a lazy `(env: R) => Promise<Either<L, A>>`. Use it for asynchronous, failable computations that need a threaded environment (clients, config,
loggers). Equivalent in role to fp-ts `ReaderTaskEither`.

### Types

- **`ReaderEitherAsync<R, L, A>`** — Lazy wrapper around `(env: R) => Promise<Either<L, A>>`

### Constructors

- **`ReaderEitherAsync(run: (env: R) => Promise<Either<L, A>>): ReaderEitherAsync<R, L, A>`** — Raw constructor
- **`of(value: A): ReaderEitherAsync<unknown, never, A>`** — Lift a pure Right, ignoring env
- **`right(value: A): ReaderEitherAsync<unknown, never, A>`** — Alias for `of`
- **`left(error: L): ReaderEitherAsync<unknown, L, never>`** — Lift a pure Left, ignoring env

### Lifts

- **`liftEither(ea: Either<L, A>): ReaderEitherAsync<unknown, L, A>`** — Lift a sync Either
- **`liftEitherAsync(ea: EitherAsync<L, A>): ReaderEitherAsync<unknown, L, A>`** — Lift an EitherAsync
- **`liftReader(r: Reader<R, A>): ReaderEitherAsync<R, never, A>`** — Lift a Reader as a Right

### Promise Lifting

- **`fromPromise(f: (env: R) => Promise<A>, onError: (e: unknown) => L): ReaderEitherAsync<R, L, A>`** — Env-aware Promise lift
- **`tryCatch(f: (env: R) => Promise<A>, onError: (e: unknown) => L): ReaderEitherAsync<R, L, A>`** — Env-aware async wrapper that catches sync throws too

### Reader Operations

- **`ask<R>(): ReaderEitherAsync<R, never, R>`** — Get the env as a Right
- **`asks(f: (env: R) => A): ReaderEitherAsync<R, never, A>`** — Sync-transform the env
- **`asksEither(f: (env: R) => Either<L, A>): ReaderEitherAsync<R, L, A>`** — Sync env → Either
- **`asksEitherAsync(f: (env: R) => EitherAsync<L, A>): ReaderEitherAsync<R, L, A>`** — Env → EitherAsync
- **`local(f: (env: R) => R): (rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L, A>`** — Modify env for a sub-computation
- **`provide(env: R): (rea: ReaderEitherAsync<R, L, A>) => EitherAsync<L, A>`** — Apply the env, collapsing to EitherAsync

### Functor / Bifunctor / Monad

- **`map(f: (a: A) => B): (rea) => ReaderEitherAsync<R, L, B>`** — Functor map over Right
- **`mapLeft(f: (l: L) => L2): (rea) => ReaderEitherAsync<R, L2, A>`** — Map over Left
- **`bimap(f, g): (rea) => ReaderEitherAsync<R, L2, B>`** — Bifunctor map
- **`chain(f: (a: A) => ReaderEitherAsync<R, L, B>): (rea) => ReaderEitherAsync<R, L, B>`** — Monadic bind
- **`chainLeft(f: (l: L) => ReaderEitherAsync<R, L2, A>): (rea) => ReaderEitherAsync<R, L2, A>`** — Chain over Left (recovery)
- **`ap(ref: ReaderEitherAsync<R, L, (a: A) => B>): (rea) => ReaderEitherAsync<R, L, B>`** — Applicative apply

### Extraction & Analysis

- **`runReaderEitherAsync(env: R): (rea: ReaderEitherAsync<R, L, A>) => Promise<Either<L, A>>`** — Primary runner
- **`getOrElse(default: A): (rea) => (env: R) => Promise<A>`** — Extract Right or default
- **`fold(onLeft, onRight): (rea) => (env: R) => Promise<B>`** — Case analysis

### Array Operations

- **`all(reas: readonly ReaderEitherAsync<R, L, A>[]): ReaderEitherAsync<R, L, readonly A[]>`** — All-or-Left, runs in parallel sharing the env

### Execution

- **`run(env: R): Promise<Either<L, A>>`** — Execute with the supplied env (property on the type)

---

## CancellableEitherAsync — Lazy Async Either with Cooperative Cancellation

Extends `EitherAsync` with a third terminal state, `Cancelled`, and threads an optional `AbortSignal` through `run()`. Use it for timeouts, races, and request flows that must abandon work cleanly.
Sibling to `EitherAsync`; existing `EitherAsync` users are unaffected. See [CANCELLABLE_DESIGN.md](./CANCELLABLE_DESIGN.md) for the design rationale and deferred v2 follow-ups.

### Types

- **`CancellableEitherAsync<L, R>`** — Lazy wrapper around `(signal?: AbortSignal) => Promise<CancellableResult<L, R>>`
- **`Cancelled`** — Third terminal state: `{ tag: 'Cancelled'; reason: unknown }`
- **`CancellableResult<L, R>`** — `Either<L, R> | Cancelled`

### Constructors & Guards

- **`CancellableEitherAsync(run: (signal?: AbortSignal) => Promise<CancellableResult<L, R>>): CancellableEitherAsync<L, R>`** — Raw constructor
- **`Cancelled(reason: unknown): Cancelled`** — Construct a Cancelled terminal with a reason
- **`of(value: R): CancellableEitherAsync<never, R>`** — Lift a pure Right
- **`right(value: R): CancellableEitherAsync<never, R>`** — Alias for `of`
- **`left(error: L): CancellableEitherAsync<L, never>`** — Lift a pure Left
- **`cancelled(reason: unknown): CancellableEitherAsync<never, never>`** — Lift a pure Cancelled terminal
- **`isCancelled(r: CancellableResult<L, R>): r is Cancelled`** — Type guard

### Lifts

- **`liftEither(e: Either<L, R>): CancellableEitherAsync<L, R>`** — Lift a sync Either
- **`fromEitherAsync(ea: EitherAsync<L, R>): CancellableEitherAsync<L, R>`** — Lift an EitherAsync; signal is ignored, this stage cannot self-cancel
- **`toEitherAsync(cea: CancellableEitherAsync<L, R>, onCancel: (reason: unknown) => L): EitherAsync<L, R>`** — Collapse `Cancelled` into `Left` via `onCancel`

### Promise Lifting

- **`fromPromise(p: Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R>`** — Lift a Promise; rejections become `Left`
- **`fromAbortable(f: (signal: AbortSignal) => Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R>`** — **Primary cancellation lift.** `AbortError` rejections become `Cancelled`;
  other rejections become `Left` via `onError`; pre-aborted signals short-circuit before invocation
- **`tryCatch(f: () => Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R>`** — Wrap a non-signal-aware async function; the wrapper still short-circuits to `Cancelled` if the signal
  is aborted at entry or after resolve

### Functor / Bifunctor / Monad / Applicative

All combinators propagate `Cancelled` unchanged unless explicitly noted.

- **`map(f: (a: A) => B): (cea) => CancellableEitherAsync<L, B>`** — Map over Right
- **`mapLeft(f: (l: L) => L2): (cea) => CancellableEitherAsync<L2, R>`** — Map over Left
- **`bimap(f, g): (cea) => CancellableEitherAsync<L2, B>`** — Map over both
- **`chain(f: (a: A) => CancellableEitherAsync<L, B>): (cea) => CancellableEitherAsync<L, B>`** — Monadic bind; signal is threaded into the downstream stage
- **`chainLeft(f: (l: L) => CancellableEitherAsync<L2, R>): (cea) => CancellableEitherAsync<L2, R>`** — Recover from `Left`. **Does NOT recover from `Cancelled`** — by design, so abandoned work is not
  silently re-run
- **`chainCancelled(f: (reason: unknown) => CancellableEitherAsync<L, R>): (cea) => CancellableEitherAsync<L, R>`** — Recover from `Cancelled`; `Right` and `Left` pass through untouched
- **`ap(cef: CancellableEitherAsync<L, (a: A) => B>): (cea) => CancellableEitherAsync<L, B>`** — Applicative apply

### Cancellation Operations

- **`withTimeout(ms: number): (cea) => CancellableEitherAsync<L, R>`** — Cancel after `ms` milliseconds. Composes an internal timeout controller with the external signal via `AbortSignal.any`.
  Timeouts surface as `Cancelled` with reason `Error('timeout after Nms')`. Use `chainCancelled` to convert to a typed `Left` if wanted
- **`race(ceas: readonly CancellableEitherAsync<L, R>[]): CancellableEitherAsync<L, R>`** — First to settle wins; losers' linked signals are aborted so downstream I/O can short-circuit. Empty input →
  `Cancelled('race called with empty array')`
- **`onCancel(handler: (reason: unknown) => void): (cea) => CancellableEitherAsync<L, R>`** — Cleanup hook. Fires whenever this stage produces `Cancelled`, **including upstream propagation** (matches
  Effect-TS / fp-ts semantics). A throwing handler is silently caught — `run()` never re-throws

### Extraction & Analysis

- **`fold(onLeft, onRight, onCancelled): (cea) => (signal?: AbortSignal) => Promise<B>`** — Three-arm case analysis; the signal is forwarded to the wrapped computation

### Array Operations

- **`all(ceas: readonly CancellableEitherAsync<L, R>[]): CancellableEitherAsync<L, readonly R[]>`** — All-or-first-non-Right, runs in parallel under a shared signal. First `Left` or `Cancelled` aborts
  the shared controller so any in-flight sibling I/O can short-circuit

### Execution

- **`run(signal?: AbortSignal): Promise<CancellableResult<L, R>>`** — Execute with an optional signal (property on the type). Upholds the never-rejects contract: `AbortError` → `Cancelled`, any other
  thrown/rejected value → `Left(onError(e))`, never re-throws

---

## HTTP — CloudFlare Workers & Web Fetch API Helpers

Utilities for building HTTP handlers with Either/EitherAsync, managing environment variables via Reader, and mapping domain errors to HTTP status codes.

### Types

- **`SyncHTTPHandler`** — `(req: Request) => Response`
- **`HTTPHandler`** — `(req: Request) => Promise<Response>`
- **`StatusMap<E>`** — `Partial<Record<E, number>> & { readonly default: number }`

### Response Building

- **`jsonResponse(status: number): (body: unknown) => Response`** — Create a JSON response with Content-Type header

### JSON Parsing

- **`parseJSON<T>(raw: string | null): Either<string, T>`** — Safe JSON parsing (null → Left, parse error → Left)

### Environment Access via Reader

- **`askEnv(key: string): Reader<Record<string, string | undefined>, Maybe<string>>`** — Read optional env variable
- **`requireEnv(key: string): Reader<Record<string, string | undefined>, Either<string, string>>`** — Read required env variable

### Status Code Mapping

- **`withStatusCode<E extends string>(codes: StatusMap<E>): (error: E) => number`** — Map domain errors to HTTP status codes (with fallback to `default`)

### Handler Wrappers

- **`handleEither<E, A>(onLeft: (err: E) => Response, onRight: (val: A) => Response): (fn: (req: Request) => Either<E, A>) => SyncHTTPHandler`** — Wrap a synchronous Either-returning handler
- **`handleEitherAsync<E, A>(onLeft: (err: E) => Response, onRight: (val: A) => Response): (fn: (req: Request) => EitherAsync<E, A>) => HTTPHandler`** — Wrap an asynchronous EitherAsync-returning
  handler

### Example: Complete Worker Handler

```typescript
import { HTTP, EitherAsync, Reader, Function } from '@zambit/elevate-ts';

type DomainError = 'not-found' | 'unauthorized' | 'invalid-input';

const statusMap = HTTP.withStatusCode<DomainError>({
  'not-found': 404,
  unauthorized: 401,
  'invalid-input': 400,
  default: 500
});

const handler = HTTP.handleEitherAsync(
  (err) => HTTP.jsonResponse(statusMap(err))({ error: err }),
  (result) => HTTP.jsonResponse(201)(result)
)(processRequest);

export default {
  fetch: handler
};
```
