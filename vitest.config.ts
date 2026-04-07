import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'samples/**',
        'src/Validation.ts',
        'tests/Validation.test.ts',
        'src/index.ts'
      ],
      ignoreEmpty: true
    }
  }
})
