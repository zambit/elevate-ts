// Reader — Dependency Injection

/** Represents a Reader computation: a pure function (env: R) => A. */
export type Reader<R, A> = { readonly tag: 'Reader'; readonly run: (env: R) => A };

// Private prototype for Fantasy Land methods. Reader values' prototype chain is
// rooted here, NOT at Object.prototype. See docs/PROTOTYPE_ISOLATION.md.
const _readerProto: Record<string, unknown> = {};

/**
 * Construct a Reader from a function.
 * @param run - The function that reads the environment.
 * @returns A Reader that encapsulates the function.
 */
export const Reader = <R, A>(run: (env: R) => A): Reader<R, A> => Object.assign(Object.create(_readerProto), { tag: 'Reader' as const, run });

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

// Fantasy Land conformance — Functor, Apply, Applicative, Chain, Monad.
// Methods live on the private _readerProto (see top of file). Each delegates
// to the namespace function above so behavior is identical between the two
// call styles: namespace (`Reader.map(f)(r)`) and FL (`r['fantasy-land/map'](f)`).

Object.defineProperty(Reader, 'fantasy-land/of', { value: <A>(value: A) => Reader(() => value) });

_readerProto['fantasy-land/map'] = function <R, A, B>(this: Reader<R, A>, f: (a: A) => B) {
  return map(f)(this);
};
_readerProto['fantasy-land/ap'] = function <R, A, B>(this: Reader<R, A>, rf: Reader<R, (a: A) => B>) {
  return ap(rf)(this);
};
_readerProto['fantasy-land/chain'] = function <R, A, B>(this: Reader<R, A>, f: (a: A) => Reader<R, B>) {
  return chain(f)(this);
};
