import Sortable from 'sortablejs'
import { state, getTotalDuration, getTotalSize, getUniqueResolutions, getResolutionOptions, getUniqueExtensions, resetMerge } from './store.js'
import { formatDuration, formatFileSize, sanitizeFilename, parseTimemark } from './format.js'
import {
  showOverwriteDialog,
  showResolutionDialog,
  showCancelDialog,
  showSuccessModal,
  showDeleteErrorModal
} from './modal.js'
import type { VideoFile } from '../../types/index.js'
import type { ElectronAPI } from '../../preload/index.js'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const api = window.electronAPI

// DOM 参照
const dropZone = document.getElementById('dropZone')!
const selectFilesBtn = document.getElementById('selectFilesBtn')!
const fileListEl = document.getElementById('fileList')!
const clearAllBtn = document.getElementById('clearAllBtn')!
const selectOutputBtn = document.getElementById('selectOutputBtn')!
const outputPathSpan = document.getElementById('outputPath')!
const outputFilenameInput = document.getElementById('outputFilename') as HTMLInputElement
const outputPreview = document.getElementById('outputPreview')!
const fullOutputPathEl = document.getElementById('fullOutputPath')!
const outputExtensionSelect = document.getElementById('outputExtension') as HTMLSelectElement
const mergeBtn = document.getElementById('mergeBtn') as HTMLButtonElement
const progressBanner = document.getElementById('progressBanner')!
const cancelBtn = document.getElementById('cancelBtn')!
const totalDurationSpan = document.getElementById('totalDuration')!
const bannerTitle = document.getElementById('bannerTitle')!
const bannerProgress = document.getElementById('bannerProgress')!
const bannerElapsed = document.getElementById('bannerElapsed')!
const bannerProgressFill = document.getElementById('bannerProgressFill')!
const bannerHint = document.getElementById('bannerHint')!
const processingOverlay = document.getElementById('processingOverlay')!

// 進捗監視
let progressInterval: ReturnType<typeof setInterval> | null = null
let elapsedInterval: ReturnType<typeof setInterval> | null = null
let sortable: Sortable | null = null

// ── ファイル追加 ────────────────────────────────────────────────────────────
async function addFiles(paths: string[]): Promise<void> {
  for (const filePath of paths) {
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath

    let displayName = fileName
    let counter = 1
    while (state.videoFiles.find((f) => f.name === displayName)) {
      const base = fileName.replace(/\.[^/.]+$/, '')
      const ext = fileName.match(/\.[^/.]+$/)?.[0] ?? ''
      displayName = `${base} (${counter})${ext}`
      counter++
    }

    try {
      const info = await api.getVideoInfo(filePath)
      state.videoFiles.push({
        id: Date.now() + Math.random(),
        path: filePath,
        name: displayName,
        originalName: fileName,
        duration: info.duration,
        size: info.size,
        width: info.width,
        height: info.height,
        fps: info.fps,
        codec: info.codec,
        addedAt: new Date()
      })
    } catch {
      state.videoFiles.push({
        id: Date.now() + Math.random(),
        path: filePath,
        name: displayName,
        originalName: fileName,
        duration: 0,
        size: 0,
        width: 0,
        height: 0,
        fps: 0,
        codec: 'unknown',
        addedAt: new Date(),
        hasError: true
      })
    }
  }
  refreshUI()
}

