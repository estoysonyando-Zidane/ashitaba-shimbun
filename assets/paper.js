// 明日葉新聞 — turns an edition (JSON) into laid-out pages. Pure; shared by the viewer and tools.
import { S, prepareFlow, layoutRegion, widthFor, hash, rng, normalize } from './layout.js';

export const PAPER = { name: '明日葉新聞', kana: 'あしたばしんぶん', company: '明日葉新聞社', motto: '摘んでも、明日また芽吹く。', column: '芽吹き' };
export const MAST_W = 236;

export function dateInfo(ed){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ed.iso || '');
  const y = m ? +m[1] : 2026, mo = m ? +m[2] : 1, d = m ? +m[3] : 1;
  const wd = '日月火水木金土'[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return { y, mo, d, wd, reiwa: y - 2018, key: y * 10000 + mo * 100 + d, short: `${y}年${mo}月${d}日(${wd})`, long: `${y}年（令和${y - 2018}年）${mo}月${d}日　${wd}曜日` };
}
const creditOf = (src) => (src || []).map(s => String(s.t || '').replace(/\s.*$/, '')).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('、');
const arr = (x) => x == null ? [] : (Array.isArray(x) ? x : [x]);

let uid = 0;
function flow(o){ return prepareFlow(Object.assign({ kind: 'flow', id: 'f' + (++uid) }, o)); }

