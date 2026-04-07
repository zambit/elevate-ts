import { State } from 'elevate-ts'

export interface CounterState {
  readonly current: number
  readonly history: readonly number[]
}

const initialState: CounterState = {
  current: 0,
  history: []
}

/**
 * Increment the counter by the given amount.
 * Records previous value in history for undo.
 */
export const increment = (amount: number): State.State<CounterState, number> =>
  State.State((s) => {
    const newState: CounterState = {
      current: s.current + amount,
      history: [...s.history, s.current]
    }
    return [newState, newState.current]
  })

/**
 * Decrement the counter by the given amount.
 * Records previous value in history for undo.
 */
export const decrement = (amount: number): State.State<CounterState, number> =>
  State.State((s) => {
    const newState: CounterState = {
      current: s.current - amount,
      history: [...s.history, s.current]
    }
    return [newState, newState.current]
  })

/**
 * Undo to the previous value in history.
 * Returns the restored value or current if no history.
 */
export const undo = (): State.State<CounterState, number> =>
  State.State((s) => {
    if (s.history.length === 0) {
      return [s, s.current]
    }

    const lastIndex = s.history.length - 1
    const restoredValue = s.history[lastIndex]
    const newState: CounterState = {
      current: restoredValue,
      history: s.history.slice(0, lastIndex)
    }

    return [newState, newState.current]
  })

/**
 * Reset counter to initial state (0, no history).
 */
export const reset = (): State.State<CounterState, void> =>
  State.State(() => [initialState, undefined])

/**
 * Get the current counter value without modifying state.
 */
export const getCurrent = (): State.State<CounterState, number> =>
  State.State((s) => [s, s.current])

/**
 * Get the complete state without modifying it.
 */
export const getState = (): State.State<CounterState, CounterState> =>
  State.State((s) => [s, s])

/**
 * Helper to run a state operation starting from initial state.
 */
export const runOperation = (
  operation: State.State<CounterState, any>,
  startState: CounterState = initialState
): [CounterState, any] => operation.run(startState)
