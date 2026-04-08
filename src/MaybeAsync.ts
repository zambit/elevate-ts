// MaybeAsync — Lazy Async Maybe

import type * as EitherAsyncModule from './EitherAsync.js'
import * as Maybe from './Maybe.js'

/**
 * Lazy async Maybe: wraps Promise<Maybe<A>>.
 * Critical: Any rejected Promise or thrown error becomes Nothing; never rejects.
 */
export type MaybeAsync<A> = {
  readonly tag: 'MaybeAsync'
  readonly run: () => Promise<Maybe.Maybe<A>>
}

/**
 * Construct a MaybeAsync from a lazy computation.
 * @param run - A function returning Promise<Maybe<A>>.
 * @returns A MaybeAsync that encapsulates the computation.
 */
export const MaybeAsync = <A>(
  run: () => Promise<Maybe.Maybe<A>>
): MaybeAsync<A> => ({ tag: 'MaybeAsync', run })

/**
 * Lift a synchronous Maybe into MaybeAsync.
 * @param ma - The synchronous Maybe.
 * @returns A MaybeAsync that immediately resolves to the Maybe.
 */
export const liftMaybe = <A>(ma: Maybe.Maybe<A>): MaybeAsync<A> =>
  MaybeAsync(() => Promise.resolve(ma))

/**
 * Lift a Promise into MaybeAsync.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param p - The Promise to lift.
 * @returns A MaybeAsync that resolves to Just the value or Nothing on error.
 */
export const fromPromise = <A>(p: Promise<A>): MaybeAsync<A> =>
  MaybeAsync(() =>
    p.then((a) => Maybe.Just(a)).catch(() => Maybe.Nothing)
  )

/**
 * Wrap an async function with error handling.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param f - An async function.
 * @returns A MaybeAsync that captures the result or Nothing on error.
 */
export const tryCatch = <A>(f: () => Promise<A>): MaybeAsync<A> =>
  MaybeAsync(() =>
    Promise.resolve().then(() => f()).then((a) => Maybe.Just(a)).catch(() => Maybe.Nothing)
  )

/**
 * Functor map over the value.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param f - Function to transform the value.
 * @returns A function taking MaybeAsync and returning a new MaybeAsync.
 */
export const map = <A, B>(
  f: (a: A) => B
): ((ma: MaybeAsync<A>) => MaybeAsync<B>) =>
  (ma) =>
    MaybeAsync(() =>
      ma.run().then((maybe) => Maybe.map(f)(maybe))
    )

/**
 * Monadic bind: sequentially compose MaybeAsync computations.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param f - Function that returns a MaybeAsync.
 * @returns A function taking MaybeAsync and returning a flattened MaybeAsync.
 */
export const chain = <A, B>(
  f: (a: A) => MaybeAsync<B>
): ((ma: MaybeAsync<A>) => MaybeAsync<B>) =>
  (ma) =>
    MaybeAsync(async () => {
      const maybe = await ma.run()
      if (maybe.tag === 'Just') {
        return f(maybe.value).run()
      }
      return Maybe.Nothing
    })

/**
 * Applicative ap: apply a MaybeAsync function to a MaybeAsync value.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param mf - A MaybeAsync of a function.
 * @returns A function taking MaybeAsync and returning a new MaybeAsync.
 */
export const ap = <A, B>(
  mf: MaybeAsync<(a: A) => B>
): ((ma: MaybeAsync<A>) => MaybeAsync<B>) =>
  (ma) =>
    MaybeAsync(async () => {
      const [f, a] = await Promise.all([mf.run(), ma.run()])
      return Maybe.ap(f)(a)
    })

/**
 * Alt: use alternative MaybeAsync if first is Nothing.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param alt_ma - The alternative MaybeAsync.
 * @returns A function taking the primary MaybeAsync.
 */
export const alt = <A>(
  alt_ma: MaybeAsync<A>
): ((ma: MaybeAsync<A>) => MaybeAsync<A>) =>
  (ma) =>
    MaybeAsync(async () => {
      const maybe = await ma.run()
      if (maybe.tag === 'Just') return maybe
      return alt_ma.run()
    })

