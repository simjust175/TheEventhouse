"""Side-by-side comparison sheet: reference (left) vs prototype (right), both scaled to the same width.
usage: python tools/side_by_side.py ref.png ours.png out.jpg [width] [left-label] [right-label]"""
import sys
from PIL import Image, ImageDraw
ref, ours, out = sys.argv[1:4]
W = int(sys.argv[4]) if len(sys.argv) > 4 else 720
L = sys.argv[5] if len(sys.argv) > 5 else 'APPROVED MOCKUP'
R = sys.argv[6] if len(sys.argv) > 6 else 'PROTOTYPE (1440px)'
a, b = Image.open(ref).convert('RGB'), Image.open(ours).convert('RGB')
a = a.resize((W, int(a.height * W / a.width))); b = b.resize((W, int(b.height * W / b.width)))
H = max(a.height, b.height) + 40
S = Image.new('RGB', (W * 2 + 30, H), (40, 34, 30)); d = ImageDraw.Draw(S)
S.paste(a, (0, 40)); S.paste(b, (W + 30, 40))
d.text((10, 12), L, fill=(255, 230, 160)); d.text((W + 40, 12), R, fill=(255, 230, 160))
S.save(out, quality=82)
print(out, S.size)
