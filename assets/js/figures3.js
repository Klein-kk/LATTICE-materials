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
  function frame(w, h, bg) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
    '" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">' +
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

  /* ---- 自动适配相机：先以单位缩放投影出包围盒，再反算缩放与平移，
       使所有采样点恰好居中并填满 [pad, w-pad] × [top, h-bottom] 区域。
       用法：var fit = autoFit(w, h, pad, top, bottom); fit.add(x,y,z)... ;
             var cam = fit.cam();  点位用原始世界坐标调用即可。 ---- */
  function autoFit(w, h, opt) {
    opt = opt || {};
    var padX = opt.padX === undefined ? 40 : opt.padX;
    var padTop = opt.padTop === undefined ? 46 : opt.padTop;
    var padBot = opt.padBot === undefined ? 48 : opt.padBot;
    var az = opt.az === undefined ? 32 : opt.az, el = opt.el === undefined ? 20 : opt.el;
    var ca = Math.cos(az * Math.PI / 180), sa = Math.sin(az * Math.PI / 180);
    var ce = Math.cos(el * Math.PI / 180), se = Math.sin(el * Math.PI / 180);
    /* 单位投影：s=1, cx=cy=0 */
    function proj(x, y, z) {
      var x1 = x * ca - y * sa, y1 = x * sa + y * ca;
      return { X: x1, Y: -(z * ce - y1 * se), d: y1 * ce + z * se };
    }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, n = 0;
    function add(x, y, z) {
      var p = proj(x, y, z);
      if (p.X < minX) minX = p.X; if (p.X > maxX) maxX = p.X;
      if (p.Y < minY) minY = p.Y; if (p.Y > maxY) maxY = p.Y;
      n++;
      return p;
    }
    function addPt(arr) { for (var i = 0; i < arr.length; i++) add(arr[i][0], arr[i][1], arr[i][2]); }
    function cam() {
      if (!n) return makeCam(az, el, 1, w / 2, h / 2);
      var bw = Math.max(1e-6, maxX - minX), bh = Math.max(1e-6, maxY - minY);
      var availW = w - padX * 2, availH = h - padTop - padBot;
      var s = Math.min(availW / bw, availH / bh);
      /* 以单位投影包围盒中心对齐到可用区域中心 */
      var cXw = (minX + maxX) / 2, cYw = (minY + maxY) / 2;
      var tgtX = padX + availW / 2, tgtY = padTop + availH / 2;
      return makeCam(az, el, s, tgtX - cXw * s, tgtY - cYw * s);
    }
    function scale() {
      if (!n) return 1;
      var bw = Math.max(1e-6, maxX - minX), bh = Math.max(1e-6, maxY - minY);
      return Math.min((w - padX * 2) / bw, (h - padTop - padBot) / bh);
    }
    return { add: add, addPt: addPt, cam: cam, scale: scale, bbox: function () { return { minX: minX, maxX: maxX, minY: minY, maxY: maxY }; } };
  }

  /* ================= 3. 3D 图形 ================= */

  /* 3-1 晶胞 / 球棍模型 */
  function crystal(w, spec) {
    var h = spec.height || 340, pad = 18;
    var a = spec.a || 1, b = spec.b || a, c = spec.c || a;
    var ang = spec.gamma || 90;   /* 只支持直胞与简单斜胞，避免几何失真 */
    var atoms = spec.atoms || [];
    var bonds = spec.bonds || [];
    /* 自动适配相机：纳入晶胞顶点、坐标轴端点与所有原子，使模型居中且尽量填满 */
    var fit = autoFit(w, h, {
      padX: Math.max(96, w * 0.14), padTop: 52, padBot: 44,
      az: spec.az === undefined ? 32 : spec.az, el: spec.el === undefined ? 20 : spec.el
    });
    var axisK = 1.16;
    fit.addPt([[0, 0, 0], [a, b, c]]);
    fit.addPt([[a * axisK, 0, 0], [0, b * axisK, 0], [0, 0, c * axisK]]);
    atoms.forEach(function (at) { fit.add(at.x, at.y, at.z); });
    var cam = fit.cam();
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 1', spec.title || '晶胞结构与原子占位（3D 球棍模型）', spec.note || '');

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
    /* 原子半径随相机缩放联动：0.5*scale 换算成屏幕像素，保证球体大小与晶胞比例一致 */
    var fitS = fit.scale();
    var rBase = spec.rScale || (0.5 * fitS * 0.46);
    draw.sort(function (m, n) { return n.d - m.d; });
    draw.forEach(function (it) {
      if (it.kind === 'bond') {
        s += L(it.p1.X, it.p1.Y, it.p2.X, it.p2.Y, { c: '#8A929A', w: it.w });
        s += L(it.p1.X, it.p1.Y, it.p2.X, it.p2.Y, { c: '#FFFFFF', w: it.w * 0.34, op: 0.55 });
      } else {
        var r = (it.at.r || 0.22) * rBase;
        var c1 = MOL_COLOR[it.at.el] || '#88929A';
        s += Circ(it.p.X, it.p.Y, r, { fill: c1, c: 'rgba(20,24,28,0.55)', w: 0.8 });
        s += Circ(it.p.X - r * 0.3, it.p.Y - r * 0.3, r * 0.32, { fill: '#FFFFFF', op: 0.5 });
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
    /* 高度场归一化到 0..zNormZ（世界单位），与底面的 n×n 尺度同量级 */
    var zNormZ = spec.zHeight === undefined ? Math.max(2.2, n * 0.55) : spec.zHeight;
    var zr = (zmax - zmin) || 1;
    function zw(v) { return (v - zmin) / zr * zNormZ; }
    /* 自动适配相机：纳入底面四角 + 整个曲面的采样点 */
    var fit = autoFit(w, h, {
      padX: 62, padTop: 54, padBot: 66,
      az: spec.az === undefined ? -52 : spec.az, el: spec.el === undefined ? 26 : spec.el
    });
    fit.addPt([[0, 0, 0], [n - 1, 0, 0], [0, n - 1, 0], [n - 1, n - 1, 0]]);
    /* 轴名外推点也纳入适配，确保标签不被裁 */
    fit.addPt([[(n - 1) * 1.36, -(n - 1) * 0.36, 0], [-(n - 1) * 0.36, (n - 1) * 1.36, 0]]);
    var i, j;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) fit.add(j, i, zw(z[i][j]));
    var cam = fit.cam();
    /* 投影网格点 */
    var G = [];
    for (i = 0; i < n; i++) {
      var row = [];
      for (j = 0; j < n; j++) row.push(cam(j, i, zw(z[i][j])));
      G.push(row);
    }
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 2', spec.title || '三维响应面', spec.note || '');
    /* 底面网格（含四周边框） */
    for (var k = 0; k < n; k++) {
      var p1 = cam(k, 0, 0), p2 = cam(k, n - 1, 0);
      s += L(p1.X, p1.Y, p2.X, p2.Y, { c: '#E4E8EC', w: 0.8 });
      var q1 = cam(0, k, 0), q2 = cam(n - 1, k, 0);
      s += L(q1.X, q1.Y, q2.X, q2.Y, { c: '#E4E8EC', w: 0.8 });
    }
    /* 连续色标工具（在曲面绘制前定义，供曲面与色标条共用） */
    function _hex2rgb(x2) { return [parseInt(x2.slice(1, 3), 16), parseInt(x2.slice(3, 5), 16), parseInt(x2.slice(5, 7), 16)]; }
    function _rgb2hsl(r, g2, b2) {
      r /= 255; g2 /= 255; b2 /= 255;
      var mx = Math.max(r, g2, b2), mn = Math.min(r, g2, b2), h2 = 0, s2 = 0, l2 = (mx + mn) / 2;
      if (mx !== mn) { var dd = mx - mn; s2 = l2 > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); h2 = mx === r ? (g2 - b2) / dd + (g2 < b2 ? 6 : 0) : (mx === g2 ? (b2 - r) / dd + 2 : (r - g2) / dd + 4); h2 /= 6; }
      return [h2, s2, l2];
    }
    function _hsl2hex(h2, s2, l2) {
      function hue(p2, q2, t2) { if (t2 < 0) t2 += 1; if (t2 > 1) t2 -= 1; if (t2 < 1 / 6) return p2 + (q2 - p2) * 6 * t2; if (t2 < 1 / 2) return q2; if (t2 < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t2) * 6; return p2; }
      var r2, g3, b3;
      if (s2 === 0) { r2 = g3 = b3 = l2; } else {
        var q2 = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2, p2 = 2 * l2 - q2;
        r2 = hue(p2, q2, h2 + 1 / 3); g3 = hue(p2, q2, h2); b3 = hue(p2, q2, h2 - 1 / 3);
      }
      function hx(v) { var s3 = Math.round(v * 255).toString(16); return s3.length < 2 ? '0' + s3 : s3; }
      return '#' + hx(r2) + hx(g3) + hx(b3);
    }
    var _cLo = _hex2rgb(pal[0]), _cHi = _hex2rgb(pal[Math.min(pal.length - 1, 4)]);
    var _hslLo = _rgb2hsl(_cLo[0], _cLo[1], _cLo[2]), _hslHi = _rgb2hsl(_cHi[0], _cHi[1], _cHi[2]);
    function cellColor(t2) {
      var dh = _hslHi[0] - _hslLo[0]; if (dh > 0.5) dh -= 1; if (dh < -0.5) dh += 1;
      var h2 = (_hslLo[0] + dh * t2 + 1) % 1;
      var s2 = _hslLo[1] + (_hslHi[1] - _hslLo[1]) * t2;
      var l2 = 0.76 - 0.36 * t2;  /* 浅（低值）→ 深（高值） */
      return _hsl2hex(h2, Math.max(0.26, s2), l2);
    }
    /* 曲面片：按格子平均 z 用连续色着色 */
    /* 曲面片：按格子平均 z 用连续色着色（曲面网格较底面网格略内收，留出轴名与刻度空间） */
    var cells = [];
    for (i = 0; i + 1 < n; i++) {
      for (var j2 = 0; j2 + 1 < n; j2++) {
        var avg = (z[i][j2] + z[i + 1][j2] + z[i][j2 + 1] + z[i + 1][j2 + 1]) / 4;
        cells.push({ i: i, j: j2, avg: avg, d: (G[i][j2].d + G[i + 1][j2 + 1].d) / 2 });
      }
    }
    cells.sort(function (m1, m2) { return m2.d - m1.d; });
    var NC = pal.length;
    cells.forEach(function (c2) {
      var t = (c2.avg - zmin) / zr;
      var col = cellColor(t);   /* 连续色（同色系深浅），与右侧色标一致 */
      var q = [G[c2.i][c2.j], G[c2.i + 1][c2.j], G[c2.i + 1][c2.j + 1], G[c2.i][c2.j + 1]];
      s += P('M' + q.map(function (p) { return p.X.toFixed(1) + ' ' + p.Y.toFixed(1); }).join(' L') + ' Z',
        { fill: col, op: 0.96, c: 'rgba(255,255,255,0.42)', w: 0.35 });
    });
    /* 最优点标记：引线 + 白心圆点 */
    if (spec.opt) {
      var op = G[spec.opt.i] && G[spec.opt.i][spec.opt.j];
      if (op) {
        s += L(op.X, op.Y - 6, op.X, op.Y - 20, { c: '#D55E00', w: 1.2 });
        s += Circ(op.X, op.Y, 5.4, { fill: '#FFFFFF', c: '#D55E00', w: 2.2 });
        s += T(op.X, op.Y - 24, spec.opt.label || '最优', { size: 9.5, fill: '#D55E00', anchor: 'middle', weight: 700 });
      }
    }
    /* 轴标注：底面两条主边 + 竖直 Z 轴（三轴加箭头） */
    var ax0 = cam(0, 0, 0), ax1 = cam(n - 1, 0, 0), ax2 = cam(0, n - 1, 0), axz = cam(0, 0, zNormZ);
    /* Z 轴向上（略带偏移避免压在数据上） */
    s += L(ax0.X, ax0.Y, axz.X, axz.Y, { c: '#6B7A88', w: 1.3 });
    s += P('M' + (axz.X - 3.4) + ' ' + (axz.Y + 5) + ' L' + axz.X + ' ' + axz.Y + ' L' + (axz.X + 3.4) + ' ' + (axz.Y + 5) + ' Z', { fill: '#6B7A88' });
    /* 轴名：不放在 3D 空间内（易压曲面），改为在画布底部留一条"轴说明带"，
       用 小色块 + 变量名 的形式列出两根自变量轴，符合期刊图注习惯。 */
    var abY = h - 14;
    s += '<rect x="' + (pad + 2) + '" y="' + (abY - 9) + '" width="16" height="3" fill="#6B7A88"/>';
    s += T(pad + 24, abY - 4, (spec.xlabel || 'x₁') + '（主轴）', { size: 9.5, fill: '#4A535C', weight: 600 });
    /* 直接用原始 ylabel（如"第二因素（交互项）"），避免去括号后又补一次造成重复 */
    var y2 = (spec.ylabel || 'x₂').trim();
    if (y2.indexOf('（') < 0 && y2.indexOf('(') < 0) y2 += '（第二因素）';
    s += '<rect x="' + (pad + 132) + '" y="' + (abY - 9) + '" width="16" height="3" fill="#B9C2C9"/>';
    s += T(pad + 154, abY - 4, y2, { size: 9.5, fill: '#4A535C', weight: 600 });
    /* Z 轴标签：竖排（旋转 -90°）贴在轴左侧，避免 anchor:end 越出左边界被裁 */
    var zlx = Math.max(10, axz.X - 10), zly = (ax0.Y + axz.Y) / 2;
    s += T(zlx, zly, spec.zlabel || '响应值', { size: 10, anchor: 'middle', fill: '#4A535C', weight: 600, rot: -90 });
    /* 色标：用"单色渐变"（同色系深浅），比离散配色板更符合连续量纲惯例 */
    var bx = w - 40, by = 48, bh = h - 168;
    var steps = 32;
    /* 取配色板中"感知连续"的一段：用首色→末色做 HSL 插值 */
    /* 用连续色标绘制色标条（与曲面同一映射） */
    for (var q2 = 0; q2 < steps; q2++) {
      var t2 = 1 - q2 / (steps - 1);
      s += '<rect x="' + bx + '" y="' + (by + bh * q2 / steps).toFixed(1) + '" width="12" height="' + (bh / steps + 0.8).toFixed(2) +
        '" fill="' + cellColor(t2) + '"/>';
    }
    s += '<rect x="' + bx + '" y="' + by + '" width="12" height="' + bh + '" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="0.6"/>';
    var mid = (zmax + zmin) / 2;
    s += T(bx + 16, by + 4, Math.round(zmax), { size: 8.5, fill: '#7A8288' });
    s += T(bx + 16, by + bh / 2 + 3, Math.round(mid), { size: 8.5, fill: '#7A8288' });
    s += T(bx + 16, by + bh + 1, Math.round(zmin), { size: 8.5, fill: '#7A8288' });
    s += T(bx + 6, by - 8, spec.clabel || '响应值', { size: 8.5, fill: '#7A8288', anchor: 'middle' });
    return s + '</svg>';
  }

  /* 3-3 三维柱状 */
  function bars3d(w, spec) {
    var h = spec.height || 330;
    var n = spec.rows.length, m = spec.cols.length;
    var max = spec.max || Math.max.apply(null, spec.z.map(function (r) { return Math.max.apply(null, r); }));
    var pal = PALETTES[spec.palette || 'okabe-ito'].c;
    var BAR_H = 2.0; /* 最高柱的世界高度，与底面 n×m 同量级 */
    var bw = 0.34;   /* 柱宽（世界单位） */
    function hz(v) { return Math.max(0.06, (v / (max || 1)) * BAR_H); }
    /* 自动适配：纳入底面四角 + 每根柱的四个顶角 */
    var fit = autoFit(w, h, {
      padX: 58, padTop: 58, padBot: 56,
      az: spec.az === undefined ? -34 : spec.az, el: spec.el === undefined ? 26 : spec.el
    });
    fit.addPt([[0, 0, 0], [m, 0, 0], [0, n, 0], [m, n, 0]]);
    var i, j;
    for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
      var cx0 = j + 0.5, cy0 = i + 0.5, hh = hz(spec.z[i][j]);
      fit.addPt([
        [cx0 - bw, cy0 - bw, hh], [cx0 + bw, cy0 - bw, hh],
        [cx0 + bw, cy0 + bw, hh], [cx0 - bw, cy0 + bw, hh],
        [cx0 - bw, cy0 - bw, 0], [cx0 + bw, cy0 + bw, 0]
      ]);
    }
    var cam = fit.cam();
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 3', spec.title || '三维柱状对比', spec.note || '');
    var items = [];
    for (i = 0; i < n; i++) {
      for (j = 0; j < m; j++) {
        var v = spec.z[i][j];
        var base = cam(j + 0.5, i + 0.5, 0);
        var top = cam(j + 0.5, i + 0.5, hz(v));
        items.push({ d: base.d, base: base, top: top, v: v, i: i, j: j });
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
      var t = it.v / (max || 1);
      var col = pal[Math.max(0, Math.min(pal.length - 1, Math.round(t * (pal.length - 1))))];
      var cx0 = it.j + 0.5, cy0 = it.i + 0.5, hh = hz(it.v);
      /* 八个顶点：底 / 顶，四角 */
      var b0 = cam(cx0 - bw, cy0 - bw, 0), b1 = cam(cx0 + bw, cy0 - bw, 0),
        b2 = cam(cx0 + bw, cy0 + bw, 0), b3 = cam(cx0 - bw, cy0 + bw, 0);
      var t0 = cam(cx0 - bw, cy0 - bw, hh), t1 = cam(cx0 + bw, cy0 - bw, hh),
        t2 = cam(cx0 + bw, cy0 + bw, hh), t3 = cam(cx0 - bw, cy0 + bw, hh);
      function poly(pts, o) { return P('M' + pts.map(function (p) { return p.X.toFixed(1) + ' ' + p.Y.toFixed(1); }).join(' L') + ' Z', o); }
      /* 左侧面（亮）、右侧面（中最亮）、前面（暗） */
      s += poly([t0, t1, b1, b0], { fill: col, op: 0.62, c: 'none' });
      s += poly([t1, t2, b2, b1], { fill: col, op: 0.72, c: 'none' });
      s += poly([t2, t3, b3, b2], { fill: col, op: 0.52, c: 'none' });
      /* 顶面 */
      s += poly([t0, t1, t2, t3], { fill: '#FFFFFF', op: 0.72, c: col, w: 1 });
      s += T(it.top.X, it.top.Y - 5, String(Math.round(it.v)), { size: 7.5, anchor: 'middle', fill: '#4A535C', weight: 600 });
    });
    /* 轴标签 */
    spec.cols.forEach(function (c, j) {
      var p = cam(j + 0.5, -0.45, 0);
      s += T(p.X, p.Y + 13, c, { size: 8.5, anchor: 'middle', fill: '#4A535C', weight: 600 });
    });
    spec.rows.forEach(function (r, i) {
      var p = cam(-0.5, i + 0.5, 0);
      s += T(p.X, p.Y + 6, r, { size: 8.5, anchor: 'end', fill: '#4A535C', weight: 600 });
    });
    return s + '</svg>';
  }

  /* 3-4 层状 / 界面堆叠 3D 示意（纤维-基体、涂层、多层膜） */
  function layered3d(w, spec) {
    var h = spec.height || 330;
    var layers = spec.layers || [];
    var W = 2.6, D = 2.0, TH = 0.42;
    var totalH = layers.reduce(function (s2, ly) { return s2 + (ly.th || TH); }, 0) || TH;
    /* 自动适配：纳入堆叠体 8 个外包角，使其居中并填满 */
    var fit = autoFit(w, h, {
      padX: 152, padTop: 48, padBot: 44,
      az: spec.az === undefined ? -42 : spec.az, el: spec.el === undefined ? 26 : spec.el
    });
    fit.addPt([[0, 0, 0], [W, 0, 0], [0, D, 0], [W, D, 0], [0, 0, totalH], [W, 0, totalH], [0, D, totalH], [W, D, totalH]]);
    var cam = fit.cam();
    var s = frame(w, h, spec.bg);
    s += cap(w, '图 4', spec.title || '层状 / 界面结构 3D 示意', spec.note || '');
    var z = 0;
    /* 层序：数组给出的是"从表层到本体"的语义顺序；绘制时从顶到底，
       因此按 z 递减堆叠（最高层 = 表层）。 */
    var ordered = layers.slice();
    var totalTh = ordered.reduce(function (s2, ly) { return s2 + (ly.th || TH); }, 0);
    var zTop = totalTh;
    ordered.forEach(function (ly) {
      var z1 = zTop, z0 = zTop - (ly.th || TH);
      zTop = z0;
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
      /* 层标注：从该层前面的左缘引出短引线，文字贴在左侧（不互相叠压） */
      var lp = c(0, D, (z0 + z1) / 2);
      s += L(lp.X - 12, lp.Y, lp.X - 4, lp.Y, { c: col, w: 1.2 });
      s += T(lp.X - 16, lp.Y + 4, ly.t, { size: 9, anchor: 'end', fill: '#4A535C', weight: 600 });
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
    makeCam: makeCam, autoFit: autoFit, T: T, L: L, P: P, Circ: Circ, frame: frame, cap: cap
  };
})();
