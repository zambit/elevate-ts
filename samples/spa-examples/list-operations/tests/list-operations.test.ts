import { describe, it, expect } from 'vitest'
import {
  filterBySearch,
  filterByPrice,
  filterByCategories,
  filterInStock,
  sortProducts,
  groupByCategory,
  applyAllFilters,
  getCategories,
  getPriceRange,
  processProducts
} from '../src/list-operations.js'
import type { Product, FilterOptions } from '../src/types.js'

const products: readonly Product[] = [
  { id: '1', name: 'Laptop', category: 'Electronics', price: 1299, rating: 4.5, inStock: true },
  { id: '2', name: 'Mouse', category: 'Electronics', price: 29, rating: 4.2, inStock: true },
  { id: '3', name: 'Desk Chair', category: 'Furniture', price: 299, rating: 4.0, inStock: true },
  { id: '4', name: 'Monitor', category: 'Electronics', price: 399, rating: 4.6, inStock: false },
  { id: '5', name: 'Keyboard', category: 'Electronics', price: 79, rating: 4.3, inStock: true },
  {
    id: '6',
    name: 'Desk Lamp',
    category: 'Furniture',
    price: 49,
    rating: 4.1,
    inStock: true
  }
]

describe('List Operations', () => {
  describe('filterBySearch', () => {
    it('filters by product name', () => {
      const result = filterBySearch('Laptop', products)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Laptop')
    })

    it('filters by category', () => {
      const result = filterBySearch('Electronics', products)
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((p) => p.category === 'Electronics')).toBe(true)
    })

    it('is case insensitive', () => {
      const result = filterBySearch('MOUSE', products)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Mouse')
    })

    it('returns empty array for no matches', () => {
      const result = filterBySearch('Nonexistent', products)
      expect(result).toHaveLength(0)
    })
  })

  describe('filterByPrice', () => {
    it('filters products within price range', () => {
      const result = filterByPrice(0, 100, products)
      expect(result.every((p) => p.price <= 100)).toBe(true)
    })

    it('includes products at exact min/max', () => {
      const result = filterByPrice(29, 299, products)
      expect(result.some((p) => p.price === 29)).toBe(true)
      expect(result.some((p) => p.price === 299)).toBe(true)
    })

    it('returns empty array for impossible range', () => {
      const result = filterByPrice(2000, 3000, products)
      expect(result).toHaveLength(0)
    })
  })

  describe('filterByCategories', () => {
    it('filters by selected categories', () => {
      const result = filterByCategories(['Electronics'], products)
      expect(result.every((p) => p.category === 'Electronics')).toBe(true)
    })

    it('handles multiple categories', () => {
      const result = filterByCategories(['Electronics', 'Furniture'], products)
      expect(result).toEqual(products)
    })

    it('returns all products with empty categories', () => {
      const result = filterByCategories([], products)
      expect(result).toHaveLength(products.length)
    })
  })

  describe('filterInStock', () => {
    it('returns only in-stock products', () => {
      const result = filterInStock(products)
      expect(result.every((p) => p.inStock)).toBe(true)
    })

    it('excludes out-of-stock products', () => {
      const result = filterInStock(products)
      expect(result.some((p) => p.id === '4')).toBe(false)
    })
  })

  describe('sortProducts', () => {
    it('sorts by name ascending', () => {
      const result = sortProducts('name', 'asc', products)
      expect(result[0].name).toBe('Desk Chair')
      expect(result[result.length - 1].name).toBe('Mouse')
    })

    it('sorts by name descending', () => {
      const result = sortProducts('name', 'desc', products)
      expect(result[0].name).toBe('Mouse')
      expect(result[result.length - 1].name).toBe('Desk Chair')
    })

    it('sorts by price ascending', () => {
      const result = sortProducts('price', 'asc', products)
      expect(result[0].price).toBe(29)
      expect(result[result.length - 1].price).toBe(1299)
    })

    it('sorts by rating descending', () => {
      const result = sortProducts('rating', 'desc', products)
      expect(result[0].rating).toBeGreaterThanOrEqual(result[1].rating)
    })
  })

  describe('groupByCategory', () => {
    it('groups products by category', () => {
      const result = groupByCategory(products)
      expect(result.has('Electronics')).toBe(true)
      expect(result.has('Furniture')).toBe(true)
    })

    it('has correct count in each group', () => {
      const result = groupByCategory(products)
      expect(result.get('Electronics')).toHaveLength(4)
      expect(result.get('Furniture')).toHaveLength(2)
    })
  })

  describe('applyAllFilters', () => {
    it('applies search filter', () => {
      const filters: FilterOptions = {
        searchTerm: 'Electronics',
        minPrice: 0,
        maxPrice: 2000,
        categories: [],
        inStockOnly: false
      }
      const result = applyAllFilters(filters, products)
      expect(result.every((p) => p.category === 'Electronics')).toBe(true)
    })

    it('applies price filter', () => {
      const filters: FilterOptions = {
        searchTerm: '',
        minPrice: 0,
        maxPrice: 100,
        categories: [],
        inStockOnly: false
      }
      const result = applyAllFilters(filters, products)
      expect(result.every((p) => p.price <= 100)).toBe(true)
    })

    it('applies in-stock filter', () => {
      const filters: FilterOptions = {
        searchTerm: '',
        minPrice: 0,
        maxPrice: 2000,
        categories: [],
        inStockOnly: true
      }
      const result = applyAllFilters(filters, products)
      expect(result.every((p) => p.inStock)).toBe(true)
    })

    it('applies multiple filters together', () => {
      const filters: FilterOptions = {
        searchTerm: 'Electronics',
        minPrice: 0,
        maxPrice: 500,
        categories: [],
        inStockOnly: true
      }
      const result = applyAllFilters(filters, products)
      expect(result.every((p) => p.category === 'Electronics')).toBe(true)
      expect(result.every((p) => p.price <= 500)).toBe(true)
      expect(result.every((p) => p.inStock)).toBe(true)
    })
  })

  describe('getCategories', () => {
    it('returns unique categories sorted', () => {
      const result = getCategories(products)
      expect(result).toContain('Electronics')
      expect(result).toContain('Furniture')
      expect(result).toEqual([...result].sort())
    })

    it('handles empty products', () => {
      const result = getCategories([])
      expect(result).toHaveLength(0)
    })
  })

  describe('getPriceRange', () => {
    it('returns min and max prices', () => {
      const result = getPriceRange(products)
      expect(result.min).toBe(29)
      expect(result.max).toBe(1299)
    })

    it('handles empty products', () => {
      const result = getPriceRange([])
      expect(result).toEqual({ min: 0, max: 0 })
    })
  })

  describe('processProducts', () => {
    it('filters and sorts without grouping', () => {
      const filters: FilterOptions = {
        searchTerm: '',
        minPrice: 0,
        maxPrice: 500,
        categories: [],
        inStockOnly: true
      }
      const result = processProducts(products, filters, 'price', 'asc', false)
      expect(Array.isArray(result)).toBe(true)
      expect((result as Product[]).every((p) => p.price <= 500)).toBe(true)
    })

    it('filters, sorts, and groups by category', () => {
      const filters: FilterOptions = {
        searchTerm: '',
        minPrice: 0,
        maxPrice: 500,
        categories: [],
        inStockOnly: true
      }
      const result = processProducts(products, filters, 'price', 'asc', true)
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBeGreaterThan(0)
    })
  })
})
