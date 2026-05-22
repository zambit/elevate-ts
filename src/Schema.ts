// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// Schema — Declarative parsers over Validation
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

/** A Schema is a function from unknown input to a Validation result. */
export type Schema<T> = (input: unknown) => Validation.Validation<Issue, T>;

/** Infer the success type of a Schema. */
export type InferOutput<S> = S extends Schema<infer T> ? T : never;

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

// === Primitives ===

/** Schema accepting any string. */
export const string = (): Schema<string> => (input) => (typeof input === 'string' ? Validation.Success(input) : _fail('type', 'string', input, `Expected string, got ${_typeName(input)}`));

/** Schema accepting any non-NaN number. */
export const number = (): Schema<number> => (input) =>
  typeof input === 'number' && !Number.isNaN(input) ? Validation.Success(input) : _fail('type', 'number', input, `Expected number, got ${_typeName(input)}`);

/** Schema accepting a boolean. */
export const boolean = (): Schema<boolean> => (input) => (typeof input === 'boolean' ? Validation.Success(input) : _fail('type', 'boolean', input, `Expected boolean, got ${_typeName(input)}`));

/** Schema accepting a specific literal value (===). */
export const literal =
  <L extends string | number | boolean>(value: L): Schema<L> =>
  (input) =>
    input === value ? Validation.Success(value) : _fail('type', `literal(${JSON.stringify(value)})`, input, `Expected ${JSON.stringify(value)}, got ${JSON.stringify(input)}`);

/** Schema accepting null only. */
export const null_ = (): Schema<null> => (input) => (input === null ? Validation.Success(null) : _fail('type', 'null', input, `Expected null, got ${_typeName(input)}`));

/** Schema accepting undefined only. */
export const undefined_ = (): Schema<undefined> => (input) => (input === undefined ? Validation.Success(undefined) : _fail('type', 'undefined', input, `Expected undefined, got ${_typeName(input)}`));

/** Schema accepting anything; passes input through unchanged. */
export const unknown_ = (): Schema<unknown> => (input) => Validation.Success(input);

// === Combinators ===

type Shape = Record<string, Schema<unknown>>;
type InferShape<S extends Shape> = { readonly [K in keyof S]: InferOutput<S[K]> };

const _objectValidate = <S extends Shape>(shape: S, input: Record<string, unknown>): Validation.Validation<Issue, InferShape<S>> => {
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

/** Object schema: validates each field, accumulates errors with prefixed paths. */
export const object =
  <S extends Shape>(shape: S): Schema<InferShape<S>> =>
  (input) =>
    input === null || typeof input !== 'object' || Array.isArray(input)
      ? _fail('type', 'object', input, `Expected object, got ${_typeName(input)}`)
      : _objectValidate(shape, input as Record<string, unknown>);

const _arrayValidate = <T>(item: Schema<T>, input: readonly unknown[]): Validation.Validation<Issue, readonly T[]> => {
  const errors: Issue[] = [];
  const result: T[] = [];
  for (let i = 0; i < input.length; i++) {
    const r = item(input[i]);
    if (r.tag === 'Failure') errors.push(...r.errors.map(_prependPath(i)));
    else result.push(r.value);
  }
  return errors.length > 0 ? Validation.Failure(errors) : Validation.Success(result);
};

/** Array schema: validates each item, accumulates errors with indexed paths. */
export const array =
  <T>(item: Schema<T>): Schema<readonly T[]> =>
  (input) =>
    Array.isArray(input) ? _arrayValidate(item, input) : _fail('type', 'array', input, `Expected array, got ${_typeName(input)}`);

/** Union schema: returns the first matching schema; accumulates all errors if none match. */
export const union =
  <T extends readonly Schema<unknown>[]>(...schemas: T): Schema<InferOutput<T[number]>> =>
  (input) => {
    const errors: Issue[] = [];
    for (const s of schemas) {
      const r = s(input);
      if (r.tag === 'Success') return Validation.Success(r.value as InferOutput<T[number]>);
      errors.push(...r.errors);
    }
    return Validation.Failure(errors);
  };

/** Optional schema: matches undefined OR the underlying schema. */
export const optional =
  <T>(schema: Schema<T>): Schema<T | undefined> =>
  (input) =>
    input === undefined ? Validation.Success(undefined) : schema(input);

/** Nullable schema: matches null OR the underlying schema. */
export const nullable =
  <T>(schema: Schema<T>): Schema<T | null> =>
  (input) =>
    input === null ? Validation.Success(null) : schema(input);

// === Refinements (HOF: Schema<T> => Schema<T>) ===

/** Generic refinement: applies a predicate to a Success value. */
export const refine =
  <T>(predicate: (value: T) => boolean, message: string): ((schema: Schema<T>) => Schema<T>) =>
  (schema) =>
  (input) => {
    const r = schema(input);
    if (r.tag === 'Failure') return r;
    return predicate(r.value) ? r : _fail('refinement', 'refinement', r.value, message);
  };

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

const _ENCODER = Symbol('elevate-ts.schema.encoder');
type WithEncoder<B> = Schema<B> & { [_ENCODER]?: (value: B) => unknown };

/**
 * Transform decoded value; optionally provide an inverse encoder.
 * The `encodeFn` argument is preserved on the returned schema for future
 * round-trip-aware serialization. v1 serialize() uses JSON.stringify only.
 */
export const transform =
  <A, B>(decodeFn: (a: A) => B, encodeFn?: (b: B) => A): ((schema: Schema<A>) => Schema<B>) =>
  (schema) => {
    const decoded: WithEncoder<B> = (input) => {
      const r = schema(input);
      return r.tag === 'Failure' ? r : Validation.Success(decodeFn(r.value));
    };
    if (encodeFn !== undefined) decoded[_ENCODER] = encodeFn as (b: B) => unknown;
    return decoded;
  };

// === Serialization ===

/** Serialize a typed value to JSON. v1 delegates to JSON.stringify. */
export const serialize = <T>(_schema: Schema<T>, value: T): Validation.Validation<Issue, string> => {
  try {
    return Validation.Success(JSON.stringify(value));
  } catch (e) {
    return _fail('transform', 'JSON-serializable', value, `JSON.stringify failed: ${(e as Error).message}`);
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
