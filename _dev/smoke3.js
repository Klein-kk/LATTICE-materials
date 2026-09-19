/* LATTICE v3（论文驱动版）· 交付前冒烟测试 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.argv[2] || '.';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom, doc = window.document;
const errors = [];
window.addEventListener('error', e => errors.push('window.error: ' + e.message));
if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:stub';
if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};

const files = ['library.js', 'papers.js', 'extract.js', 'paper.js', 'charts.js', 'figures2.js', 'data.js', 'app.js',
  'views2-core.js', 'views2-stages.js', 'views2-paper.js'];
for (const f of files) {
  const p = path.join(ROOT, 'assets/js', f);
  if (!fs.existsSync(p)) { errors.push('缺少文件 ' + f); continue; }
  try { window.eval(fs.readFileSync(p, 'utf8')); } catch (e) { errors.push('eval ' + f + ': ' + e.message); }
}
const MR = window.MR;
if (!MR) { console.log('FATAL: MR 未挂载'); process.exit(1); }
function step(n, fn) { try { fn(); } catch (e) { errors.push(n + ' → ' + e.message); } }
function c(cond, m) { if (!cond) errors.push(m); }

(async () => {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8')); }
  catch (e) { errors.push('boot: ' + e.message); }
  await new Promise(r => setTimeout(r, 300));

  /* 1. 内置论文与抽取 */
  step('extract', () => {
    c((window.MR_PAPERS || []).length >= 3, '内置论文不足');
    c(MR.state.paper && MR.state.paper.id === 'P1', '未默认载入 P1');
    const an = MR.state.analysis;
    c(an && an.materials.length >= 4, '原料抽取过少: ' + (an ? an.materials.length : 0));
    c(an.instruments.length >= 4, '仪器抽取过少: ' + an.instruments.length);
    c(an.variables.length >= 2, '变量抽取过少: ' + an.variables.length);
    c(an.references.length >= 20, '参考文献抽取过少: ' + an.references.length);
    const perf = MR.state.profile.perf;
    c(perf.length >= 2, '性能指标抽取过少: ' + perf.length);
    c(MR.state.profile.chars.length >= 2, '表征手段抽取过少: ' + MR.state.profile.chars.length);
    c(an.steps.length >= 3, '工序抽取过少: ' + an.steps.length);
    /* 关键：不能出现与论文无关的指标 */
    const names = perf.map(p => p.name).join('、') + MR.state.profile.chars.map(p => p.name).join('、');
    ['细胞毒性', '抑菌率', '生物膜', '抗菌'].forEach(bad => {
      c(names.indexOf(bad) < 0, '出现了论文中没有的指标: ' + bad);
    });
    c(names.indexOf('静曲强度') >= 0, '未抽到「静曲强度」');
    c(names.indexOf('弹性模量') >= 0, '未抽到「弹性模量」');
    /* 变量应包含碱浓度 / KH-550 */
    const vk = an.variables.map(v => v.key).join(' ');
    c(/碱|NaOH|浓度/.test(vk), '变量未包含碱浓度: ' + vk);
    c(/KH|偶联剂|添加/.test(vk), '变量未包含偶联剂添加量: ' + vk);
    /* 原文依据必须存在 */
    an.materials.forEach(m => c(!!m.evidence, '原料缺原文依据: ' + m.name));
  });

  /* 2. 模型 */
  step('model', () => {
    const pf = MR.state.profile;
    c(Object.keys(pf.__model).length > 0, '未建立变量—指标模型');
    Object.keys(pf.__model).forEach(k => {
      const m = pf.__model[k];
      const lv = m.levels.slice().sort((a, b) => a - b);
      const vals = lv.map(x => m.f(x));
      c(vals.every(v => isFinite(v)), '模型输出非有限值: ' + k);
      const peak = vals.indexOf(Math.max.apply(null, vals));
      if (m.dir === 'rise-fall') c(peak > -1, 'rise-fall 无峰值: ' + k);
    });
  });

  /* 3. 十环节渲染 */
  const views = ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'];
  views.forEach(v => step('render:' + v, () => {
    MR.app.setView(v);
    const m = doc.getElementById('main');
    if (!m || m.innerHTML.length < 600) errors.push('render:' + v + ' 输出过短 (' + (m ? m.innerHTML.length : 0) + ')');
  }));

  /* 4. 图形渲染 */
  step('figures', () => {
    MR.app.setView('figure');
    ['f2flow', 'f2mech'].forEach(id => {
      const el = doc.getElementById(id);
      if (!el || el.innerHTML.indexOf('<svg') < 0 || el.innerHTML.length < 800) errors.push('FIG: #' + id + ' 未渲染 (' + (el ? el.innerHTML.length : 0) + ')');
    });
    const x = doc.getElementById('f2xrd');
    if (x && x.innerHTML.indexOf('<svg') < 0) errors.push('FIG: XRD 未渲染');
    const ft = doc.getElementById('f2ftir');
    if (ft && ft.innerHTML.indexOf('<svg') < 0) errors.push('FIG: FTIR 未渲染');
    c(MR.state.profile.peakData.theta.length >= 3, 'XRD 峰位抽取不足: ' + MR.state.profile.peakData.theta.length);
  });

  /* 5. 分析与交互 */
  step('analysis', () => {
    MR.app.setView('analysis');
    const el = doc.getElementById('f2trend');
    if (!el || el.innerHTML.indexOf('<svg') < 0) errors.push('趋势图未渲染');
    ['line', 'bar', 'scatter'].forEach(t => { MR.state.chartType = t; MR.app.render(); });
    MR.state.chartType = 'line';
    MR.app.setView('analysis');
    const nx = doc.querySelector('[data-act="next"]');
    if (nx) nx.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    MR.app.setView('scope');
    const vb = doc.querySelector('[data-var]');
    if (vb) vb.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    MR.app.setView('design');
    const lb = doc.querySelector('[data-level]');
    if (lb) lb.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  /* 6. 论文生成与引用 */
  step('paper', () => {
    MR.app.setView('paper');
    const txt = doc.getElementById('main').textContent;
    c(txt.indexOf('静曲强度') >= 0 || txt.indexOf('弹性模量') >= 0, '生成的论文未提及该论文的指标');
    c(txt.indexOf('竹纤维') >= 0 || txt.indexOf('竹粉') >= 0, '生成的论文未提及该论文的材料');
    c(txt.indexOf('35.19') >= 0 || txt.indexOf('36.12') >= 0 || txt.indexOf('未报告') >= 0, '未引用原文数值或未标注未报告');
    ['细胞毒性', '生物膜', '抗菌'].forEach(bad => c(txt.indexOf(bad) < 0, '论文中出现了无关内容: ' + bad));
    c(MR.state.analysis.references.length > 20, '参考文献未带入论文');
  });

  /* 7. 语言与改写 */
  step('lang', () => {
    MR.app.setView('lang');
    const an = doc.querySelector('[data-act="analyze"]');
    if (an) an.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    c(MR.state.styleLearned, '风格分析未生效');
    MR.app.setView('lang');
    const dd = doc.querySelector('[data-act="dedai"]');
    if (dd) dd.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    c(!!MR.state.deAIResult, '降 AI 改写未产生结果');
  });

  /* 8. 评审检测 */
  step('review', () => {
    MR.app.setView('review');
    const checks = MR.checks();
    c(checks.length >= 1, '未检测到任何问题（该论文实际存在章节跳号与文献重复）');
    const ts = checks.map(x => x.t).join(' ');
    c(/章节编号|重复/.test(ts), '未检出已知的章节跳号 / 文献重复问题: ' + ts);
    const txt = doc.getElementById('main').textContent;
    c(txt.indexOf('查重率') >= 0 && txt.indexOf('AI') >= 0, '评审页缺少查重率/AI 率');
    /* 专家方向应随领域变化 */
    c(txt.indexOf('试验设计') >= 0, '未出现统计方向的专家');
  });

  /* 9. 数据回填 */
  step('feedback', () => {
    const inds = MR.state.profile.perf;
    MR.state.realData = inds.map(i => [i.name, String((i.optimum != null ? i.optimum : 10) * 1.05)]);
    MR.state.realSource = '测试数据';
    MR.app.setView('feedback');
    const txt = doc.getElementById('main').textContent;
    c(txt.indexOf('实测') >= 0 || txt.indexOf('比对') >= 0, '回填页未显示比对');
    inds.forEach(i => c(txt.indexOf(i.name) >= 0, '比对表缺少指标: ' + i.name));
    ['细胞毒性', '抑菌率'].forEach(bad => c(txt.indexOf(bad) < 0, '回填页出现无关指标: ' + bad));
  });

  /* 10. 扫描件论文的诚实路径 */
  step('scan', () => {
    MR.loadPaper('P4');
    const an = MR.state.analysis;
    c(an.materials.length === 0 && MR.state.profile.perf.length === 0, '扫描件不应抽取到内容');
    MR.app.setView('imp');
    const txt = doc.getElementById('main').textContent;
    c(txt.indexOf('未报告') >= 0 || txt.indexOf('没有') >= 0, '扫描件未给出诚实提示');
    c(txt.indexOf('细胞毒性') < 0, '扫描件路径出现了臆造内容');
    MR.loadPaper('P1');
  });

  /* 11. 全流程串联 */
  await new Promise(r => setTimeout(r, 300));
  MR.app.busy = false; MR.app.pipeline = false;
  MR.app.runAll();
  await new Promise(r => setTimeout(r, 22000));
  const done = Object.keys(MR.state.stage).filter(k => MR.state.stage[k] === 'done');
  c(done.length === 10, 'RUNALL: 仅完成 ' + done.length + '/10 → ' + JSON.stringify(MR.state.stage));

  setTimeout(() => {
    const pf = MR.state.profile, an = MR.state.analysis;
    console.log('=== LATTICE v3 论文驱动版 冒烟测试 ===');
    console.log('抽取：原料 ' + an.materials.length + ' · 仪器 ' + an.instruments.length + ' · 变量 ' + an.variables.length +
      ' · 指标 ' + pf.perf.length + ' · 表征 ' + pf.chars.length + ' · 工序 ' + an.steps.length + ' · 文献 ' + an.references.length);
    console.log('指标：' + pf.perf.map(p => p.name + (p.optimum != null ? '(' + p.optimum + ')' : '')).join('、'));
    console.log('变量：' + an.variables.map(v => v.key + '[' + v.levels.join('/') + ']').join('、'));
    console.log('XRD 峰位 ' + pf.peakData.theta.length + ' 个 | FTIR 波数 ' + pf.ftir.bands.length + ' 个 | 检出问题 ' + MR.checks().length + ' 项');
    console.log('流水线 ' + done.length + '/10');
    if (!errors.length) console.log('\n✅ 全部检查通过（0 错误）');
    else { console.log('\n❌ 发现 ' + errors.length + ' 个问题：'); errors.forEach(e => console.log('  · ' + e)); }
    process.exit(errors.length ? 1 : 0);
  }, 300);
})();
