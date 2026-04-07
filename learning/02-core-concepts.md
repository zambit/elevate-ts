# 02: Core Concepts — The Four Monads We'll Use

This guide explains the four monads used in the todo app: `Maybe`, `Either`, `State`, and
`Validation`. Each solves a specific problem.

## 1. Maybe — Optional Values

### The Problem

```typescript
// How do you represent "might not exist"?
const userId = getUserId()  // number | null?
const user = getUser(userId)  // Could be undefined

// Checking gets tedious
if (userId != null && user != null && user.email != null) {
  sendEmail(user.email)
}
```

### The Solution: Maybe

`Maybe<A>` is **"definitely A, or nothing"**:

```typescript
type Just<A> = { tag: 'Just'; value: A }
type Nothing = { tag: 'Nothing' }
type Maybe<A> = Just<A> | Nothing
```

### Usage

```typescript
import { pipe } from 'elevate-ts/Function'
import { Just, Nothing, map, getOrElse, chain, filter } from 'elevate-ts/Maybe'

const userId: Maybe<number> = Just(42)  // or Nothing

// Extract with default
const id = pipe(userId, getOrElse(0))  // 42 or 0

// Transform if present
const greeting = pipe(
  userId,
  map(id => `User ${id}`),      // Just('User 42') or Nothing
  getOrElse('Unknown user')     // 'User 42' or 'Unknown user'
)

// Chain: transform only if present
const user = pipe(
  userId,
  chain(id => fetchUser(id))    // Maybe<User>
)

// Combine filter + map
const adultUsers = pipe(
  users,
  filter((u: User) => u.age >= 18)  // Just if true, Nothing if false
)
```

### When to Use

✅ Optional function parameters  
✅ Lookups that might fail  
✅ Transformations that depend on presence  
❌ When you need to know *why* something failed (use Either instead)

---

## 2. Either — Errors Without Exceptions

### The Problem

```typescript
function parseAge(input: string): number {
  const num = parseInt(input, 10)
  if (isNaN(num)) throw new Error('Not a number')
  if (num < 0) throw new Error('Must be positive')
  return num
}

// Callers must use try/catch
try {
  const age = parseAge(userInput)
} catch (e) {
  console.error(e.message)
}
```

**Problems:**
- ❌ Exceptions are implicit (easy to forget handling)
- ❌ Stack traces hurt performance
- ❌ Type system can't guarantee handling

### The Solution: Either

`Either<L, R>` is **"error (Left) or success (Right)"**:

```typescript
type Left<L> = { tag: 'Left'; left: L }
type Right<R> = { tag: 'Right'; right: R }
type Either<L, R> = Left<L> | Right<R>
```

### Usage

```typescript
import { pipe } from 'elevate-ts/Function'
import { Left, Right, map, chain, getOrElse, getOrElseL } from 'elevate-ts/Either'

// Return errors as values
const parseAge = (input: string): Either<string, number> => {
  const num = parseInt(input, 10)
  if (isNaN(num)) return Left('Not a number')
  if (num < 0) return Left('Must be positive')
  return Right(num)
}

// Handle success
const ageStr = pipe(
  '25',
  parseAge,                          // Either<string, number>
  map(age => `Age: ${age}`),         // Either<string, string>
  getOrElse('Invalid age')           // 'Age: 25' or 'Invalid age'
)

// Chain: propagate errors
const validateAge = (age: number): Either<string, number> =>
  age >= 18 ? Right(age) : Left('Too young')

const result = pipe(
  '25',
  parseAge,
  chain(age => validateAge(age)),    // Stops at first error
  getOrElse('Cannot process')
)

// Transform the error
const message = pipe(
  parseAge('abc'),
  getOrElseL(err => `Error: ${err}`)  // Access the error
)  // 'Error: Not a number'
```

### When to Use

✅ Operations that can fail with known errors  
✅ API calls (validation, network errors)  
✅ Parsing input (config files, form data)  
✅ Anything that might throw  
❌ Multiple independent validations (use Validation instead)

---

## 3. State — Pure Stateful Computation

### The Problem

```typescript
class TodoManager {
  todos: Todo[] = []

  addTodo(title: string) {
    this.todos.push({ id: ++this.id, title, done: false })
  }

  // Undo requires manual snapshots
  undo() { /* ??? */ }
}
```

### The Solution: State

`State<S, A>` represents **"a computation that reads state S, returns value A, and new
state S"**:

```typescript
type State<S, A> = {
  run: (state: S) => readonly [A, S]
}
```

