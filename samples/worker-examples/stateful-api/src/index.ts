import { increment, decrement, reset, getState, addDelta, initialState } from './state-logic.js'
import type { CounterState, ApiResponse, ErrorResponse } from './types.js'

interface Env {
  COUNTER_KV: KVNamespace
}

/**
 * KV key for storing counter state
 */
const COUNTER_KEY = 'counter:main'

/**
 * Parse JSON body from request
 */
async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/**
 * Fetch counter state from KV, or return initial state
 */
async function loadState(kv: KVNamespace): Promise<CounterState> {
  const stored = await kv.get(COUNTER_KEY)
  if (!stored) return initialState
  try {
    return JSON.parse(stored) as CounterState
  } catch {
    return initialState
  }
}

/**
 * Save counter state to KV
 */
async function saveState(kv: KVNamespace, state: CounterState): Promise<void> {
  await kv.put(COUNTER_KEY, JSON.stringify(state))
}

/**
 * GET /counter - Get current counter value
 */
async function handleGet(env: Env): Promise<Response> {
  const state = await loadState(env.COUNTER_KV)
  const response: ApiResponse<CounterState> = {
    success: true,
    data: state
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * POST /counter/increment - Increment counter
 */
async function handleIncrement(request: Request, env: Env): Promise<Response> {
  const body = (await parseJson<{ amount: number }>(request)) ?? { amount: 1 }
  const amount = Math.max(0, body.amount ?? 1)

  const state = await loadState(env.COUNTER_KV)
  const [newState] = increment(amount).run(state)
  await saveState(env.COUNTER_KV, newState)

  const response: ApiResponse<CounterState> = {
    success: true,
    data: newState
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * POST /counter/decrement - Decrement counter
 */
async function handleDecrement(request: Request, env: Env): Promise<Response> {
  const body = (await parseJson<{ amount: number }>(request)) ?? { amount: 1 }
  const amount = Math.max(0, body.amount ?? 1)

  const state = await loadState(env.COUNTER_KV)
  const [newState] = decrement(amount).run(state)
  await saveState(env.COUNTER_KV, newState)

  const response: ApiResponse<CounterState> = {
    success: true,
    data: newState
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * POST /counter/reset - Reset counter to 0
 */
async function handleReset(env: Env): Promise<Response> {
  const [newState] = reset().run(initialState)
  await saveState(env.COUNTER_KV, newState)

  const response: ApiResponse<CounterState> = {
    success: true,
    data: newState
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * POST /counter/set - Set counter to specific value
 */
async function handleSet(request: Request, env: Env): Promise<Response> {
  const body = (await parseJson<{ value: number }>(request))
  if (!body || typeof body.value !== 'number') {
    const error: ErrorResponse = {
      success: false,
      error: 'Missing or invalid "value" in request body'
    }
    return new Response(JSON.stringify(error), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const state = await loadState(env.COUNTER_KV)
  const delta = body.value - state.value
  const [newState] = addDelta(delta).run(state)
  await saveState(env.COUNTER_KV, newState)

  const response: ApiResponse<CounterState> = {
    success: true,
    data: newState
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Main Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // Route requests
    if (path === '/counter' && method === 'GET') {
      return handleGet(env)
    }

    if (path === '/counter/increment' && method === 'POST') {
      return handleIncrement(request, env)
    }

    if (path === '/counter/decrement' && method === 'POST') {
      return handleDecrement(request, env)
    }

    if (path === '/counter/reset' && method === 'POST') {
      return handleReset(env)
    }

    if (path === '/counter/set' && method === 'POST') {
      return handleSet(request, env)
    }

    // 404
    const error: ErrorResponse = {
      success: false,
      error: `Not Found: ${path}`
    }
    return new Response(JSON.stringify(error), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
