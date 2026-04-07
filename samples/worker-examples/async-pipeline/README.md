# Sample: Async Pipeline with EitherAsync + Error Handling

## Quick Summary

Cloudflare Worker that chains sequential operations (token validation → permission checks → request validation → processing → persistence) using `EitherAsync`. Demonstrates clean error handling without exceptions and composable error propagation through the pipeline.

## Why This Matters

**Problem:** Sequential operations with error handling scatter logic across try-catch blocks. One failure stops everything, but handling is fragmented. Hard to compose steps or reason about error paths.

**Solution:** `EitherAsync` chains operations declaratively. Errors become `Left<ApiError>`. Never throws or rejects. Each step naturally composes with the next. Error channel is explicit and type-safe. Perfect for request validation pipelines, middleware chains, and multi-step processing.

**Key Insight:** `EitherAsync` = lazy async Either: operations run in sequence, errors propagate automatically. Same error type flows through the chain. Add/remove steps without changing error handling.

## Classic Use Cases

1. **Authentication pipeline** — Validate token → fetch user → check permissions → grant access
2. **Data processing** — Parse input → validate schema → transform → store → respond
3. **External API chains** — Call service A → call service B → aggregate results
4. **Webhook handlers** — Verify signature → decode payload → validate structure → process
5. **File uploads** — Parse → validate → scan virus → compress → store → return URL

## Architecture Pattern

```
Request → Extract Token → Validate → Check Permissions → Process → Persist → Response
          (EitherAsync)  (Either)    (EitherAsync)     (EitherAsync)
               ↓ Left                      ↓ Left            ↓ Left
            Error Response             Error Response   Error Response
```

## Running Locally

```bash
cd samples/worker-examples/async-pipeline

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

### POST /documents

Process a document through the error-handling pipeline.

**Headers:**
```
Authorization: Bearer <valid-token>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Document Title",
  "content": "Document content here",
  "userId": "user-123"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "doc-1712345678000",
    "title": "Document Title",
    "content": "Document content here",
    "userId": "user-123",
    "wordCount": 4,
    "createdAt": 1712345678000,
    "updatedAt": 1712345678000
  }
}
```

**Response (Error - 400/401/403):**
```json
{
  "success": false,
  "error": {
    "type": "unauthorized",
    "message": "Invalid token format"
  }
}
```

### GET /documents/:id

Retrieve a processed document.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "doc-1712345678000",
    "title": "Document Title",
    ...
  }
}
```

## Error Types

Each error in the pipeline is typed:

```typescript
type ApiError =
  | { type: 'invalid_input'; message: string }
  | { type: 'unauthorized'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'internal_error'; message: string }
  | { type: 'external_service_error'; message: string }
```

## Testing

```bash
pnpm test
```

Tests cover:
- Token validation (valid/invalid Bearer tokens)
- Permission checking (admin, user, viewer roles)
- Request validation (empty fields, length constraints)
- Full pipeline success and error paths
- Error propagation and type safety
- Sequential chaining of operations
- Aim for 90%+ coverage on business logic

## Code Walkthrough

### Pipeline Composition (`src/pipeline-logic.ts`)

```typescript
export const processingPipeline = (
  token: string,
  request: DocumentRequest,
  shouldFailPersist: boolean = false
): EitherAsync<ApiError, ProcessedDocument> => ({
  tag: 'EitherAsync',
  run: async () => {
    // Step 1: Validate token
    const tokenResult = await validateToken(token).run()
    if (tokenResult.tag === 'Left') return tokenResult

    // Step 2: Check permissions
    const auth = tokenResult.right
    const permResult = await checkPermissions(auth).run()
    if (permResult.tag === 'Left') return permResult

    // Step 3-5: Validate, process, persist...
    // Each step stops on error (Left)
  }
})
```

**Key patterns:**
- Each `EitherAsync` operation returns `Promise<Either<ApiError, T>>`
- `.run()` executes the lazy computation
- Errors (`Left`) propagate automatically
- No exceptions, no thrown errors
- Type-safe error channel

### Worker Handler (`src/index.ts`)

```typescript
async function handleProcessDocument(request: Request, env: Env): Promise<Response> {
  const token = getToken(request)
  const body = await parseJson<DocumentRequest>(request)

  // Run the pipeline
  const result = await processingPipeline(token, body).run()

  // Pattern: dispatch on Left/Right
  if (result.tag === 'Right') {
    return successResponse(result.right, 201)
  } else {
    const status = statusMap[result.left.type] || 500
    return errorResponse(result.left.type, result.left.message, status)
  }
}
```

**Separation of concerns:**
- HTTP parsing → pipeline execution → response dispatch
- Pipeline is pure (no HTTP, no KV inside the chain)
- Error handling is declarative (map types to status codes)

## When to Use EitherAsync

✅ Sequential operations with potential errors
✅ Operations that depend on previous results
✅ Composable error handling (not all-or-nothing)
✅ Type-safe error channels
✅ No exceptions desired (functional error handling)

❌ Single operation with simple success/failure
❌ Unrelated parallel operations (use `Promise.all`)
❌ Error recovery/retry logic (use either/tryCatch + custom logic)

## Deployment to Cloudflare

1. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create documents_storage
   ```

2. **Update wrangler.toml** with namespace IDs

3. **Deploy:**
   ```bash
   pnpm deploy
   ```

## Further Reading

- [EitherAsync — Error Handling Without Exceptions](https://github.com/type-ts/elevate-ts)
- [Functional Error Handling in Rust/Haskell](https://www.rust-lang.org/en-US/error-handling/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land)
