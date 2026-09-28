import fs from 'fs';
const src = fs.readFileSync('assets/scripts/data/HeroConf.ts', 'utf8');

const heroes = [...src.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?\n  \}/g)].map(m => m[0]).map(b => {
  const g = (k) => {
    const r = new RegExp(k + ":\\s*(?:'([^']*)'|(\\d+))").exec(b);
    return r ? (r[1] !== undefined ? r[1] : Number(r[2])) : undefined;
  };
  return { id: g('id'), name: g('name'), camp: g('camp'), role: g('role'), quality: g('quality'),
           visualIdx: g('visualIdx'), gender: g('gender'), featureTag: g('featureTag') };
}).filter(h => h.id && h.visualIdx !== undefined);

const GA_EXACT = 137.50776405, GA_ROUND = 137.5;
const mk = (ga) => Array.from({ length: 24 }, (_, i) => (i * ga) % 360);
const H_EXACT = mk(GA_EXACT), H_ROUND = mk(GA_ROUND);
const myTable = [20,157,295,72,210,347,125,262,40,177,315,92,230,7,145,282,60,197,335,112,250,27,165,302];
const d = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

console.log('=== 1. 黄金角精度漂移 ===');
console.log('137.5 vs 精确   最大偏差:',
  Math.max.apply(null, H_EXACT.map((h, i) => d(h, H_ROUND[i]))).toFixed(4), '(deg)');
console.log('我文档原表 vs 精确 最大偏差:',
  Math.max.apply(null, myTable.map((h, i) => d(h, H_EXACT[i]))).toFixed(4), '(deg)');
console.log('精确 HUES[24] = ' + H_EXACT.map(h => +h.toFixed(3)).join(','));

console.log('\n=== 2. 同阵营色相间隔（真实 HeroConf 数据） ===');
const CAMPNAME = { 1: 'Wei', 2: 'Shu', 3: 'Wu', 4: 'Qun' };
const byCamp = {};
heroes.forEach(h => { (byCamp[h.camp] = byCamp[h.camp] || []).push(h); });
let globalWorst = 360, gw = '';
Object.entries(byCamp).forEach(([c, list]) => {
  let worst = 360, pair = '';
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const dd = d(H_EXACT[list[i].visualIdx], H_EXACT[list[j].visualIdx]);
    if (dd < worst) { worst = dd; pair = list[i].name + '(idx' + list[i].visualIdx + ') vs ' + list[j].name + '(idx' + list[j].visualIdx + ')'; }
  }
  console.log(CAMPNAME[c] + ' (' + list.length + ') 最小 ' + worst.toFixed(2) + ' deg  <- ' + pair);
  if (worst < globalWorst) { globalWorst = worst; gw = CAMPNAME[c] + ' ' + pair; }
});
console.log('全局最差 ' + globalWorst.toFixed(2) + ' deg  (' + gw + ')   要求>=30 : ' + (globalWorst >= 30 ? 'PASS' : 'FAIL'));

console.log('\n=== 3. 禁边 {8,13,21} 校验 ===');
const FORBID = [8, 13, 21];
let bad = 0;
Object.entries(byCamp).forEach(([c, list]) => {
  const idxs = list.map(h => h.visualIdx);
  for (let i = 0; i < idxs.length; i++) for (let j = i + 1; j < idxs.length; j++) {
    const diff = Math.abs(idxs[i] - idxs[j]);
    if (FORBID.indexOf(diff) >= 0) { console.log('FAIL 同阵营 ' + CAMPNAME[c] + ': idx ' + idxs[i] + '/' + idxs[j] + ' 差=' + diff); bad++; }
  }
});
console.log(bad === 0 ? 'PASS 同阵营内无 {8,13,21} 差值' : 'FAIL ' + bad + ' 处');
console.log('反证 idx差∈{8,13,21} 色相距: ' + FORBID.map(k => 'd' + k + '->' + d(H_EXACT[0], H_EXACT[k]).toFixed(2)).join('  '));

console.log('\n=== 4. 字段交付核验 ===');
console.log('武将数=' + heroes.length + '  visualIdx唯一=' + new Set(heroes.map(h => h.visualIdx)).size +
            '  范围=' + Math.min.apply(null, heroes.map(h => h.visualIdx)) + '-' + Math.max.apply(null, heroes.map(h => h.visualIdx)));
const cnt = (k) => JSON.stringify(heroes.reduce((a, h) => { a[h[k]] = (a[h[k]] || 0) + 1; return a; }, {}));
console.log('gender: ' + cnt('gender'));
console.log('featureTag: ' + cnt('featureTag') + '  -> ' + heroes.filter(h => h.featureTag !== 'none').map(h => h.name).join(','));
console.log('camp x gender: ' + JSON.stringify(heroes.filter(h => h.gender === 'female').map(h => h.name)));
