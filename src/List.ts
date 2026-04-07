// List — Array Utilities

import * as Maybe from './Maybe.js'

/**
 * Get the first element of an array.
 * @param arr - The array.
 * @returns The first element or undefined if empty.
 */
export const head = <A>(arr: readonly A[]): A | undefined => arr[0]

/**
 * Get all but the first element.
 * @param arr - The array.
 * @returns An array of remaining elements.
 */
export const tail = <A>(arr: readonly A[]): readonly A[] => arr.slice(1)

/**
 * Get the last element of an array.
 * @param arr - The array.
 * @returns The last element or undefined if empty.
 */
export const last = <A>(arr: readonly A[]): A | undefined =>
  arr.length > 0 ? arr[arr.length - 1] : undefined

/**
 * Get all but the last element.
 * @param arr - The array.
 * @returns An array of all but the last element.
 */
export const init = <A>(arr: readonly A[]): readonly A[] =>
  arr.length > 0 ? arr.slice(0, -1) : []

/**
 * Deconstruct an array into head and tail.
 * @param arr - The array.
 * @returns Just [head, tail] if nonempty, Nothing if empty.
 */
export const uncons = <A>(arr: readonly A[]): Maybe.Maybe<readonly [A, readonly A[]]> =>
  arr.length > 0 ? Maybe.Just([arr[0], arr.slice(1)]) : Maybe.Nothing

/**
 * Prepend an element to an array.
 * @param a - The element to prepend.
 * @returns A function that takes an array and returns the new array.
 */
export const cons = <A>(a: A): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => [a, ...arr]

/**
 * Append an element to an array.
 * @param a - The element to append.
 * @returns A function that takes an array and returns the new array.
 */
export const snoc = <A>(a: A): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => [...arr, a]

/**
 * Take the first n elements.
 * @param n - The number of elements to take.
 * @returns A function that takes an array and returns the first n elements.
 */
export const take = <A>(n: number): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => arr.slice(0, n)

/**
 * Drop the first n elements.
 * @param n - The number of elements to drop.
 * @returns A function that takes an array and returns the remaining elements.
 */
export const drop = <A>(n: number): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => arr.slice(n)

/**
 * Take elements while predicate holds.
 * @param predicate - The predicate to test.
 * @returns A function that takes an array and returns elements taken while predicate holds.
 */
export const takeWhile = <A>(
  predicate: (a: A) => boolean
): ((arr: readonly A[]) => readonly A[]) => (arr) => {
  let i = 0
  while (i < arr.length && predicate(arr[i])) i++
  return arr.slice(0, i)
}

/**
 * Drop elements while predicate holds.
 * @param predicate - The predicate to test.
 * @returns A function that takes an array and returns remaining elements.
 */
export const dropWhile = <A>(
  predicate: (a: A) => boolean
): ((arr: readonly A[]) => readonly A[]) => (arr) => {
  let i = 0
  while (i < arr.length && predicate(arr[i])) i++
  return arr.slice(i)
}

/**
 * Partition an array into two based on a predicate.
 * @param predicate - The predicate to split on.
 * @returns A function that takes an array and returns [matching, nonmatching].
 */
export const partition = <A>(
  predicate: (a: A) => boolean
): ((arr: readonly A[]) => readonly [readonly A[], readonly A[]]) =>
  (arr) => {
    const left: A[] = []
    const right: A[] = []
    for (const a of arr) {
      if (predicate(a)) {
        left.push(a)
      } else {
        right.push(a)
      }
    }
    return [left, right]
  }

/**
 * Split an array at the first element that fails the predicate.
 * @param predicate - The predicate to test.
 * @returns A function that takes an array and returns [taken, dropped].
 */
export const span = <A>(
  predicate: (a: A) => boolean
): ((arr: readonly A[]) => readonly [readonly A[], readonly A[]]) =>
  (arr) => {
    let i = 0
    while (i < arr.length && predicate(arr[i])) i++
    return [arr.slice(0, i), arr.slice(i)]
  }

/**
 * Group consecutive equal elements.
 * @param eq - Equality comparator.
 * @returns A function that takes an array and returns grouped elements.
 */
