/**
 * API Error types
 */
export type ApiError =
  | { type: 'invalid_input'; message: string }
  | { type: 'unauthorized'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'internal_error'; message: string }
  | { type: 'external_service_error'; message: string }

/**
 * User representation in the system
 */
export interface User {
  id: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  email: string
}

/**
 * Request payload for document processing
 */
export interface DocumentRequest {
  title: string
  content: string
  userId: string
}

/**
 * Processed document stored in KV
 */
export interface ProcessedDocument {
  id: string
  title: string
  content: string
  userId: string
  wordCount: number
  createdAt: number
  updatedAt: number
}

/**
 * Authentication context
 */
export interface AuthContext {
  user: User
  token: string
  expiresAt: number
}

/**
 * Pipeline context passed through chain
 */
export interface PipelineContext {
  auth: AuthContext
  request: DocumentRequest
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ErrorResponse {
  success: false
  error: {
    type: string
    message: string
  }
}
