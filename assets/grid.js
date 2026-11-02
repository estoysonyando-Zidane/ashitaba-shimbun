// 明日葉新聞 — cell-grid page layout ("押さえて流す").
// The article area is a grid of R 段 × C line-columns (one cell = one vertical line of 11 chars).
// 1) 押さえる: boxes (タタミ・カコミ・コラム・4コマ…) are pinned to corners and the bottom.
// 2) 流す: stories are poured in rank order from the top-right-most free corner. A story's headline
//    stands at its top right; its text runs right→left through the 段, drops to the next 段 and,
//    where the story to its right has already ended, spreads under it — so stories become L- and
//    stair-shaped and interlock like a real page, instead of being rectangles.
// 3) Leftover pockets become 突き出し-style small ads. Candidates are scored against the taboos.
import { S, widthFor, iw, rng } from './layout.js';

export const COLS = Math.floor(S.CW / S.lp);   // 66 line-columns across the sheet

const FREE = -1;
function makeGrid(R, C){ return Array.from({ length: R }, () => new Array(C).fill(FREE)); }
function cloneGrid(g){ return g.map(r => r.slice()); }

/* ---------- boxes: rectangle size in cells ---------- */
function boxOptions(it, R){
  const out = [];
  const kMin = Math.max(1, it.kind === 'flow' ? it.minK : (it.minK || 1));
  for (let k = kMin; k <= Math.min(R, kMin + 4); k++){
    const wpx = iw(it, k); if (!isFinite(wpx)) continue;
    const pad = it.kind === 'flow' ? 0 : 16;
    const c = Math.ceil((wpx + pad) / S.lp);
    if (c < 4 || c > COLS * .7) continue;
    out.push({ k, c });
  }
  return out;
}
function fits(g, r0, c0, k, c){ if (r0 < 0 || c0 < 0 || r0 + k > g.length || c0 + c > g[0].length) return false; for (let r = r0; r < r0 + k; r++) for (let x = c0; x < c0 + c; x++) if (g[r][x] !== FREE) return false; return true; }
function fill(g, r0, c0, k, c, id){ for (let r = r0; r < r0 + k; r++) for (let x = c0; x < c0 + c; x++) g[r][x] = id; }
// Pin a box to a corner: 'LT' left-top (タタミの定位置), 'LB' left-bottom, 'RB' right-bottom (カコミの定位置).
function pinBox(g, k, c, corner, rightLimit){
  const R = g.length;
  if (corner === 'LT'){ for (let r = 0; r + k <= R; r++) if (fits(g, r, 0, k, c)) return { r0: r, c0: 0 }; }
  if (corner === 'LB'){ for (let r = R - k; r >= 0; r--) for (let x = 0; x + c <= rightLimit; x++) if (fits(g, r, x, k, c)) return { r0: r, c0: x }; }
  if (corner === 'RB'){ for (let r = R - k; r >= 0; r--) for (let x = rightLimit - c; x >= 0; x--) if (fits(g, r, x, k, c)) return { r0: r, c0: x }; }
  return null;
}

/* ---------- stories ---------- */
function geomCols(it){
  return {
    hn: it.head.hn,
    hc: it.head.parts.length ? Math.ceil((it.head.w + 4) / S.lp) : 0,
    lc: it.ledeLines.length ? Math.ceil(it.ledeW / S.lp) : 0,
    fc: it.fig ? Math.ceil((it.figW + 8) / S.lp) : 0,
    fn: it.fig ? it.figN : 0,
  };
}
// Reading-order corners: free cells whose right neighbour is taken (or the edge), top row first.
function corners(g, limit){
  const R = g.length, C = g[0].length, out = [];
  for (let r = 0; r < R && out.length < limit; r++){
    for (let c = C - 1; c >= 0 && out.length < limit; c--){
      if (g[r][c] === FREE && (c === C - 1 || g[r][c + 1] !== FREE) && (r === 0 || g[r - 1][c] !== FREE)) out.push({ r, c });
    }
  }
  return out;
}
function runLeft(g, r, c){ let x = c; while (x - 1 >= 0 && g[r][x - 1] === FREE) x--; return x; }
function runRight(g, r, c){ let x = c; while (x + 1 < g[0].length && g[r][x + 1] === FREE) x++; return x; }

