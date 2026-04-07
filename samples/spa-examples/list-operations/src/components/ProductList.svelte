<script lang="ts">
  import type { Product } from '../types.js'

  export let results: Product[] | Map<string, Product[]>
</script>

<div class="products-container">
  {#if results instanceof Map}
    <!-- Grouped view -->
    {#each Array.from(results.entries()) as [category, products] (category)}
      <section class="category-group">
        <h2>{category}</h2>
        <div class="products-grid">
          {#each products as product (product.id)}
            <div class="product-card">
              <div class="product-header">
                <h3>{product.name}</h3>
                {#if !product.inStock}
                  <span class="out-of-stock">Out of Stock</span>
                {/if}
              </div>

              <div class="product-body">
                <div class="price">${product.price.toFixed(2)}</div>
                <div class="rating">★ {product.rating.toFixed(1)}</div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    <!-- List view -->
    {#if results.length === 0}
      <div class="empty-state">
        <p>No products match your filters</p>
      </div>
    {:else}
      <div class="products-grid">
        {#each results as product (product.id)}
          <div class="product-card">
            <div class="product-header">
              <h3>{product.name}</h3>
              {#if !product.inStock}
                <span class="out-of-stock">Out of Stock</span>
              {/if}
            </div>

            <div class="product-meta">
              <span class="category">{product.category}</span>
            </div>

            <div class="product-body">
              <div class="price">${product.price.toFixed(2)}</div>
              <div class="rating">★ {product.rating.toFixed(1)}</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .products-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .category-group {
    background-color: white;
    padding: var(--spacing-6);
    border-radius: var(--radius-lg);
  }

  .category-group h2 {
    margin: 0 0 var(--spacing-4) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    padding-bottom: var(--spacing-3);
    border-bottom: 2px solid var(--color-brand);
  }

  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-4);
  }

  .product-card {
    background-color: white;
    border: 1px solid var(--color-neutral-200);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .product-card:hover {
    border-color: var(--color-brand);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .product-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: var(--spacing-2);
  }

  .product-header h3 {
    margin: 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    flex: 1;
  }

  .out-of-stock {
    padding: var(--spacing-1) var(--spacing-2);
    background-color: var(--color-error-light);
    color: var(--color-error-dark);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }

  .product-meta {
    font-size: var(--font-size-xs);
    color: var(--color-neutral-500);
    font-weight: var(--font-weight-medium);
  }

  .product-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--spacing-2);
    border-top: 1px solid var(--color-neutral-100);
  }

  .price {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
  }

  .rating {
    font-size: var(--font-size-sm);
    color: var(--color-neutral-600);
    font-weight: var(--font-weight-semibold);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-12);
    background-color: white;
    border-radius: var(--radius-lg);
    color: var(--color-neutral-500);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-base);
  }

  @media (max-width: 768px) {
    .products-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
</style>
