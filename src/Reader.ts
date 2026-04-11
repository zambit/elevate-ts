// Reader — Dependency Injection

/** Represents a Reader computation: a pure function (env: R) => A. */
export type Reader<R, A> = { readonly tag: 'Reader'; readonly run: (env: R) => A };

/**
 * Construct a Reader from a function.
 * @param run - The function that reads the environment.
 * @returns A Reader that encapsulates the function.
 */
export const Reader = <R, A>(run: (env: R) => A): Reader<R, A> => ({
  tag: 'Reader',
  run
});

/**
 * Retrieve the environment as a value.
 * @returns A Reader that returns the environment unchanged.
 */
export const ask = <R>(): Reader<R, R> => Reader((env) => env);

/**
 * Retrieve and transform the environment.
 * @param f - Function to transform the environment.
 * @returns A Reader that applies the function to the environment.
 */
export const asks = <R, A>(f: (env: R) => A): Reader<R, A> => Reader(f);

/**
 * Modify the environment for a sub-computation.
 * @param f - Function to transform the environment.
 * @returns A function that takes a Reader and returns a new Reader with modified environment.
 */
export const local =
  <R>(f: (env: R) => R): (<A>(reader: Reader<R, A>) => Reader<R, A>) =>
  (reader) =>
    Reader((env) => reader.run(f(env)));

/**
 * Functor map over the result.
 * @param f - Function to transform the value.
 * @returns A function that takes a Reader and returns a new Reader with mapped value.
 */
export const map =
  <A, B>(f: (a: A) => B): (<R>(reader: Reader<R, A>) => Reader<R, B>) =>
  (reader) =>
    Reader((env) => f(reader.run(env)));

/**
 * Applicative ap: apply a Reader containing a function to a Reader containing a value.
 * @param rf - A Reader containing a function.
 * @returns A function that takes a Reader and returns a new Reader with applied function.
 */
export const ap =
  <R, A, B>(rf: Reader<R, (a: A) => B>): ((ra: Reader<R, A>) => Reader<R, B>) =>
  (ra) =>
    Reader((env) => rf.run(env)(ra.run(env)));

/**
 * Monadic bind: sequentially compose two Readers.
 * @param f - Function that returns a new Reader.
 * @returns A function that takes a Reader and returns a new Reader.
 */
export const chain =
  <R, A, B>(f: (a: A) => Reader<R, B>): ((reader: Reader<R, A>) => Reader<R, B>) =>
  (reader) =>
    Reader((env) => f(reader.run(env)).run(env));

/**
 * Execute a Reader with an environment.
 * @param env - The environment to provide.
 * @returns A function that takes a Reader and returns its result.
 */
export const runReader =
  <R, A>(env: R): ((reader: Reader<R, A>) => A) =>
  (reader) =>
    reader.run(env);

// Fantasy Land symbols
// Note: FL methods excluded to work around vitest coverage serialization issues.
// The core functionality is complete and all point-free functions work correctly.
// TODO: Re-enable Fantasy Land methods when vitest issue is resolved.
//
// const readerProto = Object.getPrototypeOf(Reader(() => 0))
// readerProto['fantasy-land/map'] = ...
// etc.
