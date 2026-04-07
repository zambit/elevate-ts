/**
 * Application environment: dependencies available to all handlers
 */
export interface AppEnv {
  kv: KVNamespace
  config: AppConfig
  logger: Logger
}

/**
 * Application configuration
 */
export interface AppConfig {
  environment: 'development' | 'production'
  apiBaseUrl: string
  cacheTtl: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Simple logger interface
 */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

/**
 * User data stored in KV
 */
export interface User {
  id: string
  name: string
  email: string
  createdAt: number
  role: 'admin' | 'user'
}

/**
 * Request context with user info
 */
export interface RequestContext {
  userId: string
  requestId: string
  timestamp: number
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: true
  data: T
  timestamp: number
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
  timestamp: number
}
