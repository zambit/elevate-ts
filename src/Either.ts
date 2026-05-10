// Either — Left/Right error handling

/** Represents a Left (error) value. */
export type Left<L> = { readonly tag: 'Left'; readonly left: L };

/** Represents a Right (success) value. */
export type Right<R> = { readonly tag: 'Right'; readonly right: R };

/** Result type: Left<L> (error) or Right<R> (success). */
export type Either<L, R> = Left<L> | Right<R>;

// Private prototypes for Fantasy Land methods. Constructors return values
// whose prototype chain is rooted at these objects, NOT at Object.prototype.
// See docs/PROTOTYPE_ISOLATION.md for why this matters.
const _leftProto: Record<string, unknown> = {};
const _rightProto: Record<string, unknown> = {};

/** Create a Left value. */
export const Left = <L>(left: L): Left<L> => Object.assign(Object.create(_leftProto), { tag: 'Left' as const, left });

/** Create a Right value. */
export const Right = <R>(right: R): Right<R> => Object.assign(Object.create(_rightProto), { tag: 'Right' as const, right });

/** Test if Either is Left. */
export const isLeft = <L, R>(ea: Either<L, R>): ea is Left<L> => ea.tag === 'Left';

/** Test if Either is Right. */
export const isRight = <L, R>(ea: Either<L, R>): ea is Right<R> => ea.tag === 'Right';

/** Lift a nullable value into Either. */
export const fromNullable =
  <L, R>(onNull: L): ((value: R | null | undefined) => Either<L, R>) =>
  (value) =>
    value == null ? Left(onNull) : Right(value);

/** Construct Right if predicate holds, Left otherwise. */
export const fromPredicate =
  <L, A>(predicate: (a: A) => boolean, onFalse: (a: A) => L): ((a: A) => Either<L, A>) =>
  (a) =>
    predicate(a) ? Right(a) : Left(onFalse(a));

/** Convert Either to Maybe, discarding Left. */
export const toMaybe = <L, R>(ea: Either<L, R>) => {
  if (ea.tag === 'Right') {
    return { tag: 'Just' as const, value: ea.right };
  }
  return { tag: 'Nothing' as const };
};

/** Extract Right or null. */
export const toNullable = <L, R>(ea: Either<L, R>): R | null => (ea.tag === 'Right' ? ea.right : null);

/** Functor map over Right. */
export const map =
  <L, A, B>(f: (a: A) => B): ((ea: Either<L, A>) => Either<L, B>) =>
  (ea) =>
    ea.tag === 'Right' ? Right(f(ea.right)) : ea;

/** Map over Left. */
export const mapLeft =
  <L, L2, R>(f: (l: L) => L2): ((ea: Either<L, R>) => Either<L2, R>) =>
  (ea) =>
    ea.tag === 'Left' ? Left(f(ea.left)) : ea;

/** Bifunctor bimap. */
export const bimap =
  <L, L2, A, B>(f: (l: L) => L2, g: (a: A) => B): ((ea: Either<L, A>) => Either<L2, B>) =>
  (ea) =>
    ea.tag === 'Left' ? Left(f(ea.left)) : Right(g(ea.right));

/** Applicative ap. */
export const ap =
  <L, A, B>(ef: Either<L, (a: A) => B>): ((ea: Either<L, A>) => Either<L, B>) =>
  (ea) =>
    ef.tag === 'Left' ? ef : ea.tag === 'Left' ? ea : Right(ef.right(ea.right));

/** Monadic bind (flatMap). */
export const chain =
  <L, A, B>(f: (a: A) => Either<L, B>): ((ea: Either<L, A>) => Either<L, B>) =>
  (ea) =>
    ea.tag === 'Left' ? ea : f(ea.right);

/** Chain over Left. */
export const chainLeft =
  <L, L2, R>(f: (l: L) => Either<L2, R>): ((ea: Either<L, R>) => Either<L2, R>) =>
  (ea) =>
    ea.tag === 'Left' ? f(ea.left) : ea;

/** Extract Right or default. */
export const getOrElse =
  <L, R>(r: R): ((ea: Either<L, R>) => R) =>
  (ea) =>
    ea.tag === 'Right' ? ea.right : r;

/** Extract Right or compute from Left. */
export const getOrElseL =
  <L, R>(f: (l: L) => R): ((ea: Either<L, R>) => R) =>
  (ea) =>
    ea.tag === 'Right' ? ea.right : f(ea.left);

/** Case analysis. */
export const fold =
  <L, R, B>(onLeft: (l: L) => B, onRight: (r: R) => B): ((ea: Either<L, R>) => B) =>
  (ea) =>
    ea.tag === 'Left' ? onLeft(ea.left) : onRight(ea.right);

/** Swap Left and Right. */
export const swap = <L, R>(ea: Either<L, R>): Either<R, L> => (ea.tag === 'Left' ? Right(ea.left) : Left(ea.right));

/** Wrap throwing function in Either. */
export const tryCatch = <L, R>(f: () => R, onError: (e: unknown) => L): Either<L, R> => {
  try {
    return Right(f());
  } catch (e) {
    return Left(onError(e));
  }
};

