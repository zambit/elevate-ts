# Sample: Dependency Injection with Reader Monad

## Quick Summary

Cloudflare Worker that uses the `Reader` monad to inject dependencies (KV, config, logger) once at the request boundary. All service layers access dependencies via `ask`/`asks` without threading parameters through functions. Clean, implicit dependency management.

## Why This Matters

**Problem:** Threading dependencies through every function parameter is verbose and repetitive. Workers manage multiple dependencies: KV namespaces, environment variables, loggers, API clients. Passing them everywhere is boilerplate. Global state feels wrong.

**Solution:** `Reader` monad. Capture environment once at the request boundary. All downstream functions can `ask` for dependencies implicitly. No parameter threading. Clean implicit injection without ceremony.

**Key Insight:** Reader = function that takes environment and returns value: `R => A`. Chain multiple Readers to compose functions. Inject dependencies at the boundary, access everywhere.

## Classic Use Cases

1. **Environment config** — Database URLs, API keys, feature flags set once, available everywhere
2. **KV namespace access** — Multiple namespaces available to all functions without parameter passing
3. **Service clients** — HTTP clients, SDK instances configured once, used throughout
4. **Logging context** — Request ID, user ID, tenant ID available to all logging calls
5. **Multi-tenant routing** — Tenant from request available to all downstream functions

## Architecture Pattern

```
Request
  ↓
Create AppEnv (KV, Config, Logger)
  ↓
Pass to all handlers
  ↓
Each handler creates Readers
  ↓
Readers ask for dependencies
  ↓
Reader.run(appEnv) executes with injected environment
  ↓
Response
```

**Key pattern:** Dependencies flow in once at request boundary, used implicitly throughout handlers.

## Running Locally

```bash
cd samples/worker-examples/dependency-injection

# Install dependencies
pnpm install

# Run tests with coverage
pnpm test

# Run tests in watch mode
pnpm test:watch

# Start local dev server
pnpm dev
```

## API Endpoints

### GET /users

List all users.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Alice",
      "email": "alice@example.com",
      "role": "admin",
      "createdAt": 1712345678
    }
  ],
  "timestamp": 1712345678
}
```

### GET /users/:id

Fetch a specific user and check admin status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "name": "Alice",
      "email": "alice@example.com",
      "role": "admin",
      "createdAt": 1712345678
    },
    "isAdmin": true
  },
  "timestamp": 1712345678
}
```

### POST /users

Create a new user.

**Request:**
```json
{
  "id": "new-user",
  "name": "New User",
  "email": "new@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-user",
    "name": "New User",
    "email": "new@example.com",
    "role": "user",
    "createdAt": 1712345678
  },
  "timestamp": 1712345678
}
```

## Testing

```bash
pnpm test
```

Tests cover:
- Reader environment creation and injection
- Service layer access via `ask` and `asks`
- Multiple dependency scenarios
- Reader composition and chaining
- Environment override per request
- Aim for 90%+ coverage on business logic

## Code Walkthrough

### Service Layer with Reader (`src/services.ts`)

```typescript
// Get logger from environment without parameter
export const getLogger = (): Reader<AppEnv, Logger> =>
  Reader.asks((env: AppEnv) => env.logger)

// Fetch user - logger accessible via ask
export const getUserById = (userId: string): Reader<AppEnv, User | null> =>
  Reader.Reader((env) => {
    env.logger.debug(`Fetching user: ${userId}`)
    return user
  })

// Compose multiple Reader operations
export const getUserWithContext = (userId: string): Reader<AppEnv, { user: User | null; canLog: boolean }> =>
  Reader.chain((isAdmin: boolean) => {
    return Reader.map((user: User | null) => ({
      user,
      canLog: isAdmin,
    }))(getUserById(userId))
  })(isUserAdmin(userId))
```

**Key patterns:**
- `Reader.asks` - extract part of environment
- `Reader.Reader` - wrap computation with environment access
- `Reader.chain` - compose dependent Readers
- `Reader.map` - transform result
- `.run(env)` - execute with injected environment

### Request Handler (`src/index.ts`)

```typescript
export default {
  fetch: async (request: Request, env: Env) => {
    // Create AppEnv once at request boundary
    const appEnv = createAppEnv(env)

    // Pass to handlers
    if (path === '/users') {
      return await handleGetUsers(appEnv)
    }

    // In handler: create Readers, run with appEnv
    const userReader = getUserById(id)
    const user = userReader.run(appEnv)  // Environment injected here
  }
}
```

**Separation of concerns:**
- Request boundary creates environment
- Handlers create Readers
- Readers execute with injected dependencies
- No parameter threading anywhere

## When to Use Reader

✅ Multiple dependencies needed throughout application
✅ Dependencies change per request (user context, tenant, etc.)
✅ Want to avoid parameter threading
✅ Need to compose operations that share dependencies
✅ Testing should use different dependencies per test

❌ Single simple dependency
❌ Stateful mutations needed
❌ Performance-critical code needing maximum inlining

## Reader vs Other Patterns

**Reader vs Dependency Injection Frameworks:**
- More lightweight
- Type-safe
- Pure function composition
- Clear dependency flow

**Reader vs Global State:**
- Type-safe
- Testable (different env per test)
- Explicit dependencies
- No hidden side effects

**Reader vs Threading Parameters:**
- Less boilerplate
- Cleaner function signatures
- Natural composition
- Easy to extend

## Deployment to Cloudflare

1. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create users_storage
   ```

2. **Update wrangler.toml** with namespace IDs

3. **Deploy:**
   ```bash
   pnpm deploy
   ```

## Further Reading

- [Reader Monad — Haskell Wiki](https://wiki.haskell.org/Reader_monad)
- [Dependency Injection Patterns](https://en.wikipedia.org/wiki/Dependency_injection)
- [Cloudflare Workers Environment](https://developers.cloudflare.com/workers/platform/environment-variables/)
- [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land)
