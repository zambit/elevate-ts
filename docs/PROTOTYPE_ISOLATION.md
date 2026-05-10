# Prototype Isolation for Fantasy Land Methods

## Why this document exists

elevate-ts implements the Fantasy Land specification by attaching methods like `fantasy-land/map`, `fantasy-land/chain`, etc. to the prototype of values returned by constructors (`Right`, `Left`,
`Just`, `Nothing`, `Reader`, `State`, `Tuple`). The obvious-looking way to do this — and the way it was done initially — has a load-bearing bug. This document is what a returning maintainer reads in 6
months to understand why the current code looks the way it does, and why the obvious "cleanup" would break the world.

If you are about to "simplify" something in [src/Either.ts](../src/Either.ts) or [src/Maybe.ts](../src/Maybe.ts) by replacing `Object.assign(Object.create(_rightProto), ...)` with a plain object
literal, **stop and read this doc first**.

## Problem statement

The original implementation looked like this:

```ts
// [NO] DO NOT WRITE THIS PATTERN
export const Right = <R>(right: R): Right<R> => ({ tag: 'Right', right });

const rightProto = Object.getPrototypeOf(Right(0)); // <- the bomb
rightProto['fantasy-land/map'] = function (f) {
  /* ... */
};
rightProto['fantasy-land/chain'] = function (f) {
  /* ... */
};
// ...
```

`Right(0)` returns the plain object literal `{ tag: 'Right', right: 0 }`. Its prototype is the global `Object.prototype` — the same one shared by every plain object in the runtime. So
`rightProto === Object.prototype` is `true`.

The subsequent `rightProto['fantasy-land/map'] = ...` assignments therefore patch `Object.prototype` globally with **enumerable, string-keyed** `fantasy-land/*` methods. Every plain object in the
entire program now has a `fantasy-land/map` own-property visible in `for...in`, `JSON.stringify`'s key enumeration, and any tooling that introspects an object's keys.

### Symptom

The bug surfaces in vitest at module-load time as:

```text
TypeError: Spread syntax requires ...iterable[Symbol.iterator] to be a function
```

…with **no stack trace** through any reporter (default, verbose, tap, junit). The error has no relationship to actual `...` spreads in the elevate-ts dist or in user code; it is a downstream
consequence of vitest/vite's module loader operating on objects whose plain-prototype invariants we have violated. Discovered 2026-05-08 while threading `ReaderEitherAsync` through the
elevate-ts-learning todo demo.

### Why the symptom is so misleading

The error message points at `[Symbol.iterator]`, which is irrelevant to the actual cause (we polluted _string keys_, not Symbol keys). `grep`-ing the elevate-ts dist for `...` spread sites turns up
nothing. Every reporter suppresses the stack. The natural debugging path leads nowhere.

The right diagnostic is empirical: temporarily delete the patching block from the installed `node_modules/.../dist/esm/Either.js`. If the failing test now passes, the patching block is the cause. (We
confirmed this exactly.)

## Decision

Each module that exposes Fantasy Land methods owns a private prototype object. Constructors return values whose prototype chain is rooted at that private object, never at `Object.prototype`.

```ts
// [YES] CORRECT PATTERN
const _rightProto: Record<string, unknown> = {};

export const Right = <R>(right: R): Right<R> => Object.assign(Object.create(_rightProto), { tag: 'Right' as const, right });

_rightProto['fantasy-land/map'] = function (this: Right<unknown>, f) {
  /* ... */
};
_rightProto['fantasy-land/chain'] = function (this: Right<unknown>, f) {
  /* ... */
};
// ... etc
```

The diff against the broken version is small but precise:

- Add a private `_*Proto: Record<string, unknown> = {}` per module.
- Construct values with `Object.assign(Object.create(_proto), { ... })` instead of plain object literals.
- Patch `_*Proto` directly. **Never** call `Object.getPrototypeOf` on a constructed value to discover its prototype.

## How and why the fix works (JS prototype mechanics)

If you have not thought hard about JS prototypes recently, this section is for you.

### The prototype chain

