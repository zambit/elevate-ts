import { describe, it, expect } from 'vitest'
import { Validation } from 'elevate-ts'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateName,
  validateTerms,
  validateUserForm,
  validateTaskTitle,
  validateTaskDescription,
  validateTaskDueDate,
  validateTaskPriority,
  validateTaskAssignee,
  validateTaskForm
} from '../src/validators.js'
import type { UserFormData, TaskFormData } from '../src/types.js'

describe('User Form Validators', () => {
  describe('validateEmail', () => {
    it('should fail when email is empty', () => {
      const result = validateEmail('')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].field).toBe('email')
      }
    })

    it('should fail when email is invalid format', () => {
      const result = validateEmail('invalid-email')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].field).toBe('email')
      }
    })

    it('should succeed when email is valid', () => {
      const result = validateEmail('user@example.com')
      expect(Validation.isSuccess(result)).toBe(true)
      if (Validation.isSuccess(result)) {
        expect(result.value).toBe('user@example.com')
      }
    })
  })

  describe('validatePassword', () => {
    it('should fail when password is empty', () => {
      const result = validatePassword('')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when password is too short', () => {
      const result = validatePassword('short')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].message).toContain('8 characters')
      }
    })

    it('should succeed when password is 8+ characters', () => {
      const result = validatePassword('validpass123')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validatePasswordConfirm', () => {
    it('should fail when confirm password is empty', () => {
      const result = validatePasswordConfirm('password123', '')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when passwords do not match', () => {
      const result = validatePasswordConfirm('password123', 'different456')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].message).toContain('do not match')
      }
    })

    it('should succeed when passwords match', () => {
      const result = validatePasswordConfirm('password123', 'password123')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateName', () => {
    it('should fail when name is empty', () => {
      const result = validateName('', 'firstName')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when name is too short', () => {
      const result = validateName('J', 'firstName')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].message).toContain('2 characters')
      }
    })

    it('should succeed when name is valid', () => {
      const result = validateName('John', 'firstName')
      expect(Validation.isSuccess(result)).toBe(true)
    })

    it('should include correct field name in error', () => {
      const result = validateName('', 'lastName')
      if (Validation.isFailure(result)) {
        expect(result.errors[0].field).toBe('lastName')
      }
    })
  })

  describe('validateTerms', () => {
    it('should fail when terms not accepted', () => {
      const result = validateTerms(false)
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should succeed when terms accepted', () => {
      const result = validateTerms(true)
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateUserForm', () => {
    it('should collect multiple validation errors', () => {
      const form: UserFormData = {
        email: 'invalid',
        password: 'short',
        confirmPassword: 'other',
        firstName: 'J',
        lastName: '',
        termsAccepted: false
      }

      const result = validateUserForm(form)
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors.length).toBeGreaterThan(1)
      }
    })

    it('should succeed with valid user data', () => {
      const form: UserFormData = {
        email: 'user@example.com',
        password: 'validpass123',
        confirmPassword: 'validpass123',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true
      }

      const result = validateUserForm(form)
      expect(Validation.isSuccess(result)).toBe(true)
      if (Validation.isSuccess(result)) {
        expect(result.value).toEqual(form)
      }
    })
  })
})

describe('Task Form Validators', () => {
  describe('validateTaskTitle', () => {
    it('should fail when title is empty', () => {
      const result = validateTaskTitle('')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when title is too short', () => {
      const result = validateTaskTitle('ab')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].message).toContain('3 characters')
      }
    })

    it('should succeed when title is valid', () => {
      const result = validateTaskTitle('Task Title')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateTaskDescription', () => {
    it('should fail when description is empty', () => {
      const result = validateTaskDescription('')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when description is too short', () => {
      const result = validateTaskDescription('short')
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors[0].message).toContain('10 characters')
      }
    })

    it('should succeed when description is valid', () => {
      const result = validateTaskDescription('This is a valid description')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateTaskDueDate', () => {
    it('should fail when due date is empty', () => {
      const result = validateTaskDueDate('')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should fail when due date is invalid', () => {
      const result = validateTaskDueDate('invalid-date')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should succeed when due date is valid', () => {
      const result = validateTaskDueDate('2026-12-31')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateTaskPriority', () => {
    it('should fail when priority is invalid', () => {
      const result = validateTaskPriority('urgent')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should succeed with valid priorities', () => {
      expect(Validation.isSuccess(validateTaskPriority('low'))).toBe(true)
      expect(Validation.isSuccess(validateTaskPriority('medium'))).toBe(true)
      expect(Validation.isSuccess(validateTaskPriority('high'))).toBe(true)
    })
  })

  describe('validateTaskAssignee', () => {
    it('should fail when assignee is empty', () => {
      const result = validateTaskAssignee('')
      expect(Validation.isFailure(result)).toBe(true)
    })

    it('should succeed when assignee is provided', () => {
      const result = validateTaskAssignee('Jane Doe')
      expect(Validation.isSuccess(result)).toBe(true)
    })
  })

  describe('validateTaskForm', () => {
    it('should collect multiple validation errors', () => {
      const form: TaskFormData = {
        title: 'ab',
        description: 'short',
        dueDate: '',
        priority: 'invalid' as any,
        assignee: ''
      }

      const result = validateTaskForm(form)
      expect(Validation.isFailure(result)).toBe(true)
      if (Validation.isFailure(result)) {
        expect(result.errors.length).toBeGreaterThan(1)
      }
    })

    it('should succeed with valid task data', () => {
      const form: TaskFormData = {
        title: 'Implement Feature',
        description: 'This is a detailed task description',
        dueDate: '2026-12-31',
        priority: 'high',
        assignee: 'Jane Doe'
      }

      const result = validateTaskForm(form)
      expect(Validation.isSuccess(result)).toBe(true)
      if (Validation.isSuccess(result)) {
        expect(result.value).toEqual(form)
      }
    })
  })
})
