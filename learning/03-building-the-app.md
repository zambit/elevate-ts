# 03: Building the App — Architecture and Implementation

This guide walks you through the todo app structure. You'll see how the concepts from guides 01
and 02 combine into a working application.

## File Structure

```
learning/todo-app/
├── src/
│   ├── types.ts          # Domain types (Todo, Filter, etc.)
│   ├── domain.ts         # All pure business logic
│   ├── App.svelte        # UI component (side effects)
│   └── index.ts          # App entry point
├── tests/
│   └── domain.test.ts    # Tests for domain.ts
├── package.json          # Dependencies
├── vite.config.ts        # Build config
├── vitest.config.ts      # Test config
└── index.html            # HTML entry point
```

## 1. Domain Types (`src/types.ts`)

Start with the **shapes** your app uses. Types are the contract:

```typescript
// A single todo
interface Todo {
  readonly id: number
  readonly title: string
  readonly done: boolean
}

// All todos together
type Todos = readonly Todo[]

// Which todos to display
type Filter = 'All' | 'Active' | 'Completed'

// App state: todos + current filter + undo history
interface AppState {
  readonly todos: Todos
  readonly filter: Filter
  readonly history: readonly Todos[]  // For undo
}
```

**Benefits:**
- ✅ Types document intent (readonly properties = immutable)
- ✅ Compiler catches mistakes
- ✅ IDE autocomplete works
- ✅ Types are self-documenting

## 2. Pure Business Logic (`src/domain.ts`)

All the logic lives here. **No UI, no side effects, just data transformations.**

### Building Blocks

```typescript
import { State } from 'elevate-ts/State'
import { pipe } from 'elevate-ts/Function'
import { filter, map } from 'elevate-ts/List'

// Add a todo to the list
const addTodo = (title: string): State<Todos, Todo> =>
  State(todos => {
    const newTodo: Todo = {
      id: todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1,
      title,
      done: false
    }
    return [newTodo, [...todos, newTodo]]
  })

// Mark a todo as done or undone
const toggleTodo = (id: number): State<Todos, void> =>
  State(todos => [
    undefined,
    todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
  ])

// Delete a todo
const removeTodo = (id: number): State<Todos, void> =>
  State(todos => [
    undefined,
    todos.filter(t => t.id !== id)
  ])

// Get filtered todos (All, Active, or Completed)
const getFilteredTodos = (filter: Filter, todos: Todos): readonly Todo[] =>
  filter === 'All' ? todos
    : filter === 'Active' ? todos.filter(t => !t.done)
    : todos.filter(t => t.done)

// Count todos by status
const countTodos = (todos: Todos): { total: number; done: number; active: number } => ({
  total: todos.length,
  done: todos.filter(t => t.done).length,
  active: todos.filter(t => !t.done).length
})

// App-level state: todos + filter + history
const changeFilter = (filter: Filter): State<AppState, void> =>
  State(state => [undefined, { ...state, filter }])

// Add todo AND save history for undo
const addWithHistory = (title: string): State<AppState, Todo> =>
  State(state => {
    const [newTodo, newTodos] = addTodo(title).run(state.todos)
    return [
      newTodo,
      {
        ...state,
        todos: newTodos,
        history: [...state.history, state.todos]  // Save old state
      }
    ]
  })

// Undo: restore previous state
const undo = (): State<AppState, void> =>
  State(state => [
    undefined,
    state.history.length > 0
      ? {
          todos: state.history[state.history.length - 1],
          filter: state.filter,
          history: state.history.slice(0, -1)
        }
      : state
  ])
```

### Why All State Functions?

State monads make it safe to **thread state through operations** without mutations:

```typescript
// ❌ Imperative (mutations)
const state = { todos: [] }
addTodo('First').run(state.todos)
state.todos = ... // Manual update needed

// ✅ Functional (no mutations)
const workflow = pipe(
  addTodo('First'),
  chain(() => addTodo('Second')),
  chain(() => toggleTodo(1))
)
const [_, finalTodos] = workflow.run(initialTodos)
```

## 3. UI Component (`src/App.svelte`)

The component **calls domain functions** and **renders state**:

