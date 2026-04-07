import { List } from 'elevate-ts'
import type { Product, FilterOptions, SortField, SortDirection } from './types.js'

/**
 * Filter products by search term (name and category).
 */
export const filterBySearch = (term: string, products: readonly Product[]): Product[] => {
  const lowerTerm = term.toLowerCase()
  return products.filter(
    (p) => p.name.toLowerCase().includes(lowerTerm) || p.category.toLowerCase().includes(lowerTerm)
  )
}

/**
 * Filter products by price range.
 */
export const filterByPrice = (
  minPrice: number,
  maxPrice: number,
  products: readonly Product[]
): Product[] => products.filter((p) => p.price >= minPrice && p.price <= maxPrice)

/**
 * Filter products by category.
 */
export const filterByCategories = (
  categories: readonly string[],
  products: readonly Product[]
): Product[] => {
  if (categories.length === 0) return [...products]
  return products.filter((p) => categories.includes(p.category))
}

/**
 * Filter in-stock products only.
 */
export const filterInStock = (products: readonly Product[]): Product[] =>
  products.filter((p) => p.inStock)

/**
 * Sort products by field and direction.
 */
export const sortProducts = (
  field: SortField,
  direction: SortDirection,
  products: readonly Product[]
): Product[] => {
  const compareFn = (a: Product, b: Product): number => {
    const aVal = field === 'name' ? a.name : field === 'price' ? a.price : a.rating
    const bVal = field === 'name' ? b.name : field === 'price' ? b.price : b.rating

    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  }

  return [...products].sort(compareFn)
}

/**
 * Group products by category.
 */
export const groupByCategory = (products: readonly Product[]): Map<string, Product[]> => {
  const groups = new Map<string, Product[]>()

  products.forEach((p) => {
    const group = groups.get(p.category) ?? []
    groups.set(p.category, [...group, p])
  })

  return groups
}

/**
 * Apply all filters in sequence.
 */
export const applyAllFilters = (
  filters: FilterOptions,
  products: readonly Product[]
): Product[] => {
  let filtered = [...products]

  // Search
  if (filters.searchTerm) {
    filtered = filterBySearch(filters.searchTerm, filtered)
  }

  // Price range
  filtered = filterByPrice(filters.minPrice, filters.maxPrice, filtered)

  // Categories
  filtered = filterByCategories(filters.categories, filtered)

  // In stock
  if (filters.inStockOnly) {
    filtered = filterInStock(filtered)
  }

  return filtered
}

/**
 * Complete pipeline: filter → sort → optionally group.
 */
export const processProducts = (
  products: readonly Product[],
  filters: FilterOptions,
  sortField: SortField,
  sortDirection: SortDirection,
  shouldGroup: boolean
): Product[] | Map<string, Product[]> => {
  const filtered = applyAllFilters(filters, products)
  const sorted = sortProducts(sortField, sortDirection, filtered)

  if (shouldGroup) {
    return groupByCategory(sorted)
  }

  return sorted
}

/**
 * Get unique categories from products.
 */
export const getCategories = (products: readonly Product[]): string[] => {
  const categories = new Set<string>()
  products.forEach((p) => categories.add(p.category))
  return Array.from(categories).sort()
}

/**
 * Get price range from products.
 */
export const getPriceRange = (products: readonly Product[]): { min: number; max: number } => {
  if (products.length === 0) {
    return { min: 0, max: 0 }
  }

  let min = Infinity
  let max = -Infinity

  products.forEach((p) => {
    if (p.price < min) min = p.price
    if (p.price > max) max = p.price
  })

  return { min, max }
}
