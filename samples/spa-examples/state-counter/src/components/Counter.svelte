<script lang="ts">
  export let current: number
</script>

<div class="counter-container">
  <div class="counter-display">
    <div class="counter-label">Current Value</div>
    <div class="counter-value">{current}</div>
  </div>
</div>

<style>
  .counter-container {
    display: flex;
    justify-content: center;
    padding: var(--spacing-12);
    background: linear-gradient(
      135deg,
      var(--color-brand-light) 0%,
      var(--color-neutral-50) 100%
    );
  }

  .counter-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
  }

  .counter-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-600);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .counter-value {
    font-size: 4rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    min-width: 200px;
    text-align: center;
  }
</style>
