#!/usr/bin/env bash
# Clip Fuse - FFmpeg Setup Script (Linux / WSL2)
# システムの FFmpeg を使い、ffmpeg/ ディレクトリにシンボリックリンクを作成します。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FFMPEG_DIR="$PROJECT_ROOT/ffmpeg"
CONFIG_FILE="$SCRIPT_DIR/ffmpeg-config.json"

FORCE=false
VERIFY=false

usage() {
  cat <<EOF
使用方法:
  bash scripts/setup-ffmpeg.sh            # 標準セットアップ
  bash scripts/setup-ffmpeg.sh --force    # 強制再作成
  bash scripts/setup-ffmpeg.sh --verify   # 動作確認付き
  bash scripts/setup-ffmpeg.sh --help     # このヘルプを表示
EOF
}

for arg in "$@"; do
  case "$arg" in
    --force)  FORCE=true ;;
    --verify) VERIFY=true ;;
    --help)   usage; exit 0 ;;
    *) echo "不明なオプション: $arg" >&2; usage; exit 1 ;;
  esac
done

# ffmpeg-config.json から Linux セクションの値を取得
get_config() {
  local key="$1"
  if [[ -f "$CONFIG_FILE" ]] && command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
with open('$CONFIG_FILE') as f:
    c = json.load(f)
print(c.get('linux', {}).get('$key', ''))
" 2>/dev/null || echo ""
  fi
}

# バージョン比較: $1 >= $2 なら 0 を返す
version_ge() {
  dpkg --compare-versions "$1" ge "$2" 2>/dev/null
}

echo "=== Clip Fuse FFmpeg Setup (Linux / WSL2) ==="
echo ""

# ffmpeg コマンドが存在しない場合は apt でインストール
if ! command -v ffmpeg &>/dev/null || ! command -v ffprobe &>/dev/null; then
  echo "システムに FFmpeg が見つかりません。apt でインストールします..."
  if command -v sudo &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y ffmpeg
  else
    apt-get update -qq
    apt-get install -y ffmpeg
  fi
  echo "✓ FFmpeg インストール完了"
else
  echo "✓ システム FFmpeg 検出済み: $(ffmpeg -version 2>&1 | head -1)"
fi

# インストール済みバージョンを取得して config と照合
INSTALLED_VERSION=$(ffmpeg -version 2>&1 | head -1 | sed -n 's/^ffmpeg version \([0-9][0-9]*\.[0-9][0-9]*\(\.[0-9][0-9]*\)\?\).*/\1/p')
MIN_VERSION=$(get_config "minimumVersion")
REC_VERSION=$(get_config "recommendedVersion")

if [[ -n "$INSTALLED_VERSION" && -n "$MIN_VERSION" ]]; then
  echo ""
  if ! version_ge "$INSTALLED_VERSION" "$MIN_VERSION"; then
    echo "✗ ffmpeg $INSTALLED_VERSION は最低バージョン $MIN_VERSION を満たしていません" >&2
    exit 1
  elif [[ -n "$REC_VERSION" ]] && ! version_ge "$INSTALLED_VERSION" "$REC_VERSION"; then
    echo "⚠ ffmpeg $INSTALLED_VERSION は動作しますが、推奨バージョンは $REC_VERSION 以上です"
    echo "  (Ubuntu 24.04 LTS では apt install ffmpeg で $REC_VERSION 以上を取得できます)"
  else
    echo "✓ ffmpeg バージョン確認: $INSTALLED_VERSION (最低 $MIN_VERSION 以上)"
  fi
fi

# ffmpeg/ ディレクトリを作成
mkdir -p "$FFMPEG_DIR"

# 既存リンクの確認
FFMPEG_LINK="$FFMPEG_DIR/ffmpeg"
FFPROBE_LINK="$FFMPEG_DIR/ffprobe"

if [[ -e "$FFMPEG_LINK" && -e "$FFPROBE_LINK" ]] && [[ "$FORCE" == false ]]; then
  echo "✓ ffmpeg/ ディレクトリにバイナリが既に存在します (--force で再作成)"
  if [[ "$VERIFY" == true ]]; then
    "$FFMPEG_LINK" -version &>/dev/null && echo "✓ ffmpeg: 動作確認 OK"
    "$FFPROBE_LINK" -version &>/dev/null && echo "✓ ffprobe: 動作確認 OK"
  fi
  exit 0
fi

FFMPEG_BIN="$(command -v ffmpeg)"
FFPROBE_BIN="$(command -v ffprobe)"

echo ""
echo "シンボリックリンクを作成します:"
echo "  $FFMPEG_LINK -> $FFMPEG_BIN"
echo "  $FFPROBE_LINK -> $FFPROBE_BIN"

ln -sf "$FFMPEG_BIN" "$FFMPEG_LINK"
ln -sf "$FFPROBE_BIN" "$FFPROBE_LINK"

echo "✓ シンボリックリンク作成完了"

if [[ "$VERIFY" == true ]]; then
  echo ""
  echo "動作確認中..."
  "$FFMPEG_LINK" -version &>/dev/null && echo "✓ ffmpeg: 動作確認 OK" || { echo "✗ ffmpeg: 動作確認 失敗" >&2; exit 1; }
  "$FFPROBE_LINK" -version &>/dev/null && echo "✓ ffprobe: 動作確認 OK" || { echo "✗ ffprobe: 動作確認 失敗" >&2; exit 1; }
fi

echo ""
echo "=== セットアップ完了 ==="
echo "インストール先: $FFMPEG_DIR"
echo ""
echo "次のステップ:"
echo "  npm install      # 依存関係のインストール"
echo "  npm test         # テスト実行"
echo "  npm run dev      # 開発サーバー起動 (要: X11 / WSLg)"
