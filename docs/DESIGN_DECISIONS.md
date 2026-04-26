# Design Decisions

This document records significant architectural and API decisions made during elevate-ts development. Each decision is captured with its context, alternatives considered, and the chosen approach.

## Core Philosophy Decisions

### Point-Free Composition

**Decision:** All exported functions are curried and support point-free composition. Intermediate values are never named in user code.

**Why:** Reduces boilerplate and noise in data transformation pipelines. Point-free style reads like a sequence of operations rather than imperative steps. Long-term: enables powerful abstractions
(custom operators, fusion, optimization) that would be difficult with explicit value naming.

### Data-Last Argument Order

**Decision:** Configuration and transformation functions always precede the data being operated on.

**Why:** Enables partial application and currying naturally. Users create specialized functions by providing configuration once, then reuse with different data—reducing duplication and improving
testability. Long-term: builds a foundation for dynamic composition and higher-order transformations.

### Pure Functions, ≤10 Lines

**Decision:** No side effects, mutations, or classes. All functions fit within 10 lines (except control structures).

**Why:** Pure functions are deterministic and testable. Short functions are easier to reason about, audit, and combine safely. Long-term: enables aggressive optimizations (caching, parallelization),
easier refactoring without side-effect crawl, and better static analysis opportunities.

### Cloudflare Workers Ready

**Decision:** No Node.js built-ins or DOM APIs. Code runs unchanged in browsers, Workers, and Node.js.

**Why:** Eliminates environment-specific adaptation code and conditional imports. Users deploy the same codebase to edge, server, or client without modification. Long-term: reduces the surface area
for environment-specific bugs, simplifies testing, and enables code sharing across the entire stack.

### Fantasy Land 5 Compliance

**Decision:** All applicable types (Maybe, Either, Reader, State, etc.) implement Fantasy Land 5 specification.

**Why:** Interoperability with other FL-compliant libraries. Users can mix elevate-ts with other FP ecosystems (Ramda, fp-ts, etc.) without adapter code. Long-term: elevate-ts becomes a building block
in larger FP ecosystems rather than an isolated library.

### Zero Runtime Dependencies

**Decision:** Library ships with zero runtime dependencies. All code is pure TypeScript with no external imports.

**Why:** Minimal bundle size, no transitive dependency management headaches, works in any JS environment without compatibility concerns. Long-term: this is a core stability contract that prevents
version conflicts, supply-chain risk, and dependency churn that affects downstream users.

---

## Audit Subsystem: Injectable ID Generation (2026-04-26)

**Decision:** Maintain zero runtime dependencies by making operation ID generation injectable, rather than adding `@paralleldrive/cuid2` as a built-in dependency.

**Context:** The audit subsystem roadmap item mentioned using CUID2 for "monotonically sortable, collision-resistant across distributed Worker instances" operation IDs. However, elevate-ts's
zero-dependency guarantee is a core part of its identity and a major reason users choose it for edge environments.

**Alternatives Considered:**

1. **Add CUID2 as runtime dependency** — Provides out-of-the-box monotonic sortability and distributed collision resistance. Cost: Breaks zero-dependency promise for all users, even those who don't
   need CUID2.

2. **Use incrementing counter** — Simple, no dependency. Cost: Not collision-resistant across distributed instances; unsuitable for edge workers.

3. **Use `crypto.randomUUID()`** — Zero dependency (native Web API). Cost: No monotonic sorting; collision-resistant but not predictable.

4. **Make ID generation injectable** (chosen) — Default to `crypto.randomUUID()` (zero deps, works everywhere). Users who need monotonic sortability can inject CUID2. Cost: Requires configuration
   knowledge; two-tier user experience.

**Decision:** Implement option 4. The default provides zero-friction for 90% of users, while enabling power users to opt into CUID2 when needed:

```typescript
// Default: zero-deps, UUID v4
const session = Audit.createSession({ enabled: true });

// Optional: monotonic, collision-resistant
import { createId } from '@paralleldrive/cuid2';
const session = Audit.createSession({
  enabled: true,
  generateId: createId
});
```

**Why This Matters:**

- Preserves the zero-dependency guarantee as a stable contract
- Aligns with functional philosophy of giving users composable primitives, not baked-in policy
- Users who don't need CUID2 pay zero cost
- Users who need CUID2 can add it with one line

---

## Future Decisions

Add new decisions as they arise. Format:

- **Decision:** One sentence summary
- **Context:** Why this decision was necessary
- **Alternatives Considered:** What other options existed
- **Decision:** What was chosen and why
- **Why This Matters:** How this affects users or future work