Every JavaScript object has a _prototype_ — another object (or `null`) it inherits from. When you read a property `someObject.foo`, the engine first checks `someObject`'s own properties. If absent, it
looks up `Object.getPrototypeOf(someObject)`, then up that object's prototype, and so on, until it finds the property or hits `null`. Methods defined on a prototype are visible to every object whose
chain passes through that prototype.

### Plain object literals share Object.prototype

When you write `{ a: 1 }`, the JS engine sets the new object's prototype to the global `Object.prototype`. **The same one.** Every plain object literal in your program shares it. So:

```ts
const x = { a: 1 };
const y = { tag: 'Right', right: 0 };
Object.getPrototypeOf(x) === Object.prototype; // true
Object.getPrototypeOf(y) === Object.prototype; // true
Object.getPrototypeOf(x) === Object.getPrototypeOf(y); // true — same object
```

When you write `Object.getPrototypeOf({ tag: 'Right', right: 0 })`, the result _is_ the global `Object.prototype`. Writing to it pollutes every plain object in the program.

### What the broken code actually did, step by step

1. `Right(0)` returned `{ tag: 'Right', right: 0 }` — an object literal.
2. `Object.getPrototypeOf(Right(0))` returned `Object.prototype` — the global one.
3. `proto['fantasy-land/map'] = function () { ... }` wrote the method onto `Object.prototype` with default property descriptors. Default property descriptors mean **enumerable, writable,
   configurable** — i.e. the method shows up in `for...in` loops, `Object.keys(...)` returns it on every object, and so on.
4. From that point on, every plain object in the program reports `'fantasy-land/map' in obj` as `true` and walks up the chain to find the method when accessed.

Tooling that assumes plain objects do not have surprise enumerable methods breaks. Vitest's module loader is one such tool.

### What `Object.create(_rightProto)` does

`Object.create(target)` makes a brand-new empty object whose prototype is `target`. So:

```ts
const _rightProto = {};
const obj = Object.create(_rightProto);
Object.getPrototypeOf(obj) === _rightProto; // true — not Object.prototype
```

The chain is now `obj -> _rightProto -> Object.prototype -> null`. Writing `_rightProto['fantasy-land/map'] = ...` only affects `_rightProto`. Every _plain_ object literal in the program still has
`Object.prototype` as its prototype, untouched.

### Why fantasy-land lookup still works

When user code (or another fantasy-land library) does `myRight['fantasy-land/map'](f)`, JS walks `myRight`'s chain:

1. **Own properties** of `myRight`: `tag` and `right`. Not found.
2. **`_rightProto`**: contains `fantasy-land/map`. **Found.** Return it.
3. **`Object.prototype`**: not consulted.

Same end result as before, but the side effect is localized to `_rightProto` instead of `Object.prototype`.

### Why `Object.assign(Object.create(_rightProto), { tag: 'Right' as const, right })`

- `Object.create(_rightProto)` makes the empty object with the right prototype chain.
- `Object.assign(target, source)` copies `source`'s own enumerable properties onto `target`. So `tag` and `right` end up as own properties of the new object.
- `as const` keeps the literal type narrow. `Object.assign`'s declared return type widens `'Right'` to `string`; `as const` overrides that.

### Why a plain `Record<string, unknown>` is fine for `_rightProto`