// Convert a page's blocks into layout items (+ page-level things such as ads).
export function itemsFor(pg, pageIdx, ed){
  const items = []; let ads = null;
  arr(pg.blocks).forEach((b, bi) => {
    const src = arr(b.src);
    switch (b.type){
      case 'lead': case 'item': case 'article': {
        const rank = b.rank || (b.type === 'lead' ? 'top' : 'mid');
        items.push(flow({ rank, kicker: b.kicker, label: b.label, h: b.h, sub: b.sub, lede: b.lede, paras: arr(b.body), credit: creditOf(src), src, fig: figOf(b.fig), banner: !!b.banner, block: b }));
        break;
      }
      case 'briefs': items.push(flow({ rank: 'box', frame: 'tatami', h: b.title || '短信', indent: false, paras: arr(b.items).map(x => `◆${x.h}　${x.body}${x.src && x.src.length ? '（' + creditOf(x.src) + '）' : ''}`), src: arr(b.items).flatMap(x => arr(x.src)), block: b })); break;
      case 'column': items.push(flow({ rank: 'box', frame: 'col', h: b.name || PAPER.column, indent: false, paras: [arr(b.body).join('▼')], solo: true, block: b })); break;
      case 'note': items.push(flow({ rank: 'box', frame: 'kakomi', h: b.title, paras: arr(b.body), src, block: b })); break;
      case 'agenda': items.push(flow({ rank: 'box', frame: 'kakomi', h: b.title || '近く開かれる催し', indent: false, paras: arr(b.rows).map(r => `◆${r[0]}　${r[1]}`), block: b })); break;
      case 'haiku': items.push(flow({ rank: 'box', frame: 'tatami', h: b.title || 'きょうの一句', indent: false, paras: [b.text, `（${b.by}）`, ...(b.note ? [b.note] : [])], block: b })); break;
      case 'letters': items.push(flow({ rank: 'box', frame: 'kakomi', h: b.title || '読者のこえ', indent: false, paras: arr(b.items).map(x => `◆${x.name}　${x.body}`), block: b })); break;
      case 'correction': items.push(flow({ rank: 'box', frame: 'kakomi', h: '訂正', paras: arr(b.body), block: b })); break;
      case 'history': historyItems(b, ed).forEach(x => items.push(x)); break;
      case 'words': items.push({ kind: 'yoko', id: 'y' + (++uid), type: 'words', block: b, minW: 300, maxW: 760, minK: 2, blocks: [{ size: 15, lh: 1.6, len: 8 }, ...arr(b.rows).map(r => ({ size: 17, lh: 1.5, len: (r[0] + r[2]).length + 14, after: 8 }))] }); break;
      case 'table': items.push({ kind: 'yoko', id: 'y' + (++uid), type: 'table', block: b, minW: 420, maxW: 900, minK: 2, blocks: [{ size: 15, lh: 1.6, len: 10 }, ...arr(b.rows).map(() => ({ size: 15, lh: 2.1, len: 10 }))] }); break;
      case 'weather': items.push({ kind: 'yoko', id: 'y' + (++uid), type: 'weather', block: b, minW: 420, maxW: 1100, minK: 1, blocks: [{ size: 15, lh: 1.6, len: 6 }, { size: 22, lh: 3.4, len: 6 }, ...(b.note ? [{ size: 13, lh: 1.6, len: b.note.length }] : [])] }); break;
      case 'comic': items.push({ kind: 'fixed', id: 'x' + (++uid), type: 'comic', block: b, aspect: 4 / 1.22, base: 30 + 21 + 22, minW: 170, maxW: 300, minK: 4 }); break;
      case 'sudoku': items.push({ kind: 'fixed', id: 'x' + (++uid), type: 'sudoku', block: b, aspect: 1.45, base: 78, minW: 230, maxW: 330, minK: 3 }); break;
      case 'ads': ads = arr(b.items); break;
      default: break;
    }
  });
  return { items, ads };
}
function figOf(f){
  if (!f) return null;
  const n = f.n || (f.type === 'photo' ? 3 : 2);
  const w = f.w || (f.type === 'number' ? 170 : f.type === 'bars' ? 250 : f.type === 'photo' ? 300 : 200);
  return Object.assign({}, f, { n, w });
}
function historyItems(b, ed){
  const di = dateInfo(ed); const out = [];
  if (b.about) out.push(flow({ rank: 'sub', kicker: 'きょうは何の日', h: b.about.h, sub: b.about.sub, paras: arr(b.about.body), credit: creditOf(b.about.src), src: arr(b.about.src), block: b }));
  if (b.events) out.push(flow({ rank: 'mid', kicker: 'できごと', h: `${di.mo}月${di.d}日の歴史`, indent: false, paras: arr(b.events).map(e => `◆${e[0]}年　${e[1]}`), block: b }));
  if (b.births) out.push(flow({ rank: 'mid', kicker: '誕生日', h: 'この日に生まれた人', indent: false, paras: arr(b.births).map(e => `◆${e[0]}年　${e[1]}（${e[2]}）`), block: b }));
  if (b.deaths) out.push(flow({ rank: 'box', frame: 'kakomi', h: 'この日をしのぶ', indent: false, paras: arr(b.deaths).map(e => `◆${e[0]}年　${e[1]}（${e[2]}）`), block: b }));
  if (b.sky){ const s = b.sky; out.push(flow({ rank: 'box', frame: 'kakomi', h: `暦と天文（${s.place || '東京'}）`, indent: false, fig: s.moonAge != null ? { type: 'moon', age: +s.moonAge, n: 1, w: 70 } : null, paras: [['日の出', s.sunrise], ['日の入り', s.sunset], ['月の出', s.moonrise], ['月の入り', s.moonset], ['月齢', s.moonAge != null ? String(s.moonAge) : null], ['暦', s.koyomi]].filter(x => x[1]).map(x => `◆${x[0]}　${x[1]}`).concat(s.note ? [s.note] : []), src: arr(s.src), block: b })); }
  if (b.days) out.push(flow({ rank: 'box', frame: 'tatami', h: 'きょうの記念日', indent: false, paras: [arr(b.days).join('、')], block: b }));
  if (b.column) out.push(flow({ rank: 'box', frame: 'col', h: b.column.name || '歴史のこだま', indent: false, paras: [arr(b.column.body).join('▼')], solo: true, block: b }));
  if (b.src && out.length){ const last = out[out.length - 1]; last.src = (last.src || []).concat(arr(b.src)); last.srcNote = '要約・編集あり'; }
  return out;
}

export function adRowsFor(idx, pg){
  if (pg.adRows != null) return pg.adRows;
  if (pg.tab === 'きょうの歴史') return 0;
  if (idx === 0) return 4;
  return [4, 0, 3, 4, 2, 0, 4, 3][idx % 8];
}

