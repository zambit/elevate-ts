# elevate-ts Bootstrap

This file contains instructions to bootstrap the `elevate-ts` project. Follow each step carefully, and refer to the
comments for context and explanations.

You are bootstrapping a new TypeScript functional programming library called elevate-ts.

## Goal

A clean, point-free, data-last, ESM-first replacement for purify-ts that:

- Targets Cloudflare Workers (no Node.js built-ins)
- Is Fantasy Land 5 compliant
- Uses pure functions, ≤15 lines each, max one side effect per function
- Exports a point-free / pipe-friendly API as primary surface
- Ships as a public npm package named `elevate-ts`
- Is written in TypeScript with full type safety
- Has zero runtime dependencies
- All documentation follows GitHub Flavored Markdown (GFM)
- All markdown files pass markdownlint with a 200 character line limit
- All TypeScript public APIs are documented with TSDoc
- `@paralleldrive/cuid2` is intentionally NOT a dependency yet — it is reserved for a future audit subsystem that will
  support time-travel replay of operation sequences. When that subsystem is built, each audited operation will receive a
  cuid2-stamped ID (monotonically sortable, collision-resistant across distributed Worker instances) enabling
  deterministic replay and rewind. Do not add cuid2 now. Leave a
  `TODO(audit): add @paralleldrive/cuid2 when time-travel audit is implemented` comment in `src/index.ts` as a marker
  for future contributors.

## Your task right now

Do NOT implement any library code yet. Instead:

1. Scaffold the project structure
2. Write all the sequential build prompts into a /prompts directory

---

## Step 1: Scaffold this exact structure

```markdown
elevate-ts/
├── src/
│   ├── Maybe.ts
│   ├── Either.ts
│   ├── Validation.ts
│   ├── Reader.ts
│   ├── State.ts
│   ├── Tuple.ts
│   ├── NonEmptyList.ts
│   ├── List.ts
│   ├── Function.ts
│   ├── MaybeAsync.ts
│   ├── EitherAsync.ts
│   └── index.ts
├── tests/
│   ├── Maybe.test.ts
│   ├── Either.test.ts
│   ├── Validation.test.ts
│   ├── Reader.test.ts
│   ├── State.test.ts
│   ├── Tuple.test.ts
│   ├── NonEmptyList.test.ts
│   ├── List.test.ts
│   ├── Function.test.ts
│   ├── MaybeAsync.test.ts
│   └── EitherAsync.test.ts
├── prompts/
│   ├── README.md
│   ├── 01-maybe.md
│   ├── 02-either.md
│   ├── 03-validation.md
│   ├── 04-reader.md
│   ├── 05-state.md
│   ├── 06-tuple.md
│   ├── 07-nonemptylist.md
│   ├── 08-list.md
│   ├── 09-function.md
│   ├── 10-maybeasync.md
│   ├── 11-eitherasync.md
│   └── 12-package.md
├── .markdownlint.json
├── package.json
├── tsconfig.json
├── tsconfig.esm.json
├── vitest.config.ts
├── .gitignore
├── LICENSE (MIT)
└── README.md
```

## Step 2: Create these config files with correct content

**`.markdownlint.json`** — markdownlint config enforcing GFM compatibility and 200 character line limit:

```json
{
  "default": true,
  "MD013": { "line_length": 200, "code_blocks": false, "tables": false },
  "MD033": false,
  "MD041": true
}
```

**`package.json`** — with these exact fields:

- `name`: `elevate-ts`
- `version`: `0.1.0`
- `description`: `Point-free, data-last functional programming library for TypeScript. Fantasy Land 5 compliant. Zero
  Node.js dependencies. Cloudflare Workers ready.`
