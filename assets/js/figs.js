/* ============================================================
   LATTICE · Nature 风格科研绘图模块（嵌入主站环节 04 · 数据预期与图形）
   ============================================================
   用法：MR.figs.render(host, profile)
   - profile 包含 variables/perf/matrix/peakData/ftir/sem
   - 未导入文献时用 4 个内置示例
   ============================================================ */
window.MR = window.MR || {};
(function () {

  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function getColors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      ink: cs.getPropertyValue('--ink').trim(),
      ink2: cs.getPropertyValue('--ink-2').trim(),
      ink3: cs.getPropertyValue('--ink-3').trim(),
      line: cs.getPropertyValue('--line').trim(),
      line2: cs.getPropertyValue('--line-2').trim(),
      surf: cs.getPropertyValue('--surface').trim(),
      surf2: cs.getPropertyValue('--surface-2').trim(),
      acc: cs.getPropertyValue('--acc').trim(),
      pink: cs.getPropertyValue('--pink').trim(),
      violet: cs.getPropertyValue('--violet').trim(),
      amber: cs.getPropertyValue('--amber').trim(),
      blue: cs.getPropertyValue('--blue').trim(),
      accInk: cs.getPropertyValue('--acc-ink').trim()
    };
  }

  /* ---------- 双 Y 轴折线图（FIG.1） ---------- */
  function renderDualLine(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 800, H = 380, ml = 70, mr = 70, mt = 50, mb = 55;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    var xVals = cfg.x, y1Vals = cfg.y1, y2Vals = cfg.y2;
    var xMin = Math.min.apply(null, xVals), xMax = Math.max.apply(null, xVals);
    var y1Min = 0, y1Max = Math.max.apply(null, y1Vals) * 1.15;
    var y2Min = 0, y2Max = Math.max.apply(null, y2Vals) * 1.15;

    /* 网格 + 轴 */
    for (var i = 0; i <= 4; i++) {
      var y = mt + (H - mt - mb) * i / 4;
      svgEl('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: ml - 10, y: y + 3, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(y1Max - i * (y1Max / 4));
      svgEl('text', { x: W - mr + 10, y: y + 3, 'text-anchor': 'start', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(y2Max - i * (y2Max / 4));
    }
    xVals.forEach(function (v) {
      var x = ml + (v - xMin) / (xMax - xMin) * (W - ml - mr);
      svgEl('line', { x1: x, y1: mt, x2: x, y2: H - mb, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: x, y: H - mb + 16, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = v + cfg.xUnit;
    });
    svgEl('text', { x: ml - 48, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(-90 ' + (ml - 48) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = cfg.y1Label;
    svgEl('text', { x: W - mr + 45, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(90 ' + (W - mr + 45) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = cfg.y2Label;
    svgEl('text', { x: W / 2, y: H - 16, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500 }, svg).textContent = cfg.xLabel;
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;

    /* 折线 1 */
    var line1 = y1Vals.map(function (v, i) {
      var x = ml + (xVals[i] - xMin) / (xMax - xMin) * (W - ml - mr);
      var y = mt + (1 - v / y1Max) * (H - mt - mb);
      return x + ',' + y;
    }).join(' ');
    svgEl('polyline', { points: line1, fill: 'none', stroke: C.blue, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    y1Vals.forEach(function (v, i) {
      var x = ml + (xVals[i] - xMin) / (xMax - xMin) * (W - ml - mr);
      var y = mt + (1 - v / y1Max) * (H - mt - mb);
      var err = v * 0.04;
      var errPx = err / y1Max * (H - mt - mb);
      svgEl('line', { x1: x, y1: y - errPx, x2: x, y2: y + errPx, stroke: C.blue, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('line', { x1: x - 4, y1: y - errPx, x2: x + 4, y2: y - errPx, stroke: C.blue, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('line', { x1: x - 4, y1: y + errPx, x2: x + 4, y2: y + errPx, stroke: C.blue, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('circle', { cx: x, cy: y, r: 4, fill: C.surf, stroke: C.blue, 'stroke-width': 2 }, svg);
    });
    /* 折线 2 */
    var line2 = y2Vals.map(function (v, i) {
      var x = ml + (xVals[i] - xMin) / (xMax - xMin) * (W - ml - mr);
      var y = mt + (1 - v / y2Max) * (H - mt - mb);
      return x + ',' + y;
    }).join(' ');
    svgEl('polyline', { points: line2, fill: 'none', stroke: C.amber, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    y2Vals.forEach(function (v, i) {
      var x = ml + (xVals[i] - xMin) / (xMax - xMin) * (W - ml - mr);
      var y = mt + (1 - v / y2Max) * (H - mt - mb);
      var err = v * 0.03;
      var errPx = err / y2Max * (H - mt - mb);
      svgEl('line', { x1: x, y1: y - errPx, x2: x, y2: y + errPx, stroke: C.amber, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('line', { x1: x - 4, y1: y - errPx, x2: x + 4, y2: y - errPx, stroke: C.amber, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('line', { x1: x - 4, y1: y + errPx, x2: x + 4, y2: y + errPx, stroke: C.amber, 'stroke-width': 1.2, opacity: .6 }, svg);
      svgEl('circle', { cx: x, cy: y, r: 4, fill: C.surf, stroke: C.amber, 'stroke-width': 2 }, svg);
    });

    /* 最优标注 */
    if (cfg.optX != null) {
      var optX = ml + (cfg.optX - xMin) / (xMax - xMin) * (W - ml - mr);
      var optY = mt + (1 - y1Vals[xVals.indexOf(cfg.optX)] / y1Max) * (H - mt - mb);
      svgEl('circle', { cx: optX, cy: optY, r: 7, fill: 'none', stroke: C.pink, 'stroke-width': 1.5, 'stroke-dasharray': '3,3' }, svg);
      svgEl('text', { x: optX + 12, y: optY - 8, 'font-family': 'var(--mono)', 'font-size': 9.5, fill: C.pink }, svg).textContent = cfg.optLabel || '最优';
    }

    /* 图例 */
    var lgX = ml + 16, lgY = mt + 10;
    svgEl('rect', { x: lgX, y: lgY, width: 130, height: 44, fill: C.surf, stroke: C.line, 'stroke-width': .8, rx: 6 }, svg);
    svgEl('line', { x1: lgX + 10, y1: lgY + 14, x2: lgX + 26, y2: lgY + 14, stroke: C.blue, 'stroke-width': 2.5 }, svg);
    svgEl('circle', { cx: lgX + 18, cy: lgY + 14, r: 4, fill: C.surf, stroke: C.blue, 'stroke-width': 2 }, svg);
    svgEl('text', { x: lgX + 32, y: lgY + 18, 'font-size': 11, fill: C.ink2 }, svg).textContent = cfg.y1Label.split(' ')[0];
    svgEl('line', { x1: lgX + 10, y1: lgY + 32, x2: lgX + 26, y2: lgY + 32, stroke: C.amber, 'stroke-width': 2.5 }, svg);
    svgEl('circle', { cx: lgX + 18, cy: lgY + 32, r: 4, fill: C.surf, stroke: C.amber, 'stroke-width': 2 }, svg);
    svgEl('text', { x: lgX + 32, y: lgY + 36, 'font-size': 11, fill: C.ink2 }, svg).textContent = cfg.y2Label.split(' ')[0];
  }

  /* ---------- 单 Y 轴柱状图（FIG.2） ---------- */
  function renderBar(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 800, H = 380, ml = 100, mr = 30, mt = 50, mb = 55;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    var labels = cfg.labels, values = cfg.values;
    var yMax = Math.max.apply(null, values) * 1.2;
    /* 柱子 */
    var barWidth = (W - ml - mr) / labels.length * 0.55;
    labels.forEach(function (label, i) {
      var cx = ml + 30 + (W - ml - mr - 60) * i / (labels.length - 1);
      var bh = values[i] / yMax * (H - mt - mb);
      var color = cfg.colors ? cfg.colors[i] : C.blue;
      svgEl('rect', { x: cx - barWidth / 2, y: H - mb - bh, width: barWidth, height: bh, fill: color, opacity: 0.75, rx: 3 }, svg);
      svgEl('text', { x: cx, y: H - mb - bh - 6, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, 'font-weight': 600, fill: C.ink2 }, svg).textContent = values[i] + (cfg.valueUnit || '');
      svgEl('text', { x: cx, y: H - mb + 16, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = label;
    });
    /* 网格 + 轴 */
    for (var i = 0; i <= 4; i++) {
      var y = mt + (H - mt - mb) * i / 4;
      svgEl('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: ml - 10, y: y + 3, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(yMax - i * (yMax / 4));
    }
    svgEl('text', { x: ml - 75, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(-90 ' + (ml - 75) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = cfg.yLabel;
    svgEl('text', { x: W / 2, y: H - 16, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500 }, svg).textContent = cfg.xLabel;
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;

    /* 警告标注 */
    if (cfg.warnIdx != null) {
      var warnCx = ml + 30 + (W - ml - mr - 60) * cfg.warnIdx / (labels.length - 1);
      var warnY = H - mb - values[cfg.warnIdx] / yMax * (H - mt - mb) - 20;
      svgEl('text', { x: warnCx, y: warnY, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9.5, fill: C.pink, 'font-weight': 600 }, svg).textContent = cfg.warnLabel || '警告';
    }
  }

  /* ---------- 分组柱状图（FIG.3/4） ---------- */
  function renderGroupedBar(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 800, H = 380, ml = 70, mr = 30, mt = 50, mb = 55;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    var labels = cfg.labels, y1Vals = cfg.y1, y2Vals = cfg.y2;
    var y1Max = Math.max.apply(null, y1Vals) * 1.15;
    var y2Max = Math.max.apply(null, y2Vals) * 1.15;

    for (var i = 0; i <= 4; i++) {
      var y = mt + (H - mt - mb) * i / 4;
      svgEl('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: ml - 10, y: y + 3, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(y1Max - i * (y1Max / 4));
      svgEl('text', { x: W - mr + 8, y: y + 3, 'text-anchor': 'start', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(y2Max - i * (y2Max / 4));
    }
    var groupW = (W - ml - mr) / labels.length;
    var barW = groupW * 0.28;
    labels.forEach(function (label, i) {
      var cx = ml + groupW * i + groupW / 2;
      var bh1 = y1Vals[i] / y1Max * (H - mt - mb);
      var bh2 = y2Vals[i] / y2Max * (H - mt - mb);
      var isOpt = i === cfg.optIdx;
      var c1 = isOpt ? C.acc : C.blue;
      var c2 = isOpt ? C.acc : (cfg.color2 || C.amber);
      svgEl('rect', { x: cx - barW - 3, y: H - mb - bh1, width: barW, height: bh1, fill: c1, opacity: isOpt ? 0.95 : 0.7, rx: 2 }, svg);
      svgEl('rect', { x: cx + 3, y: H - mb - bh2, width: barW, height: bh2, fill: c2, opacity: isOpt ? 0.95 : 0.7, rx: 2 }, svg);
      var e1 = y1Vals[i] * 0.04 / y1Max * (H - mt - mb);
      var e2 = y2Vals[i] * 0.03 / y2Max * (H - mt - mb);
      svgEl('line', { x1: cx - barW / 2 - 3, y1: H - mb - bh1 - e1, x2: cx - barW / 2 - 3, y2: H - mb - bh1 + e1, stroke: '#888', 'stroke-width': 1 }, svg);
      svgEl('line', { x1: cx + barW / 2 + 3, y1: H - mb - bh2 - e2, x2: cx + barW / 2 + 3, y2: H - mb - bh2 + e2, stroke: '#888', 'stroke-width': 1 }, svg);
      svgEl('text', { x: cx - barW / 2 - 3, y: H - mb - bh1 - 8, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, 'font-weight': 600, fill: C.ink2 }, svg).textContent = y1Vals[i].toFixed(1);
      svgEl('text', { x: cx + barW / 2 + 3, y: H - mb - bh2 - 8, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, 'font-weight': 600, fill: C.ink2 }, svg).textContent = Math.round(y2Vals[i]);
      svgEl('text', { x: cx, y: H - mb + 16, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = label;
    });
    svgEl('text', { x: ml - 45, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(-90 ' + (ml - 45) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = cfg.y1Label;
    svgEl('text', { x: W - mr + 40, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(90 ' + (W - mr + 40) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = cfg.y2Label;
    svgEl('text', { x: W / 2, y: H - 16, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500 }, svg).textContent = cfg.xLabel;
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;

    /* 最优标注 */
    if (cfg.optIdx != null && cfg.optLabel) {
      var optCx = ml + groupW * cfg.optIdx + groupW / 2;
      svgEl('text', { x: optCx, y: mt + 8, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9.5, fill: C.acc, 'font-weight': 600 }, svg).textContent = cfg.optLabel;
    }

    /* 图例 */
    var lgX = ml + 20, lgY = mt + 10;
    svgEl('rect', { x: lgX, y: lgY, width: 130, height: 44, fill: C.surf, stroke: C.line, 'stroke-width': .8, rx: 6 }, svg);
    svgEl('rect', { x: lgX + 10, y: lgY + 8, width: 14, height: 14, fill: C.blue, rx: 2 }, svg);
    svgEl('text', { x: lgX + 30, y: lgY + 19, 'font-size': 11, fill: C.ink2 }, svg).textContent = cfg.y1Label.split(' ')[0];
    svgEl('rect', { x: lgX + 10, y: lgY + 26, width: 14, height: 14, fill: (cfg.color2 || C.amber), rx: 2 }, svg);
    svgEl('text', { x: lgX + 30, y: lgY + 37, 'font-size': 11, fill: C.ink2 }, svg).textContent = cfg.y2Label.split(' ')[0];
  }

  /* ---------- 工艺流程图（FIG.5） ---------- */
  function renderFlow(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 900, H = 200, ml = 40, mr = 40, mt = 50, mb = 40;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    var steps = cfg.steps, subSteps = cfg.subSteps || [], colors = cfg.colors || [];
    var boxW = (W - ml - mr) / steps.length - 14;
    var boxH = 48;
    steps.forEach(function (s, i) {
      var cx = ml + (W - ml - mr) * i / (steps.length - 1);
      var y = H / 2 - boxH / 2;
      if (i < steps.length - 1) {
        var nextCx = ml + (W - ml - mr) * (i + 1) / (steps.length - 1);
        svgEl('line', { x1: cx + boxW / 2 + 4, y1: H / 2, x2: nextCx - boxW / 2 - 4, y2: H / 2, stroke: C.ink3, 'stroke-width': 1.5 }, svg);
        svgEl('polygon', { points: (nextCx - boxW / 2 - 4) + ',' + (H / 2 - 4) + ' ' + (nextCx - boxW / 2 + 2) + ',' + H / 2 + ' ' + (nextCx - boxW / 2 - 4) + ',' + (H / 2 + 4), fill: C.ink3 }, svg);
      }
      var isFinal = i === steps.length - 1;
      svgEl('rect', { x: cx - boxW / 2, y: y, width: boxW, height: boxH, fill: isFinal ? C.acc : C.surf2, stroke: isFinal ? C.acc : C.line2, 'stroke-width': 1.2, rx: 6 }, svg);
      svgEl('text', { x: cx, y: y + boxH / 2 + 4, 'text-anchor': 'middle', 'font-size': 11, fill: isFinal ? C.accInk : C.ink, 'font-weight': isFinal ? 700 : 500 }, svg).textContent = s;
      if (subSteps[i]) svgEl('text', { x: cx, y: y + boxH + 14, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9, fill: C.ink3 }, svg).textContent = subSteps[i];
      svgEl('text', { x: cx, y: y - 8, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9, fill: C.ink3 }, svg).textContent = (i + 1);
    });
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;
    if (cfg.formula) svgEl('text', { x: W / 2, y: H - 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 11, fill: C.acc, 'font-weight': 600 }, svg).textContent = cfg.formula;
  }

  /* ---------- FT-IR 谱图（FIG.7） ---------- */
  function renderFTIR(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 800, H = 380, ml = 70, mr = 30, mt = 50, mb = 55;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    function genSpectrum(offset, intensity) {
      var points = [];
      for (var x = 400; x <= 4000; x += 10) {
        var y = 0.05;
        cfg.peaks.forEach(function (p) {
          var d = (x - p.x) / (p.w || 40);
          y += (p.a * intensity) * Math.exp(-d * d);
        });
        y += (Math.random() - 0.5) * 0.015;
        var px = ml + (1 - (x - 400) / 3600) * (W - ml - mr);
        var py = mt + (1 - y / 1.2) * (H - mt - mb) + offset;
        points.push(px + ',' + py);
      }
      return points;
    }
    for (var i = 0; i <= 4; i++) {
      var y = mt + (H - mt - mb) * i / 4;
      svgEl('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: ml - 10, y: y + 3, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = (1.2 - i * 0.3).toFixed(1);
    }
    [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500].forEach(function (v) {
      var x = ml + (1 - (v - 400) / 3600) * (W - ml - mr);
      svgEl('line', { x1: x, y1: mt, x2: x, y2: H - mb, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: x, y: H - mb + 16, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = v;
    });
    svgEl('text', { x: ml - 45, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(-90 ' + (ml - 45) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = '透过率 (%)';
    svgEl('text', { x: W / 2, y: H - 16, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500 }, svg).textContent = '波数 (cm⁻¹)';
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;

    cfg.series.forEach(function (s, si) {
      var pts = genSpectrum(s.offset || si * 35, s.intensity || 1);
      svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: s.color, 'stroke-width': 1.8, opacity: 0.85 }, svg);
    });
    /* 特征峰标注 */
    cfg.peaks.filter(function (p) { return p.label; }).forEach(function (p) {
      var px = ml + (1 - (p.x - 400) / 3600) * (W - ml - mr);
      svgEl('line', { x1: px, y1: mt, x2: px, y2: H - mb, stroke: p.color || C.acc, 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: .5 }, svg);
      svgEl('text', { x: px, y: mt - 4, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9.5, fill: p.color || C.acc, 'font-weight': 600 }, svg).textContent = p.label;
    });
    /* 图例 */
    var lgX = ml + 20, lgY = mt + 10;
    svgEl('rect', { x: lgX, y: lgY, width: 140, height: 20 + cfg.series.length * 20, fill: C.surf, stroke: C.line, 'stroke-width': .8, rx: 6 }, svg);
    cfg.series.forEach(function (s, i) {
      svgEl('line', { x1: lgX + 10, y1: lgY + 15 + i * 20, x2: lgX + 28, y2: lgY + 15 + i * 20, stroke: s.color, 'stroke-width': 2 }, svg);
      svgEl('text', { x: lgX + 34, y: lgY + 19 + i * 20, 'font-size': 10.5, fill: C.ink2 }, svg).textContent = s.label;
    });
  }

  /* ---------- XRD 谱图（FIG.8） ---------- */
  function renderXRD(host, cfg) {
    host.innerHTML = '';
    var C = getColors();
    var W = 800, H = 380, ml = 70, mr = 30, mt = 50, mb = 55;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';

    function genXRD(offset, intensity) {
      var points = [];
      for (var x = 5; x <= 80; x += 0.15) {
        var y = 5;
        cfg.peaks.forEach(function (p) {
          var d = (x - p.x) / (p.w || 0.5);
          y += p.a * intensity * Math.exp(-d * d);
        });
        y += (Math.random() - 0.5) * 2;
        var px = ml + (x - 5) / 75 * (W - ml - mr);
        var py = mt + (1 - y / 120) * (H - mt - mb) + offset;
        points.push(px + ',' + py);
      }
      return points;
    }
    for (var i = 0; i <= 4; i++) {
      var y = mt + (H - mt - mb) * i / 4;
      svgEl('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: ml - 10, y: y + 3, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = Math.round(120 - i * 30);
    }
    [10, 20, 30, 40, 50, 60, 70].forEach(function (v) {
      var x = ml + (v - 5) / 75 * (W - ml - mr);
      svgEl('line', { x1: x, y1: mt, x2: x, y2: H - mb, stroke: C.line, 'stroke-width': .5, fill: 'none' }, svg);
      svgEl('text', { x: x, y: H - mb + 16, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 10, fill: C.ink3 }, svg).textContent = v;
    });
    svgEl('text', { x: ml - 45, y: (H + mt - mb) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500, transform: 'rotate(-90 ' + (ml - 45) + ' ' + (H + mt - mb) / 2 + ')' }, svg).textContent = '强度 (a.u.)';
    svgEl('text', { x: W / 2, y: H - 16, 'text-anchor': 'middle', 'font-size': 12, fill: C.ink2, 'font-weight': 500 }, svg).textContent = '2θ (°)';
    svgEl('text', { x: W / 2, y: mt - 18, 'text-anchor': 'middle', 'font-family': 'var(--display)', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, svg).textContent = cfg.title;

    cfg.series.forEach(function (s, si) {
      var pts = genXRD(s.offset || si * 40, s.intensity || 1);
      svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: s.color, 'stroke-width': 1.6, opacity: 0.85 }, svg);
    });
    /* 物相标注 */
    cfg.peaks.filter(function (p) { return p.label; }).forEach(function (p) {
      var px = ml + (p.x - 5) / 75 * (W - ml - mr);
      svgEl('line', { x1: px, y1: mt, x2: px, y2: H - mb, stroke: p.color || C.acc, 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: .5 }, svg);
      svgEl('text', { x: px, y: mt - 6, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9.5, fill: p.color || C.acc, 'font-weight': 700 }, svg).textContent = p.label;
    });
    /* 图例 */
    var lgX = ml + 20, lgY = mt + 10;
    svgEl('rect', { x: lgX, y: lgY, width: 130, height: 20 + cfg.series.length * 20, fill: C.surf, stroke: C.line, 'stroke-width': .8, rx: 6 }, svg);
    cfg.series.forEach(function (s, i) {
      svgEl('line', { x1: lgX + 10, y1: lgY + 15 + i * 20, x2: lgX + 28, y2: lgY + 15 + i * 20, stroke: s.color, 'stroke-width': 2 }, svg);
      svgEl('text', { x: lgX + 34, y: lgY + 19 + i * 20, 'font-size': 10.5, fill: C.ink2 }, svg).textContent = s.label;
    });
  }

  /* ---------- 挂载到 MR ---------- */
  MR.figs = {
    renderDualLine: renderDualLine,
    renderBar: renderBar,
    renderGroupedBar: renderGroupedBar,
    renderFlow: renderFlow,
    renderFTIR: renderFTIR,
    renderXRD: renderXRD
  };

})();