// ── ファイルリスト描画 ────────────────────────────────────────────────────────
function renderFileList(): void {
  fileListEl.innerHTML = ''
  state.videoFiles.forEach((file, index) => {
    const li = document.createElement('li')
    li.className = 'file-item'
    li.setAttribute('data-file-id', String(file.id))

    const resolution = file.width > 0 ? ` | ${file.width}x${file.height}` : ''
    li.innerHTML = `
      <div class="file-info">
        <div class="drag-handle">&#8942;&#8942;</div>
        <div class="file-details">
          <div class="file-name" title="${file.path}">${file.name}</div>
          <div class="file-duration">${formatDuration(file.duration)}${resolution}</div>
          <div class="file-path">${file.path}</div>
          ${file.hasError ? '<div class="file-error">&#9888;&#65039; 読み込みエラー</div>' : ''}
        </div>
      </div>
      <button class="remove-btn" data-index="${index}" title="削除">&#215;</button>
    `
    li.querySelector('.remove-btn')!.addEventListener('click', () => removeFile(index))
    fileListEl.appendChild(li)
  })

  if (sortable) sortable.destroy()
  sortable = Sortable.create(fileListEl, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dataIdAttr: 'data-file-id',
    onEnd: (evt) => {
      const moved = state.videoFiles.splice(evt.oldIndex!, 1)[0]
      state.videoFiles.splice(evt.newIndex!, 0, moved)
      updateSummary()
    }
  })
}

function removeFile(index: number): void {
  state.videoFiles.splice(index, 1)
  refreshUI()
}

// ── サマリー更新 ─────────────────────────────────────────────────────────────
function updateSummary(): void {
  state.totalInputSize = getTotalSize()
  totalDurationSpan.textContent = `総時間: ${formatDuration(getTotalDuration())} (${formatFileSize(state.totalInputSize)})`
}

function updateOutputPreview(): void {
  const name = outputFilenameInput.value.trim()
  if (state.outputDir && name) {
    const filename = sanitizeFilename(name) + state.outputExtension
    const full = state.outputDir + '\\' + filename
    fullOutputPathEl.textContent = full
    outputPreview.style.display = 'block'
  } else {
    outputPreview.style.display = 'none'
  }
}

function updateMergeButton(): void {
  mergeBtn.disabled =
    state.videoFiles.length < 2 ||
    !state.outputDir ||
    !outputFilenameInput.value.trim()
}

function updateExtensionSelector(): void {
  const exts = getUniqueExtensions()
  const current = state.outputExtension
  outputExtensionSelect.innerHTML = exts.map((e) => `<option value="${e}">${e}</option>`).join('')
  outputExtensionSelect.value = exts.includes(current) ? current : exts[0]
  state.outputExtension = outputExtensionSelect.value
}

function refreshUI(): void {
  renderFileList()
  updateSummary()
  updateExtensionSelector()
  updateOutputPreview()
  updateMergeButton()
}

// ── ドラッグ&ドロップ ─────────────────────────────────────────────────────────
const VIDEO_EXT_RE = /\.(mp4|avi|mov|mkv|flv|wmv|m4v|webm)$/i

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget as Node)) dropZone.classList.remove('drag-over')
})
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  const files = Array.from(e.dataTransfer!.files).filter(
    (f) => f.type.startsWith('video/') || VIDEO_EXT_RE.test(f.name)
  )
  if (files.length > 0) addFiles(files.map((f) => f.path))
})

selectFilesBtn.addEventListener('click', async () => {
  const paths = await api.selectFiles()
  if (paths.length > 0) addFiles(paths)
})

clearAllBtn.addEventListener('click', () => {
  state.videoFiles = []
  refreshUI()
})

selectOutputBtn.addEventListener('click', async () => {
  const dir = await api.selectOutputFolder()
  if (dir) {
    state.outputDir = dir
    outputPathSpan.textContent = dir.split(/[\\/]/).pop() ?? dir
    outputPathSpan.title = dir
    updateOutputPreview()
    updateMergeButton()
  }
})

outputFilenameInput.addEventListener('input', () => {
  updateOutputPreview()
  updateMergeButton()
})

outputExtensionSelect.addEventListener('change', () => {
  state.outputExtension = outputExtensionSelect.value
  updateOutputPreview()
})

