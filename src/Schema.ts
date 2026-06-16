// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// Schema — Declarative parsers over Validation, with round-trip encoders.
// Inspired by valibot: tree-shakable, function-based, error-accumulating.

import * as Validation from './Validation.js';

/** A single validation issue, with path into nested structures. */
export type Issue = {
  readonly kind: 'type' | 'refinement' | 'transform';
  readonly expected: string;
  readonly received: string;
  readonly path: readonly (string | number)[];
  readonly message: string;
};

const _ENCODER = Symbol('elevate-ts.schema.encoder');

/**
 * A Schema is a callable that decodes unknown input into a Validation<Issue, T>.
 * Schemas constructed via the combinators in this module also carry a
 * `[_ENCODER]` property that `serialize` uses to convert a typed value back
 * into its JSON-native shape. The property is optional in the type so ad-hoc
 * user-defined schemas (plain functions) remain assignable as `Schema<T>`.
 */
export type Schema<T> = ((input: unknown) => Validation.Validation<Issue, T>) & {
  readonly [_ENCODER]?: (value: T) => unknown;
};

/** Infer the success type of a Schema. */
export type InferOutput<S> = S extends (input: unknown) => Validation.Validation<Issue, infer T> ? T : never;

// === Internal helpers ===

const _typeName = (v: unknown): string => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
};

const _fail = (kind: Issue['kind'], expected: string, received: unknown, message: string): Validation.Validation<Issue, never> =>
  Validation.Failure([{ kind, expected, received: _typeName(received), path: [], message }]);

const _prependPath =
  (key: string | number): ((issue: Issue) => Issue) =>
  (issue) => ({ ...issue, path: [key, ...issue.path] });

const _identity = <T>(v: T): T => v;

const _make = <T>(decode: (input: unknown) => Validation.Validation<Issue, T>, encode: (value: T) => unknown): Schema<T> => {
  const schema = decode as Schema<T>;
  Object.defineProperty(schema, _ENCODER, { value: encode, enumerable: false, configurable: false, writable: false });
  return schema;
};

// === Primitives ===

const _decodeString = (input: unknown): Validation.Validation<Issue, string> =>
  typeof input === 'string' ? Validation.Success(input) : _fail('type', 'string', input, `Expected string, got ${_typeName(input)}`);

/** Schema accepting any string. */
export const string = (): Schema<string> => _make<string>(_decodeString, _identity);

const _decodeNumber = (input: unknown): Validation.Validation<Issue, number> =>
  typeof input === 'number' && !Number.isNaN(input) ? Validation.Success(input) : _fail('type', 'number', input, `Expected number, got ${_typeName(input)}`);

/** Schema accepting any non-NaN number. */
export const number = (): Schema<number> => _make<number>(_decodeNumber, _identity);

const _decodeBoolean = (input: unknown): Validation.Validation<Issue, boolean> =>
  typeof input === 'boolean' ? Validation.Success(input) : _fail('type', 'boolean', input, `Expected boolean, got ${_typeName(input)}`);

/** Schema accepting a boolean. */
export const boolean = (): Schema<boolean> => _make<boolean>(_decodeBoolean, _identity);

const _decodeLiteral =
  <L extends string | number | boolean>(value: L) =>
  (input: unknown): Validation.Validation<Issue, L> =>
    input === value ? Validation.Success(value) : _fail('type', `literal(${JSON.stringify(value)})`, input, `Expected ${JSON.stringify(value)}, got ${JSON.stringify(input)}`);

/** Schema accepting a specific literal value (===). */
export const literal = <L extends string | number | boolean>(value: L): Schema<L> => _make<L>(_decodeLiteral(value), _identity);

const _decodeNull = (input: unknown): Validation.Validation<Issue, null> => (input === null ? Validation.Success(null) : _fail('type', 'null', input, `Expected null, got ${_typeName(input)}`));

/** Schema accepting null only. */
export const null_ = (): Schema<null> => _make<null>(_decodeNull, _identity);

const _decodeUndefined = (input: unknown): Validation.Validation<Issue, undefined> =>
  input === undefined ? Validation.Success(undefined) : _fail('type', 'undefined', input, `Expected undefined, got ${_typeName(input)}`);

/** Schema accepting undefined only. */
export const undefined_ = (): Schema<undefined> => _make<undefined>(_decodeUndefined, _identity);

/** Schema accepting anything; passes input through unchanged. */
export const unknown_ = (): Schema<unknown> => _make<unknown>((input) => Validation.Success(input), _identity);

// === Combinators ===

