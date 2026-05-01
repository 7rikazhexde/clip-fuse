import { defineConfig } from 'vitest/config'

const isCI = !!process.env['CI']

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 60000,
    reporters: isCI
      ? ['verbose', 'github-actions', 'junit']
      : ['verbose'],
    outputFile: isCI
      ? { junit: './test-results/vitest-results.xml' }
      : undefined,
    coverage: {
      provider: 'v8',
      include: [
        'src/main/services/ffmpeg-merge.ts',
        'src/main/services/ffmpeg-probe.ts',
        'src/main/services/ffmpeg-path.ts',
        'src/main/services/file-deleter.ts',
        'src/renderer/src/format.ts'
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
