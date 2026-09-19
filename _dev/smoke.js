/* LATTICE 交付前冒烟测试：逐视图渲染 + 交互路径 + 全流水线串联 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.argv[2] || '.';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

const errors = [];
window.addEventListener('error', e => errors.push('window.error: ' + e.message));

const files = ['data.js', 'charts.js', 'app.js', 'view-lit.js', 'view-plan.js', 'view-exp.js', 'view-paper.js'];
for (const f of files) {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); }
  catch (e) { errors.push('eval ' + f + ': ' + e.message); }
}
try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8')); }
catch (e) { errors.push('boot: ' + e.message); }

const MR = window.MR;
if (!MR) { console.log('FATAL: MR 未挂载'); process.exit(1); }

function step(name, fn) {
  try { fn(); } catch (e) { errors.push(name + ' → ' + e.message); }
}

/* 1. 数据结构完整性 */
step('data-integrity', () => {
  const d = MR.data;
  const chk = (c, m) => { if (!c) errors.push('DATA: ' + m); };
  chk(d.stages.length === 6, 'stages 应 6 条');
  chk(d.papers.length === 14, 'papers 应 14 条, 实际 ' + d.papers.length);
  chk(d.matrix.length === 7 && d.matrix[0].length === 4, 'matrix 应 7×4');
  chk(d.samples.length === 9, 'samples 应 9 条');
  chk(d.references.length === 12, 'references 应 12 条');
  chk(d.citations.length === 12, 'citations 应 12 条');
  ['ice', 'cap', 'ret'].forEach(k => {
    const t = d.trends[k];
    chk(!!t, 'trends.' + k);
    if (t) t.series.forEach(s => chk(s.vals.length === 3, 'trends.' + k + ' 序列长度'));
  });
  d.cycling.series.forEach(s => chk(s.vals.length === d.cycling.x.length, 'cycling 长度'));
  d.rate.series.forEach(s => chk(s.vals.length === d.rate.x.length, 'rate 长度'));
  d.radar.series.forEach(s => chk(s.vals.length === d.radar.axes.length, 'radar 长度'));
  // 矩阵文献数与 papers 一致性
  let cnt = 0;
  d.matrix.forEach(row => row.forEach(c => { if (c.n) { cnt += c.n; c.refs.forEach(r => chk(!!d.papers.find(p => p.id === r), '矩阵引用 ' + r)); } }));
  chk(cnt === 12, '矩阵内文献数应 12, 实际 ' + cnt);
  // 引用绑定指向存在的文献
  d.citations.forEach(c => chk(!!d.papers.find(p => p.id === c.ref), 'citation[' + c.n + '] → ' + c.ref));
  d.references.forEach(r => chk(!!d.papers.find(p => p.id === r.ref), 'reference[' + r.n + '] → ' + r.ref));
  (d.traces ? Object.keys(d.traces) : []).forEach(k => chk(d.traces[k].length > 0, 'traces.' + k));
  chk(Object.keys(d.traces).length === 6, 'traces 应覆盖 6 环节');
  chk(d.traces.peer.length > 0, 'traces.peer');
});

/* 2. 逐视图渲染 */
const views = ['overview', 'lit', 'plan', 'review1', 'exp', 'paper', 'peer'];
views.forEach(v => step('render:' + v, () => {
  MR.app.setView(v);
  const m = doc.getElementById('main');
  if (!m || m.innerHTML.length < 500) errors.push('render:' + v + ' 输出过短 (' + (m ? m.innerHTML.length : 0) + ')');
}));

/* 3. 交互状态组合 */
step('exp-tabs', () => {
  MR.app.setView('exp');
  ['setup', 'run', 'analysis'].forEach(t => { MR.state.expTab = t; MR.app.render(); });
  MR.state.expTab = 'setup';
});
step('metrics', () => {
  MR.state.expTab = 'analysis'; MR.app.setView('exp');
  ['ice', 'cap', 'ret'].forEach(k => { MR.state.metric = k; MR.app.render(); });
});
step('lit-selection', () => {
  MR.app.setView('lit');
  MR.state.cellSel = { r: 3, c: 2 }; MR.app.render();
  MR.state.cellSel = { r: 6, c: 0 }; MR.app.render();
  MR.state.cellSel = null;
  ['G1', 'G2', 'G3', 'G4'].forEach(g => { MR.state.gapSel = g; MR.app.render(); });
  ['D1', 'D2', 'D3'].forEach(x => { MR.state.direction = x; MR.app.render(); });
  MR.state.direction = 'D1'; MR.state.gapSel = 'G1';
});
step('paper-cites', () => {
  MR.app.setView('paper');
  MR.data.citations.forEach(c => { MR.state.citeSel = String(c.n); MR.app.render(); });
  MR.state.citeSel = null; MR.app.render();
});
step('tweaks-accents', () => {
  const app = doc.getElementById('app');
  ['teal', 'indigo', 'iron', 'moss'].forEach(a => { app.setAttribute('data-acc', a); MR.app.render(); });
  app.setAttribute('data-acc', 'teal');
  ['compact', 'cozy'].forEach(d => { app.setAttribute('data-density', d); MR.app.render(); });
  app.setAttribute('data-density', 'cozy');
  doc.querySelectorAll('#segGap button').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  doc.querySelectorAll('#segGrid button').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  app.setAttribute('data-grid', 'on');
  MR.state.gapMode = 'vacant';
});
step('modals', () => {
  MR.app.openPanel('refs'); MR.modal.close();
  MR.app.openPanel('ai'); MR.modal.close();
  MR.app.openPanel('safety'); MR.modal.close();
  MR.modal.open('t', 'b'); MR.modal.close();
});