export const groupBy = <A>(
  eq: (a: A, b: A) => boolean
): ((arr: readonly A[]) => readonly (readonly A[])[]) =>
  (arr) => {
    if (arr.length === 0) return []
    const groups: A[][] = []
    let current: A[] = [arr[0]]
    for (let i = 1; i < arr.length; i++) {
      if (eq(arr[i], arr[i - 1])) {
        current.push(arr[i])
      } else {
        groups.push(current)
        current = [arr[i]]
      }
    }
    groups.push(current)
    return groups
  }

/**
 * Remove consecutive duplicates.
 * @param eq - Equality comparator.
 * @returns A function that takes an array and returns array without consecutive duplicates.
 */
export const nubBy = <A>(
  eq: (a: A, b: A) => boolean
): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => {
    if (arr.length === 0) return []
    const result: A[] = [arr[0]]
    for (let i = 1; i < arr.length; i++) {
      if (!eq(arr[i], arr[i - 1])) {
        result.push(arr[i])
      }
    }
    return result
  }

/**
 * Sort an array with a comparator function.
 * @param ord - Comparator function (negative if a < b, positive if a > b).
 * @returns A function that takes an array and returns a sorted array.
 */
export const sortBy = <A>(
  ord: (a: A, b: A) => number
): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => [...arr].sort(ord)

/**
 * Zip two arrays into pairs.
 * @param arr2 - The second array.
 * @returns A function taking first array, returning [pairs, remainders].
 */
export const zip = <A, B>(arr2: readonly B[]) => (arr1: readonly A[]) => {
  const len = Math.min(arr1.length, arr2.length)
  const pairs: [A, B][] = []
  for (let i = 0; i < len; i++) {
    pairs.push([arr1[i], arr2[i]])
  }
  const remainder =
    arr1.length > arr2.length ? arr1.slice(len) : arr2.slice(len)
  return [pairs, remainder] as const
}

/**
 * Zip two arrays with a function.
 * @param f - Function to apply to pairs.
 * @returns A function taking the second array, then first array, returning results.
 */
export const zipWith = <A, B, C>(
  f: (a: A, b: B) => C
): ((arr2: readonly B[]) => (arr1: readonly A[]) => readonly C[]) =>
  (arr2) =>
  (arr1) => {
    const len = Math.min(arr1.length, arr2.length)
    const result: C[] = []
    for (let i = 0; i < len; i++) {
      result.push(f(arr1[i], arr2[i]))
    }
    return result
  }

/**
 * Unzip an array of pairs into two arrays.
 * @param pairs - Array of pairs.
 * @returns A tuple of two arrays.
 */
export const unzip = <A, B>(
  pairs: readonly (readonly [A, B])[]
): readonly [readonly A[], readonly B[]] => {
  const as: A[] = []
  const bs: B[] = []
  for (const [a, b] of pairs) {
    as.push(a)
    bs.push(b)
  }
  return [as, bs]
}

/**
 * Flatten one level of nesting.
 * @param arr - Array of arrays.
 * @returns A flattened array.
 */
export const flatten = <A>(arr: readonly (readonly A[])[]): readonly A[] => {
  const result: A[] = []
  for (const sub of arr) {
    for (const a of sub) {
      result.push(a)
    }
  }
  return result
}

/**
 * Insert a separator between elements.
 * @param sep - The separator element.
 * @returns A function that takes an array and returns interspersed array.
 */
export const intersperse = <A>(sep: A): ((arr: readonly A[]) => readonly A[]) =>
  (arr) => {
    if (arr.length === 0) return []
    const result: A[] = [arr[0]]
    for (let i = 1; i < arr.length; i++) {
      result.push(sep)
      result.push(arr[i])
    }
    return result
  }

/**
 * Transpose a matrix (2D array).
 * @param matrix - A matrix as array of arrays.
 * @returns The transposed matrix.
 */
export const transpose = <A>(
  matrix: readonly (readonly A[])[]
): readonly (readonly A[])[] => {
  if (matrix.length === 0) return []
  const maxLen = Math.max(...matrix.map((row) => row.length))
  const result: A[][] = []
  for (let col = 0; col < maxLen; col++) {
    const row: A[] = []
    for (let rowIdx = 0; rowIdx < matrix.length; rowIdx++) {
      if (col < matrix[rowIdx].length) {
        row.push(matrix[rowIdx][col])
      }
    }
    result.push(row)
  }
  return result
}