type Shape = Record<string, Schema<unknown>>;
type InferShape<S extends Shape> = { readonly [K in keyof S]: InferOutput<S[K]> };

const _objectDecode = <S extends Shape>(shape: S, input: Record<string, unknown>): Validation.Validation<Issue, InferShape<S>> => {
  const errors: Issue[] = [];
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key];
    if (fieldSchema === undefined) continue;
    const r = fieldSchema(input[key]);
    if (r.tag === 'Failure') errors.push(...r.errors.map(_prependPath(key)));
    else result[key] = r.value;
  }
  return errors.length > 0 ? Validation.Failure(errors) : Validation.Success(result as InferShape<S>);
};

const _objectEncode =
  <S extends Shape>(shape: S) =>
  (value: InferShape<S>): Record<string, unknown> => {
    const v = value as unknown as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      const fieldSchema = shape[key];
      if (fieldSchema === undefined) continue;
      const enc = fieldSchema[_ENCODER];
      result[key] = enc !== undefined ? enc(v[key]) : v[key];
    }
    return result;
  };

/** Object schema: validates each field, accumulates errors with prefixed paths. */
export const object = <S extends Shape>(shape: S): Schema<InferShape<S>> =>
  _make<InferShape<S>>(
    (input) =>
      input === null || typeof input !== 'object' || Array.isArray(input)
        ? _fail('type', 'object', input, `Expected object, got ${_typeName(input)}`)
        : _objectDecode(shape, input as Record<string, unknown>),
    _objectEncode(shape)
  );

const _arrayDecode = <T>(item: Schema<T>, input: readonly unknown[]): Validation.Validation<Issue, readonly T[]> => {
  const errors: Issue[] = [];
  const result: T[] = [];
  for (let i = 0; i < input.length; i++) {
    const r = item(input[i]);
    if (r.tag === 'Failure') errors.push(...r.errors.map(_prependPath(i)));
    else result.push(r.value);
  }
  return errors.length > 0 ? Validation.Failure(errors) : Validation.Success(result);
};

const _arrayEncode =
  <T>(item: Schema<T>) =>
  (value: readonly T[]): readonly unknown[] => {
    const enc = item[_ENCODER];
    return enc !== undefined ? value.map(enc) : (value as readonly unknown[]);
  };

/** Array schema: validates each item, accumulates errors with indexed paths. */
export const array = <T>(item: Schema<T>): Schema<readonly T[]> =>
  _make<readonly T[]>((input) => (Array.isArray(input) ? _arrayDecode(item, input) : _fail('type', 'array', input, `Expected array, got ${_typeName(input)}`)), _arrayEncode(item));

const _unionDecode =
  <T extends readonly Schema<unknown>[]>(schemas: T) =>
  (input: unknown): Validation.Validation<Issue, InferOutput<T[number]>> => {
    const errors: Issue[] = [];
    for (const s of schemas) {
      const r = s(input);
      if (r.tag === 'Success') return Validation.Success(r.value as InferOutput<T[number]>);
      errors.push(...r.errors);
    }
    return Validation.Failure(errors);
  };

const _unionEncode =
  (schemas: readonly Schema<unknown>[]) =>
  (value: unknown): unknown => {
    const first = schemas[0];
    if (first === undefined) throw new Error('Schema.union: empty union has no encoder');
    const enc = first[_ENCODER];
    return enc !== undefined ? enc(value) : value;
  };

/**
 * Union schema: returns the first matching schema; accumulates all errors if
 * none match.
 *
 * Encoding limitation: uses the FIRST branch's encoder. For unions whose
 * branches transform values differently (e.g. one branch is a `transform` and
 * another is a plain primitive), wrap the union in `transform(decode, encode)`
 * with a discriminator-aware custom encoder. See docs/Schema.md.
 */
export const union = <T extends readonly Schema<unknown>[]>(...schemas: T): Schema<InferOutput<T[number]>> =>
  _make<InferOutput<T[number]>>(_unionDecode(schemas), _unionEncode(schemas) as (v: InferOutput<T[number]>) => unknown);

const _optionalEncode =
  <T>(schema: Schema<T>) =>
  (value: T | undefined): unknown => {
    if (value === undefined) return undefined;
    const enc = schema[_ENCODER];
    return enc !== undefined ? enc(value) : value;
  };

/** Optional schema: matches undefined OR the underlying schema. */
export const optional = <T>(schema: Schema<T>): Schema<T | undefined> =>
  _make<T | undefined>((input) => (input === undefined ? Validation.Success(undefined) : schema(input)), _optionalEncode(schema));

