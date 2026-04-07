<script lang="ts">
  import type { CounterState } from '../state-machine.js'

  export let state: CounterState
</script>

<div class="history-container">
  <h2>Undo History</h2>

  {#if state.history.length === 0}
    <p class="empty">No history yet. Increment or decrement to create history for undo.</p>
  {:else}
    <div class="history-list">
      <div class="history-header">
        <span class="col-index">#</span>
        <span class="col-value">Previous Value</span>
      </div>
      {#each state.history as value, index (index)}
        <div class="history-item">
          <span class="col-index">{index + 1}</span>
          <span class="col-value">{value}</span>
        </div>
      {/each}
    </div>
    <p class="hint">Click "Undo" to restore a previous value (always undoes to the most recent)</p>
  {/if}
</div>

<style>
  .history-container {
    flex: 1;
    padding: var(--spacing-8);
    background-color: var(--color-neutral-50);
    overflow-y: auto;
  }

  h2 {
    margin: 0 0 var(--spacing-4) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .empty {
    color: var(--color-neutral-500);
    font-size: var(--font-size-base);
    font-style: italic;
    text-align: center;
    padding: var(--spacing-8);
  }

  .history-list {
    background-color: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-neutral-200);
    overflow: hidden;
  }

  .history-header {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background-color: var(--color-neutral-100);
    border-bottom: 1px solid var(--color-neutral-200);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
    color: var(--color-neutral-600);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .history-item {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-neutral-100);
    align-items: center;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-item:hover {
    background-color: var(--color-neutral-50);
  }

  .col-index {
    color: var(--color-neutral-500);
    text-align: center;
    font-weight: var(--font-weight-semibold);
  }

  .col-value {
    color: var(--color-brand);
    font-weight: var(--font-weight-semibold);
  }

  .hint {
    margin-top: var(--spacing-4);
    color: var(--color-neutral-500);
    font-size: var(--font-size-sm);
    text-align: center;
  }
</style>
