import { Validation } from 'elevate-ts'
import type { UserFormData, TaskFormData, ValidationFieldError } from './types.js'

// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
const isValidPassword = (password: string): boolean => {
  return password.length >= 8
}

// Date validation
const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

// User form validators
export const validateEmail = (email: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!email.trim()) {
    return Validation.Failure([{ field: 'email', message: 'Email is required' }])
  }
  if (!isValidEmail(email)) {
    return Validation.Failure([{ field: 'email', message: 'Email must be valid' }])
  }
  return Validation.Success(email)
}

export const validatePassword = (password: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!password) {
    return Validation.Failure([{ field: 'password', message: 'Password is required' }])
  }
  if (!isValidPassword(password)) {
    return Validation.Failure([{ field: 'password', message: 'Password must be at least 8 characters' }])
  }
  return Validation.Success(password)
}

export const validatePasswordConfirm = (
  password: string,
  confirmPassword: string
): Validation.Validation<ValidationFieldError[], string> => {
  if (!confirmPassword) {
    return Validation.Failure([{ field: 'confirmPassword', message: 'Confirm password is required' }])
  }
  if (password !== confirmPassword) {
    return Validation.Failure([{ field: 'confirmPassword', message: 'Passwords do not match' }])
  }
  return Validation.Success(confirmPassword)
}

export const validateName = (name: string, fieldName: 'firstName' | 'lastName'): Validation.Validation<ValidationFieldError[], string> => {
  if (!name.trim()) {
    return Validation.Failure([{ field: fieldName, message: `${fieldName === 'firstName' ? 'First' : 'Last'} name is required` }])
  }
  if (name.length < 2) {
    return Validation.Failure([{ field: fieldName, message: `${fieldName === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters` }])
  }
  return Validation.Success(name)
}

export const validateTerms = (accepted: boolean): Validation.Validation<ValidationFieldError[], boolean> => {
  if (!accepted) {
    return Validation.Failure([{ field: 'termsAccepted', message: 'You must accept the terms' }])
  }
  return Validation.Success(true)
}

// Combine user form validation
export const validateUserForm = (form: UserFormData): Validation.Validation<ValidationFieldError[], UserFormData> => {
  const emailValidation = validateEmail(form.email)
  const passwordValidation = validatePassword(form.password)
  const confirmValidation = validatePasswordConfirm(form.password, form.confirmPassword)
  const firstNameValidation = validateName(form.firstName, 'firstName')
  const lastNameValidation = validateName(form.lastName, 'lastName')
  const termsValidation = validateTerms(form.termsAccepted)

  // Collect all errors
  const allErrors: ValidationFieldError[] = []

  if (Validation.isFailure(emailValidation)) {
    allErrors.push(...emailValidation.errors)
  }
  if (Validation.isFailure(passwordValidation)) {
    allErrors.push(...passwordValidation.errors)
  }
  if (Validation.isFailure(confirmValidation)) {
    allErrors.push(...confirmValidation.errors)
  }
  if (Validation.isFailure(firstNameValidation)) {
    allErrors.push(...firstNameValidation.errors)
  }
  if (Validation.isFailure(lastNameValidation)) {
    allErrors.push(...lastNameValidation.errors)
  }
  if (Validation.isFailure(termsValidation)) {
    allErrors.push(...termsValidation.errors)
  }

  if (allErrors.length > 0) {
    return Validation.Failure(allErrors)
  }

  return Validation.Success(form)
}

// Task form validators
export const validateTaskTitle = (title: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!title.trim()) {
    return Validation.Failure([{ field: 'title', message: 'Task title is required' }])
  }
  if (title.length < 3) {
    return Validation.Failure([{ field: 'title', message: 'Task title must be at least 3 characters' }])
  }
  return Validation.Success(title)
}

export const validateTaskDescription = (description: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!description.trim()) {
    return Validation.Failure([{ field: 'description', message: 'Description is required' }])
  }
  if (description.length < 10) {
    return Validation.Failure([{ field: 'description', message: 'Description must be at least 10 characters' }])
  }
  return Validation.Success(description)
}

export const validateTaskDueDate = (dueDate: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!dueDate) {
    return Validation.Failure([{ field: 'dueDate', message: 'Due date is required' }])
  }
  if (!isValidDate(dueDate)) {
    return Validation.Failure([{ field: 'dueDate', message: 'Due date must be valid' }])
  }
  return Validation.Success(dueDate)
}

export const validateTaskAssignee = (assignee: string): Validation.Validation<ValidationFieldError[], string> => {
  if (!assignee.trim()) {
    return Validation.Failure([{ field: 'assignee', message: 'Assignee is required' }])
  }
  return Validation.Success(assignee)
}

export const validateTaskPriority = (priority: string): Validation.Validation<ValidationFieldError[], string> => {
  const validPriorities = ['low', 'medium', 'high']
  if (!validPriorities.includes(priority)) {
    return Validation.Failure([{ field: 'priority', message: 'Priority must be low, medium, or high' }])
  }
  return Validation.Success(priority)
}

// Combine task form validation
export const validateTaskForm = (form: TaskFormData): Validation.Validation<ValidationFieldError[], TaskFormData> => {
  const titleValidation = validateTaskTitle(form.title)
  const descriptionValidation = validateTaskDescription(form.description)
  const dueDateValidation = validateTaskDueDate(form.dueDate)
  const priorityValidation = validateTaskPriority(form.priority)
  const assigneeValidation = validateTaskAssignee(form.assignee)

  // Collect all errors
  const allErrors: ValidationFieldError[] = []

  if (Validation.isFailure(titleValidation)) {
    allErrors.push(...titleValidation.errors)
  }
  if (Validation.isFailure(descriptionValidation)) {
    allErrors.push(...descriptionValidation.errors)
  }
  if (Validation.isFailure(dueDateValidation)) {
    allErrors.push(...dueDateValidation.errors)
  }
  if (Validation.isFailure(priorityValidation)) {
    allErrors.push(...priorityValidation.errors)
  }
  if (Validation.isFailure(assigneeValidation)) {
    allErrors.push(...assigneeValidation.errors)
  }

  if (allErrors.length > 0) {
    return Validation.Failure(allErrors)
  }

  return Validation.Success(form)
}
