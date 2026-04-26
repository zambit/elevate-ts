# Changelog

## 0.3.0

### Added

**HTTP** — CloudFlare Workers and Web Fetch API helpers. `jsonResponse`, `parseJSON`, `askEnv`, `requireEnv`, `withStatusCode`, `handleEither`, `handleEitherAsync`. Types: `SyncHTTPHandler`,
`HTTPHandler`, `StatusMap`. See [HTTP guide](docs/HTTP.md).

## 0.2.0

### Added

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

### Added

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
