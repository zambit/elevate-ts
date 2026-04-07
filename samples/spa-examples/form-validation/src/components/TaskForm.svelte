<script lang="ts">
  import { Validation } from 'elevate-ts'
  import ErrorDisplay from './ErrorDisplay.svelte'
  import SuccessDisplay from './SuccessDisplay.svelte'
  import { validateTaskForm } from '../validators.js'
  import type { TaskFormData, ValidationFieldError } from '../types.js'

  let title: string = ''
  let description: string = ''
  let dueDate: string = ''
  let priority: 'low' | 'medium' | 'high' = 'medium'
  let assignee: string = ''
  let errors: ValidationFieldError[] = []
  let showSuccess: boolean = false

  const handleSubmit = (e: Event) => {
    e.preventDefault()

    const formData: TaskFormData = {
      title,
      description,
      dueDate,
      priority,
      assignee
    }

    const result = validateTaskForm(formData)

    if (Validation.isFailure(result)) {
      errors = result.errors
      showSuccess = false
    } else if (Validation.isSuccess(result)) {
      errors = []
      showSuccess = true
      // Reset form
      title = ''
      description = ''
      dueDate = ''
      priority = 'medium'
      assignee = ''
    }
  }

  const handleReset = () => {
    title = ''
    description = ''
    dueDate = ''
    priority = 'medium'
    assignee = ''
    errors = []
    showSuccess = false
  }
</script>

<div class="form-container">
  <h1 class="form-title">Create Task</h1>
  <p class="form-subtitle">Add a new task to your project</p>

  <form on:submit={handleSubmit} class="form">
    <div class="form-group">
      <label for="title" class="form-label">Task Title</label>
      <input
        type="text"
        id="title"
        class="form-input"
        bind:value={title}
        placeholder="Implement feature X"
      />
      <ErrorDisplay {errors} fieldName="title" />
    </div>

    <div class="form-group">
      <label for="description" class="form-label">Description</label>
      <textarea
        id="description"
        class="form-textarea"
        bind:value={description}
        placeholder="Provide detailed description of the task..."
        rows="4"
      ></textarea>
      <ErrorDisplay {errors} fieldName="description" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="dueDate" class="form-label">Due Date</label>
        <input type="date" id="dueDate" class="form-input" bind:value={dueDate} />
        <ErrorDisplay {errors} fieldName="dueDate" />
      </div>

      <div class="form-group">
        <label for="priority" class="form-label">Priority</label>
        <select id="priority" class="form-select" bind:value={priority}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <ErrorDisplay {errors} fieldName="priority" />
      </div>
    </div>

    <div class="form-group">
      <label for="assignee" class="form-label">Assignee</label>
      <input
        type="text"
        id="assignee"
        class="form-input"
        bind:value={assignee}
        placeholder="Jane Doe"
      />
      <ErrorDisplay {errors} fieldName="assignee" />
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Create Task</button>
      <button type="button" class="btn btn-secondary" on:click={handleReset}>Clear</button>
    </div>
  </form>
</div>

<SuccessDisplay bind:show={showSuccess} title="Task Created!" message="Your task has been added successfully." />

<style>
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--spacing-8);
  }

  .form-title {
    margin: 0 0 var(--spacing-2) 0;
    color: var(--color-neutral-900);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .form-subtitle {
    margin: 0 0 var(--spacing-8) 0;
    color: var(--color-neutral-600);
    font-size: var(--font-size-base);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
  }

  .form-label {
    color: var(--color-neutral-700);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--color-neutral-300);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-base);
    font-family: var(--font-sans);
    transition: border-color var(--transition-fast);
  }

  .form-input,
  .form-select {
    width: 100%;
  }

  .form-textarea {
    width: 100%;
    resize: vertical;
    font-family: var(--font-sans);
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .form-actions {
    display: flex;
    gap: var(--spacing-4);
    margin-top: var(--spacing-4);
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-6);
    border: none;
    border-radius: var(--radius-lg);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-primary {
    background-color: var(--color-primary);
    color: white;
    flex: 1;
  }

  .btn-primary:hover {
    background-color: var(--color-primary-dark);
  }

  .btn-secondary {
    background-color: var(--color-neutral-200);
    color: var(--color-neutral-700);
    flex: 1;
  }

  .btn-secondary:hover {
    background-color: var(--color-neutral-300);
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
