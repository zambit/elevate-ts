<script lang="ts">
  import type { SortField, SortDirection } from '../types.js'

  export let sortField: SortField = 'name'
  export let sortDirection: SortDirection = 'asc'
  export let shouldGroup: boolean = false
</script>

<div class="controls">
  <div class="sort-controls">
    <label>
      <span>Sort by:</span>
      <select bind:value={sortField}>
        <option value="name">Name</option>
        <option value="price">Price</option>
        <option value="rating">Rating</option>
      </select>
    </label>

    <button
      class="direction-btn"
      on:click={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
      title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
    >
      {sortDirection === 'asc' ? '↑' : '↓'}
    </button>
  </div>

  <label class="group-toggle">
    <input type="checkbox" bind:checked={shouldGroup} />
    <span>Group by Category</span>
  </label>
</div>

<style>
  .controls {
    display: flex;
    gap: var(--spacing-4);
    align-items: center;
    flex-wrap: wrap;
  }

  .sort-controls {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  label {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-600);
  }

  select {
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--color-neutral-300);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    background-color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  select:hover {
    border-color: var(--color-neutral-400);
  }

  select:focus {
    outline: none;
    border-color: var(--color-brand);
    box-shadow: 0 0 0 3px var(--color-brand-light);
  }

  .direction-btn {
    padding: var(--spacing-2) var(--spacing-3);
    background-color: var(--color-neutral-100);
    border: 1px solid var(--color-neutral-300);
    border-radius: var(--radius-md);
    font-size: var(--font-size-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .direction-btn:hover {
    background-color: var(--color-brand);
    border-color: var(--color-brand);
    color: white;
  }

  .group-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .group-toggle input[type='checkbox'] {
    cursor: pointer;
  }
</style>
