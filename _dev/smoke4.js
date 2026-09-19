/* LATTICE v3.1（材料学科通用版）· 冒烟测试 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.argv[2] || '.';
const PDFDIR = process.argv[3] || '';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom, doc = window.document;
const LOGF = path.join(__dirname,'smoke4.log'); const _log = console.log.bind(console); console.log = function(){ try{ fs.appendFileSync(LOGF, Array.prototype.map.call(arguments, a=>typeof a==='string'?a:JSON.stringify(a)).join(' ')+String.fromCharCode(10)); }catch(e){} };
const errors = [];
process.on('unhandledRejection', e => { console.log('UNHANDLED REJECTION:', e && e.message ? e.message : e); process.exit(2); });
process.on('uncaughtException', e => { console.log('UNCAUGHT:', e && e.stack ? e.stack.split(String.fromCharCode(10))[0] : e); process.exit(3); });
window.addEventListener('error', e => errors.push('window.error: ' + e.message));
if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:stub';
if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};

const files = ['library.js', 'papers.js', 'domain.js', 'pdftext.js', 'extract.js', 'paper.js', 'charts.js',
  'figures2.js', 'figures3.js', 'data.js', 'app.js', 'views2-core.js', 'views2-stages.js', 'views2-paper.js'];
for (const f of files) {
  const p = path.join(ROOT, 'assets/js', f);
  if (!fs.existsSync(p)) { errors.push('缺少文件 ' + f); continue; }
  try { window.eval(fs.readFileSync(p, 'utf8')); } catch (e) { errors.push('eval ' + f + ': ' + e.message); }
}
const MR = window.MR;
if (!MR) { console.log('FATAL: MR 未挂载'); process.exit(1); }
function step(n, fn) { try { fn(); } catch (e) { errors.push(n + ' → ' + e.message); } }
function c(cond, m) { if (!cond) errors.push(m); }

const BAD_GENERIC = ['细胞毒性', '抑菌率', '生物膜抑制率', '抗菌率'];

(async () => { try {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8')); }
  catch (e) { errors.push('boot: ' + e.message); }
  await new Promise(r => setTimeout(r, 300));

  /* 1. 通用性：默认不预载任何论文 */
  step('generic-landing', () => {
    c(!MR.state.paper, '不应默认载入论文');
    c(MR.domain.MATERIAL_DOMAINS.length >= 8, '材料方向少于 8 类');
    c(MR.domain.ALL_IND.length >= 150, '性能指标词表过小: ' + MR.domain.ALL_IND.length);
    c(MR.domain.PROPERTY_FAMILIES.length >= 8, '性能族少于 8 类');
    MR.app.setView('imp');
    const t = doc.getElementById('main').textContent;
    c(t.indexOf('材料方向') >= 0, '入口未出现材料方向选择');
    c(t.indexOf('还没有载入论文') >= 0, '未载入论文时未给出引导');
    ['竹纤维', '氯氧镁', '静曲强度'].forEach(bad => c(t.indexOf(bad) < 0, '入口出现了特定课题内容: ' + bad));
    /* 10 个环节都不应因无论文而报错 */
    ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'].forEach(v => {
      MR.app.setView(v);
      const m = doc.getElementById('main');
      if (!m || m.innerHTML.length < 200) errors.push('无论文时 render:' + v + ' 失败');
    });
  });

  /* 2. 四个方向示例文档都要能抽出该方向的内容，且不得出现无关指标 */
  const EXPECT = {
    S1: { must: ['抗拉强度', '显微硬度'], mat: ['铝合金'], forbid: BAD_GENERIC, varKey: /温度|时间/ },
    S2: { must: ['弯曲强度', '层间剪切强度'], mat: ['玄武岩纤维'], forbid: ['细胞毒性'], varKey: /浓度/ },
    S3: { must: ['抗压强度', '干缩率'], mat: ['矿渣', '偏高岭土'], forbid: BAD_GENERIC, varKey: /掺量/ },
    S4: { must: ['库仑效率', '比容量'], mat: ['五氧化二钒'], forbid: BAD_GENERIC, varKey: /包覆/ }
  };
  Object.keys(EXPECT).forEach(id => step('sample-' + id, () => {
    MR.loadPaper(id);
    const an = MR.state.analysis, pf = MR.state.profile, e = EXPECT[id];
    c(an.materials.length >= 3, id + ' 原料抽取过少: ' + an.materials.length);
    c(an.instruments.length >= 3, id + ' 仪器抽取过少: ' + an.instruments.length);
    c(an.variables.length >= 1, id + ' 变量抽取过少: ' + an.variables.length);
    c(an.references.length >= 2, id + ' 参考文献抽取过少: ' + an.references.length);
    c(an.steps.length >= 2, id + ' 工序抽取过少: ' + an.steps.length);
    const all = pf.perf.map(p => p.name).join('、') + '|' + pf.chars.map(p => p.name).join('、') + '|' + an.materials.map(m => m.name).join('、');
    e.must.forEach(k => c(all.indexOf(k) >= 0, id + ' 未抽到「' + k + '」→ ' + all.slice(0, 120)));
    e.mat.forEach(k => c(all.indexOf(k) >= 0, id + ' 未抽到材料「' + k + '」'));
    e.forbid.forEach(k => c(all.indexOf(k) < 0, id + ' 出现与论文无关的指标「' + k + '」'));
    c(an.variables.some(v => e.varKey.test(v.key)), id + ' 变量不含期望关键词: ' + an.variables.map(v => v.key).join(' '));
    /* 指标必须归类 */
    pf.perf.forEach(p => c(!!p.family, id + ' 指标未归类: ' + p.name));
  }));

  /* 3. 十环节渲染（有论文） */
  ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'].forEach(v => step('render:' + v, () => {
    MR.loadPaper('S3');
    MR.app.setView(v);
    const m = doc.getElementById('main');
    if (!m || m.innerHTML.length < 600) errors.push('render:' + v + ' 输出过短 (' + (m ? m.innerHTML.length : 0) + ')');
  }));

  /* 4. 图形 */
  step('figures', () => {
    MR.loadPaper('S2');
    MR.app.setView('figure');
    ['f2flow', 'f2mech'].forEach(id => {
      const el = doc.getElementById(id);
      if (!el || el.innerHTML.indexOf('<svg') < 0 || el.innerHTML.length < 800) errors.push('FIG: #' + id + ' 未渲染');
    });
    const x = doc.getElementById('f2xrd');
    if (x && x.innerHTML.indexOf('<svg') < 0) errors.push('FIG: XRD 未渲染');
    /* 3D 图与分子图 */
    ['f3surf', 'f3bars', 'f3cell', 'f3layer', 'f3mol'].forEach(id => {
      const el = doc.getElementById(id);
      if (!el || el.innerHTML.indexOf('<svg') < 0 || el.innerHTML.length < 500) errors.push('FIG3D: #' + id + ' 未渲染 (' + (el ? el.innerHTML.length : 0) + ')');
    });
    if (!MR.sci || !MR.sci.PLAYBOOK.length) errors.push('SCI 手册缺失');
    if (!MR.sci.MOL_GUIDE.length) errors.push('分子结构规范缺失');
    if (!MR.sci.PALETTES['okabe-ito']) errors.push('期刊色板缺失');
    const t3 = doc.getElementById('main').textContent;
    ['三维响应面', 'SCI 配图手册', '分子结构的 SCI 表达规范'].forEach(k => {
      if (t3.indexOf(k) < 0) errors.push('环节04 缺少板块: ' + k);
    });
  });

  /* 5. 论文正文与反向断言 */
  step('paper', () => {
    MR.loadPaper('S1');
    MR.app.setView('paper');
    const t = doc.getElementById('main').textContent;
    c(t.indexOf('抗拉强度') >= 0 || t.indexOf('显微硬度') >= 0, '论文未提及该论文指标');
    c(t.indexOf('铝合金') >= 0 || t.indexOf('6061') >= 0, '论文未提及该论文材料');
    BAD_GENERIC.forEach(b => c(t.indexOf(b) < 0, '论文出现无关内容: ' + b));
  });

  /* 6. 评审检测 */
  step('review', () => {
    MR.loadPaper('S3');
    MR.app.setView('review');
    const t = doc.getElementById('main').textContent;
    c(t.indexOf('查重率') >= 0 && t.indexOf('AI') >= 0, '评审页缺少通用指标');
    c(t.indexOf('查重率') >= 0, '缺少查重率');
  });

  /* 7. 真实 PDF 解析（若提供了 PDF 目录） */
  if (PDFDIR && fs.existsSync(PDFDIR)) {
    const pdfs = fs.readdirSync(PDFDIR).filter(f => /\.pdf$/i.test(f));
    const pick = pdfs.filter(f => /2001Trends|2003Nature|2004Carbohyd/.test(f)).slice(0, 3);
    for (const f of pick) {
      const buf = fs.readFileSync(path.join(PDFDIR, f));
      try {
        const text = await window.MR.pdftext.extract(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        const clean = (text || '').replace(/\s/g, '');
        console.log('PDF ' + f.slice(0, 40) + ' → ' + clean.length + ' 字符');
        if (clean.length < 200) errors.push('PDF 抽取过少: ' + f + ' (' + clean.length + ')');
        else {
          /* 抽出的应当是可读英文，含常见词 */
          const okWords = /biofilm|resistance|antimicrobial|cellulose|abstract|the|and/i.test(text);
          if (!okWords) errors.push('PDF 抽取内容不像正文: ' + f + ' → ' + text.slice(0, 120));
        }
      } catch (e) { errors.push('PDF 解析失败 ' + f + ': ' + e.message); }
    }
  }

  /* 8. 全流程串联 */
  await new Promise(r => setTimeout(r, 300));
  MR.loadPaper('S4');
  MR.app.busy = false; MR.app.pipeline = false;
  MR.app.runAll();
  await new Promise(r => setTimeout(r, 22000));
  const done = Object.keys(MR.state.stage).filter(k => MR.state.stage[k] === 'done');
  c(done.length === 10, 'RUNALL: 仅完成 ' + done.length + '/10 → ' + JSON.stringify(MR.state.stage));

  setTimeout(() => {
    console.log('=== LATTICE 材料学科通用版 冒烟测试 ===');
    console.log('方向 ' + MR.domain.MATERIAL_DOMAINS.length + ' 类 · 指标词表 ' + MR.domain.ALL_IND.length + ' 项 · 性能族 ' + MR.domain.PROPERTY_FAMILIES.length + ' 类');
    console.log('默认未载入论文：' + (!MR.state.paper || MR.state.paper.id !== 'P1'));
    console.log('流水线 ' + done.length + '/10');
    if (!errors.length) console.log('\n✅ 全部检查通过（0 错误）');
    else { console.log('\n❌ 发现 ' + errors.length + ' 个问题：'); errors.forEach(e => console.log('  · ' + e)); }
    process.exit(errors.length ? 1 : 0);
  }, 300);
  } catch (e) { console.log('THROWN in checks:', e && e.stack ? e.stack.split(String.fromCharCode(10)).slice(0,3).join(' | ') : e); process.exit(4); }
})();
