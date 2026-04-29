# Clip Fuse

Windows向けの動画結合アプリケーション。ドラッグ&ドロップで簡単に複数の動画ファイルを結合できます。

![app-capture.png](.demo/app-capture.png)

## 特徴

- **ドラッグ&ドロップ対応**: 直感的な操作で動画ファイルを追加
- **順序変更**: ファイルの結合順序を自由に変更
- **解像度不一致を検出**: 異なる解像度のファイルを混在させた際に再エンコードを提案
- **リアルタイム進捗**: ファイルサイズベースの安定した進捗表示と残り時間の推定
- **キャンセル機能**: 処理中のキャンセルと生成ファイルの削除
- **スタンドアロン**: FFmpeg内蔵でインストール不要

## 対応形式

| 項目 | 内容 |
| ---- | ---- |
| 入力 | MP4, AVI, MOV, MKV, FLV, WMV, M4V, WebM |
| 出力 | MP4 |
| 結合モード | ストリームコピー（同一解像度）/ 再エンコード（異なる解像度） |

## インストール（エンドユーザー向け）

### 動作環境

- Windows 10 / 11（64bit）
- 追加ソフトウェアのインストール不要（FFmpeg内蔵）

### インストール手順

1. [Releases](https://github.com/7rikazhexde/clip-fuse/releases) から
   最新の `Clip-Fuse-Setup-x.x.x.exe` をダウンロード
2. ダウンロードした `.exe` をダブルクリックして実行
3. インストール先を選択して「インストール」をクリック
4. 完了後、デスクトップまたはスタートメニューの「Clip Fuse」から起動

> **注意**: SmartScreenの警告が表示された場合は「詳細情報」→「実行」をクリックしてください。

### ローカルビルドからインストール

Releases を使わず、ソースコードからインストーラーを生成して使う方法です。

#### 事前に必要なもの

- [Node.js](https://nodejs.org/) v20.15.1 以上
- [Git](https://git-scm.com/)
- PowerShell（Windows標準）

#### 手順

```powershell
# 1. リポジトリを取得
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse

# 2. FFmpeg バイナリをセットアップ
.\scripts\setup-ffmpeg.ps1

# 3. 依存パッケージをインストール
npm install

# 4. インストーラーをビルド
npm run build
```

ビルドが完了すると `dist\Clip Fuse Setup x.x.x.exe` が生成されます。
このファイルをダブルクリックすると通常のインストーラーとして実行できます。

### アンインストール

「設定」→「アプリ」→「Clip Fuse」→「アンインストール」から削除できます。

### 使い方

1. 動画ファイルをドラッグ&ドロップ、またはボタンでファイルを選択
2. ドラッグで結合順序を変更
3. 出力ファイル名と保存先フォルダを指定
4. 「動画を結合」をクリック
5. 異なる解像度のファイルを混在させた場合、再エンコードするか確認ダイアログが表示されます

## セットアップ（開発者向け）

### 1. リポジトリのクローン

```bash
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse
```

### 2. FFmpegのセットアップ

```powershell
.\scripts\setup-ffmpeg.ps1

# オプション
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
npm run dev
```

### 5. 本番ビルド

```bash
npm run build
```

## 開発コマンド一覧

| コマンド | 内容 |
| -------- | ---- |
| `npm run dev` | 開発サーバー起動（ホットリロード） |
| `npm start` | ビルド済みアプリのプレビュー起動 |
| `npm run build` | プロダクションビルド（`out/` + インストーラー） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint 実行 |
| `npm test` | Vitest テスト実行 |
| `npm run test:watch` | テストウォッチモード |

## プロジェクト構造

```text
clip-fuse/
├── src/
│   ├── types/
│   │   └── index.ts              # IPC定数・共有型定義
│   ├── main/
│   │   ├── index.ts              # メインプロセス エントリポイント
│   │   ├── ipc/
│   │   │   ├── dialog.ts         # ファイル選択ダイアログ IPC
│   │   │   ├── filesystem.ts     # ファイル操作 IPC
│   │   │   └── ffmpeg.ts         # FFmpeg IPC
│   │   └── services/
│   │       ├── ffmpeg-path.ts    # バイナリパス解決（クロスプラットフォーム）
│   │       ├── ffmpeg-probe.ts   # メタデータ取得（解像度・fps含む）
│   │       ├── ffmpeg-merge.ts   # 動画結合（copy / reencode 2モード）
│   │       └── file-deleter.ts   # Windowsファイル強制削除
│   ├── preload/
│   │   └── index.ts              # 型付き IPC ブリッジ
│   └── renderer/
│       ├── index.html            # HTML テンプレート
│       └── src/
│           ├── main.ts           # レンダラー エントリポイント
│           ├── store.ts          # アプリ状態管理
│           ├── modal.ts          # モーダル ファクトリ
│           ├── format.ts         # フォーマットユーティリティ
│           └── style.css         # スタイルシート
├── tests/
│   ├── unit/
│   │   ├── ffmpeg-probe.test.ts  # メタデータ取得テスト
│   │   └── file-deleter.test.ts  # ファイル削除テスト
│   └── integration/
│       └── merge.test.ts         # 結合テスト（テスト動画を自動生成）
├── scripts/
│   ├── setup-ffmpeg.ps1          # FFmpeg セットアップスクリプト
│   ├── create-test-videos.ps1    # 手動テスト用動画生成スクリプト
│   └── ffmpeg-config.json        # FFmpeg バージョン設定
├── ffmpeg/                       # FFmpeg バイナリ（自動生成）
│   ├── ffmpeg.exe
│   └── ffprobe.exe
├── out/                          # ビルド出力（自動生成）
├── electron.vite.config.ts       # electron-vite 設定
├── tsconfig.json                 # TypeScript 設定（ルート）
├── tsconfig.node.json            # TypeScript 設定（main / preload）
├── tsconfig.web.json             # TypeScript 設定（renderer）
├── vitest.config.ts              # Vitest 設定
└── package.json
```

## FFmpegバージョン管理

`scripts/ffmpeg-config.json` でバージョンとダウンロードURLを管理しています。

### 動作確認バージョン

| バージョン | 状態 |
| ---------- | ---- |
| 7.1.1 | 推奨 |
| 7.0.2 | 安定版（フォールバック） |

## 開発時のワークフロー

```bash
# 初回セットアップ
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse
.\scripts\setup-ffmpeg.ps1
npm install

# 開発
npm run dev

# テスト
npm test

# 型チェック
npm run typecheck

# ビルド
npm run build
```

## トラブルシューティング

### FFmpegのダウンロードに失敗する場合

```powershell
.\scripts\setup-ffmpeg.ps1 -Force
.\scripts\setup-ffmpeg.ps1 -Version 7.0.2
```

### 権限エラーが発生する場合

```powershell
# 管理者権限でPowerShellを起動してから実行
.\scripts\setup-ffmpeg.ps1
```

### ビルドエラーが発生する場合

```bash
# 型エラーの確認
npm run typecheck

# ビルドキャッシュのクリア後に再ビルド
rm -rf out/
npm run build
```

### FFmpegの動作確認

```powershell
.\scripts\setup-ffmpeg.ps1 -Verify
```
