import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../types/index.js'
import type { ElectronAPI, MergeProgress } from '../types/index.js'

export type { ElectronAPI }

const api: ElectronAPI = {
  selectFiles: () => ipcRenderer.invoke(IPC.SELECT_FILES),
  selectOutputFolder: () => ipcRenderer.invoke(IPC.SELECT_OUTPUT),
  getVideoInfo: (filePath) => ipcRenderer.invoke(IPC.GET_VIDEO_INFO, filePath),
  getFileSize: (filePath) => ipcRenderer.invoke(IPC.GET_FILE_SIZE, filePath),
  mergeVideos: (options) => ipcRenderer.invoke(IPC.MERGE_VIDEOS, options),
  cancelMerge: (outputPath) => ipcRenderer.invoke(IPC.CANCEL_MERGE, outputPath),
  forceDeleteFile: (filePath) => ipcRenderer.invoke(IPC.DELETE_FILE, filePath),
  checkFileExists: (filePath) => ipcRenderer.invoke(IPC.CHECK_EXISTS, filePath),
  showInFolder: (filePath) => ipcRenderer.invoke(IPC.SHOW_IN_FOLDER, filePath),
  testFfmpeg: () => ipcRenderer.invoke(IPC.TEST_FFMPEG),
  onMergeProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: MergeProgress) => callback(progress)
    ipcRenderer.on(IPC.MERGE_PROGRESS, handler)
    return () => ipcRenderer.off(IPC.MERGE_PROGRESS, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
