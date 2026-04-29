// IPC チャンネル名（typo防止のため文字列リテラル型で管理）
export const IPC = {
  SELECT_FILES: 'select-files',
  SELECT_OUTPUT: 'select-output-folder',
  GET_VIDEO_INFO: 'get-video-info',
  GET_FILE_SIZE: 'get-file-size',
  MERGE_VIDEOS: 'merge-videos',
  CANCEL_MERGE: 'cancel-merge',
  DELETE_FILE: 'force-delete-file',
  CHECK_EXISTS: 'check-file-exists',
  SHOW_IN_FOLDER: 'show-in-folder',
  MERGE_PROGRESS: 'merge-progress',
  TEST_FFMPEG: 'test-ffmpeg',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export interface VideoInfo {
  duration: number
  size: number
  width: number
  height: number
  fps: number
  codec: string
}

export type MergeMode = 'copy' | 'reencode'
export type ScalingMode = 'letterbox' | 'crop'

export interface MergeOptions {
  filePaths: string[]
  outputPath: string
  mode: MergeMode
  scalingMode?: ScalingMode
  targetWidth?: number
  targetHeight?: number
}

export interface MergeProgress {
  percent: number
  timemark: string
  fps: number
}

export interface DeleteResult {
  success: boolean
  reason?: string
  error?: string
}

export interface FfmpegTestResult {
  success: boolean
  version?: string
  ffmpegPath?: string
  error?: string
  ffmpegExists?: boolean
}

// レンダラー側のファイルエントリ
export interface VideoFile {
  id: number
  path: string
  name: string
  originalName: string
  duration: number
  size: number
  width: number
  height: number
  fps: number
  codec: string
  addedAt: Date
  hasError?: boolean
}
