import { ipcMain, BrowserWindow } from 'electron'
import { exec } from 'child_process'
import log from 'electron-log'
import { probeVideo } from '../services/ffmpeg-probe.js'
import { mergeVideos } from '../services/ffmpeg-merge.js'
import { forceDelete } from '../services/file-deleter.js'
import { getFfmpegPath } from '../services/ffmpeg-path.js'
import { IPC } from '../../types/index.js'
import type { MergeOptions } from '../../types/index.js'
import type { MergeHandle } from '../services/ffmpeg-merge.js'

type ActiveMerge = MergeHandle | null

let activeMerge: ActiveMerge = null

export function registerFfmpegHandlers(getWindow: () => BrowserWindow): void {
  ipcMain.handle(IPC.GET_VIDEO_INFO, (_event, filePath: string) => {
    return probeVideo(filePath)
  })

  ipcMain.handle(IPC.MERGE_VIDEOS, (_event, options: MergeOptions) => {
    if (activeMerge) {
      throw new Error('Already processing another merge')
    }

    const { promise, handle } = mergeVideos(options, (progress) => {
      getWindow().webContents.send(IPC.MERGE_PROGRESS, progress)
    })

    activeMerge = handle

    return promise.finally(() => {
      activeMerge = null
    })
  })

  ipcMain.handle(IPC.CANCEL_MERGE, async (_event, outputPath: string) => {
    if (activeMerge) {
      activeMerge.cancel()
      activeMerge = null
      await new Promise((r) => setTimeout(r, 500))
    }
    return forceDelete(outputPath)
  })

  ipcMain.handle(IPC.TEST_FFMPEG, () => {
    const ffmpegPath = getFfmpegPath()
    return new Promise((resolve) => {
      exec(`"${ffmpegPath}" -version`, { timeout: 5000 }, (err, stdout) => {
        if (err) {
          resolve({ success: false, error: err.message, ffmpegPath })
        } else {
          resolve({ success: true, version: stdout.split('\n')[0], ffmpegPath })
        }
      })
    })
  })
}
