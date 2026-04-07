# Sample: Stateful API with State Monad + KV

## Quick Summary

Cloudflare Worker API that maintains a counter in KV storage using pure State monad operations. Demonstrates separation of pure state logic from KV persistence.

## Why This Matters

**Problem:** KV-backed APIs mix concerns: fetch state from storage, apply mutations, persist results. State changes scattered across handlers. Easy to corrupt state with accidental mutations. Hard to test mutations without hitting KV.

**Solution:** State monad for pure state transformations. Run pure state operations independently of KV. Test state logic without storage. Pattern: fetch from KV → run State → persist results. Clean separation of concerns.

**Key Insight:** State monad = pure function that returns `[newState, value]`. KV is just the storage layer. Same state logic works anywhere: tests, edge, workers, etc.

## Architecture Pattern

```
Request → Load State from KV → Run State Operation → Save to KV → Response
           (JSON)               (Pure Function)        (JSON)
```

This pattern separates:
- **Pure Logic** (`state-logic.ts`) — zero dependencies, 100% testable
- **Persistence** (`index.ts`) — KV reads/writes, HTTP handlers
- **Tests** — No KV needed, test state logic in isolation

## Running Locally

```bash
cd samples/worker-examples/stateful-api

# Install dependencies
pnpm install

# Run tests with coverage
pnpm test

# Run tests in watch mode
pnpm test:watch

# Start local dev server (requires Cloudflare account)
pnpm dev
```

## API Endpoints

### GET /counter
Get current counter value and metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "value": 42,
    "timestamp": 1712345678,
    "increments": 5
  }
}
```

### POST /counter/increment
Increment counter by amount (default 1).

**Request:**
```json
{
  "amount": 5
}
```

### POST /counter/decrement
Decrement counter by amount (default 1).

**Request:**
```json
{
  "amount": 3
}
```

### POST /counter/reset
Reset counter to 0.

### POST /counter/set
Set counter to specific value.

**Request:**
```json
{
  "value": 100
}
```

## Testing

```bash
pnpm test
```

Tests cover:
- Increment/decrement operations
- Reset functionality
- State operations without side effects
- Sequential chained operations
- KV storage patterns (no actual KV calls in tests)

Aim for 100% coverage on `state-logic.ts`.

## Code Walkthrough

### Pure State Operations (`src/state-logic.ts`)

```typescript
export const increment = (amount: number): State<CounterState, CounterState> =>
  State.State((state) => {
    const newState: CounterState = {
      value: state.value + amount,
      timestamp: Date.now(),
      increments: state.increments + 1
    }
    return [newState, newState]
  })
```

**Key patterns:**
- Pure function: takes state, returns `[newState, result]`
- No side effects: no KV calls, no HTTP, no logging
- Composable: can chain State operations
- Testable: run with any input state, verify output

### Worker Handler (`src/index.ts`)

```typescript
async function handleIncrement(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<{ amount: number }>(request)
  const state = await loadState(env.COUNTER_KV)  // Fetch from KV
  const [newState] = increment(body.amount).run(state)  // Pure logic
  await saveState(env.COUNTER_KV, newState)  // Persist to KV
  return successResponse(newState)
}
```

**Separation of concerns:**
- HTTP parsing → pure logic → KV persistence → response
- Each step is independent and testable
- Pure logic (State operation) is the centerpiece

## Deployment to Cloudflare

1. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create counter_storage
   ```

2. **Update wrangler.toml** with namespace IDs

3. **Deploy:**
   ```bash
   pnpm deploy
   ```

## Further Reading

- [State Monad — Haskell Wiki](https://wiki.haskell.org/State_monad)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [elevate-ts State docs](../../README.md#state)
- [Pure functions + persistence](https://martinfowler.com/articles/functional-architecture.html)
