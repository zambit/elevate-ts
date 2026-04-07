# Sample: State Counter with Undo/Redo

## Quick Summary

Interactive counter demonstrating the `State` monad for pure, composable stateful computation with full undo/redo capability.

## Why This Matters

**Problem:** Managing UI state that supports time-travel features (undo/redo, history) is messy with traditional mutable state. You must either manually manage history stacks alongside state mutations (error-prone) or thread state through every handler (verbose).

**Solution:** The `State` monad makes stateful computation pure. Each operation is a function `(s: S) => [A, S]` that receives state, does something, returns value + new state. No mutations. Natural for undo/redo: just keep history in the state. Perfect for games, wizards, editors, anywhere you need deterministic state transformations.

**Key Insight:** State monad = pure function that threads state. Chaining State operations creates a clear "thread" through state space. Each step is testable in isolation. Undo/redo becomes trivial: history is just part of the immutable state.

## Classic Use Cases

1. **Undo/redo stacks** — Code editors, drawing apps, document editors. Every operation adds to history; undo pops it.
2. **Form wizards** — Multi-step forms. Each step is pure state transformation. Go back/forward, state stays consistent.
3. **Game logic** — Turn-based games. Each move: `move(state) => (result, newState)`. Purely testable, replayable, deterministic.
4. **Shopping cart** — Add/remove/quantity changes are pure transformations. Easy to test, compose, understand.
5. **Configuration builder** — Step-by-step config building. Preview state at any point, go back, try alternatives.

## When NOT to Use State

- **Async operations** — Use `State` + `EitherAsync` or `MaybeAsync` combined
- **Complex derived state** — Might need `Reader` + `State` combined
- **Simple UI state with no history** — Svelte stores might be simpler

## Key Concepts

**State Monad:** A computation that threads state through a series of operations. `run(state)` executes it with initial state, returning `[finalState, value]`.

**Pure Stateful Computation:** No mutations. Each operation receives current state, returns new state + value. Makes testing natural (no side effects). Makes composition easy (chain operations).

**History Tracking:** Keep history in state itself. Undo pops history, reverts value. Immutable, no special mechanisms needed.

## Running Locally

```bash
cd samples/spa-examples/state-counter

# Install dependencies
pnpm install

# Start dev server (opens http://localhost:3001)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build for production
pnpm build

# View coverage report
pnpm test
```

## Testing

The sample includes comprehensive tests for the State machine:

```bash
pnpm test  # Run all tests with coverage
```

Tests cover:
- Increment/decrement operations
- History recording
- Undo functionality
- Reset to initial state
- Sequential chained operations
- Typical use case: increment → increment → undo → increment

## Code Walkthrough

### State Machine (`src/state-machine.ts`)

Pure operations that work with immutable state:

```typescript
export const increment = (amount: number): State<CounterState, number> =>
  State.State((s) => {
    const newState = {
      current: s.current + amount,
      history: [...s.history, s.current]  // Record old value
    }
    return [newState, newState.current]
  })

export const undo = (): State<CounterState, number> =>
  State.State((s) => {
    if (s.history.length === 0) return [s, s.current]
    const restoredValue = s.history[s.history.length - 1]
    return [{
      current: restoredValue,
      history: s.history.slice(0, -1)  // Remove from history
    }, restoredValue]
  })
```

Each operation:
1. Takes state as parameter
2. Returns `[newState, value]` tuple
3. Makes no mutations (immutable)
4. Can be chained and composed

### Component (`src/App.svelte`)

Uses State machine to manage counter state:

```svelte
<script>
  import { increment, decrement, undo } from './state-machine.js'

  let state = { current: 0, history: [] }

  const handleIncrement = () => {
    const [newState] = increment(1).run(state)
    state = newState  // Reactivity: update triggers re-render
  }

  const handleUndo = () => {
    const [newState] = undo().run(state)
    state = newState
  }
</script>
```

### Design Tokens

Uses shared design token system from workspace root:

```svelte
<script>
  import './styles/tokens.css'  // Auto-generated from src/tokens/config.ts
</script>

<style>
  .counter {
    color: var(--color-brand)
    padding: var(--spacing-8)
    border-radius: var(--radius-md)
  }
</style>
```

See [TOKENS.md](../../TOKENS.md) for customization.

## Further Reading

- [State Monad — Haskell Wiki](https://wiki.haskell.org/State_monad) — Deep dive into theory
- [elevate-ts State docs](../../README.md#state) — Full API reference
- [Functional Programming patterns](https://mostly-adequate.gitbook.io/mostly-adequate-guide/) — General FP concepts
