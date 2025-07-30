// osモジュールをインポートに追加
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { shell } = require('electron');
const { exec } = require('child_process');
const os = require('os'); // 追加

// Windows用FFmpegパス設定（exe化対応）
let ffmpegPath, ffprobePath;

if (app.isPackaged) {
  // exe化された場合のパス
  const resourcesPath = process.resourcesPath;
  ffmpegPath = path.join(resourcesPath, 'ffmpeg', 'ffmpeg.exe');
  ffprobePath = path.join(resourcesPath, 'ffmpeg', 'ffprobe.exe');
  
  console.log('Packaged app detected');
  console.log('Resources path:', resourcesPath);
  console.log('FFmpeg path:', ffmpegPath);
  console.log('FFprobe path:', ffprobePath);
} else {
  // 開発環境のパス
  ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
  ffprobePath = path.join(__dirname, 'ffmpeg', 'ffprobe.exe');
  
  console.log('Development environment');
  console.log('FFmpeg path:', ffmpegPath);
  console.log('FFprobe path:', ffprobePath);
}

// FFmpegバイナリの存在確認と設定
if (fs.existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('FFmpeg path set:', ffmpegPath);
} else {
  console.log('FFmpeg not found at:', ffmpegPath);
  console.log('Trying to use system FFmpeg');
}

if (fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
  console.log('FFprobe path set:', ffprobePath);
} else {
  console.log('FFprobe not found at:', ffprobePath);
  console.log('Trying to use system FFprobe');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    icon: path.join(__dirname, 'icon.ico') // アイコンがある場合
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
});

// GPU関連エラーの軽減（GPUは無効にしない）
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--ignore-gpu-blocklist');

// GPU プロセスクラッシュ時の自動復旧（非推奨警告対応）
app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.log('GPU process crashed:', details.reason);
    // アプリケーションは継続動作
  }
});

// レンダラープロセスクラッシュ時の復旧
app.on('renderer-process-crashed', (event, webContents, killed) => {
  console.log('Renderer process crashed, killed:', killed);
  // 必要に応じてウィンドウを再作成
  if (mainWindow && mainWindow.isDestroyed()) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ファイル選択ダイアログ
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', 'webm'] }
    ]
  });
  
  return result.canceled ? [] : result.filePaths;
});

// 保存先フォルダ選択ダイアログ
ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '保存先フォルダを選択'
  });
  
  return result.canceled ? null : result.filePaths[0];
});

// 動画の長さとファイルサイズを取得（エラーハンドリング強化版）
ipcMain.handle('get-video-info', async (event, filePath) => {
  console.log('=== get-video-info called ===');
  console.log('File path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  
  return new Promise((resolve, reject) => {
    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist:', filePath);
      reject(new Error(`ファイルが見つかりません: ${filePath}`));
      return;
    }
    
    // ファイルサイズを先に取得
    let fileSize = 0;
    try {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
      console.log('File size:', fileSize, 'bytes');
    } catch (statError) {
      console.warn('ファイルサイズ取得失敗:', statError);
    }
    
    // FFprobeでメタデータを取得
    console.log('Running ffprobe on:', filePath);
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        console.error('FFprobe stderr:', err.message);
        
        // FFmpegが利用できない場合でもファイルサイズは返す
        console.log('FFprobe failed, returning size only');
        resolve({
          duration: 0,
          size: fileSize,
          error: `動画情報の取得に失敗しました: ${err.message}`
        });
      } else {
        console.log('FFprobe success');
        console.log('Duration:', metadata.format.duration);
        resolve({
          duration: metadata.format.duration || 0,
          size: fileSize
        });
      }
    });
  });
});

// FFmpegバイナリのテスト用関数
ipcMain.handle('test-ffmpeg', async () => {
  return new Promise((resolve) => {
    exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg test failed:', error);
        resolve({
          success: false,
          error: error.message,
          ffmpegPath: ffmpegPath,
          ffmpegExists: fs.existsSync(ffmpegPath)
        });
      } else {
        console.log('FFmpeg test successful');
        resolve({
          success: true,
          version: stdout.split('\n')[0],
          ffmpegPath: ffmpegPath
        });
      }
    });
  });
});

// ファイルサイズを取得
ipcMain.handle('get-file-size', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return 0;
  } catch (error) {
    console.error('ファイルサイズ取得エラー:', error);
    return 0;
  }
});

let currentMergeProcess = null;

