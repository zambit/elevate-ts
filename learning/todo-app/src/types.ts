/** A single todo item */
export interface Todo {
  readonly id: number
  readonly title: string
  readonly done: boolean
}

/** Collection of todos (immutable) */
export type Todos = readonly Todo[]

/** Filter mode for display */
export type Filter = 'All' | 'Active' | 'Completed'

/** Complete app state */
export interface AppState {
  readonly todos: Todos
  readonly filter: Filter
  readonly history: readonly Todos[]
}
