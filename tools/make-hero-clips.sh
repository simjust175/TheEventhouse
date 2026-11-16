#!/usr/bin/env bash
# Placeholder hero clips rendered from our own placeholder stills: a slow, eased camera push that
# plays forward then reverses, so the loop is seamless. Replace with real footage via the hero config.
# usage: bash tools/make-hero-clips.sh   (needs ffmpeg)
set -e
IMG=site/assets/img; OUT=site/assets/video; mkdir -p "$OUT"
clip() { # name src cropW cropH cropX cropY outW outH crf
  local name=$1 src=$2 cw=$3 ch=$4 cx=$5 cy=$6 ow=$7 oh=$8 crf=$9
  local N=240  # 8s @30fps forward, then reversed = 16s loop
  ffmpeg -v error -y -loop 1 -i "$IMG/$src" -filter_complex \
    "[0:v]crop=$cw:$ch:$cx:$cy,scale=$((ow*4)):$((oh*4)):flags=lanczos,zoompan=z='1.10-0.10*(on/$N)*(on/$N)*(3-2*on/$N)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.25':d=$N:s=${ow}x${oh}:fps=30,format=yuv420p,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]" \
    -map "[v]" -frames:v $((N*2)) -c:v libx264 -preset slow -crf "$crf" -profile:v high -movflags +faststart -an "$OUT/$name.mp4"
  echo "$OUT/$name.mp4 $(du -h "$OUT/$name.mp4" | cut -f1)"
}
clip hero-venue        hero-venue.webp    2400 1350 0   0    1920 1080 26
clip hero-venue-m      hero-venue.webp    898  1597 751 0    720  1280 27
clip aisle-florals     aisle-florals.webp 1600 900  0   84   1920 1080 26
clip aisle-florals-m   aisle-florals.webp 600  1068 560 0    720  1280 27
