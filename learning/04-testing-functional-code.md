# 04: Testing Functional Code — Strategies and Patterns

Testing pure functions is **simpler than testing OOP code** because there's no state to mock
or clean up. This guide shows patterns from the todo app.

## The Advantage: Pure Functions Are Trivial to Test

```typescript
// No setup, no mocks, no side effects
it('adds a todo', () => {
  const [newTodo, todos] = addTodo('Test').run([])
  expect(newTodo.title).toBe('Test')
  expect(todos).toHaveLength(1)
})
```

Compare to OOP:

```typescript
// ❌ Requires setup and teardown
it('adds a todo', () => {
  const app = new TodoApp()  // Setup
  app.addTodo('Test')
  expect(app.todos).toHaveLength(1)
  app.resetState()  // Teardown
})
```

## Testing State Functions

`State<S, A>` functions take initial state and return `[result, newState]`:

```typescript
const [result, newState] = fn.run(initialState)
```

**Test the result AND the state:**

```typescript
it('addTodo returns new todo and updated list', () => {
  const initial: Todos = []
  const [newTodo, final] = addTodo('Learn FP').run(initial)

  // Test the returned value
  expect(newTodo.title).toBe('Learn FP')
  expect(newTodo.done).toBe(false)

  // Test the new state
  expect(final).toHaveLength(1)
  expect(final[0]).toEqual(newTodo)
})
```

## Testing Composition

Chain operations and verify the final state:

```typescript
it('composing operations works', () => {
  const workflow = pipe(
    addTodo('First'),
    chain(() => addTodo('Second')),
    chain(() => toggleTodo(1))
  )

  const [_, finalTodos] = workflow.run([])

  expect(finalTodos).toHaveLength(2)
  expect(finalTodos[0].done).toBe(true)  // Toggled
  expect(finalTodos[1].done).toBe(false)
})
```

## Testing Error Cases

Use `Either` to test both success and failure:

```typescript
const validateTitle = (title: string): Either<string, string> =>
  title.trim().length > 0
    ? Right(title.trim())
    : Left('Title cannot be empty')

it('validates empty titles', () => {
  const result = validateTitle('   ')
  expect(result).toEqual(Left('Title cannot be empty'))
})

it('validates non-empty titles', () => {
  const result = validateTitle('  Learn FP  ')
  expect(result).toEqual(Right('Learn FP'))
})
```

## Testing Optional Values

Use `Maybe` when values might not exist:

```typescript
const findTodo = (id: number, todos: Todos): Maybe<Todo> =>
  Maybe.fromNullable(todos.find(t => t.id === id))

it('finds existing todo', () => {
  const todos = [{ id: 1, title: 'Test', done: false }]
  const result = findTodo(1, todos)
  expect(result).toEqual(Just({ id: 1, title: 'Test', done: false }))
})

it('returns Nothing for missing todo', () => {
  const result = findTodo(999, [])
  expect(result).toEqual(Nothing)
})
```

## Testing Transformations

Test that `map` and `chain` work correctly:

```typescript
it('map transforms value inside Just', () => {
  const doubled = pipe(
    Just(5),
    map(x => x * 2)
  )
  expect(doubled).toEqual(Just(10))
})

it('map returns Nothing if input is Nothing', () => {
  const result = pipe(
    Nothing,
    map(x => x * 2)
  )
  expect(result).toEqual(Nothing)
})

it('chain flattens nested Maybes', () => {
  const result = pipe(
    Just(5),
    chain(x => x > 0 ? Just(x * 2) : Nothing)
  )
  expect(result).toEqual(Just(10))
})
```

## Testing Undo/Redo

History-based undo is just state restoration:

```typescript
const initialState: AppState = {
  todos: [],
  filter: 'All',
  history: []
}

it('undo restores previous state', () => {
  // Add two todos while saving history
  let state = initialState
  const [_, state1] = addWithHistory('First').run(state)
  const [__, state2] = addWithHistory('Second').run(state1)

  // State2 has history [initialState, state1]
  expect(state2.history).toHaveLength(2)

  // Undo goes back
  const [___, undoneState] = undo().run(state2)
  expect(undoneState.todos).toEqual(state1.todos)
  expect(undoneState.history).toHaveLength(1)
})

it('undo with empty history does nothing', () => {
  const [_, result] = undo().run(initialState)
  expect(result).toEqual(initialState)
})
```

