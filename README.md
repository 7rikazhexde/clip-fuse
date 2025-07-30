# Clip Fuse

Windows向けの動画結合アプリケーション。ドラッグ&ドロップで簡単に複数の動画ファイルを結合できます。

## 特徴

- 🎬 **ドラッグ&ドロップ対応**: 直感的な操作で動画ファイルを追加
- 🔄 **順序変更**: ファイルの結合順序を自由に変更
- 📊 **リアルタイム進捗**: ファイルサイズベースの安定した進捗表示
- ⏱️ **残り時間表示**: 正確な残り時間の推定
- ❌ **キャンセル機能**: 処理中のキャンセルと完了後のファイル削除
- 📦 **スタンドアロン**: FFmpeg内蔵でインストール不要

## 対応形式

- 入力: MP4, AVI, MOV, MKV, FLV, WMV, M4V, WebM
- 出力: MP4

## セットアップ（開発者向け）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd clip-fuse
```

### 2. FFmpegのセットアップ

```powershell
# PowerShellで実行（推奨）
.\scripts\setup-ffmpeg.ps1

# オプション例
.\scripts\setup-ffmpeg.ps1 -Verify          # 検証付き
.\scripts\setup-ffmpeg.ps1 -Force           # 強制再ダウンロード
.\scripts\setup-ffmpeg.ps1 -Version 7.1.1   # 特定バージョン
.\scripts\setup-ffmpeg.ps1 -Help            # ヘルプ表示
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発環境での実行

```bash
npm start
```

### 5. 本番ビルド

```bash
npm run build
```

## FFmpegバージョン管理

### 動作確認バージョン

- **7.1.1** 
- **7.0.2**

### バージョン設定
`scripts/ffmpeg-config.json`でバージョンとダウンロードURLを管理しています。

### トラブルシューティング

#### FFmpegのダウンロードに失敗する場合

```powershell
# 強制再ダウンロード
.\scripts\setup-ffmpeg.ps1 -Force

# 別のバージョンを試す
.\scripts\setup-ffmpeg.ps1 -Version 7.0.2
```

#### 権限エラーが発生する場合

```powershell
# 管理者権限でPowerShellを起動してから実行
```

#### 動作確認

```powershell
# FFmpegの動作テスト
.\scripts\setup-ffmpeg.ps1 -Verify
```

## プロジェクト構造

```
clip-fuse/
├── scripts/
│   ├── setup-ffmpeg.ps1      # FFmpegセットアップスクリプト
│   └── ffmpeg-config.json    # バージョン設定
├── ffmpeg/                   # FFmpegバイナリ（自動生成）
│   ├── ffmpeg.exe
│   └── ffprobe.exe
├── main.js                   # メインプロセス
├── preload.js                # プリロードスクリプト
├── index.html                # レンダラープロセス
├── style.css                 # スタイルシート
└── package.json              # プロジェクト設定
```

## 開発時のワークフロー

1. **初回セットアップ**

   ```bash
   git clone https://github.com/7rikazhexde/clip-fuse.git
   cd clip-fuse
   .\scripts\setup-ffmpeg.ps1
   npm install
   ```

2. **開発**

   ```bash
   npm start
   ```

3. **ビルド**

   ```bash
   npm run build
   ```

4. **FFmpeg更新**

   ```bash
   .\scripts\setup-ffmpeg.ps1 -Force -Version 7.1.1
   ```

## トラブルシューティング

問題が発生した場合は、以下を確認してください。

1. **FFmpegの確認**: `.\scripts\setup-ffmpeg.ps1 -Verify`
2. **依存関係の再インストール**: `npm install`
3. **ビルドキャッシュのクリア**: `npm run build`前に`dist/`フォルダを削除
