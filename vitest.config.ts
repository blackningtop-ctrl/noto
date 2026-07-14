import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Web Crypto + localStorage for vault tests
    setupFiles: ['./src/test-setup.ts'],
  },
})

