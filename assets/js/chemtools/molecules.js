/* 分子库 + Canvas 3D 球棍模型渲染引擎（自研透视投影，零依赖） */
(function () {
  'use strict';

  var COLORS = {
    H: '#c9c9d4', C: '#3f3f46', N: '#2f6fd0', O: '#e5484d', F: '#2fbf6a',
    Cl: '#2f9e44', S: '#d9a411', B: '#d0712f', P: '#c98a2e', Na: '#8a63d2',
    Fe: '#b06b3a', Ca: '#5d9a4b', K: '#a87dd6', Mn: '#a3525c'
  };
  var RADII = {
    H: 0.34, C: 0.72, N: 0.66, O: 0.62, F: 0.56, Cl: 0.88, S: 0.86,
    B: 0.66, P: 0.78, Na: 1.02, Fe: 0.90, Ca: 0.98,
    K: 1.05, Mn: 0.78
  };

  function norm(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function tetra(i) {
    var d = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]][i];
    return norm(d);
  }
  function diatomic(el1, el2, len, order, noteName) {
    return {
      atoms: [[el1, 0, 0, 0], [el2, len, 0, 0]],
      bonds: [[0, 1, order]]
    };
  }
  function ring(els, r, hydride, bondOrder) {
    var atoms = [], bonds = [];
    for (var i = 0; i < els.length; i++) {
      var a = i * Math.PI * 2 / els.length;
      atoms.push([els[i], r * Math.cos(a), r * Math.sin(a), 0]);
      if (hydride) atoms.push([hydride, (r + 1.09) * Math.cos(a), (r + 1.09) * Math.sin(a), 0]);
    }
    for (var j = 0; j < els.length; j++) {
      bonds.push([j, (j + 1) % els.length, bondOrder]);
      if (hydride) bonds.push([j, els.length + j, 1]);
    }
    return { atoms: atoms, bonds: bonds };
  }

  var MOLECULES = [
    { id: 'h2o', name: '水', formula: 'H2O', geometry: 'V 形（弯曲）',
      note: '键角 104.5°。氧的两个孤对电子挤压 H-O-H 夹角，使其小于正四面体的 109.5°。水是极性分子，分子间可形成氢键。',
      atoms: [['O', 0, 0, 0], ['H', 0.759, 0, 0.588], ['H', -0.759, 0, 0.588]],
      bonds: [[0, 1, 1], [0, 2, 1]] },

    { id: 'co2', name: '二氧化碳', formula: 'CO2', geometry: '直线形',
      note: '碳原子以两个 C=O 双键与氧相连，sp 杂化，键角 180°。常温常压下是温室气体，固态称干冰。',
      atoms: [['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]],
      bonds: [[0, 1, 2], [0, 2, 2]] },

    { id: 'so2', name: '二氧化硫', formula: 'SO2', geometry: 'V 形（弯曲）',
      note: '键角约 119°，硫原子带一对孤对电子。硫的化合价为 +4，是大气污染物之一，可被进一步氧化为 SO3。',
      atoms: [['S', 0, 0, 0], ['O', 1.231, 0, 0.726], ['O', -1.231, 0, 0.726]],
      bonds: [[0, 1, 2], [0, 2, 2]] },

    { id: 'ch4', name: '甲烷', formula: 'CH4', geometry: '正四面体',
      note: 'sp³ 杂化，键角 109.5°。天然气主要成分，燃烧产物为 CO2 与 H2O，是最简单的有机物。',
      atoms: (function () { var H = [0, 1, 2, 3].map(function (i) { return ['H', tetra(i)[0] * 1.09, tetra(i)[1] * 1.09, tetra(i)[2] * 1.09]; }); return [['C', 0, 0, 0]].concat(H); })(),
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },

    { id: 'ccl4', name: '四氯化碳', formula: 'CCl4', geometry: '正四面体',
      note: 'sp³ 杂化，键角 109.5°。曾广泛用作溶剂与灭火剂，因破坏臭氧层现已被限制使用。',
      atoms: (function () { var C = [0, 1, 2, 3].map(function (i) { return ['Cl', tetra(i)[0] * 1.77, tetra(i)[1] * 1.77, tetra(i)[2] * 1.77]; }); return [['C', 0, 0, 0]].concat(C); })(),
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },

    { id: 'nh3', name: '氨气', formula: 'NH3', geometry: '三角锥形',
      note: '键角约 107°，氮原子带一对孤对电子。氨极易溶于水，是合成化肥的重要原料（哈伯法）。',
      atoms: [['N', 0, 0, 0], ['H', 0.937, 0, 0.376], ['H', -0.469, 0.812, 0.376], ['H', -0.469, -0.812, 0.376]],
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },

    { id: 'bf3', name: '三氟化硼', formula: 'BF3', geometry: '平面三角形',
      note: 'sp² 杂化，键角 120°。硼缺电子（只有 6 个价电子），是典型的 Lewis 酸，可接受孤对电子。',
      atoms: [['B', 0, 0, 0], ['F', 1.31, 0, 0], ['F', -0.655, 1.134, 0], ['F', -0.655, -1.134, 0]],
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },

    { id: 'sf6', name: '六氟化硫', formula: 'SF6', geometry: '正八面体',
      note: 'sp³d² 杂化，键角 90°。硫的化合价为 +6，该气体化学性质极稳定，常用作高压电气设备的绝缘气体。',
      atoms: [['S', 0, 0, 0], ['F', 1.56, 0, 0], ['F', -1.56, 0, 0], ['F', 0, 1.56, 0], ['F', 0, -1.56, 0], ['F', 0, 0, 1.56], ['F', 0, 0, -1.56]],
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1]] },

    { id: 'hcn', name: '氢氰酸', formula: 'HCN', geometry: '直线形',
      note: '碳原子以单键连氢、三键连氮（H-C≡N）。剧毒，但工业上是合成腈类、农药的重要原料。',
      atoms: [['C', 0, 0, 0], ['H', -1.06, 0, 0], ['N', 1.15, 0, 0]],
      bonds: [[0, 1, 1], [0, 2, 3]] },

    { id: 'c2h2', name: '乙炔', formula: 'C2H2', geometry: '直线形',
      note: '碳碳三键（H-C≡C-H），sp 杂化，键角 180°。氧炔焰温度可达 3000 °C 以上，用于焊接与切割金属。',
      atoms: [['C', 0, 0, 0], ['C', 1.20, 0, 0], ['H', -1.06, 0, 0], ['H', 2.26, 0, 0]],
      bonds: [[0, 1, 3], [0, 2, 1], [1, 3, 1]] },

    { id: 'c2h4', name: '乙烯', formula: 'C2H4', geometry: '平面形',
      note: '碳碳双键，sp² 杂化，键角约 120°。最简单的烯烃，是聚乙烯塑料的单体，也能催熟水果。',
      atoms: [['C', 0, 0, 0], ['C', 1.34, 0, 0],
        ['H', -0.571, 0.929, 0], ['H', -0.571, -0.929, 0],
        ['H', 1.911, 0.929, 0], ['H', 1.911, -0.929, 0]],
      bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]] },

    { id: 'c2h5oh', name: '乙醇', formula: 'C2H5OH', geometry: '四面体片段组合',
      note: 'CH3-CH2-OH。羟基（-OH）使其能与水任意比例互溶，是常见的燃料、溶剂与消毒剂。',
      atoms: [['C', 0, 0, 0], ['C', 1.54, 0, 0], ['O', 2.018, 1.348, 0],
        ['H', 0.363, 1.028, 0], ['H', 0.363, -0.890, -0.514], ['H', 0.363, -0.890, 0.514],
        ['H', 1.903, -0.927, -0.172], ['H', 1.903, 0.611, -0.719], ['H', 1.058, 1.348, 0]],
      bonds: [[0, 1, 1], [1, 2, 1], [2, 8, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1]] },

    { id: 'c6h6', name: '苯', formula: 'C6H6', geometry: '平面正六边形',
      note: '六个碳原子构成平面六元环，π 电子离域形成大 π 键（用半键表示）。苯环结构是芳香族化合物的核心。',
      atoms: ring(['C', 'C', 'C', 'C', 'C', 'C'], 1.40, 'H', 1.5).atoms,
      bonds: ring(['C', 'C', 'C', 'C', 'C', 'C'], 1.40, 'H', 1.5).bonds },

    { id: 'nacl', name: '氯化钠晶体', formula: 'NaCl', geometry: '面心立方晶格',
      note: 'Na⁺ 与 Cl⁻ 按 1:1 交替排列成岩盐结构。每个离子被 6 个异号离子包围（配位数 6）。',
      atoms: (function () {
        var atoms = [], sp = 2.82, n = 2;
        for (var i = 0; i <= n; i++) for (var j = 0; j <= n; j++) for (var k = 0; k <= n; k++) {
          var el = (i + j + k) % 2 === 0 ? 'Cl' : 'Na';
          atoms.push([el, (i - 1) * sp, (j - 1) * sp, (k - 1) * sp]);
        }
        return atoms;
      })(),
      bonds: (function () {
        var sp = 2.82, n = 2, bonds = [];
        var isNa = function (i, j, k) { return (i + j + k) % 2 === 1; };
        for (var i = 0; i <= n; i++) for (var j = 0; j <= n; j++) for (var k = 0; k <= n; k++) {
          if (!isNa(i, j, k)) continue;
          var idx = i * 9 + j * 3 + k;
          var nb = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
          for (var d = 0; d < nb.length; d++) {
            var ni = i + nb[d][0], nj = j + nb[d][1], nk = k + nb[d][2];
            if (ni < 0 || ni > n || nj < 0 || nj > n || nk < 0 || nk > n) continue;
            bonds.push([idx, ni * 9 + nj * 3 + nk, 1]);
          }
        }
        return bonds;
      })() },

    { id: 'h2', name: '氢气', formula: 'H2', geometry: '直线形（双原子分子）',
      note: '最轻的气体，H-H 键长 74 pm。工业上由水煤气或电解水制得，是可再生能源的重要载体。',
      atoms: [['H', 0, 0, 0], ['H', 0.74, 0, 0]], bonds: [[0, 1, 1]] },

    { id: 'o2', name: '氧气', formula: 'O2', geometry: '直线形（双原子分子）',
      note: 'O=O 双键，键长 121 pm。空气中体积占比约 21%，是绝大多数生物的呼吸所需。',
      atoms: [['O', 0, 0, 0], ['O', 1.21, 0, 0]], bonds: [[0, 1, 2]] },

    { id: 'n2', name: '氮气', formula: 'N2', geometry: '直线形（双原子分子）',
      note: 'N≡N 三键键能高达 946 kJ/mol，极稳定。空气中含量约 78%，工业上用于合成氨与作保护气。',
      atoms: [['N', 0, 0, 0], ['N', 1.10, 0, 0]], bonds: [[0, 1, 3]] },

    { id: 'cl2', name: '氯气', formula: 'Cl2', geometry: '直线形（双原子分子）',
      note: '黄绿色有毒气体，Cl-Cl 键长 199 pm。溶于水生成次氯酸，具有漂白与消毒作用。',
      atoms: [['Cl', 0, 0, 0], ['Cl', 1.99, 0, 0]], bonds: [[0, 1, 1]] },

    { id: 'hcl', name: '氯化氢', formula: 'HCl', geometry: '直线形（双原子分子）',
      note: 'H-Cl 键长 127 pm，强极性共价键。水溶液即盐酸，是实验室与工业中最常用的强酸之一。',
      atoms: [['H', 0, 0, 0], ['Cl', 1.27, 0, 0]], bonds: [[0, 1, 1]] },

    { id: 'co', name: '一氧化碳', formula: 'CO', geometry: '直线形（双原子分子）',
      note: 'C≡O 三键，键长 113 pm。无色无味但剧毒（与血红蛋白结合力远强于氧气），也是重要的工业还原剂。',
      atoms: [['C', 0, 0, 0], ['O', 1.13, 0, 0]], bonds: [[0, 1, 3]] },

    { id: 'kmno4', name: '高锰酸钾', formula: 'KMnO4', geometry: '四面体（MnO4⁻）+ K⁺ 离子对',
      note: '锰原子与四个氧构成 MnO4⁻ 正四面体，钾离子作为反离子。这是常见的强氧化剂，水溶液呈紫色。',
      atoms: (function () {
        var Os = [0, 1, 2, 3].map(function (i) {
          var d = tetra(i);
          return ['O', d[0] * 1.59, d[1] * 1.59, d[2] * 1.59];
        });
        return [['Mn', 0, 0, 0], ['K', 0, 0, -2.6]].concat(Os);
      })(),
      bonds: [[0, 2, 1.5], [0, 3, 1.5], [0, 4, 1.5], [0, 5, 1.5]] },

    { id: 'kcl', name: '氯化钾', formula: 'KCl', geometry: '离子对',
      note: '离子化合物，白色结晶，溶于水。生理盐水之外的常见补钾药物，工业上用作钾肥。',
      atoms: [['K', -1.4, 0, 0], ['Cl', 1.4, 0, 0]], bonds: [[0, 1, 1]] },

    { id: 'mncl2', name: '氯化锰', formula: 'MnCl2', geometry: 'V 形（弯曲）',
      note: 'Mn²⁺ 与两个 Cl⁻ 构成 V 形结构。淡粉色结晶，水合盐 MnCl2·4H2O 更为常见。',
      atoms: [['Mn', 0, 0, 0], ['Cl', 1.4, 0, 1.4], ['Cl', -1.4, 0, 1.4]], bonds: [[0, 1, 1], [0, 2, 1]] }
  ];

  /* ---------------- 渲染引擎 ---------------- */
  function MolViewer(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    var empty = document.getElementById('mol-empty');
    if (empty) empty.hidden = !!ctx;
    if (!ctx) return;

    var mol = null;
    var rotX = 0.35, rotY = 0.6, zoom = 1;
    var spin = true, labels = true;
    var dragging = false, lastX = 0, lastY = 0;
    var running = true;

    var W = canvas.width, H = canvas.height;

    function build(m) {
      var maxR = 0;
      m.atoms.forEach(function (a) {
        var r = Math.sqrt(a[1] * a[1] + a[2] * a[2] + a[3] * a[3]) + (RADII[a[0]] || 0.5);
        if (r > maxR) maxR = r;
      });
      m._scale = (Math.min(W, H) * 0.40) / maxR;
    }

    function setMol(id) {
      var m = null;
      for (var i = 0; i < MOLECULES.length; i++) if (MOLECULES[i].id === id) { m = MOLECULES[i]; break; }
      if (!m) return;
      mol = m;
      if (!mol._scale) build(mol);
      rotX = 0.35; rotY = 0.6; zoom = 1;
      draw();
      return mol;
    }

    function rotate(x, y, z) {
      var cy = Math.cos(rotY), sy = Math.sin(rotY);
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var cx = Math.cos(rotX), sx = Math.sin(rotX);
      var y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      return [x1, y1, z2];
    }

    function draw() {
      if (!mol || !ctx) return;
      ctx.clearRect(0, 0, W, H);
      var s = mol._scale * zoom;
      var cx = W / 2, cy = H / 2;
      var proj = mol.atoms.map(function (a, i) {
        var r = rotate(a[1], a[2], a[3]);
        var k = 1 / (1 + r[2] * 0.10);
        return { i: i, el: a[0], x: cx + r[0] * s * k, y: cy - r[1] * s * k, z: r[2], k: k };
      });

      /* 键：按深度排序，先画远的 */
      var bonds = mol.bonds.map(function (b) {
        var p1 = proj[b[0]], p2 = proj[b[1]];
        return { p1: p1, p2: p2, order: b[2], z: (p1.z + p2.z) / 2, k: (p1.k + p2.k) / 2 };
      }).sort(function (a, b) { return b.z - a.z; });

      ctx.lineCap = 'round';
      bonds.forEach(function (b) {
        var w = 3.2 * b.k;
        ctx.strokeStyle = '#9aa7b8';
        ctx.lineWidth = w;
        var dx = b.p2.x - b.p1.x, dy = b.p2.y - b.p1.y;
        var L = Math.sqrt(dx * dx + dy * dy) || 1;
        var px = -dy / L, py = dx / L;
        var off = w * 0.9;
        if (b.order >= 2) {
          ctx.beginPath(); ctx.moveTo(b.p1.x + px * off, b.p1.y + py * off);
          ctx.lineTo(b.p2.x + px * off, b.p2.y + py * off); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b.p1.x - px * off, b.p1.y - py * off);
          ctx.lineTo(b.p2.x - px * off, b.p2.y - py * off); ctx.stroke();
        }
        if (b.order === 3) {
          ctx.beginPath(); ctx.moveTo(b.p1.x, b.p1.y); ctx.lineTo(b.p2.x, b.p2.y); ctx.stroke();
        }
        if (b.order === 1 || b.order === 1.5) {
          ctx.beginPath(); ctx.moveTo(b.p1.x, b.p1.y); ctx.lineTo(b.p2.x, b.p2.y); ctx.stroke();
        }
      });

      /* 原子：按深度排序，先画远的 */
      var sorted = proj.slice().sort(function (a, b) { return b.z - a.z; });
      sorted.forEach(function (p) {
        var r = Math.max(2.5, (RADII[p.el] || 0.5) * s * p.k);
        var base = COLORS[p.el] || '#999';
        var g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.45, base);
        g.addColorStop(1, shade(base, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (labels && r > 5) {
          var fs = Math.max(9, Math.round(12 * p.k));
          ctx.font = fs + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.strokeText(p.el, p.x, p.y - r - 2);
          ctx.fillStyle = '#333';
          ctx.fillText(p.el, p.x, p.y - r - 2);
        }
      });
    }

    function shade(hex, amt) {
      var n = parseInt(hex.slice(1), 16);
      var r = Math.max(0, Math.min(255, (n >> 16) + 255 * amt));
      var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + 255 * amt));
      var b = Math.max(0, Math.min(255, (n & 255) + 255 * amt));
      return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    }

    /* 交互 */
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      rotY += (e.clientX - lastX) * 0.01;
      rotX += (e.clientY - lastY) * 0.01;
      lastX = e.clientX; lastY = e.clientY;
      draw();
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom = Math.max(0.6, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      draw();
    }, { passive: false });

    (function loop() {
      if (!running) return;
      if (spin && !dragging) { rotY += 0.006; draw(); }
      requestAnimationFrame(loop);
    })();

    this.setMol = setMol;
    this.toggleSpin = function () { spin = !spin; return spin; };
    this.toggleLabels = function () { labels = !labels; draw(); return labels; };
    this.resetView = function () { rotX = 0.35; rotY = 0.6; zoom = 1; draw(); };
    this.download = function () {
      try {
        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = (mol ? mol.id : 'molecule') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      } catch (e) { return false; }
    };
    this.getMol = function () { return mol; };
    this.destroy = function () { running = false; };
  }

  window.Mol = { MOLECULES: MOLECULES, MolViewer: MolViewer };
})();
