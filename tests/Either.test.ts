import { describe, it, expect } from 'vitest'
import {
  Left,
  Right,
  Either,
  isLeft,
  isRight,
  fromNullable,
  toNullable,
  fromPredicate,
  toMaybe,
  map,
  mapLeft,
  bimap,
  ap,
  chain,
  chainLeft,
  getOrElse,
  getOrElseL,
  fold,
  swap,
  tryCatch,
  partitionEithers,
  lefts,
  rights,
  sequence,
  traverse,
} from '../src/Either.js'

describe('Either', () => {
  describe('construction and type guards', () => {
    it('Left creates a Left value', () => {
      const l = Left('error')
      expect(l.tag).toBe('Left')
      expect(l.left).toBe('error')
    })

    it('Right creates a Right value', () => {
      const r = Right(5)
      expect(r.tag).toBe('Right')
      expect(r.right).toBe(5)
    })

    it('isLeft identifies Left values', () => {
      expect(isLeft(Left('error'))).toBe(true)
      expect(isLeft(Right(5))).toBe(false)
    })

    it('isRight identifies Right values', () => {
      expect(isRight(Right(5))).toBe(true)
      expect(isRight(Left('error'))).toBe(false)
    })
  })

  describe('nullable lifting', () => {
    it('fromNullable lifts non-null values to Right', () => {
      expect(fromNullable('error')(5)).toEqual(Right(5))
      expect(fromNullable('error')('hello')).toEqual(Right('hello'))
    })

    it('fromNullable handles null and undefined', () => {
      expect(fromNullable('error')(null)).toEqual(Left('error'))
      expect(fromNullable('error')(undefined)).toEqual(Left('error'))
    })

    it('toNullable extracts Right or null', () => {
      expect(toNullable(Right(5))).toBe(5)
      expect(toNullable(Left('error'))).toBe(null)
    })

    it('fromNullable treats 0 as Right (falsy but not null)', () => {
      expect(fromNullable('error')(0)).toEqual(Right(0))
    })

    it('fromNullable treats empty string as Right', () => {
      expect(fromNullable('error')('')).toEqual(Right(''))
    })

    it('fromNullable treats false as Right', () => {
      expect(fromNullable('error')(false)).toEqual(Right(false))
    })

    it('toNullable with Right(0) returns 0 not null', () => {
      expect(toNullable(Right(0))).toBe(0)
    })

    it('toNullable with Right("") returns "" not null', () => {
      expect(toNullable(Right(''))).toBe('')
    })
  })

  describe('predicate lifting', () => {
    it('fromPredicate creates Right if predicate holds', () => {
      const pred = (x: number) => x > 0
      expect(fromPredicate(pred, (x) => `${x} is not positive`)(5)).toEqual(
        Right(5)
      )
    })

    it('fromPredicate creates Left if predicate fails', () => {
      const pred = (x: number) => x > 0
      expect(
        fromPredicate(pred, (x) => `${x} is not positive`)(-5)
      ).toEqual(Left('-5 is not positive'))
    })
  })

  describe('toMaybe', () => {
    it('toMaybe converts Right to Just', () => {
      const result = toMaybe(Right(5))
      expect(result.tag).toBe('Just')
      if (result.tag === 'Just') {
        expect(result.value).toBe(5)
      }
    })

    it('toMaybe converts Left to Nothing', () => {
      const result = toMaybe(Left('error'))
      expect(result.tag).toBe('Nothing')
    })

    it('toMaybe(Right(null)) returns Just(null)', () => {
      const result = toMaybe(Right(null))
      expect(result.tag).toBe('Just')
      if (result.tag === 'Just') {
        expect(result.value).toBe(null)
      }
    })
  })

  describe('functor laws', () => {
    it('identity: map(id)(ea) = ea', () => {
      const id = <A>(a: A) => a
      const r = Right(5)
      const l = Left('error')
      expect(map(id)(r)).toEqual(r)
      expect(map(id)(l)).toEqual(l)
    })

    it('composition: map(g ∘ f) = map(g) ∘ map(f)', () => {
      const f = (x: number) => x + 1
      const g = (x: number) => x * 2
      const ea = Right(5)

      const left = map((x) => g(f(x)))(ea)
      const right = map(g)(map(f)(ea))
      expect(left).toEqual(right)
    })
  })

  describe('applicative', () => {
    it('ap applies wrapped function', () => {
      const ef = Right((x: number) => x + 1)
      const ea = Right(5)
      expect(ap(ef)(ea)).toEqual(Right(6))
    })

    it('ap with Left function returns Left', () => {
      const ef: Either<string, (x: number) => number> = Left('error')
      const ea = Right(5)
      expect(ap(ef)(ea)).toEqual(Left('error'))
    })

    it('ap with Left value returns Left', () => {
      const ef = Right((x: number) => x + 1)
      const ea: Either<string, number> = Left('error')
      expect(ap(ef)(ea)).toEqual(Left('error'))
    })

    it('ap with both Left returns Left from function', () => {
      const ef: Either<string, (x: number) => number> = Left('f-error')
      const ea: Either<string, number> = Left('a-error')
      expect(ap(ef)(ea)).toEqual(Left('f-error'))
    })
  })

  describe('monad laws', () => {
    it('left identity: chain(f)(Right(a)) = f(a)', () => {
      const f = (x: number): Either<string, number> => Right(x + 1)
      const a = 5
      expect(chain(f)(Right(a))).toEqual(f(a))
    })

    it('right identity: chain(Right)(ea) = ea', () => {
      const ea = Right(5)
      expect(chain(Right)(ea)).toEqual(ea)
      expect(chain(Right)(Left('error'))).toEqual(Left('error'))
    })

    it('associativity: chain(g)(chain(f)(ea)) = chain(x => chain(g)(f(x)))(ea)', () => {
      const f = (x: number): Either<string, number> => Right(x + 1)
      const g = (x: number): Either<string, number> => Right(x * 2)
      const ea = Right(5)

      const left = chain(g)(chain(f)(ea))
      const right = chain((x) => chain(g)(f(x)))(ea)
      expect(left).toEqual(right)
    })
  })

  describe('mapLeft and bimap', () => {
    it('mapLeft maps over Left', () => {
      const f = (e: string) => e.toUpperCase()
      expect(mapLeft(f)(Left('error'))).toEqual(Left('ERROR'))
    })

    it('mapLeft ignores Right', () => {
      const f = (e: string) => e.toUpperCase()
      expect(mapLeft(f)(Right(5))).toEqual(Right(5))
    })

    it('bimap maps both Left and Right', () => {
      const f = (e: string) => e.toUpperCase()
      const g = (x: number) => x * 2
      expect(bimap(f, g)(Left('error'))).toEqual(Left('ERROR'))
      expect(bimap(f, g)(Right(5))).toEqual(Right(10))
    })
  })

  describe('chainLeft', () => {
    it('chainLeft chains over Left', () => {
      const f = (e: string): Either<number, string> => Left(e.length)
      expect(chainLeft(f)(Left('error'))).toEqual(Left(5))
    })

    it('chainLeft ignores Right', () => {
      const f = (e: string): Either<number, string> => Left(e.length)
      expect(chainLeft(f)(Right('value'))).toEqual(Right('value'))
    })

    it('chainLeft can recover from Left to Right', () => {
      const f = (e: string): Either<string, number> => Right(e.length)
      expect(chainLeft(f)(Left('error'))).toEqual(Right(5))
    })
  })

  describe('getOrElse and getOrElseL', () => {
    it('getOrElse extracts value from Right', () => {
      expect(getOrElse('default')(Right(5))).toBe(5)
    })

    it('getOrElse returns default for Left', () => {
      expect(getOrElse('default')(Left('error'))).toBe('default')
    })

    it('getOrElseL extracts value from Right without evaluating', () => {
      let evaluated = false
      const result = getOrElseL(() => {
        evaluated = true
        return 'default'
      })(Right(5))
      expect(result).toBe(5)
      expect(evaluated).toBe(false)
    })

    it('getOrElseL evaluates for Left', () => {
      let evaluated = false
      const result = getOrElseL((e: string) => {
        evaluated = true
        return e.length
      })(Left('error'))
      expect(result).toBe(5)
      expect(evaluated).toBe(true)
    })
  })

  describe('fold', () => {
    it('fold applies onLeft for Left', () => {
      expect(fold((e: string) => e.toUpperCase(), (x: number) => x * 2)(
        Left('error')
      )).toBe('ERROR')
    })

    it('fold applies onRight for Right', () => {
      expect(fold((e: string) => e.toUpperCase(), (x: number) => x * 2)(
        Right(5)
      )).toBe(10)
    })

    it('fold where both branches return same type', () => {
      const result1 = fold(
        (e: string) => `error: ${e}`,
        (x: number) => `value: ${x}`
      )(Left('boom'))
      expect(result1).toBe('error: boom')

      const result2 = fold(
        (e: string) => `error: ${e}`,
        (x: number) => `value: ${x}`
      )(Right(42))
      expect(result2).toBe('value: 42')
    })
  })

  describe('swap', () => {
    it('swap exchanges Left and Right', () => {
      expect(swap(Left('error'))).toEqual(Right('error'))
      expect(swap(Right(5))).toEqual(Left(5))
    })

    it('swap round-trip is identity for Left', () => {
      const ea = Left('error')
      expect(swap(swap(ea))).toEqual(ea)
    })

    it('swap round-trip is identity for Right', () => {
      const ea = Right(5)
      expect(swap(swap(ea))).toEqual(ea)
    })
  })

  describe('tryCatch', () => {
    it('tryCatch wraps throwing function', () => {
      const result = tryCatch(
        () => {
          throw new Error('oops')
        },
        (e) => `Caught: ${(e as Error).message}`
      )
      expect(result).toEqual(Left('Caught: oops'))
    })

    it('tryCatch wraps non-throwing function', () => {
      const result = tryCatch(
        () => 42,
        (e) => 'error'
      )
      expect(result).toEqual(Right(42))
    })

    it('tryCatch with non-Error string throw', () => {
      const result = tryCatch(
        () => {
          throw 'oops'
        },
        (e) => String(e)
      )
      expect(result).toEqual(Left('oops'))
    })

    it('tryCatch with non-Error number throw', () => {
      const result = tryCatch(
        () => {
          throw 42
        },
        (e) => (e as number)
      )
      expect(result).toEqual(Left(42))
    })

    it('tryCatch returning Right(0)', () => {
      const result = tryCatch(
        () => 0,
        () => 'error'
      )
      expect(result).toEqual(Right(0))
    })

    it('tryCatch returning Right("")', () => {
      const result = tryCatch(
        () => '',
        () => 'error'
      )
      expect(result).toEqual(Right(''))
    })
  })

  describe('partitionEithers', () => {
    it('partitionEithers separates Lefts and Rights', () => {
      const eithers: Either<string, number>[] = [
        Right(1),
        Left('a'),
        Right(2),
        Left('b'),
        Right(3),
      ]
      const [lts, rts] = partitionEithers(eithers)
      expect(lts).toEqual(['a', 'b'])
      expect(rts).toEqual([1, 2, 3])
    })

    it('partitionEithers with empty array', () => {
      const eithers: Either<string, number>[] = []
      const [lts, rts] = partitionEithers(eithers)
      expect(lts).toEqual([])
      expect(rts).toEqual([])
    })

    it('partitionEithers with all Lefts', () => {
      const eithers: Either<string, number>[] = [Left('a'), Left('b')]
      const [lts, rts] = partitionEithers(eithers)
      expect(lts).toEqual(['a', 'b'])
      expect(rts).toEqual([])
    })

    it('partitionEithers with all Rights', () => {
      const eithers: Either<string, number>[] = [Right(1), Right(2)]
      const [lts, rts] = partitionEithers(eithers)
      expect(lts).toEqual([])
      expect(rts).toEqual([1, 2])
    })
  })

  describe('lefts', () => {
    it('lefts extracts all Lefts', () => {
      const eithers: Either<string, number>[] = [
        Right(1),
        Left('a'),
        Right(2),
        Left('b'),
      ]
      expect(lefts(eithers)).toEqual(['a', 'b'])
    })

    it('lefts with empty array', () => {
      const eithers: Either<string, number>[] = []
      expect(lefts(eithers)).toEqual([])
    })

    it('lefts with all Rights returns empty', () => {
      const eithers: Either<string, number>[] = [Right(1), Right(2)]
      expect(lefts(eithers)).toEqual([])
    })

    it('lefts with all Lefts returns all', () => {
      const eithers: Either<string, number>[] = [Left('a'), Left('b')]
      expect(lefts(eithers)).toEqual(['a', 'b'])
    })
  })

  describe('rights', () => {
    it('rights extracts all Rights', () => {
      const eithers: Either<string, number>[] = [
        Right(1),
        Left('a'),
        Right(2),
        Left('b'),
      ]
      expect(rights(eithers)).toEqual([1, 2])
    })

    it('rights with empty array', () => {
      const eithers: Either<string, number>[] = []
      expect(rights(eithers)).toEqual([])
    })

    it('rights with all Lefts returns empty', () => {
      const eithers: Either<string, number>[] = [Left('a'), Left('b')]
      expect(rights(eithers)).toEqual([])
    })

    it('rights with all Rights returns all', () => {
      const eithers: Either<string, number>[] = [Right(1), Right(2)]
      expect(rights(eithers)).toEqual([1, 2])
    })
  })

  describe('sequence', () => {
    it('sequence all-Right to Right', () => {
      const eithers: Either<string, number>[] = [Right(1), Right(2), Right(3)]
      expect(sequence(eithers)).toEqual(Right([1, 2, 3]))
    })

    it('sequence with any Left returns first Left', () => {
      const eithers: Either<string, number>[] = [
        Right(1),
        Left('error'),
        Right(3),
      ]
      expect(sequence(eithers)).toEqual(Left('error'))
    })

    it('sequence empty array returns Right([])', () => {
      const eithers: Either<string, number>[] = []
      expect(sequence(eithers)).toEqual(Right([]))
    })

    it('sequence short-circuits on first Left (fail-fast)', () => {
      const eithers: Either<string, number>[] = [
        Left('first'),
        Right(2),
        Right(3),
      ]
      expect(sequence(eithers)).toEqual(Left('first'))
    })
  })

  describe('traverse', () => {
    it('traverse with all-Right', () => {
      const f = (x: number): Either<string, number> => Right(x * 2)
      const result = traverse(f)([1, 2, 3])
      expect(result).toEqual(Right([2, 4, 6]))
    })

    it('traverse with any Left', () => {
      const f = (x: number): Either<string, number> =>
        x > 2 ? Right(x * 2) : Left('too small')
      const result = traverse(f)([1, 2, 3])
      expect(result).toEqual(Left('too small'))
    })

    it('traverse empty array returns Right([])', () => {
      const f = (x: number): Either<string, number> => Right(x * 2)
      const result = traverse(f)([])
      expect(result).toEqual(Right([]))
    })
  })

  describe('Fantasy Land method presence', () => {
    it('Right constructor has fantasy-land/of', () => {
      expect(Right['fantasy-land/of']).toBeDefined()
    })

    it('Right instance methods work via function composition', () => {
      const r = Right(5)
      const mapped = map((x) => x + 1)(r)
      expect(mapped).toEqual(Right(6))
    })

    it('Left instance methods work via function composition', () => {
      const l = Left('error')
      const mapped = map((x: number) => x + 1)(l)
      expect(mapped).toEqual(Left('error'))
    })
  })
})
