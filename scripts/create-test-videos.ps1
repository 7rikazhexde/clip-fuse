# プロジェクトディレクトリにいることを確認
Get-Location

# テスト用フォルダを作成
New-Item -ItemType Directory -Name "test-videos" -Force
New-Item -ItemType Directory -Name "test-videos\folder1" -Force
New-Item -ItemType Directory -Name "test-videos\folder2" -Force
New-Item -ItemType Directory -Name "test-videos\folder3" -Force

Write-Host "FFmpegでテスト動画を作成中..."

# テスト動画1: 5秒間の赤い画面
& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=red:size=640x480:duration=5" -c:v libx264 -pix_fmt yuv420p "test-videos\video1.mp4" -y

# テスト動画2: 3秒間の青い画面
& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=blue:size=640x480:duration=3" -c:v libx264 -pix_fmt yuv420p "test-videos\video2.mp4" -y

# テスト動画3: 4秒間の緑の画面
& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=green:size=640x480:duration=4" -c:v libx264 -pix_fmt yuv420p "test-videos\video3.mp4" -y

# 同名ファイルテスト用：異なるフォルダに同じ名前で異なる内容
& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=yellow:size=640x480:duration=2" -c:v libx264 -pix_fmt yuv420p "test-videos\folder1\test.mp4" -y

& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=purple:size=640x480:duration=6" -c:v libx264 -pix_fmt yuv420p "test-videos\folder2\test.mp4" -y

& "ffmpeg\ffmpeg.exe" -f lavfi -i "color=orange:size=640x480:duration=3" -c:v libx264 -pix_fmt yuv420p "test-videos\folder3\test.mp4" -y

# 作成されたファイルを確認
Write-Host "`n=== 作成されたテストファイル ==="
Get-ChildItem "test-videos" -Recurse | Format-Table Name, Directory, Length, LastWriteTime

# ファイルの詳細情報
Write-Host "`n=== ファイル詳細 ==="
Get-ChildItem "test-videos" -Recurse -File | ForEach-Object {
    Write-Host "$($_.FullName)"
    & "ffmpeg\ffprobe.exe" -v quiet -print_format json -show_format "$($_.FullName)" | ConvertFrom-Json | Select-Object -ExpandProperty format | Select-Object filename, duration, size | Format-List
}