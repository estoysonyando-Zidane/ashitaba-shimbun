// node tools/shot.mjs [YYYY-MM-DD] [outdir] — screenshots every page (desktop + phone) from a local server.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright'); // resolves the preinstalled copy via NODE_PATH
const root = path.resolve(new URL('..', import.meta.url).pathname); const date = process.argv[2] || ''; const out = process.argv[3] || '/tmp/ashitaba-shots';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const port = srv.address().port; const b = await chromium.launch(); const errs = [];
for (const [name, vp] of [['desk', { width: 1400, height: 1000 }], ['phone', { width: 390, height: 844 }]]){
  const pg = await b.newPage({ viewport: vp }); pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(`http://localhost:${port}/${date ? '?d=' + date : ''}`); await pg.waitForTimeout(3500);
  const n = await pg.evaluate(() => document.querySelectorAll('#tabs button').length);
  for (let i = 1; i <= n; i++){ await pg.evaluate(k => location.hash = '#p' + k, i); await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${name}-p${i}.png` }); }
  console.log(name, n, '面');
  await pg.close();
}
await b.close(); srv.close();
console.log(errs.length ? 'エラー:\n' + errs.join('\n') : 'コンソールエラーなし', '→', out);
