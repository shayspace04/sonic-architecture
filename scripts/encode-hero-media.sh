#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SONIC ARCHITECTURE — HERO MEDIA ENCODING SCRIPT (scripts/encode-hero-media.sh)
# ==============================================================================
# Encodes the 8s brutalist tower background video into:
#   1. public/bg-720.mp4  (H.264, 1280px width, CRF 28, no audio, +faststart)
#   2. public/bg-720.webm (VP9, 1280px width, CRF 34, no audio)
#   3. public/modernist-city.webp (First-frame LCP poster image)
# ==============================================================================

INPUT_VIDEO="${1:-public/sonic-architecture-bg.mp4}"

echo "[1/3] Encoding faststart 720p H.264 MP4 (public/bg-720.mp4)..."
ffmpeg -y -i "$INPUT_VIDEO" \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 28 -preset slow \
  -an -movflags +faststart \
  public/bg-720.mp4

echo "[2/3] Encoding 720p VP9 WebM (public/bg-720.webm)..."
ffmpeg -y -i "$INPUT_VIDEO" \
  -vf "scale=1280:-2" \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 \
  -an \
  public/bg-720.webm

echo "[3/3] Extracting WebP LCP poster frame (public/modernist-city.webp)..."
ffmpeg -y -i "$INPUT_VIDEO" \
  -vframes 1 -vf "scale=1280:-2" -q:v 80 \
  public/modernist-city.webp

echo "Done! Hero media assets updated in public/."
