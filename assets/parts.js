// 明日葉新聞 — drawn parts: 4コマ cast, 数独, figures, weather icons, ads. Browser only.
import { rng, hash } from './layout.js';

export function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
export function svg(markup){ const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; }
const arr = (x) => x == null ? [] : (Array.isArray(x) ? x : [x]);
function shuffle(a, r){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------------- 4コマ ---------------- */
const FACE = {
  normal:(x,y,r)=>`<circle cx="${x-r*.35}" cy="${y-r*.05}" r="${r*.07}" fill="currentColor"/><circle cx="${x+r*.35}" cy="${y-r*.05}" r="${r*.07}" fill="currentColor"/><path d="M${x-r*.18} ${y+r*.38} q${r*.18} ${r*.1} ${r*.36} 0"/>`,
  smile:(x,y,r)=>`<path d="M${x-r*.48} ${y} q${r*.13} -${r*.18} ${r*.26} 0 M${x+r*.22} ${y} q${r*.13} -${r*.18} ${r*.26} 0"/><path d="M${x-r*.28} ${y+r*.3} q${r*.28} ${r*.3} ${r*.56} 0"/>`,
  laugh:(x,y,r)=>`<path d="M${x-r*.48} ${y} q${r*.13} -${r*.2} ${r*.26} 0 M${x+r*.22} ${y} q${r*.13} -${r*.2} ${r*.26} 0"/><path d="M${x-r*.3} ${y+r*.25} h${r*.6} q0 ${r*.38} -${r*.3} ${r*.38} q-${r*.3} 0 -${r*.3} -${r*.38}z" fill="currentColor"/>`,
  surprise:(x,y,r)=>`<circle cx="${x-r*.35}" cy="${y-r*.05}" r="${r*.13}"/><circle cx="${x+r*.35}" cy="${y-r*.05}" r="${r*.13}"/><circle cx="${x-r*.35}" cy="${y-r*.05}" r="${r*.05}" fill="currentColor"/><circle cx="${x+r*.35}" cy="${y-r*.05}" r="${r*.05}" fill="currentColor"/><ellipse cx="${x}" cy="${y+r*.42}" rx="${r*.1}" ry="${r*.14}"/><path d="M${x+r*1.2} ${y-r*1.1} l${r*.2} -${r*.3} M${x+r*1.35} ${y-r*.85} l${r*.32} -${r*.12} M${x-r*1.2} ${y-r*1.1} l-${r*.2} -${r*.3}"/>`,
  sweat:(x,y,r)=>`<circle cx="${x-r*.35}" cy="${y-r*.05}" r="${r*.07}" fill="currentColor"/><circle cx="${x+r*.35}" cy="${y-r*.05}" r="${r*.07}" fill="currentColor"/><path d="M${x-r*.25} ${y+r*.4} q${r*.12} -${r*.1} ${r*.25} 0 q${r*.12} ${r*.1} ${r*.25} 0"/><path d="M${x+r*.95} ${y-r*.55} q${r*.15} ${r*.3} 0 ${r*.38} q-${r*.15} -${r*.08} 0 -${r*.38}z"/>`,
  think:(x,y,r)=>`<circle cx="${x-r*.3}" cy="${y-r*.18}" r="${r*.07}" fill="currentColor"/><circle cx="${x+r*.4}" cy="${y-r*.18}" r="${r*.07}" fill="currentColor"/><path d="M${x-r*.15} ${y+r*.4} h${r*.3}"/><path d="M${x+r*1.05} ${y-r*1.25} q${r*.25} -${r*.25} ${r*.4} 0 q0 ${r*.2} -${r*.2} ${r*.3} v${r*.1}"/>`,
  sad:(x,y,r)=>`<path d="M${x-r*.5} ${y-r*.3} l${r*.25} ${r*.1} M${x+r*.5} ${y-r*.3} l-${r*.25} ${r*.1}"/><circle cx="${x-r*.35}" cy="${y}" r="${r*.07}" fill="currentColor"/><circle cx="${x+r*.35}" cy="${y}" r="${r*.07}" fill="currentColor"/><path d="M${x-r*.22} ${y+r*.48} q${r*.22} -${r*.2} ${r*.44} 0"/>`,
  angry:(x,y,r)=>`<path d="M${x-r*.55} ${y-r*.35} l${r*.32} ${r*.15} M${x+r*.55} ${y-r*.35} l-${r*.32} ${r*.15}"/><circle cx="${x-r*.33}" cy="${y}" r="${r*.07}" fill="currentColor"/><circle cx="${x+r*.33}" cy="${y}" r="${r*.07}" fill="currentColor"/><path d="M${x-r*.25} ${y+r*.42} l${r*.12} -${r*.08} l${r*.13} ${r*.08} l${r*.13} -${r*.08} l${r*.12} ${r*.08}"/>`,
  sleepy:(x,y,r)=>`<path d="M${x-r*.48} ${y} h${r*.26} M${x+r*.22} ${y} h${r*.26}"/><ellipse cx="${x}" cy="${y+r*.42}" rx="${r*.08}" ry="${r*.06}"/><text x="${x+r*.9}" y="${y-r*.8}" font-size="${r*.55}" fill="currentColor" stroke="none" font-family="sans-serif">z</text><text x="${x+r*1.25}" y="${y-r*1.2}" font-size="${r*.4}" fill="currentColor" stroke="none" font-family="sans-serif">z</text>`,
  sparkle:(x,y,r)=>`<path d="M${x-r*.35} ${y-r*.22} v${r*.34} M${x-r*.52} ${y-r*.05} h${r*.34} M${x+r*.35} ${y-r*.22} v${r*.34} M${x+r*.18} ${y-r*.05} h${r*.34}"/><path d="M${x-r*.28} ${y+r*.3} q${r*.28} ${r*.3} ${r*.56} 0"/>`,
  blush:(x,y,r)=>`<path d="M${x-r*.48} ${y} q${r*.13} -${r*.18} ${r*.26} 0 M${x+r*.22} ${y} q${r*.13} -${r*.18} ${r*.26} 0"/><path d="M${x-r*.2} ${y+r*.32} q${r*.2} ${r*.18} ${r*.4} 0"/><path d="M${x-r*.75} ${y+r*.2} l${r*.1} -${r*.12} M${x-r*.62} ${y+r*.22} l${r*.1} -${r*.12} M${x+r*.55} ${y+r*.2} l${r*.1} -${r*.12} M${x+r*.68} ${y+r*.22} l${r*.1} -${r*.12}"/>`
};
const face = (f, x, y, r) => (FACE[f] || FACE.normal)(x, y, r);
const CAST = {
  ashi:(x, b, s, f)=>{ const r = s*.27, hy = b - s*.66; return `<path d="M${x-s*.2} ${b} q0 -${s*.34} ${s*.2} -${s*.36} q${s*.2} ${s*.02} ${s*.2} ${s*.36}z" class="pp"/><path d="M${x} ${hy-r} q-${s*.02} -${s*.1} ${s*.04} -${s*.16}"/><path d="M${x+s*.04} ${hy-r-s*.16} q${s*.14} -${s*.08} ${s*.17} ${s*.03} q-${s*.1} ${s*.07} -${s*.17} -${s*.03}z" class="lf"/><path d="M${x+s*.04} ${hy-r-s*.16} q-${s*.12} -${s*.12} -${s*.18} 0 q${s*.08} ${s*.08} ${s*.18} 0z" class="lf"/><circle cx="${x}" cy="${hy}" r="${r}" class="pp"/>${face(f, x, hy + r*.08, r)}`; },
  neko:(x, b, s, f)=>{ const r = s*.28, hy = b - s*.64; return `<path d="M${x-s*.22} ${b} q0 -${s*.36} ${s*.22} -${s*.36} q${s*.22} 0 ${s*.22} ${s*.36}z" class="pp"/><path d="M${x} ${b-s*.34} l-${s*.04} ${s*.06} l${s*.04} ${s*.17} l${s*.04} -${s*.17}z" fill="currentColor"/><path d="M${x-r*.95} ${hy-r*.35} l${r*.1} -${r*.85} l${r*.6} ${r*.45} M${x+r*.95} ${hy-r*.35} l-${r*.1} -${r*.85} l-${r*.6} ${r*.45}" class="pp"/><ellipse cx="${x}" cy="${hy}" rx="${r*1.05}" ry="${r*.92}" class="pp"/><circle cx="${x-r*.36}" cy="${hy-r*.06}" r="${r*.27}" stroke-width="1"/><circle cx="${x+r*.36}" cy="${hy-r*.06}" r="${r*.27}" stroke-width="1"/><path d="M${x-r*.09} ${hy-r*.06} h${r*.18}" stroke-width="1"/><path d="M${x-r*1.3} ${hy+r*.25} l${r*.55} ${r*.05} M${x-r*1.3} ${hy+r*.45} l${r*.55} -${r*.05} M${x+r*1.3} ${hy+r*.25} l-${r*.55} ${r*.05} M${x+r*1.3} ${hy+r*.45} l-${r*.55} -${r*.05}" stroke-width=".8"/>${face(f, x, hy + r*.05, r*.92)}`; },
  hito:(x, b, s, f)=>{ const r = s*.22, hy = b - s*.68; return `<path d="M${x-s*.2} ${b} q0 -${s*.38} ${s*.2} -${s*.38} q${s*.2} 0 ${s*.2} ${s*.38}z" class="pp"/><circle cx="${x}" cy="${hy}" r="${r}" class="pp"/><path d="M${x-r} ${hy-r*.1} q${r} -${r*1.4} ${r*2} 0" fill="currentColor"/>${face(f, x, hy + r*.15, r)}`; }
};
const BG = {
  plain: () => '',
  room: (w,h)=>`<path d="M0 ${h*.8} H${w}"/><rect x="${w*.08}" y="${h*.12}" width="${w*.24}" height="${h*.26}"/><path d="M${w*.2} ${h*.12} V${h*.38} M${w*.08} ${h*.25} H${w*.32}"/>`,
  office: (w,h)=>`<path d="M0 ${h*.8} H${w}"/><rect x="${w*.62}" y="${h*.58}" width="${w*.36}" height="${h*.05}" class="pp"/><rect x="${w*.7}" y="${h*.36}" width="${w*.2}" height="${h*.2}" class="pp"/>`,
  field: (w,h)=>`<path d="M0 ${h*.58} H${w}"/><circle cx="${w*.15}" cy="${h*.2}" r="${h*.08}"/><path d="M${w*.05} ${h*.98} L${w*.3} ${h*.6} M${w*.35} ${h*.98} L${w*.45} ${h*.6} M${w*.65} ${h*.98} L${w*.6} ${h*.6} M${w*.95} ${h*.98} L${w*.75} ${h*.6}" stroke-width=".8"/>`,
  stadium: (w,h)=>`<path d="M0 ${h*.42} Q${w*.5} ${h*.25} ${w} ${h*.42}"/><path d="M0 ${h*.3} Q${w*.5} ${h*.13} ${w} ${h*.3}" stroke-width=".7"/><path d="M${w*.5} ${h*.55} L${w*.85} ${h*.75} L${w*.5} ${h*.95} L${w*.15} ${h*.75}z" stroke-width=".8"/>`,
  street: (w,h)=>`<path d="M0 ${h*.8} H${w}"/><path d="M${w*.02} ${h*.8} V${h*.25} H${w*.2} V${h*.8} M${w*.24} ${h*.8} V${h*.4} H${w*.38} V${h*.8} M${w*.78} ${h*.8} V${h*.18} H${w*.96} V${h*.8}"/>`,
  night: (w,h)=>`<path d="M${w*.12} ${h*.1} a${h*.1} ${h*.1} 0 1 0 ${h*.12} ${h*.16} a${h*.08} ${h*.08} 0 1 1 -${h*.12} -${h*.16}z" fill="currentColor"/><circle cx="${w*.45}" cy="${h*.12}" r="1.2" fill="currentColor"/><circle cx="${w*.7}" cy="${h*.22}" r="1.2" fill="currentColor"/><path d="M0 ${h*.8} H${w}"/>`,
  sea: (w,h)=>`<path d="M0 ${h*.55} q${w*.1} -${h*.05} ${w*.2} 0 t${w*.2} 0 t${w*.2} 0 t${w*.2} 0 t${w*.2} 0"/><path d="M0 ${h*.68} q${w*.1} -${h*.04} ${w*.2} 0 t${w*.2} 0 t${w*.2} 0 t${w*.2} 0 t${w*.2} 0" stroke-width=".7"/><circle cx="${w*.82}" cy="${h*.18}" r="${h*.07}"/>`,
  speed: (w,h)=>{ let s = ''; for (let i = 0; i < 9; i++){ const y = h*(.08 + i*.1); s += `<path d="M${w*(.05 + (i%3)*.05)} ${y} H${w*(.55 + (i%2)*.3)}" stroke-width=".6"/>`; } return s; },
  sparkle: (w,h)=>{ let s = ''; const r = rng(7); for (let i = 0; i < 7; i++){ const x = w*r(), y = h*r()*.5, z = 3 + r()*4; s += `<path d="M${x} ${y-z} L${x+z*.3} ${y-z*.3} L${x+z} ${y} L${x+z*.3} ${y+z*.3} L${x} ${y+z} L${x-z*.3} ${y+z*.3} L${x-z} ${y} L${x-z*.3} ${y-z*.3}z" fill="currentColor"/>`; } return s; }
};
export function comic(b, w, h){
  const box = el('div', 'comic'); const pw = Math.min(w, 300) - 12;
  const ph = Math.round(pw / 1.22);
  const t = el('div', 'ttl'); t.append(el('b', null, b.title || 'あしたばくん')); if (b.no) t.append(el('small', null, b.no)); box.append(t);
  arr(b.panels).slice(0, 4).forEach((p) => {
    const pn = el('div', 'pn'); pn.style.width = pw + 'px'; pn.style.height = ph + 'px';
    const cast = arr(p.cast); const n = cast.length; const xs = n === 1 ? [.5] : n === 2 ? [.7, .3] : [.78, .5, .22];
    let g = `<svg viewBox="0 0 ${pw} ${ph}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` + (BG[p.bg] || BG.plain)(pw, ph);
    cast.forEach((c, j) => { const x = (c.x != null ? c.x : xs[j] || .5) * pw; g += (CAST[c.who] || CAST.hito)(x, ph * .985, ph * (c.big ? .74 : .5), c.face || 'normal'); });
    pn.append(svg(g + '</svg>'));
    const says = arr(p.say);
    says.forEach((s, j) => { const who = cast.findIndex(c => c.who === s.who); const fx = who >= 0 ? (cast[who].x != null ? cast[who].x : xs[who]) : .5;
      const bl = el('div', 'bl' + (String(s.text).length > 14 ? ' sm' : ''), s.text); bl.style.maxHeight = Math.round(ph * .46) + 'px';
      if (says.length === 1) bl.style.right = `calc(${((1 - fx) * 100).toFixed(1)}% - 10px)`; else if (j === 0) bl.style.right = '5px'; else bl.style.left = '5px';
      pn.append(bl); });
    if (p.cap) pn.append(el('div', 'cap', p.cap));
    box.append(pn);
  });
  box.append(el('div', 'by', b.by || '作・明日葉新聞（AIによる創作）'));
  return box;
}

/* ---------------- 数独 ---------------- */
export function sudokuFor(seed){
  const r = rng(seed); const g = new Array(81).fill(0);
  const ok = (g, i, v) => { const R = (i/9)|0, C = i%9; for (let k = 0; k < 9; k++){ if (g[R*9+k] === v || g[k*9+C] === v) return false; } const br = R - R%3, bc = C - C%3; for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) if (g[(br+a)*9 + bc+b2] === v) return false; return true; };
  const fill = (i) => { if (i === 81) return true; for (const v of shuffle([1,2,3,4,5,6,7,8,9], r)){ if (ok(g, i, v)){ g[i] = v; if (fill(i+1)) return true; g[i] = 0; } } return false; };
  fill(0); const sol = g.slice();
  const count = (p, lim) => { let best = -1, bestN = 10; for (let i = 0; i < 81; i++){ if (p[i]) continue; let n = 0; for (let v = 1; v <= 9; v++) if (ok(p, i, v)) n++; if (n < bestN){ bestN = n; best = i; if (!n) return 0; } } if (best < 0) return 1; let c = 0; for (let v = 1; v <= 9; v++){ if (ok(p, best, v)){ p[best] = v; c += count(p, lim - c); p[best] = 0; if (c >= lim) break; } } return c; };
  const puz = sol.slice(); let givens = 81;
  for (const i of shuffle([...Array(81).keys()], r)){ if (givens <= 28) break; const keep = puz[i]; puz[i] = 0; if (count(puz.slice(), 2) !== 1) puz[i] = keep; else givens--; }
  return { puz, sol, givens };
}
export function sudoku(key, prevKey, w){
  const box = el('div', 'sudoku'); const s = Math.min(w, 330) - 16;
  const today = sudokuFor(key), yest = sudokuFor(prevKey);
  const t = el('div', 'ttl'); t.append(el('b', null, '数独'), el('small', null, `ヒント${today.givens}`)); box.append(t);
  const grid = el('div', 'sdk'); grid.style.width = s + 'px'; grid.style.fontSize = Math.round(s / 15) + 'px';
  let saved = {}; const KEY = 'ashitaba-sdk-' + key; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){}
  const note = el('div', 'note', '縦・横・3×3に1〜9を一つずつ');
  const check = () => { const v = Array.from(grid.children).map((c, i) => today.puz[i] || +((c.querySelector('input') || {}).value || 0)); if (v.every((x, i) => x === today.sol[i])) note.textContent = '正解です。おみごと！'; };
  today.puz.forEach((v, i) => { const c = el('div'); if (v) c.textContent = v; else { const inp = el('input'); inp.inputMode = 'numeric'; inp.maxLength = 1; inp.setAttribute('aria-label', `${(i/9|0)+1}行${i%9+1}列`); if (saved[i]) inp.value = saved[i];
    inp.addEventListener('click', e => e.stopPropagation());
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^1-9]/g, '').slice(-1); saved[i] = inp.value; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(e){} check(); }); c.append(inp); } grid.append(c); });
  box.append(grid, note, el('div', 'note', 'きのうの答え'));
  const ans = el('div', 'sdk ans'); ans.style.width = Math.round(s * .42) + 'px'; ans.style.fontSize = Math.max(7, Math.round(s * .42 / 16)) + 'px';
  yest.sol.forEach(v => ans.append(el('div', null, String(v)))); box.append(ans);
  return box;
}

