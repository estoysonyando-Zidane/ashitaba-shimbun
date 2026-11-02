// 明日葉新聞 — draws a laid-out page onto a fixed-size sheet (DOM, absolute positioning in sheet px).
import { S, HEAD, tokenize, normalize, fixedW } from './layout.js';
import { PAPER, MAST_W } from './paper.js';
import { el, svg, comic, sudoku, figure, wxIcon, adBox, pickAds, illust } from './parts.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const X = (x) => S.ML + x;                 // content x → sheet x
const Y = (row) => S.MT + row * S.P;        // row → sheet y

function unitsHTML(units){
  return units.map(u => u.k === 't' ? `<span class="t">${esc(u.s)}</span>` : u.k === 'r' ? `<span class="r">${esc(u.s)}</span>` : esc(u.s)).join('');
}
// One vertical text line at sheet coords; `len` = nominal length in cells, `size` = font px.
function vline(parent, x, y, units, len, size, cls, justify){
  const d = el('div', 'vl' + (cls ? ' ' + cls : ''));
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.fontSize = size + 'px';
  d.style.height = (len * size) + 'px';
  const used = units.reduce((a, u) => a + u.w, 0);
  if (justify && used < len - .05 && units.length > 1){ d.style.letterSpacing = ((len - used) * size / (units.length - 1)).toFixed(2) + 'px'; }
  d.innerHTML = unitsHTML(units);
  parent.append(d); return d;
}
function vtext(parent, x, y, text, size, h, cls, w){
  const d = el('div', 'vh' + (cls ? ' ' + cls : ''));
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.fontSize = size + 'px'; d.style.height = (h / S.H_SCALE) + 'px';
  if (w) d.style.width = w + 'px';
  d.innerHTML = unitsHTML(tokenize(text));
  parent.append(d); return d;
}

/* ---------------- flow items (articles and boxes) ---------------- */
function drawFlow(sheet, pl, page, onOpen){
  const it = pl.it; const k = pl.r1 - pl.r0; const w = pl.x1 - pl.x0;
  const x0 = X(pl.x0), x1 = X(pl.x1), y0 = Y(pl.r0), h = k * S.P - S.gap;
  const box = el('article', `it flow r-${it.rank}` + (it.frame ? ` fr-${it.frame}` : '') + (page.tab === 'スポーツ' ? ' sp' : ''));
  box.style.left = x0 + 'px'; box.style.top = y0 + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
  box.dataset.id = it.id;
  box.addEventListener('click', () => onOpen && onOpen(it));
  sheet.append(box);
  const pad = it.pad; let off = 0;
  // 横見出し banner
  if (it.banner){ const b = el('div', 'banner', normalize(it.h)); b.style.left = (x0 + pad) + 'px'; b.style.top = y0 + 'px'; b.style.width = (w - 2 * pad) + 'px'; b.style.height = (S.P - S.gap) + 'px'; sheet.append(b); off = 1; }
  // header columns (right to left)
  const hy = y0 + off * S.P; let hx = x1 - pad;
  it.head.parts.forEach(p => {
    if (it.banner && p.t === 'main') return;
    const colW = p.w / p.cols.length;
    p.cols.forEach((col, ci) => {
      hx -= colW;
      const cls = `hd hd-${p.t} hf-${(HEAD[it.rank] || HEAD.mid).font}` + (p.t === 'main' && it.rank === 'top' && page.idx % 3 === 1 ? ' shiro' : '') + (p.t === 'main' && it.rank === 'sub' && page.idx % 2 === 0 ? ' chimon' : '');
      const top = p.t === 'kick' ? hy : hy + (p.t === 'sub' ? it.head.h * .06 : 0);
      vtext(sheet, hx, top, col, p.size, p.t === 'kick' ? Math.min(it.head.h, (col.length + 1) * p.size * S.H_SCALE) : it.head.h * (p.t === 'sub' ? .92 : 1), cls, colW);
    });
  });
  if (it.label){ const lb = el('div', 'lbl', it.label); lb.style.left = (x1 - pad - 20) + 'px'; lb.style.top = (hy + it.head.h - 64) + 'px'; sheet.append(lb); }
  hx -= it.head.parts.length ? S.c * .8 : 0;
  // lede (通し組み, boxed)
  if (it.ledeLines.length){
    const lw = it.ledeW; const lx1 = hx; const lb = el('div', 'ledebox'); lb.style.left = (lx1 - lw + 6) + 'px'; lb.style.top = hy + 'px'; lb.style.width = (lw - 12) + 'px'; lb.style.height = it.head.h + 'px'; sheet.append(lb);
    it.ledeLines.forEach((ln, j) => vline(sheet, lx1 - 13 - (j + 1) * it.lede_lp, hy + 6, ln.u, it.lede_per, it.lede_c, 'lede', !ln.end));
    hx -= lw;
  }
  // figure (top-left of the item)
  if (it.fig){ const f = figure(it.fig, it.figW, it.figN * S.P - S.gap); f.style.left = (x0 + pad) + 'px'; f.style.top = (y0 + off * S.P) + 'px'; sheet.append(f); }
  // body: flow 段 by 段, right to left
  let li = 0;
  for (let r = 0; r < k && li < it.lines.length; r++){
    if (r < off) continue;
    let right = x1 - pad, left = x0 + pad;
    if (r - off < it.head.hn) right -= it.head.w + it.ledeW;
    if (r - off < it.figN) left += it.figW + 8;
    const cap = Math.floor((right - left) / S.lp);
    const ry = Y(pl.r0 + r);
    for (let j = 0; j < cap && li < it.lines.length; j++, li++){
      const ln = it.lines[li];
      vline(sheet, right - (j + 1) * S.lp, ry, ln.u, S.L, S.c, null, !ln.end);
    }
  }
}

