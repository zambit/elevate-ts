import { describe, it, expect } from 'vitest'
import { increment, decrement, reset, getState, addDelta, initialState } from '../src/state-logic.js'
import type { CounterState } from '../src/types.js'

describe('State Logic', () => {
  describe('increment', () => {
    it('increases counter by amount', () => {
      const state: CounterState = { value: 5, timestamp: 0, increments: 0 }
      const [newState, result] = increment(3).run(state)

      expect(newState.value).toBe(8)
      expect(result.value).toBe(8)
    })

    it('increments the counter', () => {
      const state: CounterState = { value: 5, timestamp: 0, increments: 2 }
      const [newState] = increment(1).run(state)

      expect(newState.increments).toBe(3)
    })

    it('updates timestamp', () => {
      const state: CounterState = { value: 0, timestamp: 1000, increments: 0 }
      const before = Date.now()
      const [newState] = increment(1).run(state)
      const after = Date.now()

      expect(newState.timestamp).toBeGreaterThanOrEqual(before)
      expect(newState.timestamp).toBeLessThanOrEqual(after)
    })

    it('works with large amounts', () => {
      const state: CounterState = { value: 0, timestamp: 0, increments: 0 }
      const [newState] = increment(1000000).run(state)

      expect(newState.value).toBe(1000000)
    })
  })

  describe('decrement', () => {
    it('decreases counter by amount', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 0 }
      const [newState, result] = decrement(3).run(state)

      expect(newState.value).toBe(7)
      expect(result.value).toBe(7)
    })

    it('allows going negative', () => {
      const state: CounterState = { value: 2, timestamp: 0, increments: 0 }
      const [newState] = decrement(5).run(state)

      expect(newState.value).toBe(-3)
    })

    it('increments counter of operations', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 5 }
      const [newState] = decrement(1).run(state)

      expect(newState.increments).toBe(6)
    })
  })

  describe('reset', () => {
    it('resets to initial state', () => {
      const state: CounterState = { value: 100, timestamp: 5000, increments: 50 }
      const [newState] = reset().run(state)

      expect(newState.value).toBe(0)
      expect(newState.increments).toBe(0)
    })

    it('updates timestamp', () => {
      const state: CounterState = { value: 100, timestamp: 1000, increments: 50 }
      const before = Date.now()
      const [newState] = reset().run(state)
      const after = Date.now()

      expect(newState.timestamp).toBeGreaterThanOrEqual(before)
      expect(newState.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('getState', () => {
    it('returns state without modification', () => {
      const state: CounterState = { value: 42, timestamp: 1000, increments: 5 }
      const [newState, result] = getState().run(state)

      expect(newState).toEqual(state)
      expect(result).toEqual(state)
    })
  })

  describe('addDelta', () => {
    it('adds positive delta', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 0 }
      const [newState] = addDelta(5).run(state)

      expect(newState.value).toBe(15)
    })

    it('adds negative delta', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 0 }
      const [newState] = addDelta(-3).run(state)

      expect(newState.value).toBe(7)
    })

    it('increments operation counter', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 2 }
      const [newState] = addDelta(5).run(state)

      expect(newState.increments).toBe(3)
    })

    it('works with zero delta', () => {
      const state: CounterState = { value: 10, timestamp: 0, increments: 0 }
      const [newState] = addDelta(0).run(state)

      expect(newState.value).toBe(10)
      expect(newState.increments).toBe(1)
    })
  })

  describe('Sequential operations', () => {
    it('chains operations correctly', () => {
      let state: CounterState = { value: 0, timestamp: 0, increments: 0 }

      state = increment(5).run(state)[0]
      expect(state.value).toBe(5)
      expect(state.increments).toBe(1)

      state = increment(3).run(state)[0]
      expect(state.value).toBe(8)
      expect(state.increments).toBe(2)

      state = decrement(2).run(state)[0]
      expect(state.value).toBe(6)
      expect(state.increments).toBe(3)
    })

    it('supports typical workflow', () => {
      let state: CounterState = { value: 0, timestamp: 0, increments: 0 }

      // Increment twice
      state = increment(1).run(state)[0]
      state = increment(1).run(state)[0]
      expect(state.value).toBe(2)
      expect(state.increments).toBe(2)

      // Reset
      state = reset().run(state)[0]
      expect(state.value).toBe(0)
      expect(state.increments).toBe(0)

      // Set via delta
      state = addDelta(100).run(state)[0]
      expect(state.value).toBe(100)
      expect(state.increments).toBe(1)
    })
  })
})
