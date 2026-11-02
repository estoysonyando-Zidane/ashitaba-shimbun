// node tools/check.mjs editions/YYYY-MM-DD.json  — validates an edition and its layout. Exit 1 on NG.
import fs from 'fs';
import { buildEdition } from '../assets/paper.js';

const file = process.argv[2]; if (!file){ console.error('usage: node tools/check.mjs editions/DATE.json'); process.exit(2); }
const ed = JSON.parse(fs.readFileSync(file, 'utf8'));
const TABS = ['総合', 'スポーツ', 'テック', 'カルチャー', '仕事・農', '世界', 'きょうの歴史', 'くらし'];
const DARK = /死亡|死去|事故|事件|逮捕|容疑|殺|戦争|侵攻|攻撃|爆発|被害|災害|訴訟|解雇|倒産|不祥事|炎上|自殺|虐待|遺体|行方不明/;
const ng = [], warn = [];
if (!/^\d{4}-\d{2}-\d{2}$/.test(ed.iso || '')) ng.push('iso が YYYY-MM-DD でない');
if (typeof ed.no !== 'number') ng.push('no が数値でない');
if ((ed.pages || []).length !== 8) ng.push('面数 ' + (ed.pages || []).length + '（8面）');
const heads = new Map(); let total = 0, n = 0, srcN = 0;
(ed.pages || []).forEach((p, i) => {
  if (p.tab !== TABS[i]) ng.push(`${i + 1}面の tab「${p.tab}」→「${TABS[i]}」`);
  let c = 0, k = 0;
  (p.blocks || []).forEach((b) => {
    if (b.type === 'article'){
      const t = [b.h, b.sub, b.lede, ...(b.body || [])].join(''); c += t.length; k++;
      const s = b.src || []; srcN += s.length;
      if (!s.length || !s.every(x => /^https:\/\//.test(x.u || ''))) ng.push(`出典なし/不正: ${b.h}`);
      if (!['top', 'sub', 'mid', 'beta'].includes(b.rank)) ng.push(`rank 不正: ${b.h}`);
      if (heads.has(b.h)) ng.push('見出し重複: ' + b.h); heads.set(b.h, 1);
      if (i !== 6 && DARK.test(t)) warn.push(`暗い語を含む（文脈を確認）: ${b.h}`);
      if (b.fig && b.fig.type === 'photo' && !/^https:\/\/upload\.wikimedia\.org\//.test(b.fig.url || '')) ng.push(`写真URLはWikimedia Commonsのみ: ${b.h}`);
    }
    if (b.type === 'briefs') (b.items || []).forEach(x => { c += (x.h + x.body).length; k++; srcN += (x.src || []).length; if (!(x.src || []).length) ng.push(`短信に出典なし: ${x.h}`); });
    if (b.type === 'column') c += (b.body || []).join('').length;
  });
  if (i < 6){
    if (k < 8) ng.push(`${i + 1}面 本数 ${k}（8本以上）`);
    if (c < 5000) ng.push(`${i + 1}面 字数 ${c}（5,000字以上）`);
    if ((p.blocks || [])[0] && p.blocks[0].rank !== 'top') ng.push(`${i + 1}面 先頭が rank:top でない`);
  }
  total += c; n += k; console.log(`${String(i + 1).padStart(2)}面 ${p.tab}\t${k}本\t${c}字`);
});
console.log(`合計 ${n}本 ${total}字 出典${srcN}`);
if (total < 30000) ng.push(`合計字数 ${total}（30,000字以上）`);

// ---- layout check: same engine as the viewer
const out = buildEdition(ed);
out.pages.forEach(pg => {
  const C = pg.grid ? pg.grid[0].length : 1; const area = C * pg.R; let fill = 0, tiny = 0, naki = 0;
  (pg.pockets || []).forEach(pk => { const a = (pk.r1 - pk.r0) * (pk.c1 - pk.c0); if (pk.c1 - pk.c0 < 5) tiny += a; else fill += a; });
  pg.placed.forEach(pl => { naki += pl.naki || 0; });
  if (pg.dropped && pg.dropped.length) ng.push(`${pg.no}面: 入りきらない記事 ${pg.dropped.map(d => d.h || d.type).join('、')}`);
  const fr = fill / area;
  if (fr > .15) warn.push(`${pg.no}面 ${pg.tab}: 余白の突き出し広告が ${Math.round(fr * 100)}%（記事か短信を足す）`);
  console.log(`紙面 ${String(pg.no).padStart(2)} ${pg.tab}${pg.cont ? '（続）' : ''}\t記事${pg.placed.length} ハコ${(pg.pinned || []).length} 広告${pg.adRows}段 穴埋め${Math.round(fr * 100)}% 端切れ${tiny}行 泣き別れ${naki} 評価${(pg.pen || 0).toFixed(1)}`);
});
console.log(`紙面数 ${out.pages.length}`);
if (warn.length) console.log('\n要確認:\n- ' + warn.join('\n- '));
if (ng.length){ console.log('\nNG:\n- ' + ng.join('\n- ')); process.exit(1); }
console.log('\nOK');
