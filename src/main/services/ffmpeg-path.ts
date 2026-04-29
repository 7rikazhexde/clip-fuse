import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import log from 'electron-log'

const EXE = process.platform === 'win32' ? '.exe' : ''

function resolveBinaries(): { ffmpegPath: string; ffprobePath: string } {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg')
    : path.join(app.getAppPath(), 'ffmpeg')

  return {
    ffmpegPath: path.join(base, `ffmpeg${EXE}`),
    ffprobePath: path.join(base, `ffprobe${EXE}`)
  }
}

export function setupFfmpegPaths(): void {
  const { ffmpegPath, ffprobePath } = resolveBinaries()

  if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath)
    log.info('FFmpeg path set:', ffmpegPath)
  } else {
    log.warn('Bundled FFmpeg not found, falling back to system FFmpeg:', ffmpegPath)
  }

  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath)
    log.info('FFprobe path set:', ffprobePath)
  } else {
    log.warn('Bundled FFprobe not found, falling back to system FFprobe:', ffprobePath)
  }
}

export function getFfmpegPath(): string {
  return resolveBinaries().ffmpegPath
}