// Pour one story from anchor (r0,c0) with its top-left limit cl. Returns placement or null.
function pour(g, it, id, r0, c0, cl){
  const R = g.length; const gc = geomCols(it); const need = it.lines.length;
  const headL = c0 - gc.hc - gc.lc + 1;
  if (headL - 1 < cl + gc.fc + 2) return null;                         // no room for text beside the headline
  for (let r = r0; r < r0 + gc.hn; r++){ if (r >= R) return null; for (let x = Math.max(0, cl); x <= c0; x++) if (g[r][x] !== FREE) return null; }
  if (gc.fn && r0 + gc.fn > R) return null;
  const rows = []; const lines = []; let li = 0;
  for (let r = r0; li < need || r < r0 + gc.hn; r++){
    if (r >= R) return null;
    let right, left;
    if (r < r0 + gc.hn){ right = headL - 1; left = cl; }
    else {
      if (g[r][c0] !== FREE) return null;                               // blocked straight below: would be 飛び降り
      right = runRight(g, r, c0); left = Math.max(cl, runLeft(g, r, c0));
    }
    if (r < r0 + gc.fn) left = Math.max(left, cl + gc.fc);
    const cap = right - left + 1;
    if (cap < 2 && li < need) return null;
    const take = Math.max(0, Math.min(cap, need - li));
    const used = [];
    for (let j = 0; j < take; j++){ used.push(right - j); lines.push({ r, c: right - j, i: li++ }); }
    rows.push({ r, left, right, used, full: take === cap });
    if (li >= need && r >= r0 + gc.hn - 1) break;
  }
  // claim cells
  for (let r = r0; r < r0 + gc.hn; r++) for (let x = headL; x <= c0; x++) g[r][x] = id;
  if (gc.fc) for (let r = r0; r < r0 + gc.fn; r++) for (let x = cl; x < cl + gc.fc; x++) g[r][x] = id;
  rows.forEach(row => { if (row.full) for (let x = row.left; x <= row.right; x++) g[row.r][x] = id; else row.used.forEach(x => g[row.r][x] = id); });
  // within header rows the text area is fully the story's even if short (avoid holes beside the headline)
  for (let r = r0; r < r0 + gc.hn; r++) for (let x = cl; x < headL; x++) if (g[r][x] === FREE) g[r][x] = id;
  return { it, id, r0, c0, cl, gc, rows, lines, r1: rows[rows.length - 1].r + 1 };
}

/* ---------- leftover → rectangles ---------- */
function pockets(g){
  const R = g.length, C = g[0].length, seen = makeGrid(R, C), out = [];
  for (let r = 0; r < R; r++) for (let c = C - 1; c >= 0; c--){
    if (g[r][c] !== FREE || seen[r][c] !== FREE) continue;
    let l = c; while (l - 1 >= 0 && g[r][l - 1] === FREE && seen[r][l - 1] === FREE) l--;
    let k = 1; while (r + k < R){ let ok = true; for (let x = l; x <= c; x++) if (g[r + k][x] !== FREE || seen[r + k][x] !== FREE){ ok = false; break; } if (!ok) break; k++; }
    for (let rr = r; rr < r + k; rr++) for (let x = l; x <= c; x++) seen[rr][x] = 1;
    out.push({ r0: r, r1: r + k, c0: l, c1: c + 1 });
  }
  return out;
}

/* ---------- scoring ---------- */
function score(g, placed, boxes, unplaced, R, C){
  let pen = unplaced * 40;
  const area = R * C;
  // leftovers
  const pk = pockets(g); let fillA = 0, tiny = 0;
  pk.forEach(p => { const a = (p.r1 - p.r0) * (p.c1 - p.c0); if ((p.c1 - p.c0) < 5) tiny += a; else { fillA += a; /* 突き出し広告 belong at the edges and the foot of the page */ if (p.r1 < R && p.c0 > 0 && p.c1 < C) pen += 1.5 + a / (R * C) * 20; } });
  pen += 14 * fillA / area + 0.6 * tiny;
  // 腹切り: a 段 seam that runs across the whole width
  for (let r = 1; r < R; r++){ let cut = true; for (let c = 0; c < C; c++){ const a = g[r - 1][c], b = g[r][c]; if (a === b && a !== FREE){ cut = false; break; } } if (cut) pen += 7; }
  // headline blocks
  const hb = placed.map(p => ({ r0: p.r0, r1: p.r0 + p.gc.hn, c0: p.c0 - p.gc.hc + 1, c1: p.c0 + 1, hn: p.gc.hn, rank: p.it.rank, p }));
  for (let i = 0; i < hb.length; i++) for (let j = 0; j < hb.length; j++){
    if (i === j) continue; const A = hb[i], B = hb[j];
    const overlapX = Math.min(A.c1, B.c1) - Math.max(A.c0, B.c0);
    if (B.r0 >= A.r1 && B.r0 - A.r1 <= 1 && overlapX > 0) pen += 3;                                   // 煙突
    if (i < j && A.r0 === B.r0 && A.hn === B.hn && A.rank !== 'beta' && (Math.abs(A.c0 - B.c1) <= 3 || Math.abs(B.c0 - A.c1) <= 3)) pen += 2.5; // 横並び
  }
  hb.forEach(b => { if (b.hn >= 2 && b.r1 >= R) pen += 4; });                                          // しりもち
  placed.forEach(p => { if (p.gc.fn && p.r0 + p.gc.fn >= R) pen += 3; });
  // reading quality: thin 段 strips, 泣き別れ, ragged last 段
  placed.forEach(p => {
    p.rows.forEach((row, k) => { const n = row.used.length; if (k < p.rows.length - 1 && n > 0 && n < 4) pen += 1.2; });
    let idx = 0; p.naki = 0;
    p.rows.forEach((row, k) => { idx += row.used.length; if (k < p.rows.length - 1 && idx > 0 && idx < p.it.lines.length && p.it.lines[idx - 1].end) p.naki++; });
    pen += p.naki * .7;
    const last = p.rows[p.rows.length - 1]; const gap = last.used.length ? (Math.min(...last.used) - last.left) : 0;
    if (!last.full && gap > 0 && gap < 5) pen += 1.5;                                                   // a sliver that nothing can use
  });
  // the lead story: top-right, broad and tall
  const lead = placed[0];
  if (lead){ const w = lead.c0 - lead.cl + 1; if (lead.it.rank === 'top'){ if (w < C * .35) pen += 4; if (lead.r1 - lead.r0 < 4) pen += 3; } }
  // shape variety: reward stories that actually step (not every story a rectangle)
  const stepped = placed.filter(p => new Set(p.rows.map(r => r.right)).size > 1 || new Set(p.rows.map(r => r.left)).size > 1).length;
  pen -= Math.min(3, stepped) * .5;
  return { pen, pockets: pk };
}

