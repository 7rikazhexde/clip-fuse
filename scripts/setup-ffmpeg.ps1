# Clip Fuse - FFmpeg Setup Script
# このスクリプトは開発環境用のFFmpegバイナリを自動セットアップします

param(
    [switch]$Force,          # 強制再ダウンロード
    [switch]$Verify,         # ダウンロード後の検証実行
    [string]$Version = "7.1.1",   # 特定バージョンを指定
    [switch]$Help           # ヘルプ表示
)

# ヘルプ表示
if ($Help) {
    Write-Host "FFmpeg Setup Script for Clip Fuse" -ForegroundColor Green
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\setup-ffmpeg.ps1                 # 標準セットアップ (7.1.1)"
    Write-Host "  .\setup-ffmpeg.ps1 -Force          # 強制再ダウンロード"
    Write-Host "  .\setup-ffmpeg.ps1 -Verify         # 検証付きセットアップ"
    Write-Host "  .\setup-ffmpeg.ps1 -Version 7.1.1  # 特定バージョン指定"
    Write-Host ""
    Write-Host "オプション:"
    Write-Host "  -Force    既存のFFmpegを削除して再ダウンロード"
    Write-Host "  -Verify   ダウンロード後にFFmpegの動作確認を実行"
    Write-Host "  -Version  特定のFFmpegバージョンを指定 (デフォルト: 7.1.1)"
    Write-Host "  -Help     このヘルプを表示"
    Write-Host ""
    Write-Host "現在サポート: FFmpeg 7.1.1 (最新安定版)"
    exit 0
}

# 設定
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FFmpegDir = Join-Path $ProjectRoot "ffmpeg"
$ConfigFile = Join-Path $ScriptDir "ffmpeg-config.json"
$TempDir = Join-Path $env:TEMP "video-merger-ffmpeg-setup"

# 設定ファイルの読み込み
function Get-FFmpegConfig {
    if (-not (Test-Path $ConfigFile)) {
        Write-Error "設定ファイルが見つかりません: $ConfigFile"
        exit 1
    }
    
    try {
        $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        
        # デバッグ情報表示
        Write-Host "設定ファイル読み込み完了: $ConfigFile" -ForegroundColor Gray
        Write-Host "推奨バージョン: $($config.recommendedVersion)" -ForegroundColor Gray
        Write-Host "利用可能なバージョン: $($config.supportedVersions.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
        Write-Host ""
        
        return $config
    }
    catch {
        Write-Error "設定ファイルの読み込みに失敗しました: $_"
        exit 1
    }
}

# 進捗表示付きダウンロード
function Invoke-DownloadWithProgress {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$Description
    )
    
    Write-Host "ダウンロード中: $Description" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    Write-Host "保存先: $OutputPath" -ForegroundColor Gray
    
    try {
        # PowerShell 5.1互換のダウンロード方法
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $OutputPath)
        Write-Host "✓ ダウンロード完了" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "ダウンロードに失敗しました: $_"
        return $false
    }
    finally {
        if ($webClient) { $webClient.Dispose() }
    }
}

# FFmpegが既に存在するかチェック
function Test-FFmpegExists {
    $ffmpegExe = Join-Path $FFmpegDir "ffmpeg.exe"
    $ffprobeExe = Join-Path $FFmpegDir "ffprobe.exe"
    
    return (Test-Path $ffmpegExe) -and (Test-Path $ffprobeExe)
}

