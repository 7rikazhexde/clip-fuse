import { ipcMain, shell } from 'electron'
import fs from 'fs'
import log from 'electron-log'
import { forceDelete } from '../services/file-deleter.js'
import { IPC } from '../../types/index.js'

export function registerFilesystemHandlers(): void {
  ipcMain.handle(IPC.GET_FILE_SIZE, (_event, filePath: string) => {
    try {
      return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
    } catch (e) {
      log.error('getFileSize error:', e)
      return 0
    }
  })

  ipcMain.handle(IPC.CHECK_EXISTS, (_event, filePath: string) => {
    return fs.existsSync(filePath)
  })

  ipcMain.handle(IPC.DELETE_FILE, (_event, filePath: string) => {
    return forceDelete(filePath)
  })

  ipcMain.handle(IPC.SHOW_IN_FOLDER, (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
