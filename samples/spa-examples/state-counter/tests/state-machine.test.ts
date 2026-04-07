import { describe, it, expect } from 'vitest'
import {
  increment,
  decrement,
  undo,
  reset,
  getCurrent,
  getState,
  runOperation,
  type CounterState
} from '../src/state-machine.js'

describe('State Machine', () => {
  describe('increment', () => {
    it('increases the counter by the given amount', () => {
      const initialState: CounterState = { current: 5, history: [] }
      const [newState, value] = increment(3).run(initialState)

      expect(newState.current).toBe(8)
      expect(value).toBe(8)
    })

    it('records previous value in history', () => {
      const initialState: CounterState = { current: 5, history: [] }
      const [newState] = increment(1).run(initialState)

      expect(newState.history).toContain(5)
      expect(newState.history.length).toBe(1)
    })

    it('preserves existing history', () => {
      const initialState: CounterState = { current: 5, history: [1, 2, 3] }
      const [newState] = increment(1).run(initialState)

      expect(newState.history).toEqual([1, 2, 3, 5])
    })

    it('works with negative increments', () => {
      const initialState: CounterState = { current: 5, history: [] }
      const [newState] = increment(-2).run(initialState)

      expect(newState.current).toBe(3)
    })
  })

  describe('decrement', () => {
    it('decreases the counter by the given amount', () => {
      const initialState: CounterState = { current: 10, history: [] }
      const [newState, value] = decrement(3).run(initialState)

      expect(newState.current).toBe(7)
      expect(value).toBe(7)
    })

    it('records previous value in history', () => {
      const initialState: CounterState = { current: 10, history: [] }
      const [newState] = decrement(1).run(initialState)

      expect(newState.history).toContain(10)
      expect(newState.history.length).toBe(1)
    })

    it('allows going negative', () => {
      const initialState: CounterState = { current: 2, history: [] }
      const [newState] = decrement(5).run(initialState)

      expect(newState.current).toBe(-3)
    })
  })

  describe('undo', () => {
    it('reverts to previous value from history', () => {
      const initialState: CounterState = { current: 10, history: [5, 7] }
      const [newState, value] = undo().run(initialState)

      expect(newState.current).toBe(7)
      expect(value).toBe(7)
    })

    it('removes the restored value from history', () => {
      const initialState: CounterState = { current: 10, history: [5, 7] }
      const [newState] = undo().run(initialState)

      expect(newState.history).toEqual([5])
    })

    it('does nothing if history is empty', () => {
      const initialState: CounterState = { current: 5, history: [] }
      const [newState] = undo().run(initialState)

      expect(newState.current).toBe(5)
      expect(newState.history).toEqual([])
    })

    it('undo multiple times', () => {
      const initialState: CounterState = { current: 10, history: [5, 7, 8] }

      let state = initialState
      state = undo().run(state)[0]
      expect(state.current).toBe(8)
      expect(state.history).toEqual([5, 7])

      state = undo().run(state)[0]
      expect(state.current).toBe(7)
      expect(state.history).toEqual([5])

      state = undo().run(state)[0]
      expect(state.current).toBe(5)
      expect(state.history).toEqual([])
    })
  })

  describe('reset', () => {
    it('resets to initial state', () => {
      const initialState: CounterState = { current: 100, history: [10, 20, 50] }
      const [newState] = reset().run(initialState)

      expect(newState.current).toBe(0)
      expect(newState.history).toEqual([])
    })
  })

  describe('getCurrent', () => {
    it('returns current value without modifying state', () => {
      const initialState: CounterState = { current: 42, history: [1, 2, 3] }
      const [newState, value] = getCurrent().run(initialState)

      expect(value).toBe(42)
      expect(newState).toBe(initialState)
    })
  })

  describe('getState', () => {
    it('returns complete state without modification', () => {
      const initialState: CounterState = { current: 42, history: [1, 2, 3] }
      const [newState, returnedState] = getState().run(initialState)

      expect(returnedState).toEqual(initialState)
      expect(newState).toBe(initialState)
    })
  })

  describe('Sequential operations', () => {
    it('chains increment operations', () => {
      let state: CounterState = { current: 0, history: [] }

      state = increment(5).run(state)[0]
      expect(state.current).toBe(5)
      expect(state.history).toContain(0)

      state = increment(3).run(state)[0]
      expect(state.current).toBe(8)
      expect(state.history).toContain(5)

      state = decrement(2).run(state)[0]
      expect(state.current).toBe(6)
      expect(state.history).toContain(8)
    })

    it('supports typical use case: increment, undo, increment', () => {
      let state: CounterState = { current: 0, history: [] }

      // Increment to 5
      state = increment(5).run(state)[0]
      expect(state.current).toBe(5)

      // Increment to 8
      state = increment(3).run(state)[0]
      expect(state.current).toBe(8)
      expect(state.history).toEqual([0, 5])

      // Undo back to 5
      state = undo().run(state)[0]
      expect(state.current).toBe(5)
      expect(state.history).toEqual([0])

      // Increment to 7
      state = increment(2).run(state)[0]
      expect(state.current).toBe(7)
      expect(state.history).toEqual([0, 5])
    })
  })
})