function areaOf(it){
  if (it.kind === 'flow'){ const k0 = Math.max(it.minK, Math.min(6, Math.ceil(it.lines.length / 60) + it.head.hn)); return widthFor(it, k0) * k0 * S.P; }
  if (it.kind === 'fixed'){ const w = it.maxW || 260; return w * (w * it.aspect + it.base + S.gap); }
  if (it.kind === 'yoko'){ return (it.maxW || 600) * 2 * S.P; }
  return 0;
}
// Split items into pages of roughly even fill, then lay each out (moving overflow forward).
function paginate(items, W, R, seed, x1){
  const cap = W * R * S.P * .9; const total = items.reduce((a, it) => a + areaOf(it), 0);
  const nPages = Math.max(1, Math.ceil(total / cap)); const per = total / nPages;
  const groups = []; let cur = [], acc = 0;
  items.forEach((it) => { if (cur.length && acc + areaOf(it) / 2 > per * (groups.length + 1) && groups.length < nPages - 1){ groups.push(cur); cur = []; } cur.push(it); acc += areaOf(it); });
  groups.push(cur);
  const out = []; let carry = [];
  groups.forEach((g, gi) => { const res = paginateGreedy(carry.concat(g), W, R, seed + gi * 17, x1, gi === groups.length - 1); out.push(...res.pages); carry = res.rest; });
  if (carry.length) out.push(...paginateGreedy(carry, W, R, seed + 991, x1, true).pages);
  return out;
}
function paginateGreedy(items, W, R, seed, x1, final){
  const pages = []; let rest = items.slice(); let guard = 0;
  while (rest.length && guard++ < 12){
    if (!final && pages.length) break;
    let take = rest.length, best = null;
    while (take >= 1){
      const sub = rest.slice(0, take);
      best = layoutRegion(sub, W, R, seed + take * 131 + pages.length * 7, { x1, tries: take > 6 ? 700 : 900 });
      if (best && best.pen < 40) break;
      take--;
    }
    if (!best){ // a single item that cannot fit: give up on it (reported by tools/check)
      pages.push({ placed: [], dropped: [rest[0]] }); rest = rest.slice(1); continue;
    }
    pages.push(best); rest = rest.slice(take);
  }
  return { pages, rest };
}

// Build the whole edition. Returns {info, pages:[{tab,title,cont,no,adRows,R,placed,ads,mast}]}
export function buildEdition(ed){
  uid = 0;
  const info = dateInfo(ed); const out = [];
  (ed.pages || []).forEach((pg, pi) => {
    const { items, ads } = itemsFor(pg, pi, ed);
    let adRows = adRowsFor(out.length, pg);
    const isFront = pi === 0;
    const W = isFront ? S.CW - MAST_W - 12 : S.CW;
    let R = S.rows - adRows;
    const seed = info.key * 97 + pi * 1009;
    // Ads are the elastic part of a real page: try the planned band and its neighbours, keep the best fit.
    const plan = adRows; const opts = pg.adRows != null ? [plan] : [...new Set([plan, 4, 3, 2, 0])].filter(a => !(pg.tab === 'きょうの歴史' && a));
    let best = null;
    for (const a of opts){
      const r = S.rows - a; const pages = !items.length ? [{ placed: [], pen: 0 }] : isFront ? paginateGreedy(items, W, r, seed, W, true).pages : paginate(items, W, r, seed, W);
      const score = pages.length * 30 + pages.reduce((s, p) => s + (p.pen || 0), 0) + (a === plan ? 0 : 1.5) + (isFront && a < 3 ? 3 : 0);
      if (!best || score < best.score) best = { score, pages, a, r };
    }
    adRows = best.a; R = best.r; const pages = best.pages;
    pages.forEach((p, k) => {
      out.push({ tab: pg.tab, title: pg.title || pg.tab, cont: k > 0, adRows, R, placed: p.placed, pen: p.pen, dropped: p.dropped || [], front: isFront && k === 0, ads: k === 0 ? ads : null, srcPage: pi });
    });
  });
  out.forEach((p, i) => { p.no = i + 1; });
  return { info, pages: out };
}
