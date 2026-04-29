import fs from 'fs'
import os from 'os'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import log from 'electron-log'
import type { MergeOptions, MergeProgress, ScalingMode } from '../../types/index.js'

export interface MergeHandle {
  cancel: () => void
}

export function buildProgress(p: {
  percent?: number | null
  timemark?: string | null
  currentFps?: number | null
}): MergeProgress {
  return {
    percent: Math.round(p.percent ?? 0),
    timemark: p.timemark ?? '00:00:00',
    fps: p.currentFps ?? 0
  }
}

export function mergeVideos(
  options: MergeOptions,
  onProgress: (p: MergeProgress) => void
): { promise: Promise<void>; handle: MergeHandle } {
  const { filePaths, outputPath, mode, targetWidth, targetHeight } = options

  let cancelled = false
  let command: ReturnType<typeof ffmpeg> | null = null

  const handle: MergeHandle = {
    cancel: () => {
      cancelled = true
      /* v8 ignore start */
      command?.kill('SIGKILL')
      /* v8 ignore stop */
    }
  }

  const promise = mode === 'copy'
    ? mergeByCopy(filePaths, outputPath, onProgress, () => cancelled, (cmd) => { command = cmd })
    : mergeByReencode(filePaths, outputPath, targetWidth ?? 1920, targetHeight ?? 1080, options.scalingMode ?? 'crop', onProgress, () => cancelled, (cmd) => { command = cmd })

  return { promise, handle }
}

function mergeByCopy(
  filePaths: string[],
  outputPath: string,
  onProgress: (p: MergeProgress) => void,
  isCancelled: () => boolean,
  setCommand: (cmd: ReturnType<typeof ffmpeg>) => void
): Promise<void> {
  const listPath = path.join(os.tmpdir(), `clip-fuse-list-${Date.now()}.txt`)
  const listContent = filePaths
    .map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\"'\"'")}'`)
    .join('\n')

  fs.writeFileSync(listPath, listContent, 'utf8')
  log.info('Concat list:', listPath)

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath)

    setCommand(cmd)

    cmd
      .on('start', (cl) => log.info('FFmpeg start:', cl))
      .on('progress', (p) => {
        /* v8 ignore start */
        if (isCancelled()) return
        /* v8 ignore stop */
        onProgress(buildProgress(p))
      })
      .on('end', () => {
        cleanup(listPath)
        resolve()
      })
      .on('error', (err) => {
        cleanup(listPath)
        if (isCancelled()) { resolve(); return }
        reject(err)
      })
      .run()
  })
}

function mergeByReencode(
  filePaths: string[],
  outputPath: string,
  targetWidth: number,
  targetHeight: number,
  scalingMode: ScalingMode = 'crop',
  onProgress: (p: MergeProgress) => void,
  isCancelled: () => boolean,
  setCommand: (cmd: ReturnType<typeof ffmpeg>) => void
): Promise<void> {
  const scaleFilter = (i: number) => {
    const videoFilter = scalingMode === 'crop'
      // クロップ: アスペクト比を維持しながら拡大し、はみ出た部分をカット（黒フチなし）
      ? `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,` +
        `crop=${targetWidth}:${targetHeight},setsar=1[v${i}]`
      // レターボックス: アスペクト比を維持しながら縮小し、余白を黒で埋める（黒フチあり）
      : `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,` +
        `pad=${targetWidth}:${targetHeight}:-1:-1,setsar=1[v${i}]`
    return `${videoFilter};[${i}:a]aresample=44100[a${i}]`
  }

  const filters = filePaths.map((_, i) => scaleFilter(i))
  const concatIn = filePaths.map((_, i) => `[v${i}][a${i}]`).join('')
  const filterComplex = [
    ...filters,
    `${concatIn}concat=n=${filePaths.length}:v=1:a=1[vout][aout]`
  ].join(';')

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()

    filePaths.forEach((p) => cmd.addInput(p))
    setCommand(cmd)

    cmd
      .complexFilter(filterComplex)
      .outputOptions(['-map [vout]', '-map [aout]', '-c:v libx264', '-c:a aac', '-crf 18'])
      .output(outputPath)
      .on('start', (cl) => log.info('FFmpeg re-encode start:', cl))
      .on('progress', (p) => {
        /* v8 ignore start */
        if (isCancelled()) return
        /* v8 ignore stop */
        onProgress(buildProgress(p))
      })
      .on('end', () => resolve())
      .on('error', (err) => {
        if (isCancelled()) { resolve(); return }
        reject(err)
      })
      .run()
  })
}

export function cleanup(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (e) {
    log.warn('Temp file cleanup failed:', e)
  }
}
