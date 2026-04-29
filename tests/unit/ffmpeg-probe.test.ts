import { describe, it, expect, beforeAll, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import { probeVideo } from '../../src/main/services/ffmpeg-probe.js'

const FFMPEG_DIR = path.join(process.cwd(), 'ffmpeg')
const FFMPEG_BIN = path.join(FFMPEG_DIR, 'ffmpeg.exe')
const FFPROBE_BIN = path.join(FFMPEG_DIR, 'ffprobe.exe')
const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures')

function setupBinaries(): void {
  if (fs.existsSync(FFMPEG_BIN)) ffmpeg.setFfmpegPath(FFMPEG_BIN)
  if (fs.existsSync(FFPROBE_BIN)) ffmpeg.setFfprobePath(FFPROBE_BIN)
}

function createTestVideo(outputPath: string, width: number, height: number, duration: number): void {
  const bin = fs.existsSync(FFMPEG_BIN) ? FFMPEG_BIN : 'ffmpeg'
  execSync(
    `"${bin}" -y -f lavfi -i color=c=blue:s=${width}x${height}:r=30 ` +
    `-f lavfi -i sine=frequency=440:sample_rate=44100 ` +
    `-t ${duration} -c:v libx264 -c:a aac -shortest "${outputPath}"`,
    { stdio: 'pipe' }
  )
}

beforeAll(() => {
  setupBinaries()
  fs.mkdirSync(TEST_DIR, { recursive: true })
  createTestVideo(path.join(TEST_DIR, 'probe_test.mp4'), 1280, 720, 2)
})

describe('probeVideo', () => {
  it('存在しないファイルはエラーを返す', async () => {
    await expect(probeVideo('/nonexistent/file.mp4')).rejects.toThrow()
  })

  it('有効な動画ファイルからメタデータを取得できる', async () => {
    const info = await probeVideo(path.join(TEST_DIR, 'probe_test.mp4'))
    expect(info.duration).toBeGreaterThan(0)
    expect(info.width).toBe(1280)
    expect(info.height).toBe(720)
    expect(info.size).toBeGreaterThan(0)
    expect(info.codec).toBe('h264')
  })

  it('動画でないファイルは ffprobe エラーとなりデフォルト値で解決する', async () => {
    const txtFile = path.join(TEST_DIR, 'not_a_video.txt')
    fs.writeFileSync(txtFile, 'not a video file')
    const info = await probeVideo(txtFile)
    expect(info.duration).toBe(0)
    expect(info.width).toBe(0)
    expect(info.codec).toBe('unknown')
  })

  it('映像ストリームがない音声ファイルは幅・高さ・fps が 0 で解決する', async () => {
    const audioFile = path.join(TEST_DIR, 'audio_only.m4a')
    const bin = fs.existsSync(FFMPEG_BIN) ? FFMPEG_BIN : 'ffmpeg'
    execSync(
      `"${bin}" -y -f lavfi -i sine=frequency=440:sample_rate=44100 -t 2 "${audioFile}"`,
      { stdio: 'pipe' }
    )
    const info = await probeVideo(audioFile)
    expect(info.width).toBe(0)
    expect(info.height).toBe(0)
    expect(info.fps).toBe(0)
    expect(info.codec).toBe('unknown')
    expect(info.duration).toBeGreaterThan(0)
  })

  it('statSync が失敗してもプローブは続行しファイルサイズを 0 とする', async () => {
    const spy = vi.spyOn(fs, 'statSync').mockImplementationOnce(() => {
      throw new Error('stat failed')
    })
    try {
      const info = await probeVideo(path.join(TEST_DIR, 'probe_test.mp4'))
      expect(info.size).toBe(0)
      expect(info.width).toBe(1280)
    } finally {
      spy.mockRestore()
    }
  })

  it('映像ストリームに r_frame_rate がない場合は fps が 0 になる', async () => {
    // videoStream が存在するが r_frame_rate が undefined のケース (line 40 false branch)
    vi.spyOn(ffmpeg as any, 'ffprobe').mockImplementationOnce(
      (_path: string, callback: (err: Error | null, data: object) => void) => {
        callback(null, {
          format: { duration: 2 },
          streams: [{ codec_type: 'video', width: 640, height: 480, codec_name: 'h264' }]
        })
      }
    )
    const info = await probeVideo(path.join(TEST_DIR, 'probe_test.mp4'))
    expect(info.fps).toBe(0)
    expect(info.width).toBe(640)
    vi.restoreAllMocks()
  })

  it('r_frame_rate の分母が 0 の場合は分子をそのまま返す', async () => {
    // evalFraction で den=0 のケース (line 53 false branch)
    vi.spyOn(ffmpeg as any, 'ffprobe').mockImplementationOnce(
      (_path: string, callback: (err: Error | null, data: object) => void) => {
        callback(null, {
          format: { duration: 2 },
          streams: [{ codec_type: 'video', width: 640, height: 480, codec_name: 'h264', r_frame_rate: '30/0' }]
        })
      }
    )
    const info = await probeVideo(path.join(TEST_DIR, 'probe_test.mp4'))
    expect(info.fps).toBe(30)
    vi.restoreAllMocks()
  })

  it('format.duration が未定義の場合は duration を 0 とする', async () => {
    // metadata.format.duration ?? 0 の null 側をカバー (line 40)
    vi.spyOn(ffmpeg as any, 'ffprobe').mockImplementationOnce(
      (_path: string, callback: (err: Error | null, data: object) => void) => {
        callback(null, {
          format: {},
          streams: [{ codec_type: 'video', width: 640, height: 480, codec_name: 'h264', r_frame_rate: '30/1' }]
        })
      }
    )
    const info = await probeVideo(path.join(TEST_DIR, 'probe_test.mp4'))
    expect(info.duration).toBe(0)
    vi.restoreAllMocks()
  })
})