/* ---------------- figures inside articles ---------------- */
export function figure(f, w, h){
  const box = el('figure', 'fig fig-' + f.type); box.style.width = w + 'px'; box.style.height = h + 'px';
  if (f.type === 'number'){ box.append(el('div', 'num', f.value), el('div', 'unit', f.unit || ''), el('figcaption', null, f.cap || '')); }
  else if (f.type === 'bars'){
    const items = arr(f.items); const max = Math.max(...items.map(i => +i[1] || 0), 1); const bh = Math.max(10, Math.min(26, (h - 50) / Math.max(1, items.length) - 6));
    let s = `<svg viewBox="0 0 ${w} ${items.length * (bh + 6) + 4}" width="${w}" xmlns="http://www.w3.org/2000/svg">`;
    items.forEach((it, i) => { const y = i * (bh + 6) + 2; const bw = (w - 96) * (+it[1] / max); s += `<text x="0" y="${y + bh * .75}" font-size="${Math.min(13, bh * .8)}" fill="currentColor">${String(it[0]).slice(0, 7)}</text><rect x="70" y="${y}" width="${bw}" height="${bh}" fill="currentColor" opacity=".78"/><text x="${74 + bw}" y="${y + bh * .75}" font-size="${Math.min(12, bh * .75)}" fill="currentColor">${it[1]}</text>`; });
    box.append(el('div', 'fttl', f.title || '')); box.append(svg(s + '</svg>')); if (f.cap) box.append(el('figcaption', null, f.cap));
  }
  else if (f.type === 'photo' && /^https:\/\/upload\.wikimedia\.org\//.test(f.url || '')){
    const img = el('img'); img.src = f.url; img.alt = f.cap || ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; box.append(img);
    box.append(el('figcaption', null, `${f.cap || ''}（写真：${f.credit || '作者不明'}／${f.license || ''}）`));
  }
  else if (f.type === 'moon'){
    const a = ((+f.age % 29.53) + 29.53) % 29.53, ph = a / 29.53, r = 22, k = Math.cos(2 * Math.PI * ph), rx = Math.abs(k) * r, waxing = ph < .5;
    const path = `M25 3 A${r} ${r} 0 0 ${waxing ? 1 : 0} 25 47 A${rx} ${r} 0 0 ${(k > 0) === waxing ? 0 : 1} 25 3z`;
    box.append(svg(`<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="22" fill="currentColor" fill-opacity=".55" stroke="currentColor"/><path d="${path}" fill="#F3E8BA" stroke="currentColor" stroke-width=".6"/></svg>`));
  }
  else { box.append(illust(f.name || 'sprout', Math.min(w, h * 1.2))); if (f.cap) box.append(el('figcaption', null, f.cap)); }
  return box;
}
const ILL = {
  sprout: `<path d="M50 92 V52"/><path d="M50 60 q-30 -6 -34 -34 q28 2 34 34z" class="lf"/><path d="M50 52 q22 -20 40 -18 q-6 26 -40 18z" class="lf"/><path d="M20 92 H80"/>`,
  baseball: `<circle cx="50" cy="50" r="36" class="pp"/><path d="M28 22 q14 28 0 56 M72 22 q-14 28 0 56"/><path d="M30 30 l5 -2 M33 40 l5 -1 M33 60 l5 1 M30 70 l5 2 M70 30 l-5 -2 M67 40 l-5 -1 M67 60 l-5 1 M70 70 l-5 2" stroke-width="1.6"/>`,
  chip: `<rect x="28" y="28" width="44" height="44" rx="4" class="pp"/><rect x="40" y="40" width="20" height="20"/><path d="M36 28 V16 M50 28 V16 M64 28 V16 M36 72 V84 M50 72 V84 M64 72 V84 M28 36 H16 M28 50 H16 M28 64 H16 M72 36 H84 M72 50 H84 M72 64 H84"/>`,
  book: `<path d="M14 26 q18 -8 36 4 q18 -12 36 -4 v52 q-18 -8 -36 4 q-18 -12 -36 -4z" class="pp"/><path d="M50 30 v52"/>`,
  wheat: `<path d="M50 94 V20"/>${[0,1,2,3,4].map(i => `<path d="M50 ${30 + i*12} q-14 -4 -16 -14 q12 2 16 14z" class="lf"/><path d="M50 ${30 + i*12} q14 -4 16 -14 q-12 2 -16 14z" class="lf"/>`).join('')}`,
  globe: `<circle cx="50" cy="50" r="36" class="pp"/><ellipse cx="50" cy="50" rx="16" ry="36"/><path d="M14 50 H86 M20 32 H80 M20 68 H80"/>`,
  ship: `<path d="M14 64 h72 l-12 18 h-48z" class="pp"/><path d="M50 64 V16"/><path d="M50 18 l26 32 h-26z" class="pp"/><path d="M8 88 q10 -6 20 0 t20 0 t20 0 t20 0"/>`,
  game: `<rect x="14" y="34" width="72" height="36" rx="18" class="pp"/><path d="M32 44 v16 M24 52 h16"/><circle cx="64" cy="48" r="3" fill="currentColor"/><circle cx="72" cy="56" r="3" fill="currentColor"/>`,
  waffle: `<rect x="20" y="24" width="60" height="52" rx="6" class="pp"/><path d="M20 37 H80 M20 50 H80 M20 63 H80 M35 24 V76 M50 24 V76 M65 24 V76"/>`,
  coin: `<ellipse cx="50" cy="66" rx="30" ry="10" class="pp"/><path d="M20 66 v-10 a30 10 0 0 1 60 0 v10"/><ellipse cx="50" cy="46" rx="30" ry="10" class="pp"/><path d="M20 46 v-10 a30 10 0 0 1 60 0 v10"/><ellipse cx="50" cy="36" rx="30" ry="10" class="pp"/>`
};
export function illust(name, size){ return svg(`<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="ill">${ILL[name] || ILL.sprout}</svg>`); }

