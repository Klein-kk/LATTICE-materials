/* SRE 独立复核探针：验证事故 PDF 抽出文本是否全文无空格（只读分析，不改产品代码） */
const fs = require('fs'), path = require('path');
global.window = global; global.MR = {};
const ROOT = process.argv[2], PDF = process.argv[3];
eval(fs.readFileSync(path.join(ROOT, 'assets/js/pdftext.js'), 'utf8'));
(async () => {
  const buf = fs.readFileSync(PDF);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const text = await window.MR.pdftext.extract(ab);
  const total = text.length;
  const spaces = (text.match(/ /g) || []).length;
  const newlines = (text.match(/\n/g) || []).length;
  const nonWs = text.replace(/\s/g, '').length;
  const longestWord = text.split(/\s+/).reduce((a, b) => b.length > a.length ? b : a, '');
  console.log('总字符数:', total);
  console.log('空格数:', spaces, ' 换行数:', newlines, ' 非空白字符:', nonWs);
  console.log('空格占比:', (spaces / total * 100).toFixed(2) + '%', '（正常英文正文应约 15%~20%）');
  console.log('最长无空格片段长度:', longestWord.length);
  console.log('前 300 字符:', JSON.stringify(text.slice(0, 300)));
})();
