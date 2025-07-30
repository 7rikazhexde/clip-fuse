const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
  getFileSize: (filePath) => ipcRenderer.invoke('get-file-size', filePath),
  mergeVideos: (filePaths, outputPath) => ipcRenderer.invoke('merge-videos', filePaths, outputPath),
  cancelMerge: () => ipcRenderer.invoke('cancel-merge'),
  cancelMergeWithPath: (outputPath) => ipcRenderer.invoke('cancel-merge-with-path', outputPath),
  forceDeleteFile: (filePath) => ipcRenderer.invoke('force-delete-file', filePath),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  onMergeProgress: (callback) => ipcRenderer.on('merge-progress', callback)
});