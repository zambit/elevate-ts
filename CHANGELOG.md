# Changelog

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
