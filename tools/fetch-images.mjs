// Downloads the placeholder photography listed in tools/image-manifest.json into site/assets/img/.
// Each file is fetched once as WebP from the Unsplash image CDN; a 640px "-sm" variant is also saved.
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync(new URL('./image-manifest.json', import.meta.url)));
const outDir = path.resolve('site/assets/img');
fs.mkdirSync(outDir, { recursive: true });

async function get(id, w, file) {
  const dest = path.join(outDir, file);
  if (fs.existsSync(dest)) return 'skip';
  const r = await fetch(`https://images.unsplash.com/photo-${id}?w=${w}&q=72&fm=webp&fit=max`, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) throw new Error(`${file}: HTTP ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return 'ok';
}

for (const img of manifest.images) {
  const small = img.file.replace('.webp', '-sm.webp');
  const [a, b] = await Promise.all([get(img.id, img.w, img.file), get(img.id, 640, small)]);
  console.log(img.file, a, b);
}
