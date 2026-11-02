// 明日葉新聞 — typesetting and page-layout engine.
// Pure functions (no DOM): runs in the browser viewer and in Node (tools/check.mjs), so the
// layout a reader sees is exactly the one the morning check verified.
//
// Model: a fixed broadsheet in sheet pixels. 12 段 (horizontal bands). In each 段, vertical lines of
// L=11 characters run right to left. Glyphs are set 平体 (vertically squashed to H_SCALE) like real
// newspaper type. Articles are rectangles k 段 tall; their text flows 段 by 段 from the top right.
// Page layout = "押さえて流す": candidate guillotine layouts (vertical strips → stacked cells →
// side-by-side items) are generated deterministically and scored against the classic taboos
// (腹切り, 横並び, 煙突, しりもち, 泣き別れ) plus fill and the X-shaped reading flow.

export const S = (() => {
  const W = 1600, ML = 40, MR = 40, MT = 72, MB = 50;
  const c = 16, L = 11, H_SCALE = 0.87, lp = 23, gap = 14, rows = 12;
  const adv = c * H_SCALE;                 // vertical advance of one body character
  const D = L * adv;                        // height of one 段
  const P = D + gap;                        // 段 pitch
  const CW = W - ML - MR;                   // content width
  const CH = rows * P - gap;                // content height
  return { W, ML, MR, MT, MB, c, L, H_SCALE, lp, gap, rows, adv, D, P, CW, CH, H: MT + CH + MB };
})();

/* ------------------------------------------------------------------ text normalisation ---- */
const FW_DIGIT = '０１２３４５６７８９';
const toFW = (s) => s.replace(/[0-9]/g, (d) => FW_DIGIT[+d]).replace(/[A-Z]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0));
export function normalize(s){
  return String(s == null ? '' : s)
    .replace(/(\d)\s*[-–]\s*(\d)(?=[^\d年月日時分%％]|$)/g, '$1対$2')       // scores 4-2 → 4対2
    .replace(/(\d{1,3}(?:,\d{3})+)/g, (m) => { const n = +m.replace(/,/g, ''); if (n >= 10000){ const man = Math.floor(n / 10000), r = n % 10000; return man + '万' + (r ? r : ''); } return String(n); })
    .replace(/\b(\d{5,})\b/g, (m) => { const n = +m; if (n >= 10000 && n % 1 === 0){ const man = Math.floor(n / 10000), r = n % 10000; return man + '万' + (r ? r : ''); } return m; })
    .replace(/%/g, '％').replace(/!/g, '！').replace(/\?/g, '？').replace(/\(/g, '（').replace(/\)/g, '）').replace(/:/g, '：').replace(/~/g, '〜')
    .replace(/[ \t]*\n[ \t]*/g, '');
}

