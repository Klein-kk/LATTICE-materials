/* 逐流测试：ASCII85 → Flate 在 JS 里是否解得开 */
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
const D = w.MR.pdftext._dbg;
const S = D.latin1(u8);
const re = /(\d+)\s+(\d+)\s+obj\b/g;
let m, starts = [];
while ((m = re.exec(S))) starts.push({ num: +m[1], at: m.index, dhead: re.lastIndex });
const rows = [];
starts.forEach((o, i) => {
  const endObj = S.indexOf('endobj', o.dhead);
  const body = S.slice(o.dhead, endObj < 0 ? (starts[i + 1] ? starts[i + 1].at : S.length) : endObj);
  const sIdx = body.indexOf('stream');
  if (sIdx < 0) return;
  const dict = body.slice(0, sIdx);
  let st = o.dhead + sIdx + 6;
  if (S[st] === '\r') st++;
  if (S[st] === '\n') st++;
  let en = S.indexOf('endstream', st);
  if (en < 0) en = o.dhead + body.length;
  let raw = u8.subarray(st, en);
  while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) raw = raw.subarray(0, raw.length - 1);
  const filt = (dict.match(/\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/) || [, '(none)'])[1].replace(/\s+/g, '');
  const a = D.applyFilters(raw, dict);
  let info = 'raw=' + raw.length + ' filter=' + filt + ' -> ' + (a === null ? 'NULL' : ('text ' + a.length + ' :: ' + a.replace(/\s+/g, ' ').slice(0, 70)));
  if (a === null && /ASCII85/.test(filt)) {
    const d1 = D.fASCII85(raw);
    info += ' | a85=' + d1.length + ' head=[' + Array.from(d1.subarray(0, 6)).join(',') + '] inflate=' + (D.inflateAuto(d1) ? D.inflateAuto(d1).length : 'FAIL');
  }
  rows.push(o.num + ' ' + info);
});
console.log(rows.join('\n'));
