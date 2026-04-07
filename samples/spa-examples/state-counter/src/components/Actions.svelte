<script lang="ts">
  export let onIncrement: () => void
  export let onDecrement: () => void
  export let onUndo: () => void
  export let onReset: () => void
  export let canUndo: boolean
</script>

<div class="actions-container">
  <div class="button-group">
    <button class="btn btn-primary" on:click={onDecrement}>
      <span class="icon">−</span>
      <span>Decrement</span>
    </button>

    <button class="btn btn-primary" on:click={onIncrement}>
      <span class="icon">+</span>
      <span>Increment</span>
    </button>
  </div>

  <div class="button-group">
    <button
      class="btn btn-secondary"
      on:click={onUndo}
      disabled={!canUndo}
      title={canUndo ? 'Undo to previous value' : 'No history to undo'}
    >
      <span class="icon">↶</span>
      <span>Undo</span>
    </button>

    <button class="btn btn-secondary" on:click={onReset}>
      <span class="icon">⟳</span>
      <span>Reset</span>
    </button>
  </div>
</div>

<style>
  .actions-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    padding: var(--spacing-8);
    background-color: white;
    border-bottom: 1px solid var(--color-neutral-200);
  }

  .button-group {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: var(--color-brand);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-brand-dark);
    box-shadow: var(--shadow-md);
  }

  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
  }

  .btn-secondary {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-900);
    border: 1px solid var(--color-neutral-300);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--color-neutral-200);
    border-color: var(--color-neutral-400);
  }

  .btn-secondary:active:not(:disabled) {
    transform: scale(0.98);
  }

  .icon {
    display: inline-block;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }
</style>
