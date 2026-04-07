export interface Product {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly price: number
  readonly rating: number
  readonly inStock: boolean
}

export type SortField = 'name' | 'price' | 'rating'
export type SortDirection = 'asc' | 'desc'

export interface FilterOptions {
  readonly searchTerm: string
  readonly minPrice: number
  readonly maxPrice: number
  readonly categories: readonly string[]
  readonly inStockOnly: boolean
}

export interface ListState {
  readonly products: readonly Product[]
  readonly filters: FilterOptions
  readonly sortField: SortField
  readonly sortDirection: SortDirection
  readonly groupByCategory: boolean
}