// ── 進捗バナー ────────────────────────────────────────────────────────────────
function showBanner(mode: 'copy' | 'reencode'): void {
  // タイトル・ヒントをモードに合わせて設定
  if (mode === 'reencode') {
    bannerTitle.textContent = '再エンコード結合中...'
    bannerHint.textContent = '異なる解像度を統一しながら変換しています。完了まで時間がかかる場合があります。'
  } else {
    bannerTitle.textContent = 'コピー結合中...'
    bannerHint.textContent = '再エンコードなしで高速に結合しています。'
  }

  // 進捗バーを不確定アニメーション状態で開始
  bannerProgressFill.style.width = '0%'
  bannerProgressFill.classList.add('indeterminate')
  bannerProgress.textContent = '開始中...'
  bannerElapsed.textContent = '経過: 00:00'

  processingOverlay.style.display = 'block'
  progressBanner.style.display = 'flex'
  progressBanner.classList.add('banner-show')
  setTimeout(() => progressBanner.classList.add('banner-animate'), 100)

  startElapsedTimer()
}

function hideBanner(): void {
  stopElapsedTimer()
  progressBanner.classList.remove('banner-animate')
  setTimeout(() => {
    progressBanner.style.display = 'none'
    progressBanner.classList.remove('banner-show')
  }, 300)
  processingOverlay.style.display = 'none'
}

function updateBannerProgress(pct: number, detail: string): void {
  bannerProgress.textContent = detail
  if (pct > 0) {
    bannerProgressFill.classList.remove('indeterminate')
    bannerProgressFill.style.width = `${pct}%`
  }
}

// ── 経過時間カウンター（全モード共通）────────────────────────────────────────
function startElapsedTimer(): void {
  stopElapsedTimer()
  elapsedInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.mergeStartTime) / 1000)
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const s = (elapsed % 60).toString().padStart(2, '0')
    bannerElapsed.textContent = `経過: ${m}:${s}`
  }, 1000)
}

function stopElapsedTimer(): void {
  if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null }
}

// ── 進捗監視（ファイルサイズベース / copy モードのみ）────────────────────────
function startProgressMonitor(outputPath: string): void {
  if (state.mergeMode === 'reencode') return
  stopProgressMonitor()
  progressInterval = setInterval(async () => {
    if (state.mergeState !== 'processing') { stopProgressMonitor(); return }
    const size = await api.getFileSize(outputPath)
    if (size > 0 && state.totalInputSize > 0) {
      const pct = Math.min(100, Math.round((size / state.totalInputSize) * 100))
      const elapsed = (Date.now() - state.mergeStartTime) / 1000
      let detail: string
      if (pct >= 100) {
        detail = '100% (完了処理中...)'
      } else if (pct >= 95) {
        detail = `${pct}% (まもなく完了...)`
      } else if (elapsed > 5 && pct > 5) {
        const remaining = Math.max(0, (elapsed / pct) * 100 - elapsed)
        detail = remaining < 7200
          ? `${pct}% (残り約${formatDuration(remaining)})`
          : `${pct}% (処理中...)`
      } else {
        detail = `${pct}% (処理中...)`
      }
      updateBannerProgress(pct, detail)
    }
  }, 1000)
}

function stopProgressMonitor(): void {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
}

