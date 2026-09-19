/* ============================================================
   LATTICE · SCI 科研配图引擎（含 3D）
   1) 期刊配色板：Okabe–Ito（色盲安全·Nature Methods 金标准）/ NPG / Lancet /
      NEJM / Science / GLM 莫兰迪 —— 取自期刊制图惯例
   2) 3D 图形：晶胞/球棍模型、三维响应面、三维柱状、层状-界面堆叠
   3) 分子结构规范：骨架式 / 球棍式 / 楔形式 的适用场合与 CPK 配色
   4) 图型 × 实验类型匹配手册（按材料学科惯例）
   全部为手写 SVG 矢量，颜色、字号、线宽可调，导出即投稿级线稿。
   ============================================================ */
window.MR = window.MR || {};

MR.sci = (function () {

  /* ================= 1. 期刊配色板 ================= */
  var PALETTES = {
    'okabe-ito': { t: 'Okabe–Ito（色盲安全）', note: 'Nature Methods 金标准，投稿首选', c: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#666666'] },
    'npg': { t: 'NPG / Nature', note: 'Nature 系列期刊常用', c: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000'] },
    'lancet': { t: 'Lancet', note: '柳叶刀期刊配色', c: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6'] },
    'nejm': { t: 'NEJM', note: '新英格兰医学杂志配色', c: ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD', '#FFDC91', '#EE4C97'] },
    'science': { t: 'Science', note: 'Science 期刊配色', c: ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B', '#A20056'] },
    'glm': { t: 'GLM 莫兰迪', note: '素雅低饱和，演示与综述友好', c: ['#6C8EBF', '#D6B656', '#82B366', '#9673A6', '#D79B00', '#B85450', '#7F8C8D', '#4A6B8A'] },
    'cool': { t: '素雅冷调', note: '藏青/海蓝/青灰/石板', c: ['#1F3A5F', '#2E6E9E', '#5FA8C7', '#8FB8C9', '#4B5C6B', '#7B8A96', '#A9B7C0', '#2C3E50'] }
  };
  var MOL_COLOR = { C: '#303030', O: '#E23B2E', N: '#2E5BE2', H: '#F2F2F2', Si: '#C8A165', S: '#D9C22B', P: '#E8802A', Cl: '#3FBF3F', F: '#8FE08F', Br: '#8B3A1E', Na: '#A855F7', Mg: '#7CD649', Zn: '#7D80B0', Ti: '#BFC2C7', Fe: '#E06633', V: '#A6A6AB', B: '#FFB5B5' };

  /* ================= 2. 工具 ================= */
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + (o.mono ? "'IBM Plex Mono',Consolas,monospace" : "'IBM Plex Sans','Microsoft YaHei',sans-serif") +
      '" font-size="' + (o.size || 9.5) + '" fill="' + (o.fill || '#1F2429') + '" text-anchor="' + (o.anchor || 'start') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') + (o.rot ? ' transform="rotate(' + o.rot + ' ' + x + ' ' + y + ')"' : '') +
      (o.op ? ' opacity="' + o.op + '"' : '') + '>' + s + '</text>';
  }
  function L(x1, y1, x2, y2, o) {
    o = o || {};
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + (o.c || '#4A535C') + '" stroke-width="' + (o.w || 1) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') +
      ' stroke-linecap="round"' + (o.op !== undefined ? ' opacity="' + o.op + '"' : '') + '/>';
  }
  function P(d, o) {
    o = o || {};
    return '<path d="' + d + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.c || 'none') + '" stroke-width="' + (o.w || 1) +
      '"' + (o.op !== undefined ? ' opacity="' + o.op + '"' : '') + ' stroke-linejoin="round"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function Circ(cx, cy, r, o) {
    o = o || {};
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="' + (o.fill || 'none') +
      '" stroke="' + (o.c || 'none') + '" stroke-width="' + (o.w || 1) + '"' + (o.op !== undefined ? ' opacity="' + o.op + '"' : '') + '/>';
  }
  function frame(w, h, bg) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="' + w + '" height="' + h + '" fill="' + (bg || '#FFFFFF') + '"/>'; }
  function cap(w, no, txt, sub) {
    return T(16, 20, no, { size: 10.5, weight: 700 }) + T(16 + no.length * 8, 20, txt, { size: 10, fill: '#4A535C' }) +
      (sub ? T(w - 16, 20, sub, { size: 8, fill: '#9AA1A8', anchor: 'end' }) : '');
  }

  /* ---- 3D 投影（方位角 az、仰角 el；painter 算法按 depth 排序） ---- */
  function makeCam(az, el, s, cx, cy) {
    var ca = Math.cos(az * Math.PI / 180), sa = Math.sin(az * Math.PI / 180);
    var ce = Math.cos(el * Math.PI / 180), se = Math.sin(el * Math.PI / 180);
    return function (x, y, z) {
      var x1 = x * ca - y * sa, y1 = x * sa + y * ca;
      return { X: cx + x1 * s, Y: cy - (z * ce - y1 * se) * s, d: y1 * ce + z * se };
    };
  }

  /* ================= 3. 3D 图形 ================= */

  /* 3-1 晶胞 / 球棍模型 */
  function crystal(w, spec) {
    var h = spec.height || 340, pad = 18;
    var a = spec.a || 1, b = spec.b || a, c = spec.c || a;
    var ang = spec.gamma || 90;   /* 只支持直胞与简单斜胞，避免几何失真 */
    var cam = makeCam(spec.az === undefined ? 32 : spec.az, spec.el === undefined ? 20 : spec.el,
      Math.min((w - pad * 2 - 150) / (Math.max(a, b) * 1.7), (h - 84) / (c * 1.35)), pad + 116, h * 0.62);
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 1', spec.title || '晶胞结构与原子占位（3D 球棍模型）', spec.note || '');

    /* 原子集 */
    var atoms = spec.atoms || [];
    var bonds = spec.bonds || [];
    /* 晶胞顶点与棱 */
    var corners = [];
    for (var i = 0; i < 8; i++) {
      corners.push([(i & 1) ? a : 0, (i & 2) ? b : 0, (i & 4) ? c : 0]);
    }
    var edges = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
    edges.forEach(function (e) {
      var p1 = cam(corners[e[0]][0], corners[e[0]][1], corners[e[0]][2]);
      var p2 = cam(corners[e[1]][0], corners[e[1]][1], corners[e[1]][2]);
      s += L(p1.X, p1.Y, p2.X, p2.Y, { c: '#B9BFC6', w: 1, dash: '3 3' });
    });
    /* 坐标轴 */
    ['a', 'b', 'c'].forEach(function (ax, k) {
      var v = k === 0 ? [a * 1.16, 0, 0] : (k === 1 ? [0, b * 1.16, 0] : [0, 0, c * 1.16]);
      var o = cam(0, 0, 0), p = cam(v[0], v[1], v[2]);
      s += L(o.X, o.Y, p.X, p.Y, { c: '#6B7A88', w: 1.4 });
      s += T(p.X + 4, p.Y + 3, ax, { size: 10, fill: '#6B7A88', weight: 600 });
    });
    /* Miller 晶面 */
    if (spec.miller) {
      var hkl = spec.miller, pts = [];
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (ax, k) {
        var v = hkl[k] ? 1 / hkl[k] : 0;
        if (!v) return;
        pts.push([ax[0] * v * a, ax[1] * v * b, ax[2] * v * c]);
      });
      if (pts.length >= 3) {
        /* 截距面：取三个轴上截点构成的三角形（只用前三个） */
        var pp = pts.slice(0, 3).map(function (q) { return cam(q[0], q[1], q[2]); });
        s += P('M' + pp.map(function (q) { return q.X.toFixed(1) + ' ' + q.Y.toFixed(1); }).join(' L') + ' Z',
          { fill: 'rgba(214,155,0,0.16)', c: '#D69B00', w: 1.2, dash: '4 3' });
        s += T((pp[0].X + pp[1].X + pp[2].X) / 3, (pp[0].Y + pp[1].Y + pp[2].Y) / 3, '(' + hkl.join('') + ')',
          { size: 9, fill: '#B07A00', anchor: 'middle', weight: 600 });
      }
    }
    /* 原子 + 键：按 depth 从远到近绘制 */
    var draw = [];
    bonds.forEach(function (bd) {
      var p1 = cam(bd[0][0], bd[0][1], bd[0][2]), p2 = cam(bd[1][0], bd[1][1], bd[1][2]);
      draw.push({ d: (p1.d + p2.d) / 2 - 0.02, kind: 'bond', p1: p1, p2: p2, w: bd[2] || 1.6 });
    });
    atoms.forEach(function (at) {
      var p = cam(at.x, at.y, at.z);
      draw.push({ d: p.d, kind: 'atom', p: p, at: at });
    });
    draw.sort(function (m, n) { return n.d - m.d; });
    draw.forEach(function (it) {
      if (it.kind === 'bond') {
        s += L(it.p1.X, it.p1.Y, it.p2.X, it.p2.Y, { c: '#8A929A', w: it.w });
        s += L(it.p1.X, it.p1.Y, it.p2.X, it.p2.Y, { c: '#FFFFFF', w: it.w * 0.34, op: 0.55 });
      } else {
        var r = (it.at.r || 0.22) * (spec.rScale || 26);
        var c1 = MOL_COLOR[it.at.el] || '#88929A';
        s += Circ(it.p.X, it.p.Y, r, { fill: c1, c: '#22262A', w: 0.6 });
        s += Circ(it.p.X - r * 0.28, it.p.Y - r * 0.28, r * 0.3, { fill: '#FFFFFF', op: 0.42 });
        if (it.at.label) s += T(it.p.X, it.p.Y - r - 3, it.at.label, { size: 8.5, anchor: 'middle', fill: '#4A535C', weight: 600 });
      }
    });
    /* 图例 */
    var lx = w - 84, ly = 44;
    (spec.legend || []).slice(0, 6).forEach(function (lg, i) {
      s += Circ(lx, ly + i * 16, 5.2, { fill: MOL_COLOR[lg.el] || '#88929A', c: '#22262A', w: 0.5 });
      s += T(lx + 10, ly + i * 16 + 3.4, lg.t, { size: 9, fill: '#4A535C' });
    });
    if (spec.caption) s += T(pad, h - 6, spec.caption, { size: 8.5, fill: '#7A8288' });
    return s + '</svg>';
  }

  /* 3-2 三维响应面 */
  function surface3d(w, spec) {
    var h = spec.height || 330, pad = 26;
    var z = spec.z, n = z.length;
    var zmin = Math.min.apply(null, z.map(function (r) { return Math.min.apply(null, r); }));
    var zmax = Math.max.apply(null, z.map(function (r) { return Math.max.apply(null, r); }));
    var pal = PALETTES[spec.palette || 'okabe-ito'].c;
    var cam = makeCam(spec.az === undefined ? -52 : spec.az, spec.el === undefined ? 26 : spec.el,
      Math.min((w - 190) / (n * 1.35), (h - 120) / (n * 0.72)), w * 0.46, h - 74);
    var scale = 116 / (zmax - zmin || 1);
    /* 投影网格点 */
    var G = [];
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < n; j++) {
        var p = cam(j, i, (z[i][j] - zmin) * scale / 26);
        row.push(p);
      }
      G.push(row);
    }
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 2', spec.title || '三维响应面', spec.note || '');
    /* 底面网格 */
    for (var k = 0; k < n; k++) {
      var p1 = cam(k, 0, 0), p2 = cam(k, n - 1, 0);
      s += L(p1.X, p1.Y, p2.X, p2.Y, { c: '#E4E8EC', w: 0.8 });
      var q1 = cam(0, k, 0), q2 = cam(n - 1, k, 0);
      s += L(q1.X, q1.Y, q2.X, q2.Y, { c: '#E4E8EC', w: 0.8 });
    }
    var cells = [];
    for (i = 0; i + 1 < n; i++) {
      for (var j2 = 0; j2 + 1 < n; j2++) {
        var avg = (z[i][j2] + z[i + 1][j2] + z[i][j2 + 1] + z[i + 1][j2 + 1]) / 4;
        cells.push({ i: i, j: j2, avg: avg, d: (G[i][j2].d + G[i + 1][j2 + 1].d) / 2 });
      }
    }
    cells.sort(function (m1, m2) { return m2.d - m1.d; });
    cells.forEach(function (c2) {
      var t = (c2.avg - zmin) / (zmax - zmin || 1);
      var col = pal[Math.min(pal.length - 1, Math.floor(t * (pal.length - 1)))];
      var q = [G[c2.i][c2.j], G[c2.i + 1][c2.j], G[c2.i + 1][c2.j + 1], G[c2.i][c2.j + 1]];
      s += P('M' + q.map(function (p) { return p.X.toFixed(1) + ' ' + p.Y.toFixed(1); }).join(' L') + ' Z',
        { fill: col, op: 0.78 - 0.16 * (1 - t), c: 'rgba(255,255,255,0.5)', w: 0.4 });
    });
    /* 最优标记 */
    if (spec.opt) {
      var op = G[spec.opt.i] && G[spec.opt.i][spec.opt.j];
      if (op) {
        s += Circ(op.X, op.Y, 5.4, { fill: '#FFFFFF', c: '#D55E00', w: 2 });
        s += T(op.X, op.Y - 10, spec.opt.label || '最优', { size: 9, fill: '#D55E00', anchor: 'middle', weight: 600 });
      }
    }
    /* 轴标签 + 色标 */
    var ax0 = cam(0, 0, 0), ax1 = cam(n - 1, 0, 0), ax2 = cam(0, n - 1, 0), ax3 = cam(0, 0, 116 / 26 / 26);
    s += T(ax1.X, ax1.Y + 16, spec.xlabel || 'x₁', { size: 9.5, anchor: 'middle', fill: '#4A535C' });
    s += T(ax2.X - 6, ax2.Y + 12, spec.ylabel || 'x₂', { size: 9.5, anchor: 'end', fill: '#4A535C' });
    s += T(ax0.X - 24, ax0.Y - 6, spec.zlabel || '响应值', { size: 9.5, fill: '#4A535C' });
    void ax3;
    var bx = w - 42, by = 46, bh = h - 118;
    for (var q2 = 0; q2 < 26; q2++) {
      var t2 = 1 - q2 / 25;
      s += '<rect x="' + bx + '" y="' + (by + bh * q2 / 26).toFixed(1) + '" width="11" height="' + (bh / 26 + 0.8).toFixed(2) +
        '" fill="' + pal[Math.min(pal.length - 1, Math.floor(t2 * (pal.length - 1)))] + '" opacity="0.85"/>';
    }
    s += T(bx + 15, by + 8, Math.round(zmax), { size: 8, fill: '#7A8288' });
    s += T(bx + 15, by + bh, Math.round(zmin), { size: 8, fill: '#7A8288' });
    return s + '</svg>';
  }

  /* 3-3 三维柱状 */
  function bars3d(w, spec) {
    var h = spec.height || 330;
    var n = spec.rows.length, m = spec.cols.length;
    var max = spec.max || Math.max.apply(null, spec.z.map(function (r) { return Math.max.apply(null, r); }));
    var pal = PALETTES[spec.palette || 'okabe-ito'].c;
    var cam = makeCam(spec.az === undefined ? -34 : spec.az, spec.el === undefined ? 24 : spec.el,
      Math.min((w - 170) / (n + m + 1.4) * 1.45, (h - 130) / (n + m) * 1.45, 44), w * 0.42, h - 74);
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 3', spec.title || '三维柱状对比', spec.note || '');
    var items = [];
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < m; j++) {
        var v = spec.z[i][j];
        var hh = (v / max) * 1.5;
        var base = cam(j + 0.15, i + 0.15, 0);
        var top = cam(j + 0.15, i + 0.15, hh);
        items.push({ d: base.d, base: base, top: top, v: v, i: i, j: j, hh: hh });
      }
    }
    /* 底面网格 */
    for (var k = 0; k <= n; k++) {
      var p1 = cam(0, k, 0), p2 = cam(m, k, 0);
      s += L(p1.X, p1.Y, p2.X, p2.Y, { c: '#E4E8EC', w: 0.8 });
    }
    for (var q = 0; q <= m; q++) {
      var r1 = cam(q, 0, 0), r2 = cam(q, n, 0);
      s += L(r1.X, r1.Y, r2.X, r2.Y, { c: '#E4E8EC', w: 0.8 });
    }
    items.sort(function (a, b) { return b.d - a.d; });
    items.forEach(function (it) {
      var bw = 12.5;
      var t = it.v / max;
      var col = pal[Math.min(pal.length - 1, Math.floor(t * (pal.length - 1)))];
      /* 柱体：顶面 + 两个侧面 */
      var tb = cam(it.j + 0.15 + bw / 40, it.i + 0.15, it.hh);
      var tl = cam(it.j + 0.15 - bw / 40, it.i + 0.15, it.hh);
      var tr = cam(it.j + 0.15, it.i + 0.15 + bw / 40, it.hh);
      var br = cam(it.j + 0.15, it.i + 0.15 + bw / 40, 0);
      var bl = cam(it.j + 0.15 - bw / 40, it.i + 0.15, 0);
      s += P('M' + [it.top, tl, bl, it.base].map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: col, op: 0.62, c: 'none' });
      s += P('M' + [it.top, tr, br, it.base].map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: col, op: 0.88, c: 'none' });
      s += P('M' + [tl, tb, tr, it.top].map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: '#FFFFFF', op: 0.55, c: col, w: 0.8 });
      s += T(it.top.X, it.top.Y - 5, String(Math.round(it.v)), { size: 7.5, anchor: 'middle', fill: '#4A535C' });
    });
    /* 轴标签 */
    spec.cols.forEach(function (c, j) {
      var p = cam(j + 0.5, -0.35, 0);
      s += T(p.X, p.Y + 12, c, { size: 8.5, anchor: 'middle', fill: '#4A535C' });
    });
    spec.rows.forEach(function (r, i) {
      var p = cam(-0.35, i + 0.5, 0);
      s += T(p.X, p.Y + 6, r, { size: 8.5, anchor: 'end', fill: '#4A535C' });
    });
    return s + '</svg>';
  }

  /* 3-4 层状 / 界面堆叠 3D 示意（纤维-基体、涂层、多层膜） */
  function layered3d(w, spec) {
    var h = spec.height || 330;
    var layers = spec.layers || [];
    var cam = makeCam(spec.az === undefined ? -42 : spec.az, spec.el === undefined ? 26 : spec.el, Math.min(w / 6.0, (h - 96) / (layers.length * 1.5), 60), w * 0.40, h * 0.66);
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 4', spec.title || '层状 / 界面结构 3D 示意', spec.note || '');
    var W = 2.6, D = 2.0, TH = 0.42;
    var z = 0;
    layers.forEach(function (ly) {
      var z0 = z, z1 = z + (ly.th || TH);
      z = z1;
      var col = ly.color || '#B9C2C9';
      /* 六个面：顶面、前面、右面 */
      var c = function (x, y, zz) { return cam(x, y, zz); };
      var top = [c(0, 0, z1), c(W, 0, z1), c(W, D, z1), c(0, D, z1)];
      var front = [c(0, D, z0), c(W, D, z0), c(W, D, z1), c(0, D, z1)];
      var right = [c(W, 0, z0), c(W, D, z0), c(W, D, z1), c(W, 0, z1)];
      s += P('M' + top.map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: col, op: 0.9, c: '#FFFFFF', w: 0.7 });
      s += P('M' + front.map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: col, op: 0.66, c: '#FFFFFF', w: 0.7 });
      s += P('M' + right.map(p => p.X.toFixed(1) + ' ' + p.Y.toFixed(1)).join(' L') + ' Z', { fill: col, op: 0.5, c: '#FFFFFF', w: 0.7 });
      /* 顶面纹理：纤维 / 颗粒 / 涂层 */
      if (ly.pattern === 'fiber') {
        for (var f = 0; f < 7; f++) {
          var fy = 0.14 + f * (D - 0.28) / 6;
          var a1 = c(0.08, fy, z1), a2 = c(W - 0.08, fy, z1);
          s += L(a1.X, a1.Y, a2.X, a2.Y, { c: '#FFFFFF', w: 2.1, op: 0.72 });
        }
      } else if (ly.pattern === 'grain') {
        for (var g = 0; g < 26; g++) {
          var gx = 0.12 + (g % 7) * (W - 0.24) / 6, gy = 0.12 + Math.floor(g / 7) * (D - 0.24) / 3;
          var gp = c(gx, gy, z1);
          s += Circ(gp.X, gp.Y, 2.2 + (g % 3), { fill: '#FFFFFF', op: 0.35 });
        }
      } else if (ly.pattern === 'mesh') {
        for (var m1 = 0; m1 < 5; m1++) {
          var b1 = c(m1 * W / 4, 0.05, z1), b2 = c(m1 * W / 4, D - 0.05, z1);
          s += L(b1.X, b1.Y, b2.X, b2.Y, { c: '#FFFFFF', w: 0.9, op: 0.6 });
        }
        for (var m2 = 0; m2 < 4; m2++) {
          var d1 = c(0.05, m2 * D / 3, z1), d2 = c(W - 0.05, m2 * D / 3, z1);
          s += L(d1.X, d1.Y, d2.X, d2.Y, { c: '#FFFFFF', w: 0.9, op: 0.6 });
        }
      }
      /* 层标注 */
      var lp = c(0, D, z1);
      s += T(lp.X - 6, lp.Y + 4, ly.t, { size: 8.5, anchor: 'end', fill: '#4A535C', weight: 600 });
    });
    if (spec.caption) s += T(16, h - 6, spec.caption, { size: 8.5, fill: '#7A8288' });
    return s + '</svg>';
  }

  /* ================= 4. 分子结构规范（SCI 表达惯例） ================= */
  var MOL_GUIDE = [
    { k: '骨架式（Skeletal / 键线式）', use: '小分子与有机配体的**首选**表达：有机化学、MOF 配体、钝化分子、偶联剂。', why: '碳骨架用折线表示，省略 C 与 C–H，只显式标注杂原子（O/N/S/Si/P）与官能团。DOI 级期刊默认。', mol: 'silane' },
    { k: '球棍式（Ball-and-stick）', use: '需要交代**空间构型与键角**时：晶体结构、配位环境、吸附构型、界面结合。', why: '原子按 CPK 配色画球、键用圆柱；比骨架式更能表达立体化学，但占用空间大。', mol: 'ball' },
    { k: '空间填充式（Space-filling）', use: '强调**分子体积与位阻**：孔道占位、聚合物链段、大分子堆积。', why: '用范德华半径画球，无键；用于说明"填不进去/挤不挤"。', mol: 'space' },
    { k: '楔形/虚线式（Wedge–dash）', use: '手性中心与立体化学（R/S）：手性配体、立体选择性反应。', why: '实楔形朝观察者、虚线背离；只标关键手性中心，不整分子使用。', mol: 'wedge' },
    { k: '结构式（Condensed / 半结构式）', use: '反应式与官能团转化：氧化/接枝/交联的**反应方程**。', why: '只画参与反应的局部结构（如 –OH → –COOH），其余用 R 或链线代替，避免整链绘制。', mol: 'reaction' }
  ];
  /* 作为"SCI 里分子长什么样"的简版绘制器（骨架式 / 球棍式） */
  function molecule(w, spec) {
    var h = spec.height || 240;
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 5', spec.title || '分子结构的 SCI 表达', spec.note || '');
    var kind = spec.mol || 'silane';
    var cx = w / 2, cy = h / 2 + 8, k = 1;
    function bond(x1, y1, x2, y2, o) {
      o = o || {};
      return L(x1 * k, y1 * k, x2 * k, y2 * k, { c: o.c || '#303030', w: o.w || 1.6 });
    }
    function atom(x, y, el, lbl) {
      var r = (el === 'H' ? 4.4 : 6.6);
      return Circ(x * k, y * k, r, { fill: MOL_COLOR[el] || '#88929A', c: '#22262A', w: 0.6 }) +
        '<circle cx="' + (x * k - r * 0.3).toFixed(1) + '" cy="' + (y * k - r * 0.3).toFixed(1) + '" r="' + (r * 0.3).toFixed(1) + '" fill="#fff" opacity="0.4"/>' +
        (lbl ? T(x * k, y * k - r - 3, lbl, { size: 8.5, anchor: 'middle', fill: '#4A535C', weight: 600 }) : '');
    }
    if (kind === 'silane') {
      /* KH-550 型硅烷：R–Si(OR')3 → 水解 → Si–OH → 与纤维 –OH 缩合 */
      var y0 = cy;
      var si = [cx - 40, y0];
      s += bond(si[0], si[1], cx - 92, y0 - 22, { w: 1.8 });
      s += T(cx - 104, y0 - 26, 'R（有机基团）', { size: 8.5, anchor: 'end', fill: '#4A535C' });
      s += atom(si[0], si[1], 'Si', 'Si');
      [[1, -1], [1, 0.2], [1, 1.2]].forEach(function (q, i) {
        var ox = cx + 14 + i * 6, oy = y0 + q[1] * 34;
        s += bond(si[0], si[1], ox, oy);
        s += atom(ox, oy, 'O', 'O');
        s += bond(ox, oy, ox + 26, oy + q[1] * 12);
        s += T(ox + 30, oy + q[1] * 12 + 3, i === 0 ? 'CH₃' : 'Et', { size: 8.5, fill: '#4A535C' });
      });
      s += T(cx - 40, h - 26, 'R–Si(OR′)₃  +  3H₂O  →  R–Si(OH)₃  +  3R′OH', { size: 9, mono: true, fill: '#0072B2' });
      s += T(cx - 40, h - 12, 'R–Si(OH)₃  +  Fiber–OH  →  Fiber–O–Si–R  +  H₂O（Si–O–C 桥接）', { size: 9, mono: true, fill: '#D55E00' });
    } else if (kind === 'ball') {
      /* 球棍式：以纤维素 C6 区域为例 */
      var pts = [[cx - 70, cy + 10], [cx - 30, cy - 14], [cx + 12, cy + 10], [cx + 54, cy - 14], [cx + 92, cy + 10]];
      pts.forEach(function (p, i) { s += atom(p[0], p[1], i === 4 ? 'O' : 'C', i === 4 ? 'O' : 'C'); });
      for (var i2 = 0; i2 < pts.length - 1; i2++) s += bond(pts[i2][0], pts[i2][1], pts[i2 + 1][0], pts[i2 + 1][1]);
      s += bond(pts[2][0], pts[2][1], pts[2][0] + 8, pts[2][1] + 40);
      s += atom(pts[2][0] + 8, pts[2][1] + 40, 'O', 'OH(C6)');
      s += T(pts[2][0] + 14, pts[2][1] + 54, 'C6 伯羟基 → 优先被氧化', { size: 8.5, fill: '#D55E00' });
    } else if (kind === 'reaction') {
      s += T(cx - 120, cy - 30, 'Fiber–CH₂OH', { size: 11, mono: true, fill: '#303030' });
      s += L(cx - 10, cy - 34, cx + 60, cy - 34, { c: '#4A535C', w: 1.6 });
      s += P('M' + (cx + 54) + ' ' + (cy - 38) + ' L' + (cx + 62) + ' ' + (cy - 34) + ' L' + (cx + 54) + ' ' + (cy - 30) + ' Z', { fill: '#4A535C' });
      s += T(cx + 2, cy - 40, '氧化', { size: 8.5, fill: '#4A535C', anchor: 'middle' });
      s += T(cx + 74, cy - 30, 'Fiber–COOH', { size: 11, mono: true, fill: '#0072B2' });
      s += T(cx - 120, cy + 10, '仅画参与反应的局部官能团，其余用链线代替；', { size: 9, fill: '#7A8288' });
      s += T(cx - 120, cy + 26, '反应条件写在箭头上下方，不写在结构里。', { size: 9, fill: '#7A8288' });
    } else {
      s += T(cx, cy, '（该表达方式见下方说明）', { size: 10, anchor: 'middle', fill: '#9AA1A8' });
    }
    return s + '</svg>';
  }

  /* ================= 5. 图型 × 实验类型匹配手册 ================= */
  var PLAYBOOK = [
    { exp: '力学性能（强度/模量/延伸率）', figs: ['分组柱状 + 误差棒', '应力–应变曲线', '箱线图/小提琴图', '三维柱状（多因素）'], conv: '必须报告 n ≥ 3 与误差棒；组间差异用显著性标记（*/**/***）；曲线族用同一色系深浅区分。', pal: 'okabe-ito' },
    { exp: '工艺参数优化（温度/时间/配比）', figs: ['折线（多水平）', '三维响应面 + 等高线', '主效应图', '立方柱状（3 因素）'], conv: '响应面是材料 SCI 的标配；峰位要标最优条件；单因素曲线要给出峰值与两侧下降趋势。', pal: 'npg' },
    { exp: '微观结构（SEM / TEM / 光学显微）', figs: ['多面板 A–D 形貌图', '断面/表面成对', '截面成分线扫', '与性能并列的双面板'], conv: '每个面板必须有比例尺、面板标号 (a)(b)、放大倍数；同一组图统一标尺与亮度；形貌描述要与正文论断对应。', pal: 'glm' },
    { exp: '物相与晶体结构（XRD / TEM 衍射）', figs: ['XRD 谱 + 标准卡片线', '(003) 等特征峰局部放大', '晶胞 3D 球棍模型 + Miller 面', 'Rietveld 精修拟合图'], conv: '要标出特征峰归属与 PDF 卡片号；混排度用 I(003)/I(104) 等比值定量；晶胞图给 a/b/c 与 α/β/γ。', pal: 'okabe-ito' },
    { exp: '化学组成与官能团（FTIR / XPS / NMR）', figs: ['FTIR 谱（上下错开或叠放）', 'XPS 分峰拟合（含原始点与拟合线）', '分子结构式 + 反应式', '峰归属表'], conv: 'FTIR 横轴由高波数到低波数；XPS 要给出分峰、拟合线与原始数据点，并标结合能与归属；分子用骨架式。', pal: 'lancet' },
    { exp: '电化学性能（电池/超容/腐蚀）', figs: ['循环曲线（容量–圈数）', '倍率性能柱状', 'CV 曲线', 'EIS Nyquist + 等效电路'], conv: '要标电流密度与电压窗口；Nyquist 图给高频截距与半圆；循环图常配库仑效率副轴（双 Y 轴）。', pal: 'nejm' },
    { exp: '热性能（TGA / DSC / 导热）', figs: ['TG–DTG 双轴曲线', 'DSC 曲线（标玻璃化转变/熔点）', '导热系数柱状', '热稳定性对比'], conv: 'TG 常与 DTG 同图双 Y 轴；特征温度（T5%、Tmax）要在图上标出。', pal: 'science' },
    { exp: '光学 / 光电性能', figs: ['吸收光谱 + Tauc 图', 'PL 发射谱', '透光率/雾度柱状'], conv: '带隙用 Tauc plot 外推；光谱要标吸收边与特征峰。', pal: 'npg' },
    { exp: '抗菌 / 生物性能', figs: ['抑菌率柱状 + 显著性', '抑菌圈照片面板', '活死染色 CLSM（绿/红通道）', '时间–存活曲线（log 尺度）'], conv: '要报告菌株与接种量；活死染色用统一绿/红伪彩；杀菌动力学优于单一终点值。', pal: 'lancet' },
    { exp: '吸附 / 分离性能', figs: ['吸附等温线 + 拟合模型', '动力学曲线', '穿透曲线', 'pH/温度影响折线'], conv: '等温线要给出拟合模型（Langmuir/Freundlich）与 R²；动力学区分准一级/准二级。', pal: 'okabe-ito' }
  ];

  return {
    PALETTES: PALETTES, MOL_COLOR: MOL_COLOR, MOL_GUIDE: MOL_GUIDE, PLAYBOOK: PLAYBOOK,
    crystal: crystal, surface3d: surface3d, bars3d: bars3d, layered3d: layered3d, molecule: molecule,
    makeCam: makeCam, T: T, L: L, P: P, Circ: Circ, frame: frame, cap: cap
  };
})();
