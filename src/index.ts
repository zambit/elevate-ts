// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// elevate-ts
// Re-exports added as each module is implemented.
// See prompts/README.md for implementation order.
//
// TODO(audit): add @paralleldrive/cuid2 when time-travel audit subsystem
// is implemented. Each audited operation will receive a cuid2-stamped ID
// (monotonically sortable, collision-resistant across distributed Worker
// instances) enabling deterministic replay and rewind of operation sequences.

// Note: Individual modules are exported with namespace prefixes to avoid
// naming conflicts (all monads export map, chain, ap, etc.)
export * as Maybe from './Maybe.js'
export * as Either from './Either.js'
export * as Validation from './Validation.js'
export * as Reader from './Reader.js'
export * as State from './State.js'
export * as Tuple from './Tuple.js'
export * as NonEmptyList from './NonEmptyList.js'
export * as List from './List.js'
export * as Function from './Function.js'
export * as MaybeAsync from './MaybeAsync.js'
export * as EitherAsync from './EitherAsync.js'
