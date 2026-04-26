# HTTP Module: CloudFlare Workers & Web Fetch API

## Why HTTP Module?

Building HTTP handlers in CloudFlare Workers typically involves manual boilerplate:

```typescript
// Without HTTP module: lots of repetition
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const body = request.body ? JSON.parse(await request.text()) : null;
      const dbUrl = env.DATABASE_URL;
      if (!dbUrl) {
        return new Response(JSON.stringify({ error: 'Missing DATABASE_URL' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // ... now process the request, handle errors, map to status codes
      const result = await processOrder(body, dbUrl);
      if (result.tag === 'Left') {
        const status = result.left === 'not-found' ? 404 : result.left === 'unauthorized' ? 401 : 500;
        return new Response(JSON.stringify({ error: result.left }), {
          status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(result.right), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

**The HTTP module eliminates this boilerplate.** It provides:

- **Safe JSON parsing** — Parse request bodies with `Either`, no try/catch needed
- **Environment variable access** — Use `Reader` to inject env bindings; missing vars become errors, not runtime surprises
- **Automatic error handling** — Wrap `Either`/`EitherAsync` handlers; errors are automatically mapped to HTTP responses
- **Status code mapping** — Domain errors (like `'not-found'`) map to status codes (404) declaratively
- **Railway-oriented HTTP** — Keep success and error paths separated and composable

No other TypeScript FP library provides this level of HTTP-first integration. **HTTP is built in because we believe Web API handlers are a first-class use case** for functional programming, not an
afterthought.

---

## When to Use HTTP Module

[YES] **Good use cases:**

- **CloudFlare Workers** — Direct handler wrapping with env access
- **Deno Deploy** — Works identically; no Node.js dependencies
- **Node.js HTTP servers** — Using Web Fetch API polyfills (Node 18+)
- **Any Web Fetch API runtime** — Browsers, service workers, edge compute platforms

[YES] **AWS Lambda & Serverless Platforms:**

The HTTP module handles your business logic. A separate `@zambit/elevate-ts/Serverless` module (coming soon) will handle platform-specific event/response conversion:

```typescript
// Your pure handler (uses HTTP module)
const handler = HTTP.handleEitherAsync(onError, onSuccess)(processOrder);

// Platform adapter (uses Serverless module when available)
export const main: APIGatewayProxyHandlerV2 = async (event) => {
  const request = Serverless.fromAPIGatewayV2(event);
  const response = await handler(request);
  return Serverless.toAPIGatewayV2Response(response);
};
```

[NO] **When NOT to use HTTP module:**

- You're using Express/Fastify — those have their own middleware and error handling patterns
- Your handler needs complex streaming — stick to lower-level `Response` APIs
- You prefer imperative try/catch error handling — not forbidden, but Either/Reader are cleaner

---

## Example 1: Simple Handler

Wrap a basic request → response handler. Automatic JSON response with proper headers.

```typescript
import { HTTP, Either, Function } from '@zambit/elevate-ts';

// Domain error type
type OrderError = 'invalid-input' | 'out-of-stock';

// Handler: parse JSON, validate, return order
const processOrder = (raw: string | null): Either.Either<OrderError, { id: string }> =>
  HTTP.parseJSON<{ item: string }>(raw)
    .mapLeft(() => 'invalid-input')
    .chain((body) => (body.item ? Either.Right({ id: crypto.randomUUID() }) : Either.Left('invalid-input')));

// Wrap handler: Either → HTTP Response
const handler = HTTP.handleEither(
  (err) => HTTP.jsonResponse(err === 'invalid-input' ? 400 : 500)({ error: err }),
  (order) => HTTP.jsonResponse(201)(order)
)(processOrder);

// CloudFlare Worker
export default {
  async fetch(request: Request): Promise<Response> {
    const body = await request.text();
    return handler(body);
  }
};
```

**Why this is better:**

- No manual JSON serialization or Content-Type headers
- No if/else chains for status codes
- Handler function is pure (testable without mocking Request/Response)
- Error path is explicit and separate

---

## Example 2: Async with Environment Variables

Use `Reader` to inject environment secrets. Map domain errors to status codes.

```typescript
import { HTTP, EitherAsync, Reader, Function } from '@zambit/elevate-ts';

type OrderError = 'invalid-input' | 'unauthorized' | 'db-error' | 'not-found';

// Environment shape
type Env = {
  DATABASE_URL?: string;
  API_KEY?: string;
};

