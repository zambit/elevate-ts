# elevate-ts vs purify-ts: A Comparison Guide

## Overview

Both **elevate-ts** and **purify-ts** provide algebraic data types for functional programming in TypeScript, but they
represent different philosophies and use cases.

- **purify-ts**: A mature, class-based library with method chaining and traditional object-oriented composition
- **elevate-ts**: A modern, point-free, data-last library optimized for pipe composition and Cloudflare Workers

## Quick Comparison

| Aspect | purify-ts | elevate-ts |
|--------|-----------|-----------|
| **API Style** | Method chaining (OOP) | Point-free, data-last (FP) |
| **Composition** | `.map().chain().getOrElse()` | `pipe(value, map(f), chain(g))` |
| **Argument Order** | Data first (wrapped value implicit) | Data last (explicit via pipe) |
| **Dependencies** | Dependencies included | Zero runtime dependencies |
| **Node.js Builtins** | May use them | None (Cloudflare Workers ready) |
| **Bundle Size** | Larger | Minimal |
| **Fantasy Land** | Compliant | Compliant (v5) |
| **ESM Support** | Yes, but varied | ESM-first with `.js` extensions |
| **Type Safety** | Strong | Strong, fully typed |

## Why Choose elevate-ts?

### 1. **Cloudflare Workers & Edge Computing**

- No Node.js built-ins means code runs directly on Cloudflare Workers, Deno Deploy, and other runtimes
- Zero external dependencies = minimal bundle size for edge functions

```typescript
// Works in Cloudflare Workers
import { pipe } from 'elevate-ts/Function'
import { Just, map, chain } from 'elevate-ts/Maybe'

export default {
  fetch(request: Request) {
    const result = pipe(
      data,
      map(parse),
      chain(validate)
    )
    return new Response(JSON.stringify(result))
  }
}
```

### 2. **Point-Free Composition**

- Functions compose by shape, not by intermediate variable names
- More declarative: you read what transformations happen, not how
- Easier refactoring: reorder operations without renaming variables

```typescript
// purify-ts (method chaining)
const result = getUserById(userId)
  .map(user => user.email)
  .chain(email => validateEmail(email))
  .getOrElse('Invalid email')

// elevate-ts (point-free)
const result = pipe(
  userId,
  getUserById,
  map(user => user.email),
  chain(validateEmail),
  getOrElse('Invalid email')
)
```

### 3. **Data-Last Argument Order**

- Curried functions with data as the final argument
- Enables powerful partial application and composition
- Configuration precedes data: `(config) => (data) => result`

```typescript
// purify-ts
const double = (value: number) => value * 2
const arr = [1, 2, 3]
const doubled = arr.map(double) // Method call on array

// elevate-ts (data-last)
const double = (n: number) => n * 2
const arr = [1, 2, 3]
const mapDouble = map(double) // Partial application
const doubled = pipe(arr, mapDouble) // Reusable transformation
```

### 4. **Smaller & Faster**

- Each function ≤15 lines, max one side effect
- Minimal bundle footprint
- Tree-shakable
- No unused dependencies

### 5. **Explicit Imports**

- Functions come from modules, not methods
- Clear about what you're importing
- Better IDE autocomplete and refactoring

## Why Choose purify-ts?

### 1. **Mature & Battle-Tested**

- Established library with real-world usage
- Extensive ecosystem and community resources
- More third-party integrations

### 2. **Object-Oriented Comfort**

- If your team prefers method chaining
- Natural if coming from OOP backgrounds
- No need to learn point-free style

```typescript
// Feels natural with one variable
const user = Maybe.fromNullable(getUserData(id))
  .map(u => u.name)
  .getOrElse('Unknown')
```

### 3. **More Operators & Type Classes**

- Richer type class ecosystem
- More helper functions pre-built
- Larger surface area (sometimes good, sometimes bloat)

## Side-by-Side Examples

### Example 1: Handling Optional User Fetch

**purify-ts:**

```typescript
import { Maybe, fromNullable } from 'purify-ts/Maybe'
import { Left, Right } from 'purify-ts/Either'

interface User {
  id: number
  email: string
}

const getUserEmail = (user: User | null): string =>
  fromNullable(user)
    .map(u => u.email)
    .getOrElse('no-email')
```

**elevate-ts:**

```typescript
import { pipe } from 'elevate-ts/Function'
import { fromNullable, map, getOrElse } from 'elevate-ts/Maybe'

interface User {
  id: number
  email: string
}

const getUserEmail = (user: User | null): string =>
  pipe(
    user,
    fromNullable,
    map((u: User) => u.email),
    getOrElse('no-email')
  )
```

### Example 2: Validation with Error Handling

**purify-ts:**

```typescript
import { Right, Left, Either } from 'purify-ts/Either'

const parseAge = (raw: string): Either<string, number> => {
  const n = parseInt(raw, 10)
  return isNaN(n) ? Left('Not a number') : Right(n)
}

const validateAge = (age: number): Either<string, number> =>
  age >= 0 && age <= 150 ? Right(age) : Left('Invalid age range')

const getAdultStatus = (userInput: string): string =>
  parseAge(userInput)
    .chain(validateAge)
    .map(age => `Adult: ${age >= 18}`)
    .getOrElse('Invalid input')
```

