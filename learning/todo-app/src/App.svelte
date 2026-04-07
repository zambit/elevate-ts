<script lang="ts">
  import { onMount } from 'svelte'
  import {
    addWithHistory,
    toggleWithHistory,
    removeWithHistory,
    clearCompletedWithHistory,
    changeFilter,
    getFilteredTodos,
    countTodos,
    saveTodos,
    loadTodos,
    undo
  } from './domain.js'
  import type { AppState } from './types.js'

  let appState: AppState = {
    todos: [],
    filter: 'All',
    history: []
  }

  let inputValue = ''

  onMount(() => {
    const loaded = loadTodos()
    appState = {
      todos: loaded,
      filter: 'All',
      history: []
    }
  })

  /** Run a domain function and persist state */
  const execute = (fn: any) => {
    const [_, newState] = fn.run(appState)
    appState = newState
    saveTodos(appState.todos)
  }

  /** Handle adding a new todo */
  const handleAddTodo = () => {
    const title = inputValue.trim()
    if (title) {
      execute(addWithHistory(title))
      inputValue = ''
    }
  }

  /** Handle adding on Enter key */
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  }

  // Reactive statements
  $: filtered = getFilteredTodos(appState.filter, appState.todos)
  $: counts = countTodos(appState.todos)
  $: canUndo = appState.history.length > 0
</script>

<main>
  <section class="header">
    <h1>📝 My Todos</h1>
    <p>Built with elevate-ts functional programming</p>
  </section>

  <section class="input-section">
    <input
      type="text"
      placeholder="Add a new todo... (press Enter)"
      bind:value={inputValue}
      on:keydown={handleKeydown}
      class="todo-input"
    />
    <button on:click={handleAddTodo} class="add-btn">Add</button>
  </section>

  <section class="filters">
    <button
      on:click={() => execute(changeFilter('All'))}
      class:active={appState.filter === 'All'}
    >
      All <span class="count">{counts.total}</span>
    </button>
    <button
      on:click={() => execute(changeFilter('Active'))}
      class:active={appState.filter === 'Active'}
    >
      Active <span class="count">{counts.active}</span>
    </button>
    <button
      on:click={() => execute(changeFilter('Completed'))}
      class:active={appState.filter === 'Completed'}
    >
      Done <span class="count">{counts.done}</span>
    </button>
    <button on:click={() => execute(undo())} disabled={!canUndo} class="undo-btn">
      ↶ Undo
    </button>
    {#if counts.done > 0}
      <button on:click={() => execute(clearCompletedWithHistory())} class="clear-btn">
        Clear Done
      </button>
    {/if}
  </section>

  <section class="todos">
    {#if filtered.length === 0}
      <p class="empty-state">
        {appState.filter === 'All'
          ? 'No todos yet. Add one to get started!'
          : `No ${appState.filter.toLowerCase()} todos.`}
      </p>
    {:else}
      <ul>
        {#each filtered as todo (todo.id)}
          <li class:done={todo.done}>
            <input
              type="checkbox"
              checked={todo.done}
              on:change={() => execute(toggleWithHistory(todo.id))}
              aria-label={`Toggle todo: ${todo.title}`}
            />
            <span class="title">{todo.title}</span>
            <button
              on:click={() => execute(removeWithHistory(todo.id))}
              class="delete-btn"
              aria-label={`Delete todo: ${todo.title}`}
            >
              ✕
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
      Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    margin: 0;
    padding: 20px;
  }

  main {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;

    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }

    p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
  }

  .input-section {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    gap: 10px;

    .todo-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #667eea;
      }
    }

    .add-btn {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #5568d3;
      }

      &:active {
        transform: scale(0.98);
      }
    }
  }

  .filters {
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;

    button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;

      &:hover {
        background: #f9f9f9;
      }

      &.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      &.undo-btn {
        margin-left: auto;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &.clear-btn {
        background: #ff6b6b;
        color: white;
        border-color: #ff6b6b;

        &:hover {
          background: #ee5a52;
        }
      }

      .count {
        font-weight: 600;
        font-size: 12px;
      }
    }
  }

  .todos {
    padding: 20px;

    .empty-state {
      text-align: center;
      color: #999;
      padding: 40px 20px;
      font-size: 16px;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 6px;
      transition: background 0.2s;
      gap: 12px;

      &:hover {
        background: #f9f9f9;

        .delete-btn {
          opacity: 1;
        }
      }

      &.done {
        .title {
          text-decoration: line-through;
          opacity: 0.5;
        }
      }

      input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      .title {
        flex: 1;
        font-size: 16px;
      }

      .delete-btn {
        padding: 6px 10px;
        background: transparent;
        border: none;
        color: #ff6b6b;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 18px;

        &:hover {
          color: #ff5252;
        }
      }
    }
  }

  @media (max-width: 600px) {
    main {
      margin: 0;
      border-radius: 0;
      min-height: 100vh;
    }

    .header {
      padding: 20px;

      h1 {
        font-size: 24px;
      }
    }

    .filters {
      flex-direction: column;
      gap: 10px;

      button {
        width: 100%;

        &.undo-btn,
        &.clear-btn {
          margin-left: 0;
        }
      }
    }

    .input-section {
      flex-direction: column;

      .add-btn {
        width: 100%;
      }
    }
  }
</style>
