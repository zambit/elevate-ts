# Fantasy Land Compliance

elevate-ts implements the [Fantasy Land](https://fantasylandspec.org/) specification for algebraic data types and functional structures.

## What is Fantasy Land?

Fantasy Land is a standardized interface for functional programming abstractions in JavaScript. It defines a set of methods and symbols that allow different libraries to work together predictably.

## Why elevate-ts Implements It

1. **Interoperability** — Libraries that implement Fantasy Land can work together seamlessly
2. **Ecosystem compatibility** — Your code can use elevate-ts alongside other Fantasy Land libraries (like Folktale, Ramda Fantasy, etc.) without friction
3. **Standards compliance** — Signals that elevate-ts is a serious, well-designed functional library

## What's Exported

Fantasy Land exports look like unused constants in the source code:

```typescript
const flMap = <L, A, B>(f: (a: A) => B): ((ea: Either<L, A>) => Either<L, B>) =>
  map(f)
const flAp = <L, A, B>(...) => ap(...)
// ... etc
```

These are intentionally exported for **library consumers**, not for internal use within elevate-ts.

## How Users Interact With Fantasy Land

Users don't use these directly in normal code. Instead, they use the friendly API:

```typescript
// Normal usage (what users do)
Either.map(f)(myEither);
Either.chain(f)(myEither);

// Fantasy Land compliance (automatic when used with Fantasy Land libraries)
const Fantasy = require('fantasy-land');
myEither[Fantasy.map](f); // ← enabled by flMap export
```

## Why ESLint Reports "Unused"

The constants like `flMap`, `flAp`, etc. appear unused because:

1. **Internal code doesn't use them** — elevate-ts implements these methods on prototypes, not via exports
2. **External code uses them** — when a user writes `const Fantasy = require('fantasy-land')` and uses `myEither[Fantasy.map](f)`, it triggers the Fantasy Land method from the prototype

## Why We Allow Unused Warnings

Rather than rename these to `_flMap` (which breaks the export), we use `eslint-disable` comments. This preserves:

- ✅ Correct Fantasy Land names (required by spec)
- ✅ Public exports (required for library consumers)
- ✅ Clear intent (the comments document why they exist)

## References

- [Fantasy Land Specification](https://fantasylandspec.org/)
- [Fantasy Land spec on GitHub](https://github.com/fantasyland/fantasy-land)
- [elevate-ts implementation](./src/Either.ts) — search for "Fantasy Land symbols"
