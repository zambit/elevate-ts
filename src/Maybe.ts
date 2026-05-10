// Maybe — Optional values

/** Represents a Just value. */
export type Just<A> = { readonly tag: 'Just'; readonly value: A };

/** Represents the absence of a value. */
export type Nothing = { readonly tag: 'Nothing' };

/** Optional value: Just<A> (present) or Nothing (absent). */
export type Maybe<A> = Just<A> | Nothing;

// Private prototypes for Fantasy Land methods. Constructors return values
// whose prototype chain is rooted at these objects, NOT at Object.prototype.
// See docs/PROTOTYPE_ISOLATION.md for why this matters.
const _justProto: Record<string, unknown> = {};
const _nothingProto: Record<string, unknown> = {};

/** Create a Just value. */
export const Just = <A>(value: A): Just<A> => Object.assign(Object.create(_justProto), { tag: 'Just' as const, value });

/** The Nothing singleton. */
export const Nothing: Nothing = Object.assign(Object.create(_nothingProto), { tag: 'Nothing' as const });

/** Test if a Maybe is Just. */
export const isJust = <A>(ma: Maybe<A>): ma is Just<A> => ma.tag === 'Just';

/** Test if a Maybe is Nothing. */
export const isNothing = <A>(ma: Maybe<A>): ma is Nothing => ma.tag === 'Nothing';

/** Lift a possibly-null value into Maybe. */
export const fromNullable = <A>(a: A | null | undefined): Maybe<A> => (a == null ? Nothing : Just(a));

/** Construct Just if predicate holds, Nothing otherwise. */
export const fromPredicate =
  <A>(predicate: (a: A) => boolean): ((a: A) => Maybe<A>) =>
  (a) =>
    predicate(a) ? Just(a) : Nothing;

/** Extract value or null. */
export const toNullable = <A>(ma: Maybe<A>): A | null => (ma.tag === 'Just' ? ma.value : null);

/** Lift to 0 or 1 element array. */
export const toArray = <A>(ma: Maybe<A>): readonly A[] => (ma.tag === 'Just' ? [ma.value] : []);

/** Functor map. */
export const map =
  <A, B>(f: (a: A) => B): ((ma: Maybe<A>) => Maybe<B>) =>
  (ma) =>
    ma.tag === 'Just' ? Just(f(ma.value)) : Nothing;

/** Applicative ap. */
export const ap =
  <A, B>(mf: Maybe<(a: A) => B>): ((ma: Maybe<A>) => Maybe<B>) =>
  (ma) =>
    mf.tag === 'Just' && ma.tag === 'Just' ? Just(mf.value(ma.value)) : Nothing;

/** Monadic bind (flatMap). */
export const chain =
  <A, B>(f: (a: A) => Maybe<B>): ((ma: Maybe<A>) => Maybe<B>) =>
  (ma) =>
    ma.tag === 'Just' ? f(ma.value) : Nothing;

/** Chain with nullable result. */
export const chainNullable =
  <A, B>(f: (a: A) => B | null | undefined): ((ma: Maybe<A>) => Maybe<B>) =>
  (ma) =>
    ma.tag === 'Just' ? fromNullable(f(ma.value)) : Nothing;

/** Extract value or provide a default. */
export const getOrElse =
  <A>(a: A): ((ma: Maybe<A>) => A) =>
  (ma) =>
    ma.tag === 'Just' ? ma.value : a;

/** Extract value or compute a default lazily. */
export const getOrElseL =
  <A>(f: () => A): ((ma: Maybe<A>) => A) =>
  (ma) =>
    ma.tag === 'Just' ? ma.value : f();

/** Alt: use alternative if first is Nothing. */
export const alt =
  <A>(malt: Maybe<A>): ((ma: Maybe<A>) => Maybe<A>) =>
  (ma) =>
    ma.tag === 'Just' ? ma : malt;

/** Alt with lazy alternative. */
export const altL =
  <A>(f: () => Maybe<A>): ((ma: Maybe<A>) => Maybe<A>) =>
  (ma) =>
    ma.tag === 'Just' ? ma : f();

/** Keep if predicate holds, otherwise Nothing. */
export const filter =
  <A>(predicate: (a: A) => boolean): ((ma: Maybe<A>) => Maybe<A>) =>
  (ma) =>
    ma.tag === 'Just' && predicate(ma.value) ? ma : Nothing;

/** Case analysis. */
export const fold =
  <A, B>(onNothing: B, onJust: (a: A) => B): ((ma: Maybe<A>) => B) =>
  (ma) =>
    ma.tag === 'Just' ? onJust(ma.value) : onNothing;