# FFmpegのバージョンを取得
function Get-FFmpegVersion {
    $ffmpegExe = Join-Path $FFmpegDir "ffmpeg.exe"
    
    if (-not (Test-Path $ffmpegExe)) {
        Write-Host "FFmpeg実行ファイルが見つかりません: $ffmpegExe" -ForegroundColor Gray
        return $null
    }
    
    try {
        $output = & $ffmpegExe -version 2>&1
        # 配列の場合、最初の行を取得
        $firstLine = if ($output -is [array]) { $output[0] } else { $output }
        Write-Host "FFmpeg出力（最初の行）: $firstLine" -ForegroundColor Gray
        Write-Host "FFmpeg出力（全行数）: $($output.Count)" -ForegroundColor Gray
        
        if ($firstLine -match "ffmpeg version ([^\s]+)") {
            $fullVersion = $matches[1]
            Write-Host "検出されたFFmpegフルバージョン: $fullVersion" -ForegroundColor Gray
            # バージョン番号のみ抽出（例：7.1.1-essentials_build-www.gyan.dev → 7.1.1）
            if ($fullVersion -match "^(\d+\.\d+\.\d+)") {
                $version = $matches[1]
                Write-Host "抽出されたバージョン番号: $version" -ForegroundColor Gray
                return $version
            } else {
                Write-Warning "バージョン番号の抽出に失敗しました。フルバージョン: $fullVersion"
                Write-Host "期待される形式: X.Y.Z[-suffix]（例: 7.1.1-essentials_build-www.gyan.dev）" -ForegroundColor Gray
                return $null
            }
        } else {
            Write-Warning "FFmpegのバージョン情報が取得できませんでした。出力形式が異なる可能性があります。"
            Write-Host "期待される形式: ffmpeg version X.Y.Z[-suffix]（例: ffmpeg version 7.1.1-essentials_build-www.gyan.dev）" -ForegroundColor Gray
            Write-Host "実際の出力（最初の行）: $firstLine" -ForegroundColor Gray
            return $null
        }
    }
    catch {
        Write-Warning "FFmpegバージョン取得中にエラー: $_"
        return $null
    }
}

# FFmpegの動作確認
function Test-FFmpegWorking {
    Write-Host "FFmpegの動作確認を実行中..." -ForegroundColor Yellow
    
    $ffmpegExe = Join-Path $FFmpegDir "ffmpeg.exe"
    $ffprobeExe = Join-Path $FFmpegDir "ffprobe.exe"
    
    # FFmpeg version check
    try {
        $ffmpegOutput = & $ffmpegExe -version 2>&1
        if ($ffmpegOutput -match "ffmpeg version") {
            Write-Host "✓ FFmpeg: 動作確認OK" -ForegroundColor Green
        } else {
            Write-Warning "FFmpegの出力が期待されたものではありません"
            return $false
        }
    }
    catch {
        Write-Error "FFmpegの実行に失敗しました: $_"
        return $false
    }
    
    # FFprobe version check
    try {
        $ffprobeOutput = & $ffprobeExe -version 2>&1
        if ($ffprobeOutput -match "ffprobe version") {
            Write-Host "✓ FFprobe: 動作確認OK" -ForegroundColor Green
        } else {
            Write-Warning "FFprobeの出力が期待されたものではありません"
            return $false
        }
    }
    catch {
        Write-Error "FFprobeの実行に失敗しました: $_"
        return $false
    }
    
    return $true
}

