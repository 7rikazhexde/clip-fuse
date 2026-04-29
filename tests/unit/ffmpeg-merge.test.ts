import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import { buildProgress, cleanup } from '../../src/main/services/ffmpeg-merge.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildProgress', () => {
  it('フィールドが undefined のときデフォルト値を返す', () => {
    const p = buildProgress({})
    expect(p.percent).toBe(0)
    expect(p.timemark).toBe('00:00:00')
    expect(p.fps).toBe(0)
  })

  it('フィールドが null のときデフォルト値を返す', () => {
    const p = buildProgress({ percent: null, timemark: null, currentFps: null })
    expect(p.percent).toBe(0)
    expect(p.timemark).toBe('00:00:00')
    expect(p.fps).toBe(0)
  })

  it('値が渡されたとき正しく変換する', () => {
    const p = buildProgress({ percent: 50.7, timemark: '00:01:30', currentFps: 30 })
    expect(p.percent).toBe(51)
    expect(p.timemark).toBe('00:01:30')
    expect(p.fps).toBe(30)
  })
})

describe('cleanup', () => {
  it('ファイルが存在しない場合は unlinkSync を呼ばない', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false)
    const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
    cleanup('/nonexistent/file.txt')
    expect(unlinkSpy).not.toHaveBeenCalled()
  })

  it('unlinkSync が失敗しても例外を投げない', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true)
    vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      throw new Error('permission denied')
    })
    expect(() => cleanup('/some/file.txt')).not.toThrow()
  })
})
