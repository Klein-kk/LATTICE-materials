/* LATTICE 十环节版 · 交付前冒烟测试 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.argv[2] || '.';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

const errors = [];
let viewList = [];
window.addEventListener('error', e => errors.push('window.error: ' + e.message));
/* jsdom 缺 Blob URL 支持，打桩以便测试导出路径 */
if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:stub';
if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};

const files = ['library.js', 'case.js', 'data.js', 'charts.js', 'figures.js', 'app.js', 'views-a.js', 'views-b.js', 'views-c.js'];
for (const f of files) {
  const p = path.join(ROOT, 'assets/js', f);
  if (!fs.existsSync(p)) { errors.push('缺少文件 ' + f); continue; }
  try { window.eval(fs.readFileSync(p, 'utf8')); }
  catch (e) { errors.push('eval ' + f + ': ' + e.message); }
}
const MR = window.MR;
if (!MR) { console.log('FATAL: MR 未挂载'); process.exit(1); }
function step(name, fn) { try { fn(); } catch (e) { errors.push(name + ' → ' + e.message); } }

function allChecks() {

/* 1. 数据完整性 */
step('data', () => {
  const c = (cond, m) => { if (!cond) errors.push('DATA: ' + m); };
  c(MR.cases.length === 3, '应有 3 个验证案例, 实际 ' + MR.cases.length);
  MR.cases.forEach(x => {
    c(x.method.steps.length >= 5, x.id + ' 方法步骤过少');
    c(x.principle.reactions.length >= 2, x.id + ' 缺少反应式');
    c(x.reagents.length >= 3, x.id + ' 试剂过少');
    c(/^\d+\.\d+/.test(x.doi), x.id + ' DOI 缺失');
  });
  c(MR.coreRefs.length === 7, '核验引用应 7 条, 实际 ' + MR.coreRefs.length);
  c(MR.coreRefs.every(r => r.verified && r.doi), '引用须全部已核验且带 DOI');
  c(MR.lib.rows.length >= 100, '本地文献库应 ≥100 条, 实际 ' + MR.lib.rows.length);
  c(MR.reagents.length === 12, '试剂应 12 种');
  c(MR.processRisks.length === 9, '工序风险应 9 项');
  c(MR.forcedPPE.length === 5, '强制防护应 5 项');
  c(MR.protocol.steps.length === 9, '工序应 9 步');
  c(MR.reviewers.length === 3, '评审专家应 3 位');
  c(MR.manuscript.sections.length === 5, '论文应 5 章');
  MR.manuscript.sections.forEach(s => {
    c((s.zh || []).length > 0, s.k + ' 缺中文');
    c((s.en || []).length > 0, s.k + ' 缺英文');
  });
  c(Object.keys(MR.traces).length === 10, '推理轨迹应覆盖 10 环节, 实际 ' + Object.keys(MR.traces).length);
  c(MR.STAGES.length === 10, 'STAGES 应 10 个');
});

/* 2. 预测模型数值合理性 */
step('model', () => {
  const m = MR.model, p = m.base;
  const g = m.graft(p), ts = m.strength(p), ab = m.antiPlanktonic(p), bf = m.antiBiofilm(p);
  const c = (cond, msg) => { if (!cond) errors.push('MODEL: ' + msg); };
  c(g > 2 && g < 30, '接枝率越界 ' + g.toFixed(2));
  c(ts > 50 && ts <= 100, '强力保留率越界 ' + ts.toFixed(2));
  c(ab > 0 && ab <= 100, '抑菌率越界');
  c(bf < ab, '抗生物膜率应低于抑菌率');
  c(m.carboxyl(p) > 0.1 && m.carboxyl(p) < 1.2, '羧基含量越界');
  /* 单调性：氧化剂用量增大 → 接枝率上升、强力下降 */
  const hi = Object.assign({}, p, { ox: 0.95 });
  c(m.graft(hi) > g, '接枝率未随氧化剂用量单调上升');
  c(m.strength(hi) < ts, '强力未随氧化剂用量下降');
  c(m.chelate === undefined, 'chelate 不应为函数');
  c(m.successRate(p) >= 50 && m.successRate(p) <= 100, '成功率越界');
  const sw = m.sweep('ox', 0.05, 1.2, 12, [{ name: 'a', fn: m.graft }]);
  c(sw.xs.length === 12 && sw.series[0].vals.length === 12, 'sweep 输出长度错误');
  const z = m.surface('ox', [0.05, 1.2], 'tc', [2, 30], 9, m.antiBiofilm);
  c(z.length === 9 && z[0].length === 9, 'surface 网格错误');
});

/* 3. 逐视图渲染 */
viewList = ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'];
const views = viewList;
views.forEach(v => step('render:' + v, () => {
  MR.app.setView(v);
  const m = doc.getElementById('main');
  if (!m || m.innerHTML.length < 800) errors.push('render:' + v + ' 输出过短 (' + (m ? m.innerHTML.length : 0) + ')');
}));

/* 4. 图形与图表产出 */
step('charts', () => {
  MR.app.setView('figure');
  ['fig1', 'fig2', 'fig3', 'ftirChart', 'xpsChart'].forEach(id => {
    const el = doc.getElementById(id);
    if (!el || el.innerHTML.indexOf('<svg') < 0 || el.innerHTML.length < 600) errors.push('FIG: #' + id + ' 未渲染 (' + (el ? el.innerHTML.length : 0) + ')');
  });
  MR.app.setView('analysis');
  ['mainfig', 'surfChart'].forEach(id => {
    const el = doc.getElementById(id);
    if (!el) errors.push('CHART: 缺少 #' + id);
  });
  ['line', 'bar', 'scatter', 'heat', 'spectrum', 'xps'].forEach(t => {
    MR.state.chartType = t;
    MR.app.render();
    const el = doc.getElementById('mainfig');
    if (!el || el.innerHTML.indexOf('<svg') < 0) errors.push('CHART: 类型 ' + t + ' 未渲染');
  });
  MR.state.chartType = 'line';
});

/* 5. 图表风格与配色 */
step('style', () => {
  const app = doc.getElementById('app');
  ['sci', 'origin', 'ppt'].forEach(k => {
    MR.state.figStyle = k;
    const pal = MR.stylePresets[k].palette;
    Object.keys(pal).forEach(x => { MR.colors[x] = pal[x]; });
    MR.app.render();
  });
  MR.state.figStyle = 'origin';
  Object.keys(MR.stylePresets.origin.palette).forEach(x => { MR.colors[x] = MR.stylePresets.origin.palette[x]; });
  ['teal', 'indigo', 'iron', 'moss'].forEach(a => { app.setAttribute('data-acc', a); MR.app.render(); });
  app.setAttribute('data-acc', 'teal');
  doc.querySelectorAll('#paletteRow input[type=color]').forEach(inp => {
    inp.value = '#123456';
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  MR.app.render();
});

/* 6. 交互路径 */
step('interactions', () => {
  const click = sel => {
    const el = doc.querySelector(sel);
    if (el) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    return !!el;
  };
  MR.app.setView('imp');
  const cs = doc.querySelectorAll('[data-case]');
  if (cs.length !== 3) errors.push('案例卡应 3 个, 实际 ' + cs.length);
  cs.forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  if (!click('[data-act="dlcase"]')) errors.push('缺少案例导出按钮');

  MR.app.setView('scope');
  const objs = doc.querySelectorAll('[data-obj]');
  if (!objs.length) errors.push('研究对象卡缺失');
  objs.forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

  MR.app.setView('design');
  doc.querySelectorAll('[data-param]').forEach(inp => {
    inp.value = String((+inp.min + +inp.max) / 2);
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  doc.querySelectorAll('[data-route]').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  doc.querySelectorAll('[data-chelate]').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  if (!click('[data-act="confirm"]')) errors.push('缺少确认配比按钮');

  MR.app.setView('paper');
  doc.querySelectorAll('[data-lang]').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  doc.querySelectorAll('[data-sec]').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  MR.state.paperSections = { abstract: 1, intro: 1, method: 1, results: 1, conclusion: 1 };
  MR.state.lang = 'zh';

  MR.app.setView('lang');
  if (!click('[data-act="analyze"]')) errors.push('缺少风格分析按钮');
  MR.app.setView('lang');
  if (!MR.state.styleLearned) errors.push('风格分析未生效');
  if (!click('[data-act="dedai"]')) errors.push('缺少降 AI 改写按钮');
  MR.modal.close();

  MR.app.setView('feedback');
  doc.querySelectorAll('[data-act="demo"]').forEach(b => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  if (!click('[data-act="usepaste"]')) errors.push('缺少使用粘贴数据按钮');
  if (!MR.state.realData) errors.push('实测数据未载入');
  MR.app.setView('feedback');
  const cmp = doc.getElementById('cmpChart');
  if (!cmp || cmp.innerHTML.indexOf('<svg') < 0) errors.push('一致性图未渲染');

  MR.app.setView('review');
  if (!click('[data-act="applyall"]')) errors.push('缺少应用修改按钮');
  MR.app.setView('review');
  if (!click('[data-act="dlreview"]')) errors.push('缺少审稿意见导出');
  MR.modal.close();
});

/* 7. 真实文件导入 */
step('upload', () => {
  const f1 = new window.File(['%PDF-1.4 fake'], '2022Cellulose——Grafting of quaternized chitosan onto oxidized cotton for antibacterial application.pdf', { type: 'application/pdf' });
  const f2 = new window.File(['x'], '2001Trends Microbiol——Mechanisms of biofilm resistance to antimicrobial agents.pdf', { type: 'application/pdf' });
  MR.app.handleFiles([f1, f2]);
  if (MR.state.files.length !== 2) errors.push('文件导入失败, 实际 ' + MR.state.files.length);
  if (MR.state.files[0].year !== 2022) errors.push('年份解析失败: ' + MR.state.files[0].year);
  if (MR.state.files[0].journal !== 'Cellulose') errors.push('期刊解析失败: ' + MR.state.files[0].journal);
  if (MR.state.files[1].case !== 'C3') errors.push('未能识别验证案例 C3');
  if (MR.state.caseSel !== 'C3') errors.push('未自动载入案例');
  const before = MR.lib.rows.length;
  if (before < 102) errors.push('导入后文献库应增加, 实际 ' + before);
});

/* 8. 导出路径 */
step('export', () => {
  MR.app.setView('figure');
  MR.views.imp.dlCase();
  MR.views.guide.dlGuide();
  MR.dl('t.txt', 'hello');
  MR.dlCSV('t.csv', [['a', 'b'], [1, 2]]);
  const el = doc.getElementById('fig1');
  if (el && el.querySelector('svg')) MR.dlSVG(el, 'fig1.svg'); else errors.push('fig1 无可导出 SVG');
});
}

/* 9. 全流水线串联 */
(async () => {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8')); }
  catch (e) { errors.push('boot: ' + e.message); }
  await new Promise(r => setTimeout(r, 200));
  if (!MR.lib.rows.length) errors.push('BOOT: 文献库未初始化');
  allChecks();
  await new Promise(r => setTimeout(r, 1200));
  MR.app.busy = false; MR.app.pipeline = false;
  MR.app.runAll();
  await new Promise(r => setTimeout(r, 22000));
  const done = Object.keys(MR.state.stage).filter(k => MR.state.stage[k] === 'done');
  if (done.length !== 10) errors.push('RUNALL: 仅完成 ' + done.length + '/10 → ' + JSON.stringify(MR.state.stage));
  if (MR.state.credits <= 0) errors.push('RUNALL: 算力未累加');
  const logs = doc.getElementById('consoleBody').children.length;
  if (logs < 40) errors.push('RUNALL: 日志过少 (' + logs + ')');
  setTimeout(() => {
    console.log('=== LATTICE 十环节版 冒烟测试 ===');
    console.log('视图 ' + viewList.length + ' | 案例 ' + MR.cases.length + ' | 核验引用 ' + MR.coreRefs.length + ' | 本地文献库 ' + MR.lib.rows.length);
    console.log('流水线 ' + done.length + '/10 | 日志 ' + logs + ' 行 | 算力 ' + MR.state.credits + '/' + MR.state.credMax);
    if (!errors.length) console.log('\n✅ 全部检查通过（0 错误）');
    else { console.log('\n❌ 发现 ' + errors.length + ' 个问题：'); errors.forEach(e => console.log('  · ' + e)); }
    process.exit(errors.length ? 1 : 0);
  }, 300);
})();
