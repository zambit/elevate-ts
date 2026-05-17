---
'@zambit/elevate-ts': minor
---

# CancellableEitherAsync Module

Add `CancellableEitherAsync<L, R>` — a lazy, failable async monad with
cooperative cancellation via `AbortSignal`. Three terminal states (`Right`,
`Left`, `Cancelled`) distinguish "succeeded," "failed," and "no longer cared
about." Use it for timeouts, races, and request flows that need to abandon
work cleanly. Sibling to `EitherAsync`; existing `EitherAsync` users are
unaffected. See `docs/CANCELLABLE_DESIGN.md` for the full design rationale and
deferred v2 follow-ups (`Result` core type, `bracket`, `chainTerminal`,
structured concurrency).