/** Partition array of Eithers into Left and Right arrays. */
export const partitionEithers = <L, R>(eithers: readonly Either<L, R>[]): readonly [readonly L[], readonly R[]] => {
  const lefts: L[] = [];
  const rights: R[] = [];
  for (const ea of eithers) {
    if (ea.tag === 'Left') {
      lefts.push(ea.left);
    } else {
      rights.push(ea.right);
    }
  }
  return [lefts, rights];
};

/** Extract all Lefts. */
export const lefts = <L, R>(eithers: readonly Either<L, R>[]): readonly L[] => eithers.flatMap((ea) => (ea.tag === 'Left' ? [ea.left] : []));

/** Extract all Rights. */
export const rights = <L, R>(eithers: readonly Either<L, R>[]): readonly R[] => eithers.flatMap((ea) => (ea.tag === 'Right' ? [ea.right] : []));

/** Sequence all-or-Left. */
export const sequence = <L, A>(eithers: readonly Either<L, A>[]): Either<L, readonly A[]> => {
  const result: A[] = [];
  for (const ea of eithers) {
    if (ea.tag === 'Left') return ea;
    result.push(ea.right);
  }
  return Right(result);
};

/** Traverse a sequence. */
export const traverse =
  <L, A, B>(f: (a: A) => Either<L, B>): ((as: readonly A[]) => Either<L, readonly B[]>) =>
  (as) =>
    sequence(as.map(f));

// Fantasy Land symbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flMap = <L, A, B>(f: (a: A) => B): ((ea: Either<L, A>) => Either<L, B>) => map(f);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flAp = <L, A, B>(ef: Either<L, (a: A) => B>): ((ea: Either<L, A>) => Either<L, B>) => ap(ef);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flChain = <L, A, B>(f: (a: A) => Either<L, B>): ((ea: Either<L, A>) => Either<L, B>) => chain(f);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flBimap = <L, L2, A, B>(f: (l: L) => L2, g: (a: A) => B): ((ea: Either<L, A>) => Either<L2, B>) => bimap(f, g);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flReduce =
  <L, A, B>(f: (b: B, a: A) => B, b: B): ((ea: Either<L, A>) => B) =>
  (ea) =>
    ea.tag === 'Right' ? f(b, ea.right) : b;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flEquals =
  <L, R>(other: Either<L, R>): ((ea: Either<L, R>) => boolean) =>
  (ea) =>
    ea.tag === 'Left' ? other.tag === 'Left' && ea.left === other.left : other.tag === 'Right' && ea.right === other.right;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flAlt =
  <L, R>(ealt: Either<L, R>): ((ea: Either<L, R>) => Either<L, R>) =>
  (ea) =>
    ea.tag === 'Right' ? ea : ealt;

Object.defineProperty(Right, 'fantasy-land/of', { value: Right });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
_rightProto['fantasy-land/map'] = function <L, A, B>(this: Right<A>, f: (a: A) => B) {
  return Right(f(this.right));
};
_rightProto['fantasy-land/ap'] = function <L, A, B>(this: Right<(a: A) => B>, ea: Either<L, A>) {
  return ap(this)(ea);
};
_rightProto['fantasy-land/chain'] = function <L, A, B>(this: Right<A>, f: (a: A) => Either<L, B>) {
  return f(this.right);
};
_rightProto['fantasy-land/bimap'] = function <L, L2, A, B>(this: Right<A>, f: (l: L) => L2, g: (a: A) => B) {
  return Right(g(this.right));
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_rightProto['fantasy-land/reduce'] = function <L, A, B>(this: Right<A>, f: (b: B, a: A) => B, b: B) {
  return f(b, this.right);
};
_rightProto['fantasy-land/equals'] = function <L, A>(this: Right<A>, other: Either<L, A>) {
  return other.tag === 'Right' && this.right === other.right;
};
_rightProto['fantasy-land/alt'] = function <L, R>(this: Right<R>, _ealt: Either<L, R>) {
  return this;
};

_leftProto['fantasy-land/map'] = function <L, A, B>(this: Left<L>, _f: (a: A) => B) {
  return this;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_leftProto['fantasy-land/ap'] = function <L, A, _B>(this: Left<L>, _ea: Either<L, A>) {
  return this;
};
_leftProto['fantasy-land/chain'] = function <L, A, B>(this: Left<L>, _f: (a: A) => Either<L, B>) {
  return this;
};
_leftProto['fantasy-land/bimap'] = function <L, L2, A, B>(this: Left<L>, f: (l: L) => L2, _g: (a: A) => B) {
  return Left(f(this.left));
};
_leftProto['fantasy-land/reduce'] = function <L, A, B>(this: Left<L>, f: (b: B, a: A) => B, b: B) {
  return b;
};
// istanbul ignore next
_leftProto['fantasy-land/equals'] = function <L, R>(this: Left<L>, other: Either<L, R>) {
  return other.tag === 'Left' && this.left === other.left;
};
// istanbul ignore next
_leftProto['fantasy-land/alt'] = function <L, R>(this: Left<L>, ealt: Either<L, R>) {
  return ealt;
};
