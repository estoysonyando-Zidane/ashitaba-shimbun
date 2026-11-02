// node tools/add-edition.mjs editions/YYYY-MM-DD.json — registers the edition in editions/index.json (newest first).
import fs from 'fs';
const file = process.argv[2]; const ed = JSON.parse(fs.readFileSync(file, 'utf8'));
const idxPath = new URL('../editions/index.json', import.meta.url);
let list = []; try { list = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch(e){}
const top = ((ed.pages || [])[0] || {}).blocks?.find(b => b.h)?.h || '';
list = list.filter(x => x.date !== ed.iso); list.push({ date: ed.iso, no: ed.no, top });
list.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(idxPath, JSON.stringify(list, null, 1) + '\n');
console.log(`index.json: ${list.length} 号（最新 ${list[0].date} 第${list[0].no}号）`);
