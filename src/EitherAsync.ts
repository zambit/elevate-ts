// EitherAsync — Lazy Async Either

import * as Either from './Either.js'
import type * as MaybeAsyncModule from './MaybeAsync.js'

/**
 * Lazy async Either: wraps Promise<Either<L, R>>.
 * Critical: Rejected Promises and thrown exceptions become Left; never throws or rejects.
 */
export type EitherAsync<L, R> = {
  readonly tag: 'EitherAsync'
  readonly run: () => Promise<Either.Either<L, R>>
}

/**
 * Construct an EitherAsync from a lazy computation.
 * @param run - A function returning Promise<Either<L, R>>.
 * @returns An EitherAsync that encapsulates the computation.
 */
export const EitherAsync = <L, R>(
  run: () => Promise<Either.Either<L, R>>
): EitherAsync<L, R> => ({ tag: 'EitherAsync', run })

/**
 * Lift a synchronous Either into EitherAsync.
 * @param ea - The synchronous Either.
 * @returns An EitherAsync that immediately resolves to the Either.
 */
export const liftEither = <L, R>(ea: Either.Either<L, R>): EitherAsync<L, R> =>
  EitherAsync(() => Promise.resolve(ea))

/**
 * Lift a Promise into EitherAsync.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param p - The Promise to lift.
 * @param onError - Function to transform errors to Left.
 * @returns An EitherAsync that resolves to Right or Left.
 */
export const fromPromise = <L, R>(
  p: Promise<R>,
  onError: (e: unknown) => L
): EitherAsync<L, R> =>
  EitherAsync(() =>
    p.then(
      (r) => Either.Right(r),
      (e) => Either.Left(onError(e))
    )
  )

/**
 * Wrap an async function with error handling.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - An async function.
 * @param onError - Function to transform errors to Left.
 * @returns An EitherAsync that captures the result or Left on error.
 */
export const tryCatch = <L, R>(
  f: () => Promise<R>,
  onError: (e: unknown) => L
): EitherAsync<L, R> =>
  EitherAsync(() =>
    Promise.resolve()
      .then(() => f())
      .then(
        (r) => Either.Right(r),
        (e) => Either.Left(onError(e))
      )
  )

/**
 * Functor map over the Right value.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function to transform the Right value.
 * @returns A function taking EitherAsync and returning a new EitherAsync.
 */
export const map = <L, A, B>(
  f: (a: A) => B
): ((ea: EitherAsync<L, A>) => EitherAsync<L, B>) =>
  (ea) =>
    EitherAsync<L, B>(() =>
      ea.run().then((either) => Either.map(f)(either)) as Promise<Either.Either<L, B>>
    )

/**
 * Map over the Left value.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function to transform the Left value.
 * @returns A function taking EitherAsync and returning a new EitherAsync.
 */
export const mapLeft = <L, L2, R>(
  f: (l: L) => L2
): ((ea: EitherAsync<L, R>) => EitherAsync<L2, R>) =>
  (ea) =>
    EitherAsync<L2, R>(() =>
      ea.run().then((either) => Either.mapLeft(f)(either)) as Promise<Either.Either<L2, R>>
    )

/**
 * Bifunctor bimap: map over both Left and Right.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function to transform Left.
 * @param g - Function to transform Right.
 * @returns A function taking EitherAsync and returning a new EitherAsync.
 */
export const bimap = <L, L2, A, B>(
  f: (l: L) => L2,
  g: (a: A) => B
): ((ea: EitherAsync<L, A>) => EitherAsync<L2, B>) =>
  (ea) =>
    EitherAsync(() =>
      ea.run().then((either) => Either.bimap(f, g)(either))
    )

/**
 * Monadic bind: sequentially compose EitherAsync computations.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function that returns an EitherAsync.
 * @returns A function taking EitherAsync and returning a flattened EitherAsync.
 */
export const chain = <L, A, B>(
  f: (a: A) => EitherAsync<L, B>
): ((ea: EitherAsync<L, A>) => EitherAsync<L, B>) =>
  (ea) =>
    EitherAsync(async () => {
      const either = await ea.run()
      if (either.tag === 'Right') {
        return f(either.right).run()
      }
      return either
    })

/**
 * Chain over the Left value.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function that returns an EitherAsync.
 * @returns A function taking EitherAsync and returning a new EitherAsync.
 */
export const chainLeft = <L, L2, R>(
  f: (l: L) => EitherAsync<L2, R>
): ((ea: EitherAsync<L, R>) => EitherAsync<L2, R>) =>
  (ea) =>
    EitherAsync(async () => {
      const either = await ea.run()
      if (either.tag === 'Left') {
        return await f(either.left).run()
      }
      return { tag: 'Right', right: either.right } as unknown as Either.Either<L2, R>
    })

