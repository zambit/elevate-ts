<script lang="ts">
  import type { ValidationFieldError } from '../types.js'

  export let errors: ValidationFieldError[] = []
  export let fieldName: string = ''

  // Filter errors for this specific field
  $: fieldErrors = errors.filter((e) => e.field === fieldName)
</script>

{#if fieldErrors.length > 0}
  <div class="error-container">
    {#each fieldErrors as error (error.field)}
      <p class="error-message">{error.message}</p>
    {/each}
  </div>
{/if}

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }

  .error-message {
    margin: 0;
    padding: var(--spacing-2) var(--spacing-3);
    background-color: var(--color-error-light);
    border-left: 4px solid var(--color-error);
    color: var(--color-error-dark);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-md);
  }
</style>