/* 4. 事件路径：真实点击各视图主按钮 */
step('click-paths', () => {
  const click = sel => {
    const el = doc.querySelector(sel);
    if (!el) { errors.push('CLICK: 未找到 ' + sel); return false; }
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    return true;
  };
  MR.state.stage = { lit: 'idle', plan: 'idle', review1: 'idle', exp: 'idle', paper: 'idle', peer: 'idle' };
  MR.app.setView('overview');
  click('.pipeline .pipe:nth-child(2)');
  ['lit', 'plan', 'review1', 'exp', 'paper', 'peer'].forEach(v => {
    MR.app.setView(v);
    const btn = doc.querySelector('[data-act^="run"], [data-act^="to"], [data-act^="gen"], [data-act="lock"]');
    if (btn) btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  MR.app.setView('exp');
  const tabs = doc.querySelectorAll('[data-tab]');
  tabs.forEach(t => t.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  MR.app.setView('exp');
  const eq = doc.querySelector('[data-eq]');
  if (eq) eq.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const tr = doc.getElementById('traceBtn'); if (tr) tr.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const ct = doc.getElementById('consoleToggle'); if (ct) ct.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const pb = doc.getElementById('projBtn'); if (pb) pb.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const pi = doc.querySelector('#projPop .pop__item[data-proj="1"]');
  if (pi) pi.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  MR.modal.close();
  ['A1', 'A2', 'A3'].forEach(() => {});
});

/* 5. 图表渲染产出检查 */
step('charts', () => {
  MR.state.expTab = 'analysis'; MR.app.setView('exp');
  ['trendChart', 'cycChart', 'rateChart', 'donut1', 'donut2', 'radarChart', 'xrdChart'].forEach(id => {
    const el = doc.getElementById(id);
    if (!el || el.innerHTML.indexOf('<svg') < 0) errors.push('CHART: #' + id + ' 未渲染');
  });
  MR.state.expTab = 'setup'; MR.app.setView('exp');
  const fc = doc.getElementById('flowChart');
  if (!fc || fc.innerHTML.indexOf('<svg') < 0) errors.push('CHART: #flowChart 未渲染');
  MR.state.expTab = 'run'; MR.app.setView('exp');
  const rc = doc.getElementById('reproChart');
  if (!rc || rc.innerHTML.indexOf('<svg') < 0) errors.push('CHART: #reproChart 未渲染');
  MR.app.setView('plan');
  const pc = doc.getElementById('profileChart');
  if (!pc || pc.innerHTML.indexOf('<svg') < 0) errors.push('CHART: #profileChart 未渲染');
});

/* 6. 全流水线串联（异步） */
(async () => {
  await new Promise(r => setTimeout(r, 3200));
  MR.app.busy = false; MR.app.pipeline = false;
  MR.state.expRunning = false; MR.state.expTab = 'setup';
  MR.app.runAll();
  await new Promise(r => setTimeout(r, 20000));
  const done = Object.keys(MR.state.stage).filter(k => MR.state.stage[k] === 'done');
  if (done.length !== 6) errors.push('RUNALL: 仅完成 ' + done.length + '/6 环节 → ' + JSON.stringify(MR.state.stage));
  if (MR.state.credits <= 312) errors.push('RUNALL: 算力未累加');
  const logCount = doc.getElementById('consoleBody').children.length;
  if (logCount < 20) errors.push('RUNALL: 日志过少 (' + logCount + ')');

  setTimeout(() => {
    console.log('=== LATTICE 冒烟测试 ===');
    console.log('视图数: ' + views.length + ' | 图表: 9 | 流水线: ' + done.length + '/6 | 日志行: ' + logCount);
    console.log('算力消耗: ' + MR.state.credits + ' / ' + MR.state.credMax);
    if (errors.length === 0) { console.log('\n✅ 全部检查通过（0 错误）'); }
    else { console.log('\n❌ 发现 ' + errors.length + ' 个问题：'); errors.forEach(e => console.log('  · ' + e)); }
    process.exit(errors.length ? 1 : 0);
  }, 300);
})();
