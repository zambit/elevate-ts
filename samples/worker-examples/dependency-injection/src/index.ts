import { getUserById, getAllUsers, createUser, isUserAdmin, logOperation } from './services.js'
import type { AppEnv, ApiResponse, ErrorResponse } from './types.js'

/**
 * Environment bindings for the worker
 */
export interface Env {
  USERS_KV: KVNamespace
  ENVIRONMENT?: string
}

/**
 * Simple logger implementation for Cloudflare Workers
 */
const createLogger = (env: 'development' | 'production') => ({
  debug: (message: string, data?: Record<string, unknown>) => {
    if (env === 'development') {
      console.log(`[DEBUG] ${message}`, data || '')
    }
  },
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(`[INFO] ${message}`, data || '')
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, data || '')
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, data || '')
  },
})

/**
 * Create AppEnv at request boundary
 * All downstream functions will use this environment
 */
const createAppEnv = (env: Env): AppEnv => ({
  kv: env.USERS_KV,
  logger: createLogger((env.ENVIRONMENT as any) || 'development'),
  config: {
    environment: (env.ENVIRONMENT as any) || 'development',
    apiBaseUrl: 'https://api.example.com',
    cacheTtl: 3600,
    logLevel: (env.ENVIRONMENT as any) === 'production' ? 'warn' : 'debug',
  },
})

/**
 * Helper to send JSON responses
 */
function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * GET /users
 * List all users using Reader-injected logger and KV
 */
async function handleGetUsers(appEnv: AppEnv): Promise<Response> {
  try {
    // Create Reader computation
    const getUsersReader = getAllUsers()

    // Run with injected environment
    const users = getUsersReader.run(appEnv)

    // Log the operation
    logOperation('Users listed', { count: users.length }).run(appEnv)

    const response: ApiResponse<any> = {
      success: true,
      data: users,
      timestamp: Date.now(),
    }

    return jsonResponse(response)
  } catch (error) {
    appEnv.logger.error('Failed to list users', { error: String(error) })
    const response: ErrorResponse = {
      success: false,
      error: { code: 'USERS_LIST_FAILED', message: 'Failed to list users' },
      timestamp: Date.now(),
    }
    return jsonResponse(response, 500)
  }
}

/**
 * GET /users/:id
 * Fetch a specific user and check admin status
 */
async function handleGetUser(id: string, appEnv: AppEnv): Promise<Response> {
  try {
    // Create Readers for user data and admin check
    const userReader = getUserById(id)
    const adminReader = isUserAdmin(id)

    // Run both with the same injected environment
    const user = userReader.run(appEnv)
    const isAdmin = adminReader.run(appEnv)

    if (!user) {
      const response: ErrorResponse = {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: `User ${id} not found` },
        timestamp: Date.now(),
      }
      return jsonResponse(response, 404)
    }

    // Log access (admin users can access logs)
    logOperation('User accessed', { userId: id, isAdmin }).run(appEnv)

    const response: ApiResponse<any> = {
      success: true,
      data: { user, isAdmin },
      timestamp: Date.now(),
    }

    return jsonResponse(response)
  } catch (error) {
    appEnv.logger.error(`Failed to fetch user ${id}`, { error: String(error) })
    const response: ErrorResponse = {
      success: false,
      error: { code: 'USER_FETCH_FAILED', message: 'Failed to fetch user' },
      timestamp: Date.now(),
    }
    return jsonResponse(response, 500)
  }
}

/**
 * POST /users
 * Create a new user
 */
async function handleCreateUser(request: Request, appEnv: AppEnv): Promise<Response> {
  try {
    const body = await request.json() as { id: string; name: string; email: string }

    if (!body.id || !body.name || !body.email) {
      const response: ErrorResponse = {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing required fields' },
        timestamp: Date.now(),
      }
      return jsonResponse(response, 400)
    }

    // Create user with injected environment
    const createUserReader = createUser(body.id, body.name, body.email)
    const user = createUserReader.run(appEnv)

    // Log the creation
    logOperation('User created', { userId: body.id }).run(appEnv)

    const response: ApiResponse<any> = {
      success: true,
      data: user,
      timestamp: Date.now(),
    }

    return jsonResponse(response, 201)
  } catch (error) {
    appEnv.logger.error('Failed to create user', { error: String(error) })
    const response: ErrorResponse = {
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create user' },
      timestamp: Date.now(),
    }
    return jsonResponse(response, 500)
  }
}

/**
 * Main request handler
 * Creates AppEnv once per request, all handlers use it via Reader
 */
export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    // Create the dependency environment at the request boundary
    const appEnv = createAppEnv(env)

    // Log incoming request
    appEnv.logger.info('Incoming request', {
      method: request.method,
      url: request.url,
    })

    try {
      const url = new URL(request.url)
      const path = url.pathname

      // Route based on path
      if (path === '/users' && request.method === 'GET') {
        return await handleGetUsers(appEnv)
      } else if (path.startsWith('/users/') && request.method === 'GET') {
        const id = path.slice('/users/'.length)
        return await handleGetUser(id, appEnv)
      } else if (path === '/users' && request.method === 'POST') {
        return await handleCreateUser(request, appEnv)
      } else {
        const response: ErrorResponse = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
          timestamp: Date.now(),
        }
        return jsonResponse(response, 404)
      }
    } catch (error) {
      appEnv.logger.error('Unhandled request error', { error: String(error) })
      const response: ErrorResponse = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        timestamp: Date.now(),
      }
      return jsonResponse(response, 500)
    }
  },
}
