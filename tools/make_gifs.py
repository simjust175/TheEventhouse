"""Turn qa/motion/gif/<w>-<section>-<k>.png sequences into ping-pong GIFs and first/last stills."""
from PIL import Image, ImageDraw
import glob, os, re
for w in (1440, 390):
    files = glob.glob(f'qa/motion/gif/{w}-*-*.png')
    names = sorted({re.match(r'\d+-(.+)-\d+\.png$', os.path.basename(f)).group(1) for f in files})
    for n in names:
        fs = sorted(glob.glob(f'qa/motion/gif/{w}-{n}-*.png'), key=lambda s: int(re.search(r'-(\d+)\.png$', s).group(1)))
        ims = [Image.open(f).convert('RGB') for f in fs]
        sc = min(1, 720 / ims[0].width)
        ims = [i.resize((int(i.width * sc), int(i.height * sc))) for i in ims]
        seq = ims + ims[-2:0:-1]
        seq[0].save(f'qa/motion/parallax-{w}-{n}.gif', save_all=True, append_images=seq[1:], duration=110, loop=0)
        a, b = ims[0], ims[-1]
        S = Image.new('RGB', (a.width * 2 + 10, a.height), (40, 34, 30)); S.paste(a, (0, 0)); S.paste(b, (a.width + 10, 0))
        d = ImageDraw.Draw(S); y = a.height // 2; d.line((0, y, S.width, y), fill=(255, 60, 60), width=1)
        S.save(f'qa/motion/parallax-{w}-{n}-firstlast.jpg', quality=82)
        print(w, n, len(seq), a.size)
