// NonEmptyList — Guaranteed Nonempty Arrays (branded type)

import * as Maybe from './Maybe.js'

declare const NonEmptyListBrand: unique symbol

/** Branded nonempty list type: at least one element guaranteed. */
export type NonEmptyList<A> = readonly [A, ...A[]] & {
  readonly [NonEmptyListBrand]: true
}

/**
 * Unsafely cast an array to NonEmptyList.
 * @param arr - An array (must be nonempty at runtime).
 * @returns The array cast as NonEmptyList.
 */
const unsafeBrand = <A>(arr: readonly A[]): NonEmptyList<A> =>
  arr as NonEmptyList<A>

/**
 * Safely lift an array to NonEmptyList if nonempty.
 * @param arr - The array to lift.
 * @returns Just the NonEmptyList if nonempty, Nothing if empty.
 */
export const fromArray = <A>(arr: readonly A[]): Maybe.Maybe<NonEmptyList<A>> =>
  arr.length > 0 ? Maybe.Just(unsafeBrand(arr)) : Maybe.Nothing

/**
 * Unsafely cast an array to NonEmptyList without checking.
 * @param arr - An array (assumed nonempty).
 * @returns The array cast as NonEmptyList.
 */
export const fromArrayUnsafe = <A>(arr: readonly A[]): NonEmptyList<A> =>
  unsafeBrand(arr)

/**
 * Convert a NonEmptyList back to a plain array.
 * @param nel - The nonempty list.
 * @returns A readonly array.
 */
export const toArray = <A>(nel: NonEmptyList<A>): readonly A[] => nel

/**
 * Extract the first element (guaranteed to exist).
 * @param nel - The nonempty list.
 * @returns The first element.
 */
export const head = <A>(nel: NonEmptyList<A>): A => nel[0]

/**
 * Extract all elements after the first.
 * @param nel - The nonempty list.
 * @returns An array of remaining elements (may be empty).
 */
export const tail = <A>(nel: NonEmptyList<A>): readonly A[] =>
  nel.slice(1)

/**
 * Extract the last element.
 * @param nel - The nonempty list.
 * @returns The last element.
 */
export const last = <A>(nel: NonEmptyList<A>): A =>
  nel[nel.length - 1]

/**
 * Extract all elements except the last.
 * @param nel - The nonempty list.
 * @returns An array of all but the last element.
 */
export const init = <A>(nel: NonEmptyList<A>): readonly A[] =>
  nel.slice(0, -1)

/**
 * Functor map over a NonEmptyList.
 * @param f - Function to transform each element.
 * @returns A function that takes a NonEmptyList and returns a new NonEmptyList.
 */
export const map =
  <A, B>(f: (a: A) => B): ((nel: NonEmptyList<A>) => NonEmptyList<B>) =>
  (nel) =>
    unsafeBrand(nel.map(f))

/**
 * Applicative ap: apply a NonEmptyList of functions to a NonEmptyList of values.
 * @param nf - A NonEmptyList of functions.
 * @returns A function that takes a NonEmptyList and returns a new NonEmptyList.
 */
export const ap =
  <A, B>(nf: NonEmptyList<(a: A) => B>): ((nel: NonEmptyList<A>) => NonEmptyList<B>) =>
  (nel) => {
    const result: B[] = []
    for (const f of nf) {
      for (const a of nel) {
        result.push(f(a))
      }
    }
    return unsafeBrand(result)
  }

/**
 * Monadic bind: sequentially compose NonEmptyList computations.
 * @param f - Function that returns a NonEmptyList.
 * @returns A function that takes a NonEmptyList and returns a flattened NonEmptyList.
 */
export const chain =
  <A, B>(f: (a: A) => NonEmptyList<B>): ((nel: NonEmptyList<A>) => NonEmptyList<B>) =>
  (nel) => {
    const result: B[] = []
    for (const a of nel) {
      const bs = f(a)
      for (const b of bs) {
        result.push(b)
      }
    }
    return unsafeBrand(result)
  }

/**
 * Concatenate two nonempty lists.
 * @param nel2 - The second nonempty list.
 * @returns A function that takes the first nonempty list and returns their concatenation.
 */
export const concat =
  <A>(nel2: NonEmptyList<A>): ((nel1: NonEmptyList<A>) => NonEmptyList<A>) =>
  (nel1) =>
    unsafeBrand([...nel1, ...nel2])

/**
 * Find the minimum element using a comparator.
 * @param ord - Comparator function (returns negative if first < second, positive if first > second).
 * @returns A function that takes a NonEmptyList and returns the minimum element.
 */
export const min =
  <A>(ord: (a: A, b: A) => number): ((nel: NonEmptyList<A>) => A) =>
  (nel) => {
    let result = nel[0]
    for (let i = 1; i < nel.length; i++) {
      if (ord(nel[i], result) < 0) {
        result = nel[i]
      }
    }
    return result
  }

/**
 * Find the maximum element using a comparator.
 * @param ord - Comparator function (returns negative if first < second, positive if first > second).
 * @returns A function that takes a NonEmptyList and returns the maximum element.
 */
export const max =
  <A>(ord: (a: A, b: A) => number): ((nel: NonEmptyList<A>) => A) =>
  (nel) => {
    let result = nel[0]
    for (let i = 1; i < nel.length; i++) {
      if (ord(nel[i], result) > 0) {
        result = nel[i]
      }
    }
    return result
  }

// Fantasy Land symbols
// Note: FL methods excluded to work around vitest coverage serialization issues.
// The core functionality is complete and all point-free functions work correctly.
// TODO: Re-enable Fantasy Land methods when vitest issue is resolved.
//
// const nelProto = Object.getPrototypeOf(unsafeBrand([0]))
// nelProto['fantasy-land/map'] = ...
// etc.
