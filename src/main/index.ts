import { app, BrowserWindow } from 'electron'
import path from 'path'
import log from 'electron-log'
import { setupFfmpegPaths } from './services/ffmpeg-path.js'
import { buildMenu } from './menu.js'
import { registerDialogHandlers } from './ipc/dialog.js'
import { registerFilesystemHandlers } from './ipc/filesystem.js'
import { registerFfmpegHandlers } from './ipc/ffmpeg.js'

log.initialize()
log.info('App starting...')

// GPU 関連エラーの軽減
app.commandLine.appendSwitch('--disable-gpu-sandbox')
app.commandLine.appendSwitch('--ignore-gpu-blocklist')

let mainWindow: BrowserWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    icon: path.join(app.getAppPath(), 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (!app.isPackaged && process.env['NODE_ENV'] !== 'test') {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  setupFfmpegPaths()

  const getWindow = () => mainWindow

  buildMenu(getWindow)
  registerDialogHandlers(getWindow)
  registerFilesystemHandlers()
  registerFfmpegHandlers(getWindow)

  createWindow()
  log.info('Window created')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('child-process-gone', (_event, details) => {
  if (details.type === 'GPU') log.warn('GPU process gone:', details.reason)
})
