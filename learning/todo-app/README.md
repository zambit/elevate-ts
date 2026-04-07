# Todo App — Learn elevate-ts Through Building

A production-quality todo app built with elevate-ts, demonstrating functional programming
patterns in a real application.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server (opens http://localhost:5173)
pnpm dev

# Run tests with coverage
pnpm test

# Watch tests as you edit
pnpm test:watch

# Build for production
pnpm build
```

## What This App Demonstrates

### Pure Functions

All business logic is in `src/domain.ts` — functions that transform state without side
effects. Easy to test, reason about, and compose.

```typescript
const addTodo = (title: string): State<Todos, Todo> => ...
const toggleTodo = (id: number): State<Todos, void> => ...
```

**Benefits:**
- ✅ Testable without mocks or setup
- ✅ Composable: chain operations with `pipe` and `chain`
- ✅ Self-documenting: types show what's needed and returned

### State Monad

Instead of mutations, functions return new state:

```typescript
const [newTodo, updatedTodos] = addTodo('Learn FP').run(currentTodos)
```

**Benefits:**
- ✅ Undo/Redo is trivial (just keep state snapshots)
- ✅ No mutations = no bugs from concurrent operations
- ✅ Natural history tracking

### Error Handling

Either and Maybe show how to handle errors as values, not exceptions:

```typescript
const parseAge = (input: string): Either<string, number> =>
  isNaN(parseInt(input)) ? Left('Not a number') : Right(parseInt(input))
```

### Persistence

Side effects (localStorage) are isolated at component boundaries:

```typescript
// Pure function with no dependencies
export const saveTodos = (todos: Todos): void => { ... }

// Called from component when state changes
onMount(() => {
  const loaded = loadTodos()
  // ...
})
```

## File Structure

| File | Purpose |
|------|---------|
| `src/types.ts` | Data type definitions (Todo, Filter, AppState) |
| `src/domain.ts` | **All pure business logic** — State, queries, persistence |
| `src/App.svelte` | **UI only** — Renders state, calls domain functions |
| `src/index.ts` | App bootstrap |
| `tests/domain.test.ts` | 100% test coverage of domain logic |

## Testing

Tests are in `tests/domain.test.ts`. They verify behavior:

```typescript
it('adds a new todo', () => {
  const [newTodo, todos] = addTodo('Test').run([])
  expect(newTodo.title).toBe('Test')
  expect(todos).toHaveLength(1)
})
```

Run them:

```bash
pnpm test           # Run once with coverage
pnpm test:watch     # Watch mode (re-runs on file change)
```

**Coverage goal:** >90% (achievable because domain is pure)

## Features

✅ **Add, toggle, delete todos** — Basic CRUD operations  
✅ **Filter by status** — Show All, Active, or Completed  
✅ **Undo/Redo** — Pure state snapshots enable history  
✅ **Persistent storage** — Saves to localStorage  
✅ **Responsive design** — Works on mobile and desktop  
✅ **Full test coverage** — All domain logic tested  

## Key Concepts

### 1. Point-Free Composition

Instead of naming intermediate values:

```typescript
// Traditional
const user = getUser(id)
const email = user?.email
const validated = email?.length > 0

// elevate-ts
pipe(
  id,
  getUser,
  map(u => u.email),
  filter(e => e.length > 0)
)
```

### 2. Data-Last Argument Order

Curried functions with data as the last argument enable composition:

```typescript
// Data-last
const mapDouble = map((x: number) => x * 2)
pipe([1, 2, 3], mapDouble)  // Reusable function
```

### 3. Pure Functions

No mutations, no side effects, no hidden dependencies:

```typescript
// Pure: same input always gives same output
const addOne = (x: number): number => x + 1

// Impure: depends on external state
let count = 0
const increment = () => ++count
```

## Learning Path

1. **Read the guides** in `learning/` directory:
   - `01-introduction.md` — Philosophy
   - `02-core-concepts.md` — Maybe, Either, State, Validation
   - `03-building-the-app.md` — Architecture walkthrough
   - `04-testing-functional-code.md` — Testing patterns

2. **Explore the code**:
   - Start with `src/types.ts` (data shapes)
   - Read `src/domain.ts` (the logic)
   - See `src/App.svelte` (how UI calls logic)
   - Check `tests/domain.test.ts` (how to test)

3. **Run and experiment**:
   - `pnpm dev` to start the app
   - Modify `src/domain.ts` and see tests fail/pass
   - Add a feature: filter by title, due dates, priorities, etc.

## Challenge: Extend the App

Try adding these features yourself:

- **Priority levels** — High, Medium, Low with filtering
- **Due dates** — Add deadlines and sort by urgency
- **Categories** — Organize todos by tag
- **Export/Import** — Save and load JSON
- **Recurring todos** — Daily, weekly, monthly tasks
- **Collaborators** — Share todos with others (needs backend)

Each requires adding domain logic, types, tests, and UI. Follow the pattern:

1. Add types to `src/types.ts`
2. Add domain functions to `src/domain.ts`
3. Add tests to `tests/domain.test.ts`
4. Add UI in `src/App.svelte`

## Tech Stack

- **elevate-ts** — Functional programming library
- **Svelte 5** — Lightweight UI framework
- **Vite** — Fast build tool
- **Vitest** — Modern test runner
- **TypeScript** — Type safety

All are optional. Same patterns work with React, Vue, vanilla JS, or even backend Node.js.

## Project Configuration

- `tsconfig.json` — TypeScript compilation
- `vite.config.ts` — Vite build configuration
- `vitest.config.ts` — Test runner setup with coverage
- `package.json` — Dependencies and scripts

## Next Steps

- ✅ Run `pnpm install && pnpm dev`
- ✅ Open http://localhost:5173
- ✅ Play with the app
- ✅ Run `pnpm test` to see tests
- ✅ Modify `src/domain.ts` and see tests catch bugs
- ✅ Add a new feature with tests first

---

**Happy learning! 🚀**

Questions? Check the guides in `learning/` or open an issue on GitHub.
