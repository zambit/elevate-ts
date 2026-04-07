<script lang="ts">
  export let activeForm: 'user' | 'task' = 'user'
</script>

<div class="toggle-container">
  <button
    class="toggle-button"
    class:active={activeForm === 'user'}
    on:click={() => (activeForm = 'user')}
  >
    User Registration
  </button>
  <button
    class="toggle-button"
    class:active={activeForm === 'task'}
    on:click={() => (activeForm = 'task')}
  >
    Create Task
  </button>
</div>

<style>
  .toggle-container {
    display: flex;
    gap: var(--spacing-2);
    padding: var(--spacing-6);
    border-bottom: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);
  }

  .toggle-button {
    padding: var(--spacing-2) var(--spacing-4);
    background-color: transparent;
    border: 2px solid var(--color-neutral-300);
    border-radius: var(--radius-lg);
    color: var(--color-neutral-600);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .toggle-button:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .toggle-button.active {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
</style>
