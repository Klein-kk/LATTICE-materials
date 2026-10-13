/* 3D 反应动画：反应物 → 生成物，连续循环播放
   复用 Mol.MOLECULES 已知结构，未知分子用通用球模型生成 */
(function () {
  'use strict';

  var COLORS = {
    H: '#c9c9d4', C: '#3f3f46', N: '#2f6fd0', O: '#e5484d', F: '#2fbf6a',
    Cl: '#2f9e44', S: '#d9a411', B: '#d0712f', P: '#c98a2e', Na: '#8a63d2',
    Fe: '#b06b3a', Ca: '#5d9a4b', K: '#a87dd6', Mn: '#a3525c'
  };
  var RADII = {
    H: 0.40, C: 0.55, N: 0.52, O: 0.50, F: 0.45, Cl: 0.62, S: 0.58,
    B: 0.52, P: 0.55, Na: 0.65, Fe: 0.60, Ca: 0.62, K: 0.68, Mn: 0.55
  };

  /* 复用 Mol.MOLECULES，未匹配时用通用构造 */
  function lookup(formula) {
    if (window.Mol && window.Mol.MOLECULES) {
      var clean = formula.toLowerCase().replace(/\s/g, '').replace(/[₀-₉]/g, function (m) {
        return String.fromCharCode(m.charCodeAt(0) - 0x2080 + 0x30);
      });
      for (var k = 0; k < Mol.MOLECULES.length; k++) {
        var m = Mol.MOLECULES[k];
        if (m.id === clean) return m;
        if (m.formula.replace(/\s/g, '').toLowerCase() === clean) return m;
      }
    }
    return buildGeneric(formula);
  }

  function buildGeneric(formula) {
    var parsed = window.Chem && window.Chem.parseFormula(formula);
    if (!parsed || parsed.error) return null;
    var atoms = [];
    Object.keys(parsed.elements).forEach(function (el) {
      for (var i = 0; i < parsed.elements[el]; i++) atoms.push(el);
    });
    var n = atoms.length;
    var coords = [];
    if (n === 1) coords = [[0, 0, 0]];
    else if (n === 2) coords = [[-0.55, 0, 0], [0.55, 0, 0]];
    else {
      var phi = (1 + Math.sqrt(5)) / 2;
      for (var i = 0; i < n; i++) {
        var y = 1 - (n > 1 ? (i / (n - 1)) * 2 : 0);
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var theta = 2 * Math.PI * i / phi;
        coords.push([0.7 * r * Math.cos(theta), 0.7 * y, 0.7 * r * Math.sin(theta)]);
      }
    }
    var atomsArr = atoms.map(function (el, i) { return [el, coords[i][0], coords[i][1], coords[i][2]]; });
    var bonds = [];
    for (var j = 1; j < n && j < 5; j++) bonds.push([0, j, 1]);
    return { atoms: atomsArr, bonds: bonds, scale: 1.0, generic: true };
  }

  function autoScale(m) {
    var maxR = 0.01;
    m.atoms.forEach(function (a) {
      var r = Math.sqrt(a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
      if (r > maxR) maxR = r;
    });
    var target = 0.8;
    return target / maxR * (m.scale || 1);
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + 255 * amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + 255 * amt));
    var b = Math.max(0, Math.min(255, (n & 255) + 255 * amt));
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  function ReactionViewer(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    var empty = document.getElementById('reaction-empty');
    if (empty) empty.hidden = !!ctx;
    if (!ctx) return;

    var W = canvas.width, H = canvas.height;
    var scene = { mols: [], particles: [], t0: 0 };
    var running = true;
    var broken = false;

    /* 安全渐变：老/精简 Canvas 可能返回 null 或抛错，回退纯色 */
    function safeGrad(x1, y1, r1, x2, y2, r2, base) {
      try {
        var g = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
        if (g) {
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.45, base);
          g.addColorStop(1, shade(base, -0.35));
          return g;
        }
      } catch (e) { /* fall through */ }
      return base;
    }

    function showFallback(reason) {
      try {
        ctx.fillStyle = '#f4f6f8';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#8a939c';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('3D 反应动画暂不可用', W / 2, H / 2 - 10);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#a3acb6';
        ctx.fillText(reason || '请使用最新版 Chrome / Edge / Firefox / Safari', W / 2, H / 2 + 12);
      } catch (e) { /* 完全无法绘制也无所谓 */ }
    }

    function setReaction(balanced) {
      scene.mols = [];
      scene.particles = [];
      scene.t0 = performance.now();

      var leftItems = balanced.left.slice().sort(function (a, b) { return b.coef - a.coef; });
      var rightItems = balanced.right.slice().sort(function (a, b) { return b.coef - a.coef; });

      function place(items, side) {
        var n = items.length;
        var xBase = side === 'left' ? -2.6 : 2.6;
        var spacing = 1.2;
        var startY = -(n - 1) * spacing / 2;
        items.slice(0, 3).forEach(function (it, i) {
          var data = lookup(it.formula);
          if (!data) return;
          /* 按系数绘制多个分子副本，直观体现"个数"（上限 3） */
          var copies = it.coef <= 1 ? 1 : Math.max(1, Math.min(3, Math.round(it.coef / 3)));
          for (var c = 0; c < copies; c++) {
            scene.mols.push({
              atoms: data.atoms,
              bonds: data.bonds,
              generic: !!data.generic,
              pos: [
                xBase + (Math.random() - 0.5) * 0.15 + (c % 2 === 0 ? -0.16 : 0.16),
                startY + i * spacing + (c - (copies - 1) / 2) * 0.34,
                (Math.random() - 0.5) * 0.4 + (c - (copies - 1) / 2) * 0.45
              ],
              scale: autoScale(data) * 0.65,
              rotPhase: Math.random() * Math.PI * 2,
              rotSpeed: 0.35 + Math.random() * 0.2,
              label: it.formula,
              coef: it.coef,
              showCoef: c === 0
            });
          }
        });
      }
      place(leftItems, 'left');
      place(rightItems, 'right');

      /* 粒子流：颜色按反应物与生成物中的元素加权 */
      var allEls = {};
      leftItems.concat(rightItems).forEach(function (it) {
        var p = window.Chem && window.Chem.parseFormula(it.formula);
        if (!p || p.error) return;
        Object.keys(p.elements).forEach(function (el) {
          allEls[el] = (allEls[el] || 0) + p.elements[el] * it.coef;
        });
      });
      var pool = [];
      Object.keys(allEls).forEach(function (el) {
        var weight = Math.min(8, Math.round(allEls[el] / 2));
        for (var w = 0; w < weight; w++) pool.push(el);
      });
      for (var p = 0; p < 60; p++) {
        var el = pool[Math.floor(Math.random() * pool.length)];
        scene.particles.push({
          el: el,
          x: -3 + Math.random() * 0.3,
          y: (Math.random() - 0.5) * 2.5,
          z: (Math.random() - 0.5) * 1.2,
          vx: 0.55 + Math.random() * 0.4,
          vy: (Math.random() - 0.5) * 0.2,
          phase: Math.random() * Math.PI * 2,
          size: 1.6 + Math.random() * 2.6
        });
      }
    }

    function frame() {
      if (!running || broken) return;
      var t = (performance.now() - scene.t0) / 1000;

      scene.particles.forEach(function (p) {
        p.x += p.vx * 0.016;
        p.y += Math.sin(t * 1.5 + p.phase) * 0.008;
        if (p.x > 3) {
          p.x = -3;
          p.y = (Math.random() - 0.5) * 2.5;
        }
      });
      scene.mols.forEach(function (m) { m.rot = t * m.rotSpeed + m.rotPhase; });

      try {
        draw(t);
      } catch (e) {
        /* Canvas 操作失败：停止循环，渲染静态降级提示 */
        broken = true;
        running = false;
        showFallback('Canvas 渲染失败');
        return;
      }
      requestAnimationFrame(frame);
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);

      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#fafbfc');
      bg.addColorStop(1, '#e9eef3');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* 中线（反应分隔） */
      ctx.strokeStyle = 'rgba(20,60,120,0.08)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2, 30);
      ctx.lineTo(W / 2, H - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      var cx = W / 2, cy = H / 2;
      var s = 60;
      var fov = 0.10;

      var items = [];
      var coefLabels = [];

      scene.mols.forEach(function (m) {
        if (m.showCoef) {
          var lk = 1 / (1 + m.pos[2] * fov);
          coefLabels.push({
            x: cx + m.pos[0] * s * lk,
            y: cy - m.pos[1] * s * lk,
            text: '×' + m.coef
          });
        }
        var r = m.rot, cosR = Math.cos(r), sinR = Math.sin(r);
        var local = m.atoms.map(function (a) {
          var lx = a[1] * m.scale, ly = a[2] * m.scale, lz = a[3] * m.scale;
          var rx = lx * cosR - lz * sinR;
          var rz = lx * sinR + lz * cosR;
          return [a[0], m.pos[0] + rx, m.pos[1] + ly, m.pos[2] + rz];
        });
        local.forEach(function (a) {
          var k = 1 / (1 + a[3] * fov);
          items.push({ type: 'atom', el: a[0], x: cx + a[1] * s * k, y: cy - a[2] * s * k, z: a[3], k: k });
        });
        m.bonds.forEach(function (b) {
          var a1 = local[b[0]], a2 = local[b[1]];
          var k1 = 1 / (1 + a1[3] * fov);
          var k2 = 1 / (1 + a2[3] * fov);
          items.push({
            type: 'bond',
            x1: cx + a1[1] * s * k1, y1: cy - a1[2] * s * k1, k1: k1,
            x2: cx + a2[1] * s * k2, y2: cy - a2[2] * s * k2, k2: k2,
            order: b[2],
            z: (a1[3] + a2[3]) / 2
          });
        });
      });

      scene.particles.forEach(function (p) {
        var k = 1 / (1 + p.z * fov);
        items.push({ type: 'particle', x: cx + p.x * s * k, y: cy - p.y * s * k, z: p.z, k: k, el: p.el, size: p.size });
      });

      items.sort(function (a, b) { return b.z - a.z; });

      items.forEach(function (it) {
        if (it.type === 'bond') {
          ctx.strokeStyle = '#9aa7b8';
          ctx.lineCap = 'round';
          ctx.lineWidth = 2.4 * ((it.k1 + it.k2) / 2);
          if (it.order >= 2) {
            var dx = it.x2 - it.x1, dy = it.y2 - it.y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
            var px = -dy / L, py = dx / L, off = ctx.lineWidth * 0.9;
            ctx.beginPath(); ctx.moveTo(it.x1 + px * off, it.y1 + py * off);
            ctx.lineTo(it.x2 + px * off, it.y2 + py * off); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(it.x1 - px * off, it.y1 - py * off);
            ctx.lineTo(it.x2 - px * off, it.y2 - py * off); ctx.stroke();
          }
          if (it.order !== 2) {
            ctx.beginPath(); ctx.moveTo(it.x1, it.y1); ctx.lineTo(it.x2, it.y2); ctx.stroke();
          }
        } else if (it.type === 'atom') {
          var color = COLORS[it.el] || '#888';
          var rr = Math.max(2.2, (RADII[it.el] || 0.5) * 28 * it.k);
          ctx.fillStyle = safeGrad(it.x - rr * 0.35, it.y - rr * 0.4, rr * 0.1, it.x, it.y, rr, color);
          ctx.beginPath(); ctx.arc(it.x, it.y, rr, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else if (it.type === 'particle') {
          var color = COLORS[it.el] || '#888';
          var pr = Math.max(1.2, it.size * it.k * 0.85);
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(it.x, it.y, pr, 0, Math.PI * 2); ctx.fill();
        }
      });

      /* 标签：反应物 / 生成物 */
      ctx.fillStyle = '#5f5e5a';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('反应物', W * 0.22, 22);
      ctx.fillText('生成物', W * 0.78, 22);
      ctx.fillStyle = '#c0392b';
      ctx.font = '700 22px sans-serif';
      ctx.fillText('→', W / 2, cy + 7);

      /* 分子个数徽标（最上层，永远可见） */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      coefLabels.forEach(function (lb) {
        ctx.font = '700 11px sans-serif';
        var tw = (ctx.measureText ? (ctx.measureText(lb.text).width || 14) : 14) + 10;
        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        roundRect(lb.x - tw / 2, lb.y - 26, tw, 15, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(217,164,17,0.85)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#8a5a0f';
        ctx.fillText(lb.text, lb.x, lb.y - 18);
      });
      ctx.textBaseline = 'alphabetic';
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    this.setReaction = setReaction;
    this.destroy = function () { running = false; };

    frame();
  }

  window.RxnViewer = ReactionViewer;
})();