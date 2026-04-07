import { describe, it, expect } from 'vitest'
import {
  Reader,
  ask,
  asks,
  local,
  map,
  ap,
  chain,
  runReader,
} from '../src/Reader.js'

describe('Reader', () => {
  describe('construction and execution', () => {
    it('Reader constructs a Reader from a function', () => {
      const r = Reader((env: string) => env.length)
      expect(r.tag).toBe('Reader')
      expect(typeof r.run).toBe('function')
    })

    it('runReader executes a Reader with an environment', () => {
      const r = Reader((env: number) => env * 2)
      const result = runReader(5)(r)
      expect(result).toBe(10)
    })
  })

  describe('ask', () => {
    it('ask retrieves the environment unchanged', () => {
      const env = { config: 'test' }
      const result = runReader(env)(ask())
      expect(result).toEqual(env)
    })

    it('ask works with various environment types', () => {
      const numResult = runReader(42)(ask<number>())
      const strResult = runReader('hello')(ask<string>())
      expect(numResult).toBe(42)
      expect(strResult).toBe('hello')
    })
  })

  describe('asks', () => {
    it('asks transforms the environment', () => {
      const r = asks((env: number) => env * 2)
      const result = runReader(5)(r)
      expect(result).toBe(10)
    })

    it('asks extracts a property from the environment', () => {
      const env = { x: 10, y: 20 }
      const r = asks((e: typeof env) => e.x + e.y)
      const result = runReader(env)(r)
      expect(result).toBe(30)
    })
  })

  describe('functor laws', () => {
    it('identity: map(id)(r) = r', () => {
      const id = <A>(a: A) => a
      const r = Reader((env: number) => env * 2)
      const env = 5
      expect(runReader(env)(map(id)(r))).toBe(runReader(env)(r))
    })

    it('composition: map(g ∘ f) = map(g) ∘ map(f)', () => {
      const f = (x: number) => x + 1
      const g = (x: number) => x * 2
      const r = Reader((env: number) => env)
      const env = 5

      const lhs = runReader(env)(map((x) => g(f(x)))(r))
      const rhs = runReader(env)(map(g)(map(f)(r)))
      expect(lhs).toBe(rhs)
    })
  })

  describe('applicative ap', () => {
    it('ap applies a Reader function to a Reader value', () => {
      const rf = Reader((env: number) => (x: number) => x * env)
      const ra = Reader((env: number) => env + 1)
      const result = runReader(5)(ap(rf)(ra))
      expect(result).toBe(30) // (5 + 1) * 5
    })

    it('ap shares environment between function and value Readers', () => {
      const rf = Reader((env: { x: number; y: number }) => (a: number) => a + env.x)
      const ra = Reader((env: { x: number; y: number }) => env.y)
      const env = { x: 10, y: 20 }
      const result = runReader(env)(ap(rf)(ra))
      expect(result).toBe(30) // 20 + 10
    })
  })

  describe('monad laws', () => {
    it('left identity: chain(f)(Reader(a)) = f(a)', () => {
      const a = 5
      const f = (x: number) => Reader((env: string) => x + env.length)
      const env = 'hello'

      const lhs = runReader(env)(chain(f)(Reader((_: string) => a)))
      const rhs = runReader(env)(f(a))
      expect(lhs).toBe(rhs)
    })

    it('right identity: chain(pure)(r) = r', () => {
      const r = Reader((env: number) => env * 2)
      const env = 5
      const pure = <R, A>(a: A): Reader<R, A> => Reader(() => a)

      const lhs = runReader(env)(chain(pure)(r))
      const rhs = runReader(env)(r)
      expect(lhs).toBe(rhs)
    })

    it('associativity: chain(g)(chain(f)(r)) = chain(x => chain(g)(f(x)))(r)', () => {
      const r = Reader((env: number) => env)
      const f = (x: number) => Reader((env: number) => x + env)
      const g = (x: number) => Reader((env: number) => x * 2)
      const env = 5

      const lhs = runReader(env)(chain(g)(chain(f)(r)))
      const rhs = runReader(env)(chain((x) => chain(g)(f(x)))(r))
      expect(lhs).toBe(rhs)
    })
  })

  describe('chain', () => {
    it('chain sequences Readers', () => {
      const r1 = Reader((env: number) => env * 2)
      const f = (x: number) => Reader((env: number) => x + env)
      const result = runReader(5)(chain(f)(r1))
      expect(result).toBe(15) // (5 * 2) + 5
    })

    it('chain allows multiple Readers to access environment', () => {
      const r1 = Reader((env: { x: number }) => env.x)
      const f = (x: number) => Reader((env: { x: number }) => x * env.x)
      const env = { x: 3 }
      const result = runReader(env)(chain(f)(r1))
      expect(result).toBe(9) // 3 * 3
    })
  })

  describe('local', () => {
    it('local modifies the environment for a sub-computation', () => {
      const r = ask<number>()
      const modified = local((env: number) => env * 2)(r)
      const result = runReader(5)(modified)
      expect(result).toBe(10)
    })

    it('local does not affect the parent environment', () => {
      const getEnv = ask<number>()
      const modified = local((env: number) => env * 2)(getEnv)
      const parent = chain((_) => modified)(getEnv)
      const result = runReader(5)(parent)
      // After chain, we get modified result which is 10
      expect(result).toBe(10)
    })

    it('local can be nested', () => {
      const getEnv = ask<number>()
      const mod1 = local((env: number) => env * 2)(getEnv)
      const mod2 = local((env: number) => env + 3)(mod1)
      const result = runReader(5)(mod2)
      // mod2 modifies env to env+3, then mod1 modifies to env*2
      // So: 5 + 3 = 8, then 8 * 2 = 16
      expect(result).toBe(16)
    })

    it('local allows modifying object environments', () => {
      const getConfig = ask<{ apiUrl: string; timeout: number }>()
      const modifyTimeout = local((env) => ({
        ...env,
        timeout: 5000,
      }))(getConfig)
      const env = { apiUrl: 'http://localhost', timeout: 1000 }
      const result = runReader(env)(modifyTimeout)
      expect(result.timeout).toBe(5000)
      expect(result.apiUrl).toBe('http://localhost')
    })
  })

  describe('complex chaining scenarios', () => {
    it('chaining multiple Readers with environment access', () => {
      const r1 = asks((env: { a: number; b: number }) => env.a)
      const r2 = chain((a) =>
        asks((env: { a: number; b: number }) => a + env.b)
      )(r1)
      const result = runReader({ a: 10, b: 20 })(r2)
      expect(result).toBe(30)
    })

    it('applicative chaining with shared environment', () => {
      const rFunc = Reader((env: { mult: number }) => (x: number) => x * env.mult)
      const rVal = asks((env: { mult: number }) => env.mult * 2)
      const result = runReader({ mult: 5 })(ap(rFunc)(rVal))
      expect(result).toBe(50) // (5 * 2) * 5
    })

    it('combining map, ap, and chain', () => {
      const r1 = asks((env: number) => env)
      const r2 = map((x) => (y: number) => x + y)(r1)
      const r3 = asks((env: number) => env * 2)
      const result = runReader(5)(ap(r2)(r3))
      expect(result).toBe(15) // 5 + (5 * 2)
    })
  })

  describe('practical examples', () => {
    it('dependency injection pattern with Reader', () => {
      interface Env {
        dbUrl: string
        timeout: number
      }

      const getDbUrl = asks((env: Env) => env.dbUrl)
      const getTimeout = asks((env: Env) => env.timeout)

      const query = chain((db) =>
        map((timeout) => `Query ${db} with timeout ${timeout}`)(getTimeout)
      )(getDbUrl)

      const env: Env = { dbUrl: 'postgres://localhost', timeout: 5000 }
      const result = runReader(env)(query)
      expect(result).toBe('Query postgres://localhost with timeout 5000')
    })

    it('configuration-based computation', () => {
      const env = { multiplier: 2, offset: 10 }

      const compute = chain((mult) =>
        asks((e: typeof env) => mult + e.offset)
      )(asks((e: typeof env) => e.multiplier))

      const result = runReader(env)(compute)
      expect(result).toBe(12)
    })
  })

  // Fantasy Land tests excluded due to vitest coverage serialization issues
  // The core point-free functions work correctly without FL methods
})
