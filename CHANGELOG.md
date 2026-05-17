# Changelog

## 0.6.0

### Minor Changes (0.6.0)

- 7456a28: # CancellableEitherAsync Module

  Add `CancellableEitherAsync<L, R>` — a lazy, failable async monad with cooperative cancellation via `AbortSignal`. Three terminal states (`Right`, `Left`, `Cancelled`) distinguish "succeeded,"
  "failed," and "no longer cared about." Use it for timeouts, races, and request flows that need to abandon work cleanly. Sibling to `EitherAsync`; existing `EitherAsync` users are unaffected. See
  `docs/CANCELLABLE_DESIGN.md` for the full design rationale and deferred v2 follow-ups (`Result` core type, `bracket`, `chainTerminal`, structured concurrency).

## 0.5.0

### Minor Changes (0.5.0)

- Fantasy Land conformance for Reader, Tuple, and State

  `Reader`, `Tuple`, and `State` now expose Fantasy Land methods on the prototype of constructed values, joining `Either` and `Maybe`:
  - **Reader:** Functor (`fantasy-land/map`), Apply (`fantasy-land/ap`), Applicative (`fantasy-land/of` on the constructor), Chain (`fantasy-land/chain`), Monad.
  - **Tuple:** Functor (`fantasy-land/map` over `snd`, by convention), Bifunctor (`fantasy-land/bimap`).
  - **State:** Functor, Apply, Applicative, Chain, Monad.

  Methods delegate to the existing namespace functions (`Reader.map`, `State.chain`, etc.), so behavior is identical between the namespace style (`Reader.map(f)(r)`) and the Fantasy Land style
  (`r['fantasy-land/map'](f)`).

  These modules previously had their fantasy-land blocks commented out as "TODO: re-enable when vitest issue is resolved" — that issue was the `Object.prototype` pollution fixed in the patch alongside
  this release. The pattern used here (private `_*Proto` objects, never patching the global prototype) is documented in [docs/PROTOTYPE_ISOLATION.md](./docs/PROTOTYPE_ISOLATION.md).

  `Validation` and `NonEmptyList` remain deferred — each has a design decision still pending (accumulating `ap` for Validation; wrapping representation for NonEmptyList).

- 7f40054: # ReaderEitherAsync Module

  Add `ReaderEitherAsync<R, L, A>` — a lazy, failable async monad with dependency injection. Composes `Reader` (env-threading) with `EitherAsync` (failable async) into a single type
  `(env: R) => Promise<Either<L, A>>`. Equivalent in role to fp-ts `ReaderTaskEither`. Use it for asynchronous handlers that need a threaded environment (clients, config, loggers) without manual env
  plumbing through a chain of `EitherAsync` calls.

  Also clarifies in the project documentation that elevate-ts `EitherAsync<L, R>` is the equivalent of what fp-ts and purify-ts call `Task<E, A>` / `TaskEither<E, A>`.

### Patch Changes

- Fix: Object.prototype pollution from Fantasy Land patching

  `Either.ts` and `Maybe.ts` previously attached Fantasy Land methods (`fantasy-land/map`, etc.) to the prototype discovered via `Object.getPrototypeOf(Right(0))`. Because `Right(0)` returned a plain
  object literal, that prototype was the global `Object.prototype`, so the assignments patched it with enumerable string-keyed methods, polluting every plain object in the runtime. The visible symptom
  was a misleading vitest failure at module-load time — `TypeError: Spread syntax requires ...iterable[Symbol.iterator] to be a function` — with no stack trace.

  Each module now defines a private prototype object (`_leftProto`, `_rightProto`, `_justProto`, `_nothingProto`) and constructors return values via
  `Object.assign(Object.create(_proto), { tag: 'X' as const, … })`. Fantasy Land methods are patched onto the private prototypes, never reaching `Object.prototype`. Public API and Fantasy Land
  semantics are unchanged.

  Adds regression tests asserting `Object.prototype` remains free of `fantasy-land/*` keys after construction. See [docs/PROTOTYPE_ISOLATION.md](./docs/PROTOTYPE_ISOLATION.md) for the full rationale,
  JS prototype mechanics, alternatives considered, and when-to-revisit triggers.

## 0.4.2

### Patch Changes (0.4.2)

- ee71685: # CJS Package Marker

  Add dist/cjs/package.json marker to identify CommonJS output. This tells Node.js and Vitest to treat .js files in dist/cjs/ as CommonJS, preventing the spread syntax iterator error across all
  platforms.

## 0.4.1

### Patch Changes (0.4.1)

- bac2f49: # Audit Module Import Error Fix

  Fix Audit module import error in Vitest. Add resolve.alias in vitest.config.ts to map @zambit/elevate-ts to src/. Fix src/tsconfig.json to produce actual CommonJS output by changing module option
  from "nodenext" to "CommonJS". Add tests/Audit.package.test.ts to verify package imports work correctly.

## 0.4.0

### Minor Changes (0.4.0)

