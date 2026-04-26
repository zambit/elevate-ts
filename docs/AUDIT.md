# Audit Subsystem: Operation Tracking with Time-Travel Replay

## Why Audit?

Most functional programming libraries for TypeScript focus on _how to structure computations_ (Either, Maybe, State). The **Audit module** is different — it's about _seeing what happened_.

Audit tracks every operation in your pipeline, capturing inputs and outputs at each step. You can then:

- **Replay** the entire execution to debug a single failed request
- **Filter** by operation name or monad type to focus on what matters
- **Access** values at any point in the past without re-running code
- **Serialize** the log for production observability, testing, or compliance audits

No other TypeScript FP library includes this. It's baked into elevate-ts because we believe **observability is a first-class concern**, not an afterthought.

---

## When to Use Audit

[YES] **Good use cases:**

- **Request debugging** — A user reports "my upload failed". Replay the audit log to see exactly where it broke.
- **Testing edge cases** — Assert that your pipeline attempted the right operations in the right order with the right data.
- **Observability in production** — Send audit logs to your observability stack; trace a request through its complete lifecycle.
- **Time-travel debugging** — Answer "what was the state at step 3?" without re-running the entire pipeline.

[NO] **When NOT to use Audit:**

- You don't care about inspecting the execution history.
- Your operations have sensitive data that shouldn't be logged (disable Audit or disable `captureInputs`/`captureOutputs`).

---

## Example 1: Simple Tracking

Create a session, track a pure pipeline, read the log.

```typescript
import * as Audit from '@zambit/elevate-ts/Audit';
import * as Maybe from '@zambit/elevate-ts/Maybe';

// Create an enabled session (disabled by default — zero cost when off)
const session = Audit.withEnabled(true)(Audit.createSession());

// A simple pure function — parse a string to a positive number
const parseId = (raw: string): Maybe.Maybe<number> => Maybe.fromPredicate((n: number) => !isNaN(n) && n > 0)(Number(raw));

// Track the first operation: a valid input
const [result1, s1] = Audit.track('parseId')(
  // operation name
  'Maybe'
)(
  // monad type
  parseId
)(
  // the function
  '42'
)(
  // the input
  session
); // current session

// Track the second operation: an invalid input (same session from before)
const [result2, s2] = Audit.track('parseId')('Maybe')(parseId)('bad')(s1);

// Inspect the log
const entries = Audit.getEntries(Audit.getLog(s2));

// entries[0]
//   .operation === 'parseId'
//   .input === '42'
//   .output === Just(42)
//   .timestamp === Date.now() at the moment track() was called
//
// entries[1]
//   .operation === 'parseId'
//   .input === 'bad'
//   .output === Nothing
```

---

## Example 2: Async with Error Handling

Track a fetch operation and see both success and failure paths in the log.

```typescript
import * as Audit from '@zambit/elevate-ts/Audit';
import * as EA from '@zambit/elevate-ts/EitherAsync';

type User = { id: number; name: string };

/**
 * Fetches a user from the API; network errors become Left.
 * @param userId - The user ID to fetch
 */
const fetchUser = (userId: number): EA.EitherAsync<string, User> =>
  EA.tryCatch(
    () => fetch(`/api/users/${userId}`).then((r) => r.json() as Promise<User>),
    (e) => `fetch failed: ${String(e)}`
  );

const session = Audit.withEnabled(true)(Audit.createSession());
const userId = 1;

// Audit.track returns [output, updatedSession] — pure, no mutation
const [asyncOp, s1] = Audit.track('fetchUser')(
  // label for this step in the audit log
  'EitherAsync'
)(
  // monad type tag — used for filtering later
  fetchUser
)(
  // the function being tracked
  userId
)(
  // the input (recorded if captureInputs is true)
  session
);

// asyncOp is the EitherAsync returned by fetchUser(userId)
// The log already has a 'fetchUser' entry with input=1
const result = await asyncOp.run();

// Record the resolved value so the log captures what came back from the network
const s2 = Audit.record('fetchUser.resolved')(
  // separate from dispatch for clarity
  'EitherAsync'
)(userId)(
  // same input for traceability
  result
)(
  // Right(User) or Left('fetch failed: ...')
  s1
);

// On success: result === Right({ id: 1, name: 'Alice' })
// On error:   result === Left('fetch failed: ...')
// The log has two entries and you can replay exactly what happened
```

---

## Example 3: Multi-Step Pipeline with State

Thread an AuditSession through a complete workflow: validate input, fetch from API, save the result. Full type documentation so the code is self-teaching.

