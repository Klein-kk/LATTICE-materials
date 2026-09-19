const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2], DIR = process.argv[3];
const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
const w = dom.window;
/* 不再需要 Blob / Response / DecompressionStream：解压走纯 JS 实现 */
w.eval(fs.readFileSync(path.join(ROOT, 'assets/js/pdftext.js'), 'utf8'));
const out = [];
(async () => {
  const files = fs.readdirSync(DIR).filter(f => /\.pdf$/i.test(f));
  const pick = files.filter(f => /2001Trends|2003Nature|2004Carbohyd|2008Cellulose|2007Chem/.test(f)).slice(0, 5);
  out.push('待测 ' + pick.length + ' 个真实 PDF（纯 JS 解压路径）');
  for (const f of pick) {
    const t0 = Date.now();
    const buf = fs.readFileSync(path.join(DIR, f));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    try {
      const t = await w.MR.pdftext.extract(ab);
      const clean = (t || '').replace(/\s/g, '');
      out.push('OK   ' + String(clean.length).padStart(7) + ' 字符  ' + String(Date.now() - t0).padStart(6) + ' ms  ' + f.slice(0, 44));
      out.push('     样本 → ' + (t || '').replace(/\s+/g, ' ').slice(0, 180));
    } catch (e) {
      out.push('FAIL ' + String(e.message).slice(0, 80) + '  ' + f.slice(0, 44));
    }
  }
  fs.writeFileSync(path.join(__dirname, 'pdftest.log'), out.join('\n'));
  process.exit(0);
})();
