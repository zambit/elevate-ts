import { describe, it, expect } from 'vitest'
import * as Fn from '../src/Function.js'

describe('Function', () => {
  describe('identity', () => {
    it('returns its input unchanged', () => {
      expect(Fn.identity(5)).toBe(5)
      expect(Fn.identity('hello')).toBe('hello')
      const obj = { x: 10 }
      expect(Fn.identity(obj)).toBe(obj)
    })
  })

  describe('constant', () => {
    it('returns a function that always returns the same value', () => {
      const alwaysFive = Fn.constant(5)
      expect(alwaysFive()).toBe(5)
      expect(alwaysFive()).toBe(5)
    })

    it('ignores input to the constant function', () => {
      const alwaysHello = Fn.constant('hello')
      const f = (x: unknown) => alwaysHello()
      expect(f(1)).toBe('hello')
      expect(f(undefined)).toBe('hello')
    })
  })

  describe('flip', () => {
    it('reverses argument order', () => {
      const sub = (a: number, b: number) => a - b
      const flipped = Fn.flip(sub)
      expect(sub(5, 3)).toBe(2)
      expect(flipped(5, 3)).toBe(-2)
    })

    it('flip works with string functions', () => {
      const concat = (a: string, b: string) => a + b
      const flipped = Fn.flip(concat)
      expect(concat('hello', ' world')).toBe('hello world')
      expect(flipped(' world', 'hello')).toBe('hello world')
    })
  })

  describe('pipe (arity 1-10)', () => {
    it('pipe with arity 1', () => {
      const double = (x: number) => x * 2
      const result = Fn.pipe(5, double)
      expect(result).toBe(10)
    })

    it('pipe with arity 2', () => {
      const double = (x: number) => x * 2
      const add3 = (x: number) => x + 3
      const result = Fn.pipe(5, double, add3)
      expect(result).toBe(13)
    })

    it('pipe with arity 3', () => {
      const double = (x: number) => x * 2
      const add3 = (x: number) => x + 3
      const square = (x: number) => x * x
      const result = Fn.pipe(5, double, add3, square)
      expect(result).toBe(169) // ((5 * 2) + 3)^2
    })

    it('pipe with arity 4', () => {
      const f1 = (x: number) => x + 1
      const f2 = (x: number) => x * 2
      const f3 = (x: number) => x - 5
      const f4 = (x: number) => x / 2
      const result = Fn.pipe(10, f1, f2, f3, f4)
      expect(result).toBe(8.5) // ((10 + 1) * 2 - 5) / 2
    })

    it('pipe with arity 5', () => {
      const f1 = (x: number) => x + 1
      const f2 = (x: number) => x * 2
      const f3 = (x: number) => x - 1
      const f4 = (x: number) => x / 2
      const f5 = (x: number) => x + 10
      const result = Fn.pipe(5, f1, f2, f3, f4, f5)
      expect(result).toBe(15.5) // (((5 + 1) * 2 - 1) / 2) + 10
    })

    it('pipe with string transformations', () => {
      const upper = (s: string) => s.toUpperCase()
      const exclaim = (s: string) => s + '!'
      const result = Fn.pipe('hello', upper, exclaim)
      expect(result).toBe('HELLO!')
    })

    it('pipe with higher arities', () => {
      const a1 = (x: number) => x + 1
      const a2 = (x: number) => x * 2
      const a3 = (x: number) => x - 1
      const a4 = (x: number) => x / 2
      const a5 = (x: number) => x + 5
      const a6 = (x: number) => x * 3
      const result = Fn.pipe(5, a1, a2, a3, a4, a5, a6)
      expect(result).toBe(31.5) // ((((5 + 1) * 2 - 1) / 2) + 5) * 3
    })
  })

  describe('flow (arity 1-10)', () => {
    it('flow with arity 1', () => {
      const double = (x: number) => x * 2
      const f = Fn.flow(double)
      expect(f(5)).toBe(10)
    })

    it('flow with arity 2', () => {
      const double = (x: number) => x * 2
      const add3 = (x: number) => x + 3
      const f = Fn.flow(double, add3)
      expect(f(5)).toBe(13)
    })

    it('flow with arity 3', () => {
      const double = (x: number) => x * 2
      const add3 = (x: number) => x + 3
      const square = (x: number) => x * x
      const f = Fn.flow(double, add3, square)
      expect(f(5)).toBe(169)
    })

    it('flow with arity 4', () => {
      const f1 = (x: number) => x + 1
      const f2 = (x: number) => x * 2
      const f3 = (x: number) => x - 5
      const f4 = (x: number) => x / 2
      const f = Fn.flow(f1, f2, f3, f4)
      expect(f(10)).toBe(8.5)
    })

    it('flow returns a composable function', () => {
      const double = (x: number) => x * 2
      const addTen = (x: number) => x + 10
      const f = Fn.flow(double, addTen)

      expect(f(5)).toBe(20)
      expect(f(10)).toBe(30)
      expect(f(0)).toBe(10)
    })

    it('flow can be composed with other flows', () => {
      const double = (x: number) => x * 2
      const addThree = (x: number) => x + 3
      const f1 = Fn.flow(double, addThree)
      const f2 = Fn.flow(f1, (x) => x * 2)
      expect(f2(5)).toBe(26) // ((5 * 2) + 3) * 2
    })

    it('flow with higher arities', () => {
      const a1 = (x: number) => x + 1
      const a2 = (x: number) => x * 2
      const a3 = (x: number) => x - 1
      const a4 = (x: number) => x / 2
      const a5 = (x: number) => x + 5
      const a6 = (x: number) => x * 3
      const f = Fn.flow(a1, a2, a3, a4, a5, a6)
      expect(f(5)).toBe(31.5)
    })
  })

  describe('curry2', () => {
    it('curries a binary function', () => {
      const add = (a: number, b: number) => a + b
      const curriedAdd = Fn.curry2(add)
      expect(curriedAdd(5)(3)).toBe(8)
    })

    it('partial application with curry2', () => {
      const sub = (a: number, b: number) => a - b
      const curriedSub = Fn.curry2(sub)
      const sub5 = curriedSub(5)
      expect(sub5(3)).toBe(2)
      expect(sub5(1)).toBe(4)
    })
  })

  describe('curry3', () => {
    it('curries a ternary function', () => {
      const sum = (a: number, b: number, c: number) => a + b + c
      const curriedSum = Fn.curry3(sum)
      expect(curriedSum(1)(2)(3)).toBe(6)
    })

    it('partial application with curry3', () => {
      const combine = (a: string, b: string, c: string) => a + b + c
      const curriedCombine = Fn.curry3(combine)
      const withHello = curriedCombine('hello')
      const withSpace = withHello(' ')
      expect(withSpace('world')).toBe('hello world')
    })
  })

  describe('curry4', () => {
    it('curries a 4-argument function', () => {
      const sum = (a: number, b: number, c: number, d: number) => a + b + c + d
      const curriedSum = Fn.curry4(sum)
      expect(curriedSum(1)(2)(3)(4)).toBe(10)
    })

    it('partial application with curry4', () => {
      const f = (a: number, b: number, c: number, d: number) => a * b + c - d
      const curriedF = Fn.curry4(f)
      const withA = curriedF(2)
      const withB = withA(3)
      const withC = withB(10)
      expect(withC(1)).toBe(15) // 2 * 3 + 10 - 1
    })
  })

  describe('memoize', () => {
    it('caches results for the same input', () => {
      let callCount = 0
      const expensive = (x: number) => {
        callCount++
        return x * 2
      }
      const memoized = Fn.memoize(expensive)

      expect(memoized(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(memoized(5)).toBe(10)
      expect(callCount).toBe(1) // not called again

      expect(memoized(6)).toBe(12)
      expect(callCount).toBe(2)
    })

    it('memoize works with objects (identity-based)', () => {
      let callCount = 0
      const getId = (obj: { id: number }) => {
        callCount++
        return obj.id
      }
      const memoized = Fn.memoize(getId)

      const obj1 = { id: 1 }
      const obj2 = { id: 1 }

      memoized(obj1)
      expect(callCount).toBe(1)

      memoized(obj1) // same object
      expect(callCount).toBe(1)

      memoized(obj2) // different object with same value
      expect(callCount).toBe(2)
    })
  })

  describe('once', () => {
    it('executes function only once, caches result', () => {
      let callCount = 0
      const f = (x: number) => {
        callCount++
        return x * 2
      }
      const onceF = Fn.once(f)

      expect(onceF(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(onceF(10)).toBe(10) // returns cached result, ignores new input
      expect(callCount).toBe(1)

      expect(onceF(100)).toBe(10)
      expect(callCount).toBe(1)
    })

    it('once with side effects', () => {
      let sideEffectCount = 0
      const withEffect = (x: number) => {
        sideEffectCount++
        return x
      }
      const onceEffect = Fn.once(withEffect)

      onceEffect(1)
      expect(sideEffectCount).toBe(1)

      onceEffect(2)
      expect(sideEffectCount).toBe(1)
    })
  })

  describe('tap', () => {
    it('executes side effect and passes value through', () => {
      let sideEffect = ''
      const tapFn = Fn.tap((x: number) => {
        sideEffect = `saw ${x}`
      })

      const result = tapFn(5)
      expect(result).toBe(5)
      expect(sideEffect).toBe('saw 5')
    })

    it('tap in a pipeline', () => {
      const logs: number[] = []
      const logger = Fn.tap((x: number) => logs.push(x))

      const f = (x: number) => x + 1
      const g = (x: number) => x * 2

      const result = Fn.pipe(5, f, logger, g)
      expect(result).toBe(12) // (5 + 1) * 2
      expect(logs).toEqual([6]) // logged the value after f
    })

    it('multiple taps in sequence', () => {
      const logs: string[] = []
      const tap1 = Fn.tap((x: number) => logs.push(`tap1: ${x}`))
      const tap2 = Fn.tap((x: number) => logs.push(`tap2: ${x}`))

      const f = (x: number) => x * 2
      Fn.pipe(5, f, tap1, tap2)

      expect(logs).toEqual(['tap1: 10', 'tap2: 10'])
    })
  })

  describe('composition examples', () => {
    it('complex pipeline with various function types', () => {
      const double = (x: number) => x * 2
      const addFive = (x: number) => x + 5
      const toString = (x: number) => `Result: ${x}`

      const result = Fn.pipe(3, double, addFive, toString)
      expect(result).toBe('Result: 11')
    })

    it('flow composed with pipe', () => {
      const add1 = (x: number) => x + 1
      const mul2 = (x: number) => x * 2
      const composed = Fn.flow(add1, mul2)

      const result = Fn.pipe(5, composed, (x) => x + 10)
      expect(result).toBe(22) // ((5 + 1) * 2) + 10
    })

    it('curry and flow together', () => {
      const add = (a: number, b: number) => a + b
      const curriedAdd = Fn.curry2(add)
      const addFive = curriedAdd(5)

      const double = (x: number) => x * 2
      const result = Fn.pipe(3, double, addFive)
      expect(result).toBe(11)
    })
  })
})
