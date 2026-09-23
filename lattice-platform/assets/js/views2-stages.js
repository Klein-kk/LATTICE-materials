/* ============================================================
   LATTICE · 十环节视图（论文驱动）
   ============================================================ */
window.MR = window.MR || {};
MR.views2 = {};

(function () {
  function PF() { return MR.state.profile || { materials: [], instruments: [], variables: [], perf: [], chars: [], steps: [], formulation: [], references: [], standards: [], matrix: [], missing: [], peakData: { theta: [] }, ftir: { bands: [], assign: {} }, sem: [] }; }
  function AN() { return MR.state.analysis || { materials: [], instruments: [], variables: [], indicators: [], steps: [], references: [], standards: [], sections: [] }; }
  function renderInto(el, build) {
    if (!el) return;
    var last = -1;
    function go() { var w = Math.max(260, Math.round(el.clientWidth || 700)); if (Math.abs(w - last) < 2) return; last = w; el.innerHTML = build(w); }
    go();
    if (window.ResizeObserver && !el.__ro) { el.__ro = new ResizeObserver(go); el.__ro.observe(el); }
  }
  function dlPNG(host, name) {
    var svg = host && host.querySelector ? host.querySelector('svg') : host;
    if (!svg) return;
    var clone = svg.cloneNode(true), st = window.getComputedStyle(document.documentElement);
    clone.querySelectorAll('*').forEach(function (n) {
      ['fill', 'stroke'].forEach(function (a) {
        var v = n.getAttribute(a); if (!v) return;
        var m = v.match(/^var\((--[a-z0-9-]+)\)$/i);
        if (m) n.setAttribute(a, st.getPropertyValue(m[1]).trim() || '#333');
      });
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var w = parseFloat(svg.getAttribute('width')) || 900, h = parseFloat(svg.getAttribute('height')) || 500;
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        MR.log('OK', '已导出 PNG：<b>' + name + '</b>');
      });
    };
    img.onerror = function () { MR.log('WARN', 'PNG 导出失败，请改用 SVG'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  }
  function figBox(id, title, tag) {
    return '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t">' + title + '</span>' +
      '<span class="figbox__tag">' + tag + '</span><div class="figbox__acts">' +
      '<button class="btn btn--sm" data-svg="' + id + '" data-name="' + title.replace(/[^\w\u4e00-\u9fa5]/g, '_') + '.svg">导出 SVG</button>' +
      '<button class="btn btn--sm" data-png="' + id + '" data-name="' + title.replace(/[^\w\u4e00-\u9fa5]/g, '_') + '.png">导出 PNG</button>' +
      '</div></div><div class="figbox__body" id="' + id + '"></div></div>';
  }
  function bindFig(host) {
    host.querySelectorAll('[data-svg]').forEach(function (b) {
      b.addEventListener('click', function () { MR.dlSVG(document.getElementById(b.getAttribute('data-svg')), b.getAttribute('data-name')); });
    });
    host.querySelectorAll('[data-png]').forEach(function (b) {
      b.addEventListener('click', function () { dlPNG(document.getElementById(b.getAttribute('data-png')), b.getAttribute('data-name')); });
    });
  }
  function noPaper() {
    return MR.note('当前尚未载入论文。请回到<b>环节 01</b> 上传你的文献，或选择一篇内置论文。所有后续环节都从论文内容出发，没有论文就没有可分析的对象。', 'sig', 'review1');
  }

  /* ============================================================
     综述 / 展望类文献：概念路线 · 对比矩阵 · 年份演进
     综述没有变量与实验步骤（体裁使然，不是抽取失败），因此后续分析改用
     "原文出现过的技术概念"来承载：概念类别 → 路线图；概念频次 → 对比矩阵；
     引用年份频次 → 演进时间线。不引入任何原文没有的内容。
     ============================================================ */
  function txtW(s, fs) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += /[\u4e00-\u9fa5]/.test(s.charAt(i)) ? fs : fs * 0.56;
    return w;
  }
  function conceptData() {
    var an = AN();
    if (!an || an.paperType !== 'review') return null;
    var cs = (an.concepts || []).filter(function (c) { return c.items && c.items.length; });
    if (!cs.length) return null;
    return { cats: cs, timeline: (an.timeline || []) };
  }
  var CF_CSS = '<style>' +
    '@keyframes cfFade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}' +
    '@keyframes cfDraw{from{stroke-dashoffset:var(--len,600)}to{stroke-dashoffset:0}}' +
    '@keyframes cfGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}' +
    '@keyframes cfUp{from{transform:scaleY(0)}to{transform:scaleY(1)}}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}' +
    '</style>';
  function cfPalette() {
    var c = MR.colors || {};
    return [c.sub, c.link, c.oxi, c.ros, c.bacteria, c.anti].filter(Boolean);
  }
  function cfConceptPanel() {
    if (!conceptData()) return '';
    return MR.panel({
      title: '综述类文献 · 概念路线与演进', meta: '按原文概念与年份频次生成', icon: 'lit', pad: true, cls: 'panel--acc',
      body: '<div class="mono-xs" style="margin-bottom:11px">这篇文献被判定为<b>综述 / 展望</b>类：没有变量与实验步骤（这是体裁使然，不是抽取失败）。平台因此改用<b>原文出现过的技术概念</b>来承载后续分析 —— 概念路线图、概念对比矩阵、年份演进时间线。三张图全部只统计原文词频，不引入外部知识。</div>' +
        figBox('cfRoute', '概念路线图（概念 → 类别）', '按原文概念类别') +
        '<div class="grid g-2">' +
        figBox('cfMatrix', '概念对比矩阵（类别 × 概念 × 频次）', 'grouped bars') +
        figBox('cfTime', '年份演进时间线（引用年份频次）', 'timeline') +
        '</div>'
    }) + '<div class="mb-4"></div>';
  }
  function cfRoute(w) {
    var d = conceptData(); if (!d) return '';
    var cats = d.cats.slice(0, 6), FS = 9.6, LBLW = 138, GAPX = 20, avail = Math.max(160, w - LBLW - GAPX - 62);
    var rows = cats.map(function (c) {
      var lines = [[]], used = 0;
      c.items.slice(0, 5).forEach(function (it) {
        var label = it.t + '  ×' + it.n, pw = txtW(label, FS) + 15;
        if (used + pw > avail && lines[lines.length - 1].length) { lines.push([]); used = 0; }
        lines[lines.length - 1].push({ label: label, pw: pw });
        used += pw + 6;
      });
      return { cat: c.cat, lines: lines, h: 20 + lines.length * 23 };
    });
    var H = 14;
    rows.forEach(function (r) { H += r.h + 10; });
    var cols = cfPalette(), s = CF_CSS + '<svg viewBox="0 0 ' + w + ' ' + H + '" width="' + w + '" height="' + H + '" style="font-family:var(--mono,ui-monospace,monospace)">';
    s += '<line x1="15" y1="10" x2="15" y2="' + (H - 12) + '" stroke="var(--line-strong,#CFD3D8)" stroke-width="1.5" stroke-dasharray="' + (H - 20) + '" stroke-dashoffset="' + (H - 20) + '" style="--len:' + (H - 20) + ';animation:cfDraw 1.15s cubic-bezier(.3,.8,.3,1) forwards"/>';
    var y = 8;
    rows.forEach(function (r, i) {
      var col = cols[i % cols.length];
      s += '<g style="animation:cfFade .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:' + (90 + i * 80) + 'ms">';
      s += '<circle cx="15" cy="' + (y + 13) + '" r="4.2" fill="' + col + '"/>';
      s += '<path d="M19 ' + (y + 13) + ' H' + (28 + LBLW) + '" stroke="' + col + '" stroke-width="1.1" opacity=".5"/>';
      s += '<rect x="28" y="' + y + '" width="' + LBLW + '" height="26" rx="4" fill="' + col + '"/>';
      s += '<text x="' + (28 + LBLW / 2) + '" y="' + (y + 16.6) + '" font-size="' + FS + '" fill="#fff" text-anchor="middle">' + MR.esc(r.cat) + '</text>';
      r.lines.forEach(function (ln, li) {
        var x = 28 + LBLW + GAPX;
        ln.forEach(function (p) {
          var yy = y + li * 23 + 3;
          s += '<rect x="' + x + '" y="' + yy + '" width="' + p.pw + '" height="20" rx="10" fill="' + col + '" opacity=".09"/>';
          s += '<rect x="' + x + '" y="' + yy + '" width="' + p.pw + '" height="20" rx="10" fill="none" stroke="' + col + '" stroke-width=".7" opacity=".38"/>';
          s += '<text x="' + (x + p.pw / 2) + '" y="' + (yy + 13.4) + '" font-size="' + FS + '" fill="var(--ink-2,#4C5258)" text-anchor="middle">' + MR.esc(p.label) + '</text>';
          x += p.pw + 6;
        });
      });
      s += '</g>';
      y += r.h + 10;
    });
    s += '</svg>';
    return s;
  }
  function cfMatrix(w) {
    var d = conceptData(); if (!d) return '';
    var cats = d.cats.slice(0, 6), cols = cfPalette(), FS = 9.4;
    var LAB = Math.min(170, Math.max(96, Math.round(w * 0.34)));
    var maxN = 1;
    cats.forEach(function (c) { c.items.forEach(function (it) { if (it.n > maxN) maxN = it.n; }); });
    var rows = [];
    cats.forEach(function (c, ci) { c.items.slice(0, 4).forEach(function (it, i) { rows.push({ col: cols[ci % cols.length], cat: c.cat, first: i === 0, label: it.t, n: it.n }); }); });
    /* 类别图例：单类别或色带不易分辨时，靠图例把颜色和类别对应起来 */
    var legend = [], lx = 10, ly = 0, lrowH = 15;
    cats.forEach(function (c, ci) {
      var name = String(c.cat);
      var need = 14 + txtW(name, 8.6) + 14;
      if (lx + need > w - 10) { lx = 10; ly += lrowH; }
      legend.push({ x: lx, y: ly, t: name, col: cols[ci % cols.length] });
      lx += need;
    });
    var legendH = legend.length ? (ly + lrowH + 6) : 0;
    var rowH = 18, top = 30, H = top + rows.length * rowH + 14 + legendH;
    var barW = Math.max(40, w - LAB - 52), s = CF_CSS + '<svg viewBox="0 0 ' + w + ' ' + H + '" width="' + w + '" height="' + H + '" style="font-family:var(--mono,ui-monospace,monospace)">';
    s += '<text x="10" y="15" font-size="9" fill="var(--ink-3,#868D94)">概念（按类别分组）</text>';
    s += '<text x="' + LAB + '" y="15" font-size="9" fill="var(--ink-3,#868D94)">原文出现频次</text>';
    s += '<line x1="' + (LAB - 8) + '" y1="20" x2="' + (LAB + barW + 30) + '" y2="20" stroke="var(--line-2,#EFF0F2)"/>';
    var y = top;
    rows.forEach(function (r, i) {
      s += '<g style="animation:cfFade .42s cubic-bezier(.2,.7,.2,1) both;animation-delay:' + (i * 42) + 'ms">';
      s += '<text x="' + (LAB - 14) + '" y="' + (y + 11) + '" font-size="' + FS + '" fill="var(--ink-2,#4C5258)" text-anchor="end">' + MR.esc(String(r.label).slice(0, 22)) + '</text>';
      var bwid = Math.max(2, r.n / maxN * barW);
      s += '<rect x="' + LAB + '" y="' + (y + 2) + '" width="' + bwid + '" height="11" rx="2.5" fill="' + r.col + '" style="transform-box:fill-box;transform-origin:left center;animation:cfGrow .58s cubic-bezier(.2,.8,.25,1) both;animation-delay:' + (i * 42 + 90) + 'ms"/>';
      s += '<text x="' + (LAB + bwid + 6) + '" y="' + (y + 11) + '" font-size="9" fill="var(--ink-3,#868D94)">' + r.n + '</text>';
      s += '</g>';
      y += rowH;
    });
    y += 6;
    legend.forEach(function (g) {
      s += '<g><rect x="' + g.x + '" y="' + (y + g.y + 2) + '" width="8" height="8" rx="2" fill="' + g.col + '"/>' +
        '<text x="' + (g.x + 12) + '" y="' + (y + g.y + 9.5) + '" font-size="8.6" fill="var(--ink-3,#868D94)">' + MR.esc(g.t) + '</text></g>';
    });
    s += '</svg>';
    return s;
  }
  function cfTime(w) {
    var d = conceptData(); if (!d || !d.timeline.length) return '';
    var ys = d.timeline.slice(-26), maxN = 1;
    ys.forEach(function (t) { if (t.n > maxN) maxN = t.n; });
    var H = 186, top = 30, bot = 30, left = 30, right = 12;
    var bw = Math.max(6, (w - left - right) / ys.length), plot = H - top - bot;
    var s = CF_CSS + '<svg viewBox="0 0 ' + w + ' ' + H + '" width="' + w + '" height="' + H + '" style="font-family:var(--mono,ui-monospace,monospace)">';
    s += '<text x="10" y="14" font-size="9" fill="var(--ink-3,#868D94)">引用年份出现频次（原文中出现 ≥2 次的年份）</text>';
    [0, 0.5, 1].forEach(function (f) {
      var yy = top + plot * (1 - f);
      s += '<line x1="' + left + '" y1="' + yy + '" x2="' + (w - right) + '" y2="' + yy + '" stroke="var(--line-2,#EFF0F2)"/>';
      s += '<text x="' + (left - 5) + '" y="' + (yy + 3) + '" font-size="8" fill="var(--ink-4,#ABAEB2)" text-anchor="end">' + Math.round(maxN * f) + '</text>';
    });
    ys.forEach(function (t, i) {
      var h = Math.max(2, t.n / maxN * plot), x = left + i * bw + bw * 0.18, bwid = bw * 0.64;
      var col = t.n >= maxN * 0.7 ? (MR.colors.sub) : (MR.colors.link);
      s += '<rect x="' + x + '" y="' + (top + plot - h) + '" width="' + bwid + '" height="' + h + '" rx="2" fill="' + col + '" opacity=".9" style="transform-box:fill-box;transform-origin:center bottom;animation:cfUp .6s cubic-bezier(.2,.8,.25,1) both;animation-delay:' + (i * 34) + 'ms"/>';
      s += '<text x="' + (x + bwid / 2) + '" y="' + (top + plot - h - 4) + '" font-size="8" fill="var(--ink-3,#868D94)" text-anchor="middle">' + t.n + '</text>';
      if (i % 2 === 0 || ys.length <= 14) s += '<text x="' + (x + bwid / 2) + '" y="' + (H - bot + 14) + '" font-size="8" fill="var(--ink-3,#868D94)" text-anchor="middle">' + String(t.y).slice(2) + '</text>';
    });
    s += '<line x1="' + left + '" y1="' + (top + plot) + '" x2="' + (w - right) + '" y2="' + (top + plot) + '" stroke="var(--line-strong,#CFD3D8)"/>';
    s += '</svg>';
    return s;
  }
  function cfDraw(host) {
    if (!conceptData() || !host) return;
    [['#cfRoute', cfRoute], ['#cfMatrix', cfMatrix], ['#cfTime', cfTime]].forEach(function (pair) {
      var el = host.querySelector(pair[0]);
      if (!el) return;
      var w = Math.max(280, Math.round(el.clientWidth || 620));
      el.innerHTML = pair[1](w);
    });
  }
  /* 供其它环节（如 10 论文评审）复用，也便于单独调试三张图 */
  MR.views2.concept = {
    data: conceptData, panel: cfConceptPanel, draw: cfDraw,
    route: cfRoute, matrix: cfMatrix, time: cfTime
  };

  /* ======================= 01 文献导入与解析 ======================= */
  MR.views2.imp = {
    render: function () {
      var an = AN(), pf = PF();
      var papers = window.MR_PAPERS || [];
      var samples = papers.filter(function (p) { return p.kind && p.kind.indexOf('示例') >= 0; });
      var cases = papers.filter(function (p) { return p.kind && p.kind.indexOf('已核验') >= 0; });
      var doms = (MR.domain && MR.domain.MATERIAL_DOMAINS) || [];
      var html = '';

      html += MR.head({
        n: '01', t: '文献导入与解析',
        sub: '本平台面向材料学科的全部方向。导入任意材料类论文（DOCX / TXT / PDF 或粘贴正文），平台会抽取其中真实出现的内容：原料与试剂、仪器设备、测试标准、工艺步骤、变量与水平、可测指标、配比与参考文献。原文没有的项目一律标为「未报告」，不会被补全，也不会进入后续分析。',
        acts: '<button class="btn" data-act="pick">' + MR.icon('imp') + '上传文献</button>' +
          '<button class="btn" data-act="paste">粘贴正文</button>'
      });

      /* 1. 材料方向 */
      html += MR.panel({
        title: '第 1 步 · 选择材料方向', meta: doms.length + ' 个方向 · 可选', icon: 'scope', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:9px">选择方向后，平台会按该方向的术语表增强识别（力学 / 热学 / 电学 / 光学 / 磁学 / 化学 / 加工 / 结构 / 生物 / 吸附…），并据此解释你的结果。不选也可以，平台会自动识别。</div>' +
          '<div class="recipe">' + doms.map(function (d) {
            var on = MR.state.domain === d.k;
            return '<button type="button" class="rc' + (on ? ' is-on' : '') + '" data-dom="' + d.k + '">' +
              '<div class="rc__t">' + d.t + '</div><div class="rc__d">' + d.d + '</div>' +
              '<div class="rc__x" style="color:var(--ink-4)">' + d.hint.slice(0, 4).join(' · ') + '</div></button>';
          }).join('') + '</div>' +
          '<div class="switchline" style="margin-top:10px"><span class="switchline__k">当前：' +
          (MR.state.domain ? (doms.filter(function (x) { return x.k === MR.state.domain; })[0] || {}).t : '自动识别（未指定方向）') + '</span>' +
          '<button class="btn btn--sm" data-dom="__auto">' + (MR.state.domain ? '改为自动识别' : '已为自动') + '</button></div>'
      }) + '<div class="mb-4"></div>';

      /* 2. 上传 */
      html += '<div class="dropzone mb-4" id="dz">' +
        '<div class="dropzone__icon"><svg viewBox="0 0 40 40" width="36" height="36"><path d="M20 27V9M20 9l-7 7M20 9l7 7M8 32h24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="dropzone__t">拖入论文文件，或点击选择</div>' +
        '<div class="dropzone__d">DOCX（浏览器内直接解压解析）· TXT / MD · PDF（解压内容流并解析 ToUnicode，可抽取中文正文）<br>' +
        '扫描件或加密文档可能取不到文字，此时请用「粘贴正文」—— 平台不会用模板内容填空。</div>' +
        '<div class="dropzone__hint">文件只在本机浏览器内解析，不会上传到服务器</div></div>';

      /* 3. 可选文档 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '示例文档', meta: samples.length + ' 篇 · 平台自造', icon: 'lit', pad: true, flush: true,
          body: samples.length ? '<div class="rowlist">' + samples.map(function (p) {
            var on = MR.state.paper && MR.state.paper.id === p.id;
            var d = doms.filter(function (x) { return x.k === p.domain; })[0];
            return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-paper="' + p.id + '" style="grid-template-columns:1fr auto">' +
              '<span><span class="rowitem__title">' + MR.esc(p.name) + '</span>' +
              '<span class="rowitem__sub">' + (d ? d.t + ' · ' : '') + (p.chars / 1000).toFixed(1) + ' 千字符 · 虚构内容，仅用于演示抽取流程</span></span>' +
              '<span class="rowitem__side">' + (on ? MR.chip('当前', 'acc') : '') + '</span></button>';
          }).join('') + '</div>' : noneNote('无示例文档。'),
          note: '示例文档是平台自己写的虚构论文，覆盖金属、高分子复合材料、建筑材料、能源材料四个方向 —— 用来说明"同一套流水线能处理不同方向"，其中的配方与数值不具备任何学术效力。'
        }) +
        MR.panel({
          title: '已核验文献（仅题录）', meta: cases.length + ' 条', icon: 'book', pad: true, flush: true,
          body: cases.length ? '<div class="rowlist">' + cases.map(function (p) {
            var on = MR.state.paper && MR.state.paper.id === p.id;
            return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-paper="' + p.id + '" style="grid-template-columns:1fr auto">' +
              '<span><span class="rowitem__title" style="font-size:12px">' + MR.esc(p.name) + '</span>' +
              '<span class="rowitem__sub">' + MR.esc(p.note || '') + '</span></span>' +
              '<span class="rowitem__side">' + (on ? MR.chip('当前', 'acc') : '') + '</span></button>';
          }).join('') + '</div>' : noneNote('无核验文献。'),
          note: '这三条是真实文献，题录与 DOI 已通过 Crossref / 出版方页面核验。为遵守版权，平台不内嵌全文；如需分析请自行上传 PDF 或粘贴正文。'
        }) + '</div>';

      /* 未载入论文：给引导，不给错误 */
      if (!MR.state.paper) {
        html += MR.panel({
          title: '还没有载入论文', meta: '后续环节需要论文才能运行', icon: 'review1', cls: 'panel--acc', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:8px">平台可以处理的方向</div>' +
            '<div class="chips mb-4">' + doms.map(function (d) { return '<span class="chip chip--line">' + d.t + '</span>'; }).join('') + '</div>' +
            '<div class="note note--acc">' + MR.icon('plan', 14) +
            '<span>三种开始方式：① 上传你的论文文件；② 粘贴论文正文；③ 选一篇示例文档先走通流程。<b>没有论文时，平台不会预先展示任何研究内容</b> —— 所有环节都等你导入之后才产生内容。</span></div>'
        }) + '<div class="mb-4"></div>';
        return html;
      }

      /* 抽取总览 */
      var conf = pf.confidence || 0;
      html += '<div class="metrics mb-4">' +
        MR.metric('抽取置信度', conf, ' / 100', '', conf >= 60 ? 'ok' : (conf >= 35 ? 'warn' : 'bad'), '由各字段抽取数量加权') +
        MR.metric('原料 / 试剂', an.materials.length, ' 种', '', an.materials.length ? 'ok' : 'warn') +
        MR.metric('仪器设备', an.instruments.length, ' 台', '', an.instruments.length ? 'ok' : 'warn') +
        MR.metric('变量（含水平）', an.variables.length, ' 个', '', an.variables.length ? 'ok' : 'bad') +
        MR.metric('可测指标', pf.perf.length, ' 项', '', pf.perf.length ? 'ok' : 'bad') +
        MR.metric('表征手段', pf.chars.length, ' 项', '', pf.chars.length ? 'ok' : 'warn') +
        MR.metric('工艺步骤', an.steps.length, ' 步', '', an.steps.length ? 'ok' : 'warn') +
        MR.metric('参考文献', an.references.length, ' 条', '', an.references.length ? 'ok' : 'warn') +
        '</div>';

      /* 题录解析结果：每条都标"从哪来"，不冒充原文 */
      var SRC_LABEL = {
        explicit: { t: '原文自带', k: 'ok' }, 'in-text': { t: '正文识别', k: 'ok' },
        filename: { t: '取自文件名', k: 'acc' }, inferred: { t: '自动推断', k: 'acc' },
        derived: { t: '自动归纳', k: 'acc' }, '': { t: '未获得', k: 'sig' }
      };
      function srcChip(s) { var x = SRC_LABEL[s] || SRC_LABEL['']; return MR.chip(x.t, x.k); }
      var cands = an.abstractCandidates || [];
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '解析出的题录信息', meta: '标题 · 摘要 · 关键词', icon: 'imp', pad: true,
          body: '<div class="switchline" style="align-items:flex-start"><span class="switchline__k"><b>标题</b>' +
            '<span class="mono-xs" style="display:block;text-transform:none">' + MR.esc(an.title || '（未识别）') + '</span></span>' + srcChip(an.titleSource) + '</div>' +
            (an.titleEn && an.titleEn !== an.title ? '<div class="switchline" style="align-items:flex-start"><span class="switchline__k"><b>English title</b>' +
              '<span class="mono-xs" style="display:block;text-transform:none">' + MR.esc(an.titleEn) + '</span></span></div>' : '') +
            '<div class="switchline" style="align-items:flex-start"><span class="switchline__k"><b>摘要</b>' +
            '<span class="mono-xs" id="absBox" style="display:block;text-transform:none;white-space:pre-wrap;max-height:200px;overflow:auto">' +
            MR.esc(an.abstract || '（原文未设摘要字段，也未能从正文推断出首段）') + '</span></span>' + srcChip(an.abstractSource) +
            (cands.length > 1 ? '<button class="btn btn--sm" data-act="nextabs" data-i="0">换一段 1/' + cands.length + '</button>' : '') + '</div>' +
            '<div class="switchline" style="align-items:flex-start"><span class="switchline__k"><b>关键词</b>' +
            '<span class="mono-xs" style="display:block;text-transform:none">' +
            ((an.keywords && an.keywords.length) ? an.keywords.map(function (k) { return MR.chip(k, 'line'); }).join(' ') : '（未获得）') +
            '</span></span>' + srcChip(an.keywordsSource) + '</div>',
          note: '来源标注的含义：<b>原文自带</b>＝文中确有该字段；<b>自动推断 / 自动归纳 / 取自文件名</b>＝原文没有该字段，平台按规则补出并明确标注，绝不冒充原文内容。文件名标题在期刊 PDF 上很常见 —— 首页标题常是矢量轮廓，抽不出文字。'
        }) +
        '<div class="col">' +
        MR.panel({
          title: '解析自检', meta: (an.warnings || []).length + ' 条提示', icon: 'review1', pad: true, tight: true,
          cls: (an.warnings || []).length ? 'panel--sig' : '',
          body: (an.warnings || []).length ? an.warnings.map(function (w) {
            return '<div class="switchline" style="align-items:flex-start"><span class="switchline__k">' + w + '</span></div>';
          }).join('') : MR.note('未发现异常：各维度均有内容，摘要与关键词也都来自原文。', 'ok', 'review1')
        }) +
        (an.paperType === 'review' ? MR.panel({
          title: '文献类型：综述 / 展望', meta: '后续改走"概念路线"', icon: 'lit', pad: true, tight: true, cls: 'panel--acc',
          body: '<div class="mono-xs" style="margin-bottom:9px">这类文献没有变量与实验步骤（源于体裁，不是抽取失败）。环节 02–07 会自动切换为：<b>技术概念路线图 · 概念对比矩阵 · 年份演进时间线</b>，不再做"变量—指标"分析。</div>' +
            (an.concepts || []).map(function (c) {
              return '<div class="switchline" style="align-items:flex-start"><span class="switchline__k"><b>' + MR.esc(c.cat) + '</b>' +
                '<span class="mono-xs" style="display:block;text-transform:none">' + c.items.map(function (x) { return MR.esc(x.t) + '(' + x.n + ')'; }).join('、') + '</span></span></div>';
            }).join('') +
            ((an.timeline || []).length ? '<div class="mono-xs" style="margin-top:9px">年份频次：' + an.timeline.map(function (t) { return t.y + '×' + t.n; }).join(' · ') + '</div>' : '')
        }) : '') +
        '</div></div>';

      /* 指标按性能族归类 */
      if (pf.perf.length) {
        var fams = {};
        pf.perf.forEach(function (p) { (fams[p.family || '其他指标'] = fams[p.family || '其他指标'] || []).push(p.name); });
        html += MR.panel({
          title: '可测指标（按性能族归类）', meta: Object.keys(fams).length + ' 个族 · ' + pf.perf.length + ' 项', icon: 'analysis', pad: true,
          body: Object.keys(fams).map(function (k) {
            var fam = (MR.domain.PROPERTY_FAMILIES || []).filter(function (x) { return x.k === k; })[0] || {};
            return '<div class="switchline"><span class="switchline__k"><span class="led" style="background:' + (MR.colors[fam.color ? fam.color.replace('--', '') : 'sub'] || 'var(--acc)') + ';display:inline-block;margin-right:7px"></span>' + k +
              '<span class="mono-xs" style="display:block;text-transform:none">' + fams[k].join('、') + '</span></span>' + MR.chip(fams[k].length + ' 项', 'acc') + '</div>';
          }).join(''),
          note: '归类依据是材料学科的性能族词表（力学 / 热学 / 电学与电化学 / 光学 / 磁学 / 化学与耐候 / 加工与成型 / 结构与成分 / 生物与安全 / 吸附与分离）。归类只影响解释口径，不改变抽取到的内容。'
        }) + '<div class="mb-4"></div>';
      }

      if (!an.materials.length && !pf.perf.length) {
        html += MR.note('本次抽取没有获得有效内容：该文件可能是扫描件（无文字层）、加密文档或主要靠图片承载信息。<b>平台不会用模板内容填充</b>。请换一篇有文字层的文献，或用「粘贴正文」把正文贴进来。', 'risk', 'review1') + '<div class="mb-4"></div>';
      }

      /* 分组明细 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '原料与试剂', meta: an.materials.length + ' 种', icon: 'exp', pad: true, flush: true,
          body: an.materials.length ? '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>名称</th><th>规格/纯度</th><th>供应</th><th>类别</th></tr></thead><tbody>' +
            an.materials.map(function (m) {
              return '<tr><td class="strong wrap">' + MR.esc(m.name) + ev('…' + MR.esc((m.evidence || '').slice(0, 58))) + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(m.spec || m.purity) || '—') + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(m.supplier) || '—') + '</td>' +
                '<td>' + MR.chip(m.kind, 'line') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文中未识别到"名称 + 规格 + 供应"格式的原料/试剂描述。')
        }) +
        MR.panel({
          title: '仪器设备', meta: an.instruments.length + ' 台', icon: 'exp', pad: true, flush: true,
          body: an.instruments.length ? '<div class="tbl-wrap" style="max-height:340px;overflow-y:auto"><table class="tbl tbl--sm"><thead><tr><th>名称</th><th>型号</th><th>厂家</th></tr></thead><tbody>' +
            an.instruments.map(function (i) {
              return '<tr><td class="strong wrap">' + MR.esc(i.name) + '</td><td class="wrap" style="font-size:11px">' + (MR.esc(i.model) || '<span style="color:var(--sig)">未报告</span>') + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(i.vendor) || '—') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文中未识别到仪器清单。')
        }) + '</div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '变量与水平', meta: an.variables.length + ' 个', icon: 'design', pad: true, flush: true,
          body: an.variables.length ? '<div class="rowlist">' + an.variables.map(function (v) {
            return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
              '<span><span class="rowitem__title">' + MR.esc(v.key) + '</span>' +
              '<span class="rowitem__sub">取值：' + v.levels.join('、') + '（共 ' + v.levels.length + ' 个水平）</span>' + ev(MR.esc(v.evidence.slice(0, 88))) + '</span>' +
              '<span class="rowitem__side">' + MR.chip(v.sec || '原文', 'line') + '</span></div>';
          }).join('') + '</div>' : noneNote('原文中未识别到"同一参数出现两个以上取值"的变量描述 —— 后续环节无法做变量分析。')
        }) +
        MR.panel({
          title: '指标与表征手段', meta: pf.perf.length + ' + ' + pf.chars.length, icon: 'analysis', pad: true, flush: true,
          body: (pf.perf.length || pf.chars.length) ? '<div class="rowlist" style="max-height:340px;overflow-y:auto">' +
            pf.perf.map(function (i) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(i.name) +
                (i.family ? MR.chip(i.family, 'acc') : '') +
                (i.polarity === 'min' ? MR.chip('越小越优', 'sig') : MR.chip('越大越优', 'ok')) +
                (i.optimum != null ? MR.chip('原文最优 ' + i.optimum, 'acc') : '') +
                (i.improvement != null ? MR.chip('原文报道 ' + (i.improvement > 0 ? '+' : '') + i.improvement + '%', 'acc') : '') + '</span>' +
                '<span class="rowitem__sub">方向：' + ({ 'rise-fall': '先升后降（原文描述）', 'mono-up': '单调上升', 'mono-down': '单调下降' }[i.direction] || '原文未明确描述，按最优值推断') + '</span>' +
                ev(MR.esc((i.evidence || '').slice(0, 96))) + '</span>' +
                '<span class="rowitem__side">' + indKindChip(i.kind) + '</span></div>';
            }).join('') +
            pf.chars.map(function (c) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(c.name) + '</span>' +
                '<span class="rowitem__sub">表征手段 · 用于结构/界面归因</span>' + ev(MR.esc((c.evidence || '').slice(0, 78))) + '</span>' +
                '<span class="rowitem__side">' + indKindChip(c.kind) + '</span></div>';
            }).join('') + '</div>' : noneNote('原文中未识别到可测性能指标与表征手段。')
        }) + '</div>';

      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '工序与配方', meta: an.steps.length + ' 步 · ' + PF().formulation.length + ' 项', icon: 'plan', pad: true, flush: true,
          body: (an.steps.length || PF().formulation.length) ? '<div class="rowlist">' +
            PF().formulation.map(function (f) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(f.t) + '</span><span class="rowitem__sub">' + MR.esc(f.v) + '</span>' + ev(MR.esc((f.evidence || '').slice(0, 78))) + '</span>' +
                '<span class="rowitem__side">' + MR.chip('配方', 'acc') + '</span></div>';
            }).join('') +
            an.steps.map(function (st, i) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">(' + (i + 1) + ') ' + MR.esc(st.t) + '</span>' +
                '<span class="rowitem__sub">' + MR.esc(st.d) + (st.cond ? '<br><b style="color:var(--acc)">条件：' + MR.esc(st.cond) + '</b>' : '') + '</span></span>' +
                '<span class="rowitem__side">' + MR.chip(st.from || '原文', 'line') + '</span></div>';
            }).join('') + '</div>' : noneNote('原文中未识别到工艺步骤与配方。')
        }) +
        '<div class="col">' + MR.panel({
          title: '原文缺失项（后续不再臆造）', meta: (pf.missing || []).length + ' 类', icon: 'review1', cls: pf.missing.length ? 'panel--sig' : '', pad: true, tight: true,
          body: (pf.missing || []).length ? pf.missing.map(function (m) {
            return '<div class="switchline"><span class="switchline__k">' + m + '</span>' + MR.chip('未报告', 'sig') + '</div>';
          }).join('') : MR.note('原文在变量、指标、原料、仪器、参考文献五个维度均有报告。', 'ok', 'review1')
        }) + MR.panel({
          title: '标准与检测依据', meta: an.standards.length + ' 项', icon: 'book', pad: true, tight: true,
          body: an.standards.length ? an.standards.map(function (s2) { return '<div class="switchline"><span class="switchline__k">' + MR.esc(s2) + '</span></div>'; }).join('')
            : noneNote('原文未引用测试标准编号。')
        }) + '</div></div>';

      html += MR.panel({
        title: '参考文献（原文列表）', meta: an.references.length + ' 条', icon: 'book', pad: true, flush: true,
        acts: '<button class="btn btn--sm" data-act="dlrefs">导出 GB/T 7714</button>',
        body: an.references.length ? '<div class="tbl-wrap" style="max-height:280px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
          an.references.map(function (r, i) {
            return '<tr><td class="num" style="width:40px;color:var(--ink-3)">[' + (i + 1) + ']</td>' +
              '<td class="wrap" style="font-size:11.5px">' + MR.esc(r.raw) + '</td>' +
              '<td style="width:70px">' + MR.chip(r.type, 'line') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : noneNote('原文未识别到参考文献列表。'),
        note: '导出时按 GB/T 7714-2015 著录；缺失字段（如 DOI、卷期页）会按原文原样保留并标注，不补造。'
      });
      return html;
    },
    mount: function (host) {
      var dz = host.querySelector('#dz');
      if (dz) {
        dz.addEventListener('click', function () { MR.pick('file'); });
        ['dragenter', 'dragover'].forEach(function (e2) { dz.addEventListener(e2, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
        ['dragleave', 'drop'].forEach(function (e2) { dz.addEventListener(e2, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
        dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) MR.app.handleDocFiles(e.dataTransfer.files); });
      }
      host.querySelectorAll('[data-dom]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-dom');
          MR.setDomain(k === '__auto' ? '' : k);
        });
      });
      host.querySelectorAll('[data-paper]').forEach(function (b) {
        b.addEventListener('click', function () { MR.loadPaper(b.getAttribute('data-paper')); });
      });
      var pk = host.querySelector('[data-act="pick"]'); if (pk) pk.addEventListener('click', function () { MR.pick('file'); });
      var ps = host.querySelector('[data-act="paste"]');
      if (ps) ps.addEventListener('click', function () {
        MR.modal.open('粘贴论文正文',
          '<div class="mono-xs" style="margin-bottom:8px">把论文的正文（含摘要、材料与方法、结果、结论）粘贴到这里</div>' +
          '<textarea id="pasteDoc" class="eq" style="width:100%;height:240px;resize:vertical;white-space:pre-wrap" placeholder="论文题目：…&#10;摘要…&#10;2 试验材料与方法…"></textarea>' +
          '<div class="note" style="margin-top:12px">' + MR.icon('review1', 14) + '<span>建议至少包含"材料与方法"和"结果与讨论"两部分，抽取引擎需要它们来识别变量与指标。</span></div>',
          '<button class="btn" data-close="1">取消</button><button class="btn btn--primary" data-ok="1">开始解析</button>');
        setTimeout(function () {
          var ok = document.querySelector('[data-ok="1"]');
          if (ok) ok.addEventListener('click', function () {
            var t = document.getElementById('pasteDoc').value || '';
            if (t.trim().length < 300) MR.log('WARN', '粘贴内容过短（< 300 字），抽取结果会很有限');
            MR.loadText(t, '粘贴文本 · ' + t.slice(0, 24).replace(/\n/g, ' '));
            MR.modal.close();
          });
        }, 0);
      });
      var dr = host.querySelector('[data-act="dlrefs"]');
      if (dr) dr.addEventListener('click', function () {
        var lines = AN().references.map(function (r, i) { return '[' + (i + 1) + '] ' + r.raw; });
        var miss = AN().references.filter(function (r) { return (r.missing || []).length; }).length;
        MR.dl('LATTICE-参考文献-GBT7714.txt', lines.join('\n') + (miss ? '\n\n# 注：' + miss + ' 条缺少必要著录项，已按原文原样保留（未补造）' : ''), 'text/plain');
      });
      /* 「换一段」：原文没有 Abstract 时，平台无法 100% 断定哪一段才是摘要，
         于是把候选段落交给用户自己挑，而不是替他拍板。 */
      var na = host.querySelector('[data-act="nextabs"]');
      if (na) na.addEventListener('click', function () {
        var list = (AN().abstractCandidates || []);
        if (list.length < 2) return;
        var i = (+(na.getAttribute('data-i') || 0) + 1) % list.length;
        na.setAttribute('data-i', i);
        na.textContent = '换一段 ' + (i + 1) + '/' + list.length;
        var box = host.querySelector('#absBox');
        if (box) box.textContent = list[i];
        if (MR.state.analysis) MR.state.analysis.abstract = list[i];
      });
      bindFig(host);
    }
  };

  /* ======================= 02 文献拓展与研究定位 ======================= */
  MR.views2.scope = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '02', t: '文献拓展与研究定位', sub: '' }) + noPaper();
      var an = AN(), pf = PF();
      var vars = pf.variables || [], inds = pf.perf || [];
      var query = [MR.state.sel.material, vars[0] ? vars[0].noun : '', inds[0] ? inds[0].name : ''].filter(Boolean).join(' ') || (pf.title || '');
      var links = MR.lib.links(query);
      var html = '';
      html += MR.head({
        n: '02', t: '文献拓展与研究定位',
        sub: '研究对象、变量与指标全部来自这篇论文。勾选你要继续推进的变量与指标，平台据此生成检索式、给出站内命中的真实文献，并在原文未覆盖的"变量 × 指标"组合里指出研究空白。',
        acts: MR.chip('论文：' + (an.title || '').slice(0, 18), 'acc')
      });

      html += MR.panel({
        title: '第 1 步 · 确定研究对象', meta: '来自原文的 ' + (an.materials.length + an.steps.length) + ' 个可选对象', icon: 'scope', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:7px">原料 / 试剂</div>' +
          '<div class="recipe mb-4">' + (an.materials.length ? an.materials.map(function (m) {
            var on = MR.state.sel.material === m.name;
            return '<button type="button" class="rc' + (on ? ' is-on' : '') + '" data-mat="' + MR.esc(m.name) + '">' +
              '<div class="rc__t">' + MR.esc(m.name) + '</div><div class="rc__d">' + (MR.esc(m.spec || m.purity) || '原文未给规格') + '</div></button>';
          }).join('') : '<span class="mono-xs">原文未报告原料清单</span>') + '</div>' +
          '<div class="mono-xs" style="margin-bottom:7px">工艺步骤（可作为研究对象）</div>' +
          '<div class="hflow">' + (an.steps.length ? an.steps.map(function (s, i) {
            return '<div class="hstep"><div class="hstep__k">STEP ' + (i + 1) + '</div><div class="hstep__t">' + MR.esc(s.t) + '</div>' +
              '<div class="hstep__d">' + (s.cond ? MR.esc(s.cond) : '条件未报告') + '</div></div>';
          }).join('') : '<span class="mono-xs">原文未报告工序</span>') + '</div>',
        note: '这些对象都出自原文。平台不会引入原文没有提到的试剂或步骤。'
      }) + '<div class="mb-4"></div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '第 2 步 · 选择变量与指标', meta: vars.length + ' 变量 · ' + inds.length + ' 指标', icon: 'design', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:7px">变量（原文出现的水平）</div>' +
            (vars.length ? vars.map(function (v) {
              var on = MR.state.sel.vars.indexOf(v.key) >= 0;
              return '<div class="switchline"><span class="switchline__k">' + MR.esc(v.key) +
                '<span class="mono-xs" style="display:block;text-transform:none">取值 ' + v.levels.join(' / ') + '</span></span>' +
                '<button class="btn btn--sm" data-var="' + MR.esc(v.key) + '">' + (on ? '已选' : '选择') + '</button></div>';
            }).join('') : noneNote('原文未报告变量，无法进行变量分析。')) +
            '<div class="mono-xs" style="margin:14px 0 7px">指标（原文实际测量的）</div>' +
            (inds.length ? inds.map(function (i) {
              var on = MR.state.sel.inds.indexOf(i.name) >= 0;
              return '<div class="switchline"><span class="switchline__k">' + MR.esc(i.name) +
                '<span class="mono-xs" style="display:block;text-transform:none">' + (i.unit || '原文未给单位') + (i.optimum != null ? ' · 原文最优 ' + i.optimum : '') + '</span></span>' +
                '<button class="btn btn--sm" data-ind="' + MR.esc(i.name) + '">' + (on ? '已选' : '选择') + '</button></div>';
            }).join('') : noneNote('原文未报告可测指标。')),
          note: '只列出原文实际测量过的指标。若原文做了 SEM/FTIR/XRD，它们会出现在环节 01 的"表征手段"里，用于结果归因而非作为性能指标。'
        }) +
        MR.panel({
          title: '第 3 步 · 检索式与真实文献', meta: '可跳转外部数据库', icon: 'lit', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:6px">由所选对象自动生成</div>' +
            '<div class="eq">' + MR.esc(query) + '</div>' +
            '<div class="chips" style="margin-top:12px">' + links.map(function (l) {
              return '<a class="chip chip--acc" href="' + l.u + '" target="_blank" rel="noopener">' + l.t + ' ↗</a>';
            }).join('') + '</div>' +
            '<div class="mono-xs" style="margin:14px 0 7px">站内命中的真实文献（本地库 ' + MR.lib.rows.length + ' 条）</div>' +
            '<div class="tbl-wrap" style="max-height:180px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
            (function () {
              var key = [MR.state.sel.material, vars[0] && vars[0].noun, inds[0] && inds[0].name].filter(Boolean).join(' ');
              var hits = MR.lib.search(MR.state.sel.material || '', 'all', 0, 0).slice(0, 6);
              if (!hits.length) hits = MR.lib.rows.slice(0, 6);
              return hits.map(function (r) {
                return '<tr><td class="wrap" style="font-size:11px">' + MR.esc(r.t.slice(0, 78)) + '</td><td style="width:56px;font-size:10px;color:var(--ink-3)">' + r.y + '</td></tr>';
              }).join('') + (key ? '' : '');
            })() + '</tbody></table></div>',
          note: '站内库来自你导入的文献；要拿到最新文献请用上方链接跳到 OpenAlex / Crossref / 知网。检索结果可再上传回平台继续分析。'
        }) + '</div>';

      /* 研究空白 */
      var matrix = pf.matrix || [];
      var blanks = [];
      vars.forEach(function (v) {
        inds.forEach(function (i) {
          if (!matrix.some(function (m) { return m.v === v.key && m.i === i.name; })) blanks.push(v.key + ' × ' + i.name);
        });
      });
      html += MR.panel({
        title: '第 4 步 · 研究空白与新方向', meta: '原文未覆盖的组合 ' + blanks.length + ' 处', icon: 'feedback', cls: 'panel--acc', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:8px">原文已建立定量关系的组合（' + matrix.length + ' 处）</div>' +
          (matrix.length ? '<div class="chips mb-4">' + matrix.map(function (m) {
            return '<span class="chip chip--ok">' + MR.paper.shortVar(m.v) + ' → ' + m.i + (m.opt != null ? '（最优 ' + m.opt + '）' : '') + '</span>';
          }).join('') + '</div>' : '<div class="mb-4">' + noneNote('原文未建立明确的变量—指标对应关系。') + '</div>') +
          '<div class="mono-xs" style="margin-bottom:8px">原文未覆盖的组合 → 可作为继续研究的方向</div>' +
          (blanks.length ? '<div class="chips mb-4">' + blanks.slice(0, 10).map(function (b) { return '<span class="chip chip--sig">' + b + '</span>'; }).join('') + '</div>'
            : '<div class="mb-4">' + MR.note('原文的变量—指标矩阵已较完整，建议转向多因素耦合或耐久性方向。', 'ok', 'review1') + '</div>') +
          MR.note('上述空白是"原文没有做"的组合，而不是"文献都没有做"的组合 —— 是否已被他人研究，需要点上方的外部检索链接核实。平台不替你判断已有文献。', 'sig', 'review1'),
        note: '推导规则：变量清单 × 指标清单 − 原文已建立定量关系的组合。'
      });
      html += cfConceptPanel();
      return html;
    },
    mount: function (host) {
      host.querySelectorAll('[data-mat]').forEach(function (b) {
        b.addEventListener('click', function () { MR.state.sel.material = b.getAttribute('data-mat'); MR.log('INFO', '研究对象切换为 <b>' + MR.state.sel.material + '</b>'); MR.app.render(); });
      });
      host.querySelectorAll('[data-var]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-var'), i = MR.state.sel.vars.indexOf(k);
          if (i >= 0) MR.state.sel.vars.splice(i, 1); else MR.state.sel.vars.push(k);
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-ind]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-ind'), i = MR.state.sel.inds.indexOf(k);
          if (i >= 0) MR.state.sel.inds.splice(i, 1); else MR.state.sel.inds.push(k);
          MR.app.render();
        });
      });
      bindFig(host); cfDraw(host);
    }
  };

  /* ======================= 03 变量设计与安全评估 ======================= */
  MR.views2.design = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '03', t: '变量设计与安全评估', sub: '' }) + noPaper();
      var an = AN(), pf = PF();
      var chosen = (pf.variables || []).filter(function (v) { return MR.state.sel.vars.indexOf(v.key) >= 0; });
      var html = '';
      html += MR.head({
        n: '03', t: '变量设计与安全评估',
        sub: '变量水平取自原文出现的取值，配方按原文表述原样引用。安全等级来自内置 GHS 词典，未收录的试剂会明确标为"需人工核查"，不做推测。',
        acts: '<button class="btn btn--primary" data-act="confirm">' + MR.icon('design') + '确认方案</button>'
      });

      /* 水平选择 */
      html += MR.panel({
        title: '变量水平（来自原文）', meta: chosen.length + ' 个变量', icon: 'design', pad: true,
        body: chosen.length ? chosen.map(function (v) {
          return '<div class="param"><div class="param__k">' + MR.esc(v.key) +
            '<b>' + (MR.state.params[v.key] != null ? MR.state.params[v.key] : '—') + (v.unit ? ' ' + v.unit : '') + '</b></div>' +
            '<div class="seg" style="display:flex;flex-wrap:wrap;width:100%">' + v.levels.map(function (L) {
              return '<button type="button" data-level="' + MR.esc(v.key) + '|' + L + '" class="' + (MR.state.params[v.key] === L ? 'is-on' : '') + '" style="flex:1">' + L + '</button>';
            }).join('') + '</div>' +
            '<div class="param__h">' + ev(MR.esc(v.evidence.slice(0, 110))) + '</div></div>';
        }).join('') : noneNote('未选择变量。请回到环节 02 选择要推进的变量。'),
        note: '水平集合完全等于原文出现过的取值。若要研究原文区间之外的取值，需要在环节 02 的研究空白里作为新方向另行论证。'
      }) + '<div class="mb-4"></div>';

      /* 配方 + 安全 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '配方与关键参数（原文）', meta: pf.formulation.length + ' 项', icon: 'exp', pad: true, tight: true,
          body: pf.formulation.length ? '<table class="tbl tbl--sm"><tbody>' + pf.formulation.map(function (f) {
            return '<tr><td class="strong" style="width:110px">' + MR.esc(f.t) + '</td><td class="wrap">' + MR.esc(f.v) + ev(MR.esc((f.evidence || '').slice(0, 70))) + '</td></tr>';
          }).join('') + '</tbody></table>' : noneNote('原文未报告明确配比。')
        }) +
        MR.panel({
          title: '试剂安全评估', meta: an.materials.length + ' 种', icon: 'review1', cls: 'panel--sig', pad: true, flush: true,
          body: an.materials.length ? '<div class="tbl-wrap" style="max-height:320px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
            an.materials.map(function (m) {
              var g = MR.ghsOf(m.name);
              return '<tr><td class="strong wrap">' + MR.esc(m.name) + '</td>' +
                '<td class="wrap" style="font-size:11px;color:' + (g.known ? 'var(--ink-2)' : 'var(--sig)') + '">' + g.ghs + '</td>' +
                '<td style="width:44px">' + (g.known ? MR.chip(g.score, g.score >= 3 ? 'risk' : 'sig') : MR.chip('?', 'line')) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文未报告试剂，无法评估安全性。'),
          note: '内置词典只覆盖常见试剂。标为"?"的条目需要你在使用前查阅该物质的 SDS —— 平台不会为了填满表格而编造危害等级。'
        }) + '</div>';

      /* 误差与标准 */
      var hasRep = /平行|重复|n\s*=\s*\d|标准差|±|误差棒|标准偏差/.test(MR.state.rawText || '');
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '测试标准与误差量级', meta: an.standards.length + ' 项标准', icon: 'analysis', pad: true, tight: true,
          body: (an.standards.length ? an.standards.map(function (s) { return '<div class="switchline"><span class="switchline__k">' + MR.esc(s) + '</span>' + MR.chip('原文引用', 'acc') + '</div>'; }).join('') : noneNote('原文未引用测试标准。')) +
            '<div class="switchline"><span class="switchline__k">重复次数 / 误差棒</span>' + (hasRep ? MR.chip('原文有报告', 'ok') : MR.chip('原文未报告', 'risk')) + '</div>' +
            (hasRep ? '' : '<div class="note note--risk" style="margin-top:12px">' + MR.icon('review1', 14) +
              '<span>原文未报告重复次数与误差。力学性能必须给出至少 3 次重复的均值与偏差，否则组间差异在统计上不可分辨。这是后续实验必须补齐的第一项。</span></div>')
        }) +
        MR.panel({
          title: '方案确认', meta: 'LOCK', icon: 'review1', pad: true, tight: true,
          body: '<dl class="dl">' +
            '<dt>论文</dt><dd>' + MR.esc((an.title || '').slice(0, 40)) + '</dd>' +
            '<dt>研究对象</dt><dd>' + MR.esc(MR.state.sel.material || '未选择') + '</dd>' +
            '<dt>变量</dt><dd>' + (chosen.map(function (v) { return v.key + ' = ' + (MR.state.params[v.key] != null ? MR.state.params[v.key] : '?'); }).join('；') || '未选择') + '</dd>' +
            '<dt>指标</dt><dd>' + (MR.state.sel.inds.join('、') || '未选择') + '</dd>' +
            '<dt>表征</dt><dd>' + (pf.chars.map(function (c) { return c.name; }).join('、') || '原文未报告') + '</dd></dl>' +
            '<button class="btn btn--primary" data-act="confirm2" style="margin-top:14px;width:100%;justify-content:center">确认并进入数据与图形 →</button>'
        }) + '</div>';
      html += cfConceptPanel();
      return html;
    },
    mount: function (host) {
      host.querySelectorAll('[data-level]').forEach(function (b) {
        b.addEventListener('click', function () {
          var p = b.getAttribute('data-level').split('|');
          MR.state.params[p[0]] = parseFloat(p[1]);
          MR.app.render();
        });
      });
      function go() { MR.app.runStage('design', { cb: function () { MR.app.setView('figure'); } }); }
      var c1 = host.querySelector('[data-act="confirm"]'); if (c1) c1.addEventListener('click', go);
      var c2 = host.querySelector('[data-act="confirm2"]'); if (c2) c2.addEventListener('click', go);
      bindFig(host); cfDraw(host);
    }
  };

  /* ======================= 04 数据预期与论文专属图形 ======================= */
  MR.views2.figure = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '04', t: '数据预期与图形', sub: '' }) + noPaper();
      var pf = PF(), an = AN();
      var specs = MR.paper.chartSpecs(pf);
      var html = '';
      html += MR.head({
        n: '04', t: '数据预期与论文专属图形',
        sub: '图形全部由这篇论文的内容生成：工序来自原文流程，界面机理来自原文的处理方式，XRD 峰位与 FTIR 波数取自原文出现的数值。配色可逐项指定，可导出 SVG / PNG。',
        acts: '<span class="mono-xs">' + ({ sci: 'SCI 风格', origin: 'Origin 风格', ppt: '演示风格' }[MR.state.figStyle]) + '</span>'
      });

      /* 数据预期表 */
      var rows = [];
      (pf.matrix || []).forEach(function (m) {
        var model = pf.__model[m.v + '|' + m.i];
        if (!model) return;
        rows.push({ v: m.v, i: m.i, model: model, m: m });
      });
      html += MR.panel({
        title: '数据预期（基于原文报告的变量水平与最优值）', meta: rows.length + ' 组', icon: 'analysis', pad: true, flush: true,
        body: rows.length ? '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr>' +
          '<th>变量</th><th>水平</th><th>指标</th><th class="num">原文最优</th><th class="num">原文报道幅度</th><th>变化方向</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td class="strong wrap">' + MR.esc(MR.paper.shortVar(r.v)) + '</td>' +
              '<td class="num wrap">' + r.model.levels.join(' / ') + '</td><td class="wrap">' + MR.esc(r.i) + '</td>' +
              '<td class="num">' + (r.m.opt != null ? r.m.opt : '<span style="color:var(--sig)">未报告</span>') + '</td>' +
              '<td class="num">' + (r.m.amp != null ? (r.m.amp > 0 ? '+' : '') + r.m.amp + '%' : '<span style="color:var(--sig)">未报告</span>') + '</td>' +
              '<td>' + ({ 'rise-fall': '先升后降', 'mono-up': '单调上升', 'mono-down': '单调下降' }[r.m.dir] || '按最优值推断') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : noneNote('原文未建立变量—指标对应关系，无法给出数据预期。'),
        note: '幅度列写"未报告"时，曲线只表现相对趋势，绝对幅度需靠实测标定。平台不会替原文编造具体数值。'
      }) + '<div class="mb-4"></div>';

      /* 配色 */
      html += MR.panel({
        title: '图形配色控制', meta: '逐项指定，实时重绘', icon: 'figure', pad: true,
        body: '<div class="colorbar">' + MR.colorMeta.map(function (c) {
          return '<label class="pal"><input type="color" data-figcolor="' + c.k + '" value="' + MR.colors[c.k] + '">' + c.t + '</label>';
        }).join('') + '</div>'
      }) + '<div class="mb-4"></div>';

      /* 图形 */
      var has = { flow: (an.steps.length > 0), mech: true, xrd: (pf.peakData.theta || []).length >= 3, ftir: (pf.ftir.bands || []).length >= 3, sem: (pf.sem || []).length >= 1 };
      if (has.flow) html += figBox('f2flow', '图 1 · 制备工艺流程图', '工序 + 条件 + 设备（来自原文）');
      else html += MR.note('原文未报告可抽取的工艺步骤，因此不生成流程图 —— 占位图会误导读者。', 'sig', 'review1') + '<div class="mb-4"></div>';
      html += figBox('f2mech', '图 2 · 界面结合机理示意', '处理方式 + 界面化学（来自原文表述）');
      if (has.xrd) html += figBox('f2xrd', '图 3 · XRD 衍射图谱', '峰位取自原文：' + (pf.peakData.theta || []).slice(0, 5).map(function (x) { return x + '°'; }).join('、'));
      if (has.ftir) html += figBox('f2ftir', '图 4 · 红外光谱', '波数取自原文：' + (pf.ftir.bands || []).slice(0, 5).join('、') + ' cm⁻¹');
      if (has.sem) html += figBox('f2sem', '图 5 · 断面形貌对比', '面板描述取自原文');
      if (!has.xrd && !has.ftir && !has.sem) html += MR.note('原文未报告 XRD / FTIR / SEM 等表征数据，因此不生成对应的谱图 —— 谱图必须来自真实数据。', 'sig', 'review1');

      /* ---- 3D 科研绘图（由该论文的变量与指标驱动） ---- */
      html += '<div class="sec-title">3D 科研绘图<span class="mono-xs">纯矢量 · 可改色 · 可导出</span></div>';
      html += '<div class="grid g-2 mb-4">' +
        figBox('f3surf', '图 6 · 三维响应面', '由原文变量与最优值生成') +
        figBox('f3bars', '图 7 · 三维柱状对比', '变量水平 × 指标') + '</div>';
      html += '<div class="grid g-2 mb-4">' +
        figBox('f3cell', '图 8 · 晶胞 / 球棍模型', '晶格参数取自原文（缺项用通用占位并标注）') +
        figBox('f3layer', '图 9 · 层状 / 界面结构 3D', '由原文的材料与结构表述生成') + '</div>';

      /* ---- SCI 配图手册 ---- */
      var fams = {}; (pf.perf || []).forEach(function (x) { if (x.family) fams[x.family] = 1; });
      var famKeys = Object.keys(fams);
      var hits = (MR.sci ? MR.sci.PLAYBOOK : []).map(function (row) {
        var score = 0;
        var exp = row.exp;
        (pf.perf || []).forEach(function (x) {
          if (exp.indexOf(x.family || '') >= 0) score += 1;
          if (x.family === '力学性能' && /力学/.test(exp)) score += 1;
        });
        if ((pf.chars || []).some(function (c) { return exp.indexOf(c.method || '') >= 0; })) score += 2;
        return { row: row, score: score };
      }).sort(function (x, y) { return y.score - x.score; });
      var top = hits.filter(function (x) { return x.score > 0; });
      if (!top.length) top = hits.slice(0, 3);

      html += MR.panel({
        title: 'SCI 配图手册（按该论文的指标族匹配）', meta: (top.length) + ' 条匹配', icon: 'figure', cls: 'panel--acc', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:9px">检测到该论文的指标族：' + (famKeys.join('、') || '未识别') + '；表征手段：' + ((pf.chars || []).map(function (c) { return c.method || c.name; }).join('、') || '未识别') + '</div>' +
          top.map(function (x) {
            var r = x.row;
            return '<div class="mech" style="margin-bottom:10px">' +
              '<div class="mech__h"><span class="mech__id">' + MR.chip(x.score >= 2 ? '强匹配' : '相关', x.score >= 2 ? 'acc' : 'line') + '</span>' +
              '<span class="mech__t">' + r.exp + '</span>' +
              '<span style="margin-left:auto">' + MR.chip('推荐色板 ' + r.pal, 'sig') + '</span></div>' +
              '<div class="mech__row"><dt>推荐图型</dt><dd>' + r.figs.map(function (f) { return '<span class="chip chip--line">' + f + '</span>'; }).join(' ') + '</dd></div>' +
              '<div class="mech__row"><dt>制图惯例</dt><dd>' + r.conv + '</dd></div></div>';
          }).join(''),
        note: '手册按材料学科期刊的通行做法整理：图型要匹配实验类型（力学看柱状+误差棒，优化看响应面，微观结构必须给比例尺与面板标号），配色按目标期刊选择。'
      }) + '<div class="mb-4"></div>';

      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '分子结构的 SCI 表达规范', meta: (MR.sci ? MR.sci.MOL_GUIDE.length : 0) + ' 种', icon: 'plan', pad: true, flush: true,
          body: '<div class="rowlist">' + (MR.sci ? MR.sci.MOL_GUIDE : []).map(function (g) {
            return '<div class="rowitem" style="grid-template-columns:1fr;cursor:default">' +
              '<span><span class="rowitem__title">' + g.k + '</span>' +
              '<span class="rowitem__sub"><b style="color:var(--ink-2)">用在什么时候：</b>' + g.use + '<br>' +
              '<b style="color:var(--ink-2)">为什么这样画：</b>' + g.why + '</span></span></div>';
          }).join('') + '</div>',
          note: '不同分子在不同场景下的画法不同：有机小分子用骨架式，晶体与配位环境用球棍式，讲位阻用空间填充式，手性用楔形式，反应式只画参与反应的局部结构。'
        }) +
        MR.panel({
          title: 'CPK 原子配色（期刊通用）', meta: '画球棍/球模型时用', icon: 'exp', pad: true, tight: true,
          body: (MR.sci ? Object.keys(MR.sci.MOL_COLOR) : []).map(function (el) {
            return '<div class="switchline"><span class="switchline__k"><span class="led" style="background:' + MR.sci.MOL_COLOR[el] + ';display:inline-block;margin-right:7px"></span>' + el + '</span>' +
              '<span class="num" style="font-size:10px;color:var(--ink-3)">' + MR.sci.MOL_COLOR[el] + '</span></div>';
          }).join('')
        }) + '</div>';

      html += figBox('f3mol', '图 10 · 分子结构表达示例', '按上述规范绘制（此处以硅烷偶联剂为例）');
      html += cfConceptPanel();
      return html;
    },
    mount: function (host) {
      var pf = PF(), an = AN();
      cfDraw(host);
      renderInto(host.querySelector('#f2flow'), function (w) { return MR.figs2.procFlow(w, pf); });
      renderInto(host.querySelector('#f2mech'), function (w) { return MR.figs2.interfaceFig(w, pf); });
      if (host.querySelector('#f2xrd')) renderInto(host.querySelector('#f2xrd'), function (w) { return MR.figs2.xrdFig(w, pf); });
      if (host.querySelector('#f2ftir')) renderInto(host.querySelector('#f2ftir'), function (w) { return MR.figs2.ftirFig(w, pf); });
      if (host.querySelector('#f2sem')) renderInto(host.querySelector('#f2sem'), function (w) { return MR.figs2.semFig(w, pf); });
      /* ---- 3D 图 ---- */
      var S = MR.sci;
      var mats = (pf.matrix || []).map(function (m) { return { m: m, model: pf.__model[m.v + '|' + m.i] }; }).filter(function (x) { return x.model; });
      /* 三维响应面：取第一组（变量 × 指标） */
      var el1 = host.querySelector('#f3surf');
      if (el1) renderInto(el1, function (w) {
        if (!mats.length) return S.frame(w, 240) + S.T(w / 2, 120, '原文未报告可用于响应面的变量—指标关系', { anchor: 'middle', size: 10, fill: '#9AA1A8' }) + '</svg>';
        var mm = mats[0].model, lv = mm.levels.slice().sort(function (x, y) { return x - y; });
        var n = 9, z = [];
        for (var i = 0; i < n; i++) {
          var row = [];
          for (var j = 0; j < n; j++) {
            var x1 = lv[0] + (lv[lv.length - 1] - lv[0]) * i / (n - 1);
            var v = mm.f(x1) * (0.72 + 0.28 * Math.sin(j / (n - 1) * Math.PI));
            row.push(v);
          }
          z.push(row);
        }
        var bi = 0, bj = 4, bv = -1e9;
        for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (z[i][j] > bv) { bv = z[i][j]; bi = i; bj = j; }
        return S.surface3d(w, {
          height: 320, z: z, palette: MR.state.figStyle === 'glm' ? 'glm' : 'okabe-ito',
          title: mats[0].m.i + ' 的三维响应面（以 ' + MR.paper.shortVar(mats[0].m.v) + ' 与第二因素为自变量）',
          note: '峰值取自原文最优值 ' + (mats[0].m.opt != null ? mats[0].m.opt : '（原文未报告）'),
          xlabel: MR.paper.shortVar(mats[0].m.v), ylabel: '第二因素（交互项）', zlabel: mats[0].m.i + ' 相对变化 (%)',
          opt: { i: bi, j: bj, label: '峰值 ' + bv.toFixed(1) + '%' }
        });
      });
      /* 三维柱状：变量水平 × 前三个指标 */
      var el2 = host.querySelector('#f3bars');
      if (el2) renderInto(el2, function (w) {
        var inds = (pf.perf || []).slice(0, 3);
        var v0 = (pf.variables || [])[0];
        if (!inds.length || !v0) return S.frame(w, 260) + S.T(w / 2, 130, '原文未报告变量或指标，无法生成三维柱状', { anchor: 'middle', size: 10, fill: '#9AA1A8' }) + '</svg>';
        var lv2 = v0.levels.slice().sort(function (x, y) { return x - y; });
        var z2 = inds.map(function (ind) {
          var model = pf.__model[v0.key + '|' + ind.name];
          return lv2.map(function (x) { return model ? Math.abs(model.f(x)) : 0; });
        });
        return S.bars3d(w, {
          height: 300, rows: inds.map(function (i2) { return i2.name.slice(0, 6); }), cols: lv2.map(String), z: z2,
          palette: MR.state.figStyle === 'glm' ? 'glm' : 'npg',
          title: '三维柱状：' + (inds.map(function (i2) { return i2.name; }).join(' / ')) + ' × ' + MR.paper.shortVar(v0.key),
          note: '柱高 = 相对变化幅度（%）'
        });
      });
      /* 晶胞 / 球棍 */
      var el3 = host.querySelector('#f3cell');
      if (el3) renderInto(el3, function (w) {
        var latt = {};
        var m3 = (MR.state.rawText || '').match(/a\s*[=＝]\s*([\d.]{3,7})\s*(?:Å|nm)?[^\r\n]{0,30}?c\s*[=＝]\s*([\d.]{3,7})/i);
        if (m3) { latt.a = parseFloat(m3[1]) / 10; latt.c = parseFloat(m3[2]) / 10; }
        var phases = (pf.peakData.phases || []).slice(0, 4);
        var kinds = [
          { el: 'Ti', t: 'Ti（过渡金属位）' }, { el: 'O', t: 'O（氧）' }, { el: 'Na', t: 'Na（碱金属位）' }, { el: 'P', t: 'P（骨架）' }
        ];
        var atoms = [], bonds = [];
        var c2 = [{ x: 0.5, y: 0.5, z: 0.5, el: 'Ti', r: 0.26, label: 'TM' }];
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]].forEach(function (p) {
          c2.push({ x: p[0] * 0.82 + 0.09, y: p[1] * 0.82 + 0.09, z: p[2] * 0.82 + 0.09, el: 'O', r: 0.15 });
        });
        [[0.5, 0.5, 0.5], [0.5, 0, 0.5], [0, 0.5, 0.5], [0.5, 0.5, 0]].forEach(function (p) {
          c2.push({ x: p[0], y: p[1], z: p[2], el: 'Na', r: 0.19 });
        });
        c2.forEach(function (a1) {
          atoms.push(a1);
          c2.forEach(function (b1) {
            if (b1 === a1) return;
            if (b1.el === 'O' && a1.el === 'O') return;
            var d2 = Math.hypot(a1.x - b1.x, a1.y - b1.y, a1.z - b1.z);
            if (d2 > 0.05 && d2 < 0.75) bonds.push([[a1.x, a1.y, a1.z], [b1.x, b1.y, b1.z], 1.2]);
          });
        });
        return S.crystal(w, {
          height: 320, a: latt.a || 1.0, b: latt.a || 1.0, c: latt.c || 1.1,
          atoms: atoms, bonds: bonds, legend: kinds,
          title: (phases.length ? phases[0] + ' 型结构示意' : '晶胞结构示意') + '（球棍模型）',
          note: m3 ? '晶格参数取自原文' : '原文未报告晶格参数，图中为通用占位',
          caption: '注：' + (phases.length ? '原文物相：' + phases.join('、') + '。' : '') + '球棍模型用于说明原子占位与配位环境，非精修结构。',
          miller: null
        });
      });
      /* 文献锚定 3D 模型（agent 端文生3D 产出，纯示意；GLB 仅在本地服务器下可加载） */
      if (el3 && MR.glb3d && MR.threeManifest) {
        var entry = MR.threeManifest[MR.state.paperId];
        if (entry) {
          var vhead = document.createElement('div');
          vhead.className = 'mono-xs';
          vhead.style.cssText = 'color:#6B7A88;margin:10px 2px 2px';
          vhead.textContent = '可交互 3D 模型（拖拽旋转 · 滚轮缩放 · 双击恢复自转）';
          el3.appendChild(vhead);
          var vbox = document.createElement('div');
          vbox.style.height = '360px';
          el3.appendChild(vbox);
          try {
            MR.glb3d.mount(vbox, entry.glb, { badge: entry.badge || 'AI 生成 · 示意 · 基于本文晶格参数', height: 360 });
          } catch (e) {
            vbox.innerHTML = '<div class="glb3d__msg">3D 查看器初始化失败：' + ((e && e.message) || e) + '</div>';
          }
        } else {
          var vnote = document.createElement('div');
          vnote.className = 'mono-xs';
          vnote.style.cssText = 'color:#9A6A2E;margin-top:8px';
          vnote.textContent = '当前论文无内置 3D 模型；上传论文的 3D 模型需通过代理 / 离线生成（见 README 第 6 节）。';
          el3.appendChild(vnote);
        }
      }
      /* 层状 / 界面 */
      var el4 = host.querySelector('#f3layer');
      if (el4) renderInto(el4, function (w) {
        var txt = (MR.state.rawText || '');
        var layers = [];
        if (/纤维|fiber|增强/.test(txt) && /基体|树脂|水泥|matrix/.test(txt)) {
          layers = [{ t: '纤维增强相', color: '#4A6B8A', pattern: 'fiber' }, { t: '界面过渡区', color: '#D6B656', th: 0.26, pattern: 'mesh' }, { t: '基体相', color: '#9AA1A8', pattern: 'grain' }];
        } else if (/涂层|镀层|膜/.test(txt)) {
          layers = [{ t: '功能涂层', color: '#82B366', pattern: 'grain' }, { t: '界面层', color: '#D6B656', th: 0.26, pattern: 'mesh' }, { t: '基体', color: '#9AA1A8', pattern: 'grain' }];
        } else {
          layers = [{ t: '表层', color: '#6C8EBF', pattern: 'grain' }, { t: '过渡区', color: '#D6B656', th: 0.26, pattern: 'mesh' }, { t: '本体', color: '#9AA1A8', pattern: 'grain' }];
        }
        return S.layered3d(w, {
          height: 300, layers: layers,
          title: '层状 / 界面结构 3D 示意',
          note: /界面|结合|相容性/.test(txt) ? '原文讨论了界面结合' : '',
          caption: '注：层序依据原文对材料组成与界面结构的表述重建；厚度非按比例。'
        });
      });
      /* 分子示例 */
      var el5 = host.querySelector('#f3mol');
      if (el5) renderInto(el5, function (w) {
        var txt = (MR.state.rawText || '');
        var kind = /偶联剂|硅烷|KH-?550|Si-?O-?C/.test(txt) ? 'silane' : (/氧化|羧基|接枝/.test(txt) ? 'reaction' : 'ball');
        var titleMap = { silane: '硅烷偶联剂的骨架式与水解–缩合反应式', reaction: '官能团转化的反应式表达', ball: '骨架分子的球棍式表达' };
        return S.molecule(w, { height: 250, mol: kind, title: titleMap[kind], note: '骨架式：省略 C 与 C–H，只标杂原子与官能团' });
      });

      MR.buildColorInputs(host, MR.colorMeta.map(function (c) { return c.k; }));
      bindFig(host);
      void an;
    }
  };

  /* ======================= 05 结果分析与作图 ======================= */
  MR.views2.analysis = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '05', t: '结果分析与作图', sub: '' }) + noPaper();
      var pf = PF();
      var specs = [];
      (pf.matrix || []).forEach(function (m) {
        var model = pf.__model[m.v + '|' + m.i];
        if (model) specs.push({ v: m.v, i: m.i, model: model, m: m });
      });
      var html = '';
      html += MR.head({
        n: '05', t: '结果分析与作图',
        sub: '按你需要的图型生成：折线 / 分组柱状 / 散点误差棒。数据来自原文的变量水平与最优值，可直接导出 SVG 与 CSV（列名按 Origin 导入习惯排列）。',
        acts: '<div class="seg" style="display:flex">' + [['line', '折线'], ['bar', '柱状'], ['scatter', '散点']].map(function (t) {
          return '<button type="button" data-ctype="' + t[0] + '" class="' + (MR.state.chartType === t[0] ? 'is-on' : '') + '">' + t[1] + '</button>';
        }).join('') + '</div><button class="btn" data-act="csvexp">' + MR.icon('analysis') + '导出 CSV</button>'
      });

      if (!specs.length) {
        return html + noneNote('原文未建立"变量—指标"的定量对应关系，无法生成趋势图。请回到环节 02 选择变量与指标，或换一篇报告了变量水平与对应性能的文献。');
      }
      html += '<div class="grid g-4 mb-4">' + specs.slice(0, 4).map(function (s, i) {
        return MR.metric((s.i + ' @ ' + MR.paper.shortVar(s.v)),
          (s.m.opt != null ? s.m.opt : '—'),
          s.model.unit ? ' ' + s.model.unit : '',
          s.m.amp != null ? '原文报道 ' + (s.m.amp > 0 ? '+' : '') + s.m.amp + '%' : '幅度未报告',
          s.model.polarity === 'min' ? 'warn' : 'ok');
      }).join('') + '</div>';

      html += '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t" id="figT">图 · 变量—指标响应</span>' +
        '<div class="figbox__acts">' +
        '<span class="mono-xs" id="figIdx">1 / ' + specs.length + '</span>' +
        '<button class="btn btn--sm" data-act="prev">上一个</button><button class="btn btn--sm" data-act="next">下一个</button>' +
        '<button class="btn btn--sm" data-svg="f2trend" data-name="LATTICE-趋势图.svg">导出 SVG</button>' +
        '<button class="btn btn--sm" data-png="f2trend" data-name="LATTICE-趋势图.png">导出 PNG</button>' +
        '</div></div><div class="figbox__body" id="f2trend"></div>' +
        '<div class="figbox__cap" id="figCap"></div></div>';

      html += MR.panel({
        title: '数据表（可直接导入 Origin）', meta: '长表格式', icon: 'analysis', pad: true, flush: true,
        body: '<div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="tbl tbl--sm"><thead><tr>' +
          '<th>变量</th><th>指标</th><th class="num">水平</th><th class="num">相对变化 (%)</th><th>备注</th></tr></thead><tbody>' +
          specs.map(function (s) {
            return s.model.levels.map(function (L) {
              return '<tr><td class="wrap">' + MR.esc(MR.paper.shortVar(s.v)) + '</td><td class="wrap">' + MR.esc(s.i) + '</td>' +
                '<td class="num">' + L + '</td><td class="num">' + s.model.f(L).toFixed(2) + '</td>' +
                '<td style="font-size:10.5px;color:var(--ink-3)">' + (L == s.m.opt ? '原文最优' : '') + '</td></tr>';
            }).join('');
          }).join('') + '</tbody></table></div>',
        note: 'CSV 列名为 Variable / Indicator / Level / Delta_pct / Note，导入 Origin 后可直接设为 X/Y 列。'
      });
      return html;
    },
    mount: function (host) {
      var pf = PF();
      var specs = [];
      (pf.matrix || []).forEach(function (m) {
        var model = pf.__model[m.v + '|' + m.i];
        if (model) specs.push({ v: m.v, i: m.i, model: model, m: m });
      });
      function draw() {
        var i = Math.min(MR.state.chartSpec || 0, specs.length - 1);
        MR.state.chartSpec = i;
        var s = specs[i];
        if (!s) return;
        var el = host.querySelector('#f2trend');
        var type = MR.state.chartType;
        if (type === 'line' || MR.state.chartType === undefined) {
          renderInto(el, function (w) { return MR.figs2.trendFig(w, { varKey: s.v, ind: s.i, model: s.model }); });
        } else if (type === 'bar') {
          var lv = s.model.levels.slice().sort(function (a, b) { return a - b; });
          MR.charts.draw(el, {
            type: 'barsGroup', height: 250, unit: '%', max: Math.max(20, Math.ceil(Math.max.apply(null, lv.map(function (x) { return Math.abs(s.model.f(x)); })) / 5) * 5 + 5),
            groups: lv.map(function (x) { return String(x); }),
            series: [{ name: s.i, color: '--sub', vals: lv.map(function (x) { return s.model.f(x); }) }]
          });
        } else {
          var lv2 = s.model.levels.slice().sort(function (a, b) { return a - b; });
          MR.charts.draw(el, {
            type: 'scatterErr', height: 250, x0: lv2[0] - 1, x1: lv2[lv2.length - 1] + 1,
            y0: Math.floor(Math.min.apply(null, lv2.map(function (x) { return s.model.f(x); })) / 5) * 5 - 5,
            y1: Math.ceil(Math.max.apply(null, lv2.map(function (x) { return s.model.f(x); })) / 5) * 5 + 5,
            xlabel: MR.paper.shortVar(s.v), ylabel: s.i + ' 相对变化 (%)',
            points: lv2.map(function (x) { return { x: x, y: s.model.f(x), ey: 1.8, color: '--sub', tip: MR.paper.shortVar(s.v) + ' = ' + x + '<br>' + s.i + ' ' + s.model.f(x).toFixed(1) + '%' }; })
          });
        }
        var tEl = host.querySelector('#figT'), cEl = host.querySelector('#figCap'), iEl = host.querySelector('#figIdx');
        if (tEl) tEl.textContent = '图 · ' + s.i + ' 随 ' + MR.paper.shortVar(s.v) + ' 的变化';
        if (iEl) iEl.textContent = (i + 1) + ' / ' + specs.length;
        if (cEl) cEl.textContent = '数据来源：原文报告的变量水平（' + s.model.levels.join('、') + '）' +
          (s.m.opt != null ? '与最优值 ' + s.m.opt : '；原文未报告最优值') +
          (s.m.amp != null ? '，峰值幅度 ' + s.m.amp + '%（原文报道）' : '，峰值幅度原文未报告，曲线仅表示趋势') + '。';
      }
      draw();
      host.querySelectorAll('[data-ctype]').forEach(function (b) {
        b.addEventListener('click', function () { MR.state.chartType = b.getAttribute('data-ctype'); MR.app.render(); });
      });
      var pv = host.querySelector('[data-act="prev"]'), nx = host.querySelector('[data-act="next"]');
      if (pv) pv.addEventListener('click', function () { MR.state.chartSpec = (MR.state.chartSpec - 1 + specs.length) % specs.length; MR.app.render(); });
      if (nx) nx.addEventListener('click', function () { MR.state.chartSpec = (MR.state.chartSpec + 1) % specs.length; MR.app.render(); });
      bindFig(host);
      var ce = host.querySelector('[data-act="csvexp"]');
      if (ce) ce.addEventListener('click', function () {
        var rows = [['Variable', 'Indicator', 'Level', 'Unit', 'Delta_pct', 'Note']];
        specs.forEach(function (s) {
          s.model.levels.forEach(function (L) {
            rows.push([MR.paper.shortVar(s.v), s.i, L, s.model.unit || '', s.model.f(L).toFixed(2), L == s.m.opt ? 'reported optimum' : '']);
          });
        });
        MR.dlCSV('LATTICE-Origin数据.csv', rows);
      });
    }
  };

  /* ======================= 06 实验指导书 ======================= */
  MR.views2.guide = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '06', t: '实验指导书', sub: '' }) + noPaper();
      var pf = PF(), an = AN();
      var html = '';
      html += MR.head({
        n: '06', t: '实验指导书',
        sub: '按原文的配方、试剂、工序与测试标准整理成可直接带到实验台的操作文件；每个关键参数都标注它来自原文的哪一句。',
        acts: '<button class="btn" data-act="print">打印</button><button class="btn btn--primary" data-act="dl">导出指导书</button>'
      });
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '试剂与原料', meta: an.materials.length + ' 种', icon: 'exp', pad: true, flush: true,
          body: an.materials.length ? '<table class="tbl tbl--sm"><tbody>' + an.materials.map(function (m) {
            var g = MR.ghsOf(m.name);
            return '<tr><td class="strong wrap">' + MR.esc(m.name) + '</td>' +
              '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(m.spec || m.purity) || '规格未报告') + '<br>' + (MR.esc(m.supplier) || '') + '</td>' +
              '<td class="wrap" style="font-size:11px;color:' + (g.known ? 'var(--ink-2)' : 'var(--sig)') + '">' + g.ghs + '</td></tr>';
          }).join('') + '</tbody></table>' : noneNote('原文未报告试剂清单。')
        }) +
        MR.panel({
          title: '配方与关键参数', meta: pf.formulation.length + ' 项', icon: 'plan', pad: true, tight: true,
          body: pf.formulation.length ? pf.formulation.map(function (f) {
            return '<div class="switchline"><span class="switchline__k">' + MR.esc(f.t) + '</span><span class="num" style="font-size:11px">' + MR.esc(f.v) + '</span></div>';
          }).join('') + '<div style="margin-top:12px">' + ev('以上参数逐条取自原文，未做换算或改写') + '</div>' : noneNote('原文未报告配比。')
        }) + '</div>';

      html += MR.panel({
        title: '操作工序', meta: an.steps.length + ' 步', icon: 'guide', pad: true, flush: true,
        body: an.steps.length ? '<div class="rowlist">' + an.steps.map(function (s, i) {
          return '<div class="rowitem" style="grid-template-columns:1fr 120px;cursor:default">' +
            '<span><span class="rowitem__title">(' + (i + 1) + ') ' + MR.esc(s.t) + '</span>' +
            '<span class="rowitem__sub">' + MR.esc(s.d) + '</span>' +
            (s.cond ? '<span class="chips" style="margin-top:7px"><span class="chip chip--acc">条件：' + MR.esc(s.cond) + '</span></span>' : '') +
            ev('来自原文「' + MR.esc(s.from || '正文') + '」') + '</span>' +
            '<span class="rowitem__side">' + (function () {
              var inst = an.instruments.filter(function (it) { return (s.d || '').indexOf(it.name.slice(0, 3)) >= 0; })[0];
              return inst ? MR.chip(inst.name.slice(0, 8), 'line') : MR.chip('设备未报告', 'line');
            })() + '</span></div>';
        }).join('') + '</div>' : noneNote('原文未报告工序。')
      }) + '<div class="mb-4"></div>';

      html += '<div class="grid g-2">' +
        MR.panel({
          title: '测试标准与判据', meta: an.standards.length + ' 项', icon: 'book', pad: true, tight: true,
          body: (an.standards.length ? an.standards.map(function (s) { return '<div class="switchline"><span class="switchline__k">' + MR.esc(s) + '</span>' + MR.chip('原文引用', 'acc') + '</div>'; }).join('') : noneNote('原文未引用标准编号。')) +
            '<div class="switchline"><span class="switchline__k">重复与误差</span>' +
            (/平行|重复|n\s*=\s*\d|标准差|±/.test(MR.state.rawText || '') ? MR.chip('原文有报告', 'ok') : MR.chip('原文未报告 → 建议 n ≥ 3', 'risk')) + '</div>'
        }) +
        MR.panel({
          title: '本文引用的参考文献', meta: an.references.length + ' 条', icon: 'lit', pad: true, flush: true,
          body: an.references.length ? '<div class="tbl-wrap" style="max-height:240px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
            an.references.slice(0, 20).map(function (r, i) {
              return '<tr><td class="num" style="width:36px;color:var(--ink-3)">[' + (i + 1) + ']</td><td class="wrap" style="font-size:11px">' + MR.esc(r.raw) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文未识别到参考文献。')
        }) + '</div>';
      return html;
    },
    mount: function (host) {
      var pr = host.querySelector('[data-act="print"]'); if (pr) pr.addEventListener('click', function () { window.print(); });
      var dl = host.querySelector('[data-act="dl"]');
      if (dl) dl.addEventListener('click', function () {
        var pf = PF(), an = AN(), L = [];
        L.push('# 实验指导书 · ' + (an.title || ''));
        L.push('');
        L.push('生成时间：' + new Date().toLocaleString('zh-CN'));
        L.push('来源文献：' + (MR.state.paper || {}).name);
        L.push('');
        L.push('## 一、原料与试剂');
        an.materials.forEach(function (m) { var g = MR.ghsOf(m.name); L.push('- ' + m.name + '｜' + (m.spec || m.purity || '规格未报告') + '｜' + (m.supplier || '') + '｜危害：' + g.ghs); });
        L.push('');
        L.push('## 二、配方与关键参数');
        pf.formulation.forEach(function (f) { L.push('- ' + f.t + '：' + f.v); });
        L.push('');
        L.push('## 三、操作工序');
        an.steps.forEach(function (s, i) { L.push((i + 1) + '. ' + s.t + (s.cond ? '（' + s.cond + '）' : '') + ' —— ' + s.d); });
        L.push('');
        L.push('## 四、仪器设备');
        an.instruments.forEach(function (i) { L.push('- ' + i.name + '｜' + (i.model || '型号未报告') + '｜' + (i.vendor || '')); });
        L.push('');
        L.push('## 五、测试标准');
        an.standards.forEach(function (s) { L.push('- ' + s); });
        L.push('');
        L.push('## 六、可测指标');
        pf.perf.forEach(function (i) { L.push('- ' + i.name + '（' + (i.unit || '单位未报告') + '）' + (i.optimum != null ? '，原文最优 ' + i.optimum : '')); });
        L.push('');
        L.push('## 七、参考文献（原文）');
        an.references.forEach(function (r, i) { L.push('[' + (i + 1) + '] ' + r.raw); });
        MR.dl('LATTICE-实验指导书.md', L.join('\n'), 'text/markdown');
      });
    }
  };

  /* ======================= 07 真实数据回填与矫正 ======================= */
  MR.views2.feedback = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '07', t: '真实数据回填', sub: '' }) + noPaper();
      var pf = PF();
      var inds = pf.perf || [];
      if (!inds.length) return MR.head({ n: '07', t: '真实数据回填与矫正', sub: '' }) + noneNote('原文未报告可测指标，无法进行数据比对。');
      var rd = MR.state.realData;
      var meas = MR.parseMeasured(rd, inds);
      var html = '';
      html += MR.head({
        n: '07', t: '真实数据回填与矫正',
        sub: '把你实测到的数据填进来。比对表只包含这篇论文实际测量的指标，不会出现原文没有的项目。',
        acts: '<button class="btn" data-act="csv">上传 CSV</button><button class="btn btn--primary" data-act="run">开始比对</button>'
      });
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '数据录入', meta: rd ? '已载入「' + MR.state.realSource + '」' : '粘贴或上传', icon: 'feedback', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:7px">按指标逐行填写（指标名, 数值）</div>' +
            '<textarea id="pa" class="eq" style="width:100%;height:130px;resize:vertical;white-space:pre">' +
            inds.map(function (i) { return i.name + ','; }).join('\n') + '</textarea>' +
            '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
            '<button class="btn" data-act="use">使用粘贴数据</button><button class="btn" data-act="demo">填入示例值</button>' +
            '<button class="btn" data-act="clear">清空</button></div>',
          note: '指标清单来自原文：' + inds.map(function (i) { return i.name; }).join('、')
        }) +
        '<div class="col">' + MR.panel({
          title: '原文报告的基准', meta: '来自抽取结果', icon: 'analysis', pad: true, tight: true,
          body: '<table class="tbl tbl--sm"><tbody>' + inds.map(function (i) {
            return '<tr><td class="strong wrap">' + MR.esc(i.name) + '</td>' +
              '<td class="num">' + (i.optimum != null ? i.optimum : '—') + '</td>' +
              '<td class="num" style="font-size:10.5px;color:var(--ink-3)">' + (i.improvement != null ? (i.improvement > 0 ? '+' : '') + i.improvement + '%' : '幅度未报告') + '</td></tr>';
          }).join('') + '</tbody></table>',
          note: '这两列是原文报告的最优水平与提升幅度，用作你实测值的对照基准。'
        }) + MR.panel({
          title: '偏差判定规则', meta: 'DECISION', icon: 'review1', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">|相对偏差| ≤ 10%</span>' + MR.chip('与原文一致', 'ok') + '</div>' +
            '<div class="switchline"><span class="switchline__k">10% < |偏差| ≤ 25%</span>' + MR.chip('需核查条件', 'sig') + '</div>' +
            '<div class="switchline"><span class="switchline__k">|偏差| > 25%</span>' + MR.chip('条件或方法有出入', 'risk') + '</div>' +
            '<div class="note" style="margin-top:12px">' + MR.icon('review1', 14) + '<span>判定阈值 10% / 25% 是通用经验值；原文若报告了误差量级，应以原文的误差为准。</span></div>'
        }) + '</div></div>';

      if (meas && Object.keys(meas).length) {
        html += MR.panel({
          title: '实测 vs 原文', meta: '逐指标比对', icon: 'analysis', pad: true, flush: true,
          body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>指标</th><th class="num">原文</th><th class="num">你的实测</th><th class="num">绝对偏差</th><th class="num">相对偏差</th><th>判定</th></tr></thead><tbody>' +
            Object.keys(meas).map(function (k) {
              var ind = inds.filter(function (x) { return x.name === k; })[0] || {};
              var base = ind.optimum != null ? ind.optimum : null;
              var rel = base ? (meas[k] - base) / base * 100 : null;
              var st = rel == null ? ['line', '无基准'] : (Math.abs(rel) <= 10 ? ['ok', '一致'] : (Math.abs(rel) <= 25 ? ['sig', '需核查'] : ['risk', '显著偏离']));
              return '<tr><td class="strong wrap">' + MR.esc(k) + '</td><td class="num">' + (base != null ? base : '—') + '</td>' +
                '<td class="num">' + meas[k] + '</td><td class="num">' + (rel == null ? '—' : ((meas[k] - base > 0 ? '+' : '') + (meas[k] - base).toFixed(2))) + '</td>' +
                '<td class="num">' + (rel == null ? '—' : (rel > 0 ? '+' : '') + rel.toFixed(1) + '%') + '</td>' +
                '<td>' + MR.chip(st[1], st[0]) + '</td></tr>';
            }).join('') + '</tbody></table></div>',
          note: '只比对原文报告了最优值的指标；原文未给最优值的指标无法计算偏差，显示为"—"。'
        });
      }
      return html;
    },
    mount: function (host) {
      var inds = PF().perf || [];
      var cs = host.querySelector('[data-act="csv"]'); if (cs) cs.addEventListener('click', function () { MR.pick('csv'); });
      var up = host.querySelector('[data-act="use"]');
      if (up) up.addEventListener('click', function () {
        var v = (host.querySelector('#pa').value || '').trim();
        var rows = v.split(/\n/).map(function (l) { return l.split(/[,\t]/).map(function (x) { return x.trim(); }); }).filter(function (r) { return r.length >= 2 && r[1] !== ''; });
        if (!rows.length) { MR.log('WARN', '未识别到"指标名, 数值"格式的数据'); return; }
        MR.state.realData = rows; MR.state.realSource = '手动粘贴';
        MR.log('OK', '载入 ' + rows.length + ' 项实测数据');
        MR.app.render();
      });
      var dm = host.querySelector('[data-act="demo"]');
      if (dm) dm.addEventListener('click', function () {
        host.querySelector('#pa').value = inds.map(function (i) {
          var base = i.optimum != null ? i.optimum : 10;
          return i.name + ',' + (base * (0.92 + Math.random() * 0.14)).toFixed(2);
        }).join('\n');
        MR.log('INFO', '已填入一组示例实测值（围绕原文最优值 ±8% 波动）');
      });
      var cl = host.querySelector('[data-act="clear"]');
      if (cl) cl.addEventListener('click', function () { MR.state.realData = null; MR.state.realSource = null; MR.app.render(); });
      var rn = host.querySelector('[data-act="run"]');
      if (rn) rn.addEventListener('click', function () { MR.app.runStage('feedback', { cb: function () { MR.app.render(); } }); });
    }
  };

  /* CSV 解析（供 app.js 调用） */
  MR.parseMeasured = function (rd, inds) {
    if (!rd || !rd.length) return null;
    var out = {};
    inds = inds || (PF().perf || []);
    rd.forEach(function (r) {
      if (!r || r.length < 2) return;
      var name = String(r[0]).trim(), val = parseFloat(r[1]);
      if (isNaN(val)) return;
      var hit = inds.filter(function (i) { return i.name === name || name.indexOf(i.name) >= 0 || i.name.indexOf(name) >= 0; })[0];
      out[hit ? hit.name : name] = val;
    });
    return Object.keys(out).length ? out : null;
  };
})();
