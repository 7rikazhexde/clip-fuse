import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import { mergeVideos } from '../../src/main/services/ffmpeg-merge.js'
import { probeVideo } from '../../src/main/services/ffmpeg-probe.js'

const FFMPEG_DIR = path.join(process.cwd(), 'ffmpeg')
const FFMPEG_BIN = path.join(FFMPEG_DIR, 'ffmpeg.exe')
const FFPROBE_BIN = path.join(FFMPEG_DIR, 'ffprobe.exe')
const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures')
const TMP_OUT = path.join(os.tmpdir(), 'clip-fuse-merge-test')

function setupBinaries(): void {
  if (fs.existsSync(FFMPEG_BIN)) ffmpeg.setFfmpegPath(FFMPEG_BIN)
  if (fs.existsSync(FFPROBE_BIN)) ffmpeg.setFfprobePath(FFPROBE_BIN)
}

function createVideo(
  name: string,
  width: number,
  height: number,
  duration: number,
  color = 'red'
): string {
  const outputPath = path.join(FIXTURES, name)
  if (fs.existsSync(outputPath)) return outputPath
  const bin = fs.existsSync(FFMPEG_BIN) ? FFMPEG_BIN : 'ffmpeg'
  execSync(
    `"${bin}" -y -f lavfi -i color=c=${color}:s=${width}x${height}:r=30 ` +
    `-f lavfi -i sine=frequency=440:sample_rate=44100 ` +
    `-t ${duration} -c:v libx264 -c:a aac -shortest "${outputPath}"`,
    { stdio: 'pipe' }
  )
  return outputPath
}

let video1080p: string
let video720p: string
let video1080p_2: string

beforeAll(() => {
  setupBinaries()
  fs.mkdirSync(FIXTURES, { recursive: true })
  fs.mkdirSync(TMP_OUT, { recursive: true })

  video1080p = createVideo('merge_1080p_a.mp4', 1920, 1080, 3, 'red')
  video1080p_2 = createVideo('merge_1080p_b.mp4', 1920, 1080, 3, 'green')
  video720p = createVideo('merge_720p.mp4', 1280, 720, 3, 'blue')
})

afterAll(() => {
  fs.rmSync(TMP_OUT, { recursive: true, force: true })
})

describe('mergeVideos - copy モード (同一解像度)', () => {
  it('同じ解像度の動画を結合できる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_copy.mp4')
    const { promise } = mergeVideos(
      { filePaths: [video1080p, video1080p_2], outputPath, mode: 'copy' },
      () => {}
    )
    await promise

    expect(fs.existsSync(outputPath)).toBe(true)

    const info = await probeVideo(outputPath)
    expect(info.duration).toBeGreaterThan(5)
    expect(info.width).toBe(1920)
    expect(info.height).toBe(1080)
  })

  it('copy モードで存在しないファイルを指定するとエラーになる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_copy_err.mp4')
    const { promise } = mergeVideos(
      { filePaths: ['/nonexistent/a.mp4', '/nonexistent/b.mp4'], outputPath, mode: 'copy' },
      () => {}
    )
    await expect(promise).rejects.toThrow()
  })

  it('copy モードで cancel() によりプロセスを中断できる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_copy_cancel.mp4')
    const { promise, handle } = mergeVideos(
      { filePaths: [video1080p, video1080p_2], outputPath, mode: 'copy' },
      () => {}
    )
    setTimeout(() => handle.cancel(), 200)
    await expect(promise).resolves.toBeUndefined()
  })

  it('copy モードで cancel() を即座に呼び出すとエラーハンドラ内で resolve する', async () => {
    const outputPath = path.join(TMP_OUT, 'output_copy_cancel_sync.mp4')
    // 存在しないファイルを使うことで error イベントを確実に発生させ、
    // cancel() 済みの状態で error ハンドラが resolve することを確認する
    const { promise, handle } = mergeVideos(
      { filePaths: ['/nonexistent/a.mp4', '/nonexistent/b.mp4'], outputPath, mode: 'copy' },
      () => {}
    )
    handle.cancel()
    await expect(promise).resolves.toBeUndefined()
  })
})

describe('mergeVideos - reencode モード (異なる解像度)', () => {
  it('解像度が異なる動画を再エンコードして結合できる (crop)', async () => {
    const outputPath = path.join(TMP_OUT, 'output_reencode_crop.mp4')
    const { promise } = mergeVideos(
      {
        filePaths: [video1080p, video720p],
        outputPath,
        mode: 'reencode',
        scalingMode: 'crop',
        targetWidth: 1920,
        targetHeight: 1080
      },
      () => {}
    )
    await promise

    expect(fs.existsSync(outputPath)).toBe(true)

    const info = await probeVideo(outputPath)
    expect(info.duration).toBeGreaterThan(5)
    expect(info.width).toBe(1920)
    expect(info.height).toBe(1080)
  })

  it('解像度が異なる動画をレターボックスで再エンコードして結合できる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_reencode_letterbox.mp4')
    const { promise } = mergeVideos(
      {
        filePaths: [video1080p, video720p],
        outputPath,
        mode: 'reencode',
        scalingMode: 'letterbox',
        targetWidth: 1920,
        targetHeight: 1080
      },
      () => {}
    )
    await promise

    expect(fs.existsSync(outputPath)).toBe(true)

    const info = await probeVideo(outputPath)
    expect(info.duration).toBeGreaterThan(5)
    expect(info.width).toBe(1920)
    expect(info.height).toBe(1080)
  })

  it('reencode モードで存在しないファイルを指定するとエラーになる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_reencode_err.mp4')
    const { promise } = mergeVideos(
      {
        filePaths: ['/nonexistent/a.mp4', '/nonexistent/b.mp4'],
        outputPath,
        mode: 'reencode',
        targetWidth: 1920,
        targetHeight: 1080
      },
      () => {}
    )
    await expect(promise).rejects.toThrow()
  })

  it('reencode モードでデフォルトパラメータ (scalingMode/targetWidth/targetHeight 未指定) を使用できる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_reencode_default.mp4')
    const { promise } = mergeVideos(
      { filePaths: [video1080p, video720p], outputPath, mode: 'reencode' },
      () => {}
    )
    await promise
    expect(fs.existsSync(outputPath)).toBe(true)
    const info = await probeVideo(outputPath)
    expect(info.width).toBe(1920)
    expect(info.height).toBe(1080)
  })

  it('cancel() でプロセスを中断できる', async () => {
    const outputPath = path.join(TMP_OUT, 'output_cancel.mp4')
    const { promise, handle } = mergeVideos(
      {
        filePaths: [video1080p, video720p],
        outputPath,
        mode: 'reencode',
        targetWidth: 1920,
        targetHeight: 1080
      },
      () => {}
    )

    setTimeout(() => handle.cancel(), 500)
    await expect(promise).resolves.toBeUndefined()
  })

  it('reencode モードで cancel() を即座に呼び出すとエラーハンドラ内で resolve する', async () => {
    const outputPath = path.join(TMP_OUT, 'output_reencode_cancel_sync.mp4')
    const { promise, handle } = mergeVideos(
      {
        filePaths: [video1080p, video720p],
        outputPath,
        mode: 'reencode',
        targetWidth: 1920,
        targetHeight: 1080
      },
      () => {}
    )
    handle.cancel()
    await expect(promise).resolves.toBeUndefined()
  })
})