/* ---------------- weather ---------------- */
const WX = {
  sun: '<circle cx="22" cy="22" r="7"/><path d="M22 6v5M22 33v5M6 22h5M33 22h5M10.7 10.7l3.5 3.5M29.8 29.8l3.5 3.5M10.7 33.3l3.5-3.5M29.8 14.2l3.5-3.5"/>',
  cloud: '<path d="M12 31h20a7 7 0 0 0 0-14 10 10 0 0 0-19 3 6 6 0 0 0-1 11z"/>',
  suncloud: '<circle cx="15" cy="15" r="5"/><path d="M15 4v3M4 15h3M7.2 7.2l2 2M22.8 7.2l-2 2"/><path d="M15 33h18a6 6 0 0 0 0-12 9 9 0 0 0-17 2 5 5 0 0 0-1 10z" class="pp"/>',
  rain: '<path d="M12 25h20a7 7 0 0 0 0-14 10 10 0 0 0-19 3 6 6 0 0 0-1 11z"/><path d="M15 30l-2 5M22 30l-2 5M29 30l-2 5"/>',
  snow: '<path d="M12 25h20a7 7 0 0 0 0-14 10 10 0 0 0-19 3 6 6 0 0 0-1 11z"/><path d="M15 31v4M13 33h4M23 31v4M21 33h4M31 31v4M29 33h4"/>'
};
export function wxIcon(k, size = 44){ return svg(`<svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${WX[k] || WX.cloud}</svg>`); }

