/* ============================================================
   LATTICE · SVG 图表库
   纯手写 SVG，无第三方依赖，按容器实测宽度渲染以获得正确排版
   ============================================================ */
window.MR = window.MR || {};

MR.charts = (function () {

  var MONO = "'IBM Plex Mono', Consolas, monospace";
  var SANS = "'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif";

  function svgOpen(w, h) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img">';
  }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + (o.mono === false ? SANS : MONO) +
      '" font-size="' + (o.size || 9.5) + '" fill="' + (o.fill || 'var(--ink-4)') +
      '" text-anchor="' + (o.anchor || 'start') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') +
      (o.rot ? ' transform="rotate(' + o.rot + ' ' + x + ' ' + y + ')"' : '') + '>' + s + '</text>';
  }
  function fmt(v, d) { d = d === undefined ? 1 : d; return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  function niceTicks(y0, y1, n) {
    var step = (y1 - y0) / n, out = [];
    for (var i = 0; i <= n; i++) out.push(y0 + step * i);
    return out;
  }

  /* ---------- 折线图（支持误差棒 / 基线 / 面积） ---------- */
  function lineErr(w, spec) {
    var pad = { l: 48, r: 16, t: 16, b: 34 };
    var h = spec.height || 232;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var y0 = spec.y0, y1 = spec.y1;
    var n = spec.xLabels.length;
    var X = function (i) { return pad.l + (n === 1 ? iw / 2 : iw * i / (n - 1)); };
    var Y = function (v) { return pad.t + ih - ih * (v - y0) / (y1 - y0); };

    var s = svgOpen(w, h);

    /* 网格与 Y 轴 */
    var ticks = niceTicks(y0, y1, 4);
    ticks.forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) +
        '" stroke="var(--line-2)" stroke-width="1"/>';
      s += txt(pad.l - 7, Y(t) + 3.2, fmt(t, spec.yDec === undefined ? 0 : spec.yDec), { anchor: 'end' });
    });
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="var(--line-strong)" stroke-width="1"/>';

    /* 基线 */
    if (spec.base !== undefined && spec.base !== null) {
      s += '<line x1="' + pad.l + '" y1="' + Y(spec.base).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(spec.base).toFixed(1) +
        '" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>';
      s += txt(w - pad.r, Y(spec.base) - 5, spec.baseLabel || ('基线 ' + spec.base), { anchor: 'end', fill: 'var(--ink-3)', size: 9 });
    }

    /* X 轴刻度 */
    spec.xLabels.forEach(function (l, i) {
      s += txt(X(i), pad.t + ih + 15, l, { anchor: 'middle', fill: 'var(--ink-3)' });
    });
    if (spec.xTitle) s += txt(pad.l + iw / 2, h - 3, spec.xTitle, { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    if (spec.yTitle) s += txt(11, pad.t + ih / 2, spec.yTitle, { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });

    /* 序列 */
    spec.series.forEach(function (se) {
      var pts = se.vals.map(function (v, i) { return [X(i), Y(v)]; });
      var col = 'var(' + se.color + ')';
      /* 面积 */
      if (spec.area && se.best) {
        var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
          ' L' + X(n - 1).toFixed(1) + ' ' + (pad.t + ih) + ' L' + X(0).toFixed(1) + ' ' + (pad.t + ih) + ' Z';
        s += '<path d="' + d + '" fill="' + col + '" opacity="0.07"/>';
      }
      /* 误差棒 */
      if (se.sd) {
        se.sd.forEach(function (sd, i) {
          if (!sd) return;
          var yA = Y(se.vals[i] - sd), yB = Y(se.vals[i] + sd), x = X(i);
          s += '<line x1="' + x.toFixed(1) + '" y1="' + yA.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + yB.toFixed(1) +
            '" stroke="' + col + '" stroke-width="1" opacity="0.5"/>';
          s += '<line x1="' + (x - 3.5).toFixed(1) + '" y1="' + yA.toFixed(1) + '" x2="' + (x + 3.5).toFixed(1) + '" y2="' + yA.toFixed(1) + '" stroke="' + col + '" stroke-width="1" opacity="0.5"/>';
          s += '<line x1="' + (x - 3.5).toFixed(1) + '" y1="' + yB.toFixed(1) + '" x2="' + (x + 3.5).toFixed(1) + '" y2="' + yB.toFixed(1) + '" stroke="' + col + '" stroke-width="1" opacity="0.5"/>';
        });
      }
      /* 线 */
      s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + col + '" stroke-width="' + (se.best ? 2 : 1.3) + '" stroke-linejoin="round" stroke-linecap="round"' +
        (se.dash ? ' stroke-dasharray="4 3"' : '') + '/>';
      /* 点 */
      pts.forEach(function (p, i) {
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (se.best ? 3.2 : 2.3) + '" fill="var(--surface)" stroke="' + col + '" stroke-width="' + (se.best ? 1.8 : 1.3) + '"/>';
        var tip = se.name + ' · ' + spec.xLabels[i] + '<br>' + (spec.tipLabel || '') + fmt(se.vals[i], spec.tipDec === undefined ? 1 : spec.tipDec) + ' ' + (spec.unit || '') + (se.sd ? '<br>σ = ' + fmt(se.sd[i], 1) : '');
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="11" fill="transparent" data-tip="' + tip.replace(/"/g, '&quot;') + '"/>';
      });
    });

    s += '</svg>';
    return s;
  }

  /* ---------- 单轴多序列折线（循环 / 倍率） ---------- */
  function linePlain(w, spec) {
    var pad = { l: 48, r: 16, t: 16, b: 34 };
    var h = spec.height || 220;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var y0 = spec.y0, y1 = spec.y1, n = spec.xLabels.length;
    var X = function (i) { return pad.l + (n === 1 ? iw / 2 : iw * i / (n - 1)); };
    var Y = function (v) { return pad.t + ih - ih * (v - y0) / (y1 - y0); };
    var s = svgOpen(w, h);
    niceTicks(y0, y1, 4).forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 7, Y(t) + 3.2, fmt(t, 0), { anchor: 'end' });
    });
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="var(--line-strong)"/>';
    spec.xLabels.forEach(function (l, i) {
      if (spec.xSkip && i % spec.xSkip !== 0 && i !== n - 1) return;
      s += txt(X(i), pad.t + ih + 15, l, { anchor: 'middle', fill: 'var(--ink-3)' });
    });
    if (spec.yTitle) s += txt(11, pad.t + ih / 2, spec.yTitle, { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });
    if (spec.xTitle) s += txt(pad.l + iw / 2, h - 3, spec.xTitle, { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });

    spec.series.forEach(function (se) {
      var col = 'var(' + se.color + ')';
      var pts = se.vals.map(function (v, i) { return [X(i), Y(v)]; });
      if (se.best) {
        var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
          ' L' + X(n - 1).toFixed(1) + ' ' + (pad.t + ih) + ' L' + X(0).toFixed(1) + ' ' + (pad.t + ih) + ' Z';
        s += '<path d="' + d + '" fill="' + col + '" opacity="0.07"/>';
      }
      s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + col + '" stroke-width="' + (se.best ? 2 : 1.4) + '" stroke-linejoin="round" stroke-linecap="round"' +
        (se.dash ? ' stroke-dasharray="4 3"' : '') + '/>';
      pts.forEach(function (p, i) {
        if (n <= 14 || i === 0 || i === n - 1 || i % 2 === 0) {
          s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (se.best ? 3 : 2) + '" fill="var(--surface)" stroke="' + col + '" stroke-width="1.4"/>';
        }
        var tip = se.name + '<br>' + spec.xLabels[i] + ' → ' + fmt(se.vals[i], 1) + ' ' + (spec.unit || '');
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="12" fill="transparent" data-tip="' + tip.replace(/"/g, '&quot;') + '"/>';
      });
    });
    s += '</svg>';
    return s;
  }

  /* ---------- 雷达图 ---------- */
  function radar(w, spec) {
    var h = spec.height || 268;
    var cx = w / 2, cy = h / 2 + 6, R = Math.min(w * 0.36, h * 0.40);
    var m = spec.axes.length;
    var ang = function (i) { return -Math.PI / 2 + 2 * Math.PI * i / m; };
    var s = svgOpen(w, h);
    [0.25, 0.5, 0.75, 1].forEach(function (r) {
      var pts = [];
      for (var i = 0; i < m; i++) pts.push((cx + Math.cos(ang(i)) * R * r).toFixed(1) + ',' + (cy + Math.sin(ang(i)) * R * r).toFixed(1));
      s += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--line-2)"/>';
    });
    for (var i = 0; i < m; i++) {
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(ang(i)) * R).toFixed(1) + '" y2="' + (cy + Math.sin(ang(i)) * R).toFixed(1) + '" stroke="var(--line-2)"/>';
      var lx = cx + Math.cos(ang(i)) * (R + 15), ly = cy + Math.sin(ang(i)) * (R + 15);
      var an = Math.abs(Math.cos(ang(i))) < 0.3 ? 'middle' : (Math.cos(ang(i)) > 0 ? 'start' : 'end');
      s += txt(lx.toFixed(1), (ly + 3).toFixed(1), spec.axes[i], { anchor: an, fill: 'var(--ink-3)', size: 9.5, mono: false });
    }
    spec.series.forEach(function (se) {
      var col = 'var(' + se.color + ')';
      var pts = se.vals.map(function (v, i) {
        var r = R * Math.max(0, Math.min(100, v)) / 100;
        return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
      });
      s += '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="' + col + '" fill-opacity="' + (se.best ? 0.14 : 0.04) + '" stroke="' + col + '" stroke-width="' + (se.best ? 1.9 : 1.2) + '"' +
        (se.best ? '' : ' stroke-dasharray="3 2"') + '/>';
      pts.forEach(function (p, i) {
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (se.best ? 3 : 2) + '" fill="' + col + '"/>';
        var tip = se.name + '<br>' + spec.axes[i] + ' → ' + fmt(se.vals[i], 1);
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="10" fill="transparent" data-tip="' + tip.replace(/"/g, '&quot;') + '"/>';
      });
    });
    s += '</svg>';
    return s;
  }

  /* ---------- 环形（成功率） ---------- */
  function donut(w, spec) {
    var h = spec.height || 148;
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36, sw = 13;
    var C = 2 * Math.PI * R;
    var s = svgOpen(w, h);
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(--surface-3)" stroke-width="' + sw + '"/>';
    spec.segs.forEach(function (g, i) {
      var frac = g.v, len = C * frac, off = C * spec.segs.slice(0, i).reduce(function (a, b) { return a + b.v; }, 0);
      var rot = -90;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(' + g.color + ')" stroke-width="' + sw +
        '" stroke-dasharray="' + (len - 2).toFixed(2) + ' ' + (C - len + 2).toFixed(2) + '" stroke-dashoffset="' + (-off * C).toFixed(2) +
        '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" stroke-linecap="butt" data-tip="' + (g.name + ' → ' + fmt(g.v * 100, 1) + '%').replace(/"/g, '&quot;') + '"/>';
    });
    if (spec.center) {
      s += txt(cx, cy + 4, spec.center.big, { anchor: 'middle', size: 22, fill: 'var(--ink)', mono: false, weight: 500 });
      s += txt(cx, cy + 20, spec.center.small, { anchor: 'middle', size: 9, fill: 'var(--ink-3)' });
    }
    s += '</svg>';
    return s;
  }

  /* ---------- 条形（竖向对比，用于批次一致性） ---------- */
  function bars(w, spec) {
    var pad = { l: 40, r: 12, t: 14, b: 30 };
    var h = spec.height || 190;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var n = spec.items.length;
    var bw = iw / n * 0.56, gap = iw / n;
    var max = spec.max || 100;
    var s = svgOpen(w, h);
    niceTicks(0, max, 4).forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih - ih * t / max).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih - ih * t / max).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 6, (pad.t + ih - ih * t / max + 3.2).toFixed(1), fmt(t, 0), { anchor: 'end' });
    });
    spec.items.forEach(function (it, i) {
      var x = pad.l + gap * i + (gap - bw) / 2;
      var bh = ih * it.v / max;
      var y = pad.t + ih - bh;
      var col = 'var(' + (it.color || '--acc') + ')';
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + col + '" opacity="' + (it.dim ? 0.35 : 0.88) + '" data-tip="' + (it.k + ' → ' + fmt(it.v, 1) + (it.unit || '')).replace(/"/g, '&quot;') + '"/>';
      if (it.sd) {
        var cy2 = pad.t + ih - ih * it.v / max;
        var y1 = pad.t + ih - ih * (it.v + it.sd) / max, y2 = pad.t + ih - ih * Math.max(0, it.v - it.sd) / max;
        var cxm = x + bw / 2;
        s += '<line x1="' + cxm.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + cxm.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="var(--ink-2)" stroke-width="1"/>';
        s += '<line x1="' + (cxm - 4).toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (cxm + 4).toFixed(1) + '" y2="' + y1.toFixed(1) + '" stroke="var(--ink-2)" stroke-width="1"/>';
        s += '<line x1="' + (cxm - 4).toFixed(1) + '" y1="' + y2.toFixed(1) + '" x2="' + (cxm + 4).toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="var(--ink-2)" stroke-width="1"/>';
        void cy2;
      }
      s += txt(x + bw / 2, h - 12, it.k, { anchor: 'middle', fill: 'var(--ink-3)', size: 9.5 });
    });
    s += '</svg>';
    return s;
  }

  /* ---------- XRD 模拟谱 ---------- */
  function xrd(w, spec) {
    var pad = { l: 34, r: 14, t: 14, b: 32 };
    var h = spec.height || 210;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var x0 = 10, x1 = 80;
    var X = function (v) { return pad.l + iw * (v - x0) / (x1 - x0); };
    var Y = function (v) { return pad.t + ih - ih * v / 108; };
    var s = svgOpen(w, h);

    [0, 25, 50, 75, 100].forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 6, Y(t) + 3.2, t, { anchor: 'end' });
    });
    for (var t = 10; t <= 80; t += 10) {
      s += '<line x1="' + X(t).toFixed(1) + '" y1="' + (pad.t + ih) + '" x2="' + X(t).toFixed(1) + '" y2="' + (pad.t + ih + 4) + '" stroke="var(--line-strong)"/>';
      s += txt(X(t).toFixed(1), h - 12, t + '°', { anchor: 'middle', fill: 'var(--ink-3)' });
    }
    s += txt(pad.l + iw / 2, h - 1, '2θ (Cu Kα)', { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    s += txt(11, pad.t + ih / 2, 'Intensity (a.u.)', { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });

    function curve(shift, w2) {
      var pts = [];
      for (var x = x0; x <= x1; x += 0.08) {
        var v = 2.5;
        spec.peaks.forEach(function (p) {
          var pos = p.pos + (p.h.charAt(0) === '0' ? shift : shift * 0.3);
          var d = (x - pos) / (w2 || 0.115);
          v += p.i * Math.exp(-d * d * 0.5);
        });
        pts.push([X(x), Y(Math.min(v, 106))]);
      }
      return pts;
    }
    var c1 = curve(0, 0.125), c2 = curve(spec.shift, 0.135);
    s += '<polyline points="' + c1.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="var(--c6)" stroke-width="1.2"/>';
    s += '<polyline points="' + c2.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="var(--acc)" stroke-width="1.5"/>';

    /* 峰标注 */
    spec.peaks.forEach(function (p) {
      if (['003', '104', '110'].indexOf(p.h) < 0) return;
      s += '<line x1="' + X(p.pos).toFixed(1) + '" y1="' + Y(0) + '" x2="' + X(p.pos).toFixed(1) + '" y2="' + Y(p.i * 0.86).toFixed(1) +
        '" stroke="var(--ink-4)" stroke-width="0.7" stroke-dasharray="2 2"/>';
      s += txt(X(p.pos).toFixed(1), Y(p.i * 0.92) - 3, '(' + p.h + ')', { anchor: 'middle', fill: 'var(--ink-2)', size: 9.5 });
    });
    /* 局部放大指示 */
    var zx0 = X(15.6), zx1 = X(17.6), zy = pad.t + 2;
    s += '<rect x="' + (X(15.6)).toFixed(1) + '" y="' + Y(0) + '" width="' + (X(17.6) - X(15.6)).toFixed(1) + '" height="' + ih + '" fill="var(--sig)" opacity="0.07"/>';
    s += '<line x1="' + zx0.toFixed(1) + '" y1="' + Y(0) + '" x2="' + zx0.toFixed(1) + '" y2="' + zy + '" stroke="var(--sig)" stroke-width="0.8"/>';
    s += '<line x1="' + zx1.toFixed(1) + '" y1="' + Y(0) + '" x2="' + zx1.toFixed(1) + '" y2="' + zy + '" stroke="var(--sig)" stroke-width="0.8"/>';
    s += txt(((zx0 + zx1) / 2).toFixed(1), zy - 3, '(003) 局部放大区', { anchor: 'middle', fill: 'var(--sig)', size: 9 });
    s += '</svg>';
    return s;
  }

  /* ---------- 迷你趋势线 ---------- */
  function spark(vals, w, h, color) {
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var rng = max - min || 1;
    var pts = vals.map(function (v, i) {
      return (w * i / (vals.length - 1)).toFixed(1) + ',' + (h - (h - 4) * (v - min) / rng - 2).toFixed(1);
    });
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(' + color + ')" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------- 通用谱图（FTIR / XPS / UV） ---------- */
  function spectrum(w, spec) {
    var pad = { l: 44, r: 14, t: 16, b: 36 };
    var h = spec.height || 230;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var x0 = spec.x0, x1 = spec.x1, rev = !!spec.rev;
    var X = function (v) { return pad.l + iw * (rev ? (x1 - v) / (x1 - x0) : (v - x0) / (x1 - x0)); };
    var ymax = spec.ymax || 108;
    var Y = function (v) { return pad.t + ih - ih * v / ymax; };
    var s = svgOpen(w, h);
    niceTicks(0, ymax, 4).forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 6, Y(t) + 3.2, fmt(t, 0), { anchor: 'end' });
    });
    var stepX = (x1 - x0) / 5;
    for (var i = 0; i <= 5; i++) {
      var xv = x0 + stepX * i;
      s += '<line x1="' + X(xv).toFixed(1) + '" y1="' + (pad.t + ih) + '" x2="' + X(xv).toFixed(1) + '" y2="' + (pad.t + ih + 4) + '" stroke="var(--line-strong)"/>';
      s += txt(X(xv).toFixed(1), h - 12, String(Math.round(xv)), { anchor: 'middle', fill: 'var(--ink-3)' });
    }
    s += txt(pad.l + iw / 2, h - 1, spec.xlabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    s += txt(11, pad.t + ih / 2, spec.ylabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });
    function curve(peaks, width, base) {
      var pts = [], st = (x1 - x0) / 460;
      for (var x = x0; x <= x1; x += st) {
        var v = base === undefined ? 1.5 : base;
        peaks.forEach(function (p) { var dd = (x - p.x) / (p.w || width); v += p.i * Math.exp(-dd * dd * 0.5); });
        pts.push([X(x), Y(Math.min(v, ymax - 1))]);
      }
      return pts;
    }
    (spec.series || []).forEach(function (se) {
      var pts = curve(se.peaks, se.width || 3, se.base);
      if (se.fill) {
        var d2 = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
          ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + Y(0) + ' L' + pts[0][0].toFixed(1) + ' ' + Y(0) + ' Z';
        s += '<path d="' + d2 + '" fill="var(' + se.color + ')" opacity="0.10"/>';
      }
      s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="none" stroke="var(' + se.color + ')" stroke-width="' + (se.dash ? 1.2 : 1.7) + '"' + (se.dash ? ' stroke-dasharray="4 3"' : '') + '/>';
    });
    (spec.marks || []).forEach(function (m) {
      var mx = X(m.x);
      s += '<line x1="' + mx.toFixed(1) + '" y1="' + Y(m.y0 === undefined ? 0 : m.y0) + '" x2="' + mx.toFixed(1) + '" y2="' + Y(m.y1 === undefined ? ymax * 0.94 : m.y1).toFixed(1) +
        '" stroke="var(--ink-4)" stroke-width="0.8" stroke-dasharray="2 2"/>';
      s += txt(mx.toFixed(1), (Y(m.y1 === undefined ? ymax * 0.94 : m.y1) - 4).toFixed(1), m.t, { anchor: m.anchor || 'middle', fill: m.color || 'var(--ink-2)', size: 9.5 });
    });
    s += '</svg>';
    return s;
  }

  /* ---------- 响应面热图 ---------- */
  function heat(w, spec) {
    var pad = { l: 64, r: 78, t: 18, b: 46 };
    var h = spec.height || 260;
    var z = spec.z, n = z.length;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var cw = iw / n, ch = ih / n;
    var lo = Math.min.apply(null, z.map(function (r) { return Math.min.apply(null, r); }));
    var hi = Math.max.apply(null, z.map(function (r) { return Math.max.apply(null, r); }));
    function col(v) {
      var t = (v - lo) / (hi - lo || 1);
      var a = [228, 238, 236], b = [12, 84, 79];
      var c = a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); });
      return 'rgb(' + c.join(',') + ')';
    }
    var s = svgOpen(w, h), i, j;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        var y = pad.t + ih - (i + 1) * ch, x = pad.l + j * cw;
        s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (cw + 0.7).toFixed(1) + '" height="' + (ch + 0.7).toFixed(1) + '" fill="' + col(z[i][j]) + '"/>';
        if (n <= 7 || (i % 2 === 0 && j % 2 === 0)) {
          s += txt((x + cw / 2).toFixed(1), (y + ch / 2 + 3.2).toFixed(1), fmt(z[i][j], 0),
            { anchor: 'middle', size: 9, fill: ((z[i][j] - lo) / (hi - lo || 1)) > 0.55 ? '#fff' : 'var(--ink-2)' });
        }
      }
    }
    if (spec.opt) {
      var oy = pad.t + ih - (spec.opt.i + 0.5) * ch, ox = pad.l + (spec.opt.j + 0.5) * cw;
      s += '<rect x="' + (ox - cw / 2).toFixed(1) + '" y="' + (oy - ch / 2).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1) +
        '" fill="none" stroke="var(--sig)" stroke-width="2"/>';
      s += txt(ox.toFixed(1), (oy - ch / 2 - 5).toFixed(1), '最优', { anchor: 'middle', fill: 'var(--sig)', size: 9.5 });
    }
    for (var k = 0; k <= 4; k++) {
      s += txt((pad.l + iw * k / 4).toFixed(1), h - 28, fmt(spec.x0 + (spec.x1 - spec.x0) * k / 4, spec.xDec === undefined ? 2 : spec.xDec), { anchor: 'middle', fill: 'var(--ink-3)' });
      s += txt((pad.l - 7).toFixed(1), (pad.t + ih - ih * k / 4 + 3.2).toFixed(1), fmt(spec.y0 + (spec.y1 - spec.y0) * k / 4, spec.yDec === undefined ? 1 : spec.yDec), { anchor: 'end', fill: 'var(--ink-3)' });
    }
    s += txt(pad.l + iw / 2, h - 8, spec.xlabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    s += txt(12, pad.t + ih / 2, spec.ylabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });
    var bx = w - pad.r + 28, by = pad.t;
    for (var q = 0; q < 40; q++) {
      s += '<rect x="' + bx + '" y="' + (by + ih * q / 40).toFixed(1) + '" width="12" height="' + (ih / 40 + 0.7).toFixed(2) + '" fill="' + col(hi - (hi - lo) * q / 39) + '"/>';
    }
    s += txt(bx + 18, by + 8, fmt(hi, 0), { size: 9, fill: 'var(--ink-3)' });
    s += txt(bx + 18, by + ih, fmt(lo, 0), { size: 9, fill: 'var(--ink-3)' });
    s += txt(bx + 6, by - 6, spec.unit || '', { size: 9, anchor: 'middle', fill: 'var(--ink-4)' });
    s += '</svg>';
    return s;
  }

  /* ---------- 散点 + 误差棒（预测 vs 实测） ---------- */
  function scatterErr(w, spec) {
    var pad = { l: 52, r: 16, t: 18, b: 38 };
    var h = spec.height || 250;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var x0 = spec.x0, x1 = spec.x1, y0 = spec.y0, y1 = spec.y1;
    var X = function (v) { return pad.l + iw * (v - x0) / (x1 - x0); };
    var Y = function (v) { return pad.t + ih - ih * (v - y0) / (y1 - y0); };
    var s = svgOpen(w, h);
    niceTicks(y0, y1, 4).forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 6, Y(t) + 3.2, fmt(t, 0), { anchor: 'end' });
    });
    niceTicks(x0, x1, 4).forEach(function (t) { s += txt(X(t).toFixed(1), h - 20, fmt(t, 0), { anchor: 'middle', fill: 'var(--ink-3)' }); });
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="var(--line-strong)"/>';
    s += txt(pad.l + iw / 2, h - 3, spec.xlabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    s += txt(11, pad.t + ih / 2, spec.ylabel || '', { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });
    s += '<line x1="' + X(x0) + '" y1="' + Y(y0) + '" x2="' + X(x1) + '" y2="' + Y(y1) + '" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="4 3"/>';
    s += txt((X(x1) - 6).toFixed(1), (Y(y1) + 14).toFixed(1), '预测 = 实测', { anchor: 'end', fill: 'var(--ink-4)', size: 9 });
    (spec.points || []).forEach(function (p) {
      var col = 'var(' + (p.color || '--acc') + ')';
      if (p.ey) {
        s += '<line x1="' + X(p.x).toFixed(1) + '" y1="' + Y(p.y - p.ey).toFixed(1) + '" x2="' + X(p.x).toFixed(1) + '" y2="' + Y(p.y + p.ey).toFixed(1) + '" stroke="' + col + '" stroke-width="1.1"/>';
        s += '<line x1="' + (X(p.x) - 4).toFixed(1) + '" y1="' + Y(p.y + p.ey).toFixed(1) + '" x2="' + (X(p.x) + 4).toFixed(1) + '" y2="' + Y(p.y + p.ey).toFixed(1) + '" stroke="' + col + '" stroke-width="1.1"/>';
        s += '<line x1="' + (X(p.x) - 4).toFixed(1) + '" y1="' + Y(p.y - p.ey).toFixed(1) + '" x2="' + (X(p.x) + 4).toFixed(1) + '" y2="' + Y(p.y - p.ey).toFixed(1) + '" stroke="' + col + '" stroke-width="1.1"/>';
      }
      s += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3.4" fill="' + col + '" opacity="0.9"/>';
      s += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="11" fill="transparent" data-tip="' +
        (p.tip || ('预测 ' + fmt(p.x, 1) + ' / 实测 ' + fmt(p.y, 1))).replace(/"/g, '&quot;') + '"/>';
    });
    s += '</svg>';
    return s;
  }

  /* ---------- 分组柱状 ---------- */
  function barsGroup(w, spec) {
    var pad = { l: 46, r: 14, t: 18, b: 42 };
    var h = spec.height || 230;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var n = spec.groups.length, k = spec.series.length;
    var gw = iw / n, bw = gw * 0.68 / k;
    var max = spec.max || 100;
    var s = svgOpen(w, h);
    niceTicks(0, max, 4).forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih - ih * t / max).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih - ih * t / max).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += txt(pad.l - 6, (pad.t + ih - ih * t / max + 3.2).toFixed(1), fmt(t, 0), { anchor: 'end' });
    });
    spec.groups.forEach(function (g, gi) {
      spec.series.forEach(function (se, si) {
        var v = se.vals[gi];
        if (v == null) return;
        var x = pad.l + gw * gi + (gw - bw * k) / 2 + bw * si;
        var bh = ih * Math.max(0, v) / max;
        s += '<rect x="' + x.toFixed(1) + '" y="' + (pad.t + ih - bh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) +
          '" rx="1.5" fill="var(' + se.color + ')" opacity="0.9" data-tip="' + (se.name + ' · ' + g + ' → ' + fmt(v, 1) + (spec.unit || '')).replace(/"/g, '&quot;') + '"/>';
      });
      var words = String(g).split(' ');
      s += txt((pad.l + gw * gi + gw / 2).toFixed(1), h - 24, words[0], { anchor: 'middle', fill: 'var(--ink-3)', size: 9.5 });
      if (words[1]) s += txt((pad.l + gw * gi + gw / 2).toFixed(1), h - 13, words.slice(1).join(' '), { anchor: 'middle', fill: 'var(--ink-4)', size: 9 });
    });
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="var(--line-strong)"/>';
    if (spec.ylabel) s += txt(11, pad.t + ih / 2, spec.ylabel, { anchor: 'middle', fill: 'var(--ink-4)', size: 9, rot: -90 });
    s += '</svg>';
    return s;
  }

  var renderers = { lineErr: lineErr, linePlain: linePlain, radar: radar, donut: donut, bars: bars, xrd: xrd,
    spectrum: spectrum, heat: heat, scatterErr: scatterErr, barsGroup: barsGroup };

  /* 按容器宽度渲染，宽度变化时重绘 */
  function draw(el, spec) {
    if (!el) return;
    var lastW = -1;
    function build() {
      var w = Math.max(240, Math.round(el.clientWidth || el.parentNode.clientWidth || 600));
      if (Math.abs(w - lastW) < 2) return;
      lastW = w;
      var fn = renderers[spec.type];
      if (!fn) return;
      el.innerHTML = fn(w, spec);
    }
    build();
    if (window.ResizeObserver && !el.__ro) {
      el.__ro = new ResizeObserver(function () { build(); });
      el.__ro.observe(el);
    }
  }

  return { draw: draw, spark: spark, fmt: fmt, MONO: MONO, SANS: SANS };
})();

/* ---------- 全局图表 tooltip ---------- */
(function () {
  var tip;
  function ensure() {
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart__tip'; document.body.appendChild(tip); }
    return tip;
  }
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!t) { if (tip) tip.classList.remove('is-on'); return; }
    var el = ensure();
    el.innerHTML = t.getAttribute('data-tip');
    el.classList.add('is-on');
    var x = e.clientX + 14, y = e.clientY - 12;
    var r = el.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 10;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });
})();