// ── 結合ボタン ────────────────────────────────────────────────────────────────
mergeBtn.addEventListener('click', async () => {
  if (state.mergeState !== 'idle') return
  if (state.videoFiles.length < 2 || !state.outputDir || !outputFilenameInput.value.trim()) return

  const filename = sanitizeFilename(outputFilenameInput.value.trim()) + state.outputExtension
  let outputPath = state.outputDir + '\\' + filename

  // 既存ファイルチェック
  if (await api.checkFileExists(outputPath)) {
    const choice = await showOverwriteDialog(filename)
    if (choice === 'cancel') return
    if (choice === 'rename') {
      const newName = await generateUniqueName(state.outputDir, outputFilenameInput.value.trim())
      outputFilenameInput.value = newName
      outputPath = state.outputDir + '\\' + sanitizeFilename(newName) + state.outputExtension
      updateOutputPreview()
    }
  }

  // 解像度チェック
  const resolutions = getUniqueResolutions()
  let mode: 'copy' | 'reencode' = 'copy'
  let scalingMode: 'letterbox' | 'crop' = 'letterbox'
  let targetWidth: number | undefined
  let targetHeight: number | undefined

  if (resolutions.length > 1) {
    const choice = await showResolutionDialog(
      state.videoFiles.map((f) => `${f.name}: ${f.width > 0 ? `${f.width}×${f.height}` : '不明'}`),
      getResolutionOptions()
    )
    if (choice.action === 'cancel') return
    if (choice.action === 'reencode') {
      mode = 'reencode'
      scalingMode = choice.scalingMode
      targetWidth = choice.targetWidth
      targetHeight = choice.targetHeight
    }
  }

  // 結合開始
  state.mergeState = 'processing'
  state.mergeMode = mode
  state.currentOutputPath = outputPath
  state.mergeStartTime = Date.now()
  mergeBtn.disabled = true
  showBanner(mode)
  startProgressMonitor(outputPath)

  try {
    await api.mergeVideos({ filePaths: state.videoFiles.map((f) => f.path), outputPath, mode, scalingMode, targetWidth, targetHeight })
    stopProgressMonitor()

    if (state.mergeState === 'processing') {
      state.mergeState = 'completed'
      hideBanner()
      showSuccessModal(
        outputPath,
        async () => { await api.showInFolder(outputPath); resetMerge(); updateMergeButton() },
        () => { resetMerge(); updateMergeButton() }
      )
    } else if (state.mergeState === 'cancelling') {
      const result = await api.forceDeleteFile(outputPath)
      hideBanner()
      if (!result.success) showDeleteErrorModal(outputPath, result.error ?? '', () => api.showInFolder(outputPath))
      resetMerge(); updateMergeButton()
    }
  } catch (err: unknown) {
    stopProgressMonitor()
    hideBanner()
    if (state.mergeState !== 'cancelling') {
      const msg = err instanceof Error ? err.message : '不明なエラー'
      alert('エラーが発生しました: ' + msg)
    }
    resetMerge(); updateMergeButton()
  }
})

// ── キャンセルボタン ──────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', async () => {
  if (!state.currentOutputPath || state.mergeState === 'cancelling') return
  const confirmed = await showCancelDialog()
  if (!confirmed) return

  state.mergeState = 'cancelling'
  bannerTitle.textContent = 'ファイルを削除中...'
  bannerHint.textContent = ''
  bannerProgress.textContent = '削除処理中...'
  ;(progressBanner.querySelector('.banner-icon') as HTMLElement).textContent = '🗑️'

  const result = await api.cancelMerge(state.currentOutputPath)
  hideBanner()

  if (!result.success) {
    showDeleteErrorModal(
      state.currentOutputPath,
      result.error ?? '',
      () => api.showInFolder(state.currentOutputPath)
    )
  }
  resetMerge(); updateMergeButton()
})

// ── ユーティリティ ────────────────────────────────────────────────────────────
async function generateUniqueName(dir: string, baseName: string): Promise<string> {
  for (let i = 1; i <= 1000; i++) {
    const candidate = `${baseName} (${i})`
    const fullPath = dir + '\\' + sanitizeFilename(candidate) + state.outputExtension
    if (!(await api.checkFileExists(fullPath))) return candidate
  }
  return `${baseName} (${Date.now()})`
}

// 初期化
updateMergeButton()
api.onMergeProgress((p) => {
  if (state.mergeMode !== 'reencode' || state.mergeState !== 'processing') return

  const totalSec = getTotalDuration()
  const currentSec = parseTimemark(p.timemark)
  const pct = totalSec > 0
    ? Math.min(100, Math.round((currentSec / totalSec) * 100))
    : 0

  const elapsed = (Date.now() - state.mergeStartTime) / 1000
  let detail: string

  if (pct >= 100) {
    detail = '100% (完了処理中...)'
  } else if (pct >= 95) {
    detail = `${pct}% (まもなく完了...)`
  } else if (elapsed > 3 && pct > 2) {
    const remaining = Math.max(0, (elapsed / pct) * 100 - elapsed)
    detail = remaining < 7200
      ? `${pct}% (残り約${formatDuration(remaining)})`
      : `${pct}% (処理中...)`
  } else {
    detail = `${pct}% (処理中...)`
  }

  updateBannerProgress(pct, detail)
})
