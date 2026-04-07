import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte/svelte5'
import userEvent from '@testing-library/user-event'
import UserForm from '../src/components/UserForm.svelte'
import TaskForm from '../src/components/TaskForm.svelte'
import FormToggle from '../src/components/FormToggle.svelte'

describe('UserForm Component', () => {
  beforeEach(() => {
    render(UserForm)
  })

  it('should render all form fields', () => {
    expect(screen.getByLabelText(/first name/i)).toBeTruthy()
    expect(screen.getByLabelText(/last name/i)).toBeTruthy()
    expect(screen.getByLabelText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText(/^password/i)).toBeTruthy()
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy()
    expect(screen.getByLabelText(/terms/i)).toBeTruthy()
  })

  it('should render submit and clear buttons', () => {
    expect(screen.getByRole('button', { name: /register/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy()
  })

  it('should show validation errors on invalid submission', async () => {
    const submitBtn = screen.getByRole('button', { name: /register/i })
    await fireEvent.click(submitBtn)

    // Check that at least some error messages appear
    const alerts = screen.getAllByText(/required|must be/i)
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should clear form when clear button is clicked', async () => {
    const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement
    const clearBtn = screen.getByRole('button', { name: /clear/i })

    await fireEvent.change(firstNameInput, { target: { value: 'John' } })
    expect(firstNameInput.value).toBe('John')

    await fireEvent.click(clearBtn)
    expect(firstNameInput.value).toBe('')
  })

  it('should validate email format', async () => {
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /register/i })

    await fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    await fireEvent.click(submitBtn)

    const errorMsg = screen.getByText(/email must be valid/i)
    expect(errorMsg).toBeTruthy()
  })

  it('should validate password length', async () => {
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /register/i })

    await fireEvent.change(passwordInput, { target: { value: 'short' } })
    await fireEvent.click(submitBtn)

    const errorMsg = screen.getByText(/at least 8 characters/i)
    expect(errorMsg).toBeTruthy()
  })

  it('should validate password confirmation', async () => {
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement
    const confirmInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /register/i })

    await fireEvent.change(passwordInput, { target: { value: 'validpass123' } })
    await fireEvent.change(confirmInput, { target: { value: 'different123' } })
    await fireEvent.click(submitBtn)

    const errorMsg = screen.getByText(/do not match/i)
    expect(errorMsg).toBeTruthy()
  })

  it('should accept valid form submission', async () => {
    const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement
    const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement
    const confirmInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement
    const termsCheckbox = screen.getByLabelText(/terms/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /register/i })

    await fireEvent.change(firstNameInput, { target: { value: 'John' } })
    await fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    await fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    await fireEvent.change(passwordInput, { target: { value: 'validpass123' } })
    await fireEvent.change(confirmInput, { target: { value: 'validpass123' } })
    await fireEvent.change(termsCheckbox, { target: { checked: true } })

    await fireEvent.click(submitBtn)

    // Success dialog should appear
    const successMsg = screen.getByText(/registration successful/i)
    expect(successMsg).toBeTruthy()
  })
})

describe('TaskForm Component', () => {
  beforeEach(() => {
    render(TaskForm)
  })

  it('should render all form fields', () => {
    expect(screen.getByLabelText(/task title/i)).toBeTruthy()
    expect(screen.getByLabelText(/description/i)).toBeTruthy()
    expect(screen.getByLabelText(/due date/i)).toBeTruthy()
    expect(screen.getByLabelText(/priority/i)).toBeTruthy()
    expect(screen.getByLabelText(/assignee/i)).toBeTruthy()
  })

  it('should render submit and clear buttons', () => {
    expect(screen.getByRole('button', { name: /create task/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy()
  })

  it('should show validation errors on invalid submission', async () => {
    const submitBtn = screen.getByRole('button', { name: /create task/i })
    await fireEvent.click(submitBtn)

    const alerts = screen.getAllByText(/required|must be/i)
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should validate title length', async () => {
    const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /create task/i })

    await fireEvent.change(titleInput, { target: { value: 'ab' } })
    await fireEvent.click(submitBtn)

    const errorMsg = screen.getByText(/3 characters/i)
    expect(errorMsg).toBeTruthy()
  })

  it('should validate description length', async () => {
    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    const submitBtn = screen.getByRole('button', { name: /create task/i })

    await fireEvent.change(descInput, { target: { value: 'short' } })
    await fireEvent.click(submitBtn)

    const errorMsg = screen.getByText(/10 characters/i)
    expect(errorMsg).toBeTruthy()
  })

  it('should validate priority selection', async () => {
    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement
    expect(prioritySelect.value).toBe('medium')
  })

  it('should accept valid form submission', async () => {
    const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement
    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement
    const assigneeInput = screen.getByLabelText(/assignee/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /create task/i })

    await fireEvent.change(titleInput, { target: { value: 'Implement Feature' } })
    await fireEvent.change(descInput, { target: { value: 'This is a detailed task description' } })
    await fireEvent.change(dueDateInput, { target: { value: '2026-12-31' } })
    await fireEvent.change(assigneeInput, { target: { value: 'Jane Doe' } })

    await fireEvent.click(submitBtn)

    const successMsg = screen.getByText(/task created/i)
    expect(successMsg).toBeTruthy()
  })
})

describe('FormToggle Component', () => {
  it('should toggle between forms', async () => {
    const { container } = render(FormToggle, { props: { activeForm: 'user' } })

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)

    const userBtn = buttons[0]
    const taskBtn = buttons[1]

    expect(userBtn).toHaveClass('active')
    expect(taskBtn).not.toHaveClass('active')
  })

  it('should update active form when button is clicked', async () => {
    const { component } = render(FormToggle, { props: { activeForm: 'user' } })

    const buttons = screen.getAllByRole('button')
    const taskBtn = buttons[1]

    await fireEvent.click(taskBtn)

    expect(taskBtn).toHaveClass('active')
  })
})
