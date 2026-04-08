import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'scripts/**',
        'src/tokens/**',
        'src/index.ts',
        '**/*Proto\'fantasy-land' // Fantasy Land protocol implementation details
      ],
      thresholds: {
        lines: 80,
        functions: 77,
        branches: 80,
        statements: 80
      }
    }
  }
})
