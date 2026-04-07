import { describe, it, expect } from 'vitest'
import * as EitherAsync from '../src/EitherAsync.js'
import * as Either from '../src/Either.js'

describe('EitherAsync', () => {
  describe('construction and execution', () => {
    it('EitherAsync constructs a lazy async computation', async () => {
      let executed = false
      const ea = EitherAsync.EitherAsync(async () => {
        executed = true
        return Either.Right(42)
      })

      expect(executed).toBe(false)
      const result = await ea.run()
      expect(executed).toBe(true)
      expect(result).toEqual(Either.Right(42))
    })
  })

  describe('liftEither', () => {
    it('liftEither converts sync Either to async', async () => {
      const ea = Either.Right(5)
      const eaa = EitherAsync.liftEither(ea)
      const result = await eaa.run()
      expect(result).toEqual(Either.Right(5))
    })

    it('liftEither with Left', async () => {
      const ea = Either.Left('error')
      const eaa = EitherAsync.liftEither(ea)
      const result = await eaa.run()
      expect(result).toEqual(Either.Left('error'))
    })
  })

  describe('fromPromise', () => {
    it('fromPromise lifts a resolved Promise', async () => {
      const p = Promise.resolve(42)
      const eaa = EitherAsync.fromPromise(p, (e) => `Error: ${e}`)
      const result = await eaa.run()
      expect(result).toEqual(Either.Right(42))
    })

    it('fromPromise turns rejected Promise into Left', async () => {
      const p = Promise.reject(new Error('oops'))
      const eaa = EitherAsync.fromPromise(p, () => 'left')
      const result = await eaa.run()
      expect(result).toEqual(Either.Left('left'))
    })

    it('CRITICAL: fromPromise never rejects', async () => {
      const p = Promise.reject(new Error('error'))
      const eaa = EitherAsync.fromPromise(p, () => 'error')
      await expect(eaa.run()).resolves.toBeDefined()
    })
  })

  describe('tryCatch', () => {
    it('tryCatch captures successful Promise', async () => {
      const f = () => Promise.resolve(10)
      const eaa = EitherAsync.tryCatch(f, () => 'error')
      const result = await eaa.run()
      expect(result).toEqual(Either.Right(10))
    })

    it('tryCatch handles rejected Promise', async () => {
      const f = () => Promise.reject(new Error('fail'))
      const eaa = EitherAsync.tryCatch(f, () => 'caught')
      const result = await eaa.run()
      expect(result).toEqual(Either.Left('caught'))
    })
  })

  describe('map and mapLeft', () => {
    it('map transforms the Right value', async () => {
      const eaa = EitherAsync.liftEither(Either.Right(5))
      const mapped = EitherAsync.map((x) => x * 2)(eaa)
      const result = await mapped.run()
      expect(result).toEqual(Either.Right(10))
    })

    it('map with Left', async () => {
      const eaa = EitherAsync.liftEither(Either.Left('error'))
      const mapped = EitherAsync.map((x: number) => x * 2)(eaa)
      const result = await mapped.run()
      expect(result).toEqual(Either.Left('error'))
    })

    it('mapLeft transforms the Left value', async () => {
      const eaa = EitherAsync.liftEither(Either.Left('error'))
      const mapped = EitherAsync.mapLeft((e: string) => e.toUpperCase())(eaa)
      const result = await mapped.run()
      expect(result).toEqual(Either.Left('ERROR'))
    })
  })

  describe('chain', () => {
    it('chain flattens nested EitherAsync', async () => {
      const eaa = EitherAsync.liftEither(Either.Right(5))
      const chained = EitherAsync.chain((x) =>
        EitherAsync.liftEither(Either.Right(x * 2))
      )(eaa)
      const result = await chained.run()
      expect(result).toEqual(Either.Right(10))
    })

    it('chain short-circuits on Left', async () => {
      const eaa = EitherAsync.liftEither(Either.Left('error'))
      let called = false
      const chained = EitherAsync.chain((_) => {
        called = true
        return EitherAsync.liftEither(Either.Right(0))
      })(eaa)
      const result = await chained.run()
      expect(called).toBe(false)
      expect(result).toEqual(Either.Left('error'))
    })
  })

  describe('getOrElse', () => {
    it('getOrElse returns Right value', async () => {
      const eaa = EitherAsync.liftEither(Either.Right(42))
      const result = await EitherAsync.getOrElse(0)(eaa)
      expect(result).toBe(42)
    })

    it('getOrElse returns default for Left', async () => {
      const eaa = EitherAsync.liftEither(Either.Left('error'))
      const result = await EitherAsync.getOrElse(99)(eaa)
      expect(result).toBe(99)
    })
  })

  describe('fold', () => {
    it('fold calls onRight for Right', async () => {
      const eaa = EitherAsync.liftEither(Either.Right(5))
      const result = await EitherAsync.fold(
        (_e: string) => Promise.resolve('left'),
        (x) => Promise.resolve(`right: ${x}`)
      )(eaa)
      expect(result).toBe('right: 5')
    })

    it('fold calls onLeft for Left', async () => {
      const eaa = EitherAsync.liftEither(Either.Left('error'))
      const result = await EitherAsync.fold(
        (e: string) => Promise.resolve(`left: ${e}`),
        (_x: number) => Promise.resolve('right')
      )(eaa)
      expect(result).toBe('left: error')
    })
  })

  describe('swap', () => {
    it('swap exchanges Left and Right', async () => {
      const eaa = EitherAsync.liftEither(Either.Right(42))
      const result = await EitherAsync.swap(eaa).run()
      expect(result.tag).toBe('Left')
    })
  })

  describe('all', () => {
    it('all succeeds if all are Right', async () => {
      const eas = [
        EitherAsync.liftEither(Either.Right(1)),
        EitherAsync.liftEither(Either.Right(2)),
      ]
      const result = await EitherAsync.all(eas).run()
      expect(result).toEqual(Either.Right([1, 2]))
    })

    it('all returns first Left if any is Left', async () => {
      const eas = [
        EitherAsync.liftEither(Either.Right(1)),
        EitherAsync.liftEither(Either.Left('error1')),
        EitherAsync.liftEither(Either.Left('error2')),
      ]
      const result = await EitherAsync.all(eas).run()
      expect(result).toEqual(Either.Left('error1'))
    })
  })

  describe('lefts and rights', () => {
    it('lefts extracts all Left values', async () => {
      const eas = [
        EitherAsync.liftEither(Either.Right(1)),
        EitherAsync.liftEither(Either.Left('e1')),
        EitherAsync.liftEither(Either.Right(2)),
        EitherAsync.liftEither(Either.Left('e2')),
      ]
      const result = await EitherAsync.lefts(eas)
      expect(result).toEqual(['e1', 'e2'])
    })

    it('rights extracts all Right values', async () => {
      const eas = [
        EitherAsync.liftEither(Either.Right(1)),
        EitherAsync.liftEither(Either.Left('e1')),
        EitherAsync.liftEither(Either.Right(2)),
        EitherAsync.liftEither(Either.Left('e2')),
      ]
      const result = await EitherAsync.rights(eas)
      expect(result).toEqual([1, 2])
    })
  })
})