```typescript
import * as Audit from '@zambit/elevate-ts/Audit';
import * as S from '@zambit/elevate-ts/State';
import * as EA from '@zambit/elevate-ts/EitherAsync';
import * as Either from '@zambit/elevate-ts/Either';

/** A user record returned by the API. */
type User = { id: number; name: string };

/** Confirmation that a user was saved, including a server timestamp. */
type SavedRecord = { userId: number; savedAt: number };

/**
 * Validates a raw string as a positive integer user ID.
 * @param raw - The unvalidated string from user input or a request parameter.
 * @returns Right(id) when valid; Left('invalid id') when NaN or non-positive.
 */
const validateId = (raw: string): Either.Either<string, number> =>
  Either.fromPredicate(
    (n: number) => !isNaN(n) && n > 0,
    () => 'invalid id'
  )(Number(raw));

/**
 * Fetches a user by ID from the remote API.
 * Network errors are caught and collapsed into Left(errorMessage).
 * The returned promise never rejects.
 *
 * @param id - A validated positive user ID.
 * @returns EitherAsync resolving to Right(User) or Left(string).
 */
const fetchUser = (id: number): EA.EitherAsync<string, User> =>
  EA.tryCatch(
    () => fetch(`/api/users/${id}`).then((r) => r.json() as Promise<User>),
    (e) => `fetchUser failed: ${String(e)}`
  );

/**
 * Persists a user record via POST.
 * @param user - The user object to persist.
 * @returns EitherAsync resolving to Right(SavedRecord) or Left(string).
 */
const saveUser = (user: User): EA.EitherAsync<string, SavedRecord> =>
  EA.tryCatch(
    () => fetch('/api/records', { method: 'POST', body: JSON.stringify(user) }).then((r) => r.json() as Promise<SavedRecord>),
    (e) => `saveUser failed: ${String(e)}`
  );

/**
 * Builds a fully-audited pipeline: validate, fetch, save.
 *
 * The AuditSession is the State monad's state. Audit.track returns
 * [output, updatedSession] — exactly the shape State.run expects.
 * This lets us lift each tracked step into State with no adaptor code.
 *
 * Execution is lazy: nothing runs until S.runState is called.
 *
 * @param raw - The unvalidated user ID string (e.g. from a request param).
 * @returns A State computation that runs with an AuditSession and produces
 *          [EitherAsync<string, SavedRecord>, AuditSession].
 */
const pipeline = (raw: string): S.State<Audit.AuditSession, EA.EitherAsync<string, SavedRecord>> =>
  // Step 3 — save the fetched user
  S.chain((fetchResult: EA.EitherAsync<string, User>) =>
    S.State(
      Audit.track('saveUser')(
        // operation name
        'EitherAsync'
      )(
        // monad type tag
        // Chain saveUser; if fetchResult is Left, EA.chain short-circuits
        (ea: EA.EitherAsync<string, User>) => EA.chain(saveUser)(ea)
      )(fetchResult)
      // session threaded implicitly by State.chain
    )
  )(
    // Step 2 — fetch the user
    S.chain((validated: Either.Either<string, number>) =>
      S.State(
        Audit.track('fetchUser')('EitherAsync')(
          // Convert sync Either to async Either, then fetch.
          // Either.fold(EA.left, fetchUser) means:
          //   Left(e)  -> EA.left(e)      — propagate validation error without fetching
          //   Right(id) -> fetchUser(id)  — proceed with the network call
          (v: Either.Either<string, number>) => Either.fold(EA.left, fetchUser)(v)
        )(validated)
      )
    )(
      // Step 1 — validate the raw input string
      S.State(
        Audit.track('validateId')('Either')(validateId)(raw)
        // session injected here by S.runState below
      )
    )
  );

// Create an enabled session (disabled by default — zero cost when off)
const session = Audit.withEnabled(true)(Audit.createSession());

// Run the pipeline: State.runState(initialState)(computation)
// Returns [finalValue, finalState] — pure, no mutation
const [asyncResult, finalSession] = S.runState(session)(pipeline('42'));

// asyncResult is still lazy; nothing has hit the network yet
const result = await asyncResult.run();
// result === Right(SavedRecord) on full success
// result === Left('fetchUser failed: ...') if the fetch threw
// result === Left('invalid id') if '42' had been 'bad'

// --- Time-travel replay ---
const log = Audit.getLog(finalSession);

Audit.replay(log).forEach((entry, index) => {
  // entry.operation: 'validateId' | 'fetchUser' | 'saveUser'
  // entry.input:     the value passed in
  // entry.output:    the value returned (Either, EitherAsync, or SavedRecord)
  // entry.timestamp: Date.now() at the moment track() was called
  console.log(`[${index}] ${entry.operation}`, entry.input, '→', entry.output);
});

// --- Filtering ---
// Narrow the log to only the async steps (network layer)
const asyncLog = Audit.filterByMonadType('EitherAsync')(log);
const asyncEntries = Audit.getEntries(asyncLog);
// asyncEntries contains only 'fetchUser' and 'saveUser'

// Point-in-time access — get exactly what was passed into step 2
const fetchInput = Audit.inputAt(1)(log);
// fetchInput === Just(Right(42)) — the validated Either that fetchUser received
```