/* ---------------- horizontal boxes ---------------- */
function drawYoko(sheet, pl){
  const it = pl.it, b = it.block; const k = pl.r1 - pl.r0;
  const d = el('div', 'it yoko y-' + it.type); d.style.left = X(pl.x0) + 'px'; d.style.top = Y(pl.r0) + 'px'; d.style.width = (pl.x1 - pl.x0) + 'px'; d.style.height = (k * S.P - S.gap) + 'px';
  if (it.type === 'words'){ d.append(el('h4', null, b.title || 'きょうのフランス語')); b.rows.forEach(r => { const row = el('div', 'w'); row.append(el('b', null, r[0]), el('small', null, r[1]), el('span', null, r[2])); d.append(row); }); }
  if (it.type === 'table'){ d.append(el('h4', null, b.title)); const t = el('table'); const hr = el('tr'); b.head.forEach(x => hr.append(el('th', null, x))); t.append(hr); b.rows.forEach(r => { const tr = el('tr'); r.forEach(x => tr.append(el('td', null, x))); t.append(tr); }); d.append(t); }
  if (it.type === 'weather'){ d.append(el('h4', null, b.title || 'きょうの天気')); const g = el('div', 'wx'); (b.items || []).forEach(x => { const c = el('div'); c.append(wxIcon(x.icon, 40)); const t = el('div'); t.append(el('b', null, x.place)); const tt = el('div', 'tt'); tt.innerHTML = `<i>${x.hi}℃</i> / ${x.lo}℃`; t.append(tt, el('small', null, `${x.sky}${x.pop != null ? '　降水' + x.pop + '%' : ''}`)); c.append(t); g.append(c); }); d.append(g); if (b.note) d.append(el('p', 'nt', b.note)); }
  sheet.append(d);
}
function drawFixed(sheet, pl, page, ed){
  const it = pl.it; const k = pl.r1 - pl.r0; const w0 = pl.x1 - pl.x0, h = k * S.P - S.gap;
  const w = Math.min(w0, Math.floor(fixedW(it, k)) || w0);   // draw at the size the layout reserved
  const d = el('div', 'it fixed'); d.style.left = X(pl.x0) + 'px'; d.style.top = Y(pl.r0) + 'px'; d.style.width = w0 + 'px'; d.style.height = h + 'px';
  if (it.type === 'comic') d.append(comic(it.block, w, h));
  if (it.type === 'sudoku'){ const key = page.info.key; const dt = new Date(Date.UTC(page.info.y, page.info.mo - 1, page.info.d - 1)); d.append(sudoku(key, dt.getUTCFullYear() * 10000 + (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate(), w)); }
  sheet.append(d);
}
function drawFiller(sheet, pl, page, n){
  const w = pl.x1 - pl.x0, k = pl.r1 - pl.r0, h = k * S.P - S.gap;
  const cols = Math.max(1, Math.min(3, Math.round(w / 420))), rws = Math.max(1, Math.min(3, Math.round(h / 520)));
  const ads = pickAds(page.info.key, cols * rws, page.no * 13 + n);
  const cw = (w - 8 * (cols + 1)) / cols, ch = (h - 8 * (rws + 1)) / rws;
  let q = 0;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rws; j++){ const a = adBox(ads[q++ % ads.length], cw, ch); a.style.left = (X(pl.x1) - (i + 1) * (cw + 8)) + 'px'; a.style.top = (Y(pl.r0) + 8 + j * (ch + 8)) + 'px'; a.classList.add('filler'); sheet.append(a); }
}

