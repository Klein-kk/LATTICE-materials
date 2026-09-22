/* 语言 / 主题切换冒烟测试 */
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', 'lattice-platform');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const wait = ms => new Promise(r => setTimeout(r, ms));
const R = [];
const ok = (name, cond, extra) => { R.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); return cond; };

function zhTextNodes(d) {
  const out = [];
  const w = d.createTreeWalker(d.body, 0x0004 /* SHOW_TEXT */, null);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE'].includes(p.tagName)) continue;
    if (p.closest && p.closest('svg')) continue;
    const t = (n.nodeValue || '').trim();
    if (t && /[\u4e00-\u9fff]/.test(t)) out.push(t);
  }
  return out;
}

const fs = require('fs');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
});
const w = dom.window, d = w.document;
/* 手动注入本地脚本（http origin 下相对路径不会自动加载） */
const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const s of srcs) {
  const code = fs.readFileSync(path.join(ROOT, s), 'utf8');
  try { w.eval(code); } catch (e) { errors.push(s + ' → ' + (e && e.message)); }
}

(async () => {
  await wait(1200);

  ok('页面无脚本错误', errors.length === 0, errors.slice(0, 3).join(' | '));
  ok('MR 引擎已启动', !!w.MR && !!w.MR.app);
  ok('prefs 模块已挂载', !!w.LATTICE_PREFS);

  const langBtn = d.getElementById('langBtn'), themeBtn = d.getElementById('themeBtn');
  ok('顶栏生成语言按钮', !!langBtn);
  ok('顶栏生成主题按钮', !!themeBtn);

  // 遍历各环节渲染
  const keys = ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'];
  try { w.MR.loadPaper('S1'); await wait(300); } catch (e) { }
  for (const k of keys) { try { w.MR.app.setView(k); await wait(150); } catch (e) { } }

  const zhBefore = zhTextNodes(d).length;
  ok('中文界面已渲染', zhBefore > 50, zhBefore + ' 个中文文本节点');

  // ---- 主题切换（停在含图表的环节，才能验证图表配色重映射）----
  try { w.MR.app.setView('figure'); await wait(500); } catch (e) { }
  const svgColored = d.querySelectorAll('svg [fill], svg [stroke]').length;
  ok('图形环节渲染出 SVG', svgColored > 20, svgColored + ' 个带色 SVG 节点');

  const t0 = d.documentElement.getAttribute('data-theme');
  themeBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const t1 = d.documentElement.getAttribute('data-theme');
  ok('主题切换生效', t0 !== t1, t0 + ' → ' + t1);
  ok('主题写入 localStorage', w.localStorage.getItem('lattice.theme') === t1);

  const figStyle = d.getElementById('lattice-fig-theme');
  const figCss = figStyle ? figStyle.textContent : '';
  if (t1 === 'dark') {
    ok('暗模式生成图表配色重映射', figCss.length > 100, figCss.length + ' 字节');
    /* 暗模式下新渲染的图表也要被接管 */
    try { w.MR.app.setView('analysis'); await wait(500); } catch (e) { }
    ok('暗模式下新图表也被重映射', (d.getElementById('lattice-fig-theme').textContent || '').length > 100);
  }

  themeBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(200);
  ok('主题可切回', d.documentElement.getAttribute('data-theme') === t0);

  // ---- 语言切换 ----
  langBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const zhAfter = zhTextNodes(d).length;
  const bodyText = d.body.textContent;
  ok('切换后中文节点显著减少', zhAfter < zhBefore * 0.6, zhBefore + ' → ' + zhAfter);
  ok('出现英文界面文案', /Upload Paper|Export Center|Run Full Pipeline/.test(bodyText));
  ok('html lang 变为 en', d.documentElement.getAttribute('lang') === 'en');
  ok('标题已英译', /Materials Research/.test(d.title), d.title);
  ok('语言写入 localStorage', w.localStorage.getItem('lattice.lang') === 'en');

  console.log('\n=== 英文模式下残留的中文文本（去重）===');
  const resid = [...new Set(zhTextNodes(d))].sort((a, b) => a.length - b.length);
  resid.slice(0, 70).forEach(t => console.log('  · ' + t.slice(0, 90)));
  console.log('  残留条数:', resid.length);

  // ---- 切回中文 ----
  d.getElementById('langBtn').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(700);
  const zhBack = zhTextNodes(d).length;
  ok('可切回中文', zhBack > zhAfter, zhAfter + ' → ' + zhBack);
  ok('中文文案已还原', /上传文献|导出中心/.test(d.body.textContent));
  ok('html lang 变回 zh-CN', d.documentElement.getAttribute('lang') === 'zh-CN');

  console.log(R.join('\n'));
  console.log('\n剩余错误:', errors.length ? errors.slice(0, 5) : '无');
  process.exit(R.some(r => r.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.error('测试异常', e && (e.stack || e.message || e)); process.exit(1); });
