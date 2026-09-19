/* ============================================================
   LATTICE · 参数化科学图形生成器
   全部为矢量 SVG，绘制参数（颜色 / 线宽 / 字号）由 MR.colors 与
   MR.figSpec() 驱动，用户可逐项指定颜色 —— 输出符合 SCI 期刊制图习惯。
   ============================================================ */
window.MR = window.MR || {};

MR.figs = (function () {
  function S(k) { return MR.C(k); }
  function spec() { return MR.figSpec(); }
  function F(w) { return 'font-family="' + (w ? "'IBM Plex Sans','Microsoft YaHei',sans-serif" : "'IBM Plex Mono',Consolas,monospace") + '"'; }

  /* ---------- 基元 ---------- */
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" ' + F(o.mono) + ' font-size="' + (o.size || 10) + '" fill="' + (o.fill || '#22262A') +
      '" text-anchor="' + (o.anchor || 'start') + '"' + (o.weight ? ' font-weight="' + o.weight + '"' : '') +
      (o.rot ? ' transform="rotate(' + o.rot + ' ' + x + ' ' + y + ')"' : '') + '>' + s + '</text>';
  }
  function L(x1, y1, x2, y2, o) {
    o = o || {};
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.c || '#444') +
      '" stroke-width="' + (o.w || spec().line) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') +
      ' stroke-linecap="round"' + (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
  }
  function Poly(pts, o) {
    o = o || {};
    return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
      '" fill="' + (o.fill || 'none') + '" stroke="' + (o.c || '#444') + '" stroke-width="' + (o.w || spec().line) +
      '" stroke-linejoin="round" stroke-linecap="round"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function Box(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r === undefined ? 5 : o.r) +
      '" fill="' + (o.fill || '#FFFFFF') + '" stroke="' + (o.c || '#D5D0C6') + '" stroke-width="' + (o.w || 1) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function Circ(cx, cy, r, o) {
    o = o || {};
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.c || '#444') +
      '" stroke-width="' + (o.w || spec().line) + '"/>';
  }
  function arrowDefs(id, color) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0.5 L10 5 L0 9.5 z" fill="' + color + '"/></marker></defs>';
  }
  function Arrow(x1, y1, x2, y2, o) {
    o = o || {};
    var id = 'ar' + Math.round(x1) + '_' + Math.round(y1) + '_' + Math.round(x2) + '_' + Math.round(y2) + (o.c || '').replace(/[^a-z0-9]/gi, '');
    return arrowDefs(id, o.c || '#444') + L(x1, y1, x2, y2, { c: o.c || '#444', w: o.w || spec().line, dash: o.dash }) +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.c || '#444') + '" stroke-width="' + (o.w || spec().line) +
      '" marker-end="url(#' + id + ')" stroke-linecap="round"/>';
  }

  /* ---------- 分子结构 ---------- */
  /* 吡喃糖环（纤维素重复单元），hl 指定高亮的碳位 */
  function pyranose(cx, cy, r, o) {
    o = o || {};
    var pts = [], i;
    for (i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + Math.PI * 2 * i / 6;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    var s = Poly(pts, { c: o.c || S('fiber'), w: o.w || spec().line });
    /* 环内氧 */
    s += T(cx + r * 0.62, cy - r * 0.72, 'O', { size: 9, fill: o.c || S('fiber'), anchor: 'middle', weight: 600 });
    /* 取代基 */
    var labs = [['OH', 0], ['H', 2], ['OH', 4]];
    labs.forEach(function (lb) {
      var p = pts[lb[1]];
      var dx = (p[0] - cx) * 0.34, dy = (p[1] - cy) * 0.34;
      s += T(p[0] + dx, p[1] + dy + 3, lb[0], { size: 8.5, fill: o.c || S('fiber'), anchor: 'middle' });
    });
    /* C6 羟甲基，可高亮为羧基 */
    var c6 = pts[1];
    var hx = c6[0] + (c6[0] - cx) * 0.42, hy = c6[1] + (c6[1] - cy) * 0.42;
    s += L(c6[0], c6[1], hx, hy, { c: o.c || S('fiber'), w: spec().line * 0.9 });
    var lbl = o.ox ? 'COOH' : 'CH₂OH';
    var col = o.ox ? S('sub') : (o.c || S('fiber'));
    s += T(hx + (hx > cx ? 3 : -3), hy + (hy > cy ? 8 : -3), lbl, { size: 8.5, fill: col, anchor: hx > cx ? 'start' : 'end', weight: o.ox ? 600 : 400 });
    if (o.ox) s += Circ(hx + (hx > cx ? 17 : -17), hy + (hy > cy ? 4 : -6), 2.6, { fill: S('sub'), c: S('sub') });
    return s;
  }
  /* 纤维素链（n 个环，可指定哪个环被氧化） */
  function cellulose(cx, cy, n, o) {
    o = o || {};
    var r = o.r || 13, gap = r * 2.3, s = '';
    var x0 = cx - gap * (n - 1) / 2;
    for (var i = 0; i < n; i++) {
      s += pyranose(x0 + gap * i, cy, r, { c: o.c || S('fiber'), ox: o.ox === i });
      if (i < n - 1) {
        var xa = x0 + gap * i + r, xb = x0 + gap * (i + 1) - r;
        s += L(xa, cy, xb, cy, { c: o.c || S('fiber'), w: spec().line * 0.9 });
        s += T((xa + xb) / 2, cy - 4, 'O', { size: 8, fill: o.c || S('fiber'), anchor: 'middle' });
      }
    }
    return s;
  }
  /* TEMPO 氮氧自由基 */
  function tempo(cx, cy, r, o) {
    o = o || {};
    var s = '', i, pts = [];
    for (i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + Math.PI * 2 * i / 6;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    s = Poly(pts, { c: o.c || S('oxi'), w: spec().line });
    /* N-O• 在环上顶点 */
    s += Circ(cx, cy, 2.4, { fill: o.c || S('oxi'), c: o.c || S('oxi') });
    s += T(cx + 3, cy - r - 3, 'N', { size: 9.5, fill: o.c || S('oxi'), weight: 600 });
    s += T(cx + 12, cy - r - 3, '—O•', { size: 9.5, fill: o.c || S('oxi'), weight: 600 });
    /* 四个甲基 */
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      var x = cx + q[0] * r * 0.72, y = cy + q[1] * r * 0.72;
      s += L(cx + q[0] * r * 0.45, cy + q[1] * r * 0.45, x, y, { c: o.c || S('oxi'), w: spec().line * 0.85 });
      s += T(x + q[0] * 8, y + q[1] * 4 + 3, 'CH₃', { size: 8, fill: o.c || S('oxi'), anchor: 'middle' });
    });
    return s;
  }
  /* 过碘酸根 IO4- */
  function periodate(cx, cy, r, o) {
    o = o || {};
    var s = T(cx, cy + 5, 'IO₄⁻', { size: 13, fill: o.c || S('oxi'), anchor: 'middle', weight: 600 });
    s += Circ(cx, cy, r, { c: o.c || S('oxi'), w: 1, dash: '3 3' });
    return s;
  }
  /* EDC / NHS 活化剂（示意） */
  function edc(cx, cy, o) {
    o = o || {};
    var c = o.c || S('link');
    return Box(cx - 26, cy - 13, 52, 26, { c: c, r: 4, fill: '#fff' }) +
      T(cx, cy - 2, 'EDC', { size: 9.5, fill: c, anchor: 'middle', weight: 600 }) +
      T(cx, cy + 9, 'N=C=N', { size: 8, fill: c, anchor: 'middle' }) +
      Box(cx + 34, cy - 11, 40, 22, { c: c, r: 4, fill: '#fff', dash: '3 2' }) +
      T(cx + 54, cy + 4, 'NHS', { size: 9, fill: c, anchor: 'middle' });
  }
  /* HTCC 季铵化壳聚糖链 */
  function htcc(cx, cy, n, o) {
    o = o || {};
    var s = '', r = o.r || 11, gap = r * 2.35;
    var x0 = cx - gap * (n - 1) / 2;
    for (var i = 0; i < n; i++) {
      var x = x0 + gap * i, c = o.c || S('anti');
      var pts = [], k;
      for (k = 0; k < 6; k++) {
        var a = -Math.PI / 2 + Math.PI * 2 * k / 6;
        pts.push([x + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      s += Poly(pts, { c: c, w: spec().line });
      s += T(x + r * 0.6, cy - r * 0.7, 'O', { size: 8, fill: c, anchor: 'middle' });
      if (i < n - 1) {
        s += L(x + r, cy, x + gap - r, cy, { c: c, w: spec().line * 0.9 });
        s += T(x + gap / 2, cy - 4, 'O', { size: 8, fill: c, anchor: 'middle' });
      }
      /* 季铵侧基 */
      if (i % 1 === 0) {
        var px = x + r * 0.72, py = cy + r * 0.82;
        s += L(x + r * 0.4, cy + r * 0.5, px, py, { c: c, w: spec().line * 0.9 });
        s += Circ(px + 11, py + 4, 8.5, { fill: '#fff', c: c, w: 1.2 });
        s += T(px + 11, py + 7.5, 'N⁺', { size: 8.5, fill: c, anchor: 'middle', weight: 700 });
        s += T(px + 24, py + 8, '(CH₃)₃', { size: 8, fill: c, anchor: 'start' });
      }
    }
    return s;
  }
  /* 细菌（带膜脂双层） */
  function bacteria(cx, cy, w, h, o) {
    o = o || {};
    var c = o.c || S('bacteria'), s = '';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + w + '" ry="' + h + '" fill="#fff" stroke="' + c + '" stroke-width="' + (spec().line + 0.3) + '"/>';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (w - 4) + '" ry="' + (h - 4) + '" fill="none" stroke="' + c + '" stroke-width="0.8" opacity="0.6"/>';
    var dots = o.broken ? 12 : 18;
    for (var i = 0; i < dots; i++) {
      var a = Math.PI * 2 * i / dots;
      var skip = o.broken && (i > 3 && i < 8);
      if (skip) continue;
      s += Circ(cx + Math.cos(a) * (w - 2), cy + Math.sin(a) * (h - 2), 1.4, { fill: c, c: c });
    }
    if (o.broken) {
      s += L(cx - w + 2, cy - h + 4, cx - w + 12, cy - h + 14, { c: S('ros'), w: 2 });
      s += L(cx + w - 4, cy + h - 12, cx + w - 12, cy + h - 4, { c: S('ros'), w: 2 });
      s += T(cx, cy + h + 13, '膜破裂 · 胞内物泄漏', { size: 8.5, fill: S('anti'), anchor: 'middle' });
    }
    /* 胞内 DNA 示意 */
    s += Poly([[cx - w * 0.45, cy], [cx - w * 0.15, cy - 4], [cx + w * 0.15, cy + 4], [cx + w * 0.45, cy]],
      { c: c, w: 1.1, dash: '2 2' });
    return s;
  }

  /* ---------- 仪器线稿 ---------- */
  function inst(cx, cy, kind, c) {
    c = c || '#5A6169';
    var s = '', w = spec().line;
    if (kind === 'beaker') {
      s += Poly([[cx - 11, cy - 13], [cx + 11, cy - 13], [cx + 9, cy + 12], [cx - 9, cy + 12], [cx - 11, cy - 13]], { c: c, w: w });
      s += L(cx - 13, cy - 13, cx + 13, cy - 13, { c: c, w: w });
      s += '<path d="M' + (cx - 9.6) + ' ' + (cy + 2) + ' Q' + cx + ' ' + (cy - 1) + ' ' + (cx + 9.6) + ' ' + (cy + 2) + ' L' + (cx + 9) + ' ' + (cy + 12) + ' L' + (cx - 9) + ' ' + (cy + 12) + ' Z" fill="' + c + '" opacity="0.14"/>';
      s += T(cx, cy + 26, '反应釜 / 烧杯', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'ph') {
      s += Box(cx - 13, cy - 14, 26, 20, { c: c, r: 3 });
      s += T(cx, cy, 'pH', { size: 9, fill: c, anchor: 'middle', weight: 600 });
      s += L(cx, cy + 6, cx, cy + 14, { c: c, w: w });
      s += Circ(cx, cy + 16, 2.4, { c: c, fill: c });
      s += T(cx, cy + 30, 'pH 自动滴定', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'oven') {
      s += Box(cx - 17, cy - 12, 34, 24, { c: c, r: 3 });
      s += Box(cx - 13, cy - 8, 26, 16, { c: c, r: 2, dash: '2 2' });
      s += Poly([[cx - 8, cy + 4], [cx - 4, cy - 4], [cx, cy + 4], [cx + 4, cy - 4], [cx + 8, cy + 4]], { c: S('oxi'), w: 1.4 });
      s += T(cx, cy + 26, '管式炉 / 干燥箱', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'shaker') {
      s += Box(cx - 16, cy - 11, 32, 22, { c: c, r: 3 });
      s += Poly([[cx - 11, cy + 3], [cx - 5, cy - 5], [cx + 1, cy + 3], [cx + 7, cy - 5], [cx + 11, cy + 1]], { c: c, w: 1.3 });
      s += T(cx, cy + 26, '恒温振荡器', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'ftir') {
      s += Box(cx - 18, cy - 11, 36, 22, { c: c, r: 3 });
      s += Circ(cx - 8, cy, 4, { c: c });
      s += L(cx - 4, cy, cx + 12, cy, { c: S('sub'), w: 1.6, dash: '3 2' });
      s += T(cx + 10, cy - 4, 'IR', { size: 8, fill: S('sub'), anchor: 'middle' });
      s += T(cx, cy + 26, 'FTIR-ATR', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'sem') {
      s += Poly([[cx - 7, cy - 16], [cx + 7, cy - 16], [cx + 12, cy + 8], [cx - 12, cy + 8], [cx - 7, cy - 16]], { c: c, w: w });
      s += L(cx, cy + 8, cx, cy + 14, { c: S('sub'), w: 1.6 });
      s += '<path d="M' + (cx - 8) + ' ' + (cy + 14) + ' L' + (cx + 8) + ' ' + (cy + 14) + ' L' + (cx + 5) + ' ' + (cy + 18) + ' L' + (cx - 5) + ' ' + (cy + 18) + ' Z" fill="' + S('sub') + '" opacity="0.25"/>';
      s += T(cx, cy + 30, 'SEM / XPS', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'dish') {
      s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="16" ry="6" fill="none" stroke="' + c + '" stroke-width="' + w + '"/>';
      s += '<path d="M' + (cx - 16) + ' ' + cy + ' a16 6 0 0 0 32 0" fill="none" stroke="' + c + '" stroke-width="' + w + '"/>';
      s += '<ellipse cx="' + cx + '" cy="' + (cy - 4) + '" rx="16" ry="6" fill="' + S('bacteria') + '" opacity="0.12" stroke="' + c + '" stroke-width="' + w + '"/>';
      for (var i = 0; i < 6; i++) {
        var a = Math.PI * 2 * i / 6 + 0.4;
        s += Circ(cx + Math.cos(a) * 9, cy - 4 + Math.sin(a) * 3.2, 1.3, { fill: S('bacteria'), c: S('bacteria') });
      }
      s += T(cx, cy + 22, '抗菌 / 抗生物膜', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'balance') {
      s += Box(cx - 15, cy - 9, 30, 18, { c: c, r: 3 });
      s += T(cx, cy + 3, '0.000 g', { size: 7.5, fill: c, anchor: 'middle' });
      s += Box(cx - 8, cy - 15, 16, 6, { c: c, r: 2 });
      s += T(cx, cy + 24, '分析天平', { size: 8.5, fill: c, anchor: 'middle' });
    } else if (kind === 'tensile') {
      s += Box(cx - 15, cy - 12, 8, 24, { c: c, r: 2 });
      s += Box(cx + 7, cy - 12, 8, 24, { c: c, r: 2 });
      s += L(cx - 3, cy - 6, cx + 3, cy - 6, { c: S('fiber'), w: 3 });
      s += Poly([[cx - 3, cy - 4], [cx, cy + 2], [cx + 3, cy - 4]], { c: c, w: 1.2 });
      s += T(cx, cy + 26, '织物强力仪', { size: 8.5, fill: c, anchor: 'middle' });
    }
    return s;
  }

  /* ================================================================
     图 1 · 实验流程图（仪器 + 分子 + 反应条件）
     ================================================================ */
  function flow(w) {
    var h = 500, pad = 16;
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg"' + ' ' + F() + '>';
    s += '<rect width="' + w + '" height="' + h + '" fill="' + spec().bg + '"/>';

    var stages = [
      { k: 'S1', t: '碱预处理', ins: 'beaker', cond: '0.5% NaOH\n60 °C / 30 min\n浴比 1:30' },
      { k: 'S2', t: '选择性氧化', ins: 'ph', cond: 'TEMPO/NaBr/NaClO\npH 10.2 / 25 °C\n120 min + EDTA' },
      { k: 'S3', t: '活化与接枝', ins: 'shaker', cond: 'EDC/NHS (2:1)\n4 °C / 30 min\nHTCC 12 g/L / 60 °C' },
      { k: 'S4', t: '表征与生物评价', ins: 'ftir', cond: 'FTIR / XPS / SEM\nGB/T 20944.3\n结晶紫 + CLSM' }
    ];
    var gap = 22, bw = (w - pad * 2 - gap * 3) / 4;
    var y0 = 74, bh = 320;

    stages.forEach(function (st, i) {
      var x = pad + i * (bw + gap);
      s += Box(x, y0, bw, bh, { c: i === 1 ? S('sub') : '#DAD5CB', w: i === 1 ? 1.6 : 1, fill: '#FFFFFF', r: 6 });
      s += Box(x, y0, bw, 24, { c: i === 1 ? S('sub') : '#DAD5CB', r: 6, fill: i === 1 ? S('sub') : '#F3F1EC' });
      s += '<rect x="' + x + '" y="' + (y0 + 18) + '" width="' + bw + '" height="6" fill="' + (i === 1 ? S('sub') : '#F3F1EC') + '"/>';
      s += T(x + 10, y0 + 16, st.k + '  ' + st.t, { size: 10.5, weight: 600, fill: i === 1 ? '#fff' : '#22262A' });

      /* 仪器 */
      s += inst(x + bw / 2, y0 + 76, st.ins, '#6B7278');

      /* 分子区 */
      var my = y0 + 164;
      s += Box(x + 8, my - 46, bw - 16, 94, { c: '#EBE7DF', r: 4, fill: '#FBFAF8' });
      if (i === 0) {
        s += cellulose(x + bw / 2, my, 2, { r: 12, c: S('fiber') });
        s += T(x + bw / 2, my + 34, '棉纤维素（含戊糖伴生物）', { size: 8, fill: '#7A8288', anchor: 'middle' });
      } else if (i === 1) {
        s += cellulose(x + bw * 0.42, my - 14, 2, { r: 12, c: S('fiber'), ox: 1 });
        s += T(x + bw * 0.42, my + 20, 'C6 伯羟基 → 羧基', { size: 8, fill: S('sub'), anchor: 'middle', weight: 600 });
        s += tempo(x + bw - 26, my + 18, 8, {});
        s += T(x + bw - 26, my + 42, 'TEMPO', { size: 7.5, fill: S('oxi'), anchor: 'middle' });
      } else if (i === 2) {
        s += cellulose(x + 26, my - 12, 1, { r: 11, c: S('fiber'), ox: 1 });
        s += T(x + 26, my + 12, '—COOH', { size: 8, fill: S('sub'), anchor: 'middle', weight: 600 });
        s += Arrow(x + 44, my - 12, x + 62, my - 12, { c: S('link'), w: 1.4 });
        s += T(x + 53, my - 18, 'EDC', { size: 7.5, fill: S('link'), anchor: 'middle' });
        s += Circ(x + 70, my - 12, 3.2, { fill: S('link'), c: S('link') });
        s += L(x + 73, my - 12, x + 88, my - 12, { c: S('link'), w: 1.4 });
        s += T(x + 80, my - 18, 'NH', { size: 7.5, fill: S('link'), anchor: 'middle' });
        s += htcc(x + bw * 0.66, my + 24, 2, { r: 10 });
      } else {
        s += inst(x + bw * 0.27, my - 26, 'sem', '#6B7278');
        s += inst(x + bw * 0.73, my - 26, 'dish', '#6B7278');
        s += inst(x + bw * 0.5, my + 16, 'tensile', '#6B7278');
      }

      /* 条件 */
      var condY = y0 + 240;
      s += T(x + 10, condY - 6, '条件', { size: 8.5, fill: '#8C949C', weight: 600 });
      st.cond.split('\n').forEach(function (line, li) {
        s += T(x + 10, condY + 9 + li * 13, line, { size: 8.5, fill: '#4B535B' });
      });

      if (i < 3) {
        var ax = x + bw + 3, ay = y0 + bh / 2;
        s += Arrow(ax, ay, ax + gap - 6, ay, { c: '#9AA0A6', w: 1.6 });
      }
    });

    /* 底部：反应式总结条 */
    var by = y0 + bh + 20;
    s += Box(pad, by, w - pad * 2, 62, { c: '#EBE7DF', r: 5, fill: '#FBFAF8' });
    s += T(pad + 12, by + 18, '关键反应', { size: 9, fill: '#8C949C', weight: 600 });
    s += T(pad + 12, by + 36, 'Cellulose–CH₂OH  →(TEMPO/NaBr/NaClO, pH 10.2)  Cellulose–COOH  →(EDC/NHS)  Cellulose–CO–NHS  →(HTCC)  Cellulose–CO–NH–HTCC⁺',
      { size: 10, fill: '#22262A', mono: true });
    s += T(pad + 12, by + 53, '接触型杀菌：Cellulose–CO–NH–HTCC⁺  +  细菌膜磷脂  →  膜电位崩溃 → 胞内物泄漏 → 菌体死亡', { size: 9.5, fill: S('anti'), mono: true });

    /* 图注 */
    s += T(pad, 22, '图 1', { size: 11, weight: 700, fill: '#22262A' });
    s += T(pad + 32, 22, '棉织物选择性氧化—季铵化壳聚糖接枝制备与评价流程（S1–S4）', { size: 10.5, fill: '#4B535B' });
    s += T(w - pad, 22, 'LATTICE 生成 · 配色可编辑', { size: 8.5, fill: '#9AA0A6', anchor: 'end' });
    s += '</svg>';
    return s;
  }

  /* ================================================================
     图 2 · 分子级反应机理图
     ================================================================ */
  function mech(w) {
    var h = 620, pad = 18;
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" ' + F() + '>';
    s += '<rect width="' + w + '" height="' + h + '" fill="' + spec().bg + '"/>';
    s += T(pad, 22, '图 2', { size: 11, weight: 700 });
    s += T(pad + 32, 22, '分子级反应机理：从纤维素 C6 伯羟基到接触型杀菌表面', { size: 10.5, fill: '#4B535B' });

    var y = 48, rowH = 112;
    /* 步骤 1 */
    s += Box(pad, y, w - pad * 2, rowH, { c: '#EBE7DF', r: 5, fill: '#FFFFFF' });
    s += T(pad + 10, y + 18, '① C6 选择性氧化', { size: 10, weight: 600, fill: S('sub') });
    s += cellulose(pad + 120, y + 52, 3, { r: 15, c: S('fiber'), ox: 1 });
    s += T(pad + 120, y + 86, '纤维素（β-1,4 葡聚糖）', { size: 8.5, fill: '#8C949C', anchor: 'middle' });
    s += Arrow(pad + 250, y + 52, pad + 320, y + 52, { c: S('oxi'), w: 1.8 });
    s += T(pad + 285, y + 44, 'TEMPO/NaBr/NaClO', { size: 8.5, fill: S('oxi'), anchor: 'middle', mono: true });
    s += T(pad + 285, y + 66, 'pH 10.2 · 25 °C', { size: 8.5, fill: '#8C949C', anchor: 'middle' });
    s += cellulose(pad + 430, y + 52, 3, { r: 15, c: S('fiber'), ox: 1 });
    s += Circ(pad + 470, y + 34, 4.4, { fill: 'none', c: S('sub'), w: 1.4 });
    s += T(pad + 470, y + 37, 'C6', { size: 7.5, fill: S('sub'), anchor: 'middle', weight: 700 });
    s += T(pad + 430, y + 86, '仅微纤表面 C6 被氧化 → 羧基', { size: 8.5, fill: S('sub'), anchor: 'middle' });

    /* 步骤 2 */
    y += rowH + 12;
    s += Box(pad, y, w - pad * 2, rowH, { c: '#EBE7DF', r: 5, fill: '#FFFFFF' });
    s += T(pad + 10, y + 18, '② 羧基活化生成 NHS 酯', { size: 10, weight: 600, fill: S('link') });
    s += cellulose(pad + 90, y + 52, 2, { r: 13, c: S('fiber'), ox: 1 });
    s += T(pad + 90, y + 84, '—COOH', { size: 9, fill: S('sub'), anchor: 'middle', weight: 600 });
    s += Arrow(pad + 170, y + 52, pad + 220, y + 52, { c: S('link'), w: 1.6 });
    s += edc(pad + 292, y + 52, {});
    s += Arrow(pad + 370, y + 52, pad + 420, y + 52, { c: S('link'), w: 1.6 });
    s += cellulose(pad + 500, y + 52, 2, { r: 13, c: S('fiber'), ox: 1 });
    s += T(pad + 500, y + 84, '—CO–NHS 活性酯', { size: 9, fill: S('link'), anchor: 'middle', weight: 600 });
    s += T(w - pad - 12, y + 18, '4 °C · 30 min · MES pH 5.5', { size: 8.5, fill: '#8C949C', anchor: 'end' });

    /* 步骤 3 */
    y += rowH + 12;
    s += Box(pad, y, w - pad * 2, rowH, { c: '#EBE7DF', r: 5, fill: '#FFFFFF' });
    s += T(pad + 10, y + 18, '③ 酰胺化接枝季铵化壳聚糖', { size: 10, weight: 600, fill: S('anti') });
    s += htcc(pad + 120, y + 44, 3, { r: 12 });
    s += T(pad + 120, y + 82, 'HTCC（N⁺(CH₃)₃ 季铵基团）', { size: 8.5, fill: S('anti'), anchor: 'middle' });
    s += Arrow(pad + 250, y + 52, pad + 320, y + 52, { c: S('anti'), w: 1.8 });
    s += T(pad + 285, y + 44, '60 °C · 3 h', { size: 8.5, fill: '#8C949C', anchor: 'middle' });
    s += T(pad + 285, y + 66, '浴比 1:40', { size: 8.5, fill: '#8C949C', anchor: 'middle' });
    s += cellulose(pad + 430, y + 46, 2, { r: 12, c: S('fiber') });
    s += Poly([[pad + 452, y + 58], [pad + 462, y + 76], [pad + 478, y + 76], [pad + 488, y + 58]], { c: S('anti'), w: 1.2 });
    s += Circ(pad + 470, y + 82, 7, { fill: '#fff', c: S('anti'), w: 1.2 });
    s += T(pad + 470, y + 85, 'N⁺', { size: 8, fill: S('anti'), anchor: 'middle', weight: 700 });
    s += T(pad + 470, y + 98, '共价酰胺键固定在纤维表面', { size: 8, fill: S('anti'), anchor: 'middle' });

    /* 步骤 4 - 杀菌 */
    y += rowH + 12;
    s += Box(pad, y, w - pad * 2, rowH + 8, { c: '#EBE7DF', r: 5, fill: '#FFFFFF' });
    s += T(pad + 10, y + 18, '④ 接触型杀菌：静电吸附 + 膜插入', { size: 10, weight: 600, fill: S('anti') });
    s += cellulose(pad + 80, y + 56, 2, { r: 12, c: S('fiber') });
    s += Circ(pad + 100, y + 34, 7, { fill: '#fff', c: S('anti'), w: 1.3 });
    s += T(pad + 100, y + 37, 'N⁺', { size: 8, fill: S('anti'), anchor: 'middle', weight: 700 });
    s += Arrow(pad + 118, y + 40, pad + 160, y + 40, { c: S('anti'), w: 1.6 });
    s += T(pad + 139, y + 32, '静电吸引', { size: 8, fill: S('anti'), anchor: 'middle' });
    s += bacteria(pad + 250, y + 48, 46, 26, { broken: false });
    s += T(pad + 250, y + 92, '接触前：膜完整', { size: 8.5, fill: '#8C949C', anchor: 'middle' });
    s += Arrow(pad + 320, y + 48, pad + 372, y + 48, { c: S('ros'), w: 1.8 });
    s += T(pad + 346, y + 40, '烷基链插入', { size: 8, fill: S('ros'), anchor: 'middle' });
    s += bacteria(pad + 470, y + 48, 46, 26, { broken: true });
    s += T(pad + 470, y + 92, '接触后：膜破裂 · 死亡', { size: 8.5, fill: S('anti'), anchor: 'middle' });

    /* 底部 ROS 辅助路径 */
    var by = y + rowH + 34;
    s += Box(pad, by, w - pad * 2, 62, { c: S('ros'), r: 5, fill: '#FFFFFF', dash: '4 3' });
    s += T(pad + 12, by + 18, '⑤ 辅助路径：活性氧与脂质过氧化链式放大', { size: 9.5, weight: 600, fill: S('ros') });
    s += T(pad + 12, by + 36, 'O₂ + e⁻ → O₂•⁻  →(SOD)  H₂O₂  →(Fe²⁺, Fenton)  •OH  →  膜脂链式过氧化  →  不可逆破坏',
      { size: 9.5, fill: '#4B535B', mono: true });
    s += T(pad + 12, by + 53, '风险：同一机理会攻击纤维素本身（Fenton 催化脆损）→ 必须加入金属螯合剂（EDTA-2Na 0.5 g/L）',
      { size: 9, fill: S('oxi'), mono: true });

    return s + '</svg>';
  }

  /* ================================================================
     图 3 · 表面作用示意（纤维—接枝层—细菌）
     ================================================================ */
  function surface(w) {
    var h = 300, pad = 18;
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" ' + F() + '>';
    s += '<rect width="' + w + '" height="' + h + '" fill="' + spec().bg + '"/>';
    s += T(pad, 22, '图 3', { size: 11, weight: 700 });
    s += T(pad + 32, 22, '未处理棉织物 vs 接枝棉织物的表面作用对比', { size: 10.5, fill: '#4B535B' });

    var half = (w - pad * 2 - 20) / 2;
    [[0, false], [1, true]].forEach(function (cfg) {
      var x0 = pad + cfg[0] * (half + 20), grafted = cfg[1];
      s += Box(x0, 40, half, 220, { c: grafted ? S('anti') : '#DAD5CB', r: 5, fill: '#FFFFFF', w: grafted ? 1.4 : 1 });
      s += T(x0 + 12, 58, grafted ? '接枝棉织物（本工作）' : '未处理棉织物（对照）', { size: 10, weight: 600, fill: grafted ? S('anti') : '#4B535B' });

      /* 纤维截面 */
      var fy = 200;
      s += '<path d="M' + (x0 + 16) + ' ' + fy + ' q' + (half / 2) + ' -22 ' + (half - 32) + ' 0 q-' + (half / 2) + ' 30 -' + (half - 32) + ' 0 Z" fill="' + S('fiber') + '" opacity="0.18" stroke="' + S('fiber') + '" stroke-width="1.2"/>';
      s += T(x0 + half / 2, fy + 34, '棉纤维（纤维素微纤）', { size: 8.5, fill: '#7A8288', anchor: 'middle' });

      /* 接枝层 */
      if (grafted) {
        for (var i = 0; i < 7; i++) {
          var gx = x0 + 34 + i * (half - 68) / 6;
          s += L(gx, fy - 12, gx, fy - 30, { c: S('sub'), w: 1.3 });
          s += Circ(gx, fy - 34, 5.6, { fill: '#fff', c: S('anti'), w: 1.2 });
          s += T(gx, fy - 31.4, 'N⁺', { size: 7, fill: S('anti'), anchor: 'middle', weight: 700 });
        }
        s += T(x0 + half / 2, fy - 48, '共价接枝的季铵基团（接触型）', { size: 8.5, fill: S('anti'), anchor: 'middle' });
        /* 死菌 */
        [[0.3, 120, true], [0.68, 132, true]].forEach(function (q) {
          s += bacteria(x0 + half * q[0], q[1], 20, 12, { broken: true });
        });
        s += T(x0 + half / 2, 96, '接触即被杀灭 · 生物膜难以形成', { size: 9, fill: S('anti'), anchor: 'middle', weight: 600 });
      } else {
        /* 生物膜 */
        s += '<path d="M' + (x0 + 30) + ' ' + (fy - 10) + ' q' + (half / 2 - 30) + ' -34 ' + (half - 60) + ' 0" fill="' + S('bacteria') + '" opacity="0.16" stroke="' + S('bacteria') + '" stroke-width="1" stroke-dasharray="3 3"/>';
        [[0.24, 152], [0.46, 140], [0.68, 150], [0.36, 168], [0.58, 170], [0.5, 116]].forEach(function (q) {
          s += bacteria(x0 + half * q[0], q[1], 19, 11, { broken: false });
        });
        s += T(x0 + half / 2, 96, '细菌黏附 → 分泌胞外基质 → 形成生物膜', { size: 9, fill: S('bacteria'), anchor: 'middle', weight: 600 });
        s += T(x0 + half / 2, fy - 40, '生物膜扩散屏障：抗菌剂难以进入内层', { size: 8.5, fill: S('ros'), anchor: 'middle' });
      }
    });

    /* 图例 */
    var ly = 272;
    MR.colorMeta.forEach(function (c, i) {
      var lx = pad + i * ((w - pad * 2) / MR.colorMeta.length);
      if (i % 1 === 0) {
        s += Circ(lx + 5, ly - 3, 4.4, { fill: MR.colors[c.k], c: MR.colors[c.k] });
        s += T(lx + 13, ly, c.t, { size: 8.5, fill: '#4B535B' });
      }
    });
    return s + '</svg>';
  }

  return { flow: flow, mech: mech, surface: surface, inst: inst, cellulose: cellulose, htcc: htcc, tempo: tempo, bacteria: bacteria, pyranose: pyranose, periodate: periodate };
})();
