"""Cut the six "What we do" line icons out of references/feature-icons_source.png.

Each icon becomes a transparent PNG: ink colour fixed, alpha taken from how much
darker each pixel is than the paper. All six share one square canvas and the
source's common baseline, so they keep their relative size and alignment.

Usage: python tools/extract_feature_icons.py  -> site/assets/img/icons/feature-*.png
"""
import os
import numpy as np
from PIL import Image

SRC = 'references/feature-icons_source.png'
OUT = 'site/assets/img/icons'
NAMES = ['event-design', 'florals', 'tablescapes', 'candlelight', 'decor-rentals', 'planning']
INK = (46, 35, 26)          # dark warm brown, matches the drawing
TOP, BOTTOM = 296, 540      # shared band (labels start below 560)
SIZE = BOTTOM - TOP         # square canvas
FLOOR = 8                   # ignore paper texture lighter than this

im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
lum = im.mean(2)
paper = float(np.median(lum))
ink_l = float(np.percentile(lum[(paper - lum) > 120], 10))
alpha = np.clip((paper - lum - FLOOR) / (paper - ink_l - FLOOR), 0, 1)

# Find each icon's column run inside the band
dark = (paper - lum[TOP:BOTTOM]) > 25
xs = np.where(dark.any(0))[0]
runs, s, p = [], xs[0], xs[0]
for x in xs[1:]:
    if x - p > 30:
        runs.append((s, p)); s = x
    p = x
runs.append((s, p))
assert len(runs) == len(NAMES), runs

os.makedirs(OUT, exist_ok=True)
for name, (a, b) in zip(NAMES, runs):
    cx = (a + b) // 2
    x0 = cx - SIZE // 2
    a_crop = alpha[TOP:BOTTOM, x0:x0 + SIZE]
    rgba = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    rgba[..., :3] = INK
    rgba[..., 3] = np.round(a_crop * 255)
    path = os.path.join(OUT, 'feature-%s.png' % name)
    Image.fromarray(rgba, 'RGBA').save(path, optimize=True)
    print(path, '%d-%d' % (a, b), os.path.getsize(path), 'bytes')