// Helper: lift env var access to Reader
const getDbUrl = (): Reader.Reader<Env, EitherAsync.EitherAsync<OrderError, string>> =>
  Reader.asks((env) => HTTP.requireEnv('DATABASE_URL').fold((errMsg) => EitherAsync.left('db-error'), EitherAsync.right)(env));

// Handler: parse JSON, validate auth, fetch from DB
const processOrder = (request: Request): EitherAsync.EitherAsync<OrderError, { id: string; total: number }> =>
  EitherAsync.tryCatch(
    async () => {
      const raw = await request.text();
      const body = HTTP.parseJSON<{ item: string }>(raw).getOrElseL(() => 'invalid-input');

      // In a real scenario, you'd check request.headers.get('Authorization')
      // and use requireEnv('API_KEY') to validate
      return { id: crypto.randomUUID(), total: 100 };
    },
    () => 'db-error'
  );

// Status code mapper
const statusMap = HTTP.withStatusCode<OrderError>({
  'invalid-input': 400,
  unauthorized: 401,
  'not-found': 404,
  default: 500
});

// Wrap handler: EitherAsync → Promise<Response>
const handler = HTTP.handleEitherAsync(
  (err) => HTTP.jsonResponse(statusMap(err))({ error: err }),
  (order) => HTTP.jsonResponse(201)(order)
)(processOrder);

// CloudFlare Worker with env binding
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handler(request);
  }
};
```

**Why this is better:**

- Environment access is declarative (via `Reader`, not closures)
- Missing env vars produce clear errors, not runtime surprises
- Status codes map domain errors declaratively, no if/else chains
- Async operations are wrapped in `EitherAsync`, never throw

---

## Example 3: Complex Pipeline with Composition

Combine multiple `Reader`s and `EitherAsync` operations. Chain request parsing → auth → DB validation → response.

```typescript
import { HTTP, EitherAsync, Reader, Either, Function } from '@zambit/elevate-ts';

type Env = {
  DATABASE_URL?: string;
  API_KEY?: string;
  ALLOWED_ORIGINS?: string;
};

type OrderError = 'invalid-json' | 'missing-auth' | 'invalid-auth' | 'not-found' | 'db-error';

type Order = {
  id: string;
  userId: string;
  item: string;
  total: number;
};

// Step 1: Extract and validate auth header
const validateAuth = (request: Request): Reader.Reader<Env, EitherAsync.EitherAsync<OrderError, string>> =>
  Reader.asks((env) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    return token && token === env.API_KEY ? EitherAsync.right(token) : EitherAsync.left('invalid-auth');
  });

// Step 2: Parse request body
const parseOrderInput = (request: Request): EitherAsync.EitherAsync<OrderError, { userId: string; item: string }> =>
  EitherAsync.tryCatch(
    async () => {
      const raw = await request.text();
      return HTTP.parseJSON<{ userId: string; item: string }>(raw).getOrElseL(() => ({ userId: '', item: '' })); // Will validate below
    },
    () => 'invalid-json'
  ).chain((body) => (body.userId && body.item ? EitherAsync.right(body) : EitherAsync.left('invalid-json')));

// Step 3: Query database
const fetchUser = (userId: string): EitherAsync.EitherAsync<OrderError, { id: string; name: string }> =>
  EitherAsync.tryCatch(
    () => Promise.resolve({ id: userId, name: 'Alice' }), // Simulated DB call
    () => 'db-error'
  );

// Step 4: Create order
const createOrder = (userId: string, item: string): EitherAsync.EitherAsync<OrderError, Order> =>
  fetchUser(userId).chain((user) =>
    EitherAsync.right({
      id: crypto.randomUUID(),
      userId: user.id,
      item,
      total: 99.99
    })
  );

// Step 5: Compose pipeline
const handler = (request: Request): Reader.Reader<Env, EitherAsync.EitherAsync<OrderError, Response>> =>
  Reader.asks((env) => {
    // Run auth validation in the env context
    const auth = validateAuth(request)(env);

    // Parse input independently
    const input = parseOrderInput(request);

    // Chain: auth → input → createOrder → response
    return auth
      .chain(() => input.chain((body) => createOrder(body.userId, body.item)))
      .map((order) => HTTP.jsonResponse(201)(order))
      .mapLeft((err) => {
        const statusMap = HTTP.withStatusCode<OrderError>({
          'invalid-json': 400,
          'missing-auth': 401,
          'invalid-auth': 401,
          'not-found': 404,
          default: 500
        });
        return HTTP.jsonResponse(statusMap(err))({ error: err });
      });
  });