- `license`: `MIT`
- `type`: `module`
- `main`: `dist/cjs/index.js`
- `module`: `dist/esm/index.js`
- `types`: `dist/esm/index.d.ts`
- `exports` map covering `.` with `import` (ESM) and `require` (CJS) conditions,
  and subpath exports for `./Maybe`, `./Either`, `./Validation`, `./Reader`,
  `./State`, `./Tuple`, `./NonEmptyList`, `./List`, `./Function`,
  `./MaybeAsync`, `./EitherAsync`
- `scripts`:
  - `build`: `tsc && tsc -p tsconfig.esm.json`
  - `test`: `vitest run --coverage`
  - `lint:md`: `markdownlint "**/*.md" --ignore node_modules`
  - `check:nodeps`: `node scripts/check-no-node-builtins.mjs`
  - `prepublishOnly`: `pnpm build && pnpm test && pnpm lint:md && pnpm check:nodeps`
- `devDependencies`: `typescript`, `vitest`, `@vitest/coverage-v8`, `markdownlint-cli`
- `dependencies`: `{}` — zero runtime dependencies at this time
- `keywords`: `["functional", "fp", "fantasy-land", "typescript", "cloudflare-workers",`
  `"maybe", "either", "monad", "point-free", "pipe"]`

**`tsconfig.json`** — CJS output to `dist/cjs`, `target: ESNext`, `module: CommonJS`,
`moduleResolution: bundler`, `strict: true`, `declaration: true`,
`declarationMap: true`, `sourceMap: true`

**`tsconfig.esm.json`** — extends `./tsconfig.json`, overrides `module: NodeNext`,
`moduleResolution: NodeNext`, `outDir: dist/esm`

**`vitest.config.ts`** — coverage enabled via `@vitest/coverage-v8`,
include `tests/**/*.test.ts`

**`.gitignore`** — `node_modules`, `dist`, `coverage`, `.wrangler`

**`scripts/check-no-node-builtins.mjs`** — a script that greps all files under
`dist/esm` for imports of Node built-ins (`node:`, `fs`, `path`, `os`, `crypto`,
`http`, `net`, `stream`, `buffer`, `process`) and exits non-zero if any are found,
printing the offending lines

**`README.md`** — GFM, passes markdownlint with 200 char line limit. Must include:

- H1: `elevate-ts`
- Badges placeholder line (coverage, npm version, license)
- One-paragraph description
- `## Install` section with `pnpm add elevate-ts`
- `## Quick Start` section with a `pipe` + `Maybe` example using TSDoc-style inline comments
- `## Modules` section listing all 11 modules with one-line descriptions as a GFM table
- `## Philosophy` section: point-free, data-last, ≤15 lines per function,
  Cloudflare Workers safe, Fantasy Land 5, zero runtime dependencies
- `## Roadmap` section: one item — "Audit subsystem with time-travel replay
  (will use `@paralleldrive/cuid2` for operation-level ID stamping)"
- `## Contributing` section linking to `prompts/README.md`
- `## License` section: MIT

---

## Step 3: Write all 13 prompt files

Each prompt file must be self-contained — a fresh Claude Code session with no
other context should be able to execute it and produce correct, tested, passing output.

### Universal rules — copy this INVARIANTS block verbatim into every prompt file

```markdown
## Invariants (apply to every file you write)

- Pure functions only. No classes.
- Data-last argument order: `(config)(data)` — the data being operated on is always the last argument.
- Every function body ≤15 lines.
- Max one side effect per function.
- ESM imports with `.js` extensions on all relative imports.
- Fantasy Land 5 method aliases on all applicable types (see FL5 spec).
- No Node.js built-ins (`fs`, `path`, `crypto`, `buffer`, `process`, etc).
- No DOM APIs.
- Cloudflare Workers `workerd` runtime safe.
- Zero runtime dependencies. `@paralleldrive/cuid2` is reserved for the future
  audit subsystem and must NOT be added yet.
- No `any`. All exports fully typed.
- All public functions and types documented with TSDoc (`/** ... */`).
- All markdown files must pass markdownlint with a 200 character line limit and follow GFM.
```

