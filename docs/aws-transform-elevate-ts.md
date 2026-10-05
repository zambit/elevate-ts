# AWS Transform Custom for Zambit's elevate-ts Codebase

AWS Transform Custom is an agentic AI service for **code and application modernization**. For Zambit, the value is that your codebase has a very specific, consistent set of patterns that Transform
Custom can learn and enforce across the entire repo — you teach it the "before → after" shape once, then run it at scale.

## The Transforms That Make Sense

### 1. `try/catch` → `EitherAsync`

This is the highest-value transformation. You'd give Transform Custom examples like:

```typescript
// BEFORE (source pattern)
const fetchUser = async (id: string) => {
  try {
    const res = await fetch(`/api/users/${id}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};
```

```typescript
// AFTER (target pattern)
const fetchUser = (id: string): EitherAsync<AppError, User> =>
  EitherAsync(async ({ liftEither }) => {
    const res = await fetch(`/api/users/${id}`);
    const body = await res.json();
    return liftEither(res.ok ? Right(body) : Left({ tag: 'FetchFailed', id }));
  });
```

### 2. Zod/valibot → elevate-ts `Schema`

```typescript
// BEFORE
const UserSchema = z.object({ id: z.string(), name: z.string() });
type User = z.infer<typeof UserSchema>;
```

```typescript
// AFTER
const UserSchema = object({ id: string, name: string });
type User = InferOutput<typeof UserSchema>;
```

### 3. Imperative mutation → `State` monad dispatch

```typescript
// BEFORE
items.push(newItem);
items = items.filter((x) => x.id !== id);
```

```typescript
// AFTER
const addItem = (item: Item) => modify<ItemState>((s) => ({ ...s, items: [...s.items, item] }));
const removeItem = (id: string) => modify<ItemState>((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) }));
```

### 4. Implicit `Left` strings → typed error unions

```typescript
// BEFORE
return Left('something went wrong');
return Left(`User ${id} not found`);
```

```typescript
// AFTER
return Left({ tag: 'UnknownError' } as const);
return Left({ tag: 'NotFound', id } as const);
```

## How You'd Set It Up

AWS Transform Custom is CLI-driven. You'd define a transformation by pointing it at your before/after examples and docs:

```bash
aws transform custom create \
  --name "elevate-ts-migration" \
  --source-pattern "./examples/before/*.ts" \
  --target-pattern "./examples/after/*.ts" \
  --docs "https://your-wiki/elevate-ts-guide"
```

Then run it across the whole portfolio:

```bash
aws transform custom run \
  --transformation elevate-ts-migration \
  --target-repo "github.com/zambit/your-repo" \
  --output-branch "transform/elevate-ts"
```

## Why Your Codebase Is a Good Fit

The skill's strict constraints are exactly what Transform Custom needs — consistent, learnable patterns:

- The `pipe(raw, parseUser, mapE(normalise))` shape is repetitive enough to learn
- The data-last curry signature `(config) => (data) => result` is a clear structural pattern
- The `≤15 lines per function` rule means functions are small enough for the agent to reason about cleanly
- The "no `try/catch`, no mutation, no classes" rules give Transform clear negative examples too

## Watch Out: `Validation` vs `Either`

The trickiest part is the `Validation` vs `Either` distinction. You'd want to give Transform Custom explicit examples of both so it picks the right monad:

- **Form validation** — accumulates all errors → use `Validation`
- **Pipeline steps** — short-circuits on first error → use `Either`