// 動画結合処理（exe化対応版）
ipcMain.handle('merge-videos', async (event, filePaths, outputPath) => {
  console.log('=== merge-videos called ===');
  console.log('Output path:', outputPath);
  console.log('Input files:', filePaths);
  
  return new Promise((resolve, reject) => {
    // 既に処理中の場合は拒否
    if (currentMergeProcess) {
      console.log('Already processing, rejecting new request');
      reject(new Error('Already processing another merge'));
      return;
    }
    
    // 一時ファイルのパスを修正（exe化対応）
    let tempDir;
    if (app.isPackaged) {
      // exe化の場合は一時ディレクトリを使用
      tempDir = require('os').tmpdir();
    } else {
      // 開発環境では__dirnameを使用
      tempDir = __dirname;
    }
    
    const listFilePath = path.join(tempDir, `temp_list_${Date.now()}.txt`);
    console.log('Temp list file path:', listFilePath);
    
    const listContent = filePaths.map(filePath => 
      `file '${filePath.replace(/\\/g, '/').replace(/'/g, "'\"'\"'")}'`
    ).join('\n');
    
    try {
      fs.writeFileSync(listFilePath, listContent, 'utf8');
      console.log('Created temp list file:', listFilePath);
      console.log('List content:', listContent);
    } catch (error) {
      console.error('Failed to create temp list file:', error);
      reject(error);
      return;
    }
    
    const command = ffmpeg()
      .input(listFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath);
    
    // プロセス情報を保存
    currentMergeProcess = {
      command: command,
      outputPath: outputPath,
      listFilePath: listFilePath,
      startTime: Date.now(),
      isKilled: false
    };
    
    console.log('Starting FFmpeg process...');
    
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg started:', commandLine);
      })
      .on('progress', (progress) => {
        // プロセスがキャンセルされていないかチェック
        if (!currentMergeProcess || currentMergeProcess.isKilled) {
          console.log('Progress event but process was cancelled');
          return;
        }
        
        mainWindow.webContents.send('merge-progress', {
          percent: Math.round(progress.percent || 0),
          timemark: progress.timemark || '00:00:00',
          fps: progress.currentFps || 0
        });
      })
      .on('end', () => {
        console.log('=== FFmpeg process completed ===');
        
        // 一時ファイル削除
        try {
          if (fs.existsSync(listFilePath)) {
            fs.unlinkSync(listFilePath);
            console.log('Cleaned up temp list file');
          }
        } catch (error) {
          console.warn('Failed to delete temp file:', error);
        }
        
        if (currentMergeProcess && !currentMergeProcess.isKilled) {
          currentMergeProcess = null;
          resolve('Merge completed successfully');
        } else {
          console.log('Process completed but was already cancelled');
        }
      })
      .on('error', (err) => {
        console.log('=== FFmpeg process error ===', err.message);
        
        // 一時ファイル削除
        try {
          if (fs.existsSync(listFilePath)) {
            fs.unlinkSync(listFilePath);
            console.log('Cleaned up temp file after error');
          }
        } catch (deleteError) {
          console.warn('Failed to delete temp file after error:', deleteError);
        }
        
        if (currentMergeProcess && !currentMergeProcess.isKilled) {
          currentMergeProcess = null;
          reject(err);
        } else {
          console.log('Error occurred but process was already cancelled');
        }
      })
      .run();
  });
});

// パス指定でのキャンセル（完了後でも削除可能）
ipcMain.handle('cancel-merge-with-path', async (event, outputPath) => {
  console.log('=== cancel-merge-with-path called ===');
  console.log('Target file for deletion:', outputPath);
  
  // プロセスが残っていれば終了
  if (currentMergeProcess && !currentMergeProcess.isKilled) {
    console.log('Active process found, killing...');
    try {
      currentMergeProcess.isKilled = true;
      if (currentMergeProcess.command) {
        currentMergeProcess.command.kill('SIGKILL');
        console.log('FFmpeg process killed');
      }
    } catch (killError) {
      console.warn('Process kill error:', killError.message);
    }
    
    // 一時ファイル削除
    try {
      if (fs.existsSync(currentMergeProcess.listFilePath)) {
        fs.unlinkSync(currentMergeProcess.listFilePath);
        console.log('Deleted temp list file');
      }
    } catch (tempError) {
      console.warn('Failed to delete temp file:', tempError);
    }
    
    // プロセス終了を待つ
    await new Promise(resolve => setTimeout(resolve, 500));
    currentMergeProcess = null;
  }
  
  // 指定されたファイルを強制削除
  return await forceDeleteFileImpl(outputPath);
});

