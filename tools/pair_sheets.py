"""Pair reference vs prototype frames by nearest scroll position.
usage: python tools/pair_sheets.py refdir builddir outprefix [colwidth] [rows-per-sheet]"""
import sys, os, re
from PIL import Image, ImageDraw
rd, bd, outp = sys.argv[1:4]
W = int(sys.argv[4]) if len(sys.argv) > 4 else 640
N = int(sys.argv[5]) if len(sys.argv) > 5 else 6
def frames(d):
    r = []
    for f in sorted(os.listdir(d)):
        m = re.match(r's\d+_(\d+)\.png$', f)
        if m: r.append((int(m.group(1)), os.path.join(d, f)))
    return r
R, B = frames(rd), frames(bd)
rows = []
for y, f in R:
    by, bf = min(B, key=lambda t: abs(t[0] - y))
    rows.append((y, f, by, bf))
# drop duplicate tail frames
seen, uniq = set(), []
for r in rows:
    if r[3] in seen and r is not rows[-1]: continue
    seen.add(r[3]); uniq.append(r)
for i in range(0, len(uniq), N):
    chunk = uniq[i:i + N]; ims = []
    for y, f, by, bf in chunk:
        a = Image.open(f).convert('RGB'); b = Image.open(bf).convert('RGB')
        a = a.resize((W, int(a.height * W / a.width))); b = b.resize((W, int(b.height * W / b.width)))
        ims.append((y, a, by, b))
    H = sum(max(a.height, b.height) + 28 for _, a, _, b in ims) + 10
    S = Image.new('RGB', (W * 2 + 24, H), (40, 34, 30)); d = ImageDraw.Draw(S); yy = 0
    for y, a, by, b in ims:
        d.text((6, yy + 8), f'REFERENCE  y={y}', fill=(255, 230, 160)); d.text((W + 30, yy + 8), f'THE EVENT HOUSE  y={by}', fill=(255, 230, 160))
        S.paste(a, (0, yy + 28)); S.paste(b, (W + 24, yy + 28)); yy += max(a.height, b.height) + 28
    out = f'{outp}_{i // N + 1:02d}.jpg'; S.save(out, quality=78); print(out, S.size)
