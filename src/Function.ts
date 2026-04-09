// Function — Composition and Utilities

/**
 * Identity function: returns its input unchanged.
 * @param a - The value to return.
 * @returns The same value.
 */
export const identity = <A>(a: A): A => a

/**
 * Create a function that always returns the same value.
 * @param a - The value to return.
 * @returns A function that ignores its input and returns the value.
 */
export const constant = <A>(a: A): (() => A) => () => a

/**
 * Flip the first two arguments of a binary function.
 * @param f - A binary function.
 * @returns A function with argument order reversed.
 */
export const flip = <A, B, C>(f: (a: A, b: B) => C): ((b: B, a: A) => C) =>
  (b, a) => f(a, b)

/**
 * Absurd: a function that takes a never value.
 * @param a - A value of type never (should never be called).
 * @returns A value of any type (unreachable).
 */
export const absurd = <A>(_: never): A => {
  throw new Error('absurd: unreachable')
}

// Pipe: explicit overloads for arities 1-10
/**
 * Pipe a value through a chain of functions (arity 1).
 * @param a - The initial value.
 * @param f1 - The first function.
 * @returns The result of f1(a).
 */
export function pipe<A, B>(a: A, f1: (a: A) => B): B

/**
 * Pipe a value through a chain of functions (arity 2).
 * @param a - The initial value.
 * @param f1 - The first function.
 * @param f2 - The second function.
 * @returns The result of f2(f1(a)).
 */
export function pipe<A, B, C>(a: A, f1: (a: A) => B, f2: (b: B) => C): C

/**
 * Pipe a value through a chain of functions (arity 3).
 */
export function pipe<A, B, C, D>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D
): D

/**
 * Pipe a value through a chain of functions (arity 4).
 */
export function pipe<A, B, C, D, E>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E
): E

/**
 * Pipe a value through a chain of functions (arity 5).
 */
export function pipe<A, B, C, D, E, F>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F
): F

/**
 * Pipe a value through a chain of functions (arity 6).
 */
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G
): G

/**
 * Pipe a value through a chain of functions (arity 7).
 */
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H
): H

/**
 * Pipe a value through a chain of functions (arity 8).
 */
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I
): I

/**
 * Pipe a value through a chain of functions (arity 9).
 */
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I,
  f9: (i: I) => J
): J

/**
 * Pipe a value through a chain of functions (arity 10).
 */
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I,
  f9: (i: I) => J,
  f10: (j: J) => K
): K

/**
 * Pipe implementation.
 */
export function pipe(a: unknown, ...fns: readonly ((x: unknown) => unknown)[]): unknown {
  let result = a
  for (const fn of fns) {
    result = fn(result)
  }
  return result
}

// Flow: explicit overloads for arities 1-10
/**
 * Compose functions left-to-right (arity 1).
 * @param f1 - The first function.
 * @returns A function that applies f1.
 */
export function flow<A, B>(f1: (a: A) => B): (a: A) => B

/**
 * Compose functions left-to-right (arity 2).
 * @param f1 - The first function.
 * @param f2 - The second function.
 * @returns A function that applies f1 then f2.
 */
export function flow<A, B, C>(f1: (a: A) => B, f2: (b: B) => C): (a: A) => C

/**
 * Compose functions left-to-right (arity 3).
 */
export function flow<A, B, C, D>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D
): (a: A) => D

/**
 * Compose functions left-to-right (arity 4).
 */
export function flow<A, B, C, D, E>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E
): (a: A) => E

/**
 * Compose functions left-to-right (arity 5).
 */
export function flow<A, B, C, D, E, F>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F
): (a: A) => F

/**
 * Compose functions left-to-right (arity 6).
 */
export function flow<A, B, C, D, E, F, G>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G
): (a: A) => G

/**
 * Compose functions left-to-right (arity 7).
 */
export function flow<A, B, C, D, E, F, G, H>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H
): (a: A) => H

/**
 * Compose functions left-to-right (arity 8).
 */
export function flow<A, B, C, D, E, F, G, H, I>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I
): (a: A) => I

/**
 * Compose functions left-to-right (arity 9).
 */
export function flow<A, B, C, D, E, F, G, H, I, J>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I,
  f9: (i: I) => J
): (a: A) => J

/**
 * Compose functions left-to-right (arity 10).
 */
export function flow<A, B, C, D, E, F, G, H, I, J, K>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I,
  f9: (i: I) => J,
  f10: (j: J) => K
): (a: A) => K

/**
 * Flow implementation.
 */
export function flow(...fns: readonly ((x: unknown) => unknown)[]): (a: unknown) => unknown {
  return (a) => {
    let result = a
    for (const fn of fns) {
      result = fn(result)
    }
    return result
  }
}

/**
 * Curry a 2-argument function.
 * @param f - A binary function.
 * @returns A curried function.
 */
export const curry2 = <A, B, C>(f: (a: A, b: B) => C): ((a: A) => (b: B) => C) =>
  (a) => (b) => f(a, b)

/**
 * Curry a 3-argument function.
 * @param f - A ternary function.
 * @returns A curried function.
 */
export const curry3 = <A, B, C, D>(
  f: (a: A, b: B, c: C) => D
): ((a: A) => (b: B) => (c: C) => D) =>
  (a) => (b) => (c) => f(a, b, c)

/**
 * Curry a 4-argument function.
 * @param f - A 4-argument function.
 * @returns A curried function.
 */
export const curry4 = <A, B, C, D, E>(
  f: (a: A, b: B, c: C, d: D) => E
): ((a: A) => (b: B) => (c: C) => (d: D) => E) =>
  (a) => (b) => (c) => (d) => f(a, b, c, d)

/**
 * Memoize a function with single-level cache.
 * @param f - The function to memoize.
 * @returns A memoized function.
 */
export const memoize = <A, B>(f: (a: A) => B): ((a: A) => B) => {
  const cache = new Map<A, B>()
  return (a: A) => {
    const cached = cache.get(a)
    if (cached !== undefined) {
      return cached
    }
    const result = f(a)
    cache.set(a, result)
    return result
  }
}

/**
 * Execute a function at most once; cache the result.
 * @param f - The function to execute once.
 * @returns A function that returns the cached result on all calls.
 */
export const once = <A, B>(f: (a: A) => B): ((a: A) => B) => {
  let called = false
  let result: B
  return (a: A) => {
    if (!called) {
      result = f(a)
      called = true
    }
    return result
  }
}

/**
 * Execute a side effect and pass the value through.
 * @param f - A side-effect function.
 * @returns A function that executes the side effect and returns its input.
 */
export const tap = <A>(f: (a: A) => void): ((a: A) => A) =>
  (a) => {
    f(a)
    return a
  }
