<script lang="ts">
  import type { FilterOptions } from '../types.js'

  export let filters: FilterOptions
  export let availableCategories: string[] = []
  export let priceRange: { min: number; max: number } = { min: 0, max: 2000 }

  const toggleCategory = (category: string) => {
    if (filters.categories.includes(category)) {
      filters.categories = filters.categories.filter((c) => c !== category)
    } else {
      filters.categories = [...filters.categories, category]
    }
  }
</script>

<div class="filter-panel">
  <h3>Filters</h3>

  <fieldset class="filter-section">
    <legend>Price Range</legend>
    <div class="range-inputs">
      <input
        type="number"
        min={priceRange.min}
        max={priceRange.max}
        bind:value={filters.minPrice}
        class="range-input"
      />
      <span>−</span>
      <input
        type="number"
        min={priceRange.min}
        max={priceRange.max}
        bind:value={filters.maxPrice}
        class="range-input"
      />
    </div>
    <input
      type="range"
      min={priceRange.min}
      max={priceRange.max}
      bind:value={filters.minPrice}
      class="slider"
    />
  </fieldset>

  {#if availableCategories.length > 0}
    <fieldset class="filter-section">
      <legend>Categories</legend>
      <div class="checkboxes">
        {#each availableCategories as category (category)}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={filters.categories.includes(category)}
              on:change={() => toggleCategory(category)}
            />
            <span>{category}</span>
          </label>
        {/each}
      </div>
    </fieldset>
  {/if}

  <fieldset class="filter-section">
    <legend>Availability</legend>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={filters.inStockOnly} />
      <span>In Stock Only</span>
    </label>
  </fieldset>

  <button
    class="reset-btn"
    on:click={() => {
      filters.searchTerm = ''
      filters.minPrice = priceRange.min
      filters.maxPrice = priceRange.max
      filters.categories = []
      filters.inStockOnly = false
    }}
  >
    Reset Filters
  </button>
</div>

<style>
  .filter-panel {
    background-color: white;
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-neutral-200);
  }

  h3 {
    margin: 0 0 var(--spacing-4) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
  }

  .filter-section {
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-4);
    border-bottom: 1px solid var(--color-neutral-100);
  }

  .filter-section:last-of-type {
    margin-bottom: var(--spacing-2);
    padding-bottom: 0;
    border-bottom: none;
  }

  legend {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-600);
    margin-bottom: var(--spacing-2);
  }

  .range-inputs {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .range-input {
    flex: 1;
    padding: var(--spacing-2);
    border: 1px solid var(--color-neutral-200);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .slider {
    width: 100%;
    height: 4px;
  }

  .checkboxes {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-700);
  }

  .checkbox-label:hover {
    color: var(--color-neutral-900);
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  .reset-btn {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-4);
    background-color: var(--color-neutral-100);
    border: 1px solid var(--color-neutral-300);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-700);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .reset-btn:hover {
    background-color: var(--color-neutral-200);
    border-color: var(--color-neutral-400);
  }
</style>
