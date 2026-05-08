#!/usr/bin/env bash
# Clip Fuse - 手動テスト用動画生成スクリプト (Linux / WSL2)
# UIの動作確認など手動テストで使う動画ファイルを生成します。
# 自動テスト（npm test）はこのスクリプトを使わず Vitest が動画を自動生成します。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-test-videos}"
OUTPUT_PATH="$PROJECT_ROOT/$OUTPUT_DIR"

FFMPEG_BIN="$PROJECT_ROOT/ffmpeg/ffmpeg"
if [[ ! -x "$FFMPEG_BIN" ]]; then
  FFMPEG_BIN="$(command -v ffmpeg 2>/dev/null || true)"
  if [[ -z "$FFMPEG_BIN" ]]; then
    echo "エラー: FFmpeg が見つかりません。先に bash scripts/setup-ffmpeg.sh を実行してください。" >&2
    exit 1
  fi
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<EOF
使用方法:
  bash scripts/create-test-videos.sh                   # デフォルト出力先 (test-videos/)
  bash scripts/create-test-videos.sh my-videos         # 出力先を指定
EOF
  exit 0
fi

echo "出力先: $OUTPUT_PATH"
mkdir -p "$OUTPUT_PATH/mixed-resolution"

make_video() {
  local out="$1" color="$2" width="$3" height="$4" duration="$5"
  echo "  作成中: $out (${width}x${height}, ${duration}s)"
  "$FFMPEG_BIN" -y \
    -f lavfi -i "color=c=${color}:s=${width}x${height}:r=30" \
    -f lavfi -i "sine=frequency=440:sample_rate=44100" \
    -t "$duration" -c:v libx264 -c:a aac -shortest \
    "$out" 2>/dev/null
}

echo ""
echo "--- 同一解像度 (1920x1080) ---"
make_video "$OUTPUT_PATH/clip_1080p_red.mp4"   "red"   1920 1080 5
make_video "$OUTPUT_PATH/clip_1080p_green.mp4" "green" 1920 1080 3
make_video "$OUTPUT_PATH/clip_1080p_blue.mp4"  "blue"  1920 1080 4

echo ""
echo "--- 異なる解像度（解像度不一致テスト用）---"
make_video "$OUTPUT_PATH/mixed-resolution/clip_1080p.mp4" "red"   1920 1080 5
make_video "$OUTPUT_PATH/mixed-resolution/clip_720p.mp4"  "blue"  1280 720  3
make_video "$OUTPUT_PATH/mixed-resolution/clip_480p.mp4"  "green"  854 480  4

echo ""
echo "完了: $OUTPUT_PATH"
