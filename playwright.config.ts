import { defineConfig } from '@playwright/test'

const isCI = !!process.env['CI']

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  reporter: isCI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['github'],
        ['junit', { outputFile: './test-results/playwright-results.xml' }],
      ]
    : [['list'], ['html', { open: 'never' }]],
})
