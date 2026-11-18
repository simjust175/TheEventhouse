"""Start / halfway / final frames of the rounded-feature morph side by side, one sheet per viewport.
Usage: python tools/oval_sheet.py  (after node tools/verify-refine.mjs --only=oval) -> qa/motion/oval/<vp>-sheet.jpg"""
import glob, os
from PIL import Image, ImageDraw
for start in sorted(glob.glob('qa/motion/oval/*-1-start.png')):
    vp = os.path.basename(start).split('-1-')[0]
    ims = [Image.open(f'qa/motion/oval/{vp}-{k}.png').convert('RGB') for k in ('1-start', '2-halfway', '3-final')]
    w = 640 if ims[0].width > 800 else 300
    ims = [im.resize((w, round(im.height * w / im.width))) for im in ims]
    sheet = Image.new('RGB', (w * 3 + 40, ims[0].height + 44), (245, 240, 233))
    d = ImageDraw.Draw(sheet)
    for i, (im, lab) in enumerate(zip(ims, ('START', 'HALFWAY', 'FINAL'))):
        sheet.paste(im, (10 + i * (w + 10), 34)); d.text((10 + i * (w + 10), 10), f'{vp}  {lab}', fill=(40, 30, 20))
    sheet.save(f'qa/motion/oval/{vp}-sheet.jpg', quality=85)
    print('wrote', vp)
