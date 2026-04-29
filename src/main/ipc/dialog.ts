import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC } from '../../types/index.js'

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', 'webm']

export function registerDialogHandlers(getWindow: () => BrowserWindow): void {
  ipcMain.handle(IPC.SELECT_FILES, async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Video Files', extensions: VIDEO_EXTENSIONS }]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(IPC.SELECT_OUTPUT, async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory'],
      title: '保存先フォルダを選択'
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
