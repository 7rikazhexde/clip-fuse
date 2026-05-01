import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication, Page } from '@playwright/test'

let app: ElectronApplication
let window: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(process.cwd(), 'out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  })
  window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app.close()
})

test('ウィンドウタイトルが Clip Fuse である', async () => {
  expect(await window.title()).toBe('Clip Fuse')
})

test('ドロップゾーンが表示されている', async () => {
  await expect(window.locator('#dropZone')).toBeVisible()
})

test('ファイル選択ボタンが表示され正しいラベルを持つ', async () => {
  const btn = window.locator('#selectFilesBtn')
  await expect(btn).toBeVisible()
  await expect(btn).toContainText('ファイルを選択')
})

test('結合ボタンはファイル未選択時に無効化されている', async () => {
  await expect(window.locator('#mergeBtn')).toBeDisabled()
})

test('ファイルリストが初期状態で空である', async () => {
  await expect(window.locator('#fileList li')).toHaveCount(0)
})

test('"全てクリア" ボタンが表示されている', async () => {
  await expect(window.locator('#clearAllBtn')).toBeVisible()
})

test('出力ファイル名の初期値が "merged_video" である', async () => {
  await expect(window.locator('#outputFilename')).toHaveValue('merged_video')
})

test('保存先フォルダ選択ボタンが表示されている', async () => {
  await expect(window.locator('#selectOutputBtn')).toBeVisible()
})
