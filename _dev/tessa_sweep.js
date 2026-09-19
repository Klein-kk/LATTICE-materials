/* Tessa · 全语料扫描：对目录下全部 PDF 计算门禁指标，输出 JSONL */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2], DIR = process.argv[3], OUT = process.argv[4];
const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
const w = dom.window;
['library.js', 'papers.js', 'domain.js', 'pdftext.js', 'extract.js', 'paper.js'].forEach(f => {
  try { w.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); } catch (e) { console.log('EVAL FAIL', f, e.message); }
});
function metrics(text) {
  const t = text || '';
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  const spaces = (t.match(/ /g) || []).length;
  const alphaTokens = t.match(/[A-Za-z]+/g) || [];
  const longTokens = alphaTokens.filter(x => x.length >= 20).length;
  const words = t.split(/\s+/).filter(x => /[A-Za-z]/.test(x));
  const wordLetters = words.reduce((s, x) => s + (x.match(/[A-Za-z]/g) || []).length, 0);
  const cjk = (t.match(/[一-鿿]/g) || []).length;
  const noWs = t.replace(/\s/g, '').length;
  return {
    chars: t.length, charsNoWs: noWs, letters, spaces, cjk,
    spaceRatio: letters ? +(spaces / letters).toFixed(4) : 0,
    avgWordLen: words.length ? +(wordLetters / words.length).toFixed(2) : 0,
    longTokenPct: alphaTokens.length ? +(100 * longTokens / alphaTokens.length).toFixed(2) : 0,
    lettersDensity: noWs ? +(letters / noWs).toFixed(3) : 0
  };
}
process.on('uncaughtException', e => { console.log('UNCAUGHT:', e && e.stack ? e.stack.split('\n').slice(0,3).join(' | ') : e); process.exit(3); });
process.on('unhandledRejection', e => { console.log('UNHANDLED:', e && e.message ? e.message : e); process.exit(4); });
(async () => {
  let pdfs = fs.readdirSync(DIR).filter(f => /\.pdf$/i.test(f));
  const START = +(process.env.START || 0);
  if (START) pdfs = pdfs.slice(START);
  if (!START) fs.writeFileSync(OUT, '');
  let i = START;
  for (const f of pdfs) {
    i++;
    let text = '', err = '';
    try {
      const buf = fs.readFileSync(path.join(DIR, f));
      text = await w.MR.pdftext.extract(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } catch (e) { err = String(e && e.message || e); }
    let an = {};
    try { const a = w.MR.extract.analyze(text, { name: f }); an = { sections: a.sections.length, materials: a.materials.length, variables: a.variables.length, refs: a.references.length, confidence: a.confidence, abstractLen: (a.abstract || '').length }; } catch (e) { an = { analyzeErr: String(e && e.message || e) }; }
    fs.appendFileSync(OUT, JSON.stringify(Object.assign({ file: f }, metrics(text), an, err ? { err } : {})) + '\n');
    console.log(i + ' ' + f.slice(0, 50));
  }
  console.log('DONE ' + pdfs.length); process.exit(0);
})();
