// Tuple — Immutable 2-Tuples

/** Immutable 2-tuple. */
export type Tuple<A, B> = { readonly fst: A; readonly snd: B };

// Private prototype for Fantasy Land methods. Tuple values' prototype chain is
// rooted here, NOT at Object.prototype. See docs/PROTOTYPE_ISOLATION.md.
const _tupleProto: Record<string, unknown> = {};

/**
 * Construct a Tuple from two values.
 * @param fst - The first component.
 * @param snd - The second component.
 * @returns A Tuple containing both values.
 */
export const Tuple = <A, B>(fst: A, snd: B): Tuple<A, B> => Object.assign(Object.create(_tupleProto), { fst, snd });

/**
 * Extract the first component.
 * @param tuple - The tuple to extract from.
 * @returns The first component.
 */
export const fst = <A, B>(tuple: Tuple<A, B>): A => tuple.fst;

/**
 * Extract the second component.
 * @param tuple - The tuple to extract from.
 * @returns The second component.
 */
export const snd = <A, B>(tuple: Tuple<A, B>): B => tuple.snd;

/**
 * Map over the first component.
 * @param f - Function to transform the first component.
 * @returns A function that takes a Tuple and returns a new Tuple with mapped first component.
 */
export const mapFst =
  <A, B, A2>(f: (a: A) => A2): ((tuple: Tuple<A, B>) => Tuple<A2, B>) =>
  (tuple) =>
    Tuple(f(tuple.fst), tuple.snd);

/**
 * Map over the second component.
 * @param f - Function to transform the second component.
 * @returns A function that takes a Tuple and returns a new Tuple with mapped second component.
 */
export const mapSnd =
  <A, B, B2>(f: (b: B) => B2): ((tuple: Tuple<A, B>) => Tuple<A, B2>) =>
  (tuple) =>
    Tuple(tuple.fst, f(tuple.snd));

/**
 * Bifunctor bimap: map over both components independently.
 * @param f - Function to transform the first component.
 * @param g - Function to transform the second component.
 * @returns A function that takes a Tuple and returns a new Tuple with both components mapped.
 */
export const bimap =
  <A, B, A2, B2>(f: (a: A) => A2, g: (b: B) => B2): ((tuple: Tuple<A, B>) => Tuple<A2, B2>) =>
  (tuple) =>
    Tuple(f(tuple.fst), g(tuple.snd));

/**
 * Convert a Tuple to a 2-element array.
 * @param tuple - The tuple to convert.
 * @returns A 2-element array.
 */
export const toArray = <A, B>(tuple: Tuple<A, B>): readonly [A, B] => [tuple.fst, tuple.snd];

/**
 * Construct a Tuple from a 2-element array.
 * @param arr - A 2-element array.
 * @returns A Tuple constructed from the array.
 */
export const fromArray = <A, B>(arr: readonly [A, B]): Tuple<A, B> => Tuple(arr[0], arr[1]);

/**
 * Swap the components of a Tuple.
 * @param tuple - The tuple to swap.
 * @returns A new Tuple with components reversed.
 */
export const swap = <A, B>(tuple: Tuple<A, B>): Tuple<B, A> => Tuple(tuple.snd, tuple.fst);

/**
 * Apply two functions to the same input, combining results as a Tuple.
 * @param f - Function to apply to the input.
 * @param g - Function to apply to the input.
 * @returns A function that takes a value and returns a Tuple of the results.
 */
export const fanout =
  <A, B, C>(f: (a: A) => B, g: (a: A) => C): ((a: A) => Tuple<B, C>) =>
  (a) =>
    Tuple(f(a), g(a));

// Fantasy Land conformance — Functor and Bifunctor.
// By convention, Tuple's Functor instance maps over the second component;
// callers wanting both components use bimap.

_tupleProto['fantasy-land/map'] = function <A, B, B2>(this: Tuple<A, B>, f: (b: B) => B2) {
  return mapSnd(f)(this);
};
_tupleProto['fantasy-land/bimap'] = function <A, B, A2, B2>(this: Tuple<A, B>, f: (a: A) => A2, g: (b: B) => B2) {
  return bimap(f, g)(this);
};
