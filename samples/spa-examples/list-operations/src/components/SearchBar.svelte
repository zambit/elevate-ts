<script lang="ts">
  export let searchTerm: string = ''
</script>

<div class="search-container">
  <input
    type="text"
    placeholder="Search products..."
    bind:value={searchTerm}
    class="search-input"
  />
  {#if searchTerm}
    <button class="clear-btn" on:click={() => (searchTerm = '')}>✕</button>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    border: 2px solid var(--color-neutral-200);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-family: var(--font-sans);
    transition: all var(--transition-fast);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-brand);
    box-shadow: 0 0 0 3px var(--color-brand-light);
  }

  .clear-btn {
    position: absolute;
    right: var(--spacing-2);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-neutral-400);
    cursor: pointer;
    font-size: var(--font-size-lg);
    padding: var(--spacing-1);
    transition: color var(--transition-fast);
  }

  .clear-btn:hover {
    color: var(--color-neutral-600);
  }
</style>
