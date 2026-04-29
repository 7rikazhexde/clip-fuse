import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import log from 'electron-log'
import type { VideoInfo } from '../../types/index.js'

export function probeVideo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`ファイルが見つかりません: ${filePath}`))
      return
    }

    let fileSize = 0
    try {
      fileSize = fs.statSync(filePath).size
    } catch (e) {
      log.warn('ファイルサイズ取得失敗:', e)
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        log.error('FFprobe error:', err.message)
        resolve({
          duration: 0,
          size: fileSize,
          width: 0,
          height: 0,
          fps: 0,
          codec: 'unknown'
        })
        return
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      const fps = videoStream?.r_frame_rate
        ? evalFraction(videoStream.r_frame_rate)
        : 0

      resolve({
        duration: metadata.format.duration ?? 0,
        size: fileSize,
        width: videoStream?.width ?? 0,
        height: videoStream?.height ?? 0,
        fps,
        codec: videoStream?.codec_name ?? 'unknown'
      })
    })
  })
}

function evalFraction(frac: string): number {
  const [num, den] = frac.split('/').map(Number)
  return den ? num / den : num
}
