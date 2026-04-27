import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@zambit\/elevate-ts\/(.+)$/,
        replacement: resolve(__dirname, 'src/$1.ts')
      },
      {
        find: '@zambit/elevate-ts',
        replacement: resolve(__dirname, 'src/index.ts')
      }
    ]
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/tokens.test.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'scripts/**',
        'locals/tokens/**',
        'src/index.ts',
        "**/*Proto'fantasy-land" // Fantasy Land protocol implementation details
      ],
      thresholds: {
        lines: 80,
        functions: 77,
        branches: 80,
        statements: 80
      }
    }
  }
});