const _nullableEncode =
  <T>(schema: Schema<T>) =>
  (value: T | null): unknown => {
    if (value === null) return null;
    const enc = schema[_ENCODER];
    return enc !== undefined ? enc(value) : value;
  };

/** Nullable schema: matches null OR the underlying schema. */
export const nullable = <T>(schema: Schema<T>): Schema<T | null> => _make<T | null>((input) => (input === null ? Validation.Success(null) : schema(input)), _nullableEncode(schema));

// === Refinements (HOF: Schema<T> => Schema<T>) ===

const _refineDecode =
  <T>(schema: Schema<T>, predicate: (value: T) => boolean, message: string) =>
  (input: unknown): Validation.Validation<Issue, T> => {
    const r = schema(input);
    if (r.tag === 'Failure') return r;
    return predicate(r.value) ? r : _fail('refinement', 'refinement', r.value, message);
  };

/** Generic refinement: applies a predicate to a Success value. */
export const refine =
  <T>(predicate: (value: T) => boolean, message: string): ((schema: Schema<T>) => Schema<T>) =>
  (schema) =>
    _make<T>(_refineDecode(schema, predicate, message), schema[_ENCODER] ?? _identity);

/** Refine: value must have length >= n (strings, arrays). */
export const minLength =
  (n: number) =>
  <T extends { readonly length: number }>(schema: Schema<T>): Schema<T> =>
    refine<T>((v) => v.length >= n, `Expected length >= ${n}`)(schema);

/** Refine: value must have length <= n (strings, arrays). */
export const maxLength =
  (n: number) =>
  <T extends { readonly length: number }>(schema: Schema<T>): Schema<T> =>
    refine<T>((v) => v.length <= n, `Expected length <= ${n}`)(schema);

/** Refine: string must match a regex pattern. */
export const regex =
  (pattern: RegExp, message?: string): ((schema: Schema<string>) => Schema<string>) =>
  (schema) =>
    refine<string>((v) => pattern.test(v), message ?? `Expected match for ${pattern}`)(schema);

// === Transform ===

const _missingEncoder = (): never => {
  throw new Error('Schema.transform: encodeFn is required for serialize; pass encodeFn to transform to enable round-tripping');
};

const _transformDecode =
  <A, B>(schema: Schema<A>, decodeFn: (a: A) => B) =>
  (input: unknown): Validation.Validation<Issue, B> => {
    const r = schema(input);
    return r.tag === 'Failure' ? r : Validation.Success(decodeFn(r.value));
  };

const _transformEncode = <A, B>(schema: Schema<A>, encodeFn?: (b: B) => A): ((b: B) => unknown) => {
  if (encodeFn === undefined) return _missingEncoder;
  return (b: B): unknown => {
    const innerEnc = schema[_ENCODER];
    const a = encodeFn(b);
    return innerEnc !== undefined ? innerEnc(a) : a;
  };
};

/**
 * Transform decoded value; optionally provide an inverse encoder.
 *
 * If `encodeFn` is omitted, the schema can still decode but cannot be
 * serialized — `serialize` will return a Failure with a clear message. Pass
 * `encodeFn` to enable round-tripping.
 */
export const transform =
  <A, B>(decodeFn: (a: A) => B, encodeFn?: (b: B) => A): ((schema: Schema<A>) => Schema<B>) =>
  (schema) =>
    _make<B>(_transformDecode(schema, decodeFn), _transformEncode(schema, encodeFn));

// === Serialization ===

/**
 * Serialize a typed value to JSON via the schema's encoder.
 *
 * For schemas built from the combinators in this module, this applies any
 * `transform` encoders bottom-up before calling `JSON.stringify`. For ad-hoc
 * user-defined schemas without an encoder, the value is passed directly to
 * `JSON.stringify` (preserving the prior behavior). Errors during encoding or
 * stringification become a `Failure` with a clear message.
 */
export const serialize = <T>(schema: Schema<T>, value: T): Validation.Validation<Issue, string> => {
  try {
    const enc = schema[_ENCODER];
    const encoded = enc !== undefined ? enc(value) : (value as unknown);
    return Validation.Success(JSON.stringify(encoded));
  } catch (e) {
    return _fail('transform', 'serializable via schema', value, `serialize failed: ${(e as Error).message}`);
  }
};

/** Parse a JSON string and validate it against a schema. */
export const deserialize = <T>(schema: Schema<T>, raw: string): Validation.Validation<Issue, T> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return _fail('transform', 'valid JSON', raw, `JSON.parse failed: ${(e as Error).message}`);
  }
  return schema(parsed);
};
