# 01: Introduction — Building a Todo App with Functional Programming

## What We're Building

A **todo application** that demonstrates functional programming with elevate-ts. It's not a
trivial example—it has real features:

- ✅ Add, complete, delete todos
- ✅ Filter by status (All, Active, Completed)
- ✅ Undo/Redo with complete state snapshots
- ✅ Form validation with error accumulation
- ✅ Persistent storage (localStorage)
- ✅ Full test coverage

**Why a todo app?** Because it combines multiple real-world concerns:
1. **State management** — Tracking todos, filters, history
2. **Validation** — Input validation with error collection
3. **Persistence** — Reading/writing to localStorage
4. **Effects** — UI interactions, network calls (for future features)
5. **Testing** — Complex workflows that benefit from pure functions

## Why Functional Programming?

Traditional OOP todo apps often look like:

```typescript
class TodoApp {
  todos: Todo[] = []

  addTodo(title: string): void {
    this.todos.push({ id: Date.now(), title, done: false })
  }

  toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id)
    if (todo) todo.done = !todo.done
  }
}
```

**Problems:**
- ❌ Mutations make testing hard (need to reset state before each test)
- ❌ Hidden dependencies (methods rely on internal state)
- ❌ Undo/Redo requires saving entire state snapshots
- ❌ Concurrency issues (mutations during async operations)

With functional programming:

```typescript
const addTodo = (title: string): State<Todos, Todo> =>
  State(todos => {
    const newTodo: Todo = { id: Date.now(), title, done: false }
    return [newTodo, [...todos, newTodo]]
  })

const toggleTodo = (id: number): State<Todos, void> =>
  State(todos => [
    undefined,
    todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
  ])
```

**Benefits:**
- ✅ **Testability** — Create state, run function, check result. No setup/teardown.
- ✅ **Transparency** — Every function declares what it needs via types
- ✅ **Undo/Redo** — Snapshots are free; just store old states
- ✅ **Composition** — Chain operations: `pipe(state, addTodo, toggleTodo)`
- ✅ **Concurrency** — No mutations = no race conditions

## The elevate-ts Difference

### Point-Free Composition

**Traditional:**
```typescript
const user = getUserById(id)
const email = user ? user.email : 'no-email'
const validated = email.length > 0 ? Just(email) : Nothing
```

**elevate-ts:**
```typescript
pipe(
  id,
  getUserById,      // id -> Maybe<User>
  chain(u => u.email),  // Maybe<string>
  filter(e => e.length > 0),
  getOrElse('no-email')
)
```

**Benefit:** Functions compose by shape. You can rearrange, add, or remove steps without
renaming variables.

### Data-Last Argument Order

**Traditional:**
```typescript
const double = (arr: number[]) => arr.map(x => x * 2)
double([1, 2, 3])  // Can't reuse without naming
```

**elevate-ts:**
```typescript
const mapDouble = map((x: number) => x * 2)
pipe([1, 2, 3], mapDouble)       // Reusable
pipe([4, 5, 6], mapDouble)       // Same function
```

**Benefit:** Curried functions with data last enable partial application and composition.

### Zero Dependencies

elevate-ts has **zero runtime dependencies**. This means:
- ✅ Smaller bundles (great for serverless)
- ✅ Runs everywhere (Cloudflare Workers, Deno, Node.js)
- ✅ No version conflicts with your other libraries
- ✅ Secure (no supply chain risk)

## Architecture at a Glance

The app has three layers:

### 1. Domain Logic (`domain.ts`)

**Pure functions.** No UI, no storage. Just data transformations.

```typescript
// Types define the shape of data
interface Todo { id: number; title: string; done: boolean }
type Todos = readonly Todo[]

// Functions transform data
const addTodo = (title: string): State<Todos, Todo> => ...
const removeTodo = (id: number): State<Todos, void> => ...
const validateTitle = (title: string): Either<string, string> => ...
```

### 2. App Component (`App.svelte`)

**Effects and UI.** Handles events, calls domain functions, updates DOM.

```svelte
<input on:change={handleAddTodo} />

<script>
  import { addTodo } from './domain'

  const handleAddTodo = (event) => {
    const result = addTodo(event.target.value)
    // Update UI with result
  }
</script>
```

### 3. Tests (`domain.test.ts`)

**Behavior specifications.** Proves domain logic works.

```typescript
test('addTodo adds a new todo', () => {
  const [newTodo, updatedTodos] = addTodo('Learn FP').run([])
  expect(newTodo.title).toBe('Learn FP')
  expect(updatedTodos).toHaveLength(1)
})
```

## Key Insight: State as a Data Structure

The `State<S, A>` monad represents a **computation that reads, transforms, and returns state**:

```typescript
type State<S, A> = {
  run: (s: S) => [A, S]  // Takes state, returns value + new state
}
```

Instead of mutating `this.todos`, we return a new snapshot:

```typescript
// Takes old todos, returns (result value, new todos)
addTodo(title).run(oldTodos) === [newTodo, [...oldTodos, newTodo]]
```

This makes **undo/redo trivial**:

```typescript
// History is just an array of todo snapshots
type History = readonly Todos[]

const undo = () => {
  history.pop()  // Remove current state
  todos = history[history.length - 1]  // Back to previous
}
```

## What's Next?

→ Read **[02: Core Concepts](./02-core-concepts.md)** to learn the monads we'll use.

---

**Remember:** The goal is not to memorize monad laws, but to understand *why* a todo app is
easier to test, reason about, and extend with functional patterns.
