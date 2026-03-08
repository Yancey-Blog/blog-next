import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
})
