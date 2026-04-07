<script lang="ts">
  import { Validation } from 'elevate-ts'
  import ErrorDisplay from './ErrorDisplay.svelte'
  import SuccessDisplay from './SuccessDisplay.svelte'
  import { validateUserForm } from '../validators.js'
  import type { UserFormData, ValidationFieldError } from '../types.js'

  let email: string = ''
  let password: string = ''
  let confirmPassword: string = ''
  let firstName: string = ''
  let lastName: string = ''
  let termsAccepted: boolean = false
  let errors: ValidationFieldError[] = []
  let showSuccess: boolean = false

  const handleSubmit = (e: Event) => {
    e.preventDefault()

    const formData: UserFormData = {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      termsAccepted
    }

    const result = validateUserForm(formData)

    if (Validation.isFailure(result)) {
      errors = result.errors
      showSuccess = false
    } else if (Validation.isSuccess(result)) {
      errors = []
      showSuccess = true
      // Reset form
      email = ''
      password = ''
      confirmPassword = ''
      firstName = ''
      lastName = ''
      termsAccepted = false
    }
  }

  const handleReset = () => {
    email = ''
    password = ''
    confirmPassword = ''
    firstName = ''
    lastName = ''
    termsAccepted = false
    errors = []
    showSuccess = false
  }
</script>

<div class="form-container">
  <h1 class="form-title">User Registration</h1>
  <p class="form-subtitle">Create a new account by filling out the form below</p>

  <form on:submit={handleSubmit} class="form">
    <div class="form-group">
      <label for="firstName" class="form-label">First Name</label>
      <input
        type="text"
        id="firstName"
        class="form-input"
        bind:value={firstName}
        placeholder="John"
      />
      <ErrorDisplay {errors} fieldName="firstName" />
    </div>

    <div class="form-group">
      <label for="lastName" class="form-label">Last Name</label>
      <input
        type="text"
        id="lastName"
        class="form-input"
        bind:value={lastName}
        placeholder="Doe"
      />
      <ErrorDisplay {errors} fieldName="lastName" />
    </div>

    <div class="form-group">
      <label for="email" class="form-label">Email</label>
      <input
        type="email"
        id="email"
        class="form-input"
        bind:value={email}
        placeholder="john@example.com"
      />
      <ErrorDisplay {errors} fieldName="email" />
    </div>

    <div class="form-group">
      <label for="password" class="form-label">Password</label>
      <input
        type="password"
        id="password"
        class="form-input"
        bind:value={password}
        placeholder="••••••••"
      />
      <ErrorDisplay {errors} fieldName="password" />
    </div>

    <div class="form-group">
      <label for="confirmPassword" class="form-label">Confirm Password</label>
      <input
        type="password"
        id="confirmPassword"
        class="form-input"
        bind:value={confirmPassword}
        placeholder="••••••••"
      />
      <ErrorDisplay {errors} fieldName="confirmPassword" />
    </div>

    <div class="form-group checkbox">
      <input
        type="checkbox"
        id="termsAccepted"
        class="form-checkbox"
        bind:checked={termsAccepted}
      />
      <label for="termsAccepted" class="checkbox-label">
        I agree to the terms and conditions
      </label>
      <ErrorDisplay {errors} fieldName="termsAccepted" />
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Register</button>
      <button type="button" class="btn btn-secondary" on:click={handleReset}>Clear</button>
    </div>
  </form>
</div>

<SuccessDisplay bind:show={showSuccess} title="Registration Successful!" message="Your account has been created." />

<style>
  .form-container {
    max-width: 500px;
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

  .form-group.checkbox {
    flex-direction: row;
    align-items: flex-start;
  }

  .form-label {
    color: var(--color-neutral-700);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .checkbox-label {
    color: var(--color-neutral-700);
    font-size: var(--font-size-sm);
  }

  .form-input,
  .form-checkbox {
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--color-neutral-300);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-base);
    font-family: var(--font-sans);
    transition: border-color var(--transition-fast);
  }

  .form-input {
    width: 100%;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .form-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
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
</style>