**elevate-ts:**

```typescript
import { pipe } from 'elevate-ts/Function'
import { Right, Left, chain, map, getOrElse as getOrElseEither } from 'elevate-ts/Either'

const parseAge = (raw: string): Either<string, number> => {
  const n = parseInt(raw, 10)
  return isNaN(n) ? Left('Not a number') : Right(n)
}

const validateAge = (age: number): Either<string, number> =>
  age >= 0 && age <= 150 ? Right(age) : Left('Invalid age range')

const getAdultStatus = (userInput: string): string =>
  pipe(
    userInput,
    parseAge,
    chain(validateAge),
    map(age => `Adult: ${age >= 18}`),
    getOrElseEither('Invalid input')
  )
```

### Example 3: Composing Multiple Transformations

**purify-ts:**

```typescript
const processOrder = (orderId: string): string => {
  let result = Maybe.fromNullable(getOrder(orderId))
  if (result.isNothing()) return 'Order not found'

  result = result.map(o => o.items).flatMap(validateItems)
  if (result.isNothing()) return 'Invalid items'

  result = result.map(items => items.reduce((sum, i) => sum + i.price, 0))
  return `Total: ${result.getOrElse(0)}`
}
```

**elevate-ts (much cleaner):**

```typescript
import { pipe } from 'elevate-ts/Function'
import { fromNullable, map, chain, getOrElse } from 'elevate-ts/Maybe'

const processOrder = (orderId: string): string =>
  pipe(
    orderId,
    getOrder,
    fromNullable,
    map(o => o.items),
    chain(validateItems),
    map(items => items.reduce((sum, i) => sum + i.price, 0)),
    map(total => `Total: ${total}`),
    getOrElse('Invalid order')
  )
```

## When to Use elevate-ts

✅ **Use elevate-ts if you:**

- Build for Cloudflare Workers, Deno Deploy, or other runtimes without Node.js
- Love functional programming and point-free composition
- Want minimal dependencies and smaller bundles
- Prefer explicit imports and pipe-based composition
- Need modern TypeScript with strict types
- Want Fantasy Land 5 compliance
- Are starting a new project with a FP-first approach

❌ **Avoid elevate-ts if:**

- Your team strongly prefers OOP/method chaining
- You need the maturity of the purify-ts ecosystem
- You rely on specialized extensions/plugins from purify-ts
- You're existing purify-ts code that's working well

## When to Use purify-ts

✅ **Use purify-ts if you:**

- Build traditional Node.js applications
- Prefer method chaining over point-free composition
- Need mature, battle-tested code
- Want a larger ecosystem with more pre-built helpers
- Are already invested in purify-ts

❌ **Avoid purify-ts if:**

- You need to run on Cloudflare Workers (Node.js builtins cause issues)
- You're optimizing for minimal bundle size
- Your team is learning functional programming (point-free is easier to grok)

## Migration Guide: purify-ts → elevate-ts

### 1. Update Imports

```typescript
// purify-ts
import { Maybe, Just, Nothing } from 'purify-ts/Maybe'
import { Either, Left, Right } from 'purify-ts/Either'

// elevate-ts (use aliases if importing from both modules)
import { Just, Nothing, map, chain, getOrElse } from 'elevate-ts/Maybe'
import { Left, Right, chain as chainEither, map as mapEither,
  getOrElse as getOrElseEither } from 'elevate-ts/Either'
import { pipe } from 'elevate-ts/Function'
```

### 2. Convert Method Chains to Pipe

```typescript
// purify-ts
value
  .map(transform)
  .chain(validate)
  .getOrElse(defaultValue)

// elevate-ts
pipe(
  value,
  map(transform),
  chain(validate),
  getOrElse(defaultValue)
)
```

### 3. Reuse Composed Transformations

```typescript
// elevate-ts enables this naturally
const mapEmail = map((u: User) => u.email)
const validateEmail = chain(email => isValidEmail(email) ? Just(email) : Nothing)

const getValidEmail = (user: User | null) =>
  pipe(
    user,
    fromNullable,
    mapEmail,
    validateEmail,
    getOrElse('no-email')
  )
```

## Performance Characteristics

| Scenario | purify-ts | elevate-ts |
|----------|-----------|-----------|
| Bundle Size (gzipped) | ~4–6KB | ~1–2KB |
| Runtime Speed | Fast | Fast (same operations) |
| Tree-Shaking | Good | Excellent |
| Edge Runtime (Workers) | ⚠️ Problematic | ✅ Native |

Both are production-ready. Bundle size advantage goes to elevate-ts for edge/worker deployments.

## Conclusion

- **elevate-ts** is the modern choice for FP-first, edge-optimized TypeScript
- **purify-ts** remains solid for traditional Node.js with method chaining preferences
- They solve the same domain (railroad-oriented programming) with different trade-offs
- Choice depends on your runtime, team style, and bundle constraints

For new projects targeting modern runtimes, **elevate-ts** is recommended. For existing
purify-ts codebases that work well, there's no urgent need to migrate—but new features
should consider elevate-ts.
