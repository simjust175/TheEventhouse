// Assembles site/*.html from src/pages/*.html by expanding <!-- @include name --> with src/partials/name.html.
// Partials may contain {{page}} which is replaced by the page's file stem (index, gallery, ...).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const pagesDir = path.join(root, 'src/pages');
const partialsDir = path.join(root, 'src/partials');
const outDir = path.join(root, 'site');

const partial = (name) => fs.readFileSync(path.join(partialsDir, `${name}.html`), 'utf8');

function expand(html, page, depth = 0) {
  if (depth > 5) throw new Error('include depth exceeded');
  return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => expand(partial(name), page, depth + 1)).replaceAll('{{page}}', page);
}

const build = () => {
  for (const f of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
    const page = f.replace('.html', '');
    fs.writeFileSync(path.join(outDir, f), expand(fs.readFileSync(path.join(pagesDir, f), 'utf8'), page));
    console.log('built', f);
  }
};
build();
if (process.argv.includes('--watch')) {
  let t;
  for (const d of [pagesDir, partialsDir]) fs.watch(d, () => { clearTimeout(t); t = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 80); });
  console.log('watching src/ ...');
}
