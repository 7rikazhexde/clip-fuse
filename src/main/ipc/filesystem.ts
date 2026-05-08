import { ipcMain, shell } from 'electron'
import { exec, execFile } from 'child_process'
import path from 'path'
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
    /* v8 ignore start */
    if (process.platform !== 'linux') {
      shell.showItemInFolder(filePath)
      return
    }
    const dir = path.dirname(filePath)
    exec(`wslpath -w "${dir}"`, (err, windowsPath) => {
      if (!err && windowsPath.trim()) {
        execFile('explorer.exe', [windowsPath.trim()], (execErr) => {
          if (execErr) log.error('explorer.exe error:', execErr)
        })
      } else {
        execFile('xdg-open', [dir], (execErr) => {
          if (execErr) log.error('xdg-open error:', execErr)
        })
      }
    })
    /* v8 ignore stop */
  })
}
