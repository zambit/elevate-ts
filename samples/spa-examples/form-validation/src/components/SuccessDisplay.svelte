<script lang="ts">
  export let show: boolean = false
  export let title: string = 'Success!'
  export let message: string = 'Form submitted successfully.'

  const handleClose = () => {
    show = false
  }
</script>

{#if show}
  <div class="success-container">
    <div class="success-content">
      <h2 class="success-title">{title}</h2>
      <p class="success-message">{message}</p>
      <button class="close-button" on:click={handleClose}>Dismiss</button>
    </div>
  </div>
{/if}

<style>
  .success-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    animation: fadeIn var(--transition-fast);
  }

  .success-content {
    background-color: white;
    border-radius: var(--radius-xl);
    padding: var(--spacing-8);
    box-shadow: var(--shadow-xl);
    text-align: center;
    max-width: 400px;
    animation: slideUp var(--transition-normal);
  }

  .success-title {
    margin: 0 0 var(--spacing-4) 0;
    color: var(--color-success);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .success-message {
    margin: 0 0 var(--spacing-6) 0;
    color: var(--color-neutral-600);
    font-size: var(--font-size-base);
  }

  .close-button {
    padding: var(--spacing-2) var(--spacing-6);
    background-color: var(--color-success);
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .close-button:hover {
    background-color: var(--color-success-dark);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
