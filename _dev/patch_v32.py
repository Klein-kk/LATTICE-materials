import io

# ============ 1) index.html：注册 figures3.js ============
H = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\index.html'
h = open(H, encoding='utf-8').read()
old = '<script src="assets/js/figures2.js"></script>'
new = '<script src="assets/js/figures2.js"></script>\n<script src="assets/js/figures3.js"></script>'
assert old in h and 'figures3.js' not in h
h = h.replace(old, new)
open(H, 'w', encoding='utf-8').write(h)
print('index.html: figures3.js registered')

# ============ 2) app.js：配色改为期刊色板 ============
A = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\app.js'
a = open(A, encoding='utf-8').read()

old2 = """MR.stylePresets = {
  sci:    { line: 1.5, marker: 3.4, grid: 0, font: 10, bg: '#FFFFFF', palette: { fiber: '#7C7C7C', sub: '#0072B2', oxi: '#D55E00', link: '#332288', anti: '#CC3311', ros: '#882255', bacteria: '#117733' } },
  origin: { line: 1.2, marker: 3.0, grid: 1, font: 10, bg: '#FFFFFF', palette: { fiber: '#8B8F94', sub: '#0E5C56', oxi: '#B4761F', link: '#2C4A7C', anti: '#9B382A', ros: '#6B4E7A', bacteria: '#2E6A45' } },
  ppt:    { line: 2.2, marker: 4.2, grid: 1, font: 12, bg: '#FFFFFF', palette: { fiber: '#9AA0A6', sub: '#14807A', oxi: '#D18A22', link: '#3E62A8', anti: '#C24A38', ros: '#8A6BA8', bacteria: '#3D8A5C' } }
};"""
new2 = """/* 图表风格 = 期刊制图预设：颜色取自各期刊常用色板，线宽/标记/网格按该刊惯例 */
MR.stylePresets = {
  sci:    { t: 'Nature / NPG', line: 1.1, marker: 3.2, grid: 0, font: 9.5, bg: '#FFFFFF', journal: 'NPG（Nature 系列）· 单栏最小字号 5 pt · 600 dpi',
            palette: { fiber: '#7C7C7C', sub: '#E64B35', oxi: '#4DBBD5', link: '#3C5488', anti: '#00A087', ros: '#F39B7F', bacteria: '#8491B4' } },
  okabe:  { t: 'Okabe–Ito（色盲安全）', line: 1.2, marker: 3.4, grid: 0, font: 10, bg: '#FFFFFF', journal: '色盲安全金标准 · 主流期刊投稿首选',
            palette: { fiber: '#666666', sub: '#0072B2', oxi: '#E69F00', link: '#56B4E9', anti: '#009E73', ros: '#CC79A7', bacteria: '#D55E00' } },
  origin: { t: 'Origin 默认', line: 1.2, marker: 3.0, grid: 1, font: 10, bg: '#FFFFFF', journal: 'Origin 默认风格 · 便于与你在 Origin 中排版的图统一',
            palette: { fiber: '#8B8F94', sub: '#0E5C56', oxi: '#B4761F', link: '#2C4A7C', anti: '#9B382A', ros: '#6B4E7A', bacteria: '#2E6A45' } },
  glm:    { t: 'GLM 莫兰迪', line: 1.3, marker: 3.2, grid: 1, font: 10.5, bg: '#FFFFFF', journal: '低饱和素雅 · 综述与演示友好',
            palette: { fiber: '#7F8C8D', sub: '#6C8EBF', oxi: '#D6B656', link: '#4A6B8A', anti: '#82B366', ros: '#9673A6', bacteria: '#B85450' } }
};
MR.JOURNAL_PALETTES = function () { return (MR.sci && MR.sci.PALETTES) || {}; };"""
assert old2 in a, 'stylePresets anchor'
a = a.replace(old2, new2)

# Sci 风格默认值同步
a = a.replace("MR.state.figStyle = 'origin';", "MR.state.figStyle = 'okabe';")
a = a.replace("figStyle: 'origin',", "figStyle: 'okabe',")
# scoped 字符串引用替换（Tweaks 文案）
a = a.replace("{ sci: 'SCI 期刊', origin: 'Origin', ppt: '演示' }[v]", "{ sci: 'Nature/NPG', okabe: 'Okabe–Ito', origin: 'Origin', glm: '莫兰迪' }[v] || v")
open(A, 'w', encoding='utf-8').write(a)
print('app.js: journal palettes wired')

# ============ 3) views2-stages.js：环节 04 增加 3D 图与 SCI 手册 ============
V = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\views2-stages.js'
v = open(V, encoding='utf-8').read()

# 3.1 在图形区之后插入 3D 与手册
anchor = """      if (!has.xrd && !has.ftir && !has.sem) html += MR.note('原文未报告 XRD / FTIR / SEM 等表征数据，因此不生成对应的谱图 —— 谱图必须来自真实数据。', 'sig', 'review1');
      return html;"""
add = """      if (!has.xrd && !has.ftir && !has.sem) html += MR.note('原文未报告 XRD / FTIR / SEM 等表征数据，因此不生成对应的谱图 —— 谱图必须来自真实数据。', 'sig', 'review1');

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
      return html;"""
assert anchor in v, 'stage04 anchor'
v = v.replace(anchor, add)

# 3.2 mount 中绘制 3D 图与分子图
anchor2 = """      MR.buildColorInputs(host, MR.colorMeta.map(function (c) { return c.k; }));
      bindFig(host);
      void an;
    }
  };"""
add2 = """      /* ---- 3D 图 ---- */
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
        var m3 = (MR.state.rawText || '').match(/a\s*[=＝]\s*([\d.]{3,7})\s*(?:Å|nm)?[^\n]{0,30}?c\s*[=＝]\s*([\d.]{3,7})/i);
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
  };"""
assert anchor2 in v, 'mount anchor'
v = v.replace(anchor2, add2)
open(V, 'w', encoding='utf-8').write(v)
print('views2-stages.js: 3D figures + SCI playbook wired')
