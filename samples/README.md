# elevate-ts Samples

Example applications showcasing functional programming patterns from elevate-ts in realistic scenarios.
Each sample is self-contained, fully tested, and ready to run locally or deploy to Cloudflare.

## Sample Categories

### Frontend Examples (Vite + Svelte)

Lightweight, modern UI applications demonstrating FP patterns in user-facing code.

- **[01-validation-form](./spa-examples/01-validation-form)** — Multi-field form validation with
  real-time error accumulation (Validation monad)
- **[02-state-counter](./spa-examples/02-state-counter)** — Pure stateful UI with undo/redo
  (State monad)
- **[03-list-operations](./spa-examples/03-list-operations)** — Interactive list filtering,
  sorting, grouping (List utilities)

### Cloudflare Workers Examples

Serverless backend functions demonstrating FP patterns in production-ready APIs.

- **[01-async-pipeline](./worker-examples/01-async-pipeline)** — Composable async error
  handling in request processing (EitherAsync)
- **[02-dependency-injection](./worker-examples/02-dependency-injection)** — Configuration
  and environment management (Reader monad)
- **[03-stateful-api](./worker-examples/03-stateful-api)** — Pure stateful workflows in
  Workers KV (State monad)

### Full-Stack Examples

Complete applications with Svelte frontend + Cloudflare Worker backend.

- **[01-todo-app](./fullstack-examples/01-todo-app)** — Real-time todo list with persistent
  state across client/server (Maybe + EitherAsync + State)

## Getting Started

### Prerequisites

```bash
# Node.js 18+
# pnpm 8+
npm install -g pnpm

# Wrangler CLI (for Worker examples)
npm install -g @cloudflare/wrangler
```

### Running a Sample Locally

```bash
cd samples/spa-examples/01-validation-form

# Install dependencies
pnpm install

# Development server with HMR
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Running Worker Samples

```bash
cd samples/worker-examples/01-async-pipeline

# Install dependencies
pnpm install

# Local dev server (emulates Cloudflare Workers)
pnpm dev

# Run tests (miniflare emulation)
pnpm test

# Deploy to Cloudflare (requires account + configuration)
pnpm deploy
```

## Sample Structure

Each sample includes:

- `src/` — Source code (TypeScript)
- `tests/` — Test suite (Vitest + testing libraries)
- `package.json` — Project metadata and scripts
- `tsconfig.json` — Extends `../tsconfig.base.json`
- `README.md` — Full documentation with "Why This Matters" section
- `vite.config.ts` or `wrangler.toml` — Build/deployment configuration

## Design Principles

1. **Self-contained** — Each sample can be cloned and run independently
2. **Tested** — Full test coverage demonstrating patterns work correctly
3. **Production-ready** — Code is suitable for real-world applications
4. **Educational** — Well-commented, showcasing best practices
5. **Maintainable** — Consistent structure across all samples
6. **Minimal** — No unnecessary dependencies; focus on elevate-ts patterns

## Adding a New Sample

See `prompts/README.md` for the prompt-driven development workflow for creating new samples.

## Why These Patterns Matter

See individual sample READMEs for deep dives into:
- **When to use each pattern** (When to use Validation vs. Either?)
- **Classic real-world scenarios** (Registration forms, API pipelines, state machines)
- **Problem-solution connections** (The pain point each monad solves)
- **Anti-patterns to avoid** (When NOT to use each pattern)

## Testing & Deployment

- **Local testing:** Run `pnpm test` in any sample directory
- **Integration testing:** Full-stack samples include client-server tests
- **Deploy to production:** See individual sample READMEs for deployment instructions

## TypeScript Configuration

All samples extend `./tsconfig.base.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

This keeps configurations consistent while allowing per-sample customization.

## Questions?

- **How do I use pattern X?** → See the corresponding sample README
- **Can I use this in my project?** → Yes! Each sample can be a template
- **How do I deploy?** → See the sample's "Deploying to Cloudflare" section

---

**Next:** Pick a sample, run `pnpm install && pnpm dev`, and explore! 🚀
