/* 综述类论文的完整走查：从 PDF 抽取 → 10 个环节渲染 → 概念图是否生成 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2], PDF = process.argv[3];
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom, doc = window.document;
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
const errs = [];
const files = ['library.js', 'papers.js', 'domain.js', 'pdftext.js', 'extract.js', 'paper.js', 'charts.js',
  'figures2.js', 'figures3.js', 'data.js', 'app.js', 'views2-core.js', 'views2-stages.js', 'views2-paper.js'];
for (const f of files) {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); } catch (e) { errs.push('eval ' + f + ': ' + e.message); }
}
const MR = window.MR;
const out = [];
(async () => {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8')); } catch (e) { errs.push('boot: ' + e.message); }
  await new Promise(r => setTimeout(r, 300));

  const buf = fs.readFileSync(PDF);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const text = await MR.pdftext.extract(ab);
  MR.loadText(text, path.basename(PDF));
  await new Promise(r => setTimeout(r, 400));

  const an = MR.state.analysis, pf = MR.state.profile;
  out.push('标题: ' + an.title);
  out.push('题录来源: 标题=' + an.titleSource + ' 摘要=' + an.abstractSource + ' 关键词=' + an.keywordsSource);
  out.push('类型: ' + an.paperType + ' · 概念类别 ' + (an.concepts || []).length + ' · 时间线 ' + (an.timeline || []).length);
  out.push('警示: ' + (an.warnings || []).join(' / '));
  out.push('');

  /* 环节 01 是否出现题录面板与来源标注 */
  MR.app.setView('imp');
  await new Promise(r => setTimeout(r, 120));
  let t = doc.getElementById('main').textContent;
  out.push('[01] 题录面板: ' + (t.indexOf('解析出的题录信息') >= 0 ? '有' : '缺') +
    ' · 来源标注: ' + (t.indexOf('自动推断') >= 0 || t.indexOf('原文自带') >= 0 ? '有' : '缺') +
    ' · 自检: ' + (t.indexOf('解析自检') >= 0 ? '有' : '缺') +
    ' · 综述提示: ' + (t.indexOf('文献类型：综述') >= 0 ? '有' : '缺'));

  /* 各环节渲染 + 概念图 */
  for (const v of ['scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review']) {
    MR.app.setView(v);
    await new Promise(r => setTimeout(r, 260));
    const m = doc.getElementById('main');
    const body = m ? m.textContent : '';
    const cr = doc.querySelector('#cfRoute'), cm = doc.querySelector('#cfMatrix'), ct = doc.querySelector('#cfTime');
    out.push('[' + v + '] 正文 ' + body.length + ' 字' +
      (cr ? ' · 路线图 ' + (cr.querySelector('svg') ? 'SVG ' + cr.innerHTML.length : '无') : '') +
      (cm ? ' · 矩阵 ' + (cm.querySelector('svg') ? 'SVG ' + cm.innerHTML.length : '无') : '') +
      (ct ? ' · 时间线 ' + (ct.querySelector('svg') ? 'SVG ' + ct.innerHTML.length : '无') : ''));
  }
  out.push('');
  out.push('错误: ' + (errs.length ? errs.join(' | ') : '无'));
  console.log(out.join('\n'));
  process.exit(errs.length ? 1 : 0);
})();
