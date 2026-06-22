import { describe, it, expect } from 'vitest';
import { date, bigint, url, set, base64Bytes } from '../src/Codec.js';
import { isFailure, isSuccess, Success } from '../src/Validation.js';
import { serialize, deserialize, string } from '../src/Schema.js';

describe('Codec', () => {
  describe('date', () => {
    const d = date();

    it('decodes a valid ISO string to a Date', () => {
      const r = d('2026-05-22T00:00:00.000Z');
      expect(isSuccess(r)).toBe(true);
      if (r.tag === 'Success') {
        expect(r.value).toBeInstanceOf(Date);
        expect(r.value.toISOString()).toBe('2026-05-22T00:00:00.000Z');
      }
    });

    it('rejects non-strings with a type issue', () => {
      const r = d(42);
      expect(isFailure(r)).toBe(true);
      if (r.tag === 'Failure') expect(r.errors[0]!.kind).toBe('type');
    });

    it('rejects unparsable strings with a refinement issue', () => {
      const r = d('not-a-date');
      expect(isFailure(r)).toBe(true);
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.kind).toBe('refinement');
        expect(r.errors[0]!.message).toBe('Expected a valid ISO-8601 date string');
      }
    });

    it('round-trips through serialize / deserialize', () => {
      const value = new Date('2026-05-22T00:00:00.000Z');
      const ser = serialize(d, value);
      expect(ser).toEqual(Success('"2026-05-22T00:00:00.000Z"'));
      if (ser.tag === 'Success') {
        const back = deserialize(d, ser.value);
        if (back.tag === 'Success') expect(back.value.toISOString()).toBe(value.toISOString());
      }
    });
  });

  describe('bigint', () => {
    const b = bigint();

    it('decodes a valid integer string', () => {
      const r = b('42');
      expect(isSuccess(r)).toBe(true);
      if (r.tag === 'Success') expect(r.value).toBe(42n);
    });

    it('decodes a negative integer string', () => {
      const r = b('-17');
      if (r.tag === 'Success') expect(r.value).toBe(-17n);
    });

    it('decodes a value larger than Number.MAX_SAFE_INTEGER', () => {
      const huge = '12345678901234567890';
      const r = b(huge);
      if (r.tag === 'Success') expect(r.value.toString()).toBe(huge);
    });

    it('rejects floats', () => {
      expect(isFailure(b('3.14'))).toBe(true);
    });

    it('rejects non-numeric strings', () => {
      const r = b('abc');
      if (r.tag === 'Failure') expect(r.errors[0]!.message).toBe('Expected a base-10 integer string');
    });

    it('rejects empty string', () => {
      expect(isFailure(b(''))).toBe(true);
    });

    it('rejects non-strings', () => {
      const r = b(42);
      if (r.tag === 'Failure') expect(r.errors[0]!.kind).toBe('type');
    });

    it('round-trips through serialize / deserialize', () => {
      const value = 99999999999999999n;
      const ser = serialize(b, value);
      if (ser.tag === 'Success') {
        expect(ser.value).toBe(`"${value.toString()}"`);
        const back = deserialize(b, ser.value);
        if (back.tag === 'Success') expect(back.value).toBe(value);
      }
    });
  });

  describe('url', () => {
    const u = url();

    it('decodes a valid URL string', () => {
      const r = u('https://example.com/path?q=1');
      expect(isSuccess(r)).toBe(true);
      if (r.tag === 'Success') {
        expect(r.value).toBeInstanceOf(URL);
        expect(r.value.host).toBe('example.com');
      }
    });

    it('rejects invalid URL strings', () => {
      const r = u('not a url');
      if (r.tag === 'Failure') {
        expect(r.errors[0]!.kind).toBe('refinement');
        expect(r.errors[0]!.message).toBe('Expected a valid URL');
      }
    });

    it('rejects non-strings', () => {
      expect(isFailure(u(123))).toBe(true);
    });

    it('round-trips through serialize / deserialize', () => {
      const raw = 'https://example.com/a/b?x=1';
      const decoded = u(raw);
      if (decoded.tag === 'Success') {
        const ser = serialize(u, decoded.value);
        if (ser.tag === 'Success') {
          const back = deserialize(u, ser.value);
          if (back.tag === 'Success') {
            expect(back.value.toString()).toBe(decoded.value.toString());
          }
        }
      }
    });
  });

  describe('set', () => {
    it('decodes an array of strings into a Set (dedupes duplicates)', () => {
      const s = set(string());
      const r = s(['a', 'b', 'b', 'c']);
      if (r.tag === 'Success') {
        expect(r.value).toBeInstanceOf(Set);
        expect([...r.value].sort()).toEqual(['a', 'b', 'c']);
      }
    });

    it('round-trips a Set of Dates through serialize / deserialize', () => {
      const s = set(date());
      const value = new Set([new Date('2026-05-22T00:00:00.000Z'), new Date('2026-05-23T00:00:00.000Z')]);
      const ser = serialize(s, value);
      expect(ser.tag).toBe('Success');
      if (ser.tag === 'Success') {
        const back = deserialize(s, ser.value);
        if (back.tag === 'Success') {
          expect(back.value.size).toBe(2);
          const iso = [...back.value].map((d) => d.toISOString()).sort();
          expect(iso).toEqual(['2026-05-22T00:00:00.000Z', '2026-05-23T00:00:00.000Z']);
        }
      }
    });

    it('rejects non-arrays', () => {
      const s = set(date());
      expect(isFailure(s('not-an-array'))).toBe(true);
    });

    it('accumulates errors from inner items', () => {
      const s = set(date());
      const r = s(['bad-date', 'also-bad']);
      if (r.tag === 'Failure') {
        expect(r.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('base64Bytes', () => {
    const b = base64Bytes();

    it('decodes a valid base64 string to bytes', () => {
      const r = b('aGVsbG8=');
      expect(isSuccess(r)).toBe(true);
      if (r.tag === 'Success') {
        expect(r.value).toBeInstanceOf(Uint8Array);
        expect(Array.from(r.value)).toEqual([104, 101, 108, 108, 111]); // 'hello'
      }
    });

    it('decodes the empty string to an empty Uint8Array', () => {
      const r = b('');
      if (r.tag === 'Success') expect(r.value.length).toBe(0);
    });

    it('rejects non-base64-alphabet input', () => {
      const r = b('not*base64!');
      if (r.tag === 'Failure') expect(r.errors[0]!.message).toBe('Expected base64-encoded string');
    });

    it('rejects strings whose length is not a multiple of 4', () => {
      expect(isFailure(b('YQ='))).toBe(true); // length 3
    });

    it('round-trips arbitrary bytes', () => {
      const bytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
      const ser = serialize(b, bytes);
      if (ser.tag === 'Success') {
        const back = deserialize(b, ser.value);
        if (back.tag === 'Success') {
          expect(Array.from(back.value)).toEqual(Array.from(bytes));
        }
      }
    });
  });
});
