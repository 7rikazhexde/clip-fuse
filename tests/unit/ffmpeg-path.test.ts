import { describe, it, expect, vi, afterEach } from 'vitest'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'

// vi.mock() より先に実行される変数として mockApp を確保
const mockApp = vi.hoisted(() => ({
  isPackaged: false,
  getAppPath: vi.fn(() => '/mock/app'),
}))

vi.mock('electron', () => ({ app: mockApp }))
vi.mock('electron-log', () => ({ default: { info: vi.fn(), warn: vi.fn() } }))

import { setupFfmpegPaths, getFfmpegPath } from '../../src/main/services/ffmpeg-path.js'

afterEach(() => {
  vi.restoreAllMocks()
  mockApp.isPackaged = false
  mockApp.getAppPath.mockReturnValue('/mock/app')
})

describe('setupFfmpegPaths', () => {
  it('バイナリが存在するとき fluent-ffmpeg にパスをセットする (isPackaged=false)', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    const setFfmpegSpy = vi.spyOn(ffmpeg, 'setFfmpegPath')
    const setFfprobeSpy = vi.spyOn(ffmpeg, 'setFfprobePath')

    setupFfmpegPaths()

    expect(setFfmpegSpy).toHaveBeenCalledOnce()
    expect(setFfprobeSpy).toHaveBeenCalledOnce()
    expect(setFfmpegSpy.mock.calls[0][0]).toContain(path.join('mock', 'app', 'ffmpeg'))
  })

  it('バイナリが存在しないときパスをセットしない (isPackaged=false)', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const setFfmpegSpy = vi.spyOn(ffmpeg, 'setFfmpegPath')
    const setFfprobeSpy = vi.spyOn(ffmpeg, 'setFfprobePath')

    setupFfmpegPaths()

    expect(setFfmpegSpy).not.toHaveBeenCalled()
    expect(setFfprobeSpy).not.toHaveBeenCalled()
  })

  it('isPackaged=true のとき process.resourcesPath を使う', () => {
    mockApp.isPackaged = true
    Object.defineProperty(process, 'resourcesPath', { value: '/mock/resources', configurable: true })
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    const setFfmpegSpy = vi.spyOn(ffmpeg, 'setFfmpegPath')

    setupFfmpegPaths()

    expect(setFfmpegSpy.mock.calls[0][0]).toContain(path.join('mock', 'resources', 'ffmpeg'))
  })

  it('ffmpeg のみ存在する場合は ffprobe パスをセットしない', () => {
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)   // ffmpegPath 存在
      .mockReturnValueOnce(false)  // ffprobePath 不在
    const setFfmpegSpy = vi.spyOn(ffmpeg, 'setFfmpegPath')
    const setFfprobeSpy = vi.spyOn(ffmpeg, 'setFfprobePath')

    setupFfmpegPaths()

    expect(setFfmpegSpy).toHaveBeenCalledOnce()
    expect(setFfprobeSpy).not.toHaveBeenCalled()
  })
})

describe('getFfmpegPath', () => {
  it('isPackaged=false のとき getAppPath() 配下のパスを返す', () => {
    const result = getFfmpegPath()
    expect(result).toContain(path.join('mock', 'app', 'ffmpeg'))
  })

  it('isPackaged=true のとき process.resourcesPath 配下のパスを返す', () => {
    mockApp.isPackaged = true
    Object.defineProperty(process, 'resourcesPath', { value: '/mock/resources', configurable: true })

    const result = getFfmpegPath()
    expect(result).toContain(path.join('mock', 'resources', 'ffmpeg'))
  })
})
