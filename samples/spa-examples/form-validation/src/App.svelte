<script lang="ts">
  import FormToggle from './components/FormToggle.svelte'
  import UserForm from './components/UserForm.svelte'
  import TaskForm from './components/TaskForm.svelte'
  import './styles/tokens.css'

  let activeForm: 'user' | 'task' = 'user'
</script>

<main>
  <FormToggle bind:activeForm />
  {#if activeForm === 'user'}
    <UserForm />
  {:else if activeForm === 'task'}
    <TaskForm />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  main {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--color-neutral-50);
  }
</style>
