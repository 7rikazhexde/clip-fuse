import { describe, it, expect } from 'vitest'
import { formatDuration, formatFileSize, sanitizeFilename, parseTimemark } from '../../src/renderer/src/format.js'

describe('formatDuration', () => {
  it('0 を渡すと 00:00:00 を返す', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('負の値を渡すと 00:00:00 を返す', () => {
    expect(formatDuration(-1)).toBe('00:00:00')
  })

  it('秒を HH:MM:SS 形式に変換する', () => {
    expect(formatDuration(3661)).toBe('01:01:01')
  })

  it('1 時間未満を正しくフォーマットする', () => {
    expect(formatDuration(90)).toBe('00:01:30')
  })

  it('各単位を 2 桁ゼロ埋めする', () => {
    expect(formatDuration(3599)).toBe('00:59:59')
  })
})

describe('formatFileSize', () => {
  it('0 バイトは "0 B" を返す', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('負の値は "0 B" を返す', () => {
    expect(formatFileSize(-1)).toBe('0 B')
  })

  it('1024 未満はバイト表示する', () => {
    expect(formatFileSize(500)).toBe('500.0 B')
  })

  it('KB 単位に変換する', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('MB 単位に変換する', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })

  it('GB 単位に変換する', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('TB 以上は GB にクランプする', () => {
    expect(formatFileSize(1024 ** 4)).toBe('1024.0 GB')
  })
})

describe('sanitizeFilename', () => {
  it('禁止文字をアンダースコアに置換する', () => {
    expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file_________name')
  })

  it('スペースをアンダースコアに置換する', () => {
    expect(sanitizeFilename('hello world')).toBe('hello_world')
  })

  it('連続するスペースをひとつのアンダースコアにまとめる', () => {
    expect(sanitizeFilename('a  b')).toBe('a_b')
  })

  it('問題のない文字列はそのまま返す', () => {
    expect(sanitizeFilename('output_2024.mp4')).toBe('output_2024.mp4')
  })
})

describe('parseTimemark', () => {
  it('HH:MM:SS を秒数に変換する', () => {
    expect(parseTimemark('01:02:03')).toBe(3723)
  })

  it('00:00:00 は 0 を返す', () => {
    expect(parseTimemark('00:00:00')).toBe(0)
  })

  it('小数秒を正しく処理する', () => {
    expect(parseTimemark('00:01:30.5')).toBe(90.5)
  })

  it('コロンが 2 つ未満の文字列は 0 を返す', () => {
    expect(parseTimemark('01:02')).toBe(0)
  })

  it('コロンのない文字列は 0 を返す', () => {
    expect(parseTimemark('invalid')).toBe(0)
  })
})