/**
 * Keep the value if predicate holds, otherwise Nothing.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param predicate - The predicate to test.
 * @returns A function taking MaybeAsync and returning filtered MaybeAsync.
 */
export const filter = <A>(
  predicate: (a: A) => boolean
): ((ma: MaybeAsync<A>) => MaybeAsync<A>) =>
  (ma) =>
    MaybeAsync(() =>
      ma.run().then((maybe) => Maybe.filter(predicate)(maybe))
    )

/**
 * Extract the value or provide a default.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param a - The default value.
 * @returns A function taking MaybeAsync and returning a Promise of the value.
 */
export const getOrElse = <A>(a: A): ((ma: MaybeAsync<A>) => Promise<A>) =>
  (ma) =>
    ma.run().then((maybe) => Maybe.getOrElse(a)(maybe))

/**
 * Extract the value or compute a default lazily.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param f - A function computing the default.
 * @returns A function taking MaybeAsync and returning a Promise of the value.
 */
export const getOrElseL = <A>(
  f: () => Promise<A>
): ((ma: MaybeAsync<A>) => Promise<A>) =>
  (ma) =>
    ma.run().then(async (maybe) => {
      if (maybe.tag === 'Just') return maybe.value
      return f()
    })

/**
 * Convert MaybeAsync to EitherAsync.
 * Any rejected Promise or thrown error becomes Nothing which becomes Left; never rejects.
 * @param onNothing - The Left value if Nothing.
 * @returns A function taking MaybeAsync and returning EitherAsync.
 */
export const toEitherAsync = <E, A>(
  onNothing: E
): ((ma: MaybeAsync<A>) => EitherAsyncModule.EitherAsync<E, A>) =>
  (ma) => {
    // Dynamic import to avoid circular dependencies
    return {
      tag: 'EitherAsync',
      run: async () => {
        const maybe = await ma.run()
        const Either = (await import('./Either.js')) as typeof import('./Either')
        return maybe.tag === 'Just'
          ? Either.Right(maybe.value)
          : Either.Left(onNothing)
      },
    } as EitherAsyncModule.EitherAsync<E, A>
  }

/**
 * Case analysis on MaybeAsync.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param onNothing - Value for Nothing.
 * @param onJust - Function for Just value.
 * @returns A function taking MaybeAsync and returning Promise of result.
 */
export const fold = <A, B>(
  onNothing: B,
  onJust: (a: A) => Promise<B>
): ((ma: MaybeAsync<A>) => Promise<B>) =>
  (ma) =>
    ma.run().then(async (maybe) => {
      if (maybe.tag === 'Just') return onJust(maybe.value)
      return onNothing
    })

/**
 * Collect Just values from an array of MaybeAsync.
 * Rejected Promises and errors are filtered out.
 * @param maybes - Array of MaybeAsync.
 * @returns Promise of collected values.
 */
export const catMaybes = <A>(
  maybes: readonly MaybeAsync<A>[]
): Promise<readonly A[]> =>
  Promise.all(maybes.map((m) => m.run())).then((results) =>
    results.flatMap((maybe) => (maybe.tag === 'Just' ? [maybe.value] : []))
  )

/**
 * All-or-Nothing: if any MaybeAsync is Nothing, result is Nothing.
 * Any rejected Promise or thrown error becomes Nothing; never rejects.
 * @param maybes - Array of MaybeAsync.
 * @returns A MaybeAsync that is Just of array if all are Just, else Nothing.
 */
export const all = <A>(maybes: readonly MaybeAsync<A>[]): MaybeAsync<A[]> =>
  MaybeAsync(async () => {
    const results = await Promise.all(maybes.map((m) => m.run()))
    const values: A[] = []
    for (const maybe of results) {
      if (maybe.tag === 'Nothing') return Maybe.Nothing
      values.push(maybe.value)
    }
    return Maybe.Just(values)
  })