- e0d2243: # HTTP Module

  Add HTTP module for CloudFlare Workers and Web Fetch API runtimes with safe JSON parsing, environment variable access, and error-to-HTTP-status mapping.

### Patch Changes (0.4.0)

- db8781c: # ESM Build Output Fix

  Fix ESM build output and add export validation

  Fixed tsconfig.esm.json rootDir to output ESM files to dist/esm/ instead of dist/esm/src/, correcting the 0.2.0+ npm packaging bug. Added check:exports validation script that verifies all declared
  exports in package.json exist on disk before publishing, preventing future broken releases.

## 0.3.0

### Added (0.3.0)

**HTTP** — CloudFlare Workers and Web Fetch API helpers. `jsonResponse`, `parseJSON`, `askEnv`, `requireEnv`, `withStatusCode`, `handleEither`, `handleEitherAsync`. Types: `SyncHTTPHandler`,
`HTTPHandler`, `StatusMap`. See [HTTP guide](docs/HTTP.md).

## 0.2.0

### Added (0.2.0)

**Audit** — Operation tracking with time-travel replay. `createSession`, `withEnabled`, `withCaptureInputs`, `withCaptureOutputs`, `withGenerateId`, `record`, `track`, `getLog`, `getEntries`,
`entryAt`, `inputAt`, `outputAt`, `replay`, `filterByOperation`, `filterByMonadType`. Types: `AuditConfig`, `AuditEntry`, `AuditLog`, `AuditSession`. See [Audit guide](docs/AUDIT.md).

## 0.1.2

### Patch Changes for 2026-04-09

- chore: bump version for npm package cleanup

## 0.1.1

### Patch Changes for 2026-04-08

- Updated the licensing and documentation
- Doing the first push.

## [0.1.0] - 2025-04-03

### Added (0.1.0)

**Maybe** — Optional values. `Just`, `Nothing`, `isJust`, `isNothing`, `fromNullable`, `fromPredicate`, `toNullable`, `toArray`, `map`, `ap`, `chain`, `chainNullable`, `getOrElse`, `getOrElseL`,
`alt`, `altL`, `filter`, `fold`, `catMaybes`, `mapMaybe`, `sequence`, `traverse`, `toEither`.

**Either** — Left/Right error handling. `Left`, `Right`, `isLeft`, `isRight`, `fromNullable`, `fromPredicate`, `swap`, `toNullable`, `toArray`, `map`, `mapLeft`, `bimap`, `ap`, `chain`, `chainLeft`,
`getOrElse`, `getOrElseL`, `alt`, `altL`, `filter`, `fold`, `catLefts`, `catRights`, `mapBoth`, `sequence`, `traverse`, `toValidation`.

**Validation** — Accumulating errors. `Failure`, `Success`, `isFailure`, `isSuccess`, `fromEither`, `toEither`, `fromPredicate`, `map`, `ap`, `chain`, `getOrElse`, `fold`, `concat`, `sequence`,
`traverse`.

**Reader** — Dependency injection. `Reader`, `ask`, `asks`, `local`, `map`, `ap`, `chain`, `runReader`.

**State** — Pure stateful computation. `State`, `get`, `put`, `modify`, `gets`, `map`, `ap`, `chain`, `runState`, `evalState`, `execState`.

**Tuple** — Immutable 2-tuples. `Tuple`, `fst`, `snd`, `mapFst`, `mapSnd`, `bimap`, `toArray`, `fromArray`, `swap`, `fanout`.

**NonEmptyList** — Guaranteed-nonempty arrays. `fromArray`, `fromArrayUnsafe`, `toArray`, `head`, `tail`, `last`, `init`, `map`, `ap`, `chain`, `concat`, `min`, `max`.

**List** — Array utilities. `head`, `tail`, `last`, `init`, `uncons`, `cons`, `snoc`, `take`, `drop`, `takeWhile`, `dropWhile`, `partition`, `span`, `groupBy`, `nubBy`, `sortBy`, `zip`, `zipWith`,
`unzip`, `flatten`, `intersperse`, `transpose`.

**Function** — Composition and utilities. `identity`, `constant`, `flip`, `absurd`, `pipe` (arities 1–10), `flow` (arities 1–10), `curry2`, `curry3`, `curry4`, `memoize`, `once`, `tap`.

**MaybeAsync** — Lazy async Maybe. `MaybeAsync`, `liftMaybe`, `fromPromise`, `tryCatch`, `map`, `chain`, `ap`, `alt`, `filter`, `getOrElse`, `getOrElseL`, `toEitherAsync`, `fold`, `catMaybes`, `all`.

**EitherAsync** — Lazy async Either. `EitherAsync`, `liftEither`, `fromPromise`, `tryCatch`, `map`, `mapLeft`, `bimap`, `chain`, `chainLeft`, `ap`, `getOrElse`, `getOrElseL`, `fold`, `swap`,
`toMaybeAsync`, `all`, `lefts`, `rights`.
