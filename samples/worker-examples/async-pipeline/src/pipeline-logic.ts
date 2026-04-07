import { EitherAsync, Either } from 'elevate-ts'
import type {
  ApiError,
  AuthContext,
  DocumentRequest,
  ProcessedDocument,
  PipelineContext,
} from './types.js'

/**
 * Validates the authentication token
 * Returns the authenticated user if valid
 */
export const validateToken = (
  token: string
): EitherAsync.EitherAsync<ApiError, AuthContext> =>
  EitherAsync.liftEither(
    token.startsWith('Bearer ')
      ? Either.Right({
          user: {
            id: 'user-123',
            name: 'John Doe',
            role: 'user' as const,
            email: 'john@example.com',
          },
          token,
          expiresAt: Date.now() + 3600000,
        })
      : Either.Left({ type: 'unauthorized' as const, message: 'Invalid token format' })
  )

/**
 * Checks user permissions for document processing
 */
export const checkPermissions = (
  auth: AuthContext
): EitherAsync.EitherAsync<ApiError, AuthContext> =>
  EitherAsync.liftEither(
    auth.user.role === 'admin' || auth.user.role === 'user'
      ? Either.Right(auth)
      : Either.Left({ type: 'forbidden' as const, message: 'User lacks required permissions' })
  )

/**
 * Validates the document request payload
 */
export const validateRequest = (
  request: DocumentRequest
): EitherAsync.EitherAsync<ApiError, DocumentRequest> => {
  // First validation: non-empty title and content
  const first = EitherAsync.liftEither(
    request.title.length > 0 && request.content.length > 0
      ? Either.Right(request)
      : Either.Left({
          type: 'invalid_input' as const,
          message: 'Title and content must not be empty',
        })
  )

  // Second validation: title length constraint
  return EitherAsync.chain((req: DocumentRequest) =>
    EitherAsync.liftEither(
      req.title.length <= 200
        ? Either.Right(req)
        : Either.Left({
            type: 'invalid_input' as const,
            message: 'Title exceeds 200 characters',
          })
    )
  )(first)
}

/**
 * Processes the document (simulated computation)
 */
export const processDocument = (
  context: PipelineContext
): EitherAsync.EitherAsync<ApiError, ProcessedDocument> =>
  EitherAsync.liftEither(
    Either.Right({
      id: `doc-${Date.now()}`,
      title: context.request.title,
      content: context.request.content,
      userId: context.request.userId,
      wordCount: context.request.content.split(/\s+/).length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  )

/**
 * Simulates persisting to external service
 * Can fail to demonstrate error handling
 */
export const persistDocument = (
  document: ProcessedDocument,
  shouldFail: boolean = false
): EitherAsync.EitherAsync<ApiError, ProcessedDocument> =>
  EitherAsync.liftEither(
    !shouldFail
      ? Either.Right(document)
      : Either.Left({
          type: 'external_service_error' as const,
          message: 'Failed to persist document to storage',
        })
  )

/**
 * Full pipeline: Token → Permissions → Validate Request → Process → Persist
 * Returns the processed document on success, error on any failure
 */
export const processingPipeline = (
  token: string,
  request: DocumentRequest,
  shouldFailPersist: boolean = false
): EitherAsync.EitherAsync<ApiError, ProcessedDocument> => ({
  tag: 'EitherAsync',
  run: async () => {
    // Step 1: Validate token
    const tokenResult = await validateToken(token).run()
    if (tokenResult.tag === 'Left') return tokenResult

    // Step 2: Check permissions
    const auth = tokenResult.right
    const permResult = await checkPermissions(auth).run()
    if (permResult.tag === 'Left') return permResult

    // Step 3: Validate request
    const reqResult = await validateRequest(request).run()
    if (reqResult.tag === 'Left') return reqResult

    // Step 4: Process document
    const context: PipelineContext = { auth, request: reqResult.right }
    const procResult = await processDocument(context).run()
    if (procResult.tag === 'Left') return procResult

    // Step 5: Persist document
    const persResult = await persistDocument(procResult.right, shouldFailPersist).run()
    return persResult
  },
})
