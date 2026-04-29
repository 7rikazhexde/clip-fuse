import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: [
        'src/main/services/ffmpeg-merge.ts',
        'src/main/services/ffmpeg-probe.ts',
        'src/main/services/file-deleter.ts'
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 70
      }
    }
  }
})
