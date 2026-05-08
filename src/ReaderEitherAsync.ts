// ReaderEitherAsync — Lazy Async Either with Dependency Injection
//
// Composes Reader (env -> A) with EitherAsync (Promise<Either<L, R>>) into a single type
// (env: R) => Promise<Either<L, A>>. This is the elevate-ts equivalent of fp-ts
// ReaderTaskEither. Use it for asynchronous, failable computations that need access to
// an injected environment (clients, config, loggers).

import * as Either from './Either.js';
import * as EitherAsync from './EitherAsync.js';
import * as Reader from './Reader.js';

/**
 * Lazy async Either parameterized by an environment R.
 * Equivalent semantics to EitherAsync<L, A> but takes an env on run.
 */
export type ReaderEitherAsync<R, L, A> = {
  readonly tag: 'ReaderEitherAsync';
  readonly run: (env: R) => Promise<Either.Either<L, A>>;
};

/**
 * Construct a ReaderEitherAsync from a function (env) => Promise<Either<L, A>>.
 */
export const ReaderEitherAsync = <R, L, A>(run: (env: R) => Promise<Either.Either<L, A>>): ReaderEitherAsync<R, L, A> => ({ tag: 'ReaderEitherAsync', run });

/** Lift a pure value as Right, ignoring the env. */
export const of = <A>(value: A): ReaderEitherAsync<unknown, never, A> => ReaderEitherAsync(() => Promise.resolve(Either.Right(value)));

/** Lift a pure value as Right, ignoring the env (explicit form). */
export const right = <A>(value: A): ReaderEitherAsync<unknown, never, A> => of(value);

/** Lift a pure error as Left, ignoring the env. */
export const left = <L>(error: L): ReaderEitherAsync<unknown, L, never> => ReaderEitherAsync(() => Promise.resolve(Either.Left(error)));

/** Lift a synchronous Either, ignoring the env. */
export const liftEither = <L, A>(ea: Either.Either<L, A>): ReaderEitherAsync<unknown, L, A> => ReaderEitherAsync(() => Promise.resolve(ea));

/** Lift an EitherAsync, ignoring the env. */
export const liftEitherAsync = <L, A>(ea: EitherAsync.EitherAsync<L, A>): ReaderEitherAsync<unknown, L, A> => ReaderEitherAsync(() => ea.run());

/** Lift a Reader as a Right, async-resolved. */
export const liftReader = <R, A>(r: Reader.Reader<R, A>): ReaderEitherAsync<R, never, A> => ReaderEitherAsync((env) => Promise.resolve(Either.Right(r.run(env))));

/**
 * Lift an env-aware Promise factory; rejections become Left via onError.
 */
export const fromPromise = <R, L, A>(f: (env: R) => Promise<A>, onError: (e: unknown) => L): ReaderEitherAsync<R, L, A> =>
  ReaderEitherAsync((env) =>
    f(env).then(
      (a) => Either.Right(a) as Either.Either<L, A>,
      (e) => Either.Left(onError(e))
    )
  );

/**
 * Wrap an env-aware async function with error handling. Thrown exceptions and
 * rejected Promises become Left via onError.
 */
export const tryCatch = <R, L, A>(f: (env: R) => Promise<A>, onError: (e: unknown) => L): ReaderEitherAsync<R, L, A> =>
  ReaderEitherAsync((env) =>
    Promise.resolve()
      .then(() => f(env))
      .then(
        (a) => Either.Right(a) as Either.Either<L, A>,
        (e) => Either.Left(onError(e))
      )
  );

/** Retrieve the environment as a Right. */
export const ask = <R>(): ReaderEitherAsync<R, never, R> => ReaderEitherAsync((env) => Promise.resolve(Either.Right(env)));

/** Retrieve and synchronously transform the environment. */
export const asks = <R, A>(f: (env: R) => A): ReaderEitherAsync<R, never, A> => ReaderEitherAsync((env) => Promise.resolve(Either.Right(f(env))));

/** Retrieve and synchronously transform the env into an Either. */
export const asksEither = <R, L, A>(f: (env: R) => Either.Either<L, A>): ReaderEitherAsync<R, L, A> => ReaderEitherAsync((env) => Promise.resolve(f(env)));

/** Retrieve the env and produce an EitherAsync. */
export const asksEitherAsync = <R, L, A>(f: (env: R) => EitherAsync.EitherAsync<L, A>): ReaderEitherAsync<R, L, A> => ReaderEitherAsync((env) => f(env).run());