# メイン処理
function Main {
    Write-Host "=== Clip Fuse FFmpeg Setup ===" -ForegroundColor Cyan
    Write-Host ""
    
    # 設定読み込み
    $config = Get-FFmpegConfig
    
    # バージョン決定
    $targetVersion = if ($Version -and $Version -ne "") { $Version } else { $config.recommendedVersion }
    
    # PowerShell 5.1互換のプロパティアクセス
    $downloadUrl = $null
    switch ($targetVersion) {
        "7.1.1" { $downloadUrl = $config.supportedVersions."7.1.1".url }
        "7.0.2" { $downloadUrl = $config.supportedVersions."7.0.2".url }
        default { 
            # 将来の拡張用：動的プロパティアクセス
            $downloadUrl = $config.supportedVersions.PSObject.Properties | Where-Object { $_.Name -eq $targetVersion } | Select-Object -ExpandProperty Value | Select-Object -ExpandProperty url -First 1
        }
    }
    
    if (-not $downloadUrl) {
        Write-Host ""
        Write-Error "バージョン $targetVersion の ダウンロードURLが見つかりません"
        Write-Host ""
        Write-Host "📋 デバッグ情報:" -ForegroundColor Yellow
        Write-Host "  推奨バージョン: $($config.recommendedVersion)" -ForegroundColor Gray
        Write-Host "  指定バージョン: $targetVersion" -ForegroundColor Gray
        Write-Host "  利用可能なバージョン:" -ForegroundColor Gray
        $config.supportedVersions.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name): $($_.Value.url.Substring(0, [Math]::Min(50, $_.Value.url.Length)))..." -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "💡 解決方法:" -ForegroundColor Cyan
        Write-Host "  利用可能なバージョンのいずれかを指定してください:" -ForegroundColor White
        $config.supportedVersions.PSObject.Properties.Name | ForEach-Object {
            Write-Host "    .\setup-ffmpeg.ps1 -Version $_" -ForegroundColor Gray
        }
        exit 1
    }
    
    # バージョン情報の表示
    Write-Host "🎯 インストール対象バージョン: $targetVersion" -ForegroundColor Green
    
    # バージョンノート取得
    $versionNote = $null
    switch ($targetVersion) {
        "7.1.1" { $versionNote = $config.supportedVersions."7.1.1".description }
        "7.0.2" { $versionNote = $config.supportedVersions."7.0.2".description }
        default { 
            # 将来の拡張用
            $versionNote = $config.supportedVersions.PSObject.Properties | Where-Object { $_.Name -eq $targetVersion } | Select-Object -ExpandProperty Value | Select-Object -ExpandProperty description -First 1
        }
    }
    
    if ($versionNote) {
        Write-Host "   📝 $versionNote" -ForegroundColor Gray
    }
    
    # Forceオプションの詳細表示
    if ($Force) {
        Write-Host "⚡ 強制モード: 既存のFFmpegを削除して最新の推奨バージョン $targetVersion をインストールします" -ForegroundColor Yellow
        if (Test-FFmpegExists) {
            $currentVersion = Get-FFmpegVersion
            if ($currentVersion) {
                Write-Host "   現在のバージョン: $currentVersion → $targetVersion に更新" -ForegroundColor Cyan
            }
        }
    }
    
    # Verifyオプションの説明
    if ($Verify) {
        Write-Host "🔍 検証モード: インストール後にFFmpegの動作確認を実行します" -ForegroundColor Blue
    }
    
    Write-Host "プロジェクトルート: $ProjectRoot" -ForegroundColor Gray
    Write-Host ""
    
    # 既存チェック
    if (Test-FFmpegExists -and -not $Force) {
        Write-Host "✅ FFmpegは既にインストール済みです" -ForegroundColor Green
        $currentVersion = Get-FFmpegVersion
        
        if ($currentVersion -eq $targetVersion) {
            Write-Host "🎉 現在のバージョン: $currentVersion （目標バージョンと一致）" -ForegroundColor Green
            
            if ($Verify) {
                Write-Host ""
                if (Test-FFmpegWorking) {
                    Write-Host "✅ セットアップ完了（検証済み）" -ForegroundColor Green
                } else {
                    Write-Warning "❌ 動作確認に失敗しました。-Force オプションで再インストールを検討してください"
                    Write-Host "実行例: .\setup-ffmpeg.ps1 -Force -Verify" -ForegroundColor Gray
                    exit 1
                }
            } else {
                Write-Host "✅ セットアップ完了（既に指定バージョン $targetVersion がインストール済み）" -ForegroundColor Green
                Write-Host "💡 動作確認を実行する場合: .\setup-ffmpeg.ps1 -Verify" -ForegroundColor Gray
            }
            exit 0
        } elseif ($currentVersion) {
            Write-Host "📋 バージョンが異なります" -ForegroundColor Yellow
            Write-Host "   現在: $currentVersion" -ForegroundColor Gray
            Write-Host "   推奨: $targetVersion" -ForegroundColor Gray
            Write-Host ""
            Write-Host "💡 更新する場合: .\setup-ffmpeg.ps1 -Force" -ForegroundColor Cyan
            Write-Host "💡 特定バージョン: .\setup-ffmpeg.ps1 -Force -Version $targetVersion" -ForegroundColor Cyan
            exit 0
        } else {
            Write-Warning "バージョンの検出に失敗しました。"
            Write-Host "💡 FFmpegがインストール済みですが、バージョンが不明です。インストールを続行しますか？ (Y/N): " -NoNewline -ForegroundColor Yellow
            $response = Read-Host
            if ($response -ne "Y" -and $response -ne "y") {
                Write-Host "✅ インストールをスキップしました。既存のFFmpegを保持します。" -ForegroundColor Green
                Write-Host "💡 動作確認を実行する場合: .\setup-ffmpeg.ps1 -Verify" -ForegroundColor Gray
                Write-Host "💡 再インストールする場合: .\setup-ffmpeg.ps1 -Force" -ForegroundColor Gray
                exit 0
            }
        }
    }
    
    # 強制モードの場合は既存を削除
    if ($Force -and (Test-Path $FFmpegDir)) {
        Write-Host "🗑️  既存のFFmpegを削除中..." -ForegroundColor Yellow
        Remove-Item $FFmpegDir -Recurse -Force
        Write-Host "✅ 削除完了" -ForegroundColor Green
    }
    
    # インストール開始の明確な表示
    Write-Host ""
    Write-Host "🚀 FFmpeg $targetVersion のインストールを開始します" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    # ディレクトリ作成
    if (-not (Test-Path $FFmpegDir)) {
        New-Item -ItemType Directory -Path $FFmpegDir -Force | Out-Null
    }
    
    if (-not (Test-Path $TempDir)) {
        New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    }
    
    # ダウンロード
    $zipFileName = "ffmpeg-$targetVersion-essentials.zip"
    $zipPath = Join-Path $TempDir $zipFileName
    
    Write-Host "📥 ステップ 1/4: FFmpeg $targetVersion をダウンロード中..." -ForegroundColor Yellow
    Write-Host "    URL: $downloadUrl" -ForegroundColor Gray
    Write-Host "    保存先: $zipPath" -ForegroundColor Gray
    
    if (-not (Invoke-DownloadWithProgress -Url $downloadUrl -OutputPath $zipPath -Description "FFmpeg $targetVersion")) {
        Write-Error "❌ ダウンロードに失敗しました"
        exit 1
    }
    
    # ファイルサイズ確認
    $zipSize = (Get-Item $zipPath).Length
    $zipSizeMB = [Math]::Round($zipSize / 1MB, 1)
    Write-Host "✅ ダウンロード完了 (ファイルサイズ: $zipSizeMB MB)" -ForegroundColor Green
    
    # 解凍
    Write-Host ""
    Write-Host "📦 ステップ 2/4: ファイルを解凍中..." -ForegroundColor Yellow
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $TempDir)
        Write-Host "✅ 解凍完了" -ForegroundColor Green
    }
    catch {
        Write-Error "❌ 解凍に失敗しました: $_"
        Write-Host "💡 トラブルシューティング:" -ForegroundColor Yellow
        Write-Host "   - 一時ディレクトリを削除: Remove-Item '$TempDir' -Recurse -Force" -ForegroundColor Gray
        Write-Host "   - 再実行: .\setup-ffmpeg.ps1 -Force" -ForegroundColor Gray
        exit 1
    }
    
    # バイナリファイルをコピー
    Write-Host ""
    Write-Host "📁 ステップ 3/4: バイナリファイルをコピー中..." -ForegroundColor Yellow
    
    $extractedDir = Get-ChildItem $TempDir -Directory | Where-Object { $_.Name -like "ffmpeg-*" } | Select-Object -First 1
    if (-not $extractedDir) {
        Write-Error "❌ 解凍されたFFmpegディレクトリが見つかりません"
        Write-Host "💡 確認: Get-ChildItem '$TempDir' -Directory" -ForegroundColor Gray
        exit 1
    }
    
    $binDir = Join-Path $extractedDir.FullName "bin"
    if (-not (Test-Path $binDir)) {
        Write-Error "❌ binディレクトリが見つかりません: $binDir"
        exit 1
    }
    
    # 必要なファイルをコピー
    $requiredFiles = @("ffmpeg.exe", "ffprobe.exe")
    $copiedFiles = @()
    
    foreach ($file in $requiredFiles) {
        $srcPath = Join-Path $binDir $file
        $dstPath = Join-Path $FFmpegDir $file
        
        if (Test-Path $srcPath) {
            Copy-Item $srcPath $dstPath -Force
            $fileSize = (Get-Item $dstPath).Length
            $fileSizeMB = [Math]::Round($fileSize / 1MB, 1)
            Write-Host "   ✅ $file をコピー完了 ($fileSizeMB MB)" -ForegroundColor Green
            $copiedFiles += $file
        } else {
            Write-Error "❌ 必要なファイルが見つかりません: $srcPath"
            exit 1
        }
    }
    
    Write-Host "✅ $($copiedFiles.Count) 個のファイルをコピー完了" -ForegroundColor Green
    
    # 一時ファイル削除
    Write-Host ""
    Write-Host "🧹 ステップ 4/4: 一時ファイルを削除中..." -ForegroundColor Yellow
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ クリーンアップ完了" -ForegroundColor Green
    
    # 検証
    Write-Host ""
    if ($Verify -or $config.alwaysVerify) {
        Write-Host "🔍 動作確認を実行中..." -ForegroundColor Blue
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        
        if (-not (Test-FFmpegWorking)) {
            Write-Error "❌ FFmpegの動作確認に失敗しました"
            Write-Host ""
            Write-Host "💡 トラブルシューティング:" -ForegroundColor Yellow
            Write-Host "   1. 別のバージョンを試す: .\setup-ffmpeg.ps1 -Force -Version 7.0.2" -ForegroundColor Gray
            Write-Host "   2. 管理者権限で実行" -ForegroundColor Gray
            Write-Host "   3. ウイルス対策ソフトの除外設定を確認" -ForegroundColor Gray
            exit 1
        }
        Write-Host "✅ 動作確認完了" -ForegroundColor Green
    }
    
    # 成功メッセージ
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "🎉 FFmpeg セットアップが正常に完了しました！" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 インストール情報:" -ForegroundColor Cyan
    Write-Host "   バージョン: $targetVersion" -ForegroundColor Yellow
    Write-Host "   インストール先: $FFmpegDir" -ForegroundColor Gray
    Write-Host "   インストールファイル: $($copiedFiles -join ', ')" -ForegroundColor Gray
    
    # バージョン特有の情報表示
    $finalVersionNote = $null
    switch ($targetVersion) {
        "7.1.1" { $finalVersionNote = $config.supportedVersions."7.1.1".description }
        "7.0.2" { $finalVersionNote = $config.supportedVersions."7.0.2".description }
        default { 
            # 将来の拡張用
            $finalVersionNote = $config.supportedVersions.PSObject.Properties | Where-Object { $_.Name -eq $targetVersion } | Select-Object -ExpandProperty Value | Select-Object -ExpandProperty description -First 1
        }
    }
    
    if ($finalVersionNote) {
        Write-Host ""
        Write-Host "ℹ️  バージョン情報:" -ForegroundColor Blue
        Write-Host "   $finalVersionNote" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "🚀 次のステップ:" -ForegroundColor Cyan
    Write-Host "   1. npm install      # 依存関係のインストール" -ForegroundColor White
    Write-Host "   2. npm start        # アプリケーションの起動" -ForegroundColor White  
    Write-Host "   3. npm run build    # 本番ビルド" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 その他のコマンド:" -ForegroundColor Blue
    Write-Host "   .\setup-ffmpeg.ps1 -Verify           # 動作確認のみ実行" -ForegroundColor Gray
    Write-Host "   .\setup-ffmpeg.ps1 -Force -Version   # 別バージョンに変更" -ForegroundColor Gray
}

# 実行権限チェック
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "このスクリプトは管理者権限で実行することを推奨します"
    Write-Host "続行しますか？ (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "Y" -and $response -ne "y") {
        exit 0
    }
}

# メイン処理実行
try {
    Main
}
catch {
    Write-Error "予期しないエラーが発生しました: $_"
    Write-Host "トラブルシューティング:"
    Write-Host "1. インターネット接続を確認してください"
    Write-Host "2. -Force オプションで再実行してください"
    Write-Host "3. 管理者権限で実行してください"
    exit 1
}