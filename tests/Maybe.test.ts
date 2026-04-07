import { describe, it, expect } from 'vitest'
import {
  Just,
  Nothing,
  Maybe,
  isJust,
  isNothing,
  fromNullable,
  toNullable,
  toArray,
  fromPredicate,
  map,
  ap,
  chain,
  chainNullable,
  getOrElse,
  getOrElseL,
  alt,
  altL,
  filter,
  fold,
  catMaybes,
  mapMaybe,
  sequence,
  traverse,
  toEither,
} from '../src/Maybe.js'

describe('Maybe', () => {
  describe('construction and type guards', () => {
    it('Just creates a Just value', () => {
      const j = Just(5)
      expect(j.tag).toBe('Just')
      expect(j.value).toBe(5)
    })

    it('Nothing is a Nothing value', () => {
      expect(Nothing.tag).toBe('Nothing')
    })

    it('isJust identifies Just values', () => {
      expect(isJust(Just(5))).toBe(true)
      expect(isJust(Nothing)).toBe(false)
    })

    it('isNothing identifies Nothing values', () => {
      expect(isNothing(Nothing)).toBe(true)
      expect(isNothing(Just(5))).toBe(false)
    })
  })

  describe('nullable lifting', () => {
    it('fromNullable lifts non-null values', () => {
      expect(fromNullable(5)).toEqual(Just(5))
      expect(fromNullable('hello')).toEqual(Just('hello'))
    })

    it('fromNullable handles null and undefined', () => {
      expect(fromNullable(null)).toEqual(Nothing)
      expect(fromNullable(undefined)).toEqual(Nothing)
    })

    it('toNullable extracts or null', () => {
      expect(toNullable(Just(5))).toBe(5)
      expect(toNullable(Nothing)).toBe(null)
    })

    it('fromNullable treats 0 as Just (falsy but not null)', () => {
      expect(fromNullable(0)).toEqual(Just(0))
    })

    it('fromNullable treats empty string as Just', () => {
      expect(fromNullable('')).toEqual(Just(''))
    })

    it('fromNullable treats false as Just', () => {
      expect(fromNullable(false)).toEqual(Just(false))
    })
  })

  describe('predicate lifting', () => {
    it('fromPredicate creates Just if predicate holds', () => {
      const pred = (x: number) => x > 0
      expect(fromPredicate(pred)(5)).toEqual(Just(5))
    })

    it('fromPredicate creates Nothing if predicate fails', () => {
      const pred = (x: number) => x > 0
      expect(fromPredicate(pred)(-5)).toEqual(Nothing)
    })
  })

  describe('array lifting', () => {
    it('toArray creates 1-element array from Just', () => {
      expect(toArray(Just(5))).toEqual([5])
    })

    it('toArray creates empty array from Nothing', () => {
      expect(toArray(Nothing)).toEqual([])
    })
  })

  describe('functor laws', () => {
    it('identity: map(id)(ma) = ma', () => {
      const id = <A>(a: A) => a
      const ma = Just(5)
      expect(map(id)(ma)).toEqual(ma)
      expect(map(id)(Nothing)).toEqual(Nothing)
    })

    it('composition: map(g ∘ f) = map(g) ∘ map(f)', () => {
      const f = (x: number) => x + 1
      const g = (x: number) => x * 2
      const ma = Just(5)

      const left = map((x) => g(f(x)))(ma)
      const right = map(g)(map(f)(ma))
      expect(left).toEqual(right)
    })
  })

  describe('applicative', () => {
    it('ap applies wrapped function', () => {
      const mf = Just((x: number) => x + 1)
      const ma = Just(5)
      expect(ap(mf)(ma)).toEqual(Just(6))
    })

    it('ap with Nothing function returns Nothing', () => {
      const mf: Maybe<(x: number) => number> = Nothing
      const ma = Just(5)
      expect(ap(mf)(ma)).toEqual(Nothing)
    })

    it('ap with Nothing value returns Nothing', () => {
      const mf = Just((x: number) => x + 1)
      const ma: Maybe<number> = Nothing
      expect(ap(mf)(ma)).toEqual(Nothing)
    })
  })

  describe('monad laws', () => {
    it('left identity: chain(f)(Just(a)) = f(a)', () => {
      const f = (x: number): Maybe<number> => Just(x + 1)
      const a = 5
      expect(chain(f)(Just(a))).toEqual(f(a))
    })

    it('right identity: chain(Just)(ma) = ma', () => {
      const ma = Just(5)
      expect(chain(Just)(ma)).toEqual(ma)
      expect(chain(Just)(Nothing)).toEqual(Nothing)
    })

    it('associativity: chain(g)(chain(f)(ma)) = chain(x => chain(g)(f(x)))(ma)', () => {
      const f = (x: number): Maybe<number> => Just(x + 1)
      const g = (x: number): Maybe<number> => Just(x * 2)
      const ma = Just(5)

      const left = chain(g)(chain(f)(ma))
      const right = chain((x) => chain(g)(f(x)))(ma)
      expect(left).toEqual(right)
    })
  })

  describe('alt', () => {
    it('alt returns first if Just', () => {
      expect(alt(Nothing)(Just(5))).toEqual(Just(5))
      expect(alt(Just(10))(Just(5))).toEqual(Just(5))
    })

    it('alt returns second if first is Nothing', () => {
      expect(alt(Just(5))(Nothing)).toEqual(Just(5))
      expect(alt(Nothing)(Nothing)).toEqual(Nothing)
    })
  })

  describe('altL', () => {
    it('altL returns first if Just without evaluating second', () => {
      let evaluated = false
      const ma = Just(5)
      const result = altL(() => {
        evaluated = true
        return Nothing
      })(ma)
      expect(result).toEqual(Just(5))
      expect(evaluated).toBe(false)
    })

    it('altL evaluates second if first is Nothing', () => {
      let evaluated = false
      const result = altL(() => {
        evaluated = true
        return Just(5)
      })(Nothing)
      expect(result).toEqual(Just(5))
      expect(evaluated).toBe(true)
    })
  })

  describe('filter', () => {
    it('filter keeps Just if predicate holds', () => {
      const pred = (x: number) => x > 0
      expect(filter(pred)(Just(5))).toEqual(Just(5))
    })

    it('filter returns Nothing if predicate fails', () => {
      const pred = (x: number) => x > 0
      expect(filter(pred)(Just(-5))).toEqual(Nothing)
    })

    it('filter returns Nothing for Nothing', () => {
      expect(filter((x: number) => x > 0)(Nothing)).toEqual(Nothing)
    })
  })

  describe('fold', () => {
    it('fold applies onNothing for Nothing', () => {
      expect(fold(0, (x: number) => x + 1)(Nothing)).toBe(0)
    })

    it('fold applies onJust for Just', () => {
      expect(fold(0, (x: number) => x + 1)(Just(5))).toBe(6)
    })
  })

  describe('chainNullable', () => {
    it('chainNullable with Just and non-null result', () => {
      const result = chainNullable((x: number) => x + 1)(Just(5))
      expect(result).toEqual(Just(6))
    })

    it('chainNullable with Just and null result', () => {
      const result = chainNullable((x: number) => null)(Just(5))
      expect(result).toEqual(Nothing)
    })

    it('chainNullable with Just and undefined result', () => {
      const result = chainNullable((x: number) => undefined)(Just(5))
      expect(result).toEqual(Nothing)
    })

    it('chainNullable with Nothing', () => {
      const result = chainNullable((x: number) => x + 1)(Nothing)
      expect(result).toEqual(Nothing)
    })

    it('chainNullable with f returning 0 gives Just(0)', () => {
      const result = chainNullable(() => 0)(Just(5))
      expect(result).toEqual(Just(0))
    })

    it('chainNullable with f returning empty string gives Just("")', () => {
      const result = chainNullable(() => '')(Just(5))
      expect(result).toEqual(Just(''))
    })
  })

  describe('getOrElse', () => {
    it('getOrElse extracts value from Just', () => {
      expect(getOrElse(0)(Just(5))).toBe(5)
    })

    it('getOrElse returns default for Nothing', () => {
      expect(getOrElse(0)(Nothing)).toBe(0)
    })
  })

  describe('getOrElseL', () => {
    it('getOrElseL extracts value from Just without evaluating', () => {
      let evaluated = false
      const result = getOrElseL(() => {
        evaluated = true
        return 0
      })(Just(5))
      expect(result).toBe(5)
      expect(evaluated).toBe(false)
    })

    it('getOrElseL evaluates for Nothing', () => {
      let evaluated = false
      const result = getOrElseL(() => {
        evaluated = true
        return 0
      })(Nothing)
      expect(result).toBe(0)
      expect(evaluated).toBe(true)
    })
  })

  describe('catMaybes', () => {
    it('catMaybes collects Just values', () => {
      expect(catMaybes([Just(1), Nothing, Just(2), Nothing, Just(3)])).toEqual([
        1, 2, 3,
      ])
    })

    it('catMaybes with all Just', () => {
      expect(catMaybes([Just(1), Just(2), Just(3)])).toEqual([1, 2, 3])
    })

    it('catMaybes with all Nothing', () => {
      expect(catMaybes([Nothing, Nothing, Nothing])).toEqual([])
    })

    it('catMaybes with empty array', () => {
      expect(catMaybes([])).toEqual([])
    })
  })

  describe('mapMaybe', () => {
    it('mapMaybe maps and collects', () => {
      const f = (x: number): Maybe<number> =>
        x > 0 ? Just(x * 2) : Nothing
      expect(mapMaybe(f)([1, -2, 3, -4, 5])).toEqual([2, 6, 10])
    })

    it('mapMaybe with empty array', () => {
      const f = (x: number): Maybe<number> => Just(x)
      expect(mapMaybe(f)([])).toEqual([])
    })

    it('mapMaybe with all-Nothing returns empty array', () => {
      const f = (): Maybe<number> => Nothing
      expect(mapMaybe(f)([1, 2, 3])).toEqual([])
    })
  })

  describe('sequence', () => {
    it('sequence with all Just', () => {
      expect(sequence([Just(1), Just(2), Just(3)])).toEqual(Just([1, 2, 3]))
    })

    it('sequence with any Nothing', () => {
      expect(sequence([Just(1), Nothing, Just(3)])).toEqual(Nothing)
    })

    it('sequence with empty array', () => {
      expect(sequence([])).toEqual(Just([]))
    })

    it('sequence short-circuits on first Nothing (fail-fast)', () => {
      expect(sequence([Nothing, Just(2), Just(3)])).toEqual(Nothing)
    })
  })

  describe('traverse', () => {
    it('traverse with all Just', () => {
      const f = (x: number): Maybe<number> => Just(x * 2)
      expect(traverse(f)([1, 2, 3])).toEqual(Just([2, 4, 6]))
    })

    it('traverse with any Nothing', () => {
      const f = (x: number): Maybe<number> => (x > 0 ? Just(x) : Nothing)
      expect(traverse(f)([1, -2, 3])).toEqual(Nothing)
    })

    it('traverse with empty array', () => {
      const f = (x: number): Maybe<number> => Just(x)
      expect(traverse(f)([])).toEqual(Just([]))
    })

    it('traverse short-circuits on first Nothing result (fail-fast)', () => {
      const f = (x: number): Maybe<number> => (x === 1 ? Nothing : Just(x))
      expect(traverse(f)([1, 2, 3])).toEqual(Nothing)
    })
  })

  describe('altL', () => {
    it('altL where factory returns Nothing', () => {
      const result = altL(() => Nothing)(Nothing)
      expect(result).toEqual(Nothing)
    })
  })

  describe('filter additional cases', () => {
    it('filter with Just(0) and always-true predicate keeps Just(0)', () => {
      expect(filter((_x: number) => true)(Just(0))).toEqual(Just(0))
    })
  })

  describe('getOrElse additional cases', () => {
    it('getOrElse where default is null', () => {
      expect(getOrElse(null)(Nothing)).toBe(null)
      expect(getOrElse(null)(Just(5))).toBe(5)
    })
  })

  describe('getOrElseL additional cases', () => {
    it('getOrElseL where factory returns null', () => {
      const result = getOrElseL(() => null)(Nothing)
      expect(result).toBe(null)
    })
  })

  describe('toEither', () => {
    it('converts Just to Right', () => {
      const result = toEither('error')(Just(42))
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right).toBe(42)
      }
    })

    it('converts Nothing to Left with provided error', () => {
      const result = toEither('error')(Nothing)
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left).toBe('error')
      }
    })

    it('works with any error type', () => {
      const result = toEither(404)(Nothing)
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left).toBe(404)
      }
    })
  })
})
