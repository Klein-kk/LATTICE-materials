const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2], PDF = process.argv[3];
const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
const w = dom.window;
['library.js', 'papers.js', 'domain.js', 'pdftext.js', 'extract.js', 'paper.js'].forEach(f => {
  try { w.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); } catch (e) { console.log('EVAL FAIL', f, e.message); }
});
const out = [];
(async () => {
  const buf = fs.readFileSync(PDF);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  let text = '';
  try { text = await w.MR.pdftext.extract(ab); } catch (e) { out.push('PDF 抽取异常: ' + e.message); }
  const clean = (text || '').replace(/\s/g, '');
  out.push('=== 1. PDF 文字抽取 ===');
  out.push('字符数(去空白): ' + clean.length);
  out.push('前 700 字符:');
  out.push((text || '').slice(0, 700).replace(/\n{2,}/g, '\n'));
  out.push('');
  out.push('=== 2. 抽取结果（当前词典为中文） ===');
  const an = w.MR.extract.analyze(text || '', { name: path.basename(PDF) });
  out.push('标题: ' + (an.title || '(空)'));
  out.push('摘要长度: ' + (an.abstract || '').length);
  out.push('摘要来源: ' + an.abstractSource + ' | 关键词来源: ' + an.keywordsSource);
  out.push('摘要预览: ' + (an.abstract || '').slice(0, 220));
  out.push('关键词: ' + (an.keywords || []).join(' / '));
  out.push('章节数: ' + an.sections.length + ' → ' + an.sections.slice(0, 12).map(s => s.no + ' ' + s.k).join(' | '));
  out.push('原料/试剂: ' + an.materials.length + ' → ' + an.materials.slice(0, 6).map(m => m.name).join('、'));
  out.push('仪器: ' + an.instruments.length + ' → ' + an.instruments.slice(0, 6).map(m => m.name).join('、'));
  out.push('变量: ' + an.variables.length + ' → ' + an.variables.map(v => v.key + '[' + v.levels.join('/') + ']').join('、'));
  out.push('指标: ' + an.indicators.length + ' → ' + an.indicators.map(i => i.name).slice(0, 10).join('、'));
  out.push('工序: ' + an.steps.length + ' → ' + an.steps.map(s => s.t).join('、'));
  out.push('标准: ' + an.standards.length + ' → ' + an.standards.slice(0, 6).join('、'));
  out.push('参考文献: ' + an.references.length);
  out.push('置信度: ' + an.confidence);
  out.push('');
  out.push('=== 2b. 正文尾部 1200 字符（查参考文献） ===');
  out.push((text || '').slice(-1200));
  out.push('');
  out.push('=== 2c. 前 34 行（序号|长度|内容前 100） ===');
  (text || '').split('\n').slice(0, 34).forEach((l, i) => {
    if (!l.trim()) return;
    out.push(i + '|' + l.length + '| ' + l.slice(0, 100));
  });
  out.push('');
  out.push('=== 3. 画像 ===');
  const pf = w.MR.paper.build(an, text || '');
  out.push('领域: ' + pf.domain);
  out.push('性能指标: ' + pf.perf.map(p => p.name + '(' + (p.family || '-') + ')').join('、'));
  out.push('表征手段: ' + pf.chars.map(c => c.name).join('、'));
  out.push('缺失项: ' + pf.missing.join('、'));
  out.push('变量—指标关系: ' + pf.matrix.length);
  fs.writeFileSync(path.join(__dirname, 'en-test.log'), out.join('\n'));
  process.exit(0);
})();
