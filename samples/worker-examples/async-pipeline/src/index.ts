import { processingPipeline } from './pipeline-logic.js'
import type { ApiResponse, ErrorResponse, DocumentRequest } from './types.js'

/**
 * Environment bindings for the worker
 */
export interface Env {
  DOCUMENTS_KV: KVNamespace
}

/**
 * Parse JSON request body with error handling
 */
async function parseJson<T>(request: Request): Promise<T> {
  const body = await request.text()
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  return auth || null
}

/**
 * Success response wrapper
 */
function successResponse<T>(data: T, status = 200): Response {
  const response: ApiResponse<T> = { success: true, data }
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Error response wrapper
 */
function errorResponse(
  type: string,
  message: string,
  status = 400
): Response {
  const response: ErrorResponse = {
    success: false,
    error: { type, message },
  }
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * POST /documents
 * Process a document through the pipeline
 */
async function handleProcessDocument(request: Request, env: Env): Promise<Response> {
  try {
    const token = getToken(request)
    if (!token) {
      return errorResponse('unauthorized', 'Missing Authorization header', 401)
    }

    const body = await parseJson<DocumentRequest>(request)

    // Validate body has required fields
    if (!body.title || !body.content || !body.userId) {
      return errorResponse('invalid_input', 'Missing required fields: title, content, userId', 400)
    }

    // Run the processing pipeline
    const result = await processingPipeline(token, body).run()

    // Handle the result
    if (result.tag === 'Right') {
      // Try to persist to KV (non-blocking, errors are logged but don't fail the response)
      env.DOCUMENTS_KV.put(result.right.id, JSON.stringify(result.right)).catch(console.error)

      return successResponse(result.right, 201)
    } else {
      // Map error types to HTTP status codes
      const statusMap: Record<string, number> = {
        unauthorized: 401,
        forbidden: 403,
        invalid_input: 400,
        not_found: 404,
        external_service_error: 502,
        internal_error: 500,
      }

      const status = statusMap[result.left.type] || 500
      return errorResponse(result.left.type, result.left.message, status)
    }
  } catch (error) {
    console.error('Request handler error:', error)
    return errorResponse('internal_error', 'An unexpected error occurred', 500)
  }
}

/**
 * GET /documents/:id
 * Retrieve a document from KV
 */
async function handleGetDocument(id: string, env: Env): Promise<Response> {
  try {
    const doc = await env.DOCUMENTS_KV.get(id, 'json')

    if (!doc) {
      return errorResponse('not_found', `Document ${id} not found`, 404)
    }

    return successResponse(doc)
  } catch (error) {
    console.error('Get document error:', error)
    return errorResponse('internal_error', 'Failed to retrieve document', 500)
  }
}

/**
 * Route requests to handlers
 */
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    let response: Response

    if (path === '/documents' && request.method === 'POST') {
      response = await handleProcessDocument(request, env)
    } else if (path.startsWith('/documents/') && request.method === 'GET') {
      const id = path.slice('/documents/'.length)
      response = await handleGetDocument(id, env)
    } else {
      response = errorResponse('not_found', 'Endpoint not found', 404)
    }

    // Add CORS headers to response
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value)
    }

    return response
  },
}
