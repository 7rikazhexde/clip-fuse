import type { VideoFile, MergeMode } from '../../types/index.js'

export type MergeState = 'idle' | 'processing' | 'completed' | 'cancelling'

export interface AppState {
  videoFiles: VideoFile[]
  outputDir: string
  mergeState: MergeState
  mergeMode: MergeMode
  currentOutputPath: string
  mergeStartTime: number
  totalInputSize: number
  outputExtension: string
}

export const state: AppState = {
  videoFiles: [],
  outputDir: '',
  mergeState: 'idle',
  mergeMode: 'copy',
  currentOutputPath: '',
  mergeStartTime: 0,
  totalInputSize: 0,
  outputExtension: '.mp4'
}

export function getTotalDuration(): number {
  return state.videoFiles.reduce((sum, f) => sum + (f.duration ?? 0), 0)
}

export function getTotalSize(): number {
  return state.videoFiles.reduce((sum, f) => sum + (f.size ?? 0), 0)
}

export function getUniqueResolutions(): string[] {
  const set = new Set(
    state.videoFiles
      .filter((f) => f.width > 0 && f.height > 0)
      .map((f) => `${f.width}x${f.height}`)
  )
  return [...set]
}

export interface ResolutionOption {
  width: number
  height: number
  label: string
}

export function getResolutionOptions(): ResolutionOption[] {
  const map = new Map<string, { width: number; height: number; names: string[] }>()

  state.videoFiles.forEach((f) => {
    if (f.width <= 0 || f.height <= 0) return
    const key = `${f.width}x${f.height}`
    const entry = map.get(key)
    if (!entry) {
      map.set(key, { width: f.width, height: f.height, names: [f.name] })
    } else {
      entry.names.push(f.name)
    }
  })

  return [...map.values()].map(({ width, height, names }) => ({
    width,
    height,
    label: names.length === 1
      ? `${width}×${height}（${names[0]}）`
      : `${width}×${height}（${names[0]} 他${names.length - 1}件）`
  }))
}

export function getUniqueExtensions(): string[] {
  if (state.videoFiles.length === 0) return ['.mp4']
  const set = new Set(
    state.videoFiles.map((f) => f.path.match(/\.[^/.]+$/)?.[0]?.toLowerCase() ?? '.mp4')
  )
  return [...set]
}

export function resetMerge(): void {
  state.mergeState = 'idle'
  state.currentOutputPath = ''
  state.mergeStartTime = 0
}