### Usage

```typescript
import { State } from 'elevate-ts/State'
import { pipe } from 'elevate-ts/Function'

type Todos = readonly Todo[]

// State<Todos, newTodo>: takes todos, returns (todo, updated todos)
const addTodo = (title: string): State<Todos, Todo> =>
  State(todos => {
    const newTodo: Todo = {
      id: Math.max(...todos.map(t => t.id), 0) + 1,
      title,
      done: false
    }
    return [newTodo, [...todos, newTodo]]
  })

// Run state transitions
const startingTodos: Todos = []
const [newTodo, updatedTodos] = addTodo('Learn FP').run(startingTodos)
// newTodo === { id: 1, title: 'Learn FP', done: false }
// updatedTodos === [{ id: 1, title: 'Learn FP', done: false }]

// Chain state operations
const twoTodos = pipe(
  addTodo('First'),
  chain(t1 => addTodo('Second'))
).run([])
// Returns [todo2, [todo1, todo2]]

// Undo is trivial
const history: Todos[] = []
let todos: Todos = []

const doSomething = addTodo('Test')
const [_, newTodos] = doSomething.run(todos)
history.push(todos)  // Save old state
todos = newTodos

const undo = () => {
  todos = history.pop() ?? []
}
```

### When to Use

✅ Stateful workflows (todo lists, counters, games)  
✅ Undo/Redo (just store old states)  
✅ Configuration that threads through operations  
✅ Dependency injection (Reader is a special case)  
❌ Async operations (use EitherAsync or MaybeAsync instead)

---

## 4. Validation — Collect All Errors

### The Problem

```typescript
// Either stops at first error
const validate = (form: Form): Either<string, ValidForm> => {
  const nameErr = validateName(form.name)
  if (nameErr) return Left(nameErr)  // Stops here!

  const emailErr = validateEmail(form.email)
  if (emailErr) return Left(emailErr)

  return Right({ name: form.name, email: form.email })
}

// User sees only the first error, not all problems
```

### The Solution: Validation

`Validation<E, A>` is like Either, but **collects all errors** with applicative, not monad:

```typescript
import { Success, Failure, map, ap, fold } from 'elevate-ts/Validation'

const validateName = (name: string): Validation<string[], string> =>
  name.length > 0
    ? Success(name)
    : Failure(['Name is required'])

const validateEmail = (email: string): Validation<string[], string> =>
  email.includes('@')
    ? Success(email)
    : Failure(['Invalid email'])

// Applicative ap collects all errors
const validateForm = (form: Form): Validation<string[], ValidForm> =>
  pipe(
    // Create a constructor function
    (name: string) => (email: string) => ({ name, email }),
    // Apply it to validations
    ap(validateName(form.name)),  // If fails, collect error
    ap(validateEmail(form.email))  // Still runs, collects all errors
  )

const result = validateForm(userInput)
// Success({ name: 'Alice', email: 'alice@example.com' })
// OR
// Failure(['Name is required', 'Invalid email'])  // Both errors!
```

### When to Use

✅ Form validation (show all errors at once)  
✅ Config file validation (report all problems)  
✅ Accumulate errors during applicative ops  
❌ Sequential operations (use Either instead)

---

## Comparing the Monads

| Monad | Represents | When to Use |
|-------|-----------|-----------|
| **Maybe** | Present or absent | Optional values, lookups |
| **Either** | Success or error | Operations that fail, errors matter |
| **State** | Stateful computation | Workflows, undo/redo |
| **Validation** | Success or errors (plural) | Collect all validation errors |

---

## Combining Monads

The real power emerges when you combine them:

```typescript
// Add a todo, get back Either the new todo or error message
// Inside State so we track all todos
// Inside Validation first to ensure valid title
const addTodoSafely = (title: string): State<Todos, Either<string, Todo>> =>
  State(todos => {
    const validation = pipe(
      title,
      validateTitle,  // Validation<string[], string>
      fold(
        errors => Left(errors.join(', ')),
        validTitle => Right(validTitle)
      )
    )
    
    return [
      validation,
      validation.tag === 'Left' 
        ? todos
        : pipe(
            addTodo(validTitle).run(todos),
            ([_newTodo, _newTodos]) => _newTodos
          )
    ]
  })
```

**Read as:** "Stateful operation that validates the title and either returns error or adds
the todo."

---

## What's Next?

→ Read **[03: Building the App](./03-building-the-app.md)** to see these concepts in action
in the todo app!