### Prompt-specific content requirements

**`prompts/README.md`**

GFM. Passes markdownlint 200 char limit. Sections:

- H1: `elevate-ts — Prompt-Driven Development Guide`
- Explanation of the sequential prompt workflow
- GFM table listing all 12 prompts: number, filename, module, one-line description
- Note: run prompts in order; each assumes prior `src/` files exist as stubs
- Note: `12-package.md` must only be run after all 11 module test suites pass
- Note: each prompt instructs Claude Code to run tests before finishing
- Note: `@paralleldrive/cuid2` is intentionally absent — reserved for the audit
  subsystem described in the roadmap. Do not add it during any module prompt.

**`prompts/01-maybe.md`**

Sections: `## Context`, `## Invariants` (verbatim), `## Types`,
`## Functions`, `## Fantasy Land`, `## Tests`, `## Completion`

`## Types`:

```typescript
type Just<A> = { readonly tag: 'Just'; readonly value: A }
type Nothing = { readonly tag: 'Nothing' }
type Maybe<A> = Just<A> | Nothing
```

`## Functions` — all point-free, data-last, TSDoc on each:

`Just`, `Nothing` (constant), `isJust`, `isNothing`, `fromNullable`,
`fromPredicate`, `toNullable`, `toArray`, `map`, `ap`, `chain`,
`chainNullable`, `getOrElse`, `getOrElseL`, `alt`, `altL`, `filter`,
`fold`, `catMaybes`, `mapMaybe`, `sequence`, `traverse`

`## Fantasy Land` — symbol-keyed aliases on Just and Nothing objects:
`fantasy-land/map`, `fantasy-land/ap`, `fantasy-land/chain`, `fantasy-land/of`,
`fantasy-land/alt`, `fantasy-land/zero`, `fantasy-land/filter`,
`fantasy-land/reduce`, `fantasy-land/equals`

Note: `toEither` intentionally omitted — added in `02-either.md`.

`## Tests` — vitest tests covering:

- Each function with Just and Nothing inputs
- Nothing propagation through map/chain/ap
- Fantasy Land law tests: functor identity, functor composition, monad left
  identity, monad right identity, monad associativity, alt associativity,
  filter distributivity
- `catMaybes` and `mapMaybe` with mixed arrays
- `sequence` with all-Just and any-Nothing arrays

`## Completion`:

```bash
1. Run `pnpm test -- Maybe` and confirm all tests pass.
2. Add `export * from './Maybe.js'` to `src/index.ts`.
3. Confirm `src/index.ts` compiles without errors.
```

**`prompts/02-either.md`**

`## Types`:

```typescript
type Left<L> = { readonly tag: 'Left'; readonly left: L }
type Right<R> = { readonly tag: 'Right'; readonly right: R }
type Either<L, R> = Left<L> | Right<R>
```

`## Functions`: `Left`, `Right`, `isLeft`, `isRight`, `fromNullable`,
`fromPredicate`, `toMaybe`, `toNullable`, `map`, `mapLeft`, `bimap`,
`ap`, `chain`, `chainLeft`, `getOrElse`, `getOrElseL`, `fold`, `swap`,
`tryCatch`, `partitionEithers`, `rights`, `lefts`, `sequence`, `traverse`

Also add `toEither` to `src/Maybe.ts`:
`toEither<E, A>(onNothing: E): (ma: Maybe<A>) => Either<E, A>`

`## Fantasy Land`: `fantasy-land/map`, `fantasy-land/ap`, `fantasy-land/chain`,
`fantasy-land/of`, `fantasy-land/bimap`, `fantasy-land/reduce`,
`fantasy-land/equals`, `fantasy-land/alt`

`## Tests` — functor, apply, applicative, monad, bifunctor law tests.
Test `tryCatch` with throwing and non-throwing functions.
Test `partitionEithers` with mixed arrays.

