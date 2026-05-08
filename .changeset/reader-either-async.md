---
"@zambit/elevate-ts": minor
---

# ReaderEitherAsync Module

Add `ReaderEitherAsync<R, L, A>` — a lazy, failable async monad with dependency injection.
Composes `Reader` (env-threading) with `EitherAsync` (failable async) into a single type
`(env: R) => Promise<Either<L, A>>`. Equivalent in role to fp-ts `ReaderTaskEither`. Use it
for asynchronous handlers that need a threaded environment (clients, config, loggers)
without manual env plumbing through a chain of `EitherAsync` calls.

Also clarifies in the project documentation that elevate-ts `EitherAsync<L, R>` is the
equivalent of what fp-ts and purify-ts call `Task<E, A>` / `TaskEither<E, A>`.
