/* 扫描 LATTICE 实际渲染出的界面文本，供 i18n 词典使用 */
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', 'lattice-platform');
const vc = new VirtualConsole();
vc.on('jsdomError', () => {});

JSDOM.fromFile(path.join(ROOT, 'index.html'), {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
}).then(async (dom) => {
  const w = dom.window;
  await new Promise(r => setTimeout(r, 2500));

  const texts = new Map(); // text -> count
  const skip = new Set(['SCRIPT', 'STYLE', 'SVG', 'PATH', 'TITLE']);

  function collect() {
    const walker = w.document.createTreeWalker(w.document.body, w.window.NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p) continue;
      if (skip.has(p.tagName)) continue;
      if (p.closest('svg')) continue;
      const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!t) continue;
      if (!/[\u4e00-\u9fff]/.test(t)) continue;
      texts.set(t, (texts.get(t) || 0) + 1);
    }
    // 属性文案
    w.document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      ['placeholder', 'title', 'aria-label'].forEach(a => {
        const v = el.getAttribute(a);
        if (v && /[\u4e00-\u9fff]/.test(v)) texts.set('@' + a + '|' + v, (texts.get('@' + a + '|' + v) || 0) + 1);
      });
    });
  }

  collect();

  const keys = ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'];
  let ok = 0;
  for (const k of keys) {
    try {
      if (w.MR && w.MR.app && w.MR.app.setView) { w.MR.app.setView(k); await new Promise(r => setTimeout(r, 260)); collect(); ok++; }
    } catch (e) { }
  }
  // 载入示例论文后再扫一遍
  try { if (w.MR && w.MR.loadPaper) { w.MR.loadPaper('S1'); await new Promise(r => setTimeout(r, 300)); } } catch (e) { }
  for (const k of keys) {
    try { if (w.MR && w.MR.app && w.MR.app.setView) { w.MR.app.setView(k); await new Promise(r => setTimeout(r, 260)); collect(); } } catch (e) { }
  }

  const arr = [...texts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('视图切换成功:', ok, ' 文本词条数:', arr.length);
  const out = arr.map(([t, c]) => t);
  require('fs').writeFileSync(path.join(__dirname, 'i18n_terms.json'), JSON.stringify(out, null, 0), 'utf8');
  console.log('前 60 条:');
  arr.slice(0, 60).forEach(([t, c]) => console.log(c + '\t' + t));
  process.exit(0);
}).catch(e => { console.error('FAIL', e && e.message); process.exit(1); });