**`prompts/03-validation.md`**

`## Context` — The key distinction from Either: `ap` concatenates ALL errors
into `errors: E[]` rather than short-circuiting. Primary use case: validating
multiple independent fields and collecting every failure before returning.

`## Types`:

```typescript
type Failure<E> = { readonly tag: 'Failure'; readonly errors: E[] }
type Success<A> = { readonly tag: 'Success'; readonly value: A }
type Validation<E, A> = Failure<E> | Success<A>
```

`## Functions`: `Failure`, `Success`, `isFailure`, `isSuccess`, `fromEither`,
`toEither`, `fromPredicate`, `map`, `ap` (MUST concatenate errors),
`chain`, `getOrElse`, `fold`, `concat`, `sequence`, `traverse`

`## Tests` — critical: two `Failure` values ap-ed must produce a single
`Failure` with both error arrays merged. Contrast against Either behaviour
in the test file comments.

**`prompts/04-reader.md`**

`## Context` — Reader as dependency injection. Functions needing shared
environment (config, DB handle, logger, Cloudflare `Env` bindings) receive
it implicitly through `run` rather than as an explicit parameter at every
call site.

`## Types`:

```typescript
type Reader<R, A> = { readonly tag: 'Reader'; readonly run: (env: R) => A }
```

`## Functions`: `Reader` (constructor), `ask`, `asks`, `local`,
`map`, `ap`, `chain`, `runReader`

**`prompts/05-state.md`**

`## Context` — Pure stateful computation. Each step receives the current
state and returns both a value and the next state. No mutation anywhere.

`## Types`:

```typescript
type State<S, A> = { readonly tag: 'State'; readonly run: (s: S) => readonly [A, S] }
```

`## Functions`: `State` (constructor), `get`, `put`, `modify`, `gets`,
`map`, `ap`, `chain`, `runState`, `evalState`, `execState`

**`prompts/06-tuple.md`**

`## Types`:

```typescript
type Tuple<A, B> = { readonly fst: A; readonly snd: B }
```

`## Functions`: `Tuple` (constructor), `fst`, `snd`, `mapFst`, `mapSnd`,
`bimap`, `toArray`, `fromArray`, `swap`, `fanout`

**`prompts/07-nonemptylist.md`**

`## Context` — Brand pattern prevents constructing an empty NonEmptyList
at the type level. The tuple representation `[A, ...A[]]` gives a free
compile-time guarantee that at least one element exists.

`## Types`:

```typescript
declare const NonEmptyListBrand: unique symbol
type NonEmptyList<A> = readonly [A, ...A[]] & { readonly [NonEmptyListBrand]: true }
```

`## Functions`: `fromArray` (returns `Maybe<NonEmptyList<A>>`),
`fromArrayUnsafe`, `toArray`, `head`, `tail`, `last`, `init`,
`map`, `ap`, `chain`, `concat`,
`min`, `max` (both require `(ord: (a: A, b: A) => number)` parameter)

**`prompts/08-list.md`**

`## Context` — Utility functions over plain `readonly A[]`.
All point-free, data-last. None mutate their input.

`## Functions`: `head`, `tail`, `last`, `init`, `uncons`, `cons`, `snoc`,
`take`, `drop`, `takeWhile`, `dropWhile`, `partition`, `span`,
`groupBy`, `nubBy`, `sortBy`, `zip`, `zipWith`, `unzip`,
`flatten`, `intersperse`, `transpose`

**`prompts/09-function.md`**

`## Context` — Core composition utilities. `pipe` and `flow` are the most
frequently called functions in the entire library. Type all overloads for
arities 1–10 explicitly — do not use variadic generics as TypeScript
inference degrades badly for deeply composed pipelines.

`## Functions`: `identity`, `constant`, `flip`, `absurd`,
`pipe` (typed overloads arities 1–10),
`flow` (typed overloads arities 1–10),
`curry2`, `curry3`, `curry4`, `memoize`, `once`, `tap`

