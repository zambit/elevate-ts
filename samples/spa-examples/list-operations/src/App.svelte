<script lang="ts">
  import { getCategories, getPriceRange, processProducts } from './list-operations.js'
  import './styles/tokens.css'
  import SearchBar from './components/SearchBar.svelte'
  import FilterPanel from './components/FilterPanel.svelte'
  import SortControls from './components/SortControls.svelte'
  import ProductList from './components/ProductList.svelte'
  import type { Product, FilterOptions, SortField, SortDirection } from './types.js'

  // Sample products
  const allProducts: readonly Product[] = [
    { id: '1', name: 'Laptop', category: 'Electronics', price: 1299, rating: 4.5, inStock: true },
    { id: '2', name: 'Mouse', category: 'Electronics', price: 29, rating: 4.2, inStock: true },
    { id: '3', name: 'Desk Chair', category: 'Furniture', price: 299, rating: 4.0, inStock: true },
    { id: '4', name: 'Monitor', category: 'Electronics', price: 399, rating: 4.6, inStock: false },
    { id: '5', name: 'Keyboard', category: 'Electronics', price: 79, rating: 4.3, inStock: true },
    { id: '6', name: 'Desk Lamp', category: 'Furniture', price: 49, rating: 4.1, inStock: true },
    { id: '7', name: 'Notebook', category: 'Supplies', price: 5, rating: 4.4, inStock: true },
    { id: '8', name: 'Pen Set', category: 'Supplies', price: 12, rating: 4.0, inStock: true }
  ]

  let filters: FilterOptions = {
    searchTerm: '',
    minPrice: 0,
    maxPrice: 2000,
    categories: [],
    inStockOnly: false
  }

  let sortField: SortField = 'name'
  let sortDirection: SortDirection = 'asc'
  let shouldGroup = false

  $: availableCategories = getCategories(allProducts)
  $: priceRange = getPriceRange(allProducts)
  $: results = processProducts(allProducts, filters, sortField, sortDirection, shouldGroup)
  $: resultCount =
    results instanceof Map
      ? Array.from(results.values()).reduce((sum, arr) => sum + arr.length, 0)
      : results.length
</script>

<main>
  <header>
    <h1>Product List Operations</h1>
    <p class="subtitle">Filter, sort, and group with pure functions</p>
  </header>

  <div class="container">
    <aside class="filters-panel">
      <SearchBar bind:searchTerm={filters.searchTerm} />
      <FilterPanel bind:filters {availableCategories} {priceRange} />
    </aside>

    <section class="results-panel">
      <div class="results-header">
        <SortControls bind:sortField bind:sortDirection bind:shouldGroup />
        <div class="result-count">{resultCount} results</div>
      </div>

      <ProductList {results} />
    </section>
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    background-color: var(--color-neutral-50);
  }

  header {
    padding: var(--spacing-8);
    background-color: white;
    border-bottom: 2px solid var(--color-neutral-200);
  }

  h1 {
    margin: 0 0 var(--spacing-2) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .subtitle {
    margin: 0;
    color: var(--color-neutral-500);
    font-size: var(--font-size-sm);
  }

  .container {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: var(--spacing-6);
    padding: var(--spacing-6);
    max-width: 1400px;
    margin: 0 auto;
  }

  .filters-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .results-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    background-color: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-neutral-200);
  }

  .result-count {
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-600);
    font-size: var(--font-size-sm);
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
    }

    .filters-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-4);
    }
  }
</style>
