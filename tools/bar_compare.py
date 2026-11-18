# Stacks the closed enquiry bar before (native controls) and after (bespoke pickers) at each desktop width.
# Usage: python tools/bar_compare.py   → qa/forms/bar-before-after.jpg
from PIL import Image, ImageDraw
import os

rows = []
for vp in ['1920x1080', '1440x900', '1280x720']:
    for kind in ['before', 'after']:
        p = f'qa/forms/{kind}/bar-{vp}.png'
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            if rows and kind == 'after' and im.width > rows[-1][1].width * 1.5:  # captured at 2x
                im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
            rows.append((f'{vp}  {kind}', im))
W = max(im.width for _, im in rows)
H = sum(im.height + 34 for _, im in rows)
sheet = Image.new('RGB', (W, H), (251, 248, 244))
d = ImageDraw.Draw(sheet)
y = 0
for label, im in rows:
    d.text((10, y + 10), label, fill=(94, 82, 73))
    sheet.paste(im, (0, y + 30))
    y += im.height + 34
sheet.save('qa/forms/bar-before-after.jpg', quality=88)
print('qa/forms/bar-before-after.jpg', sheet.size)
