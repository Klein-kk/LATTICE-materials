/* Tessa · PDF 抽取可用性门禁指标测量脚本
 * 用法: node _dev/tessa_gate.js <lattice-platform 根目录> <pdf1> [pdf2 ...]
 * 输出: 每篇一行 TSV + 详细摘要，指标用于回归门禁基线。
 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2];
const PDFS = process.argv.slice(3);
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
  const sentEnd = (t.match(/[.!?]/g) || []).length;
  return {
    chars: t.length,
    charsNoWs: t.replace(/\s/g, '').length,
    letters,
    spaces,
    spaceRatio: letters ? +(spaces / letters).toFixed(4) : 0,
    tokens: alphaTokens.length,
    avgWordLen: words.length ? +(wordLetters / words.length).toFixed(2) : 0,
    longTokenPct: alphaTokens.length ? +(100 * longTokens / alphaTokens.length).toFixed(2) : 0,
    sentEndPer1k: letters ? +(1000 * sentEnd / letters).toFixed(1) : 0,
    lines: t.split('\n').length
  };
}

(async () => {
  const rows = [];
  for (const pdf of PDFS) {
    const name = path.basename(pdf).slice(0, 60);
    let text = '';
    try {
      const buf = fs.readFileSync(pdf);
      text = await w.MR.pdftext.extract(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } catch (e) { text = ''; console.log('EXTRACT FAIL', name, e.message); }
    const m = metrics(text);
    let an = null;
    try { an = w.MR.extract.analyze(text, { name: path.basename(pdf) }); } catch (e) { console.log('ANALYZE FAIL', name, e.message); }
    const r = Object.assign({ file: name }, m, an ? {
      abstractLen: (an.abstract || '').length,
      sections: an.sections.length,
      materials: an.materials.length,
      instruments: an.instruments.length,
      variables: an.variables.length,
      indicators: an.indicators.length,
      steps: an.steps.length,
      refs: an.references.length,
      confidence: an.confidence
    } : {});
    rows.push(r);
    console.log(JSON.stringify(r));
    console.log('  head: ' + (text || '').slice(0, 120).replace(/\n/g, ' | '));
  }
  fs.writeFileSync(path.join(__dirname, 'tessa_gate_baseline.json'), JSON.stringify(rows, null, 2));
  process.exit(0);
})();