---

## Time-Travel Replay

Once an audit log is recorded, you can inspect any point in the execution without re-running the pipeline.

```typescript
const log = Audit.getLog(session);

// Get all entries in order
const entries = Audit.getEntries(log);

// Get the entry at a specific index
Audit.entryAt(0)(log); // => Just(entry) or Nothing if index is out of bounds

// Get the input to a specific step (the value before the operation ran)
Audit.inputAt(2)(log); // => Just(inputValue) or Nothing

// Get the output from a specific step (the value returned)
Audit.outputAt(1)(log); // => Just(outputValue) or Nothing

// Replay the entire log
Audit.replay(log).forEach((entry) => {
  console.log(`${entry.operation}: ${entry.input} → ${entry.output}`);
});
```

---

## Filtering

Narrow a large audit log to the steps you care about.

```typescript
const log = Audit.getLog(session);

// Keep only entries for a specific operation name
const validateSteps = Audit.filterByOperation('validateId')(log);

// Keep only entries for a specific monad type (Either, Maybe, EitherAsync, etc.)
const asyncSteps = Audit.filterByMonadType('EitherAsync')(log);

// Combine filters by filtering a filtered log
const validationErrors = Audit.filterByMonadType('Either')(Audit.filterByOperation('validateId')(log));

// Read the entries from a filtered log
Audit.getEntries(asyncSteps).forEach((entry) => {
  console.log(`${entry.operation}: ${entry.output}`);
});
```

---

## Configuration Reference

Create a session with custom configuration:

```typescript
import * as Audit from '@zambit/elevate-ts/Audit';

// Default: disabled, zero cost
const disabled = Audit.createSession();
// { enabled: false, captureInputs: true, captureOutputs: true, generateId: () => crypto.randomUUID() }

// Enable tracking
const enabled = Audit.withEnabled(true)(Audit.createSession());

// Start with all options
const custom = Audit.createSession({
  enabled: true,
  captureInputs: false, // Don't log input values (privacy, performance)
  captureOutputs: true, // Do log output values
  generateId: customIdFn // Custom ID generator (see below)
});

// Modify an existing session
Audit.withCaptureInputs(false)(session);
Audit.withCaptureOutputs(false)(session);
Audit.withGenerateId(customId)(session);
```

### Configuration Options

| Option           | Type           | Default               | Description                                             |
| ---------------- | -------------- | --------------------- | ------------------------------------------------------- |
| `enabled`        | boolean        | `false`               | Enable recording. Disabled sessions have zero overhead. |
| `captureInputs`  | boolean        | `true`                | Include input values in audit entries.                  |
| `captureOutputs` | boolean        | `true`                | Include output values in audit entries.                 |
| `generateId`     | `() => string` | `crypto.randomUUID()` | Function to generate IDs for entries.                   |

---

## Custom ID Generation for Distributed Systems

By default, Audit uses `crypto.randomUUID()` for entry IDs — collision-resistant but not sortable across instances.

For distributed systems (Cloudflare Workers, multi-server deployments), use **CUID2** for monotonically sortable, globally unique IDs:

```typescript
import { createId } from '@paralleldrive/cuid2';
import * as Audit from '@zambit/elevate-ts/Audit';

const session = Audit.createSession({
  enabled: true,
  generateId: createId // CUID2 — monotonically sortable across instances
});
```

This is **optional** — Audit ships with zero runtime dependencies by default. Only add CUID2 if you need sortable IDs.

See [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md#audit-subsystem-injectable-id-generation-2026-04-26) for the full rationale.

---

## Production & Privacy Considerations

[NOTE] **Sensitive data**: If your pipelines process user passwords, tokens, PII, or other sensitive values:

1. **Disable Audit** (the default):

   ```typescript
   const session = Audit.createSession(); // enabled: false
   ```

   Zero overhead — no recording happens.

2. **Or disable input/output capture**:

   ```typescript
   const session = Audit.withCaptureInputs(false)(Audit.withCaptureOutputs(false)(Audit.createSession({ enabled: true })));
   ```

   Operations are still logged, but input/output values are `undefined` in entries.

3. **Or scrub the log before sending**:

   ```typescript
   const log = Audit.getLog(session);
   const sanitized = Audit.getEntries(log).map((entry) => ({
     ...entry,
     input: entry.input?.password ? '[redacted]' : entry.input,
     output: '[redacted]'
   }));
   // Send sanitized to observability backend
   ```

[YES] Use Audit for production observability, debugging, and compliance audits. Just be intentional about what you log.

---

## See Also

- [API Reference](./API.md) — Complete function signatures
- [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) — Philosophy behind injectable ID generation
- [purify-ts guide](./purify-ts-guide.md) — FP patterns for Either, Maybe, State
