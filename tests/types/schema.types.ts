// Type-level tests for Schema, compiled (never run) by `pnpm check:types` under
// `strict` + `exactOptionalPropertyTypes` (tests/types/tsconfig.json).
//
// Guards the 0.8.0–0.9.0 regression where `Schema<T>` was contravariant in `T`,
// so `object({ s: string() })` and `union(literal('a'), literal('b'))` failed to
// compile in strict consumer projects. If this file stops compiling, consumers
// break too.

import * as S from '../../src/Schema.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// --- The two reported cases ---

export const obj = S.object({ s: S.string() });
export const lit = S.union(S.literal('a'), S.literal('b'));

export type ObjOutput = Expect<Equal<S.InferOutput<typeof obj>, { readonly s: string }>>;
export type LitOutput = Expect<Equal<S.InferOutput<typeof lit>, 'a' | 'b'>>;

// --- Any Schema<T> is assignable to Schema<unknown> ---

export const asUnknown: S.Schema<unknown> = S.string();
export const objAsUnknown: S.Schema<unknown> = obj;

// --- Combinators composed inside object and union ---

const trimmed = S.transform(
  (s: string) => s.trim(),
  (s: string) => s
)(S.string());
const nonEmpty = S.refine((s: string) => s.length > 0, 'required')(S.string());

export const composed = S.object({
  id: S.number(),
  name: nonEmpty,
  slug: trimmed,
  tags: S.array(S.string()),
  note: S.optional(S.string()),
  parent: S.nullable(S.number()),
  kind: S.union(S.literal('a'), S.literal('b'), S.literal(1)),
  nested: S.object({ ok: S.boolean() })
});

export type ComposedOutput = Expect<
  Equal<
    S.InferOutput<typeof composed>,
    {
      readonly id: number;
      readonly name: string;
      readonly slug: string;
      readonly tags: readonly string[];
      readonly note: string | undefined;
      readonly parent: number | null;
      readonly kind: 'a' | 'b' | 1;
      readonly nested: { readonly ok: boolean };
    }
  >
>;

export const unionOfObjects = S.union(S.object({ t: S.literal('x') }), S.object({ t: S.literal('y'), n: S.number() }));

export type UnionOfObjectsOutput = Expect<Equal<S.InferOutput<typeof unionOfObjects>, { readonly t: 'x' } | { readonly t: 'y'; readonly n: number }>>;

// --- serialize still requires a value of the schema's type ---

export const serialized = S.serialize(obj, { s: 'x' });
// @ts-expect-error a number is not a { s: string }
export const badSerialize = S.serialize(obj, 1);
