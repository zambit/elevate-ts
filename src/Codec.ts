// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// Codec — Ready-made schemas with both halves wired (decode + encode).
//
// These are pure compositions of Schema combinators. They exist so users
// reaching for the common non-JSON-native types (Date, BigInt, URL, Set,
// Uint8Array) get a correct round-trip without rebuilding the same
// `transform(decode, encode)` boilerplate at every call site.

import { pipe } from './Function.js';
import * as Schema from './Schema.js';

// === Date ===

/**
 * ISO-8601 string ↔ Date.
 *
 * Decode accepts any string `new Date(s)` can parse and refines to reject
 * `Invalid Date`. Encode produces `d.toISOString()`. Round-trips cleanly via
 * `serialize` / `deserialize`.
 *
 * @example
 * ```ts
 * import { date } from '@zambit/elevate-ts/Codec';
 * import { serialize, deserialize } from '@zambit/elevate-ts/Schema';
 *
 * date()('2026-05-22T00:00:00.000Z'); // => Success(Date 2026-05-22T00:00:00.000Z)
 * date()('not-a-date');               // => Failure([{ kind: 'refinement', ... }])
 *
 * // Round-trip: decoded Date <-> ISO string on the wire.
 * const wire = serialize(date(), new Date(0)); // => Success('"1970-01-01T00:00:00.000Z"')
 * if (wire.tag === 'Success') deserialize(date(), wire.value); // => Success(Date 1970-...)
 * ```
 */
export const date = (): Schema.Schema<Date> =>
  pipe(
    Schema.string(),
    Schema.transform<string, Date>(
      (iso) => new Date(iso),
      (d) => d.toISOString()
    ),
    Schema.refine<Date>((d) => !Number.isNaN(d.getTime()), 'Expected a valid ISO-8601 date string')
  );

// === BigInt ===

const _INT_RE = /^-?\d+$/;

/**
 * Decimal string ↔ bigint.
 *
 * JSON cannot represent `bigint` natively; the on-wire form is a decimal
 * string. The decoder pre-validates with a regex so the underlying
 * `BigInt(s)` call never throws.
 *
 * @example
 * ```ts
 * import { bigint } from '@zambit/elevate-ts/Codec';
 * import { serialize, deserialize } from '@zambit/elevate-ts/Schema';
 *
 * bigint()('99999999999999999'); // => Success(99999999999999999n) — exact past MAX_SAFE_INTEGER
 * bigint()('3.14');              // => Failure (not a base-10 integer string)
 *
 * const wire = serialize(bigint(), 42n); // => Success('"42"')
 * if (wire.tag === 'Success') deserialize(bigint(), wire.value); // => Success(42n)
 * ```
 */
export const bigint = (): Schema.Schema<bigint> =>
  pipe(
    Schema.string(),
    Schema.refine<string>((s) => _INT_RE.test(s), 'Expected a base-10 integer string'),
    Schema.transform<string, bigint>(
      (s) => BigInt(s),
      (b) => b.toString()
    )
  );

// === URL ===

/**
 * String ↔ URL.
 *
 * Decode validates via `URL.canParse` (available in Workers, Node 19+, modern
 * browsers) before constructing, so the underlying `new URL(s)` never throws.
 * Encode is `u.toString()`.
 *
 * @example
 * ```ts
 * import { url } from '@zambit/elevate-ts/Codec';
 * import { serialize } from '@zambit/elevate-ts/Schema';
 *
 * const r = url()('https://example.com/path?q=1'); // => Success(URL)
 * if (r.tag === 'Success') r.value.host;            // => 'example.com'
 * url()('not a url');                               // => Failure (not a valid URL)
 *
 * serialize(url(), new URL('https://example.com')); // => Success('"https://example.com/"')
 * ```
 */
export const url = (): Schema.Schema<URL> =>
  pipe(
    Schema.string(),
    Schema.refine<string>((s) => URL.canParse(s), 'Expected a valid URL'),
    Schema.transform<string, URL>(
      (s) => new URL(s),
      (u) => u.toString()
    )
  );

// === Set ===

/**
 * `readonly T[]` ↔ `ReadonlySet<T>`.
 *
 * JSON has no native Set; the on-wire form is an array. The inner schema's
 * encoder runs over each element first (so `set(date())` round-trips Dates).
 * Duplicates in the on-wire array collapse to a single Set entry; that is
 * the intended behavior of `new Set(array)`.
 *
 * @example
 * ```ts
 * import { set, date } from '@zambit/elevate-ts/Codec';
 * import { string, serialize, deserialize } from '@zambit/elevate-ts/Schema';
 *
 * set(string())(['a', 'b', 'b']); // => Success(Set {'a', 'b'}) — duplicates collapse
 *
 * // The inner codec encodes each element, so a Set of Dates round-trips.
 * const tags = set(date());
 * const wire = serialize(tags, new Set([new Date(0)])); // => Success('["1970-01-01T00:00:00.000Z"]')
 * if (wire.tag === 'Success') deserialize(tags, wire.value); // => Success(Set { Date 1970-... })
 * ```
 */
export const set = <T>(item: Schema.Schema<T>): Schema.Schema<ReadonlySet<T>> =>
  pipe(
    Schema.array(item),
    Schema.transform<readonly T[], ReadonlySet<T>>(
      (arr) => new Set(arr),
      (s) => [...s]
    )
  );

// === Base64 bytes ===

const _BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

const _bytesToBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] as number);
  return btoa(s);
};

const _base64ToBytes = (s: string): Uint8Array => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/**
 * Base64-encoded string ↔ Uint8Array.
 *
 * Decode validates the base64 alphabet and length-mod-4 before calling
 * `atob`, so the underlying decode never throws. Useful for transporting
 * binary payloads through JSON (Workers KV/R2 blobs, signed-blob payloads,
 * etc.).
 *
 * @example
 * ```ts
 * import { base64Bytes } from '@zambit/elevate-ts/Codec';
 * import { serialize, deserialize } from '@zambit/elevate-ts/Schema';
 *
 * base64Bytes()('aGVsbG8='); // => Success(Uint8Array [104,101,108,108,111]) — 'hello'
 * base64Bytes()('YQ=');      // => Failure (length not a multiple of 4)
 *
 * const bytes = new Uint8Array([0, 255]);
 * const wire = serialize(base64Bytes(), bytes); // => Success('"AP8="')
 * if (wire.tag === 'Success') deserialize(base64Bytes(), wire.value); // => Success(Uint8Array [0,255])
 * ```
 */
export const base64Bytes = (): Schema.Schema<Uint8Array> =>
  pipe(
    Schema.string(),
    Schema.refine<string>((s) => _BASE64_RE.test(s) && s.length % 4 === 0, 'Expected base64-encoded string'),
    Schema.transform<string, Uint8Array>(_base64ToBytes, _bytesToBase64)
  );
