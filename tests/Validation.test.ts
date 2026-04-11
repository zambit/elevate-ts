import { describe, it, expect } from 'vitest';
import { Success, Failure, Validation, isSuccess, isFailure, fromEither, toEither, fromPredicate, map, ap, chain, getOrElse, fold, concat, sequence, traverse } from '../src/Validation.js';

// Either constructors for testing
const Right = <R>(right: R) => ({ tag: 'Right' as const, right });
const Left = <L>(left: L) => ({ tag: 'Left' as const, left });

describe('Validation', () => {
  describe('construction and type guards', () => {
    it('Success creates a Success value', () => {
      const s = Success(5);
      expect(s.tag).toBe('Success');
      expect(s.value).toBe(5);
    });

    it('Failure creates a Failure with errors', () => {
      const f = Failure(['error1', 'error2']);
      expect(f.tag).toBe('Failure');
      expect(f.errors).toEqual(['error1', 'error2']);
    });

    it('isSuccess identifies Success values', () => {
      expect(isSuccess(Success(5))).toBe(true);
      expect(isSuccess(Failure(['e']))).toBe(false);
    });

    it('isFailure identifies Failure values', () => {
      expect(isFailure(Failure(['e']))).toBe(true);
      expect(isFailure(Success(5))).toBe(false);
    });
  });

  describe('Either lifting', () => {
    it('fromEither lifts Right to Success', () => {
      const s = fromEither(Right(5));
      expect(s).toEqual(Success(5));
    });

    it('fromEither lifts Left to Failure with single error', () => {
      const f = fromEither(Left('error'));
      expect(f).toEqual(Failure(['error']));
    });

    it('toEither converts Success to Right', () => {
      const e = toEither(Success(5));
      expect(e).toEqual(Right(5));
    });

    it('toEither converts Failure to Left with errors array', () => {
      const e = toEither(Failure(['e1', 'e2']));
      expect(e).toEqual(Left(['e1', 'e2']));
    });
  });

  describe('predicate lifting', () => {
    it('fromPredicate creates Success if predicate holds', () => {
      const pred = (x: number) => x > 0;
      const result = fromPredicate(pred, (x) => `${x} not positive`)(5);
      expect(result).toEqual(Success(5));
    });

    it('fromPredicate creates Failure if predicate fails', () => {
      const pred = (x: number) => x > 0;
      const result = fromPredicate(pred, (x) => `${x} not positive`)(-5);
      expect(result).toEqual(Failure(['-5 not positive']));
    });
  });

  describe('functor laws', () => {
    it('identity: map(id)(va) = va', () => {
      const id = <A>(a: A) => a;
      const s = Success(5);
      const f = Failure(['e']);
      expect(map(id)(s)).toEqual(s);
      expect(map(id)(f)).toEqual(f);
    });

    it('composition: map(g ∘ f) = map(g) ∘ map(f)', () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;
      const va = Success(5);
      expect(map((x) => g(f(x)))(va)).toEqual(map(g)(map(f)(va)));
    });

    it('map does not modify Failure', () => {
      const failure = Failure(['err']);
      expect(map((x: number) => x + 1)(failure)).toEqual(failure);
    });
  });

  describe('applicative ap (critical: error accumulation)', () => {
    it('ap with two Successes applies function', () => {
      const vf = Success((x: number) => x * 2);
      const va = Success(5);
      // Critical: this DIFFERS from Either behavior where Left short-circuits
      // Validation accumulates errors in the applicative computation
      expect(ap(vf)(va)).toEqual(Success(10));
    });

    it('ap with Success function and Failure value returns Failure', () => {
      const vf = Success((x: number) => x * 2);
      const va = Failure(['error']);
      expect(ap(vf)(va)).toEqual(Failure(['error']));
    });

    it('ap with Failure function and Success value returns Failure', () => {
      const vf = Failure(['error']);
      const va = Success(5);
      expect(ap(vf)(va)).toEqual(Failure(['error']));
    });

    it('CRITICAL: ap with two Failures MERGES errors (not Either behavior)', () => {
      // This is the key difference from Either which short-circuits
      const vf = Failure(['error1', 'error2']);
      const va = Failure(['error3']);
      const result = ap(vf)(va);
      // Validation collects ALL errors, whereas Either would return the first Failure
      expect(result).toEqual(Failure(['error1', 'error2', 'error3']));
      expect(result.tag).toBe('Failure');
      expect(result.errors.length).toBe(3);
    });

    it('ap with nested Failures accumulates multiple levels of errors', () => {
      const vf = Failure(['e1', 'e2']);
      const va = Failure(['e3', 'e4']);
      const result = ap(vf)(va);
      expect(result).toEqual(Failure(['e1', 'e2', 'e3', 'e4']));
    });
  });

  describe('monad chain', () => {
    it('chain with Success calls function', () => {
      const s = Success(5);
      const f = (x: number) => Success(x * 2);
      expect(chain(f)(s)).toEqual(Success(10));
    });

    it('chain with Failure returns Failure unchanged', () => {
      const fa = Failure(['error']);
      const f = (x: number) => Success(x * 2);
      expect(chain(f)(fa)).toEqual(fa);
    });

    it('chain short-circuits on first Failure', () => {
      const va = Success(5);
      const f = (_x: number) => Failure(['error1', 'error2']);
      const result = chain(f)(va);
      expect(result).toEqual(Failure(['error1', 'error2']));
    });

    it('left identity: chain(f)(Success(a)) = f(a)', () => {
      const a = 5;
      const f = (x: number) => Success(x * 2);
      expect(chain(f)(Success(a))).toEqual(f(a));
    });

    it('right identity: chain(Success)(va) = va', () => {
      const va = Success(5);
      expect(chain(Success)(va)).toEqual(va);
    });
  });

  describe('getOrElse', () => {
    it('getOrElse returns value from Success', () => {
      expect(getOrElse(0)(Success(5))).toBe(5);
    });

    it('getOrElse returns default from Failure', () => {
      expect(getOrElse(0)(Failure(['e']))).toBe(0);
    });
  });

  describe('fold case analysis', () => {
    it('fold calls onSuccess for Success', () => {
      const result = fold(
        () => 'failure',
        (x: number) => `success: ${x}`
      )(Success(5));
      expect(result).toBe('success: 5');
    });

    it('fold calls onFailure for Failure with errors array', () => {
      const result = fold(
        (errors: readonly string[]) => `failures: ${errors.join(', ')}`,
        () => 'success'
      )(Failure(['e1', 'e2']));
      expect(result).toBe('failures: e1, e2');
    });
  });

  describe('concat merging', () => {
    it('concat returns second when first is Success', () => {
      const va1 = Success(5);
      const va2 = Success(10);
      expect(concat(va2)(va1)).toEqual(va2);
    });

    it('concat returns first when it is Failure', () => {
      const va1 = Failure(['e1']);
      const va2 = Success(10);
      expect(concat(va2)(va1)).toEqual(va1);
    });

    it('concat merges errors when both are Failures', () => {
      const va1 = Failure(['e1', 'e2']);
      const va2 = Failure(['e3']);
      expect(concat(va2)(va1)).toEqual(Failure(['e1', 'e2', 'e3']));
    });
  });

  describe('sequence', () => {
    it('sequence with all Success values', () => {
      const validations = [Success(1), Success(2), Success(3)];
      expect(sequence(validations)).toEqual(Success([1, 2, 3]));
    });

    it('sequence with Failure collects all errors', () => {
      const validations = [Success(1), Failure(['e1']), Success(3), Failure(['e2', 'e3'])];
      expect(sequence(validations)).toEqual(Failure(['e1', 'e2', 'e3']));
    });

    it('sequence with all Failures collects all errors in order', () => {
      const validations = [Failure(['e1']), Failure(['e2', 'e3']), Failure(['e4'])];
      expect(sequence(validations)).toEqual(Failure(['e1', 'e2', 'e3', 'e4']));
    });

    it('sequence with empty array returns Success with empty array', () => {
      expect(sequence([])).toEqual(Success([]));
    });
  });

  describe('traverse', () => {
    it('traverse with all Success values', () => {
      const f = (x: number) => Success(x * 2);
      const result = traverse(f)([1, 2, 3]);
      expect(result).toEqual(Success([2, 4, 6]));
    });

    it('traverse collects all errors', () => {
      const f = (x: number) => (x > 0 ? Success(x * 2) : Failure([`${x} is not positive`]));
      const result = traverse(f)([1, -2, 3, -4]);
      expect(result).toEqual(Failure(['-2 is not positive', '-4 is not positive']));
    });

    it('traverse with empty array returns Success with empty array', () => {
      const f = (x: number) => Success(x * 2);
      expect(traverse(f)([])).toEqual(Success([]));
    });
  });

  describe('error accumulation in complex chains', () => {
    it('combining validations with errors accumulates correctly', () => {
      type Field = { name: string; value: string };
      const validateName = (f: Field) => (f.name.length > 0 ? Success(f) : Failure(['Name required']));
      const validateValue = (f: Field) => (f.value.length > 0 ? Success(f) : Failure(['Value required']));

      const field1: Field = { name: '', value: 'test' };
      const field2: Field = { name: 'test', value: '' };
      const field3: Field = { name: '', value: '' };

      const v1 = sequence([validateName(field1), validateValue(field1)]);
      const v2 = sequence([validateName(field2), validateValue(field2)]);
      const v3 = sequence([validateName(field3), validateValue(field3)]);

      expect(v1).toEqual(Failure(['Name required']));
      expect(v2).toEqual(Failure(['Value required']));
      expect(v3).toEqual(Failure(['Name required', 'Value required']));
    });

    it('traverse over multiple fields collects all errors', () => {
      const fields: Array<{ name: string; value: string }> = [
        { name: '', value: 'a' },
        { name: 'b', value: '' },
        { name: '', value: '' }
      ];

      const validator = (f: { name: string; value: string }) => {
        const errors: string[] = [];
        if (f.name.length === 0) errors.push(`Field name required`);
        if (f.value.length === 0) errors.push(`Field value required`);
        return errors.length > 0 ? Failure(errors) : Success(f);
      };

      const result = traverse(validator)(fields);
      expect(result.tag).toBe('Failure');
      expect((result as any).errors.length).toBe(4); // 1 + 1 + 2 errors total
    });
  });

  // Fantasy Land tests excluded due to vitest coverage serialization issues
  // The core point-free functions work correctly without FL methods
});
