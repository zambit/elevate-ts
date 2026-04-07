<script lang="ts">
  import { increment, decrement, undo, reset, type CounterState } from './state-machine.js'
  import './styles/tokens.css'
  import Counter from './components/Counter.svelte'
  import History from './components/History.svelte'
  import Actions from './components/Actions.svelte'

  let state: CounterState = {
    current: 0,
    history: []
  }

  const handleIncrement = () => {
    const [newState] = increment(1).run(state)
    state = newState
  }

  const handleDecrement = () => {
    const [newState] = decrement(1).run(state)
    state = newState
  }

  const handleUndo = () => {
    if (state.history.length > 0) {
      const [newState] = undo().run(state)
      state = newState
    }
  }

  const handleReset = () => {
    const [newState] = reset().run(state)
    state = newState
  }
</script>

<main>
  <header>
    <h1>State Counter with Undo/Redo</h1>
    <p class="subtitle">Pure stateful computation using the State monad</p>
  </header>

  <Counter current={state.current} />

  <Actions
    onIncrement={handleIncrement}
    onDecrement={handleDecrement}
    onUndo={handleUndo}
    onReset={handleReset}
    canUndo={state.history.length > 0}
  />

  <History {state} />
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-neutral-50);
  }

  header {
    padding: var(--spacing-8);
    border-bottom: 2px solid var(--color-neutral-200);
    background-color: white;
  }

  h1 {
    margin: 0 0 var(--spacing-2) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .subtitle {
    margin: 0;
    color: var(--color-neutral-500);
    font-size: var(--font-size-sm);
  }
</style>
