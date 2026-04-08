import { State } from 'elevate-ts/State.js'

import type { Todo, Todos, Filter, AppState } from './types.js'

// ============================================================================
// Todo List Operations (pure functions over Todos)
// ============================================================================

/** Add a new todo to the list. Returns the created todo and new list. */
export const addTodo = (title: string): State<Todos, Todo> =>
  State((todos) => {
    const ids = todos.map((t) => t.id)
    const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1
    const newTodo: Todo = {
      id: nextId,
      title,
      done: false
    }
    return [newTodo, [...todos, newTodo]]
  })

/** Toggle a todo between done and not done. */
export const toggleTodo = (id: number): State<Todos, void> =>
  State((todos) => [
    undefined,
    todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
  ])

/** Remove a todo by id. */
export const removeTodo = (id: number): State<Todos, void> =>
  State((todos) => [undefined, todos.filter((t) => t.id !== id)])

/** Clear all completed todos. */
export const clearCompleted = (): State<Todos, void> =>
  State((todos) => [undefined, todos.filter((t) => !t.done)])

// ============================================================================
// Queries (pure functions that don't change state)
// ============================================================================

/** Get todos filtered by status. */
export const getFilteredTodos = (filter: Filter, todos: Todos): readonly Todo[] =>
  filter === 'All'
    ? todos
    : filter === 'Active'
      ? todos.filter((t) => !t.done)
      : todos.filter((t) => t.done)

/** Count todos by status. */
export const countTodos = (
  todos: Todos
): { readonly total: number; readonly done: number; readonly active: number } => ({
  total: todos.length,
  done: todos.filter((t) => t.done).length,
  active: todos.filter((t) => !t.done).length
})

// ============================================================================
// App State Operations (State<AppState, A>)
// ============================================================================

/** Change the filter with tracking. */
export const changeFilter = (filter: Filter): State<AppState, void> =>
  State((state) => [undefined, { ...state, filter }])

/** Add a todo and save history for undo. */
export const addWithHistory = (title: string): State<AppState, Todo> =>
  State((state) => {
    const [newTodo, newTodos] = addTodo(title).run(state.todos)
    return [
      newTodo,
      {
        ...state,
        todos: newTodos,
        history: [...state.history, state.todos]
      }
    ]
  })

/** Toggle a todo and save history. */
export const toggleWithHistory = (id: number): State<AppState, void> =>
  State((state) => {
    const [, newTodos] = toggleTodo(id).run(state.todos)
    return [
      undefined,
      {
        ...state,
        todos: newTodos,
        history: [...state.history, state.todos]
      }
    ]
  })

" Remove a todo and save history. */
export const removeWithHistory = (id: number): State<AppState, void> =>
  State((state) => {
    const [, newTodos] = removeTodo(id).run(state.todos)
    return [
      undefined,
      {
        ...state,
        todos: newTodos,
        history: [...state.history, state.todos]
      }
    ]
  })

/** Clear completed todos and save history. */
export const clearCompletedWithHistory = (): State<AppState, void> =>
  State((state) => {
    const [, newTodos] = clearCompleted().run(state.todos)
    return [
      undefined,
      {
        ...state,
        todos: newTodos,
        history: [...state.history, state.todos]
      }
    ]
  })

/** Undo the last action by restoring previous state. */
export const undo = (): State<AppState, void> =>
  State((state) => {
    if (state.history.length === 0) {
      return [undefined, state]
    }
    const previousTodos = state.history[state.history.length - 1]
    const newHistory = state.history.slice(0, -1)
    return [
      undefined,
      {
        todos: previousTodos,
        filter: state.filter,
        history: newHistory
      }
    ]
  })

// ============================================================================
// Persistence (side effects, but pure functions for the logic)
// ============================================================================

const STORAGE_KEY = 'elevate-ts-todos'

/** Save todos to localStorage. */
export const saveTodos = (todos: Todos): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

/** Load todos from localStorage. */
export const loadTodos = (): Todos => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}
