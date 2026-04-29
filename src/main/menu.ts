import { app, Menu, shell, BrowserWindow, dialog } from 'electron'

const GITHUB_URL = 'https://github.com/7rikazhexde/clip-fuse'

export function buildMenu(getWindow: () => BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const macAppMenu: Electron.MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about', label: `${app.name} について` },
      { type: 'separator' },
      { role: 'services', label: 'サービス' },
      { type: 'separator' },
      { role: 'hide', label: `${app.name} を隠す` },
      { role: 'hideOthers', label: 'ほかを隠す' },
      { role: 'unhide', label: 'すべて表示' },
      { type: 'separator' },
      { role: 'quit', label: '終了' }
    ]
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),

    {
      label: 'ファイル',
      submenu: [
        isMac
          ? { role: 'close' as const, label: '閉じる' }
          : { role: 'quit' as const, label: '終了' }
      ]
    },

    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },

    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        ...(!app.isPackaged
          ? [{ role: 'toggleDevTools', label: '開発者ツール' } as Electron.MenuItemConstructorOptions]
          : []
        ),
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン切替' }
      ]
    },

    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'GitHub リポジトリを開く',
          click: () => shell.openExternal(GITHUB_URL)
        },
        { type: 'separator' },
        {
          label: 'Clip Fuse について',
          click: async () => {
            const { response } = await dialog.showMessageBox(getWindow(), {
              type: 'info',
              title: 'Clip Fuse について',
              message: 'Clip Fuse',
              detail: [
                `バージョン: ${app.getVersion()}`,
                '',
                '動画ファイルをドラッグ＆ドロップで簡単に結合できるアプリです。',
                '',
                `GitHub: ${GITHUB_URL}`
              ].join('\n'),
              buttons: ['GitHub を開く', '閉じる'],
              defaultId: 1,
              cancelId: 1
            })
            if (response === 0) shell.openExternal(GITHUB_URL)
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
