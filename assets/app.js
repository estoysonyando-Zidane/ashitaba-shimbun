// 明日葉新聞 — viewer: loads an edition, lays it out, shows sheets with zoom, page turning,
// an article reader, a text list view and the back-number shelf.
import { S } from './layout.js';
import { buildEdition, PAPER } from './paper.js';
import { drawPage } from './render.js';
import { el } from './parts.js';

const $ = (s) => document.querySelector(s);
const state = { ed: null, built: null, cur: 0, zoom: 'width', z: 1, sheets: [], list: [], date: null, vertical: false };
const store = { get(k, d){ try { const v = localStorage.getItem('ashitaba-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }, set(k, v){ try { localStorage.setItem('ashitaba-' + k, JSON.stringify(v)); } catch(e){} } };

async function getJSON(u){ const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }

async function boot(){
  state.vertical = store.get('vertical', false);
  try { state.list = await getJSON('editions/index.json'); } catch(e){ state.list = []; }
  const q = new URLSearchParams(location.search).get('d');
  const date = q && state.list.some(x => x.date === q) ? q : (state.list[0] && state.list[0].date);
  if (!date){ $('#stage').innerHTML = '<p class="msg">まだ号がありません。</p>'; return; }
  await open(date);
  window.addEventListener('resize', () => { clearTimeout(boot._t); boot._t = setTimeout(fit, 120); });
}

async function open(date){
  $('#stage').innerHTML = '<p class="msg">組版中…</p>';
  state.date = date; state.ed = await getJSON(`editions/${date}.json`);
  await (document.fonts && document.fonts.ready);
  state.built = buildEdition(state.ed);
  const pages = state.built.pages;
  // index list for the front page: first headline of each later page
  const ix = []; pages.forEach((p, i) => { if (i === 0 || p.cont) return; const a = p.placed.find(x => x.it.kind === 'flow' && x.it.h && x.it.rank !== 'box'); ix.push({ no: p.no, h: `${p.title}　${a ? a.it.h.replace(/／/g, '') : ''}` }); });
  pages.forEach((p, i) => { p.info = state.built.info; p.idx = i; if (p.front) p.indexList = ix; });
  state.sheets = pages.map(() => null);
  document.title = `${PAPER.name}　${state.built.info.short}`;
  drawChrome();
  const h = /^#p(\d+)$/.exec(location.hash); go(h ? +h[1] - 1 : 0, true);
}

function drawChrome(){
  const inf = state.built.info;
  $('#dt').textContent = `${inf.short}　${typeof state.ed.no === 'number' ? '第' + state.ed.no + '号' : ''}`;
  const tabs = $('#tabs'); tabs.replaceChildren();
  state.built.pages.forEach((p, i) => { const b = el('button', null, `${p.no}面 ${p.tab}${p.cont ? '②' : ''}`); b.type = 'button'; b.addEventListener('click', () => go(i)); tabs.append(b); });
  const sel = $('#back'); sel.replaceChildren();
  state.list.forEach(x => { const o = el('option', null, `${x.date}　第${x.no}号`); o.value = x.date; if (x.date === state.date) o.selected = true; sel.append(o); });
}

function sheetFor(i){
  if (!state.sheets[i]) state.sheets[i] = drawPage(state.built.pages[i], state.ed, { onOpen: (it) => reader(it), onIndex: (n) => go(n) });
  return state.sheets[i];
}
function go(i, fromHash){
  const n = state.built.pages.length; i = Math.max(0, Math.min(n - 1, i));
  const dir = i > state.cur ? 1 : -1; state.cur = i;
  const stage = $('#stage'); const wrap = el('div', 'wrap');
  wrap.append(sheetFor(i));
  stage.replaceChildren(wrap); stage.scrollTop = 0; stage.scrollLeft = 0;
  wrap.animate([{ transform: `translateX(${dir * -40}px)`, opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
  fit();
  Array.from($('#tabs').children).forEach((b, k) => { b.setAttribute('aria-current', String(k === i)); if (k === i) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  $('#prev').disabled = i === 0; $('#next').disabled = i === n - 1; $('#pos').textContent = `${i + 1} / ${n}`;
  if (!fromHash){ try { history.replaceState(null, '', `${location.search || ''}#p${i + 1}`); } catch(e){} }
}
function fit(){
  const stage = $('#stage'); const wrap = stage.querySelector('.wrap'); if (!wrap) return;
  const sheet = wrap.firstChild; const sw = stage.clientWidth - 24, sh = stage.clientHeight - 24;
  let z = state.zoom === 'page' ? Math.min(sw / S.W, sh / S.H) : state.zoom === 'width' ? sw / S.W : state.z;
  z = Math.max(.12, Math.min(2.2, z)); state.z = z;
  sheet.style.transform = `scale(${z})`; wrap.style.width = (S.W * z) + 'px'; wrap.style.height = (S.H * z) + 'px';
  $('#zl').textContent = Math.round(z * 100) + '%';
}
function zoomBy(f){ state.zoom = 'free'; state.z = state.z * f; fit(); }

/* ---------------- reader ---------------- */
function allArticles(){ const out = []; state.built.pages.forEach((p, pi) => p.placed.forEach(pl => { if (pl.it.kind === 'flow') out.push({ it: pl.it, page: p }); })); return out; }
function reader(it){
  const list = allArticles(); let idx = list.findIndex(x => x.it === it); if (idx < 0) idx = 0;
  const dlg = $('#reader');
  const show = () => {
    const { it, page } = list[idx]; const body = $('#rbody'); body.replaceChildren(); body.classList.toggle('tate', state.vertical);
    body.append(el('div', 'rmeta', `${page.no}面　${page.title}${it.kicker ? '　｜　' + it.kicker : ''}${it.label ? '　【' + it.label + '】' : ''}`));
    if (it.h) body.append(el('h2', null, it.h.replace(/／/g, '')));
    if (it.sub) body.append(el('p', 'rsub', it.sub));
    if (it.lede) body.append(el('p', 'rlede', it.lede));
    (it.paras || []).forEach(p => body.append(el('p', null, p)));
    const src = (it.src || []).filter(s => s && s.u);
    if (src.length){ const s = el('div', 'rsrc'); s.append(el('b', null, '出典')); src.forEach(x => { const a = el('a', null, x.t + (x.d ? `（${x.d}）` : '')); a.href = x.u; a.target = '_blank'; a.rel = 'noopener noreferrer'; s.append(a); }); if (it.srcNote) s.append(el('small', null, it.srcNote)); body.append(s); }
    $('#rpos').textContent = `${idx + 1} / ${list.length}`; body.scrollTop = 0; body.scrollLeft = 0;
  };
  $('#rprev').onclick = () => { idx = Math.max(0, idx - 1); show(); };
  $('#rnext').onclick = () => { idx = Math.min(list.length - 1, idx + 1); show(); };
  $('#rtate').onclick = () => { state.vertical = !state.vertical; store.set('vertical', state.vertical); show(); };
  show(); if (!dlg.open) dlg.showModal();
}

/* ---------------- text list (記事一覧) ---------------- */
function listView(){
  const dlg = $('#listv'); const b = $('#lbody'); b.replaceChildren();
  state.built.pages.forEach((p) => {
    const arts = p.placed.filter(pl => pl.it.kind === 'flow' && pl.it.h); if (!arts.length) return;
    b.append(el('h3', null, `${p.no}面　${p.title}${p.cont ? '（続き）' : ''}`));
    arts.forEach(pl => { const a = el('button', 'li'); a.type = 'button'; a.append(el('b', null, pl.it.h.replace(/／/g, '')), el('span', null, (pl.it.lede || (pl.it.paras || [])[0] || '').slice(0, 60) + '…')); a.addEventListener('click', () => { dlg.close(); reader(pl.it); }); b.append(a); });
  });
  dlg.showModal();
}

/* ---------------- print: every page as its own sheet ---------------- */
window.addEventListener('beforeprint', () => {
  const pr = $('#print'); pr.replaceChildren();
  state.built.pages.forEach((p, i) => { const s = drawPage(p, state.ed, {}); const box = el('div', 'psheet'); box.append(s); pr.append(box); });
});

/* ---------------- wiring ---------------- */
$('#prev').addEventListener('click', () => go(state.cur - 1));
$('#next').addEventListener('click', () => go(state.cur + 1));
$('#zw').addEventListener('click', () => { state.zoom = 'width'; fit(); });
$('#zp').addEventListener('click', () => { state.zoom = 'page'; fit(); });
$('#zi').addEventListener('click', () => zoomBy(1.2));
$('#zo').addEventListener('click', () => zoomBy(1 / 1.2));
$('#lst').addEventListener('click', listView);
$('#back').addEventListener('change', (e) => { const d = e.target.value; history.replaceState(null, '', `?d=${d}`); open(d); });
document.querySelectorAll('dialog .close').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|SELECT/.test(e.target.tagName)) return;
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'ArrowLeft') go(state.cur + 1);      // right-bound: the next page lies to the left
  if (e.key === 'ArrowRight') go(state.cur - 1);
  if (e.key === '+' || e.key === '=') zoomBy(1.2);
  if (e.key === '-') zoomBy(1 / 1.2);
});
let sx = null, sy = null;
$('#stage').addEventListener('touchstart', (e) => { if (e.touches.length !== 1) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
$('#stage').addEventListener('touchend', (e) => { if (sx == null) return; const st = $('#stage'); const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
  const atEdge = st.scrollWidth <= st.clientWidth + 2; if (atEdge && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(state.cur + (dx > 0 ? 1 : -1)); }, { passive: true });
window.addEventListener('hashchange', () => { const h = /^#p(\d+)$/.exec(location.hash); if (h) go(+h[1] - 1, true); });
boot().catch(err => { $('#stage').innerHTML = `<p class="msg">読み込めませんでした（${String(err.message || err)}）</p>`; });
