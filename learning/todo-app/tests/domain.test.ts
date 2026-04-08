import { describe, it, expect } from 'vitest'

import {
  addTodo,
  toggleTodo,
  removeTodo,
  clearCompleted,
  getFilteredTodos,
  countTodos,
  addWithHistory,
  toggleWithHistory,
  undo
} from '../src/domain.js'
import type { Todos, AppState } from '../src/types.js'

describe('domain', () => {
  const emptyTodos: Todos = []
  const sampleTodos: Todos = [
    { id: 1, title: 'Learn FP', done: false },
    { id: 2, title: 'Build app', done: true }
  ]

  const initialState: AppState = {
    todos: [],
    filter: 'All',
    history: []
  }

  describe('addTodo', () => {
    it('adds a new todo to empty list', () => {
      const [newTodo, result] = addTodo('First task').run(emptyTodos)
      expect(result).toHaveLength(1)
      expect(newTodo.title).toBe('First task')
      expect(newTodo.done).toBe(false)
    })

    it('generates unique ids', () => {
      const [todo1, todos1] = addTodo('First').run(emptyTodos)
      const [todo2] = addTodo('Second').run(todos1)
      expect(todo1.id).toBe(1)
      expect(todo2.id).toBe(2)
    })

    it('preserves existing todos', () => {
      const [_, result] = addTodo('New task').run(sampleTodos)
      expect(result).toContain(sampleTodos[0])
      expect(result).toContain(sampleTodos[1])
      expect(result).toHaveLength(3)
    })

    it('new todo id is greater than all existing ids', () => {
      const [newTodo] = addTodo('Test').run(sampleTodos)
      expect(newTodo.id).toBeGreaterThan(2)
    })
  })

  describe('toggleTodo', () => {
    it('marks incomplete todo as done', () => {
      const [_, result] = toggleTodo(1).run(sampleTodos)
      expect(result[0].done).toBe(true)
    })

    it('marks completed todo as incomplete', () => {
      const [_, result] = toggleTodo(2).run(sampleTodos)
      expect(result[1].done).toBe(false)
    })

    it('does nothing if todo doesnt exist', () => {
      const [_, result] = toggleTodo(999).run(sampleTodos)
      expect(result).toEqual(sampleTodos)
    })
  })

  describe('removeTodo', () => {
    it('removes todo by id', () => {
      const [_, result] = removeTodo(1).run(sampleTodos)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2)
    })

    it('does nothing if todo doesnt exist', () => {
      const [_, result] = removeTodo(999).run(sampleTodos)
      expect(result).toEqual(sampleTodos)
    })

    it('removes from empty list safely', () => {
      const [_, result] = removeTodo(1).run(emptyTodos)
      expect(result).toHaveLength(0)
    })
  })

  describe('clearCompleted', () => {
    it('removes all completed todos', () => {
      const [_, result] = clearCompleted().run(sampleTodos)
      expect(result).toHaveLength(1)
      expect(result[0].done).toBe(false)
    })

    it('does nothing if no completed todos', () => {
      const [_, result] = clearCompleted().run(emptyTodos)
      expect(result).toHaveLength(0)
    })
  })

  describe('getFilteredTodos', () => {
    it('returns all todos when filter is "All"', () => {
      expect(getFilteredTodos('All', sampleTodos)).toEqual(sampleTodos)
    })

    it('returns only active todos when filter is "Active"', () => {
      const active = getFilteredTodos('Active', sampleTodos)
      expect(active).toHaveLength(1)
      expect(active[0].done).toBe(false)
    })

    it('returns only completed todos when filter is "Completed"', () => {
      const done = getFilteredTodos('Completed', sampleTodos)
      expect(done).toHaveLength(1)
      expect(done[0].done).toBe(true)
    })

    it('returns empty array for empty todos', () => {
      expect(getFilteredTodos('Active', emptyTodos)).toHaveLength(0)
    })
  })

  describe('countTodos', () => {
    it('counts correctly with mixed todos', () => {
      expect(countTodos(sampleTodos)).toEqual({
        total: 2,
        done: 1,
        active: 1
      })
    })

    it('counts correctly with empty todos', () => {
      expect(countTodos(emptyTodos)).toEqual({
        total: 0,
        done: 0,
        active: 0
      })
    })

    it('counts correctly with all completed', () => {
      const allDone: Todos = [
        { id: 1, title: 'Done', done: true },
        { id: 2, title: 'Also done', done: true }
      ]
      expect(countTodos(allDone)).toEqual({
        total: 2,
        done: 2,
        active: 0
      })
    })
  })

  describe('History Operations', () => {
    it('addWithHistory saves previous state', () => {
      const state1 = initialState
      const [_, state2] = addWithHistory('First').run(state1)
      expect(state2.history).toEqual([state1.todos])
      expect(state2.todos).toHaveLength(1)
    })

    it('toggleWithHistory saves previous state', () => {
      const state1: AppState = {
        todos: sampleTodos,
        filter: 'All',
        history: []
      }
      const [_, state2] = toggleWithHistory(1).run(state1)
      expect(state2.history).toEqual([state1.todos])
      expect(state2.todos[0].done).toBe(true)
    })

    it('undo restores previous state', () => {
      const state = initialState
      const [_,state1] = addWithHistory('First').run(state)
      const [__, state2] = addWithHistory('Second').run(state1)

      const [___, undoneState] = undo().run(state2)
      expect(undoneState.todos).toEqual(state1.todos)
      expect(undoneState.history).toHaveLength(1)
    })

    it('undo with empty history does nothing', () => {
      const [_, result] = undo().run(initialState)
      expect(result).toEqual(initialState)
    })

    it('multiple operations build up history', () => {
      const state = initialState
      const [_, state1] = addWithHistory('First').run(state)
      const [__, state2] = addWithHistory('Second').run(state1)
      const [___, state3] = addWithHistory('Third').run(state2)

      expect(state3.history).toHaveLength(3)
      expect(state3.todos).toHaveLength(3)
    })
  })

  describe('Composition', () => {
    it('composing operations works', () => {
      const state = initialState
      const [_, state1] = addWithHistory('First').run(state)
      const [__, state2] = addWithHistory('Second').run(state1)
      const [___, state3] = toggleWithHistory(1).run(state2)

      expect(state3.todos).toHaveLength(2)
      expect(state3.todos[0].done).toBe(true)
      expect(state3.history).toHaveLength(3)
    })
  })
})