**`prompts/10-maybeasync.md`**

`## Context` — `MaybeAsync<A>` is lazy: nothing executes until `.run()`
is called. Any rejected Promise or thrown error resolves to `Nothing`,
never rejects. Emphasise this contract in every relevant TSDoc comment.

`## Types`:

```typescript
type MaybeAsync<A> = { readonly tag: 'MaybeAsync'; readonly run: () => Promise<Maybe<A>> }
```

`## Functions`: `MaybeAsync` (constructor), `liftMaybe`, `fromPromise`,
`tryCatch`, `map`, `chain`, `ap`, `alt`, `filter`, `getOrElse`,
`getOrElseL`, `toEitherAsync`, `fold`,
`catMaybes` (static), `all` (static, all-or-Nothing)

`## Tests` — verify: rejected Promise → Nothing, thrown exception → Nothing,
no work happens before `.run()` is called.

**`prompts/11-eitherasync.md`**

`## Context` — `EitherAsync<L, R>` is lazy until `.run()`. Rejected Promises
become `Left`. Nothing ever throws. Document this contract clearly in TSDoc.

`## Types`:

```typescript
type EitherAsync<L, R> = { readonly tag: 'EitherAsync'; readonly run: () => Promise<Either<L, R>> }
```

`## Functions`: `EitherAsync` (constructor), `liftEither`, `fromPromise`,
`tryCatch`, `map`, `mapLeft`, `bimap`, `chain`, `chainLeft`, `ap`,
`getOrElse`, `getOrElseL`, `fold`, `swap`, `toMaybeAsync`,
`all` (static), `lefts` (static), `rights` (static)

**`prompts/12-package.md`**

`## Pre-flight` — run all four and confirm green before proceeding:

```bash
pnpm test           # all 11 suites pass
pnpm build          # dist/cjs and dist/esm produced
pnpm lint:md        # zero markdownlint errors
pnpm check:nodeps   # zero Node built-in imports
```

`## Tasks`:

1. Audit `src/index.ts` — all 11 modules re-exported
2. Verify `package.json` exports map matches all subpaths from Step 2
3. Write `CHANGELOG.md` — GFM, markdownlint clean, v0.1.0 entry listing
   all modules and their exported functions
4. Write `CONTRIBUTING.md` — GFM, markdownlint clean. Cover: the prompts
   workflow, how to add a new module, code style invariants, how to run
   tests and linting, PR expectations, and a note that
   `@paralleldrive/cuid2` is reserved for the future audit subsystem and
   must not be added to the library until that work begins
5. Write `PUBLISH_CHECKLIST.md` — GFM, markdownlint clean. Items: npm
   account logged in, package name confirmed available at
   `npmjs.com/package/elevate-ts`, version bumped, CHANGELOG updated,
   all tests pass, build clean, no Node built-ins detected,
   markdownlint clean, then `pnpm publish --access public`

---

## Step 4: Create placeholder src files

Each `src/*.ts` stub:

```typescript
// Implemented by: prompts/XX-name.md
// Status: stub — do not import until implemented

export {}
```

`src/index.ts`:

```typescript
// elevate-ts
// Re-exports added as each module is implemented.
// See prompts/README.md for implementation order.
//
// TODO(audit): add @paralleldrive/cuid2 when time-travel audit subsystem
// is implemented. Each audited operation will receive a cuid2-stamped ID
// (monotonically sortable, collision-resistant across distributed Worker
// instances) enabling deterministic replay and rewind of operation sequences.
```

---

## Step 5: Verify scaffold

Run in order and report results:

1. `pnpm install`
2. `pnpm build` — must succeed
3. `pnpm test` — must show 0 tests, 0 failures
4. `pnpm lint:md` — must show 0 markdownlint errors

Flag any issues found before finishing.