/** Modify the env for a sub-computation. */
export const local =
  <R>(f: (env: R) => R): (<L, A>(rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L, A>) =>
  (rea) =>
    ReaderEitherAsync((env) => rea.run(f(env)));

/** Partially apply the env, collapsing to a plain EitherAsync. */
export const provide =
  <R>(env: R): (<L, A>(rea: ReaderEitherAsync<R, L, A>) => EitherAsync.EitherAsync<L, A>) =>
  (rea) =>
    EitherAsync.EitherAsync(() => rea.run(env));

/** Functor map over the Right value. */
export const map =
  <A, B>(f: (a: A) => B): (<R, L>(rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L, B>) =>
  <R, L>(rea: ReaderEitherAsync<R, L, A>): ReaderEitherAsync<R, L, B> =>
    ReaderEitherAsync((env: R) => rea.run(env).then((either): Either.Either<L, B> => (either.tag === 'Left' ? either : Either.Right(f(either.right)))));

/** Map over the Left value. */
export const mapLeft =
  <L, L2>(f: (l: L) => L2): (<R, A>(rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L2, A>) =>
  <R, A>(rea: ReaderEitherAsync<R, L, A>): ReaderEitherAsync<R, L2, A> =>
    ReaderEitherAsync((env: R) => rea.run(env).then((either): Either.Either<L2, A> => (either.tag === 'Right' ? either : Either.Left(f(either.left)))));

/** Bifunctor bimap: map over both Left and Right. */
export const bimap =
  <L, L2, A, B>(f: (l: L) => L2, g: (a: A) => B): (<R>(rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L2, B>) =>
  (rea) =>
    ReaderEitherAsync((env) => rea.run(env).then((either) => Either.bimap(f, g)(either)));

/** Monadic bind: sequentially compose ReaderEitherAsync computations. */
export const chain =
  <R, L, A, B>(f: (a: A) => ReaderEitherAsync<R, L, B>): ((rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L, B>) =>
  (rea) =>
    ReaderEitherAsync(async (env) => {
      const either = await rea.run(env);
      return either.tag === 'Right' ? f(either.right).run(env) : either;
    });

/** Chain over the Left value (recovery). */
export const chainLeft =
  <R, L, L2, A>(f: (l: L) => ReaderEitherAsync<R, L2, A>): ((rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L2, A>) =>
  (rea) =>
    ReaderEitherAsync(async (env) => {
      const either = await rea.run(env);
      if (either.tag === 'Left') return f(either.left).run(env);
      return { tag: 'Right', right: either.right } as Either.Either<L2, A>;
    });

/** Applicative ap: apply a wrapped function to a wrapped value. */
export const ap =
  <R, L, A, B>(ref: ReaderEitherAsync<R, L, (a: A) => B>): ((rea: ReaderEitherAsync<R, L, A>) => ReaderEitherAsync<R, L, B>) =>
  (rea) =>
    ReaderEitherAsync(async (env) => {
      const [f, a] = await Promise.all([ref.run(env), rea.run(env)]);
      return Either.ap(f)(a);
    });

/** Execute with an environment. Primary runner. */
export const runReaderEitherAsync =
  <R>(env: R): (<L, A>(rea: ReaderEitherAsync<R, L, A>) => Promise<Either.Either<L, A>>) =>
  (rea) =>
    rea.run(env);

/** Extract the Right value or default; takes env on the second call. */
export const getOrElse =
  <A>(defaultValue: A): (<R, L>(rea: ReaderEitherAsync<R, L, A>) => (env: R) => Promise<A>) =>
  (rea) =>
  (env) =>
    rea.run(env).then((either) => Either.getOrElse(defaultValue)(either));

/** Case analysis over the result. */
export const fold =
  <L, A, B>(onLeft: (l: L) => Promise<B>, onRight: (a: A) => Promise<B>): (<R>(rea: ReaderEitherAsync<R, L, A>) => (env: R) => Promise<B>) =>
  (rea) =>
  (env) =>
    rea.run(env).then((either) => Either.fold(onLeft, onRight)(either));

/**
 * All-or-Left over an array of ReaderEitherAsync sharing the same env.
 * Runs in parallel; first Left wins.
 */
export const all = <R, L, A>(reas: readonly ReaderEitherAsync<R, L, A>[]): ReaderEitherAsync<R, L, readonly A[]> =>
  ReaderEitherAsync(async (env) => {
    const results = await Promise.all(reas.map((rea) => rea.run(env)));
    const values: A[] = [];
    for (const either of results) {
      if (either.tag === 'Left') return either;
      values.push(either.right);
    }
    return Either.Right(values);
  });