```svelte
<script>
  import { onMount } from 'svelte'
  import { addWithHistory, toggleTodo, removeTodo, changeFilter, undo } from './domain'
  import type { AppState } from './types'

  // All state is in Svelte reactivity
  let appState: AppState = {
    todos: [],
    filter: 'All',
    history: []
  }

  // Run a state function and update appState
  const execute = (fn: State<AppState, unknown>) => {
    const [_, newState] = fn.run(appState)
    appState = newState
  }

  // Event handlers delegate to domain
  const handleAdd = (event: Event) => {
    const input = event.target as HTMLInputElement
    const title = input.value.trim()
    if (title) {
      execute(addWithHistory(title))
      input.value = ''
    }
  }

  const handleToggle = (id: number) => {
    execute(toggleTodo(id))
  }

  const handleDelete = (id: number) => {
    execute(removeTodo(id))
  }

  const handleUndo = () => {
    execute(undo())
  }

  // Get filtered display
  $: filtered = getFilteredTodos(appState.filter, appState.todos)
  $: counts = countTodos(appState.todos)
</script>

<main>
  <h1>My Todos</h1>

  <input type="text" on:change={handleAdd} placeholder="Add a todo..." />

  <div>
    <button on:click={() => execute(changeFilter('All'))}>All ({counts.total})</button>
    <button on:click={() => execute(changeFilter('Active'))}>Active ({counts.active})</button>
    <button on:click={() => execute(changeFilter('Completed'))}>Done ({counts.done})</button>
    <button on:click={handleUndo} disabled={appState.history.length === 0}>Undo</button>
  </div>

  <ul>
    {#each filtered as todo (todo.id)}
      <li class:done={todo.done}>
        <input type="checkbox" checked={todo.done} on:change={() => handleToggle(todo.id)} />
        <span>{todo.title}</span>
        <button on:click={() => handleDelete(todo.id)}>Delete</button>
      </li>
    {/each}
  </ul>
</main>

<style>
  .done { text-decoration: line-through; opacity: 0.6; }
</style>
```

## 4. Testing Domain Logic (`tests/domain.test.ts`)

Tests are **specifications** of what the functions do:

```typescript
import { describe, it, expect } from 'vitest'
import { addTodo, toggleTodo, removeTodo, getFilteredTodos, countTodos } from '../src/domain'

describe('domain', () => {
  const emptyTodos: Todos = []
  const sampleTodos: Todos = [
    { id: 1, title: 'Learn FP', done: false },
    { id: 2, title: 'Build app', done: true }
  ]

  describe('addTodo', () => {
    it('adds a new todo to empty list', () => {
      const [newTodo, result] = addTodo('First task').run(emptyTodos)
      expect(result).toHaveLength(1)
      expect(newTodo.title).toBe('First task')
      expect(newTodo.done).toBe(false)
    })

    it('increments id', () => {
      const [todo1, todos1] = addTodo('First').run(emptyTodos)
      const [todo2, _] = addTodo('Second').run(todos1)
      expect(todo1.id).toBe(1)
      expect(todo2.id).toBe(2)
    })

    it('preserves existing todos', () => {
      const [_, result] = addTodo('New task').run(sampleTodos)
      expect(result).toContain(sampleTodos[0])
      expect(result).toContain(sampleTodos[1])
      expect(result).toHaveLength(3)
    })
  })

  describe('toggleTodo', () => {
    it('marks incomplete todo as done', () => {
      const [_, result] = toggleTodo(1).run(sampleTodos)
      expect(result[0].done).toBe(true)
    })

    it('marks completed todo as incomplete', () => {
      const [_, result] = toggleTodo(2).run(sampleTodos)
      expect(result[1].done).toBe(false)
    })
  })

  describe('removeTodo', () => {
    it('removes todo by id', () => {
      const [_, result] = removeTodo(1).run(sampleTodos)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2)
    })
  })

  describe('getFilteredTodos', () => {
    it('returns all todos when filter is "All"', () => {
      expect(getFilteredTodos('All', sampleTodos)).toEqual(sampleTodos)
    })

    it('returns only active todos when filter is "Active"', () => {
      const active = getFilteredTodos('Active', sampleTodos)
      expect(active).toHaveLength(1)
      expect(active[0].done).toBe(false)
    })

    it('returns only completed todos when filter is "Completed"', () => {
      const done = getFilteredTodos('Completed', sampleTodos)
      expect(done).toHaveLength(1)
      expect(done[0].done).toBe(true)
    })
  })

  describe('countTodos', () => {
    it('counts correctly', () => {
      expect(countTodos(sampleTodos)).toEqual({
        total: 2,
        done: 1,
        active: 1
      })
    })
  })
})
```

## Key Principles

### 1. **Separation of Concerns**

- `types.ts` → Shapes and contracts
- `domain.ts` → Logic (testable, pure)
- `App.svelte` → UI and side effects

### 2. **Immutability**

Every function returns a **new** state; nothing mutates:

```typescript
// ✅ Good: returns new array
const newTodos = [...todos, newTodo]

// ❌ Wrong: mutates
todos.push(newTodo)
```

### 3. **Composability**

Functions chain together with `pipe` and `chain`:

```typescript
pipe(
  addTodo('First'),
  chain(() => addTodo('Second')),
  chain(() => removeTodo(1))
).run(initialTodos)
```

### 4. **Testability**

No mocks, no setup. Just call functions:

```typescript
const [result, newState] = addTodo('Test').run([])
expect(result.title).toBe('Test')
```

## Scaling This Pattern

As your app grows:

1. **Split domain.ts** into modules (todos.ts, filters.ts, etc.)
2. **Add validation** (Either/Validation for user input)
3. **Add effects** (EitherAsync for API calls)
4. **Add persistence** (load/save state from server)

The pattern stays the same: **pure domain logic + side effects at boundaries**.

---

## What's Next?

→ Read **[04: Testing Functional Code](./04-testing-functional-code.md)** to learn testing
strategies for pure functions.