/* ---------- one page ---------- */
// stories: prepared flow items (rank top/sub/mid/beta) in order. boxes: items pinned first.
export function layoutGrid(stories, boxes, R, opt = {}){
  const C = COLS; const rightLimit = C - (opt.mastCols || 0);
  const r = rng(opt.seed || 1); const tries = opt.tries || 700;
  let best = null;
  for (let t = 0; t < tries; t++){
    const g = makeGrid(R, C);
    if (opt.mastCols) for (let rr = 0; rr < R; rr++) for (let x = rightLimit; x < C; x++) g[rr][x] = 'mast';
    // 押さえる
    const pinned = []; const leftBoxes = [];
    boxes.forEach((b, bi) => {
      const ops = boxOptions(b, R); if (!ops.length){ leftBoxes.push(b); return; }
      const o = ops[Math.floor(r() * ops.length)];
      const pref = b.frame === 'col' ? ['LB', 'RB'] : b.frame === 'kakomi' ? ['RB', 'LB', 'LT'] : b.frame === 'tatami' ? ['LT', 'LB'] : ['LB', 'LT', 'RB'];
      const order = r() < .75 ? pref : pref.slice().sort(() => r() - .5);
      let pos = null; for (const cn of order){ pos = pinBox(g, o.k, o.c, cn, rightLimit); if (pos) break; }
      if (!pos){ leftBoxes.push(b); return; }
      fill(g, pos.r0, pos.c0, o.k, o.c, 'b' + bi);
      pinned.push({ it: b, id: 'b' + bi, r0: pos.r0, r1: pos.r0 + o.k, c0: pos.c0, c1: pos.c0 + o.c });
    });
    // 流す
    const placed = []; let unplaced = 0; const rest = [];
    for (let si = 0; si < stories.length; si++){
      const it = stories[si]; const gc = geomCols(it);
      const cs = corners(g, 4); if (!cs.length){ unplaced += stories.length - si; rest.push(...stories.slice(si)); break; }
      let done = null;
      for (let attempt = 0; attempt < 8 && !done; attempt++){
        const pick = si === 0 ? 0 : (r() < .72 ? 0 : r() < .7 ? 1 : 2);
        const a = cs[Math.min(pick, cs.length - 1)];
        const L = a.c - runLeft(g, a.r, a.c) + 1;
        const minW = gc.hc + gc.lc + gc.fc + 3;
        if (L < minW) continue;
        // target number of 段 for the story, then the top width that would give it
        const rk = it.rank; const tr = rk === 'top' ? 4 + Math.floor(r() * 4) : rk === 'sub' ? 3 + Math.floor(r() * 3) : rk === 'mid' ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
        let w = Math.ceil(it.lines.length / Math.max(1, tr)) + gc.hc + gc.lc + Math.round(gc.fc * gc.fn / Math.max(1, tr));
        if (si === 0 && rk === 'top') w = Math.max(w, Math.ceil(L * (.45 + r() * .4)));
        w = Math.max(minW, Math.min(L, w + Math.floor((r() - .5) * 6)));
        const g2 = cloneGrid(g);
        const p = pour(g2, it, 's' + si, a.r, a.c, a.c - w + 1);
        if (p){ done = p; for (let rr = 0; rr < R; rr++) g[rr] = g2[rr]; }
      }
      if (!done){ unplaced += stories.length - si; rest.push(...stories.slice(si)); break; }
      placed.push(done);
    }
    const sc = score(g, placed, pinned, unplaced + leftBoxes.length, R, C);
    if (!best || sc.pen < best.pen) best = { pen: sc.pen, grid: g, placed, pinned, pockets: sc.pockets, rest: rest.concat(leftBoxes), R, C };
  }
  return best;
}
