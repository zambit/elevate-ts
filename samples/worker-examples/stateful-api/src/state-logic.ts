import { State } from 'elevate-ts'
import type { CounterState } from './types.js'

/**
 * Initialize counter state
 */
export const initialState: CounterState = {
  value: 0,
  timestamp: Date.now(),
  increments: 0
}

/**
 * Increment counter by given amount
 */
export const increment = (amount: number): State.State<CounterState, CounterState> =>
  State.State((state) => {
    const newState: CounterState = {
      value: state.value + amount,
      timestamp: Date.now(),
      increments: state.increments + 1
    }
    return [newState, newState]
  })

/**
 * Decrement counter by given amount
 */
export const decrement = (amount: number): State.State<CounterState, CounterState> =>
  State.State((state) => {
    const newState: CounterState = {
      value: state.value - amount,
      timestamp: Date.now(),
      increments: state.increments + 1
    }
    return [newState, newState]
  })

/**
 * Reset counter to initial state
 */
export const reset = (): State.State<CounterState, CounterState> =>
  State.State(() => {
    const newState: CounterState = {
      value: 0,
      timestamp: Date.now(),
      increments: 0
    }
    return [newState, newState]
  })

/**
 * Get current state without modification
 */
export const getState = (): State.State<CounterState, CounterState> =>
  State.State((state) => [state, state])

/**
 * Add delta to counter (can be negative)
 */
export const addDelta = (delta: number): State.State<CounterState, CounterState> =>
  State.State((state) => {
    const newState: CounterState = {
      value: state.value + delta,
      timestamp: Date.now(),
      increments: state.increments + 1
    }
    return [newState, newState]
  })