`_rightProto` itself has `Object.prototype` as _its_ prototype (it's a plain object literal, after all). That is fine — we only **read** through that link (e.g. for `toString`), never **write**.
Pollution only happens on writes.

`Object.create(null)` would also work and be marginally more defensive, but it complicates `JSON.stringify`, `instanceof Object`, and any reflection that expects `Object.prototype` in the chain. Not
worth it for the marginal gain.

### Concrete demonstration

Paste these into a Node REPL to see the difference yourself.

**Broken pattern:**

```ts
const Broken = (x) => ({ tag: 'Broken', x });
Object.getPrototypeOf(Broken(0))['fantasy-land/map'] = function () {};
console.log(Object.keys(Object.prototype));
// [ 'fantasy-land/map' ]   <- POLLUTION
console.log('fantasy-land/map' in {});
// true   <- every plain object in the program now has this
```

**Fixed pattern:**

```ts
const _proto = {};
const Fixed = (x) => Object.assign(Object.create(_proto), { tag: 'Fixed', x });
_proto['fantasy-land/map'] = function () {};
console.log(Object.keys(Object.prototype));
// []   <- clean
console.log('fantasy-land/map' in {});
// false   <- plain objects unaffected
console.log('fantasy-land/map' in Fixed(1));
// true   <- but Fixed values still have it
```

## Alternatives considered

We considered three other approaches before settling on isolated prototypes. All worked in some sense; each lost on a specific axis.

### Class-based instances

```ts
class _Right<R> {
  readonly tag = 'Right' as const;
  constructor(readonly right: R) {}
}
export const Right = <R>(right: R): Right<R> => new _Right(right);

_Right.prototype['fantasy-land/map'] = function (f) {
  /* ... */
};
```

**Pros:** idiomatic JS, runtime-checkable `instanceof`, automatic non-shared-prototype semantics.

**Cons:** introduces classes into a codebase whose [docs/DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) "Pure Functions, ≤10 Lines" entry explicitly says "no classes." Larger conceptual shift; touches
every constructor signature; breaks the data-first tag-based discrimination convention.

**Why it lost:** the existing function-oriented style is a documented foundational decision. Classes would require revisiting that.

### Symbol-keyed methods

```ts
const flMap = Symbol.for('fantasy-land/map');
rightProto[flMap] = function (f) {
  /* ... */
};
```

**Pros:** symbols never appear in `for...in` or `Object.keys`. Even if we stayed on `Object.prototype`, the pollution would not have leaked enumerably. Fixes the symptom by making the polluted
properties invisible to enumeration.

**Cons:** the Fantasy Land specification mandates **string keys** of the form `'fantasy-land/map'`. Other libraries that use Fantasy Land introspection (Folktale, Ramda Fantasy, etc.) look up methods
by string key. Switching to symbols breaks the interop guarantee documented in [FANTASY_LAND.md](../FANTASY_LAND.md) — third-party Fantasy Land libraries would not find our methods.

**Why it lost:** violates the spec, breaks the interop contract.

### Per-instance methods

```ts
export const Right = <R>(right: R): Right<R> => ({
  tag: 'Right',
  right,
  'fantasy-land/map'(f) {
    return Right(f(this.right));
  },
  'fantasy-land/chain'(f) {
    /* ... */
  }
  // ...
});
```

**Pros:** no shared state, no global side effects.

**Cons:** every constructor allocates a new function object for every fantasy-land method. Per-instance memory cost (small but real, multiplied by ~7 methods × number of values constructed). Defeats
the entire purpose of prototypes — which exist to share method definitions.

**Why it lost:** wrong abstraction. Prototypes are the language-level mechanism for shared behavior; per-instance methods reinvent that mechanism poorly.

### Honorable mention: non-enumerable property descriptors

A reader might propose:

```ts
Object.defineProperty(rightProto, 'fantasy-land/map', {
  value: function (f) {
    /* ... */
  },
  enumerable: false,
  writable: true,
  configurable: true
});
```

This treats the symptom (vitest stops crashing because the methods are no longer enumerable own-keys after pollution) but **still pollutes** `Object.prototype`. It is bad practice even when the
symptom is gone — a non-enumerable property is still a property, still visible to `'fantasy-land/map' in {}`, and still shared by every object. **Rejected.**

## Comparison

| Approach                    |  No global pollution  | FL spec compliant | No class introduction | Smallest diff | No per-instance cost |
| --------------------------- | :-------------------: | :---------------: | :-------------------: | :-----------: | :------------------: |
| **Isolated proto (chosen)** |         [YES]         |       [YES]       |         [YES]         |     [YES]     |        [YES]         |
| Class-based instances       |         [YES]         |       [YES]       |         [NO]          |     [NO]      |        [YES]         |
| Symbol-keyed                | [NO] (still pollutes) |       [NO]        |         [YES]         |     [YES]     |        [YES]         |
| Per-instance methods        |         [YES]         |       [YES]       |         [YES]         |     [NO]      |         [NO]         |
| Non-enumerable descriptors  | [NO] (still pollutes) |       [YES]       |         [YES]         |     [YES]     |        [YES]         |

## Cascade — what fixing Either and Maybe also unblocks

The two load-bearing files were `src/Either.ts` and `src/Maybe.ts`. Fixing them transitively unblocks:

- `EitherAsync.ts`, `ReaderEitherAsync.ts` — import `Either`. They have no prototype patching of their own (verified by grep). Start working as soon as `Either` is fixed.
- `MaybeAsync.ts` — imports `Maybe`. No prototype patching of its own. Starts working as soon as `Maybe` is fixed.

The other modules with Fantasy Land conformance (`Reader.ts`, `Tuple.ts`, `State.ts`) had their fantasy-land blocks commented out in source. They were never broken in production, but they were not
exposing FL methods either. This work enables them via the same isolated-proto pattern.

`Validation.ts` and `NonEmptyList.ts` remain commented out for now. Both have design decisions that still need resolution:

- **Validation:** the conventional FL `ap` for `Validation` accumulates errors via Semigroup combination of the Failure side. Verify the namespace `ap` matches that contract before exposing on the
  prototype.
- **NonEmptyList:** currently branded as a readonly array. Re-enabling FL conformance requires either wrapping NEL values in an object with a private prototype (the isolated-proto pattern) or patching
  `Array.prototype` (do not — same global-pollution problem). `traverse` is non-trivial.

## Files implementing this pattern

Currently following the isolated-proto pattern:

- [src/Either.ts](../src/Either.ts) — `_leftProto`, `_rightProto`
- [src/Maybe.ts](../src/Maybe.ts) — `_justProto`, `_nothingProto`
- [src/Reader.ts](../src/Reader.ts) — `_readerProto`
- [src/Tuple.ts](../src/Tuple.ts) — `_tupleProto`
- [src/State.ts](../src/State.ts) — `_stateProto`

Deferred but commented warning in place:

- [src/Validation.ts](../src/Validation.ts)
- [src/NonEmptyList.ts](../src/NonEmptyList.ts)

## Test guarding the fix

Each fixed module has a regression test in its corresponding test file in [tests/](../tests/) that asserts `Object.prototype` is not polluted after construction:

```ts
it('does not pollute Object.prototype with fantasy-land methods', () => {
  Right(1);
  Left('e');
  const objectProtoKeys = Object.keys(Object.prototype);
  expect(objectProtoKeys).not.toContain('fantasy-land/map');
  expect(({} as Record<string, unknown>)['fantasy-land/map']).toBeUndefined();
});
```

This is the canary. If anyone reverts the isolated-proto pattern, this test fails immediately. **Do not delete or weaken it.**

## When to revisit this decision

Concrete triggers for re-evaluating:

- **Build tool change.** If we ever switch away from tsc + vitest + vite, re-run the test suite under the new toolchain. The bug manifested specifically in vite's module loader; a different toolchain
  may surface a different failure mode for the same root cause, or none at all.
- **Class hierarchy adoption.** If we introduce classes for unrelated reasons (e.g. branded nominal types, performance), the class-based alternative becomes the natural pick. Re-evaluate at that
  point.
- **Spec change.** If Fantasy Land is superseded or we drop the conformance goal entirely, the symbol-keyed alternative becomes viable and may be worth the simpler `_proto` declarations.
- **Validation / NonEmptyList enablement.** When ready to expose Fantasy Land for these, follow this pattern. For NEL, decide first whether to wrap values in an object (preferred) or to live without
  FL conformance there.

## References

- [FANTASY_LAND.md](../FANTASY_LAND.md) — overall conformance rationale
- [docs/DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) — broader design log; this decision is referenced there
- [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land)
- elevate-ts-learning memory entry that records the discovery: `/Users/mason/.claude/projects/-Volumes-AWCDrive-git-zambit-elevate-ts-learning/memory/feedback_local_elevate_ts_link.md`