/** Filter out Nothing; collect Just values. */
export const catMaybes = <A>(maybes: readonly Maybe<A>[]): readonly A[] => maybes.flatMap((ma) => (ma.tag === 'Just' ? [ma.value] : []));

/** Map then catMaybes. */
export const mapMaybe =
  <A, B>(f: (a: A) => Maybe<B>): ((as: readonly A[]) => readonly B[]) =>
  (as) =>
    catMaybes(as.map(f));

/** Sequence all-or-Nothing. */
export const sequence = <A>(maybes: readonly Maybe<A>[]): Maybe<readonly A[]> => {
  const result: A[] = [];
  for (const ma of maybes) {
    if (ma.tag === 'Nothing') return Nothing;
    result.push(ma.value);
  }
  return Just(result);
};

/** Traverse a sequence. */
export const traverse =
  <A, B>(f: (a: A) => Maybe<B>): ((as: readonly A[]) => Maybe<readonly B[]>) =>
  (as) =>
    sequence(as.map(f));

// Fantasy Land symbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flMap = <A, B>(f: (a: A) => B): ((ma: Maybe<A>) => Maybe<B>) => map(f);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flAp = <A, B>(mf: Maybe<(a: A) => B>): ((ma: Maybe<A>) => Maybe<B>) => ap(mf);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flChain = <A, B>(f: (a: A) => Maybe<B>): ((ma: Maybe<A>) => Maybe<B>) => chain(f);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flFilter = <A>(predicate: (a: A) => boolean): ((ma: Maybe<A>) => Maybe<A>) => filter(predicate);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flReduce =
  <A, B>(f: (b: B, a: A) => B, b: B): ((ma: Maybe<A>) => B) =>
  (ma) =>
    ma.tag === 'Just' ? f(b, ma.value) : b;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flEquals =
  <A>(a: A): ((ma: Maybe<A>) => boolean) =>
  (ma) =>
    ma.tag === 'Just' && ma.value === a;

Object.defineProperty(Just, 'fantasy-land/of', { value: Just });
Object.defineProperty(Nothing, 'fantasy-land/zero', { value: Nothing });

_justProto['fantasy-land/map'] = function <A, B>(this: Just<A>, f: (a: A) => B) {
  return Just(f(this.value));
};
_justProto['fantasy-land/ap'] = function <A, B>(this: Just<(a: A) => B>, ma: Maybe<A>) {
  return ap(this)(ma);
};
_justProto['fantasy-land/chain'] = function <A, B>(this: Just<A>, f: (a: A) => Maybe<B>) {
  return f(this.value);
};
_justProto['fantasy-land/alt'] = function <A>(this: Just<A>, _malt: Maybe<A>) {
  return this;
};
_justProto['fantasy-land/filter'] = function <A>(this: Just<A>, predicate: (a: A) => boolean) {
  return predicate(this.value) ? this : Nothing;
};
_justProto['fantasy-land/reduce'] = function <A, B>(this: Just<A>, f: (b: B, a: A) => B, b: B) {
  return f(b, this.value);
};
_justProto['fantasy-land/equals'] = function <A>(this: Just<A>, other: Maybe<A>) {
  return other.tag === 'Just' && this.value === other.value;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
_nothingProto['fantasy-land/map'] = function <A, B>(this: Nothing, f: (a: A) => B) {
  return Nothing;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_nothingProto['fantasy-land/ap'] = function <_A, B>(this: Nothing, _ma: Maybe<_A>) {
  return Nothing;
};
_nothingProto['fantasy-land/chain'] = function <A, B>(this: Nothing, _f: (a: A) => Maybe<B>) {
  return Nothing;
};
_nothingProto['fantasy-land/alt'] = function <A>(this: Nothing, malt: Maybe<A>) {
  return malt;
};
_nothingProto['fantasy-land/filter'] = function <A>(this: Nothing, _predicate: (a: A) => boolean) {
  return Nothing;
};
_nothingProto['fantasy-land/reduce'] = function <A, B>(this: Nothing, f: (b: B, a: A) => B, b: B) {
  return b;
};
// istanbul ignore next
_nothingProto['fantasy-land/equals'] = function <A>(this: Nothing, other: Maybe<A>) {
  return other.tag === 'Nothing';
};

/** Convert a Maybe to an Either. */
export const toEither =
  <E, A>(onNothing: E): ((ma: Maybe<A>) => { readonly tag: 'Right'; readonly right: A } | { readonly tag: 'Left'; readonly left: E }) =>
  (ma) => {
    const Right = <R>(right: R) => ({ tag: 'Right' as const, right });
    const Left = <L>(left: L) => ({ tag: 'Left' as const, left });
    return ma.tag === 'Just' ? Right(ma.value) : Left(onNothing);
  };
