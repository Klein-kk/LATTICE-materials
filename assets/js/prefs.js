/* ============================================================
   LATTICE · 语言 / 主题 运行时
   依赖：i18n-dict.js（window.LATTICE_I18N）
   说明：界面文案由本模块在 DOM 层翻译；论文抽取出的原料、指标、
        变量名与引用的原文属于数据，保持原文不译。
   ============================================================ */
(function () {
  var DICT = window.LATTICE_I18N || { exact: {}, phrases: {}, regex: [] };
  var LS_LANG = 'lattice.lang', LS_THEME = 'lattice.theme';
  var EXACT = DICT.exact || {};
  var PHRASES = DICT.phrases || {};
  var RULES = DICT.regex || [];
  /* 长片段优先，避免短规则抢先吃掉长句 */
  var PKEYS = Object.keys(PHRASES).sort(function (a, b) { return b.length - a.length; });

  var lang = 'zh', theme = 'light';
  var srcMap = typeof WeakMap === 'function' ? new WeakMap() : null;   // 文本节点 → 原文
  var cache = {};
  var origTitle = document.title;
  var origDesc = (document.querySelector('meta[name="description"]') || {}).content || '';

  /* ---------------- 偏好读取 ---------------- */
  try {
    var l = localStorage.getItem(LS_LANG); if (l === 'zh' || l === 'en') lang = l;
    var t = localStorage.getItem(LS_THEME); if (t === 'dark' || t === 'light') theme = t;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (e) { }

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');

  /* ---------------- 颜色换算 ---------------- */
  function parseHex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var l = (mx + mn) / 2, s = 0, h = 0;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (!s) { var v = l * 255; return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  /* 亮色 → 暗色：中性色按亮度对调，彩色保色相只提亮 */
  function remap(hex) {
    var c = parseHex(hex), hsl = rgb2hsl(c[0], c[1], c[2]);
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (s < 0.14) {
      if (l > 0.92) return '#161B21';
      if (l > 0.75) return '#3D4650';
      if (l < 0.22) return '#C3CBD2';
      if (l < 0.50) return '#8A939B';
      return '#A8B0B7';
    }
    var nl = l < 0.42 ? Math.min(0.72, l + 0.32) : (l > 0.80 ? 0.74 : l + 0.04);
    var rgb = hsl2rgb(h, Math.min(0.95, s * 1.02), nl);
    return toHex(rgb[0], rgb[1], rgb[2]);
  }

  /* ---------------- 图表 SVG 重映射 ----------------
     figures2/3 的 SVG 是硬编码配色，用属性选择器按主题改色，
     不改 JS，也不影响「导出 SVG」的原始配色（导出在重绘时进行）。 */
  var figStyle = null, figTimer = null;
  function remapFigures() {
    if (!figStyle) {
      figStyle = document.createElement('style');
      figStyle.id = 'lattice-fig-theme';
      document.head.appendChild(figStyle);
    }
    if (theme !== 'dark') { figStyle.textContent = ''; return; }
    var seen = {};
    var nodes = document.querySelectorAll('svg [fill], svg [stroke], svg [stop-color]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], attrs = ['fill', 'stroke', 'stop-color'];
      for (var j = 0; j < attrs.length; j++) {
        var v = el.getAttribute(attrs[j]);
        if (v && /^#[0-9a-fA-F]{3,8}$/.test(v)) seen[v.toLowerCase()] = 1;
      }
    }
    var css = '';
    Object.keys(seen).forEach(function (c) {
      var to = remap(c);
      if (to === c) return;
      css += 'html[data-theme="dark"] svg [fill="' + c + '"]{fill:' + to + '!important}' +
        'html[data-theme="dark"] svg [stroke="' + c + '"]{stroke:' + to + '!important}' +
        'html[data-theme="dark"] svg [stop-color="' + c + '"]{stop-color:' + to + '!important}';
    });
    figStyle.textContent = css;
  }
  function scheduleFigures() {
    if (figTimer) return;
    figTimer = setTimeout(function () { figTimer = null; remapFigures(); }, 120);
  }

  /* ---------------- 翻译 ---------------- */
  function tr(s) {
    if (lang !== 'en') return s;
    if (cache[s] !== undefined) return cache[s];
    var out = s, i, k;

    var trimmed = s.trim();
    if (EXACT[s] !== undefined) out = EXACT[s];
    else if (EXACT[trimmed] !== undefined) out = EXACT[trimmed];
    else {
      for (i = 0; i < PKEYS.length; i++) {
        k = PKEYS[i];
        if (out.indexOf(k) >= 0) out = out.split(k).join(PHRASES[k]);
      }
      for (i = 0; i < RULES.length; i++) {
        var r = RULES[i];
        try { out = out.replace(r[0], r[1]); } catch (e) { }
      }
      out = out.replace(/\s{2,}/g, ' ');
    }
    cache[s] = out;
    return out;
  }

  var SKIP_TAG = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SVG: 1, PATH: 1 };
  function translateText(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    var walker = document.createTreeWalker(root, window.NodeFilter.SHOW_TEXT, null, false);
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) {
      var node = list[i], p = node.parentElement;
      if (!p || SKIP_TAG[p.tagName]) continue;
      if (p.namespaceURI === 'http://www.w3.org/2000/svg') continue;
      if (p.closest && p.closest('svg')) continue;
      var src = node.nodeValue;
      if (!src) continue;
      if (lang === 'en') {
        /* 译文中不再含中文，因此还原分支不能按「含中文」过滤 */
        if (!/[\u4e00-\u9fff]/.test(src)) continue;
        if (srcMap && !srcMap.has(node)) srcMap.set(node, src);
        var out = tr(src);
        if (out !== src) node.nodeValue = out;
      } else if (srcMap && srcMap.has(node)) {
        node.nodeValue = srcMap.get(node);
      }
    }
  }
  function translateAttrs(root) {
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i], attrs = ['placeholder', 'title', 'aria-label'];
      for (var j = 0; j < attrs.length; j++) {
        var a = attrs[j], v = el.getAttribute(a);
        if (!v) continue;
        if (lang === 'en') {
          if (!/[\u4e00-\u9fff]/.test(v)) continue;
          if (!el.getAttribute('data-src-' + a)) el.setAttribute('data-src-' + a, v);
          el.setAttribute(a, tr(v));
        } else {
          var o = el.getAttribute('data-src-' + a);
          if (o) el.setAttribute(a, o);
        }
      }
    }
  }
  function decorate(root) {
    translateText(root);
    translateAttrs(root);
  }

  /* ---------------- 应用 ---------------- */
  function applyLang() {
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');

    /* 切回中文：优先用保存的原文还原（日志等历史节点），再重渲染当前视图 */
    if (lang === 'zh') {
      decorate(document.body);
      try {
        if (window.MR && window.MR.app && window.MR.app.render) window.MR.app.render();
      } catch (e) { }
    } else {
      decorate(document.body);
    }

    document.title = lang === 'en'
      ? 'LATTICE · Materials Research Automation Platform'
      : origTitle;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = lang === 'en'
      ? 'A research automation platform for all domains of materials science: upload any materials paper and the platform extracts its real reagents, instruments, variables and indicators.'
      : origDesc;

    var btn = document.getElementById('langBtn');
    if (btn) {
      btn.textContent = lang === 'en' ? 'EN' : '中';
      btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换到英文');
      btn.title = lang === 'en' ? 'Switch to Chinese' : 'Switch to English';
    }
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    remapFigures();
    var btn = document.getElementById('themeBtn');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  /* ---------------- 顶栏控件 ---------------- */
  function buildControls() {
    var right = document.querySelector('.topbar__right');
    if (!right) return;
    var credit = right.querySelector('.credit');

    var langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.id = 'langBtn';
    langBtn.className = 'prefbtn';
    langBtn.textContent = lang === 'en' ? 'EN' : '中';
    langBtn.addEventListener('click', function () { setLang(lang === 'en' ? 'zh' : 'en'); });

    var themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.id = 'themeBtn';
    themeBtn.className = 'prefbtn';
    themeBtn.innerHTML =
      '<svg class="ico-moon" viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">' +
      '<path d="M11.4 9.2A5.5 5.5 0 0 1 4.8 2.6 5.6 5.6 0 1 0 11.4 9.2z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
      '<svg class="ico-sun" viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">' +
      '<circle cx="7" cy="7" r="2.7" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
      '<path d="M7 1.1v1.5M7 11.4v1.5M1.1 7h1.5M11.4 7h1.5M2.9 2.9l1 1M10.1 10.1l1 1M11.1 2.9l-1 1M3.9 10.1l-1 1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';
    themeBtn.addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark'); });

    if (credit) { right.insertBefore(langBtn, credit); right.insertBefore(themeBtn, credit); }
    else { right.appendChild(langBtn); right.appendChild(themeBtn); }

    var b = document.getElementById('langBtn');
    if (b) { b.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换到英文'); b.title = b.getAttribute('aria-label'); }
    var t2 = document.getElementById('themeBtn');
    if (t2) { t2.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'); t2.title = t2.getAttribute('aria-label'); }
  }

  function setLang(v) {
    lang = (v === 'en') ? 'en' : 'zh';
    try { localStorage.setItem(LS_LANG, lang); } catch (e) { }
    cache = {};
    applyLang();
  }
  function setTheme(v) {
    theme = (v === 'dark') ? 'dark' : 'light';
    try { localStorage.setItem(LS_THEME, theme); } catch (e) { }
    applyTheme();
  }

  /* ---------------- 动态内容 ---------------- */
  if (window.MutationObserver) {
    var obs = new MutationObserver(function (muts) {
      var touched = false;
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1) { decorate(n); touched = true; }
        }
      }
      if (touched) scheduleFigures();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- 启动 ---------------- */
  buildControls();
  if (lang === 'en') applyLang(); else applyLang();
  applyTheme();

  window.LATTICE_PREFS = {
    setLang: setLang,
    setTheme: setTheme,
    toggleLang: function () { setLang(lang === 'en' ? 'zh' : 'en'); },
    toggleTheme: function () { setTheme(theme === 'dark' ? 'light' : 'dark'); },
    get lang() { return lang; },
    get theme() { return theme; },
    t: tr
  };
})();