// CloudFlare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pipeline = handler(request)(env); // Inject env, run pipeline
    return pipeline.getOrElseL((errResponse) => errResponse); // Extract response
  }
};
```

**Why this is better:**

- **No nested try/catch** — Error handling is explicit and composable
- **Environment is injected** — `Reader` makes dependencies clear
- **Separation of concerns** — Auth, parsing, DB, response are separate functions
- **Type-safe error mapping** — Status code mapper is keyed on `OrderError` type
- **Testable** — Each step is a pure function; mock env and requests easily
- **Scalable** — Add new validation steps by chaining with `.chain()`

---

## Common Patterns

### Create a Reusable Auth Middleware

```typescript
const withAuth =
  (apiKey: string) =>
  (handler: (req: Request) => EitherAsync.EitherAsync<OrderError, Response>): ((req: Request) => EitherAsync.EitherAsync<OrderError, Response>) =>
  (req: Request) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    return token === apiKey ? handler(req) : EitherAsync.left('unauthorized');
  };

const protected = withAuth(env.API_KEY)(handler);
```

### Handle Multiple Error Types

```typescript
type NetworkError = 'timeout' | 'no-connection';
type ValidationError = 'invalid-input' | 'out-of-range';

type AppError = NetworkError | ValidationError;

const statusFor = HTTP.withStatusCode<AppError>({
  timeout: 504,
  'no-connection': 503,
  'invalid-input': 400,
  'out-of-range': 422,
  default: 500
});
```

### Return Custom Response Headers

```typescript
const handler = HTTP.handleEitherAsync(
  (err) => HTTP.jsonResponse(statusMap(err))({ error: err }),
  (order) => {
    const response = HTTP.jsonResponse(201)(order);
    response.headers.set('X-Order-ID', order.id);
    response.headers.set('Cache-Control', 'no-cache');
    return response;
  }
)(processOrder);
```

### Validate JWT Bearer Token

```typescript
type JWTError = 'missing-auth' | 'invalid-token' | 'expired-token' | 'invalid-signature';

type JWTPayload = {
  readonly exp: number;
  readonly nbf: number;
  readonly iat: number;
  readonly aud: string;
  readonly iss: string;
};

// Extract and decode JWT (no signature validation)
const decodeJWT = (token: string): Either<JWTError, JWTPayload> => {
  const parts = token.split('.');
  if (parts.length !== 3) return Either.left('invalid-token');

  try {
    const payload = JSON.parse(atob(parts[1]));
    return Either.right(payload);
  } catch {
    return Either.left('invalid-token');
  }
};

// Validate JWT claims
const validateJWTClaims = (token: JWTPayload): Either<JWTError, JWTPayload> => {
  const now = Math.floor(Date.now() / 1000);
  if (now < token.nbf) return Either.left('invalid-token');
  if (now > token.exp) return Either.left('expired-token');
  return Either.right(token);
};

// Extract bearer token from Authorization header
const extractBearer = (req: Request): Either<JWTError, string> => {
  const auth = req.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/);
  return match ? Either.right(match[1]) : Either.left('missing-auth');
};

// Compose JWT validation
const validateBearer = (req: Request): Either<JWTError, JWTPayload> => extractBearer(req).chain(decodeJWT).chain(validateJWTClaims);

// Optionally add signature validation (requires secret)
const validateSignature =
  (secret: string) =>
  (token: JWTPayload, signature: string): Either<JWTError, JWTPayload> => {
    // Use crypto.subtle.verify or your preferred JWT library
    // Returns Either.right(token) if valid, Either.left('invalid-signature') otherwise
    return Either.right(token);
  };

// Use in handler
const handler = HTTP.handleEitherAsync(
  (err) => HTTP.jsonResponse(err === 'missing-auth' ? 401 : 403)({ error: err }),
  (order) => HTTP.jsonResponse(201)(order)
)((req: Request): EitherAsync<JWTError, Order> => EitherAsync.liftEither(validateBearer(req)).chain(() => processOrder(req)));
```

---

## Summary

The HTTP module brings functional programming idioms directly into request handling:

- **No boilerplate** — JSON parsing, status codes, headers are automatic
- **Type-safe errors** — Domain errors map to HTTP status codes via `withStatusCode`
- **Environment injection** — `Reader` makes dependencies explicit
- **Composable** — Build complex handlers by chaining `Either`/`EitherAsync`
- **Never throws** — All errors are captured as `Left`; no surprise exceptions
- **Testable** — Handlers are pure functions; mock env and requests trivially

Use the HTTP module whenever you're building request handlers in any Web Fetch API runtime.
