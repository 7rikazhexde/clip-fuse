# Clip Fuse

Windows / Linux（WSL2 含む）向けの動画結合アプリケーション。ドラッグ&ドロップで簡単に複数の動画ファイルを結合できます。

![app-capture.png](.demo/app-capture.png)

## 特徴

- **ドラッグ&ドロップ対応**: 直感的な操作で動画ファイルを追加
- **順序変更**: ファイルの結合順序を自由に変更
- **解像度不一致を検出**: 異なる解像度のファイルを混在させた際に再エンコードを提案
- **リアルタイム進捗**: ファイルサイズベースの安定した進捗表示と残り時間の推定
- **キャンセル機能**: 処理中のキャンセルと生成ファイルの削除
- **スタンドアロン**: FFmpeg内蔵でインストール不要（Windows）/ システム FFmpeg を使用（Linux）

## 対応形式

| 項目 | 内容 |
| ---- | ---- |
| 入力 | MP4, AVI, MOV, MKV, FLV, WMV, M4V, WebM |
| 出力 | MP4 |
| 結合モード | ストリームコピー（同一解像度）/ 再エンコード（異なる解像度） |

## インストール（エンドユーザー向け）

### 動作環境

| プラットフォーム | 要件 |
| ---------------- | ---- |
| Windows 10 / 11（64bit） | 追加ソフトウェア不要（FFmpeg内蔵） |
| Ubuntu 22.04 LTS | FFmpeg 4.4 以上（apt でインストール） |
| Ubuntu 24.04 LTS | FFmpeg 6.0 以上（apt でインストール、推奨） |
| WSL2（Ubuntu） | 上記 Ubuntu 要件に加え WSLg（Windows 11）推奨 |

### インストール手順

#### Windows

1. [Releases](https://github.com/7rikazhexde/clip-fuse/releases) から
   最新の `Clip.Fuse.Setup.x.x.x.exe` をダウンロード
2. ダウンロードした `.exe` をダブルクリックして実行
3. インストール先を選択して「インストール」をクリック
4. 完了後、デスクトップまたはスタートメニューの「Clip Fuse」から起動

> **注意**: SmartScreenの警告が表示された場合は「詳細情報」→「実行」をクリックしてください。

#### Linux（Ubuntu / WSL2）

**deb パッケージ（推奨）:**

```bash
# 依存関係のインストール
sudo apt-get install -y libnotify4 xdg-utils fonts-noto-color-emoji

# deb パッケージのインストール
sudo dpkg -i clip-fuse_x.x.x_amd64.deb

# 起動（WSL2 の場合は --no-sandbox が必要な場合があります）
clip-fuse
```

**AppImage:**

```bash
# FUSE が使えない環境では --appimage-extract-and-run を使用
chmod +x "Clip.Fuse-x.x.x.AppImage"
./"Clip.Fuse-x.x.x.AppImage" --appimage-extract-and-run
```

> **WSL2 の注意事項**: WSLg（Windows 11）が有効な環境で GUI が利用できます。
> GPU プロセスのクラッシュ警告（Vulkan 未対応）が出ますが、動作には影響しません。

### ローカルビルドからインストール

**Windows:**

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

ビルドが完了すると `dist\Clip.Fuse.Setup.x.x.x.exe` が生成されます。

**Linux / WSL2（Ubuntu）:**

```bash
# 1. リポジトリを取得
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse

# 2. FFmpeg をセットアップ（apt でインストール + シンボリックリンク作成）
bash scripts/setup-ffmpeg.sh

# 3. 依存パッケージをインストール
npm install

# 4. ビルド（AppImage + deb を生成）
npm run build
```

### アンインストール

**Windows**: 「設定」→「アプリ」→「Clip Fuse」→「アンインストール」

**Linux（deb）:**

```bash
sudo dpkg -r clip-fuse
```

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

**Windows:**

```powershell
.\scripts\setup-ffmpeg.ps1

# オプション
.\scripts\setup-ffmpeg.ps1 -Verify          # 検証付き
.\scripts\setup-ffmpeg.ps1 -Force           # 強制再ダウンロード
.\scripts\setup-ffmpeg.ps1 -Version 7.1.1   # 特定バージョン
.\scripts\setup-ffmpeg.ps1 -Help            # ヘルプ表示
```

**Linux / WSL2（Ubuntu）:**

```bash
bash scripts/setup-ffmpeg.sh

# オプション
bash scripts/setup-ffmpeg.sh --verify   # 動作確認付き
bash scripts/setup-ffmpeg.sh --force    # 強制再作成
bash scripts/setup-ffmpeg.sh --help     # ヘルプ表示
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発環境での実行

```bash
npm run dev
```

> **WSL2 での実行**: WSLg（Windows 11）が有効な環境では `npm run dev` がそのまま動作します。
> WSLg が使えない環境では `xvfb-run --auto-servernum npm run dev` を使用してください。

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
| `npm run test:e2e` | Playwright E2E テスト（要: `build:electron` 済み） |

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
│   ├── setup-ffmpeg.ps1          # FFmpeg セットアップ（Windows）
│   ├── setup-ffmpeg.sh           # FFmpeg セットアップ（Linux / WSL2）
│   ├── create-test-videos.sh     # 手動テスト用動画生成スクリプト
│   └── ffmpeg-config.json        # FFmpeg バージョン設定
├── ffmpeg/                       # FFmpeg バイナリ（自動生成）
│   ├── ffmpeg.exe / ffmpeg       # Windows / Linux
│   └── ffprobe.exe / ffprobe
├── out/                          # ビルド出力（自動生成）
├── electron.vite.config.ts       # electron-vite 設定
├── tsconfig.json                 # TypeScript 設定（ルート）
├── tsconfig.node.json            # TypeScript 設定（main / preload）
├── tsconfig.web.json             # TypeScript 設定（renderer）
├── vitest.config.ts              # Vitest 設定
└── package.json
```

## FFmpegバージョン管理

`scripts/ffmpeg-config.json` でバージョン設定を管理しています。

### Windows（gyan.dev からダウンロード）

| バージョン | 状態 |
| ---------- | ---- |
| 7.1.1 | 推奨 |
| 7.0.2 | 安定版（フォールバック） |

### Linux（apt でインストール）

| Ubuntu バージョン | FFmpeg バージョン | 状態 |
| ----------------- | ---------------- | ---- |
| 24.04 LTS | 6.1.1 | 推奨 |
| 22.04 LTS | 4.4.2 | 最低サポート対象 |

## 開発時のワークフロー

**Windows:**

```powershell
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse
.\scripts\setup-ffmpeg.ps1
npm install
npm run dev
```

**Linux / WSL2:**

```bash
git clone https://github.com/7rikazhexde/clip-fuse.git
cd clip-fuse
bash scripts/setup-ffmpeg.sh
npm install
npm run dev
```

## トラブルシューティング

### FFmpegのダウンロードに失敗する場合（Windows）

```powershell
.\scripts\setup-ffmpeg.ps1 -Force
.\scripts\setup-ffmpeg.ps1 -Version 7.0.2
```

### 権限エラーが発生する場合（Windows）

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

### WSL2 で GUI が表示されない場合

WSLg の RDP クライアント（msrdc.exe）がクラッシュしている可能性があります。

```powershell
# Windows PowerShell で WSL を再起動
wsl --shutdown
```

再起動後に再度 `clip-fuse` または `npm run dev` を実行してください。

### node_modules の再インストールが必要な場合（WSL2）

Windows と Linux で `node_modules` を共有するとネイティブモジュールのアーキテクチャ不一致が起きます。

```bash
rm -rf node_modules && npm install
```
