/* 诊断：逐流查看过滤器链与解码结果 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2], PDF = process.argv[3];
const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
const w = dom.window;
['library.js', 'papers.js', 'domain.js', 'pdftext.js'].forEach(f => {
  try { w.eval(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')); } catch (e) { console.log('EVAL FAIL', f, e.message); }
});
const buf = fs.readFileSync(PDF);
const u8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
// 复用内部逻辑：直接截取 obj
const latin1 = b => { let o = ''; for (let i = 0; i < b.length; i++) o += String.fromCharCode(b[i]); return o; };
const S = latin1(u8);
const re = /(\d+)\s+(\d+)\s+obj\b/g;
let m, starts = [];
while ((m = re.exec(S))) starts.push({ num: +m[1], at: m.index, dhead: re.lastIndex });
const out = [];
starts.forEach((o, i) => {
  const endObj = S.indexOf('endobj', o.dhead);
  const body = S.slice(o.dhead, endObj < 0 ? (starts[i + 1] ? starts[i + 1].at : S.length) : endObj);
  const sIdx = body.indexOf('stream');
  if (sIdx < 0) return;
  const dict = body.slice(0, sIdx);
  if (!/\/Length/.test(dict)) return;
  const st = o.dhead + sIdx + 6 + (S[o.dhead + sIdx + 6] === '\r' ? 1 : 0) + (S[o.dhead + sIdx + 6 + (S[o.dhead + sIdx + 6] === '\r' ? 1 : 0)] === '\n' ? 1 : 0);
  // 用 /Length 计算真实长度
  let lenM = dict.match(/\/Length\s+(\d+)/);
  let len = lenM ? +lenM[1] : null;
  const lm2 = dict.match(/\/Length\s+(\d+)\s+\d+\s+R/);
  let lenInd = null;
  if (lm2) {
    const ln = +lm2[1];
    const r2 = new RegExp('(?:^|[^0-9])' + ln + '\\s+0\\s+obj([\\s\\S]{0,80}?)endobj');
    const mm = S.match(r2);
    if (mm) lenInd = parseInt(mm[1].trim().split(/\s+/)[0], 10);
  }
  const realLen = lenInd || len;
  const filt = (dict.match(/\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/) || ['', '(none)'])[1];
  const enSearch = S.indexOf('endstream', st);
  const actualSpan = enSearch - st;
  out.push([o.num, `len=${realLen}`, `span=${actualSpan}`, `diff=${actualSpan - (realLen || 0)}`, 'filter=' + filt, 'sub=' + ((dict.match(/\/Subtype\s*\/(\w+)/) || [])[1] || '-')].join(' | '));
});
console.log(out.join('\n'));
