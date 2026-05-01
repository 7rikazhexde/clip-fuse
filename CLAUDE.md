# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## ブランチ運用ルール

`main` への直接 push は禁止。すべての変更はブランチを作成して PR 経由でマージすること。

```bash
git checkout -b feat/your-feature   # ブランチ作成
# 作業・コミット
git push origin feat/your-feature   # リモートに push
gh pr create                         # PR 作成
```

## 開発コマンド

```bash
npm run dev            # 開発サーバー起動（ホットリロード付き Electron）
npm run build          # プロダクションビルド（out/ + NSIS インストーラー生成）
npm run typecheck      # 型チェック（tsconfig.node.json + tsconfig.web.json を両方検証）
npm run lint           # ESLint 実行
npm test               # Vitest テスト実行
npm run test:coverage  # カバレッジ付きテスト（閾値: Statements/Functions/Lines 95%, Branches 70%）
npm run test:watch     # ウォッチモード
npm run build:electron # electron-vite ビルドのみ（E2E 実行前に必要）
npm run test:e2e       # Playwright E2E テスト（要: build:electron 済み）
```

特定テストファイルのみ実行:

```bash
npx vitest run tests/unit/ffmpeg-probe.test.ts
npx vitest run tests/integration/merge.test.ts
```

FFmpeg セットアップ（開発時 / Windows）:

```powershell
.\scripts\setup-ffmpeg.ps1   # ffmpeg/ ディレクトリにバイナリを配置
```

## アーキテクチャ

electron-vite で構成された Electron アプリ。プロセスは 3 層に分かれる。

### Main プロセス（`src/main/`）

- `index.ts` — アプリ起動・BrowserWindow 生成・各 IPC ハンドラー登録
- `ipc/` — 機能ごとに分割された IPC ハンドラー登録関数（dialog / filesystem / ffmpeg）
- `services/` — ビジネスロジック本体
  - `ffmpeg-merge.ts` — 動画結合。copy モード（concat demuxer）と reencode モード
    （filter_complex で scale/pad）の 2 系統。`mergeVideos()` は `{ promise, handle }` を返し
    `handle.cancel()` でキャンセル可能
  - `ffmpeg-probe.ts` — ffprobe でメタデータ（解像度・fps・コーデック・時間）を取得
  - `ffmpeg-path.ts` — パッケージ済み（`process.resourcesPath`）と開発時
    （`app.getAppPath()`）でバイナリパスを切り替える
  - `file-deleter.ts` — Windows でロックされたファイルを最大 10 回リトライして強制削除

### Preload（`src/preload/index.ts`）

`contextBridge.exposeInMainWorld('electronAPI', api)` で型付き API を公開。
IPC チャンネル名は `src/types/index.ts` の `IPC` 定数で一元管理し、
Main・Preload・Renderer 間の文字列 typo を防止している。

### Renderer（`src/renderer/src/`）

フレームワークなしの Vanilla TypeScript。`window.electronAPI` 経由で Main プロセスと通信。
`store.ts` がアプリ状態（ファイルリスト・進捗）を保持し、`main.ts` が DOM 操作と UI イベントを担当。

## テスト構成

```text
tests/
├── unit/           # vi モック中心の高速テスト
│   ├── ffmpeg-merge.test.ts  # buildProgress / cleanup の純関数テスト
│   ├── ffmpeg-probe.test.ts  # vi.spyOn(ffmpeg, 'ffprobe') で edge case をカバー
│   ├── ffmpeg-path.test.ts   # vi.hoisted() + vi.mock('electron') で app をモック
│   ├── file-deleter.test.ts  # vi.useFakeTimers() + child_process モックで sleep をスキップ
│   └── format.test.ts        # formatDuration / formatFileSize 等の純粋関数テスト
└── integration/    # 実際に FFmpeg バイナリを呼ぶテスト（テスト用動画を自動生成）
    └── merge.test.ts
```

E2E テスト (`tests/e2e/`):

- Playwright + `_electron` で実際の Electron アプリを起動してスモークテスト
- `NODE_ENV=test` を渡すことで DevTools の自動起動を抑制
- CI では `xvfb-run` 経由で実行（仮想ディスプレイが必要）
- E2E 実行前に `npm run build:electron` でビルドが必要

- カバレッジ対象ファイルは `vitest.config.ts` の `coverage.include` で明示管理
- Win32 専用コードや OS コマンドフォールバックなど Linux CI から到達不能なパスは
  `/* v8 ignore start/stop */` で除外
- `/* v8 ignore next */` は esbuild との相性問題があるため使用しない（`start/stop` を使う）

## CI / リリース

- **CI** (`ci.yml`): `main` への push と全 PR でテスト実行。`concurrency` で重複実行をキャンセル
- **Release** (`release.yml`): `v*.*.*` タグ push でトリガー。Windows ビルド後
  `dist/*.exe`（インストーラーのみ）を GitHub Release に添付

リリース手順:

```bash
npm version 0.x.y --no-git-tag-version   # package.json / package-lock.json を更新
git add package.json package-lock.json
git commit -m "chore: bump version to 0.x.y"
git push origin main
git tag -a v0.x.y -m "Release v0.x.y"
git push origin v0.x.y                   # release.yml が自動起動
```
