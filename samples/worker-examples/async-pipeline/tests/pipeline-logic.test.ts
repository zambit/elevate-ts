import { describe, it, expect } from 'vitest'
import { processingPipeline, validateToken, checkPermissions, validateRequest } from '../src/pipeline-logic.js'
import type { DocumentRequest } from '../src/types.js'

async function getTag(promise: Promise<any>) {
  return (await promise).tag
}

async function getRight(promise: Promise<any>) {
  const result = await promise
  return result.tag === 'Right' ? result.right : null
}

describe('Pipeline Logic', () => {
  describe('validateToken', () => {
    it('accepts valid Bearer tokens', async () => {
      expect(await getTag(validateToken('Bearer valid-token-123').run())).toBe('Right')
    })

    it('rejects tokens without Bearer prefix', async () => {
      expect(await getTag(validateToken('no-bearer-prefix').run())).toBe('Left')
    })

    it('rejects empty tokens', async () => {
      expect(await getTag(validateToken('').run())).toBe('Left')
    })
  })

  describe('checkPermissions', () => {
    it('allows admin users', async () => {
      const auth = {
        user: { id: 'admin-1', name: 'Admin', role: 'admin' as const, email: 'admin@example.com' },
        token: 'Bearer token',
        expiresAt: Date.now() + 3600000,
      }
      expect(await getTag(checkPermissions(auth).run())).toBe('Right')
    })

    it('allows regular users', async () => {
      const auth = {
        user: { id: 'user-1', name: 'User', role: 'user' as const, email: 'user@example.com' },
        token: 'Bearer token',
        expiresAt: Date.now() + 3600000,
      }
      expect(await getTag(checkPermissions(auth).run())).toBe('Right')
    })

    it('denies viewer users', async () => {
      const auth = {
        user: { id: 'viewer-1', name: 'Viewer', role: 'viewer' as const, email: 'viewer@example.com' },
        token: 'Bearer token',
        expiresAt: Date.now() + 3600000,
      }
      expect(await getTag(checkPermissions(auth).run())).toBe('Left')
    })
  })

  describe('validateRequest', () => {
    it('accepts valid requests', async () => {
      const request: DocumentRequest = {
        title: 'Test Doc',
        content: 'This is test content',
        userId: 'user-123',
      }
      expect(await getTag(validateRequest(request).run())).toBe('Right')
    })

    it('rejects empty title', async () => {
      const request: DocumentRequest = {
        title: '',
        content: 'Content here',
        userId: 'user-123',
      }
      expect(await getTag(validateRequest(request).run())).toBe('Left')
    })

    it('rejects empty content', async () => {
      const request: DocumentRequest = {
        title: 'Title',
        content: '',
        userId: 'user-123',
      }
      expect(await getTag(validateRequest(request).run())).toBe('Left')
    })

    it('rejects titles longer than 200 characters', async () => {
      const request: DocumentRequest = {
        title: 'a'.repeat(201),
        content: 'Content',
        userId: 'user-123',
      }
      expect(await getTag(validateRequest(request).run())).toBe('Left')
    })

    it('accepts titles exactly 200 characters', async () => {
      const request: DocumentRequest = {
        title: 'a'.repeat(200),
        content: 'Content',
        userId: 'user-123',
      }
      expect(await getTag(validateRequest(request).run())).toBe('Right')
    })
  })

  describe('processingPipeline', () => {
    it('succeeds with valid token and request', async () => {
      const request: DocumentRequest = {
        title: 'Valid Doc',
        content: 'Valid content here',
        userId: 'user-123',
      }
      expect(await getTag(processingPipeline('Bearer valid-token', request).run())).toBe('Right')
    })

    it('fails if token is invalid', async () => {
      const request: DocumentRequest = {
        title: 'Valid Doc',
        content: 'Valid content',
        userId: 'user-123',
      }
      expect(await getTag(processingPipeline('invalid-token', request).run())).toBe('Left')
    })

    it('fails if request is invalid', async () => {
      const request: DocumentRequest = {
        title: '',
        content: '',
        userId: 'user-123',
      }
      expect(await getTag(processingPipeline('Bearer valid-token', request).run())).toBe('Left')
    })

    it('fails if persistence fails', async () => {
      const request: DocumentRequest = {
        title: 'Valid Doc',
        content: 'Valid content',
        userId: 'user-123',
      }
      expect(await getTag(processingPipeline('Bearer valid-token', request, true).run())).toBe('Left')
    })

    it('calculates word count correctly', async () => {
      const request: DocumentRequest = {
        title: 'Word Count Test',
        content: 'One two three four five',
        userId: 'user-123',
      }
      const doc = await getRight(processingPipeline('Bearer valid-token', request).run())
      expect(doc?.wordCount).toBe(5)
    })

    it('stops at first error in pipeline', async () => {
      const request: DocumentRequest = {
        title: 'Valid',
        content: 'Valid content',
        userId: 'user-123',
      }
      expect(await getTag(processingPipeline('no-bearer', request).run())).toBe('Left')
    })

    it('generates unique document IDs', async () => {
      const request: DocumentRequest = {
        title: 'Unique ID Test',
        content: 'Testing unique IDs',
        userId: 'user-123',
      }
      const doc1 = await getRight(processingPipeline('Bearer token1', request).run())
      const doc2 = await getRight(processingPipeline('Bearer token2', request).run())
      expect(doc1?.id).not.toBe(doc2?.id)
    })
  })
})
