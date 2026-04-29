# Clip Fuse - 手動テスト用動画生成スクリプト
# UIの動作確認など手動テストで使う動画ファイルを生成します。
# 自動テスト（npm test）はこのスクリプトを使わず Vitest が動画を自動生成します。

param(
    [string]$OutputDir = "test-videos",
    [switch]$Help
)

if ($Help) {
    Write-Host "使用方法:"
    Write-Host "  .\scripts\create-test-videos.ps1                      # デフォルト出力先 (test-videos/)"
    Write-Host "  .\scripts\create-test-videos.ps1 -OutputDir my-videos # 出力先を指定"
    exit 0
}

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FFmpegBin  = Join-Path $ProjectRoot "ffmpeg\ffmpeg.exe"
$OutputPath = Join-Path $ProjectRoot $OutputDir

if (-not (Test-Path $FFmpegBin)) {
    Write-Error "FFmpegが見つかりません: $FFmpegBin"
    Write-Host "先に .\scripts\setup-ffmpeg.ps1 を実行してください。"
    exit 1
}

Write-Host "出力先: $OutputPath"
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputPath\mixed-resolution" -Force | Out-Null

function New-TestVideo {
    param([string]$Out, [string]$Color, [int]$Width, [int]$Height, [int]$Duration)
    Write-Host "  作成中: $Out ($($Width)x$($Height), ${Duration}s)"
    & $FFmpegBin -y `
        -f lavfi -i "color=c=${Color}:s=${Width}x${Height}:r=30" `
        -f lavfi -i "sine=frequency=440:sample_rate=44100" `
        -t $Duration -c:v libx264 -c:a aac -shortest `
        $Out 2>$null
}

Write-Host "`n--- 同一解像度 (1920x1080) ---"
New-TestVideo "$OutputPath\clip_1080p_red.mp4"   "red"   1920 1080 5
New-TestVideo "$OutputPath\clip_1080p_green.mp4" "green" 1920 1080 3
New-TestVideo "$OutputPath\clip_1080p_blue.mp4"  "blue"  1920 1080 4

Write-Host "`n--- 異なる解像度（解像度不一致テスト用）---"
New-TestVideo "$OutputPath\mixed-resolution\clip_1080p.mp4" "red"   1920 1080 5
New-TestVideo "$OutputPath\mixed-resolution\clip_720p.mp4"  "blue"  1280 720  3
New-TestVideo "$OutputPath\mixed-resolution\clip_480p.mp4"  "green" 854  480  4

Write-Host "`n=== 完了 ==="
Get-ChildItem $OutputPath -Recurse -File | ForEach-Object {
    Write-Host ("  " + $_.FullName.Replace($ProjectRoot + "\", ""))
}
