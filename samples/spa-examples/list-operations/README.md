# Sample: List Operations with Pure Functions

## Quick Summary

Interactive product list with search, filtering, sorting, and grouping using pure `List` utilities from elevate-ts.

## Why This Matters

**Problem:** Array operations scattered across components (filter in one place, sort in another, group elsewhere). Hard to test, hard to compose, easy to mutate accidentally. Business logic tangled with UI.

**Solution:** Pure, composable, immutable `List` utilities. `filter`, `sortBy`, `groupBy` all point-free, data-last, chainable. Test list logic in isolation. Compose operations without side effects.

**Key Insight:** List utilities are pure functions. They don't mutate input, they return new arrays. This makes testing trivial (no setup/teardown) and composition natural (pipe operations). Every operation is independently testable.

## Classic Use Cases

1. **Search + filter + sort** — User types, list updates in real time
2. **Data tables** — Column sorting, row filtering, pagination all pure
3. **E-commerce** — Product filters (price, category, rating) on live catalog
4. **Admin panels** — User/content lists with search, sort, bulk operations
5. **Dashboards** — Multiple lists with different filters, all composable

## When NOT to Use Pure List Utils

- Mutating data (use mutable arrays if you really need to)
- Huge datasets (10M+ items) — might benefit from more specialized structures
- Real-time streaming (would need incremental processing)

## Key Concepts

**Pure Functions:** Take input, return output, no side effects. Test without setup.

**Point-Free:** Functions composed without naming parameters. Example: `List.filter(p => p.inStock)` vs threading state.

**Immutability:** Original array never changes. New arrays for new state. Makes testing, debugging, undo/redo trivial.

**Composability:** Chain operations naturally. Each step is independently testable.

## Running Locally

```bash
cd samples/spa-examples/list-operations

# Install dependencies
pnpm install

# Start dev server (opens http://localhost:3002)
pnpm dev

# Run tests with coverage
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build for production
pnpm build
```

## Testing

```bash
pnpm test
```

Tests cover all list operations:
- Search filtering (by name, category, case insensitive)
- Price range filtering
- Category filtering
- In-stock filtering
- Sorting (by name, price, rating, ascending/descending)
- Grouping by category
- Combined filters and sorts
- Edge cases (empty lists, impossible ranges, etc.)

Aim for 100% coverage on business logic (`list-operations.ts`).

## Code Walkthrough

### Pure List Operations (`src/list-operations.ts`)

```typescript
export const filterBySearch = (term: string, products: readonly Product[]): Product[] =>
  List.filter((p) => p.name.toLowerCase().includes(term.toLowerCase()), products)

export const sortProducts = (
  field: SortField,
  direction: SortDirection,
  products: readonly Product[]
): Product[] => List.sortBy(compareFn, products)

export const groupByCategory = (products: readonly Product[]): Map<string, Product[]> => {
  const groups = new Map<string, Product[]>()
  List.forEach((p) => {
    const group = groups.get(p.category) ?? []
    groups.set(p.category, [...group, p])
  }, products)
  return groups
}
```

Key patterns:
- `List.filter()` — returns new array with matching items
- `List.sortBy()` — returns new sorted array
- `List.forEach()` — iterate without mutation
- All operations return new arrays, original untouched
- Easily testable: pure functions, no setup needed

### Component Integration (`src/App.svelte`)

```svelte
<script>
  import { filterBySearch, sortProducts, groupByCategory } from './list-operations.js'

  let filters = { searchTerm: '', minPrice: 0, maxPrice: 2000 }
  let sortField = 'name'
  let sortDirection = 'asc'
  let groupByCategory = false

  $: results = processProducts(
    allProducts,
    filters,
    sortField,
    sortDirection,
    groupByCategory
  )
</script>
```

Svelte reactivity automatically re-runs when inputs change. List operations are pure, so no side effects.

### Design Tokens

Uses shared design system from workspace root:

```svelte
<script>
  import './styles/tokens.css'
</script>

<style>
  .filter-btn {
    background-color: var(--color-brand)
    padding: var(--spacing-3) var(--spacing-4)
    border-radius: var(--radius-md)
  }
</style>
```

See [TOKENS.md](../../TOKENS.md) for customization.

## Further Reading

- [List utilities docs](../../README.md#list) — Full API reference
- [Functional Programming patterns](https://mostly-adequate.gitbook.io/mostly-adequate-guide/) — Point-free, composition concepts
- [Immutable data structures](https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly) — `readonly` arrays in TypeScript