## Testing Impure Functions (Side Effects)

Sometimes you need to test effects. Use integration tests:

```typescript
// localStorage is a side effect, test it separately
describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves todos to localStorage', () => {
    saveTodos('todos-key', [{ id: 1, title: 'Test', done: false }])
    expect(localStorage.getItem('todos-key')).toBeDefined()
  })

  it('loads todos from localStorage', () => {
    localStorage.setItem('todos-key', JSON.stringify([...]))
    const loaded = loadTodos('todos-key')
    expect(loaded).toHaveLength(1)
  })
})
```

## Test Structure: AAA Pattern

**Arrange → Act → Assert**

```typescript
it('does something', () => {
  // Arrange: set up initial state
  const initial: Todos = [{ id: 1, title: 'Test', done: false }]

  // Act: call the function
  const [_, result] = toggleTodo(1).run(initial)

  // Assert: check expectations
  expect(result[0].done).toBe(true)
})
```

## Test Organization

Group tests logically:

```typescript
describe('domain', () => {
  describe('addTodo', () => {
    it('creates new todo with unique id', () => { })
    it('preserves existing todos', () => { })
    it('sets done to false', () => { })
  })

  describe('toggleTodo', () => {
    it('marks complete todo as incomplete', () => { })
    it('marks incomplete todo as complete', () => { })
  })

  describe('undo', () => {
    it('restores previous state', () => { })
  })
})
```

## Common Testing Mistakes (and How to Avoid Them)

### ❌ Testing Implementation Instead of Behavior

```typescript
// Bad: tests how it's done, not what it does
it('uses Math.max', () => {
  expect(addTodo('Test').run([]).id).toBeGreaterThan(0)
})

// Good: tests the contract
it('generates unique ids', () => {
  const [t1, s1] = addTodo('A').run([])
  const [t2, s2] = addTodo('B').run(s1)
  expect(t1.id).not.toBe(t2.id)
})
```

### ❌ Mutating Test Data

```typescript
// Bad: modifies shared state
const todos = [{ id: 1, title: 'Test', done: false }]
addTodo('New').run(todos)  // Don't expect todos to change!

// Good: use the returned state
const [_, newTodos] = addTodo('New').run(todos)
expect(newTodos).toHaveLength(2)
```

### ❌ Testing Too Much in One Test

```typescript
// Bad: one test testing multiple concerns
it('works', () => {
  const [t1, s1] = addTodo('First').run([])
  const [t2, s2] = addTodo('Second').run(s1)
  const [_, s3] = toggleTodo(1).run(s2)
  const [__, s4] = removeTodo(2).run(s3)
  // What failed? No idea.
})

// Good: focus on one behavior
it('adds todos with unique ids', () => {
  const [t1, s1] = addTodo('A').run([])
  const [t2, _] = addTodo('B').run(s1)
  expect(t1.id).not.toBe(t2.id)
})
```

## Running Tests

```bash
# Run all tests once
pnpm test

# Run in watch mode (re-runs on file change)
pnpm test:watch

# Run with coverage report
pnpm test -- --coverage

# Run specific test file
pnpm test -- domain.test.ts
```

## Coverage Goals

For functional code:

- ✅ **Core logic:** 100% coverage (domain functions)
- ✅ **UI components:** 60–80% (harder to test, less critical)
- ✅ **Effects:** Integration tests (localStorage, API calls)

The todo app aims for **>90% overall coverage** because the domain is pure and testable.

## What's Next?

🎉 You've learned the full stack! Next:

1. **Read the actual app** — Explore `learning/todo-app/src/`
2. **Run the tests** — `cd learning/todo-app && pnpm test`
3. **Run the app** — `pnpm dev` and play with it
4. **Modify it** — Add a feature and test it
5. **Explore samples** — Check `samples/` for more patterns

---

**Happy testing! 🚀**