/* ---------------- ads ---------------- */
export const AD_STOCK = [
  { kind: 'self', who: '3Dアーカイブ', cp: '2010年の緑駅へ、ブラウザで帰る。', body: '北海道清里町・緑駅とその周辺を、まるごと3Dで再現中。', ft: 'MIDORI World　制作進行中' },
  { kind: 'self', who: '野球ゲーム', cp: '沢村と大谷が、同じ球団に。', body: '全選手データで時代をまぜる、球団運営シミュレーター。', ft: 'NPB時代混合シミュレーター　構想中' },
  { kind: 'self', who: '放置ゲーム', cp: '見守るだけで、文明は育つ。', body: '課金では勝てない、放置型の文明育成ゲーム。', ft: '文明発展ゲーム（仮）　開発中', inv: true },
  { kind: 'self', who: 'AIプロジェクト', cp: 'AIたちが、きょうも登校してきます。', body: '自作のAIが生徒になる、3Dのバーチャル教室。', ft: 'AIバーチャル教室' },
  { kind: 'self', who: '読者係', cp: 'ご意見、紙面で待っています。', body: '紙面の感想や載せてほしい話題を、編集部へ。翌朝の編集会議に回します。', ft: '明日葉新聞　読者係' },
  { kind: 'fiction', who: '食品', cp: '5時に起きた人だけが知る味。', body: '北海道産大豆と明日葉の、朝いちばんの味噌汁。', ft: 'あしたば印の早起き味噌汁', inv: true },
  { kind: 'fiction', who: '書籍', cp: '借方に帝国、貸方に革命。', body: '勘定科目で世界史を読み解く一冊。', ft: '『仕訳で読む世界史』明日葉書房', book: true },
  { kind: 'fiction', who: '旅行', cp: '週末、ブリュッセルまで。', body: 'ワッフルとビールの距離は、思ったより近い。', ft: 'あしたばトラベル' },
  { kind: 'fiction', who: '教室', cp: 'Bonjour が、口から先に出る。', body: '1日5分、話すための筋肉を鍛えるフランス語。', ft: '明日葉ことば塾' },
  { kind: 'fiction', who: '農園', cp: '畑のことは、畑に聞け。', body: '十勝の土で育った、規格外の野菜セット。', ft: 'あしたば農園　定期便', inv: true },
  { kind: 'fiction', who: '書籍', cp: '九回裏、二死満塁の経営学。', body: '逆転の打順で読む、中小企業の事業承継。', ft: '『事業承継は九回裏から』明日葉書房', book: true },
  { kind: 'fiction', who: '書籍', cp: '海図のない海で、仲間を探す。', body: '冒険小説の名場面で学ぶ、チームのつくり方。', ft: '『航海士のリーダー論』明日葉書房', book: true }
];
export function adBox(a, w, h){
  const vertical = h > w * 1.25;
  const d = el('div', 'ad' + (a.inv ? ' inv' : '') + (vertical ? ' v' : '') + (a.book ? ' book' : ''));
  d.style.width = w + 'px'; d.style.height = h + 'px';
  d.append(el('span', 'lab', a.kind === 'fiction' ? '架空広告' : a.kind === 'self' ? '自社広告' : '広告'));
  if (a.who) d.append(el('div', 'who', a.who));
  const cp = el('div', 'cp', a.cp); const big = Math.max(15, Math.min(40, Math.sqrt(w * h) / 11, (vertical ? w : h) / 5.2)); cp.style.fontSize = big + 'px'; d.append(cp);
  if (a.body && (vertical ? w : h) > 150) d.append(el('div', 'bdy', a.body));
  if (a.ft) d.append(el('div', 'ft', a.ft));
  return d;
}
export function pickAds(key, n, salt){ const r = rng(key * 31 + salt * 7); return shuffle(AD_STOCK.slice(), r).slice(0, n); }
