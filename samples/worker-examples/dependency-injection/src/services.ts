import { Reader } from 'elevate-ts'
import type { AppEnv, User, Logger } from './types.js'

/**
 * Service layer: all functions use Reader to access dependencies
 * No parameter threading - dependencies injected at request boundary
 */

/**
 * Get the logger from the environment
 */
export const getLogger = (): Reader.Reader<AppEnv, Logger> =>
  Reader.asks((env: AppEnv) => env.logger)

/**
 * Get the KV namespace from the environment
 */
export const getKv = (): Reader.Reader<AppEnv, KVNamespace> =>
  Reader.asks((env: AppEnv) => env.kv)

/**
 * Get the config from the environment
 */
export const getConfig = (): Reader.Reader<AppEnv, AppEnv['config']> =>
  Reader.asks((env: AppEnv) => env.config)

/**
 * Fetch a user from KV by ID
 * Demonstrates: ask for KV, use it, log the operation
 */
export const getUserById = (userId: string): Reader.Reader<AppEnv, User | null> =>
  Reader.Reader((env) => {
    // Log the fetch attempt
    env.logger.debug(`Fetching user: ${userId}`)

    // Simulate fetching from KV (in reality would be async)
    // For this example, we return a synthetic user
    const user: User = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: Date.now() - 86400000, // 1 day ago
      role: 'user',
    }

    return user
  })

/**
 * Create a new user and store in KV
 * Demonstrates: ask for config, kv, and logger without parameters
 */
export const createUser = (id: string, name: string, email: string): Reader.Reader<AppEnv, User> =>
  Reader.Reader((env) => {
    // Create the user object
    const user: User = {
      id,
      name,
      email,
      createdAt: Date.now(),
      role: 'user',
    }

    // Log the creation (would normally be async)
    if (env.config.logLevel === 'debug' || env.config.logLevel === 'info') {
      env.logger.info(`User created: ${id}`, { name, email })
    }

    // Would store in KV (simulated here)
    // env.kv.put(id, JSON.stringify(user))

    return user
  })

/**
 * Get all users (simulated)
 * Demonstrates: compose multiple dependency accesses
 */
export const getAllUsers = (): Reader.Reader<AppEnv, User[]> =>
  Reader.Reader((env) => {
    env.logger.debug('Fetching all users')

    // Return simulated users
    return [
      {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: Date.now() - 172800000,
        role: 'admin',
      },
      {
        id: '2',
        name: 'Bob',
        email: 'bob@example.com',
        createdAt: Date.now() - 86400000,
        role: 'user',
      },
    ]
  })

/**
 * Check if user is admin
 * Demonstrates: ask for logger, call other Reader functions
 */
export const isUserAdmin = (userId: string): Reader.Reader<AppEnv, boolean> =>
  Reader.chain((user: User | null) => {
    if (!user) {
      return Reader.Reader<AppEnv, boolean>(() => false)
    }

    return Reader.Reader<AppEnv, boolean>((env: AppEnv) => {
      env.logger.debug(`User ${userId} role check: ${user.role}`)
      return user.role === 'admin'
    })
  })(getUserById(userId))

/**
 * Get user with enriched data
 * Demonstrates: Reader composition - combine multiple asks
 */
export const getUserWithContext = (userId: string): Reader.Reader<AppEnv, { user: User | null; canLog: boolean }> =>
  Reader.chain((isAdmin: boolean) => {
    return Reader.map((user: User | null) => ({
      user,
      canLog: isAdmin, // Admins can see logs
    }))(getUserById(userId))
  })(isUserAdmin(userId))

/**
 * Log an operation with automatic context
 * Demonstrates: logger is always available via ask
 */
export const logOperation = (operation: string, data?: Record<string, unknown>): Reader.Reader<AppEnv, void> =>
  Reader.Reader((env) => {
    const timestamp = new Date().toISOString()
    env.logger.info(`[${timestamp}] ${operation}`, data)
  })

/**
 * Get the cache TTL from config
 * Demonstrates: simple asks for a single config value
 */
export const getCacheTtl = (): Reader.Reader<AppEnv, number> =>
  Reader.asks((env: AppEnv) => env.config.cacheTtl)

/**
 * Create a caching layer that respects config
 * Demonstrates: chaining asks to build higher-level abstractions
 */
export const getCachedUser = (userId: string): Reader.Reader<AppEnv, { user: User | null; cached: boolean }> =>
  Reader.chain((ttl: number) => {
    // Simulate cache check (would use KV in reality)
    const isCached = ttl > 0

    return Reader.map((user: User | null) => ({
      user,
      cached: isCached,
    }))(getUserById(userId))
  })(getCacheTtl())
