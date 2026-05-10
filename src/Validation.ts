// Validation — Accumulating Errors

/** Represents a Failure with accumulated errors. */
export type Failure<E> = { readonly tag: 'Failure'; readonly errors: readonly E[] };

/** Represents a Success value. */
export type Success<A> = { readonly tag: 'Success'; readonly value: A };

/** Validation type: Failure<E> (errors) or Success<A> (value). */
export type Validation<E, A> = Failure<E> | Success<A>;

// Either types for interop
type Left<L> = { readonly tag: 'Left'; readonly left: L };
type Right<R> = { readonly tag: 'Right'; readonly right: R };
type Either<L, R> = Left<L> | Right<R>;

/** Create a Failure with one or more errors. */
export const Failure = <E>(errors: readonly E[]): Failure<E> => ({
  tag: 'Failure',
  errors
});

/** Create a Success value. */
export const Success = <A>(value: A): Success<A> => ({
  tag: 'Success',
  value
});

/** Test if a Validation is Failure. */
export const isFailure = <E, A>(va: Validation<E, A>): va is Failure<E> => va.tag === 'Failure';

/** Test if a Validation is Success. */
export const isSuccess = <E, A>(va: Validation<E, A>): va is Success<A> => va.tag === 'Success';

/** Lift an Either into Validation. */
export const fromEither = <E, A>(ea: Either<E, A>): Validation<E, A> => (ea.tag === 'Left' ? Failure([ea.left]) : Success(ea.right));

/** Convert Validation to Either with errors array. */
export const toEither = <E, A>(va: Validation<E, A>): Either<readonly E[], A> => (va.tag === 'Failure' ? { tag: 'Left' as const, left: va.errors } : { tag: 'Right' as const, right: va.value });

/** Construct Success if predicate holds, Failure otherwise. */
export const fromPredicate =
  <E, A>(predicate: (a: A) => boolean, onFalse: (a: A) => E): ((a: A) => Validation<E, A>) =>
  (a) =>
    predicate(a) ? Success(a) : Failure([onFalse(a)]);

/** Functor map over Success. */
export const map =
  <E, A, B>(f: (a: A) => B): ((va: Validation<E, A>) => Validation<E, B>) =>
  (va) =>
    va.tag === 'Success' ? Success(f(va.value)) : va;

/** Applicative ap: accumulates errors when both are Failures. */
export const ap =
  <E, A, B>(vf: Validation<E, (a: A) => B>): ((va: Validation<E, A>) => Validation<E, B>) =>
  (va) => {
    if (vf.tag === 'Failure' && va.tag === 'Failure') {
      return Failure([...vf.errors, ...va.errors]);
    }
    if (vf.tag === 'Failure') return vf;
    if (va.tag === 'Failure') return va;
    return Success(vf.value(va.value));
  };

/** Monadic bind (short-circuits on first Failure). */
export const chain =
  <E, A, B>(f: (a: A) => Validation<E, B>): ((va: Validation<E, A>) => Validation<E, B>) =>
  (va) =>
    va.tag === 'Failure' ? va : f(va.value);

/** Extract Success or default. */
export const getOrElse =
  <E, A>(a: A): ((va: Validation<E, A>) => A) =>
  (va) =>
    va.tag === 'Success' ? va.value : a;

/** Case analysis. */
export const fold =
  <E, A, B>(onFailure: (errors: readonly E[]) => B, onSuccess: (a: A) => B): ((va: Validation<E, A>) => B) =>
  (va) =>
    va.tag === 'Failure' ? onFailure(va.errors) : onSuccess(va.value);

/** Merge two Validations; if both are Failure, concatenate errors. */
export const concat =
  <E, A>(va2: Validation<E, A>): ((va1: Validation<E, A>) => Validation<E, A>) =>
  (va1) => {
    if (va1.tag === 'Failure' && va2.tag === 'Failure') {
      return Failure([...va1.errors, ...va2.errors]);
    }
    if (va1.tag === 'Failure') return va1;
    return va2;
  };

/** Sequence all-or-Failure, collecting all errors. */
export const sequence = <E, A>(validations: readonly Validation<E, A>[]): Validation<E, readonly A[]> => {
  const result: A[] = [];
  const errors: E[] = [];
  for (const va of validations) {
    if (va.tag === 'Failure') {
      errors.push(...va.errors);
    } else {
      result.push(va.value);
    }
  }
  return errors.length > 0 ? Failure(errors) : Success(result);
};

/** Traverse a sequence, collecting all errors. */
export const traverse =
  <E, A, B>(f: (a: A) => Validation<E, B>): ((as: readonly A[]) => Validation<E, readonly B[]>) =>
  (as) =>
    sequence(as.map(f));

// Fantasy Land symbols — deferred. See docs/PROTOTYPE_ISOLATION.md for context.
// To re-enable, follow the isolated-proto pattern used in Either.ts / Maybe.ts:
// add module-private `_successProto` / `_failureProto` objects, return values
// via `Object.assign(Object.create(_proto), { ... })`, and patch the private
// protos. Do NOT use `Object.getPrototypeOf(literal)` — that pollutes the
// global Object.prototype and breaks vitest at module-load time.
//
// Validation needs a design decision before exposing `ap` on the prototype:
// the conventional FL instance for Validation is an *accumulating* applicative
// (combines Failure errors via Semigroup), distinct from `Either`'s
// short-circuiting ap. Verify the namespace `ap` matches that contract first.
