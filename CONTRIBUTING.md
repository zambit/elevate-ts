# Contributing to elevate-ts

Thank you for your interest in contributing to elevate-ts! This document describes our development
workflow and coding standards.

## Contribution License Terms

`elevate-ts` is operated under a dual-license model:

- Public license: `AGPL-3.0-or-later`
- Commercial license: available separately from Zambit for closed-source use

To keep that model legally workable, Zambit only accepts non-trivial contributions under a
Contributor License Agreement ("CLA") that permits Zambit to use, sublicense, and relicense
contributions under both open-source and commercial terms.

In practice:

1. By submitting a non-trivial contribution, you agree that it is submitted subject to the
   applicable CLA.
2. Individual contributors must agree to [CLA-INDIVIDUAL.md](./CLA-INDIVIDUAL.md).
3. Contributions made within the scope of employment or on behalf of a company must be covered by
   [CLA-CORPORATE.md](./CLA-CORPORATE.md) or other written approval acceptable to Zambit.
4. This requirement applies to bug fixes, features, tests, documentation, examples, and other
   substantive project contributions.
5. Small corrections that do not contain creative authorship, such as typo fixes or formatting-only
   changes, may be accepted without a CLA at Zambit's discretion.

GitHub pull requests are checked automatically. A PR passes the contributor rights gate when:

- the contributor checks the contributor-terms acknowledgment in the PR template; or
- a maintainer applies the `cla-signed` label for an offline or corporate signature; or
- a maintainer applies the `cla-exempt` label for a trivial change that does not need CLA coverage.

Do not submit code you do not have the right to contribute. If your employer or client may have
rights in your contribution, get approval before submitting it.

## Development Workflow

The elevate-ts library is built using a "prompt-driven" development model. Each module (Maybe,
Either, Validation, Reader, State, etc.) is defined by a corresponding prompt file in the
`prompts/` directory (e.g., `01-maybe.md`, `02-either.md`, etc.).

### How to Develop

1. Each prompt file specifies the full API surface, invariants, and test requirements for that
   module.
2. Implement the module in `src/ModuleName.ts`.
3. Write comprehensive tests in `tests/ModuleName.test.ts`.
4. Run the test suite to verify.
5. Repeat for the next module.

### Verification Steps

After implementing a module, run these four commands to ensure everything passes:

```bash
pnpm test           # Run all tests with coverage
pnpm build          # Build to both CJS and ESM distributions
pnpm lint:md        # Verify all markdown files pass linting
pnpm check:nodeps   # Ensure no Node.js built-ins leaked into dist/esm
```

All four commands must succeed before committing.

## Adding a New Module

To add a new module to elevate-ts:

1. **Create the prompt file**: Write `prompts/NN-modulename.md` (where NN is the next sequence number).
   Use existing prompts as a template.
2. **Create stub files**:
   - `src/ModuleName.ts` (with a minimal export stub)
   - `tests/ModuleName.test.ts` (with placeholder tests)
3. **Implement the module** according to the prompt.
4. **Add the export** to `src/index.ts` (use namespace import if naming conflicts).
5. **Run the four verification commands** (test, build, lint:md, check:nodeps).

## Code Style Invariants

All code in elevate-ts must follow these invariants:

- **Pure functions only**: No classes, no mutable state.
- **Data-last argument order**: `(config)(data)` — the value being operated on is always the last
  parameter.
- **Function bodies ≤15 lines**: Keep functions small and focused.
- **Max one side effect per function**: No multiple sequential side effects.
- **ESM imports**: Use `.js` extensions on all relative imports (required for ESM).
- **Fantasy Land 5 compatibility**: Implement `fantasy-land/*` symbols where applicable.
- **No Node.js built-ins**: No imports from `fs`, `path`, `crypto`, `buffer`, `process`, etc.
- **No DOM APIs**: Functions must work in any JavaScript environment (browsers,
  Cloudflare Workers, Node.js).
- **Cloudflare Workers ready**: Code must be compatible with the `workerd` runtime.
- **Zero runtime dependencies**: Only TypeScript types can be imported from external packages.
  The `@paralleldrive/cuid2` package is intentionally reserved for a future audit subsystem.
- **Fully typed**: No `any` types. All exports must have complete TypeScript types.
- **TSDoc on all exports**: Every public function and type must have a `/** ... */` comment.
- **Markdown quality**: All `.md` files must pass `markdownlint` with a 200-character line limit
  and follow GitHub-flavored Markdown (GFM).

For the definitive source of these invariants, see the "Invariants" section in any prompt file
(e.g., `prompts/01-maybe.md`).

## Testing and Linting

### Running Tests

```bash
pnpm test           # Run all tests with coverage
pnpm test -- Maybe  # Run tests for a specific module
```

Tests are written with [Vitest](https://vitest.dev/) and should cover:

- Happy path and edge cases
- Functor/Applicative/Monad laws (for types that implement them)
- Immutability
- Type safety (as much as can be tested)

### Linting Markdown

```bash
pnpm lint:md
```

All documentation files must pass `markdownlint` with a maximum line width of 200 characters.

### Building

```bash
pnpm build
```

This compiles TypeScript to both CommonJS (`dist/cjs/`) and ESM (`dist/esm/`) distributions.

### Checking for Node Built-ins

```bash
pnpm check:nodeps
```

This verifies that no Node.js built-in modules (`fs`, `path`, etc.) have leaked into the compiled
ESM distribution. This is crucial for Cloudflare Workers compatibility.

## Pull Requests

When submitting a pull request:

1. Target the `main` branch.
2. Confirm that your contribution is covered by the applicable CLA.
3. Include tests for all new functions.
4. Ensure **all** tests pass: `pnpm test`
5. Ensure **all** linting passes: `pnpm lint:md`
6. Ensure **no Node.js built-ins**: `pnpm check:nodeps`
7. Ensure build succeeds: `pnpm build`
8. Update `CHANGELOG.md` if adding new functionality.

## Important Note: Audit Subsystem

The `@paralleldrive/cuid2` package is **intentionally NOT a dependency** of elevate-ts (yet). It
is reserved for a future audit subsystem that will provide time-travel replay and rewind of
operation sequences across distributed Cloudflare Worker instances.

Each audited operation will receive a CUID2-stamped ID (monotonically sortable, collision-resistant)
enabling deterministic replay.

**Do not add cuid2 to the library until that subsystem is fully designed and implemented.**

See the roadmap section in `README.md` for more context.

## Questions?

If you have questions about the invariants, the prompt-driven workflow, or how to implement a
particular module, or whether a contribution needs CLA coverage, open an issue or discussion on the
repository.

Thank you for contributing to elevate-ts!
