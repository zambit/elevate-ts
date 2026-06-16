import { describe, it, expect } from 'vitest';
import {
  string,
  number,
  boolean,
  literal,
  null_,
  undefined_,
  unknown_,
  object,
  array,
  union,
  optional,
  nullable,
  refine,
  minLength,
  maxLength,
  regex,
  transform,
  serialize,
  deserialize,
  type Schema,
  type Issue,
  type InferOutput
} from '../src/Schema.js';
import { pipe } from '../src/Function.js';
import { Failure, Success, isFailure, isSuccess } from '../src/Validation.js';

describe('Schema', () => {
  describe('primitives', () => {
    it('string accepts strings', () => {
      expect(string()('hi')).toEqual(Success('hi'));
    });

    it('string rejects non-strings with type issue', () => {
      const r = string()(42);
      expect(isFailure(r)).toBe(true);
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.kind).toBe('type');
        expect(r.errors[0]!.expected).toBe('string');
        expect(r.errors[0]!.received).toBe('number');
        expect(r.errors[0]!.path).toEqual([]);
      }
    });

    it('number accepts numbers', () => {
      expect(number()(3.14)).toEqual(Success(3.14));
    });

    it('number rejects NaN', () => {
      expect(isFailure(number()(NaN))).toBe(true);
    });

    it('number rejects non-numbers', () => {
      expect(isFailure(number()('3'))).toBe(true);
    });

    it('boolean accepts booleans', () => {
      expect(boolean()(true)).toEqual(Success(true));
      expect(boolean()(false)).toEqual(Success(false));
    });

    it('boolean rejects non-booleans', () => {
      expect(isFailure(boolean()(1))).toBe(true);
    });

    it('literal accepts the exact value', () => {
      expect(literal('foo')('foo')).toEqual(Success('foo'));
      expect(literal(42)(42)).toEqual(Success(42));
    });

    it('literal rejects mismatches', () => {
      expect(isFailure(literal('foo')('bar'))).toBe(true);
    });

    it('null_ accepts null only', () => {
      expect(null_()(null)).toEqual(Success(null));
      expect(isFailure(null_()(undefined))).toBe(true);
      expect(isFailure(null_()(0))).toBe(true);
    });

    it('undefined_ accepts undefined only', () => {
      expect(undefined_()(undefined)).toEqual(Success(undefined));
      expect(isFailure(undefined_()(null))).toBe(true);
    });

    it('unknown_ passes everything through', () => {
      expect(unknown_()(42)).toEqual(Success(42));
      expect(unknown_()(null)).toEqual(Success(null));
      expect(unknown_()({ a: 1 })).toEqual(Success({ a: 1 }));
    });

    it('issue received names null and array correctly', () => {
      const r1 = string()(null);
      const r2 = string()([1, 2]);
      if (r1.tag === 'Failure') expect(r1.errors[0]!.received).toBe('null');
      if (r2.tag === 'Failure') expect(r2.errors[0]!.received).toBe('array');
    });
  });

  describe('object combinator', () => {
    it('validates a flat object', () => {
      const User = object({ name: string(), age: number() });
      expect(User({ name: 'a', age: 5 })).toEqual(Success({ name: 'a', age: 5 }));
    });

    it('rejects non-objects', () => {
      const User = object({ name: string() });
      expect(isFailure(User(null))).toBe(true);
      expect(isFailure(User([]))).toBe(true);
      expect(isFailure(User('str'))).toBe(true);
    });

    it('accumulates errors across multiple fields', () => {
      const User = object({ name: string(), age: number() });
      const r = User({ name: 123, age: 'abc' });
      expect(isFailure(r)).toBe(true);
      if (r.tag === 'Failure') {
        expect(r.errors).toHaveLength(2);
        expect(r.errors[0]!.path).toEqual(['name']);
        expect(r.errors[1]!.path).toEqual(['age']);
      }
    });

    it('prepends key to nested paths', () => {
      const Inner = object({ email: string() });
      const Outer = object({ user: Inner });
      const r = Outer({ user: { email: 42 } });
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.path).toEqual(['user', 'email']);
      }
    });
  });

  describe('array combinator', () => {
    it('validates an array of items', () => {
      expect(array(number())([1, 2, 3])).toEqual(Success([1, 2, 3]));
    });

    it('rejects non-arrays', () => {
      expect(isFailure(array(number())({}))).toBe(true);
    });

    it('accumulates errors with indexed paths', () => {
      const r = array(number())([1, 'two', 3, 'four']);
      if (r.tag === 'Failure') {
        expect(r.errors).toHaveLength(2);
        expect(r.errors[0]!.path).toEqual([1]);
        expect(r.errors[1]!.path).toEqual([3]);
      }
    });

    it('threads paths through nested arrays', () => {
      const Schema_ = array(array(number()));
      const r = Schema_([
        [1, 2],
        [3, 'x']
      ]);
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.path).toEqual([1, 1]);
      }
    });
  });

  describe('union combinator', () => {
    it('returns first matching schema', () => {
      const StrOrNum = union(string(), number());
      expect(StrOrNum('hi')).toEqual(Success('hi'));
      expect(StrOrNum(5)).toEqual(Success(5));
    });

    it('accumulates errors from all branches when nothing matches', () => {
      const StrOrNum = union(string(), number());
      const r = StrOrNum(true);
      if (r.tag === 'Failure') {
        expect(r.errors).toHaveLength(2);
      }
    });
  });

  describe('optional / nullable', () => {
    it('optional accepts undefined and the underlying schema', () => {
      const s = optional(string());
      expect(s(undefined)).toEqual(Success(undefined));
      expect(s('x')).toEqual(Success('x'));
      expect(isFailure(s(42))).toBe(true);
    });

    it('nullable accepts null and the underlying schema', () => {
      const s = nullable(string());
      expect(s(null)).toEqual(Success(null));
      expect(s('x')).toEqual(Success('x'));
      expect(isFailure(s(undefined))).toBe(true);
    });

    it('optional field absent from object validates', () => {
      const Obj = object({ name: optional(string()) });
      expect(Obj({})).toEqual(Success({ name: undefined }));
    });
  });

  describe('refinements', () => {
    it('refine passes value through when predicate holds', () => {
      const positive = pipe(
        number(),
        refine<number>((n) => n > 0, 'must be positive')
      );
      expect(positive(5)).toEqual(Success(5));
    });

    it('refine produces a refinement issue when predicate fails', () => {
      const positive = pipe(
        number(),
        refine<number>((n) => n > 0, 'must be positive')
      );
      const r = positive(-1);
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.kind).toBe('refinement');
        expect(r.errors[0]!.message).toBe('must be positive');
      }
    });

    it('refine short-circuits when parent schema fails', () => {
      const positive = pipe(
        number(),
        refine<number>((n) => n > 0, 'positive')
      );
      const r = positive('not-a-number');
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.kind).toBe('type');
      }
    });

    it('minLength enforces minimum length on strings', () => {
      const s = pipe(string(), minLength(3));
      expect(s('abc')).toEqual(Success('abc'));
      expect(isFailure(s('ab'))).toBe(true);
    });

    it('minLength works on arrays', () => {
      const s = pipe(array(number()), minLength(2));
      expect(s([1, 2])).toEqual(Success([1, 2]));
      expect(isFailure(s([1]))).toBe(true);
    });

    it('maxLength enforces maximum length', () => {
      const s = pipe(string(), maxLength(3));
      expect(s('abc')).toEqual(Success('abc'));
      expect(isFailure(s('abcd'))).toBe(true);
    });

    it('regex matches the pattern', () => {
      const s = pipe(string(), regex(/^[a-z]+$/));
      expect(s('abc')).toEqual(Success('abc'));
      expect(isFailure(s('ABC'))).toBe(true);
    });

    it('regex uses custom message when provided', () => {
      const s = pipe(string(), regex(/^x$/, 'must be x'));
      const r = s('y');
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.message).toBe('must be x');
      }
    });
  });

  describe('transform', () => {
    it('applies decode to a Success value', () => {
      const s = pipe(
        string(),
        transform<string, number>((v) => v.length)
      );
      expect(s('hello')).toEqual(Success(5));
    });

    it('short-circuits when source schema fails', () => {
      const s = pipe(
        string(),
        transform<string, number>((v) => v.length)
      );
      expect(isFailure(s(42))).toBe(true);
    });

    it('accepts optional encode argument without breaking', () => {
      const s = pipe(
        string(),
        transform<string, Date>(
          (iso) => new Date(iso),
          (d) => d.toISOString()
        )
      );
      const r = s('2026-05-22T00:00:00.000Z');
      if (r.tag === 'Success') {
        expect(r.value).toBeInstanceOf(Date);
        expect(r.value.toISOString()).toBe('2026-05-22T00:00:00.000Z');
      }
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips JSON-native values', () => {
      const User = object({ name: string(), age: number() });
      const value = { name: 'a', age: 5 };
      const ser = serialize(User, value);
      if (ser.tag === 'Success') {
        expect(deserialize(User, ser.value)).toEqual(Success(value));
      }
    });

    it('deserialize fails on invalid JSON', () => {
      const r = deserialize(string(), '{not-json');
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.expected).toBe('valid JSON');
      }
    });

    it('deserialize fails when parsed value does not match schema', () => {
      const r = deserialize(number(), '"hello"');
      expect(isFailure(r)).toBe(true);
    });

    it('serialize fails on cyclic structures', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const r = serialize(unknown_(), cyclic);
      expect(isFailure(r)).toBe(true);
    });
  });

  describe('serialize / deserialize round-trip with encoders', () => {
    it('round-trips a Date via transform with encodeFn', () => {
      const DateSchema = pipe(
        string(),
        transform<string, Date>(
          (iso) => new Date(iso),
          (d) => d.toISOString()
        )
      );
      const value = new Date('2026-05-22T00:00:00.000Z');
      const ser = serialize(DateSchema, value);
      expect(ser.tag).toBe('Success');
      if (ser.tag === 'Success') {
        expect(ser.value).toBe('"2026-05-22T00:00:00.000Z"');
        const back = deserialize(DateSchema, ser.value);
        if (back.tag === 'Success') {
          expect(back.value.toISOString()).toBe('2026-05-22T00:00:00.000Z');
        }
      }
    });

    it('round-trips a nested object with a transformed field', () => {
      const Event = object({
        name: string(),
        date: pipe(
          string(),
          transform<string, Date>(
            (iso) => new Date(iso),
            (d) => d.toISOString()
          )
        )
      });
      const value = { name: 'launch', date: new Date('2026-05-22T00:00:00.000Z') };
      const ser = serialize(Event, value);
      expect(ser.tag).toBe('Success');
      if (ser.tag === 'Success') {
        expect(ser.value).toBe('{"name":"launch","date":"2026-05-22T00:00:00.000Z"}');
        const back = deserialize(Event, ser.value);
        if (back.tag === 'Success') {
          expect(back.value.name).toBe('launch');
          expect(back.value.date.toISOString()).toBe('2026-05-22T00:00:00.000Z');
        }
      }
    });

    it('round-trips an array of transformed values', () => {
      const Dates = array(
        pipe(
          string(),
          transform<string, Date>(
            (iso) => new Date(iso),
            (d) => d.toISOString()
          )
        )
      );
      const value: readonly Date[] = [new Date('2026-05-22T00:00:00.000Z'), new Date('2026-05-23T00:00:00.000Z')];
      const ser = serialize(Dates, value);
      if (ser.tag === 'Success') {
        const back = deserialize(Dates, ser.value);
        if (back.tag === 'Success') {
          expect(back.value).toHaveLength(2);
          expect(back.value[0]!.toISOString()).toBe('2026-05-22T00:00:00.000Z');
          expect(back.value[1]!.toISOString()).toBe('2026-05-23T00:00:00.000Z');
        }
      }
    });

    it('serialize fails for a transform without encodeFn', () => {
      const s = pipe(
        string(),
        transform<string, number>((v) => v.length)
      );
      const r = serialize(s, 5);
      expect(isFailure(r)).toBe(true);
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.message).toContain('encodeFn is required');
      }
    });

    it('round-trips through refinements (encoder is inner schemas)', () => {
      const PositiveInt = pipe(
        number(),
        refine<number>((n) => n > 0 && Number.isInteger(n), 'positive integer')
      );
      const ser = serialize(PositiveInt, 42);
      if (ser.tag === 'Success') {
        expect(ser.value).toBe('42');
        expect(deserialize(PositiveInt, ser.value)).toEqual(Success(42));
      }
    });

    it('round-trips nullable', () => {
      const s = nullable(number());
      expect(serialize(s, null)).toEqual(Success('null'));
      expect(serialize(s, 7)).toEqual(Success('7'));
      expect(deserialize(s, 'null')).toEqual(Success(null));
      expect(deserialize(s, '7')).toEqual(Success(7));
    });

    it('nullable with a transformed inner schema round-trips both arms', () => {
      const NullableDate = nullable(
        pipe(
          string(),
          transform<string, Date>(
            (iso) => new Date(iso),
            (d) => d.toISOString()
          )
        )
      );
      const value = new Date('2026-05-22T00:00:00.000Z');
      const ser = serialize(NullableDate, value);
      expect(ser).toEqual(Success('"2026-05-22T00:00:00.000Z"'));
      expect(serialize(NullableDate, null)).toEqual(Success('null'));
    });

    it('optional with a transformed inner schema encodes the present arm', () => {
      const OptDate = optional(
        pipe(
          string(),
          transform<string, Date>(
            (iso) => new Date(iso),
            (d) => d.toISOString()
          )
        )
      );
      const value = new Date('2026-05-22T00:00:00.000Z');
      const ser = serialize(OptDate, value);
      expect(ser).toEqual(Success('"2026-05-22T00:00:00.000Z"'));
    });

    it('union uses the first branch encoder (documented limitation)', () => {
      const s = union(string(), number());
      // Both branches are identity-encoded primitives, so first-branch encoding
      // is the same as second-branch encoding here. This locks in the contract.
      expect(serialize(s, 'hi')).toEqual(Success('"hi"'));
      expect(serialize(s, 5)).toEqual(Success('5'));
    });

    it('ad-hoc Schema without an encoder falls back to JSON.stringify', () => {
      // A user-supplied plain function still satisfies Schema<T> because
      // [_ENCODER] is optional in the type.
      const plain: Schema<number> = (input: unknown) => (typeof input === 'number' ? Success(input) : Failure([{ kind: 'type', expected: 'number', received: typeof input, path: [], message: 'no' }]));
      const ser = serialize(plain, 99);
      expect(ser).toEqual(Success('99'));
    });
  });

  describe('end-to-end smoke', () => {
    it('full User schema with accumulation, paths, and inference', () => {
      const User = object({
        name: pipe(string(), minLength(1)),
        age: pipe(
          number(),
          refine<number>((n) => n >= 0, 'must be non-negative')
        ),
        email: pipe(string(), regex(/^[^@]+@[^@]+$/))
      });

      type User = InferOutput<typeof User>;
      const valid: User = { name: 'a', age: 5, email: 'x@y' };
      expect(User(valid)).toEqual(Success(valid));

      const r = User({ name: '', age: -1, email: 'x@y' });
      if (r.tag === 'Failure') {
        expect(r.errors).toHaveLength(2);
        expect(r.errors[0]!.path).toEqual(['name']);
        expect(r.errors[1]!.path).toEqual(['age']);
      }

      const Nested = object({ user: User });
      const n = Nested({ user: { name: '', age: 5, email: 'x@y' } });
      if (n.tag === 'Failure') {
        expect(n.errors[0]!.path).toEqual(['user', 'name']);
      }
    });

    it('exports types for consumers', () => {
      const s: Schema<string> = string();
      const issue: Issue = { kind: 'type', expected: 'x', received: 'y', path: [], message: 'm' };
      expect(typeof s).toBe('function');
      expect(issue.kind).toBe('type');
    });

    it('uses Failure/Success constructors directly', () => {
      const direct = Failure([{ kind: 'type' as const, expected: 'a', received: 'b', path: [], message: 'm' }]);
      expect(isFailure(direct)).toBe(true);
      const ok = Success('ok');
      expect(isSuccess(ok)).toBe(true);
    });
  });
});
