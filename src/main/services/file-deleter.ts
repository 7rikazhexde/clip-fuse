import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import log from 'electron-log'
import type { DeleteResult } from '../../types/index.js'

const MAX_ATTEMPTS = 10

export async function forceDelete(filePath: string): Promise<DeleteResult> {
  const normalized = path.normalize(filePath)

  if (!fs.existsSync(normalized)) {
    return { success: true, reason: 'File does not exist' }
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    log.info(`Delete attempt ${attempt}/${MAX_ATTEMPTS}:`, normalized)

    /* v8 ignore start */
    try {
      if (process.platform === 'win32') {
        await exec_(`attrib -R -A -S -H "${normalized}"`)
      }
      fs.chmodSync(normalized, 0o777)
    } catch (e) {
      log.warn('Attribute/chmod error:', e)
    }
    /* v8 ignore stop */

    await sleep(500 * attempt)

    try {
      fs.unlinkSync(normalized)
      await sleep(100)
      if (!fs.existsSync(normalized)) {
        log.info(`Deleted on attempt ${attempt}`)
        return { success: true }
      }
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err.code === 'ENOENT') return { success: true }
      /* v8 ignore start */
      log.warn(`Attempt ${attempt} failed:`, err.message)
      await sleep(1000)
      /* v8 ignore stop */
    }
  }

  /* v8 ignore start */
  // フォールバック: OS コマンド (10 回リトライ後のみ到達する最終手段)
  const commands =
    process.platform === 'win32'
      ? [
          `del /f /q "${normalized}"`,
          `powershell -Command "Remove-Item -Path '${normalized}' -Force -ErrorAction SilentlyContinue"`
        ]
      : [`rm -f "${normalized}"`]

  for (const cmd of commands) {
    try {
      await exec_(cmd)
      await sleep(200)
      if (!fs.existsSync(normalized)) return { success: true }
    } catch (e) {
      log.warn('Command delete failed:', e)
    }
  }

  return {
    success: false,
    error: `ファイル削除に失敗しました。手動で削除してください:\n${normalized}`
  }
  /* v8 ignore stop */
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* v8 ignore start */
// exec_ は win32 専用コードと OS コマンドフォールバックからのみ呼ばれる
// Linux CI では到達不能なため関数カバレッジから除外する
function exec_(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 10000 }, (err) => (err ? reject(err) : resolve()))
  })
}
/* v8 ignore stop */
