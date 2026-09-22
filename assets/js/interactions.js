/* ============================================================
   LATTICE · 交互增强层
   - 键盘快捷键（1–0 跳环节 / ←→ 切换 / ? 帮助 / ⌘K 命令面板）
   - 命令面板（模糊搜索全 10 环节 + 常用动作）
   - Toast 轻提示
   - 复制到剪贴板（[data-copy] 委托 + 公式/参考文献复制按钮）
   - 移动端导航抽屉（修复 <860px 丢失导航）
   - 面板折叠
   - KPI / 指标数字滚动
   纯 vanilla JS，零依赖；全部为增量式，不改动既有视图逻辑。
   ============================================================ */
window.MR = window.MR || {};

(function () {
  'use strict';

  var IN = {};
  MR.interactions = IN;

  /* ---------- 工具 ---------- */
  function isTyping(t) {
    if (!t) return false;
    var tn = t.tagName;
    return tn === 'INPUT' || tn === 'TEXTAREA' || t.isContentEditable ||
      (t.getAttribute && t.getAttribute('contenteditable') === 'true');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function hl(text, q) {
    var e = esc(text);
    if (!q) return e;
    var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return e.replace(new RegExp('(' + safe + ')', 'ig'), '<mark class="cmdpal__hl">$1</mark>'); }
    catch (e2) { return e; }
  }

  /* ============================================================
     1. TOAST
     ============================================================ */
  var TOAST_IC = {
    ok: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sig: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 3.4v4.6M7 11.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="7" cy="2.3" r=".4" fill="currentColor"/></svg>',
    risk: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 2.5 12.5 11.5H1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 5.5v3M7 10.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    acc: '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="4.7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 4.3v5.4M4.3 7h5.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  var TOAST_DUR = 2400;
  MR.toast = function (msg, kind) {
    var wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : ' toast--acc');
    t.setAttribute('role', 'status');
    t.innerHTML = '<span class="toast__ic">' + (TOAST_IC[kind] || TOAST_IC.acc) + '</span>' +
      '<span class="toast__msg">' + msg + '</span>' +
      '<span class="toast__close" aria-hidden="true">&times;</span>' +
      '<span class="toast__bar"></span>';
    wrap.appendChild(t);
    var bar = t.querySelector('.toast__bar');
    if (bar) bar.style.animationDuration = TOAST_DUR + 'ms';
    var timer = null;
    function dismiss() {
      if (!t.parentNode) return;
      if (timer) { clearTimeout(timer); timer = null; }
      t.classList.remove('is-on');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }
    t.addEventListener('click', dismiss);
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    timer = setTimeout(dismiss, TOAST_DUR);
    return t;
  };

  /* ============================================================
     2. 复制到剪贴板
     ============================================================ */
  function copyText(text) {
    text = String(text == null ? '' : text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* 委托：任何带 data-copy 的元素点击即复制 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-copy]');
    if (!el) return;
    var val = el.getAttribute('data-copy') || (el.textContent || '').trim();
    copyText(val).then(function (ok) {
      if (ok) MR.toast('已复制到剪贴板', 'ok');
      else MR.toast('复制失败，请手动选择', 'risk');
    });
  });

  var COPY_IC = '<svg viewBox="0 0 12 12" width="11" height="11"><rect x="3" y="3" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2 8V2.5h5.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  var CHECK_IC = '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M2.5 6.5 5 9l4.5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* 给公式（.eq）与参考文献行（.ref-item）注入复制按钮 */
  function makeCopyBtn(text) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copybtn'; b.setAttribute('data-copy', text);
    b.innerHTML = COPY_IC + (text.length > 24 ? '' : '<span>复制</span>');
    var orig = b.innerHTML;
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      copyText(text).then(function (ok) {
        if (ok) {
          b.classList.add('is-done');
          b.innerHTML = CHECK_IC + '<span>已复制</span>';
          MR.toast('已复制到剪贴板', 'ok');
          setTimeout(function () { b.classList.remove('is-done'); b.innerHTML = orig; }, 1300);
        } else MR.toast('复制失败，请手动选择', 'risk');
      });
    });
    return b;
  }
  function enhanceCopy(host) {
    if (!host) return;
    host.querySelectorAll('.eq:not(textarea):not(input):not([data-copy-ready])').forEach(function (eq) {
      eq.setAttribute('data-copy-ready', '1');
      eq.appendChild(makeCopyBtn((eq.textContent || '').trim()));
    });
    host.querySelectorAll('.ref-item:not([data-copy-ready])').forEach(function (ri) {
      ri.setAttribute('data-copy-ready', '1');
      var txt = (ri.querySelector('.ref-item__t') || ri).textContent || '';
      ri.appendChild(makeCopyBtn(txt.trim()));
    });
  }

  /* ============================================================
     3. 面板折叠
     ============================================================ */
  function enhancePanels(host) {
    if (!host) return;
    host.querySelectorAll('.panel').forEach(function (p) {
      var head = p.querySelector(':scope > .panel__head');
      if (!head) return;
      /* 把 .panel__body / .panel__note 包进一个可动画的折叠容器（grid-rows 0fr/1fr） */
      if (!p.querySelector(':scope > .panel__collapse')) {
        var coll = document.createElement('div');
        coll.className = 'panel__collapse';
        var kids = p.querySelectorAll(':scope > .panel__body, :scope > .panel__note');
        for (var k = 0; k < kids.length; k++) coll.appendChild(kids[k]);
        head.parentNode.insertBefore(coll, head.nextSibling);
      }
      if (head.querySelector('.panel__toggle')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'panel__toggle'; b.setAttribute('aria-label', '折叠/展开面板'); b.setAttribute('aria-expanded', 'true');
      b.innerHTML = '<svg viewBox="0 0 14 14" width="13" height="13"><path d="M3.5 5.5 7 9l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var collapsed = p.classList.toggle('is-collapsed');
        b.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        MR.log('INFO', '面板 ' + (collapsed ? '已折叠' : '已展开'));
      });
      var acts = head.querySelector('.panel__acts');
      if (acts) head.insertBefore(b, acts); else head.appendChild(b);
    });
  }

  /* ============================================================
     4. 数字滚动
     ============================================================ */
  function fmtNum(v, dec) {
    return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function animateNumbers(host) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var sels = '.kpi__val, .metric__v, .gauge__num, .bigscore__num, .expert__sc b';
    host.querySelectorAll(sels).forEach(function (el) {
      var small = el.querySelector('small');
      var baseText = small ? (el.firstChild ? el.firstChild.nodeValue || '' : '') : el.textContent;
      var txt = String(baseText).replace(/,/g, '');
      var m = txt.match(/-?\d+(\.\d+)?/);
      if (!m) return;
      var target = parseFloat(m[0]);
      if (!isFinite(target)) return;
      var dec = (m[0].split('.')[1] || '').length;
      var pre = txt.slice(0, m.index);
      var post = txt.slice(m.index + m[0].length);
      var hasSmall = !!small;
      var t0 = performance.now(), dur = 540;
      function set(s) { if (hasSmall) { if (el.firstChild) el.firstChild.nodeValue = s; } else { el.textContent = s; } }
      function step(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        set(pre + fmtNum(target * e, dec) + post);
        if (p < 1) requestAnimationFrame(step);
        else set(pre + fmtNum(target, dec) + post);
      }
      requestAnimationFrame(step);
    });
  }

  /* ============================================================
     5. 命令面板
     ============================================================ */
  var CMD = { open: false, items: [], sel: 0, input: null, list: null, el: null };

  function cmdItems() {
    var items = [];
    (MR.STAGES || []).forEach(function (s) {
      items.push({
        group: '环节', t: '环节 ' + s.n + ' · ' + s.t, d: s.d,
        ic: MR.icon ? MR.icon(s.k, 14) : '', run: function () { MR.app.setView(s.k); }
      });
    });
    items.push({ group: '动作', t: '运行整条流水线', d: '依次跑完 10 个环节', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M4 2.8 11 7l-7 4.2z" fill="currentColor"/></svg>', run: function () { MR.app.runAll(); } });
    items.push({ group: '动作', t: '上传文献', d: '选择 DOCX / TXT / PDF 文件', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 10V2.5M7 2.5 4 5.5M7 2.5 10 5.5M2.5 11.5h9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', run: function () { MR.pick('file'); } });
    items.push({ group: '动作', t: '导出中心', d: '导出本环节可下载内容', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 2v7M7 9 4 6M7 9 10 6M2.5 11.5h9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', run: function () { if (MR.views && MR.views.imp) MR.views.imp.exportCenter(); } });
    /* 图表风格 */
    [['sci', 'SCI / NPG 风格'], ['okabe', 'Okabe–Ito 色盲安全'], ['origin', 'Origin 默认'], ['glm', 'GLM 莫兰迪']].forEach(function (p) {
      items.push({ group: '图表风格', t: '切换为 · ' + p[1], d: '联动全部图形配色', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="4" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="10" cy="5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>', run: function () { setFigStyle(p[0]); } });
    });
    /* 强调色 */
    [['teal', '深青（默认）'], ['indigo', '靛蓝'], ['iron', '铁锈棕'], ['moss', '苔绿']].forEach(function (p) {
      items.push({ group: '主题', t: '强调色 · ' + p[1], d: '覆盖全站强调色', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="currentColor"/></svg>', run: function () { setAcc(p[0]); } });
    });
    /* 信息密度 / 格纸 */
    items.push({ group: '布局', t: '信息密度 · 紧凑', d: '缩小行高与间距', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>', run: function () { setDensity('compact'); } });
    items.push({ group: '布局', t: '信息密度 · 标准', d: '恢复默认间距', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>', run: function () { setDensity('cozy'); } });
    items.push({ group: '布局', t: '毫米格纸 · 切换', d: '开关网格底纹', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M2 2h10v10H2z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2 6h10M2 10h10M6 2v10M10 2v10" stroke="currentColor" stroke-width=".6"/></svg>', run: function () { setGrid(); } });
    items.push({ group: '帮助', t: '查看全部快捷键', d: '打开快捷键说明', ic: '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="4.7" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.3 5.4c0-1 1-1.7 1.9-1.4.7.2 1.1 1 .9 1.7-.2.7-1 1-1.6.8M7 9.4v.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>', run: function () { openHelp(); } });
    return items;
  }
  function setFigStyle(v) {
    if (!MR.stylePresets || !MR.stylePresets[v]) return;
    MR.state.figStyle = v;
    var p = MR.stylePresets[v].palette;
    Object.keys(p).forEach(function (k) { MR.colors[k] = p[k]; });
    var row = document.getElementById('paletteRow');
    if (row) row.querySelectorAll('input[data-color]').forEach(function (i) { i.value = MR.colors[i.getAttribute('data-color')]; });
    MR.log('INFO', '图表风格切换为 <b>' + v + '</b>，配色同步更新');
    if (typeof renderMain === 'function') renderMain();
    MR.toast('已切换图表风格', 'ok');
  }
  function setAcc(v) {
    var app = document.getElementById('app');
    if (app) app.setAttribute('data-acc', v);
    document.querySelectorAll('#swatches .sw').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-acc') === v); });
    if (typeof renderMain === 'function') renderMain();
    MR.toast('已更新强调色', 'ok');
  }
  function setDensity(v) { var app = document.getElementById('app'); if (app) app.setAttribute('data-density', v); MR.toast('信息密度 · ' + (v === 'compact' ? '紧凑' : '标准'), 'ok'); }
  function setGrid() {
    var app = document.getElementById('app'); if (!app) return;
    var off = app.getAttribute('data-grid') === 'off';
    app.setAttribute('data-grid', off ? 'on' : 'off');
    MR.toast('毫米格纸 · ' + (off ? '开' : '关'), 'ok');
  }

  function cmdOpen() {
    if (CMD.open) return;
    CMD.open = true; CMD.items = cmdItems(); CMD.sel = 0;
    CMD.el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    CMD.input.value = '';
    cmdRender('');
    setTimeout(function () { CMD.input.focus(); }, 20);
  }
  function cmdClose() {
    if (!CMD.open) return;
    CMD.open = false;
    CMD.el.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function cmdRender(q) {
    q = (q || '').trim().toLowerCase();
    var list = CMD.list;
    var filtered = CMD.items.filter(function (it) {
      if (!q) return true;
      return (it.t + ' ' + it.d + ' ' + (it.group || '')).toLowerCase().indexOf(q) >= 0;
    });
    if (CMD.sel >= filtered.length) CMD.sel = 0;
    var html = '', lastGroup = null;
    if (!filtered.length) {
      list.innerHTML = '<div class="cmdpal__empty"><svg viewBox="0 0 16 16" width="22" height="22"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10.4 10.4 14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>没有匹配项</span><em>试试「上传」「运行」「环节」</em></div>';
      CMD._filtered = [];
      return;
    }
    filtered.forEach(function (it, i) {
      if (it.group && it.group !== lastGroup) { html += '<div class="cmdpal__group">' + esc(it.group) + '</div>'; lastGroup = it.group; }
      html += '<button type="button" class="cmdpal__item' + (i === CMD.sel ? ' is-sel' : '') + '" data-i="' + i + '">' +
        '<span class="cmdpal__ic">' + (it.ic || '') + '</span>' +
        '<span class="cmdpal__txt"><span class="cmdpal__t">' + hl(it.t, q) + '</span><span class="cmdpal__d">' + hl(it.d || '', q) + '</span></span>' +
        (i === CMD.sel ? '<span class="cmdpal__go" aria-hidden="true">↵</span>' : '') + '</button>';
    });
    list.innerHTML = html;
    CMD._filtered = filtered;
    var selEl = list.querySelector('.cmdpal__item.is-sel');
    if (selEl && typeof selEl.scrollIntoView === 'function') selEl.scrollIntoView({ block: 'nearest' });
  }
  function cmdRun(i) {
    var it = (CMD._filtered || [])[i == null ? CMD.sel : i];
    if (!it) return;
    cmdClose();
    setTimeout(function () { it.run(); }, 30);
  }

  function buildCmdPal() {
    var el = document.createElement('div');
    el.className = 'cmdpal';
    el.innerHTML =
      '<div class="cmdpal__sheet" role="dialog" aria-modal="true" aria-label="命令面板">' +
      '<div class="cmdpal__search"><svg viewBox="0 0 14 14" width="15" height="15"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9.2 9.2 12 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
      '<input type="text" class="cmdpal__input" placeholder="搜索环节、动作、主题…" aria-label="搜索">' +
      '<span class="cmdpal__hint">ESC 关闭</span></div>' +
      '<div class="cmdpal__list"></div>' +
      '<div class="cmdpal__foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> 选择</span><span><span class="kbd">↵</span> 执行</span><span style="margin-left:auto"><span class="kbd">⌘</span><span class="kbd">K</span> 随时唤起</span></div>' +
      '</div>';
    document.body.appendChild(el);
    CMD.el = el;
    CMD.input = el.querySelector('.cmdpal__input');
    CMD.list = el.querySelector('.cmdpal__list');

    CMD.input.addEventListener('input', function () { cmdRender(CMD.input.value); });
    CMD.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); CMD.sel = Math.min((CMD._filtered || []).length - 1, CMD.sel + 1); cmdRender(CMD.input.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); CMD.sel = Math.max(0, CMD.sel - 1); cmdRender(CMD.input.value); }
      else if (e.key === 'Enter') { e.preventDefault(); cmdRun(); }
      else if (e.key === 'Escape') { e.preventDefault(); cmdClose(); }
    });
    el.addEventListener('click', function (e) {
      if (e.target === el) cmdClose();
      var item = e.target.closest && e.target.closest('.cmdpal__item');
      if (item) { CMD.sel = +item.getAttribute('data-i'); cmdRun(); }
    });
  }

  /* ============================================================
     6. 快捷键帮助
     ============================================================ */
  function openHelp() {
    var rows = [
      ['⌘ / Ctrl + K', '打开命令面板（搜索环节与动作）'],
      ['1 – 0', '跳转到对应环节（1=环节01 … 0=环节10）'],
      ['← / →', '切换到上一 / 下一环节'],
      ['?', '打开本快捷键说明'],
      ['Esc', '关闭弹窗 / 命令面板 / 移动端导航'],
      ['点击引用 [n]', '查看文献来源与 DOI'],
      ['拖拽文件到上传区', '导入论文（DOCX / TXT / PDF）']
    ];
    var body = '<div class="dl">' + rows.map(function (r) {
      return '<dt>' + r[0].split(' ').map(function (k) {
        return /[a-zA-Z0-9+]/i.test(k) || k === '←' || k === '→' ? '<span class="kbd">' + esc(k) + '</span>' : esc(k);
      }).join(' ') + '</dt><dd>' + esc(r[1]) + '</dd>';
    }).join('') + '</div>';
    MR.modal.open('键盘快捷键', body, '<button class="btn" data-close="1">知道了</button>');
  }

  /* ============================================================
     7. 移动端导航抽屉
     ============================================================ */
  function buildMobileNav() {
    var left = document.querySelector('.topbar__left');
    if (left) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'navtoggle'; btn.id = 'navToggle'; btn.setAttribute('aria-label', '打开导航');
      btn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      left.insertBefore(btn, left.firstChild);
      btn.addEventListener('click', function () {
        var app = document.getElementById('app');
        app.setAttribute('data-mobnav', app.getAttribute('data-mobnav') === 'open' ? 'off' : 'open');
      });
    }
    var bd = document.createElement('div');
    bd.className = 'navbackdrop'; bd.id = 'navBackdrop';
    document.body.appendChild(bd);
    bd.addEventListener('click', function () { document.getElementById('app').setAttribute('data-mobnav', 'off'); });
    /* 点击导航项后自动收起 */
    document.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('[data-goto]');
      if (g) document.getElementById('app').setAttribute('data-mobnav', 'off');
    });
  }

  /* ============================================================
     8. 键盘总控
     ============================================================ */
  function onKey(e) {
    /* 命令面板开启时，交给面板自身的 input 处理 */
    if (CMD.open) return;
    /* 组合键：⌘/Ctrl + K 唤起命令面板 */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); cmdOpen(); return;
    }
    if (isTyping(document.activeElement)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '?') { e.preventDefault(); openHelp(); return; }
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); jumpStage(+e.key - 1); return; }
    if (e.key === '0') { e.preventDefault(); jumpStage(9); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepStage(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepStage(-1); return; }
  }
  function jumpStage(i) {
    var s = (MR.STAGES || [])[i];
    if (s && MR.app) { MR.app.setView(s.k); MR.toast('环节 ' + s.n + ' · ' + s.t, 'acc'); }
  }
  function stepStage(dir) {
    var arr = MR.STAGES || [], cur = MR.state ? MR.state.view : null;
    var idx = arr.map(function (x) { return x.k; }).indexOf(cur);
    if (idx < 0) return;
    var n = arr[idx + dir];
    if (n && MR.app) MR.app.setView(n.k);
  }

  /* ============================================================
     9. 渲染后增强 + 数字滚动
     ============================================================ */
  var lastView = null;
  function enhanceAfterRender(host) {
    if (!host) return;
    enhanceCopy(host);
    enhancePanels(host);
    if (MR.state && MR.state.view !== lastView) {
      animateNumbers(host);
      lastView = MR.state.view;
    }
  }
  function wrapRenderMain() {
    if (typeof renderMain !== 'function') return;
    var _rm = renderMain;
    renderMain = function () {
      _rm();
      enhanceAfterRender(document.getElementById('main'));
    };
  }

  /* ============================================================
     10. 初始化
     ============================================================ */
  function init() {
    buildCmdPal();
    buildMobileNav();
    wrapRenderMain();
    document.addEventListener('keydown', onKey);
    /* 初次渲染增强（boot 已先执行过一次 render） */
    enhanceAfterRender(document.getElementById('main'));
    lastView = MR.state ? MR.state.view : null;
    MR.log('INFO', '交互增强已加载 · 按 <b>⌘/Ctrl + K</b> 唤起命令面板 · <b>?</b> 查看快捷键');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
