/**
 * Counter state stored in KV
 */
export interface CounterState {
  readonly value: number
  readonly timestamp: number
  readonly increments: number
}

/**
 * API Response format
 */
export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
}

/**
 * Error response
 */
export interface ErrorResponse {
  readonly success: false
  readonly error: string
}