/* ------------------------------------------------------------------ tokenizer ---------------- */
// Units: {k:'c'} one full-width cell, {k:'t'} 縦中横 (one cell), {k:'r'} rotated Latin (w in em).
const LATIN_W = (ch) => /[A-Z]/.test(ch) ? .66 : /[a-z]/.test(ch) ? (/[ilj.,'!|]/.test(ch) ? .3 : /[mw]/.test(ch) ? .82 : .52) : /[0-9]/.test(ch) ? .56 : ch === ' ' ? .3 : .38;
export function tokenize(s){
  const out = []; const t = normalize(s); let i = 0;
  while (i < t.length){
    const rest = t.slice(i);
    let m;
    if ((m = /^\d+(?:\.\d+)?/.exec(rest))){
      const g = m[0];
      if (g.length <= 2 || (g.includes('.') && g.length <= 3)) out.push({ k: 't', s: g, w: 1 });
      else for (const d of g) out.push({ k: 'c', s: d === '.' ? '・' : toFW(d), w: 1 });
      i += g.length; continue;
    }
    if ((m = /^[A-Za-z][A-Za-z0-9.'&+\-]*(?: [A-Za-z0-9][A-Za-z0-9.'&+\-]*)*/.exec(rest))){
      const g = m[0];
      if (/^[A-Z]{1,2}$/.test(g)) out.push({ k: 't', s: g, w: 1 });
      else if (/^[A-Z0-9]{3,4}$/.test(g)) for (const ch of g) out.push({ k: 'c', s: toFW(ch), w: 1 });
      else {
        // rotated Latin: split into word-sized chunks so lines can break between words
        g.split(/(?<= )/).forEach((part) => { let w = 0; for (const ch of part) w += LATIN_W(ch); out.push({ k: 'r', s: part, w: Math.max(.5, w) }); });
      }
      i += g.length; continue;
    }
    const ch = String.fromCodePoint(t.codePointAt(i));
    out.push({ k: 'c', s: ch, w: 1 }); i += ch.length;
  }
  return out;
}

const NO_START = new Set('、。，．・：；？！ー）」』】〕〉》’”ゝゞ々…‥'.split(''));
const NO_END = new Set('（「『【〔〈《‘“'.split(''));
const HANG = new Set(['、', '。', '，', '．']);

// Break paragraphs into lines of `len` cells. Returns [{u:[units], used, end}] (end = last line of paragraph).
export function breakLines(paras, len, opt = {}){
  const lines = [];
  paras.forEach((p, pi) => {
    const units = tokenize(p);
    if (!units.length) return;
    let cur = [], used = 0;
    if (opt.indent !== false) { cur.push({ k: 'c', s: '　', w: 1 }); used = 1; }
    const push = (end) => { lines.push({ u: cur, used, end }); cur = []; used = 0; };
    for (let i = 0; i < units.length; i++){
      let u = units[i];
      if (u.k === 'r' && u.w > len){ // very long Latin chunk: split by characters
        let acc = ''; let w = 0;
        for (const ch of u.s){ const cw = LATIN_W(ch); if (used + w + cw > len){ cur.push({ k: 'r', s: acc, w }); used += w; push(false); acc = ''; w = 0; } acc += ch; w += cw; }
        u = { k: 'r', s: acc, w }; if (!acc) continue;
      }
      if (used + u.w <= len + 1e-6){ cur.push(u); used += u.w; continue; }
      // line is full
      if (u.k === 'c' && HANG.has(u.s)){ cur.push(u); used += u.w; push(false); continue; } // ぶら下げ
      if (u.k === 'c' && NO_START.has(u.s) && cur.length > 1){ // 追い出し: carry the last unit over
        const last = cur.pop(); used -= last.w; push(false); cur.push(last); used = last.w;
      } else push(false);
      // 行末禁則 on the line just closed
      const prev = lines[lines.length - 1];
      if (prev && prev.u.length > 1){ const lu = prev.u[prev.u.length - 1]; if (lu.k === 'c' && NO_END.has(lu.s)){ prev.u.pop(); prev.used -= lu.w; cur.unshift(lu); used += lu.w; } }
      cur.push(u); used += u.w;
    }
    if (cur.length) push(true); else if (lines.length) lines[lines.length - 1].end = true;
  });
  return lines;
}

/* ------------------------------------------------------------------ headline geometry -------- */
export const HEAD = {
  top:  { hn: 4, size: 66, sub: 30, kick: 20, font: 'g' },
  sub:  { hn: 3, size: 50, sub: 24, kick: 17, font: 'm' },
  mid:  { hn: 2, size: 38, sub: 19, kick: 15, font: 'm' },
  beta: { hn: 1, size: 25, sub: 0,  kick: 0,  font: 'm' },
  box:  { hn: 1, size: 24, sub: 0,  kick: 0,  font: 'g' },
};
function colsOf(text, size, height){
  const per = Math.max(2, Math.floor(height / (size * S.H_SCALE * 1.02)));
  const units = tokenize(text).filter(u => u.s !== '　');
  const total = units.reduce((a, u) => a + u.w, 0);
  // explicit break with ／
  let parts = String(text || '').split('／');
  // headlines break at 、 (dropped) like real ones, when the halves fit a column
  if (parts.length === 1 && total > per && /、/.test(text)){ const sp = String(text).split('、'); if (sp.every(x => tokenize(x).reduce((a, u) => a + u.w, 0) <= per)) parts = sp; }
  if (parts.length > 1) return { cols: parts.map(x => normalize(x)), per };
  const n = Math.max(1, Math.ceil(total / per));
  // balance columns
  const cols = []; let cur = '', w = 0; const target = Math.ceil(total / n);
  for (const u of units){ if (w + u.w > target + .01 && cols.length < n - 1 && !(u.k === 'c' && NO_START.has(u.s))){ cols.push(cur); cur = ''; w = 0; } cur += u.s; w += u.w; }
  cols.push(cur);
  return { cols, per };
}
// Returns header geometry for a flow item at rank with a given header height (in 段).
function headGeom(it){
  const H = HEAD[it.rank] || HEAD.mid; const hn = it.hn || H.hn;
  const h = hn * S.P - S.gap;
  const g = { hn, h, parts: [], w: 0 };
  if (it.kicker && H.kick){ g.parts.push({ t: 'kick', cols: [normalize(it.kicker)], size: H.kick, w: H.kick * 1.5 }); }
  if (it.h){ const c = colsOf(it.h, H.size, h); g.parts.push({ t: 'main', cols: c.cols, size: H.size, w: c.cols.length * H.size * 1.12 }); }
  if (it.sub && H.sub){ const c = colsOf(it.sub, H.sub, h * .92); g.parts.push({ t: 'sub', cols: c.cols, size: H.sub, w: c.cols.length * H.sub * 1.25 }); }
  g.w = g.parts.reduce((a, p) => a + p.w, 0) + (g.parts.length ? S.c * .8 : 0);
  return g;
}

/* ------------------------------------------------------------------ flow items ---------------- */
// A flow item: {id, kind, rank, kicker, h, sub, lede, paras, credit, frame, fig, banner, ...}
// prepared once: header geometry, lede lines, body lines.
export function prepareFlow(it){
  const p = Object.assign({}, it);
  p.head = headGeom(p);
  p.ledeLines = [];
  p.ledeW = 0;
  if (p.lede){
    const lc = 17, llp = 25; // 通し組み: one lede line spans the whole header height
    const per = Math.floor(p.head.h / (lc * S.H_SCALE)) - 1;
    p.ledeLines = breakLines([p.lede], per);
    p.ledeW = p.ledeLines.length * llp + 26;
    p.lede_c = lc; p.lede_lp = llp; p.lede_per = per;
  }
  const paras = (p.paras || []).slice();
  if (p.credit) paras[paras.length - 1] = (paras[paras.length - 1] || '') + '（' + p.credit + '）';
  p.lines = breakLines(paras, S.L, { indent: p.indent !== false });
  p.figW = p.fig ? (p.fig.w || 200) : 0;
  p.figN = p.fig ? (p.fig.n || 2) : 0;
  p.pad = p.frame === 'kakomi' ? 18 : 10;
  p.minK = Math.max(p.head.hn + (p.lines.length ? 1 : 0) - (p.rank === 'beta' || p.rank === 'box' ? 1 : 0), p.figN, p.minK || 1);
  if (p.banner) p.minK += 1;
  p._w = {};
  return p;
}
// Rows (from the item's top) that hold body lines and the horizontal space reserved on each.
function rowSpans(p, k, w){
  const out = []; const off = p.banner ? 1 : 0;
  for (let r = 0; r < k; r++){
    if (r < off){ out.push(0); continue; }
    let res = 2 * p.pad;
    if (r - off < p.head.hn) res += p.head.w + p.ledeW;
    if (r - off < p.figN) res += p.figW + 8;
    out.push(Math.max(0, w - res));
  }
  return out;
}
export function slotsFor(p, k, w){ return slotsAt(p, k, w); }
function slotsAt(p, k, w){ return rowSpans(p, k, w).reduce((a, x) => a + Math.floor(x / S.lp), 0); }
// Minimal width so the item's body fits in k 段.
export function widthFor(p, k){
  if (k < p.minK) return Infinity;
  if (p._w[k] != null) return p._w[k];
  const need = p.lines.length;
  const base = 2 * p.pad + Math.max(p.head.w + p.ledeW, p.figW) + S.lp;
  let w = Math.ceil(base);
  if (need === 0){ p._w[k] = w; return w; }
  // grow by line pitch until the lines fit
  let lo = w, hi = w + need * S.lp + 10;
  while (slotsAt(p, k, hi) < need) hi *= 1.5;
  while (hi - lo > 2){ const mid = (lo + hi) >> 1; if (slotsAt(p, k, mid) >= need) hi = mid; else lo = mid; }
  w = hi;
  if (p.banner) w = Math.max(w, normalize(p.h).length * 52 + 40);
  return (p._w[k] = w);
}

/* ------------------------------------------------------------------ fixed / horizontal items -- */
// Fixed items: {kind:'fixed', aspect, base, minW, maxW, minK} — height(w) = w*aspect + base.
export function fixedK(it, w){ const ww = Math.min(w, it.maxW || w); const h = ww * it.aspect + it.base; return Math.max(it.minK || 1, Math.ceil((h + S.gap) / S.P)); }
export function fixedW(it, k){ const h = k * S.P - S.gap; const w = (h - it.base) / it.aspect; if (w < (it.minW || 0)) return Infinity; return Math.min(w, it.maxW || w); }
// Horizontal (横組み) boxes: estimated text height for a given width.
export function yokoH(it, w){
  const inner = w - 28; let h = 34;
  (it.blocks || []).forEach((b) => { const per = Math.max(4, Math.floor(inner / b.size)); const lines = Math.ceil(Math.max(1, b.len) / per); h += lines * b.size * b.lh + (b.after || 0); });
  return h;
}

/* ------------------------------------------------------------------ RNG ---------------------- */
export function rng(seed){ let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hash(str){ let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ------------------------------------------------------------------ page layout --------------- */
// Item widths for k rows, generic over kinds.
export function iw(it, k){
  if (it.kind === 'flow') return widthFor(it, k);
  if (it.kind === 'fixed') return fixedW(it, k);
  if (it.kind === 'yoko'){ const h = k * S.P - S.gap; let lo = it.minW || 180, hi = it.maxW || 1400; if (yokoH(it, hi) > h) return Infinity; while (hi - lo > 4){ const m = (lo + hi) / 2; if (yokoH(it, m) <= h) hi = m; else lo = m; } return Math.ceil(hi); }
  return Infinity;
}
function minKOf(it){ return it.kind === 'flow' ? it.minK : (it.minK || 1); }
// For a cell (items side by side), minimal rows to fit in width w.
function cellK(cell, w, R){
  for (let k = Math.max(...cell.map(minKOf)); k <= R; k++){
    let sum = 0; for (const it of cell){ sum += iw(it, k); if (sum > w) break; }
    if (sum <= w) return k;
  }
  return Infinity;
}
function stripMinW(cells, R, maxW){
  const fits = (w) => { let r = 0; for (const c of cells){ r += cellK(c, w, R); if (r > R) return false; } return true; };
  if (!fits(maxW)) return Infinity;
  let lo = 60, hi = maxW;
  while (hi - lo > 3){ const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  return Math.ceil(hi);
}

// Generate a candidate tree: strips (right→left) of cells (top→bottom) of items (right→left).
function genTree(items, r){
  const n = items.length;
  const order = items.slice(1);
  // light shuffle that keeps rank roughly in order
  for (let i = order.length - 1; i > 0; i--){ if (r() < .35){ const j = Math.max(0, i - 1 - Math.floor(r() * 3)); [order[i], order[j]] = [order[j], order[i]]; } }
  // boxes prefer the left-top or right-bottom dead corners: nudge them to the ends
  const seq = [items[0], ...order];
  const maxS = Math.min(4, n);
  const s = 1 + Math.floor(r() * maxS);
  // cut seq into s contiguous groups
  const cuts = new Set(); while (cuts.size < s - 1) cuts.add(1 + Math.floor(r() * (n - 1)));
  const cs = [0, ...[...cuts].sort((a, b) => a - b), n];
  const strips = [];
  for (let i = 0; i < s; i++){
    const grp = seq.slice(cs[i], cs[i + 1]); if (!grp.length) continue;
    const cells = []; let j = 0;
    while (j < grp.length){ const take = Math.min(grp.length - j, r() < .55 ? 1 : (r() < .7 ? 2 : 3)); cells.push(grp.slice(j, j + take)); j += take; }
    strips.push(cells);
  }
  return strips;
}

function evaluate(strips, W, R, opt){
  // widths
  const mins = strips.map(cells => stripMinW(cells, R, W));
  const tot = mins.reduce((a, b) => a + b, 0);
  if (!isFinite(tot) || tot > W) return null;
  const extra = W - tot;
  const widths = mins.map(m => m + extra * (m / tot));
  const placed = []; let pen = 0; const cutsByStrip = [];
  let x1 = opt.x1;
  strips.forEach((cells, si) => {
    const w = widths[si]; const x0 = x1 - w;
    let ks = cells.map(c => cellK(c, w, R));
    let spare = R - ks.reduce((a, b) => a + b, 0);
    // give spare rows to the cell whose items gain most from height (biggest text), else filler
    let filler = 0;
    while (spare > 0){
      let best = -1, bestGain = -1;
      cells.forEach((c, ci) => { const flowLines = c.reduce((a, it) => a + (it.kind === 'flow' ? it.lines.length : 0), 0); const gain = flowLines / (ks[ci] + 1); if (gain > bestGain && gain > 24){ bestGain = gain; best = ci; } });
      if (best < 0){ filler = spare; break; }
      ks[best]++; spare--;
    }
    let r0 = 0; const cuts = [];
    cells.forEach((c, ci) => {
      const k = ks[ci];
      const ws = c.map(it => iw(it, k));
      const sum = ws.reduce((a, b) => a + b, 0);
      let left = w - sum; let xr = x1;
      c.forEach((it, ii) => {
        const share = it.kind === 'fixed' ? 0 : left * (ws[ii] / Math.max(1, ws.filter((_, q) => c[q].kind !== 'fixed').reduce((a, b) => a + b, 0)));
        const fw = c.every(q => q.kind === 'fixed') ? w / c.length : ws[ii] + share;
        placed.push({ it, x0: xr - fw, x1: xr, r0, r1: r0 + k, si, ci, ii });
        xr -= fw;
      });
      r0 += k; cuts.push(r0);
    });
    if (filler > 0){ placed.push({ it: { kind: 'filler', id: 'fill-' + si }, x0, x1, r0, r1: r0 + filler, si, ci: cells.length, ii: 0 }); r0 += filler; }
    cutsByStrip.push(cuts.filter(c => c < R));
    x1 = x0;
  });
  // ---- scoring
  let waste = 0; const area = W * R * S.P;
  placed.forEach(pl => {
    const it = pl.it; const k = pl.r1 - pl.r0, w = pl.x1 - pl.x0, h = k * S.P;
    if (it.kind === 'flow'){ const sl = slotsAt(it, k, w); const e = Math.max(0, sl - it.lines.length); waste += e * S.lp * S.D; if (sl < it.lines.length) pen += 50; pl.empty = e; }
    else if (it.kind === 'fixed'){ const cw = Math.min(w, it.maxW || w); const ch = cw * it.aspect + it.base; waste += Math.max(0, w * h - cw * ch); }
    else if (it.kind === 'yoko'){ waste += Math.max(0, w * (h - S.gap - yokoH(it, w))); }
    else if (it.kind === 'filler'){ waste += w * h * .7; }
  });
  pen += 18 * (waste / area); 
  // 腹切り: a 段 boundary shared by every strip (and not the region bottom)
  if (strips.length > 1 || opt.fullWidth){
    for (let row = 1; row < R; row++){ if (cutsByStrip.every(cs => cs.includes(row))) pen += 6; }
  } else if (cutsByStrip[0].length) pen += 3; // a single strip of stacked cells is all 腹切り
  // 横並び: side by side items with the same headline size starting on the same row
  for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++){
    const A = placed[a], B = placed[b];
    if (A.it.kind !== 'flow' || B.it.kind !== 'flow' || !A.it.h || !B.it.h) continue;
    const adj = Math.abs(A.x0 - B.x1) < 2 || Math.abs(B.x0 - A.x1) < 2;
    if (adj && A.r0 === B.r0 && A.it.rank === B.it.rank && A.it.rank !== 'beta') pen += 2.2;
    // 煙突: headline right under a headline at the same right edge
    if (Math.abs(A.x1 - B.x1) < 2 && (B.r0 === A.r1 || A.r0 === B.r1)){
      const up = B.r0 === A.r1 ? A : B; if (up.it.head && (up.r1 - up.r0) <= up.it.head.hn + 1) pen += 2.5; else pen += .4;
    }
  }
  // しりもち: a headline of 2段+ reaching the bottom row
  placed.forEach(pl => { if (pl.it.kind === 'flow' && pl.it.head && pl.it.head.hn >= 2 && pl.r0 + pl.it.head.hn >= R) pen += 3; });
  // top story: right-top and tall enough; X flow: 2nd story away from the right edge
  const top = placed.find(pl => pl.it === opt.first);
  if (top){ if (top.r0 !== 0 || top.x1 < opt.x1 - 1) pen += 20; const k = top.r1 - top.r0; if (top.it.rank === 'top' && k < 4) pen += 4; if (top.it.rank === 'top' && (top.x1 - top.x0) < W * .38) pen += 3; }
  // narrow flow items read badly
  placed.forEach(pl => { if (pl.it.kind === 'flow'){ const k = pl.r1 - pl.r0, w = pl.x1 - pl.x0; const spans = rowSpans(pl.it, k, w); if (spans[spans.length - 1] < S.lp * 3) pen += 1.5; } });
  // 泣き別れ: a 段 ends exactly at a paragraph end while the article continues below
  placed.forEach(pl => { if (pl.it.kind === 'flow'){ const nk = nakiwakare(pl.it, pl.r1 - pl.r0, pl.x1 - pl.x0); pen += nk * .8; pl.naki = nk; } });
  return { placed, pen, widths };
}
export function nakiwakare(it, k, w){
  const spans = rowSpans(it, k, w); let idx = 0, n = 0;
  for (let r = 0; r < spans.length; r++){
    const cap = Math.floor(spans[r] / S.lp); if (!cap) continue;
    idx += cap; if (idx >= it.lines.length) break;
    const prev = it.lines[idx - 1]; if (prev && prev.end) n++;
  }
  return n;
}

// Lay out one page region. items[0] is the lead story. Returns best {placed, pen} or null.
export function layoutRegion(items, W, R, seed, opt = {}){
  const r = rng(seed); let best = null;
  const tries = opt.tries || 900;
  for (let t = 0; t < tries; t++){
    const tree = genTree(items, r);
    const ev = evaluate(tree, W, R, { x1: opt.x1 != null ? opt.x1 : W, first: items[0], fullWidth: opt.fullWidth });
    if (ev && (!best || ev.pen < best.pen)) best = ev;
  }
  return best;
}
