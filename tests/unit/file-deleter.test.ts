import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import * as childProcess from 'child_process'
import { forceDelete } from '../../src/main/services/file-deleter.js'

// exec (attrib/chmod) は v8 ignore 対象。fake timer と競合しないよう即時解決するモックに差し替える
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>()
  return {
    ...actual,
    exec: vi.fn((_cmd: string, _opts: unknown, callback: (err: Error | null) => void) => {
      callback(null)
      return {} as ReturnType<typeof actual.exec>
    })
  }
})

const TMP = path.join(os.tmpdir(), 'clip-fuse-deleter-test')

beforeEach(() => fs.mkdirSync(TMP, { recursive: true }))
afterEach(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('forceDelete', () => {
  it('存在しないファイルは成功を返す', async () => {
    const result = await forceDelete(path.join(TMP, 'nonexistent.mp4'))
    expect(result.success).toBe(true)
  })

  it('通常ファイルを削除できる', async () => {
    const filePath = path.join(TMP, 'test.mp4')
    fs.writeFileSync(filePath, 'dummy content')
    expect(fs.existsSync(filePath)).toBe(true)

    const result = await forceDelete(filePath)
    expect(result.success).toBe(true)
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('unlinkSync が ENOENT を返した場合は成功を返す', async () => {
    const filePath = path.join(TMP, 'enoent.mp4')
    fs.writeFileSync(filePath, 'dummy content')

    vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
    })

    const result = await forceDelete(filePath)
    expect(result.success).toBe(true)
  })

  it('unlinkSync 成功後も existsSync が true を返す場合はリトライする', async () => {
    // unlinkSync は成功するが OS がファイルをまだ保持している状況を模擬し、
    // line 35 の existsSync false ブランチをカバーする
    vi.useFakeTimers()
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)   // line 12: ファイルあり
      .mockReturnValueOnce(true)   // line 35 attempt 1: まだ存在 (false branch)
      .mockReturnValueOnce(false)  // line 35 attempt 2: 削除済み
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})

    const promise = forceDelete(path.join(TMP, 'retry.mp4'))
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
  })

  it('exec_ がエラーを返しても forceDelete は継続する', async () => {
    // exec (attrib/chmod) が失敗しても v8-ignored catch で処理され、
    // exec_ 内の reject ブランチをカバーする
    vi.useFakeTimers()
    vi.mocked(childProcess.exec).mockImplementationOnce(
      (_cmd: string, _opts: unknown, callback: (err: Error | null) => void) => {
        callback(new Error('exec failed'))
        return {} as ReturnType<typeof childProcess.exec>
      }
    )
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)   // line 12: ファイルあり
      .mockReturnValueOnce(false)  // line 35: 削除済み
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})

    const promise = forceDelete(path.join(TMP, 'exec-fail.mp4'))
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
  })

  it('ENOENT 以外のエラーが発生した場合はリトライし次の試行で成功する', async () => {
    // EPERM など非 ENOENT エラーでは log.warn + retry となる
    // line 41 の ENOENT false ブランチをカバーする
    vi.useFakeTimers()
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true)  // line 12: ファイルあり
    vi.spyOn(fs, 'unlinkSync')
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
      })
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      })

    const promise = forceDelete(path.join(TMP, 'eperm.mp4'))
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
  })
})
