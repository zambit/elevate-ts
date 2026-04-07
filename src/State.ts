// State — Pure Stateful Computation

/** Represents a State computation: a pure function (s: S) => readonly [A, S]. */
export type State<S, A> = { readonly tag: 'State'; readonly run: (s: S) => readonly [A, S] }

/**
 * Construct a State from a function.
 * @param run - The function that computes a value and new state.
 * @returns A State that encapsulates the computation.
 */
export const State = <S, A>(run: (s: S) => readonly [A, S]): State<S, A> => ({
  tag: 'State',
  run,
})

/**
 * Retrieve the current state.
 * @returns A State that returns the state as its value.
 */
export const get = <S>(): State<S, S> => State((s) => [s, s])

/**
 * Replace the state.
 * @param s - The new state.
 * @returns A State that replaces the current state and returns void.
 */
export const put = <S>(s: S): State<S, void> => State(() => [undefined, s])

/**
 * Transform the state.
 * @param f - Function to transform the state.
 * @returns A State that applies the transformation and returns void.
 */
export const modify = <S>(f: (s: S) => S): State<S, void> =>
  State((s) => [undefined, f(s)])

/**
 * Retrieve and transform the state.
 * @param f - Function to transform the state.
 * @returns A State that applies the function to the state and returns the result.
 */
export const gets = <S, A>(f: (s: S) => A): State<S, A> =>
  State((s) => [f(s), s])

/**
 * Functor map over the value.
 * @param f - Function to transform the value.
 * @returns A function that takes a State and returns a new State with mapped value.
 */
export const map =
  <A, B>(f: (a: A) => B): (<S>(state: State<S, A>) => State<S, B>) =>
  (state) =>
    State((s) => {
      const [a, s2] = state.run(s)
      return [f(a), s2]
    })

/**
 * Applicative ap: apply a State function to a State value.
 * @param sf - A State containing a function.
 * @returns A function that takes a State and returns a new State with applied function.
 */
export const ap =
  <S, A, B>(sf: State<S, (a: A) => B>): ((sa: State<S, A>) => State<S, B>) =>
  (sa) =>
    State((s) => {
      const [f, s2] = sf.run(s)
      const [a, s3] = sa.run(s2)
      return [f(a), s3]
    })

/**
 * Monadic bind: sequentially compose two State computations.
 * @param f - Function that returns a new State.
 * @returns A function that takes a State and returns a new State.
 */
export const chain =
  <S, A, B>(f: (a: A) => State<S, B>): ((state: State<S, A>) => State<S, B>) =>
  (state) =>
    State((s) => {
      const [a, s2] = state.run(s)
      return f(a).run(s2)
    })

/**
 * Execute a State computation with an initial state.
 * @param state - The initial state.
 * @returns A function that takes a State and returns the result pair.
 */
export const runState =
  <S, A>(state: S): ((computation: State<S, A>) => readonly [A, S]) =>
  (computation) =>
    computation.run(state)

/**
 * Execute a State computation and extract only the value.
 * @param state - The initial state.
 * @returns A function that takes a State and returns only the value.
 */
export const evalState =
  <S, A>(state: S): ((computation: State<S, A>) => A) =>
  (computation) => {
    const [a] = computation.run(state)
    return a
  }

/**
 * Execute a State computation and extract only the final state.
 * @param state - The initial state.
 * @returns A function that takes a State and returns only the final state.
 */
export const execState =
  <S, A>(state: S): ((computation: State<S, A>) => S) =>
  (computation) => {
    const [, s] = computation.run(state)
    return s
  }

// Fantasy Land symbols
// Note: FL methods excluded to work around vitest coverage serialization issues.
// The core functionality is complete and all point-free functions work correctly.
// TODO: Re-enable Fantasy Land methods when vitest issue is resolved.
//
// const stateProto = Object.getPrototypeOf(State(() => [0, 0]))
// stateProto['fantasy-land/map'] = ...
// etc.