/**
 * Applicative ap: apply an EitherAsync function to an EitherAsync value.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param ef - An EitherAsync of a function.
 * @returns A function taking EitherAsync and returning a new EitherAsync.
 */
export const ap = <L, A, B>(
  ef: EitherAsync<L, (a: A) => B>
): ((ea: EitherAsync<L, A>) => EitherAsync<L, B>) =>
  (ea) =>
    EitherAsync(async () => {
      const [f, a] = await Promise.all([ef.run(), ea.run()])
      return Either.ap(f)(a)
    })

/**
 * Extract the Right value or provide a default.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param r - The default value.
 * @returns A function taking EitherAsync and returning a Promise of the value.
 */
export const getOrElse = <L, R>(r: R): ((ea: EitherAsync<L, R>) => Promise<R>) =>
  (ea) =>
    ea.run().then((either) => Either.getOrElse(r)(either))

/**
 * Extract the Right value or compute from Left.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param f - Function computing the default from Left.
 * @returns A function taking EitherAsync and returning a Promise of the value.
 */
export const getOrElseL = <L, R>(
  f: (l: L) => Promise<R>
): ((ea: EitherAsync<L, R>) => Promise<R>) =>
  (ea) =>
    ea.run().then(async (either) => {
      if (either.tag === 'Right') return either.right
      return f(either.left)
    })

/**
 * Case analysis on EitherAsync.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param onLeft - Function for Left.
 * @param onRight - Function for Right.
 * @returns A function taking EitherAsync and returning Promise of result.
 */
export const fold = <L, R, B>(
  onLeft: (l: L) => Promise<B>,
  onRight: (r: R) => Promise<B>
): ((ea: EitherAsync<L, R>) => Promise<B>) =>
  (ea) =>
    ea.run().then((either) => Either.fold(onLeft, onRight)(either))

/**
 * Swap Left and Right.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param ea - The EitherAsync to swap.
 * @returns A new EitherAsync with Left and Right swapped.
 */
export const swap = <L, R>(ea: EitherAsync<L, R>): EitherAsync<R, L> =>
  EitherAsync(() => ea.run().then((either) => Either.swap(either)))

/**
 * Convert EitherAsync to MaybeAsync, discarding Left.
 * Rejected Promises and thrown exceptions become Left which becomes Nothing; never throws or rejects.
 * @param ea - The EitherAsync to convert.
 * @returns A MaybeAsync that ignores the Left value.
 */
export const toMaybeAsync = <L, R>(
  ea: EitherAsync<L, R>
): MaybeAsyncModule.MaybeAsync<R> => {
  // Dynamic import to avoid circular dependencies
  return {
    tag: 'MaybeAsync',
    run: async () => {
      const either = await ea.run()
      const Maybe = await import('./Maybe.js')
      return either.tag === 'Right'
        ? (Maybe.Just(either.right) as unknown)
        : (Maybe.Nothing as unknown)
    },
  } as unknown as MaybeAsyncModule.MaybeAsync<R>
}

/**
 * All-or-Left: if any EitherAsync is Left, result is Left with the first error.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param eas - Array of EitherAsync.
 * @returns An EitherAsync that is Right of array if all are Right, else the first Left.
 */
export const all = <L, R>(
  eas: readonly EitherAsync<L, R>[]
): EitherAsync<L, readonly R[]> =>
  EitherAsync(async () => {
    const results = await Promise.all(eas.map((ea) => ea.run()))
    const values: R[] = []
    for (const either of results) {
      if (either.tag === 'Left') return either
      values.push(either.right)
    }
    return Either.Right(values)
  })

/**
 * Extract all Left values from an array of EitherAsync.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param eas - Array of EitherAsync.
 * @returns Promise of collected Left values.
 */
export const lefts = <L, R>(
  eas: readonly EitherAsync<L, R>[]
): Promise<readonly L[]> =>
  Promise.all(eas.map((ea) => ea.run())).then((results) =>
    results.flatMap((either) => (either.tag === 'Left' ? [either.left] : []))
  )

/**
 * Extract all Right values from an array of EitherAsync.
 * Rejected Promises and thrown exceptions become Left; never throws or rejects.
 * @param eas - Array of EitherAsync.
 * @returns Promise of collected Right values.
 */
export const rights = <L, R>(
  eas: readonly EitherAsync<L, R>[]
): Promise<readonly R[]> =>
  Promise.all(eas.map((ea) => ea.run())).then((results) =>
    results.flatMap((either) => (either.tag === 'Right' ? [either.right] : []))
  )
