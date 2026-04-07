// User Registration Form Types
export interface UserFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  termsAccepted: boolean
}

// Task Form Types
export interface TaskFormData {
  title: string
  description: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  assignee: string
}

// Validation error type
export interface ValidationFieldError {
  field: string
  message: string
}

// Result wrapper for form submission
export interface FormResult {
  success: boolean
  data?: UserFormData | TaskFormData
  errors: ValidationFieldError[]
}
