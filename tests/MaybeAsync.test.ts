import { describe, it, expect } from 'vitest'
import * as MaybeAsync from '../src/MaybeAsync.js'
import * as Maybe from '../src/Maybe.js'

describe('MaybeAsync', () => {
  describe('construction and execution', () => {
    it('MaybeAsync constructs a lazy async computation', async () => {
      let executed = false
      const ma = MaybeAsync.MaybeAsync(async () => {
        executed = true
        return Maybe.Just(42)
      })

      expect(executed).toBe(false) // not executed yet (lazy)
      const result = await ma.run()
      expect(executed).toBe(true)
      expect(result).toEqual(Maybe.Just(42))
    })
  })

  describe('liftMaybe', () => {
    it('liftMaybe converts sync Maybe to async', async () => {
      const ma = Maybe.Just(5)
      const maa = MaybeAsync.liftMaybe(ma)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Just(5))
    })

    it('liftMaybe with Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Nothing)
    })
  })

  describe('fromPromise', () => {
    it('fromPromise lifts a resolved Promise', async () => {
      const p = Promise.resolve(42)
      const maa = MaybeAsync.fromPromise(p)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Just(42))
    })

    it('fromPromise turns rejected Promise into Nothing', async () => {
      const p = Promise.reject(new Error('oops'))
      const maa = MaybeAsync.fromPromise(p)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Nothing)
    })

    it('CRITICAL: fromPromise never rejects', async () => {
      const p = Promise.reject(new Error('error'))
      const maa = MaybeAsync.fromPromise(p)
      // Should not throw
      const result = await expect(maa.run()).resolves.toBeDefined()
    })
  })

  describe('tryCatch', () => {
    it('tryCatch captures successful Promise', async () => {
      const f = () => Promise.resolve(10)
      const maa = MaybeAsync.tryCatch(f)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Just(10))
    })

    it('tryCatch handles rejected Promise', async () => {
      const f = () => Promise.reject(new Error('fail'))
      const maa = MaybeAsync.tryCatch(f)
      const result = await maa.run()
      expect(result).toEqual(Maybe.Nothing)
    })

    it('tryCatch handles thrown errors', async () => {
      const f = () => {
        throw new Error('thrown')
      }
      const maa = MaybeAsync.tryCatch(() => Promise.resolve().then(() => f() as any))
      const result = await maa.run()
      expect(result).toEqual(Maybe.Nothing)
    })

    it('CRITICAL: tryCatch never rejects', async () => {
      const f = () => Promise.reject(new Error('error'))
      const maa = MaybeAsync.tryCatch(f)
      await expect(maa.run()).resolves.toBeDefined()
    })
  })

  describe('map', () => {
    it('map transforms the value', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(5))
      const mapped = MaybeAsync.map((x) => x * 2)(maa)
      const result = await mapped.run()
      expect(result).toEqual(Maybe.Just(10))
    })

    it('map with Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      const mapped = MaybeAsync.map((x: number) => x * 2)(maa)
      const result = await mapped.run()
      expect(result).toEqual(Maybe.Nothing)
    })

    it('map is lazy', async () => {
      let mapCalled = false
      const maa = MaybeAsync.MaybeAsync(() => {
        mapCalled = false
        return Promise.resolve(Maybe.Just(5))
      })
      const mapped = MaybeAsync.map((x) => {
        mapCalled = true
        return x * 2
      })(maa)

      // map returns a new MaybeAsync but hasn't executed yet
      expect(mapCalled).toBe(false)
      await mapped.run()
      expect(mapCalled).toBe(true)
    })
  })

  describe('chain', () => {
    it('chain flattens nested MaybeAsync', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(5))
      const chained = MaybeAsync.chain((x) =>
        MaybeAsync.liftMaybe(Maybe.Just(x * 2))
      )(maa)
      const result = await chained.run()
      expect(result).toEqual(Maybe.Just(10))
    })

    it('chain short-circuits on Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      let called = false
      const chained = MaybeAsync.chain((_) => {
        called = true
        return MaybeAsync.liftMaybe(Maybe.Just(0))
      })(maa)
      const result = await chained.run()
      expect(called).toBe(false)
      expect(result).toEqual(Maybe.Nothing)
    })
  })

  describe('filter', () => {
    it('filter keeps value if predicate holds', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(5))
      const filtered = MaybeAsync.filter((x: number) => x > 3)(maa)
      const result = await filtered.run()
      expect(result).toEqual(Maybe.Just(5))
    })

    it('filter returns Nothing if predicate fails', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(5))
      const filtered = MaybeAsync.filter((x: number) => x > 10)(maa)
      const result = await filtered.run()
      expect(result).toEqual(Maybe.Nothing)
    })
  })

  describe('getOrElse', () => {
    it('getOrElse returns value for Just', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(42))
      const result = await MaybeAsync.getOrElse(0)(maa)
      expect(result).toBe(42)
    })

    it('getOrElse returns default for Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      const result = await MaybeAsync.getOrElse(99)(maa)
      expect(result).toBe(99)
    })
  })

  describe('getOrElseL', () => {
    it('getOrElseL returns value for Just', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(42))
      const result = await MaybeAsync.getOrElseL(() => Promise.resolve(0))(maa)
      expect(result).toBe(42)
    })

    it('getOrElseL computes default for Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      const result = await MaybeAsync.getOrElseL(() =>
        Promise.resolve(99)
      )(maa)
      expect(result).toBe(99)
    })
  })

  describe('alt', () => {
    it('alt uses alternative if first is Nothing', async () => {
      const ma1 = MaybeAsync.liftMaybe(Maybe.Nothing)
      const ma2 = MaybeAsync.liftMaybe(Maybe.Just(42))
      const result = await MaybeAsync.alt(ma2)(ma1).run()
      expect(result).toEqual(Maybe.Just(42))
    })

    it('alt returns first if it is Just', async () => {
      const ma1 = MaybeAsync.liftMaybe(Maybe.Just(10))
      const ma2 = MaybeAsync.liftMaybe(Maybe.Just(42))
      const result = await MaybeAsync.alt(ma2)(ma1).run()
      expect(result).toEqual(Maybe.Just(10))
    })
  })

  describe('fold', () => {
    it('fold calls onJust for Just', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Just(5))
      const result = await MaybeAsync.fold(
        'nothing',
        (x) => Promise.resolve(`just: ${x}`)
      )(maa)
      expect(result).toBe('just: 5')
    })

    it('fold calls onNothing for Nothing', async () => {
      const maa = MaybeAsync.liftMaybe(Maybe.Nothing)
      const result = await MaybeAsync.fold(
        'nothing',
        (x: number) => Promise.resolve(`just: ${x}`)
      )(maa)
      expect(result).toBe('nothing')
    })
  })

  describe('catMaybes', () => {
    it('catMaybes collects Just values', async () => {
      const maybes = [
        MaybeAsync.liftMaybe(Maybe.Just(1)),
        MaybeAsync.liftMaybe(Maybe.Nothing),
        MaybeAsync.liftMaybe(Maybe.Just(2)),
      ]
      const result = await MaybeAsync.catMaybes(maybes)
      expect(result).toEqual([1, 2])
    })

    it('catMaybes filters out Nothing', async () => {
      const maybes = [
        MaybeAsync.liftMaybe(Maybe.Nothing),
        MaybeAsync.liftMaybe(Maybe.Nothing),
      ]
      const result = await MaybeAsync.catMaybes(maybes)
      expect(result).toEqual([])
    })
  })

  describe('all', () => {
    it('all succeeds if all are Just', async () => {
      const maybes = [
        MaybeAsync.liftMaybe(Maybe.Just(1)),
        MaybeAsync.liftMaybe(Maybe.Just(2)),
      ]
      const result = await MaybeAsync.all(maybes).run()
      expect(result).toEqual(Maybe.Just([1, 2]))
    })

    it('all returns Nothing if any is Nothing', async () => {
      const maybes = [
        MaybeAsync.liftMaybe(Maybe.Just(1)),
        MaybeAsync.liftMaybe(Maybe.Nothing),
      ]
      const result = await MaybeAsync.all(maybes).run()
      expect(result).toEqual(Maybe.Nothing)
    })
  })
})
