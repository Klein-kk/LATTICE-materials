/* 单点诊断：内置示例文档的变量抽取 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2];
const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
const w = dom.window;
['library.js', 'papers.js', 'domain.js', 'pdftext.js', 'extract.js', 'paper.js'].forEach(f => {
  try { w.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); } catch (e) { console.log('EVAL FAIL', f, e.message); }
});
const out = [];
w.MR_PAPERS.filter(p => /^S\d$/.test(p.id) && p.text).forEach(p => {
  const an = w.MR.extract.analyze(p.text, { name: p.name });
  out.push(p.id + ' 标题=' + an.title.slice(0, 40));
  out.push('   章节: ' + an.sections.map(s => s.no + '|' + s.k).join(' , '));
  out.push('   变量(' + an.variables.length + '): ' + an.variables.map(v => v.key + '[' + v.levels.join('/') + ']').join(' '));
  out.push('   指标: ' + an.indicators.map(i => i.name).join('、'));
  out.push('   原料: ' + an.materials.length + ' 仪器: ' + an.instruments.length + ' 工序: ' + an.steps.length + ' 参考: ' + an.references.length);
});
console.log(out.join('\n'));