// ファイル強制削除（単体機能）
ipcMain.handle('force-delete-file', async (event, filePath) => {
  console.log('=== force-delete-file called ===');
  console.log('Target file:', filePath);
  return await forceDeleteFileImpl(filePath);
});

// ファイル削除の実装（シンプル版 - tmpファイル処理を削除）
async function forceDeleteFileImpl(filePath) {
  console.log('=== ファイル削除開始 ===');
  console.log('削除対象:', filePath);
  
  const normalizedPath = path.normalize(filePath);
  
  try {
    if (!fs.existsSync(normalizedPath)) {
      console.log('ファイルが存在しません:', normalizedPath);
      return { success: true, reason: 'File does not exist' };
    }
    
    console.log('ファイル削除処理を開始...');
    
    // 段階的削除プロセス
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        console.log(`削除試行 ${attempt}/10`);
        
        // ファイル属性をリセット
        try {
          if (process.platform === 'win32') {
            await executeCommand(`attrib -R -A -S -H "${normalizedPath}"`);
            console.log('Windows属性クリア完了');
          }
          fs.chmodSync(normalizedPath, 0o777);
          console.log('権限変更完了');
        } catch (chmodError) {
          console.warn('権限変更失敗:', chmodError.message);
        }
        
        // 待機
        const waitTime = 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // 削除実行
        fs.unlinkSync(normalizedPath);
        
        // 削除確認
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!fs.existsSync(normalizedPath)) {
          console.log(`削除成功 (試行${attempt}回目)`);
          return { success: true };
        }
        
      } catch (deleteError) {
        console.warn(`削除試行${attempt}失敗:`, deleteError.message);
        
        if (deleteError.code === 'ENOENT') {
          console.log('ファイルが既に削除済み');
          return { success: true };
        }
        
        // エラー時は少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Node.js削除が失敗した場合、コマンドライン削除を試行
    console.log('=== コマンドライン削除を試行 ===');
    
    const commands = [
      `del /f /q "${normalizedPath}"`,
      `powershell -Command "Remove-Item -Path '${normalizedPath}' -Force -ErrorAction SilentlyContinue"`
    ];
    
    for (const command of commands) {
      try {
        console.log('実行中:', command);
        await executeCommand(command);
        
        // 削除確認
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!fs.existsSync(normalizedPath)) {
          console.log('コマンドライン削除成功');
          return { success: true };
        }
      } catch (cmdError) {
        console.warn('コマンド削除失敗:', cmdError.message);
      }
    }
    
    // 全て失敗
    console.error('全ての削除手法が失敗');
    return {
      success: false,
      error: `ファイル削除に失敗しました。\n\n手動で削除してください:\n1. エクスプローラーで右クリック → 削除\n2. 管理者権限のコマンドプロンプトで:\n   del /f "${normalizedPath}"\n\nファイル: ${normalizedPath}`
    };
    
  } catch (error) {
    console.error('削除処理エラー:', error);
    return { 
      success: false, 
      error: `削除処理中にエラーが発生しました: ${error.message}` 
    };
  }
}

// 複数の削除手法を試行（シンプル版）
async function deleteFileWithMultipleMethods(filePath) {
  console.log('=== 複数削除手法を試行 ===');
  
  const deleteMethods = [
    `del /f /q "${filePath}"`,
    `powershell -Command "Remove-Item -Path '${filePath}' -Force -ErrorAction SilentlyContinue"`
  ];
  
  for (let i = 0; i < deleteMethods.length; i++) {
    const command = deleteMethods[i];
    console.log(`削除手法${i + 1}を試行:`, command);
    
    try {
      await executeCommand(command);
      
      // 削除確認
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!fs.existsSync(filePath)) {
        console.log(`削除成功 (手法${i + 1})`);
        return { success: true };
      }
    } catch (error) {
      console.warn(`手法${i + 1}でエラー:`, error.message);
    }
  }
  
  return {
    success: false,
    error: `コマンドライン削除が失敗しました: ${filePath}`
  };
}

// コマンド実行用ヘルパー関数
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// ファイル存在確認
ipcMain.handle('check-file-exists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

// エクスプローラーでファイルを表示
ipcMain.handle('show-in-folder', async (event, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});

// 時間文字列を秒に変換
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
}