/* ---------------- masthead strip (front page) ---------------- */
function drawMast(sheet, page, ed, onIndex){
  const x1 = X(S.CW), x0 = x1 - MAST_W, R = page.R;
  const box = el('div', 'mast'); box.style.left = x0 + 'px'; box.style.top = S.MT + 'px'; box.style.width = MAST_W + 'px'; box.style.height = (R * S.P - S.gap) + 'px';
  const dj = el('div', 'daiji'); dj.style.height = (4 * S.P - S.gap) + 'px';
  dj.append(svg(`<svg class="chimon" viewBox="0 0 100 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor">${Array.from({ length: 14 }, (_, i) => { const y = 10 + i * 21, x = (i % 2) ? 70 : 30; return `<path d="M${x} ${y} q12 -10 22 2 q-12 9 -22 -2z M${x} ${y} q-12 -10 -22 2 q12 9 22 -2z"/>`; }).join('')}</g></svg>`));
  dj.append(el('span', 'nm', PAPER.name));
  box.append(dj);
  const inf = page.info;
  const meta = el('div', 'meta');
  meta.innerHTML = `<div class="dt">${inf.y}年<br><b>${inf.mo}月${inf.d}日</b><br>${inf.wd}曜日</div><div class="rw">令和${inf.reiwa}年</div><div class="no">${typeof ed.no === 'number' ? '第' + ed.no + '号' : (ed.no || '')}　${esc(ed.time || '朝5時刊')}</div>`;
  const wx = findWeather(ed); if (wx){ const w0 = wx.items[0]; const wd = el('div', 'mwx'); wd.append(wxIcon(w0.icon, 30), el('span', null, `${w0.place}　${w0.sky}　${w0.hi}/${w0.lo}℃`)); meta.append(wd); }
  meta.append(el('div', 'motto', PAPER.motto));
  meta.append(el('div', 'pub', `発行　${PAPER.company}（私家版）`));
  box.append(meta);
  // index (インデックス)
  const ix = el('div', 'index'); ix.append(el('div', 'ixh', 'きょうの紙面'));
  (page.indexList || []).forEach(x => { const r = el('a', 'ix'); r.href = '#p' + x.no; r.innerHTML = `<b>${x.no}面</b>${esc(x.h)}`; r.addEventListener('click', (e) => { e.preventDefault(); onIndex && onIndex(x.no - 1); }); ix.append(r); });
  box.append(ix);
  sheet.append(box);
}
function findWeather(ed){ for (const pg of ed.pages || []) for (const b of pg.blocks || []) if (b.type === 'weather' && b.items && b.items[0]) return b; return null; }

/* ---------------- ad band ---------------- */
function drawAds(sheet, page){
  if (!page.adRows) return;
  const y = Y(page.R), h = page.adRows * S.P - S.gap; const W = S.CW;
  const band = el('div', 'adband'); band.style.left = X(0) + 'px'; band.style.top = (y - 4) + 'px'; band.style.width = W + 'px'; band.style.height = (h + 4) + 'px'; sheet.append(band);
  const n = page.adRows >= 4 ? 3 : page.adRows === 3 ? 4 : 5;
  const list = (page.ads && page.ads.length ? page.ads : []).concat(pickAds(page.info.key, n, page.no)).slice(0, n);
  // 三八つ-style book strip on 3段 bands
  let xr = X(W); const gap = 8;
  const weights = list.map((a, i) => (i === 0 ? 1.5 : 1));
  const tw = weights.reduce((a, b) => a + b, 0);
  list.forEach((a, i) => { const aw = (W - gap * (n - 1)) * weights[i] / tw; const box = adBox(a, aw, h); box.style.left = (xr - aw) + 'px'; box.style.top = (y + 4) + 'px'; sheet.append(box); xr -= aw + gap; });
}

/* ---------------- page ---------------- */
export function drawPage(page, ed, hooks = {}){
  const sheet = el('div', 'sheet'); sheet.style.width = S.W + 'px'; sheet.style.height = S.H + 'px';
  sheet.dataset.no = page.no;
  // 柱
  const inf = page.info;
  if (!page.front){
    const hs = el('div', 'hashira'); hs.style.left = X(0) + 'px'; hs.style.width = S.CW + 'px';
    hs.innerHTML = `<span class="pn">${page.no}</span><b>${esc(page.title)}${page.cont ? '（続き）' : ''}</b><span class="mid">${esc(PAPER.name)}</span><span>${inf.long}　${typeof ed.no === 'number' ? '第' + ed.no + '号' : ''}</span>`;
    sheet.append(hs);
  } else {
    const top = el('div', 'fronttop'); top.style.left = X(0) + 'px'; top.style.width = S.CW + 'px'; top.innerHTML = `<span>${inf.long}</span><span>${esc(PAPER.kana)}　私家版　毎朝5時発行</span>`; sheet.append(top);
    drawMast(sheet, page, ed, hooks.onIndex);
  }
  let fillN = 0;
  page.placed.forEach(pl => {
    const k = pl.it.kind;
    if (k === 'flow') drawFlow(sheet, pl, page, hooks.onOpen);
    else if (k === 'yoko') drawYoko(sheet, pl);
    else if (k === 'fixed') drawFixed(sheet, pl, page, ed);
    else if (k === 'filler') drawFiller(sheet, pl, page, fillN++);
  });
  drawAds(sheet, page);
  const ft = el('div', 'sfoot'); ft.style.left = X(0) + 'px'; ft.style.width = S.CW + 'px'; ft.style.top = (S.H - S.MB + 14) + 'px';
  ft.textContent = `― ${page.no} ―　${PAPER.name}　${inf.short}　私的な趣味で作成した紙面で、報道機関の記事ではありません。記事をタップすると全文と出典を読めます。`;
  sheet.append(ft);
  return sheet;
}
