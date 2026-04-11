import { describe, it, expect } from 'vitest';
import * as List from '../src/List.js';
import * as Maybe from '../src/Maybe.js';

describe('List', () => {
  describe('head, tail, last, init', () => {
    it('head returns first element', () => {
      expect(List.head([1, 2, 3])).toBe(1);
      expect(List.head(['a', 'b'])).toBe('a');
    });

    it('head returns undefined for empty array', () => {
      expect(List.head([])).toBeUndefined();
    });

    it('tail returns all but first', () => {
      expect(List.tail([1, 2, 3])).toEqual([2, 3]);
      expect(List.tail([1])).toEqual([]);
    });

    it('tail returns empty array for empty input', () => {
      expect(List.tail([])).toEqual([]);
    });

    it('last returns final element', () => {
      expect(List.last([1, 2, 3])).toBe(3);
      expect(List.last([1])).toBe(1);
    });

    it('last returns undefined for empty array', () => {
      expect(List.last([])).toBeUndefined();
    });

    it('init returns all but last', () => {
      expect(List.init([1, 2, 3])).toEqual([1, 2]);
      expect(List.init([1])).toEqual([]);
    });

    it('init returns empty array for empty input', () => {
      expect(List.init([])).toEqual([]);
    });
  });

  describe('uncons', () => {
    it('uncons returns Just [head, tail] for nonempty', () => {
      const result = List.uncons([1, 2, 3]);
      expect(result).toEqual(Maybe.Just([1, [2, 3]]));
    });

    it('uncons returns Just [head, []] for single element', () => {
      const result = List.uncons([42]);
      expect(result).toEqual(Maybe.Just([42, []]));
    });

    it('uncons returns Nothing for empty array', () => {
      const result = List.uncons([]);
      expect(result).toEqual(Maybe.Nothing);
    });
  });

  describe('cons and snoc', () => {
    it('cons prepends an element', () => {
      expect(List.cons(0)([1, 2, 3])).toEqual([0, 1, 2, 3]);
      expect(List.cons('x')(['a', 'b'])).toEqual(['x', 'a', 'b']);
    });

    it('cons works on empty array', () => {
      expect(List.cons(1)([])).toEqual([1]);
    });

    it('snoc appends an element', () => {
      expect(List.snoc(4)([1, 2, 3])).toEqual([1, 2, 3, 4]);
      expect(List.snoc('c')(['a', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('snoc works on empty array', () => {
      expect(List.snoc(1)([])).toEqual([1]);
    });
  });

  describe('take and drop', () => {
    it('take returns first n elements', () => {
      expect(List.take(2)([1, 2, 3, 4])).toEqual([1, 2]);
      expect(List.take(0)([1, 2, 3])).toEqual([]);
      expect(List.take(5)([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('drop skips first n elements', () => {
      expect(List.drop(2)([1, 2, 3, 4])).toEqual([3, 4]);
      expect(List.drop(0)([1, 2, 3])).toEqual([1, 2, 3]);
      expect(List.drop(5)([1, 2, 3])).toEqual([]);
    });

    it('take and drop are complementary', () => {
      const arr = [1, 2, 3, 4, 5];
      const taken = List.take(3)(arr);
      const dropped = List.drop(3)(arr);
      expect([...taken, ...dropped]).toEqual(arr);
    });
  });

  describe('takeWhile and dropWhile', () => {
    it('takeWhile takes while predicate holds', () => {
      const isSmall = (x: number) => x < 3;
      expect(List.takeWhile(isSmall)([1, 2, 3, 4])).toEqual([1, 2]);
      expect(List.takeWhile(isSmall)([])).toEqual([]);
    });

    it('dropWhile skips while predicate holds', () => {
      const isSmall = (x: number) => x < 3;
      expect(List.dropWhile(isSmall)([1, 2, 3, 4])).toEqual([3, 4]);
      expect(List.dropWhile(isSmall)([])).toEqual([]);
    });

    it('takeWhile and dropWhile are complementary', () => {
      const arr = [1, 2, 3, 4, 5];
      const pred = (x: number) => x < 4;
      const taken = List.takeWhile(pred)(arr);
      const dropped = List.dropWhile(pred)(arr);
      expect([...taken, ...dropped]).toEqual(arr);
    });
  });

  describe('partition', () => {
    it('partition splits on predicate', () => {
      const isEven = (x: number) => x % 2 === 0;
      const [evens, odds] = List.partition(isEven)([1, 2, 3, 4, 5]);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('partition with empty array', () => {
      const [left, right] = List.partition((x: number) => x > 0)([]);
      expect(left).toEqual([]);
      expect(right).toEqual([]);
    });

    it('partition preserves order within groups', () => {
      const [true_vals, false_vals] = List.partition((x: number) => x > 2)([1, 3, 2, 4, 2, 5]);
      expect(true_vals).toEqual([3, 4, 5]);
      expect(false_vals).toEqual([1, 2, 2]);
    });
  });

  describe('span', () => {
    it('span splits at first false', () => {
      const isSmall = (x: number) => x < 3;
      const [taken, dropped] = List.span(isSmall)([1, 2, 3, 4]);
      expect(taken).toEqual([1, 2]);
      expect(dropped).toEqual([3, 4]);
    });

    it('span with all true', () => {
      const [taken, dropped] = List.span((x: number) => x < 10)([1, 2, 3]);
      expect(taken).toEqual([1, 2, 3]);
      expect(dropped).toEqual([]);
    });

    it('span with all false', () => {
      const [taken, dropped] = List.span((x: number) => x > 10)([1, 2, 3]);
      expect(taken).toEqual([]);
      expect(dropped).toEqual([1, 2, 3]);
    });
  });

  describe('groupBy', () => {
    it('groupBy groups consecutive equal elements', () => {
      const eq = (a: number, b: number) => a === b;
      const result = List.groupBy(eq)([1, 1, 2, 2, 2, 1]);
      expect(result).toEqual([[1, 1], [2, 2, 2], [1]]);
    });

    it('groupBy with single element', () => {
      const result = List.groupBy((a: number, b: number) => a === b)([1]);
      expect(result).toEqual([[1]]);
    });

    it('groupBy with empty array', () => {
      const result = List.groupBy((a: number, b: number) => a === b)([]);
      expect(result).toEqual([]);
    });

    it('groupBy with no consecutive duplicates', () => {
      const result = List.groupBy((a: number, b: number) => a === b)([1, 2, 3]);
      expect(result).toEqual([[1], [2], [3]]);
    });
  });

  describe('nubBy', () => {
    it('nubBy removes consecutive duplicates', () => {
      const eq = (a: number, b: number) => a === b;
      expect(List.nubBy(eq)([1, 1, 2, 2, 3, 1])).toEqual([1, 2, 3, 1]);
    });

    it('nubBy with no duplicates', () => {
      const result = List.nubBy((a: number, b: number) => a === b)([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('nubBy with empty array', () => {
      const result = List.nubBy((a: number, b: number) => a === b)([]);
      expect(result).toEqual([]);
    });
  });

  describe('sortBy', () => {
    it('sortBy sorts with comparator', () => {
      const asc = (a: number, b: number) => a - b;
      expect(List.sortBy(asc)([3, 1, 4, 1, 5])).toEqual([1, 1, 3, 4, 5]);
    });

    it('sortBy descending', () => {
      const desc = (a: number, b: number) => b - a;
      expect(List.sortBy(desc)([3, 1, 4, 1, 5])).toEqual([5, 4, 3, 1, 1]);
    });

    it('sortBy with strings', () => {
      const ord = (a: string, b: string) => a.localeCompare(b);
      expect(List.sortBy(ord)(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('sortBy does not mutate original', () => {
      const original = [3, 1, 2];
      List.sortBy((a, b) => a - b)(original);
      expect(original).toEqual([3, 1, 2]);
    });
  });

  describe('zip and zipWith', () => {
    it('zip pairs arrays and returns remainders', () => {
      const [pairs, remainder] = List.zip([10, 20, 30])([1, 2, 3, 4]);
      expect(pairs).toEqual([
        [1, 10],
        [2, 20],
        [3, 30]
      ]);
      expect(remainder).toEqual([4]);
    });

    it('zip with different lengths', () => {
      const [pairs, remainder] = List.zip([10, 20])([1, 2, 3]);
      expect(pairs).toEqual([
        [1, 10],
        [2, 20]
      ]);
      expect(remainder).toEqual([3]);
    });

    it('zip with equal lengths', () => {
      const [pairs, remainder] = List.zip([10, 20])([1, 2]);
      expect(pairs).toEqual([
        [1, 10],
        [2, 20]
      ]);
      expect(remainder).toEqual([]);
    });

    it('zipWith combines arrays with function', () => {
      const add = (a: number, b: number) => a + b;
      expect(List.zipWith(add)([10, 20, 30])([1, 2, 3, 4])).toEqual([11, 22, 33]);
    });

    it('zipWith with string function', () => {
      const concat = (a: string, b: string) => a + b;
      expect(List.zipWith(concat)(['x', 'y'])(['a', 'b', 'c'])).toEqual(['ax', 'by']);
    });
  });

  describe('unzip', () => {
    it('unzip splits pairs into two arrays', () => {
      const pairs: readonly (readonly [number, string])[] = [
        [1, 'a'],
        [2, 'b'],
        [3, 'c']
      ];
      const [nums, strs] = List.unzip(pairs);
      expect(nums).toEqual([1, 2, 3]);
      expect(strs).toEqual(['a', 'b', 'c']);
    });

    it('unzip with empty array', () => {
      const [left, right] = List.unzip([]);
      expect(left).toEqual([]);
      expect(right).toEqual([]);
    });

    it('unzip is inverse of zip', () => {
      const original: readonly (readonly [number, string])[] = [
        [1, 'a'],
        [2, 'b']
      ];
      const [nums, strs] = List.unzip(original);
      const [zipped] = List.zip(strs)(nums);
      expect(zipped).toEqual(original);
    });
  });

  describe('flatten', () => {
    it('flatten flattens one level', () => {
      expect(List.flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('flatten with empty arrays', () => {
      expect(List.flatten([[], [1], [], [2, 3]])).toEqual([1, 2, 3]);
    });

    it('flatten with empty input', () => {
      expect(List.flatten([])).toEqual([]);
    });

    it('flatten only goes one level deep', () => {
      const nested = [[[1]], [[2, 3]]];
      const result = List.flatten(nested as any);
      expect(result).toEqual([[1], [2, 3]]);
    });
  });

  describe('intersperse', () => {
    it('intersperse inserts separator between elements', () => {
      expect(List.intersperse(0)([1, 2, 3])).toEqual([1, 0, 2, 0, 3]);
      expect(List.intersperse(',')(['a', 'b', 'c'])).toEqual(['a', ',', 'b', ',', 'c']);
    });

    it('intersperse with single element', () => {
      expect(List.intersperse(0)([1])).toEqual([1]);
    });

    it('intersperse with empty array', () => {
      expect(List.intersperse(0)([])).toEqual([]);
    });
  });

  describe('transpose', () => {
    it('transpose transposes a matrix', () => {
      const matrix = [
        [1, 2, 3],
        [4, 5, 6]
      ];
      expect(List.transpose(matrix)).toEqual([
        [1, 4],
        [2, 5],
        [3, 6]
      ]);
    });

    it('transpose with empty matrix', () => {
      expect(List.transpose([])).toEqual([]);
    });

    it('transpose with single row', () => {
      expect(List.transpose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
    });

    it('transpose with ragged matrix', () => {
      const matrix = [
        [1, 2],
        [3, 4, 5]
      ];
      const result = List.transpose(matrix);
      expect(result).toEqual([[1, 3], [2, 4], [5]]);
    });

    it('transpose is involutive for square matrices', () => {
      const matrix = [
        [1, 2],
        [3, 4]
      ];
      const double = List.transpose(List.transpose(matrix));
      expect(double).toEqual(matrix);
    });
  });

  describe('immutability', () => {
    it('operations do not mutate original arrays', () => {
      const original = [1, 2, 3];
      List.cons(0)(original);
      List.snoc(4)(original);
      List.sortBy((a, b) => b - a)(original);
      expect(original).toEqual([1, 2, 3]);
    });
  });

  describe('composition examples', () => {
    it('chaining operations with take, drop', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = List.drop(1)(List.take(3)(arr));
      expect(result).toEqual([2, 3]);
    });

    it('partition then transform', () => {
      const [evens, odds] = List.partition((x: number) => x % 2 === 0)([1, 2, 3, 4, 5, 6]);
      const summed = [...evens, ...odds];
      expect(summed).toEqual([2, 4, 6, 1, 3, 5]);
    });

    it('flatten and sort', () => {
      const nested = [
        [3, 1],
        [2, 4]
      ];
      const result = List.sortBy((a, b) => a - b)(List.flatten(nested));
      expect(result).toEqual([1, 2, 3, 4]);
    });
  });
});
