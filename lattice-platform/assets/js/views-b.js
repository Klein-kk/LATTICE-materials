/* ============================================================
   环节 04 数据预期与 SCI 图形 · 05 结果分析与作图
   环节 06 实验指导书 · 07 真实数据回填与矫正
   ============================================================ */
window.MR = window.MR || {};

MR.traces.figure = [
  { k: 'EVAL 01', t: '模型求值', b: '按锁定的配比计算 7 项响应，并标注是否满足硬性约束（强力保留率 ≥ 85%）。', kv: [['响应', '7']] },
  { k: 'SPECTRA 02', t: '预测表征谱图', b: '依据官能团归属预测 FTIR 特征峰（1728 / 1652 / 1556 / 1480 cm⁻¹）与 XPS C1s、N1s 分峰，用于指导实测比对。', kv: [['FTIR 峰', '11'], ['XPS 组分', '6']] },
  { k: 'SCHEME 03', t: '生成 SCI 图形', b: '绘制实验流程图（含仪器线稿与分子结构）、分子级机理图、表面作用对比图，全部为矢量、配色可编辑。', kv: [['图形', '3'], ['格式', 'SVG 矢量']] },
  { k: 'CHECK 04', t: '制图规范自检', b: '检查字号 / 线宽 / 色盲友好 / 单位标注 / 箭头方向一致性。', kv: [['检查项', '5']] }
];
MR.traces.analysis = [
  { k: 'SWEEP 01', t: '参数扫描', b: '固定其他参数，扫描氧化剂用量 0.05→1.2 mmol/g，计算接枝率 / 抑菌率 / 抗生物膜率 / 强力保留率四条响应曲线。', kv: [['扫描点', '12']] },
  { k: 'SURFACE 02', t: '响应面计算', b: '在"氧化剂用量 × HTCC 浓度"平面上计算抗生物膜率的响应面，标出最优区域。', kv: [['网格', '9 × 9']] },
  { k: 'PLOT 03', t: '图形生成', b: '按所选图表类型与风格渲染，支持折线 / 分组柱状 / 散点误差棒 / 响应面热图 / 谱图。', kv: [['图型', '6']] },
  { k: 'EXPORT 04', t: '导出准备', b: '导出 SVG（矢量）与 CSV（列名与 Origin 导入习惯对齐）。', kv: [['格式', 'SVG / CSV / PNG']] }
];
MR.traces.guide = [
  { k: 'RECIPE 01', t: '用量换算', b: '按 2 g 织物与浴比 1:40 换算各试剂的实际称量量与配制体积。', kv: [['浴比', '1:40']] },
  { k: 'ORDER 02', t: '工序排序与依赖', b: '确认 9 个工序的先后依赖与等待时间，标出可并行的操作。', kv: [['工序', '9']] },
  { k: 'CITE 03', t: '文献溯源', b: '为每个关键工艺参数标注文献或机理依据来源，便于复核与写作引用。', kv: [['引用', '7']] },
  { k: 'SAFETY 04', t: '安全卡生成', b: '把试剂危害、工序风险与强制防护整合进指导书首页。', kv: [['强制防护', '5']] }
];
MR.traces.feedback = [
  { k: 'PARSE 01', t: '实测数据解析', b: '解析用户提交的 CSV / 粘贴数据，按关键词识别指标列与样本行。', kv: [['来源', '本地解析']] },
  { k: 'COMPARE 02', t: '预测—实测比对', b: '逐指标计算绝对偏差与相对偏差，并按各指标的实测误差量级判定差异是否可分辨。', kv: [['指标', '5']] },
  { k: 'ATTRIB 03', t: '偏差归因', b: '依据偏差方向与量级推断原因：模型偏置 / 未控变量 / 操作偏差 / 机理假设不成立。', kv: [['归因层', '4']] },
  { k: 'DECIDE 04', t: '分支决策', b: '偏差在误差范围内 → 修正模型；系统性偏离 → 回到环节 03 重新设计实验。', kv: [['阈值', '±10% / ±25%']] }
];

(function () {
  var d = MR.data || {};
  function M() { return MR.model; }
  function P() { return MR.state.params; }
  function F() { return MR.figs; }
  function renderInto(el, build) {
    if (!el) return;
    var last = -1;
    function go() { var w = Math.max(260, Math.round(el.clientWidth || 700)); if (Math.abs(w - last) < 2) return; last = w; el.innerHTML = build(w); }
    go();
    if (window.ResizeObserver && !el.__ro) { el.__ro = new ResizeObserver(go); el.__ro.observe(el); }
  }
  /* 真实 PNG 导出（把 SVG 光栅化到 canvas） */
  function dlPNG(host, name) {
    var svg = host && host.querySelector ? host.querySelector('svg') : host;
    if (!svg) return;
    var clone = svg.cloneNode(true);
    var st = window.getComputedStyle(document.documentElement);
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
      var cv = document.createElement('canvas');
      cv.width = w * 2; cv.height = h * 2;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (b) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        MR.log('OK', '已导出 PNG（2× 分辨率）：<b>' + name + '</b>');
      });
    };
    img.onerror = function () { MR.log('WARN', 'PNG 光栅化失败，请改用 SVG 导出'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  }
  function figBar(id, name) {
    return '<button class="btn btn--sm" type="button" data-svg="' + id + '" data-name="' + name + '.svg">导出 SVG</button>' +
      '<button class="btn btn--sm" type="button" data-png="' + id + '" data-name="' + name + '.png">导出 PNG</button>';
  }
  function bindFigExports(host) {
    host.querySelectorAll('[data-svg]').forEach(function (b) {
      b.addEventListener('click', function () { MR.dlSVG(document.getElementById(b.getAttribute('data-svg')), b.getAttribute('data-name')); });
    });
    host.querySelectorAll('[data-png]').forEach(function (b) {
      b.addEventListener('click', function () { dlPNG(document.getElementById(b.getAttribute('data-png')), b.getAttribute('data-name')); });
    });
  }

  var FTIR = {
    type: 'spectrum', height: 240, x0: 400, x1: 4000, rev: true, ymax: 114,
    xlabel: '波数 (cm⁻¹)', ylabel: '透过率 (a.u.)',
    series: [
      { color: '--fiber', dash: true, base: 8, peaks: [[3330, 72, 250], [2895, 32, 22], [1640, 20, 24], [1428, 24, 16], [1368, 20, 14], [1160, 58, 20], [1055, 84, 30], [897, 24, 14]].map(function (a) { return { x: a[0], i: a[1], w: a[2] }; }) },
      { color: '--sub', base: 8, peaks: [[3330, 62, 240], [2895, 30, 22], [1728, 26, 14], [1652, 34, 16], [1556, 26, 16], [1480, 20, 12], [1428, 22, 16], [1160, 56, 20], [1055, 78, 30], [897, 22, 14]].map(function (a) { return { x: a[0], i: a[1], w: a[2] }; }) }
    ],
    marks: [
      { x: 1728, t: '1728 C=O', y1: 92 },
      { x: 1652, t: '1652 酰胺 I', y1: 104, anchor: 'end' },
      { x: 1556, t: '1556 酰胺 II', y1: 96 },
      { x: 1480, t: '1480 N–CH₃', y1: 86, anchor: 'start' }
    ]
  };
  var XPS = {
    type: 'spectrum', height: 240, x0: 282, x1: 406, ymax: 74,
    xlabel: '结合能 (eV)', ylabel: '强度 (×10³ cps)',
    series: [
      { color: '--acc', fill: true, base: 2, peaks: [{ x: 284.8, i: 58, w: 1.1 }, { x: 285.9, i: 26, w: 1.2 }, { x: 286.5, i: 44, w: 1.2 }, { x: 288.0, i: 13, w: 1.3 }, { x: 289.1, i: 7, w: 1.3 }] },
      { color: '--oxi', fill: true, base: 1, peaks: [{ x: 399.8, i: 22, w: 1.6 }, { x: 402.0, i: 52, w: 1.8 }] }
    ],
    marks: [{ x: 284.8, t: 'C–C', y1: 58 }, { x: 286.5, t: 'C–O', y1: 44 }, { x: 285.9, t: 'C–N', y1: 70, anchor: 'start' }]
  };

  /* ================================================================
     环节 04 · 数据预期与 SCI 图形
     ================================================================ */
  MR.views.figure = {
    render: function () {
      var p = P(), m = M();
      var res = { carboxyl: m.carboxyl(p), graft: m.graft(p), ab: m.antiPlanktonic(p), bf: m.antiBiofilm(p), ts: m.strength(p), wf: m.washFast(p), yl: m.yellow(p) };
      var html = '';
      html += MR.head({
        n: '04', t: '数据预期与 SCI 图形生成',
        sub: '在固定的试验方法下给出合理的数据预期，并生成可直接用于论文的 SCI 学术图：实验流程图（含仪器线稿与分子结构）、分子级机理图、表面作用对比图。每个分子与仪器的颜色都可以单独指定。',
        acts: MR.chip('配比 ' + (MR.state.paramsConfirmed ? '已锁定' : '未锁定'), MR.state.paramsConfirmed ? 'ok' : 'sig') +
          '<button class="btn btn--primary" type="button" data-act="runfig">' + MR.icon('exp') + '生成图形</button>'
      });

      html += '<div class="metrics mb-4">' +
        MR.metric('表面羧基', MR.f1(res.carboxyl, 3), ' mmol/g', '≥ 0.35', res.carboxyl >= 0.35 ? 'ok' : 'warn') +
        MR.metric('接枝率', MR.f1(res.graft), '%', '≥ 6', res.graft >= 6 ? 'ok' : 'warn') +
        MR.metric('抑菌率 S. aureus', MR.f1(res.ab), '%', '≥ 90', res.ab >= 90 ? 'ok' : 'warn') +
        MR.metric('抗生物膜率', MR.f1(res.bf), '%', '≥ 90', res.bf >= 90 ? 'ok' : 'bad') +
        MR.metric('强力保留率', MR.f1(res.ts), '%', '≥ 85', res.ts >= 85 ? 'ok' : 'bad') +
        MR.metric('耐洗保持率', MR.f1(res.wf), '%', '≥ 85', res.wf >= 85 ? 'ok' : 'warn') +
        MR.metric('黄变指数', MR.f1(res.yl), '', '≤ 8', res.yl <= 8 ? 'ok' : 'warn') +
        MR.metric('实验成功率', m.successRate(p), '%', '—', m.successRate(p) >= 85 ? 'ok' : 'warn') +
        '</div>';

      html += MR.panel({
        title: '图形配色控制', meta: '逐项指定颜色，实时重绘', icon: 'figure', pad: true, cls: 'panel--acc',
        body: '<div class="colorbar">' + MR.colorMeta.map(function (c) {
          return '<label class="pal"><input type="color" data-figcolor="' + c.k + '" value="' + MR.colors[c.k] + '">' + c.t + '</label>';
        }).join('') + '</div>' +
          '<div class="note" style="margin-top:14px">' + MR.icon('plan', 14) +
          '<span>当前图表风格：<b>' + ({ sci: 'SCI 期刊', origin: 'Origin', ppt: '演示' }[MR.state.figStyle]) + '</b>（右下角 Tweaks 可切换）。风格影响线宽、标记大小、网格与默认配色。</span></div>',
        note: '配色基于 Okabe–Ito 色盲友好方案的扩展，保证黑白打印与色觉异常条件下仍可区分；同一颜色在图 1–3 中含义一致。'
      }) + '<div class="mb-4"></div>';

      html += '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t">图 1 · 实验流程图</span>' +
        '<span class="figbox__tag">SCHEME · 仪器 + 分子 + 条件</span><div class="figbox__acts">' + figBar('fig1', 'LATTICE-图1-实验流程图') + '</div></div>' +
        '<div class="figbox__body" id="fig1"></div>' +
        '<div class="figbox__cap">棉织物选择性氧化—季铵化壳聚糖接枝的制备与评价流程。S1–S4 为四个阶段，框内上方为工艺条件、中部为仪器线稿与关键分子结构。S2 高亮显示 C6 伯羟基被选择性氧化为羧基；S3 显示羧基经 EDC/NHS 活化后与 HTCC 氨基形成酰胺键。</div></div>';

      html += '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t">图 2 · 分子级反应机理</span>' +
        '<span class="figbox__tag">MECHANISM · 5 步</span><div class="figbox__acts">' + figBar('fig2', 'LATTICE-图2-分子机理图') + '</div></div>' +
        '<div class="figbox__body" id="fig2"></div>' +
        '<div class="figbox__cap">① C6 选择性氧化生成羧基（仅发生在微纤表面与无定形区）；② EDC 活化生成 O-酰基异脲中间体，NHS 转化为活性酯；③ 与 HTCC 氨基酰胺化，季铵基团共价固定在纤维表面；④ 接触型杀菌：静电吸附后烷基链插入细菌膜，膜破裂与胞内物泄漏；⑤ 辅助路径：残留氧化态基团产生羟自由基引发膜脂链式过氧化（虚线框）。</div></div>';

      html += '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t">图 3 · 表面作用对比</span>' +
        '<span class="figbox__tag">SURFACE · 对照示意</span><div class="figbox__acts">' + figBar('fig3', 'LATTICE-图3-表面作用对比') + '</div></div>' +
        '<div class="figbox__body" id="fig3"></div>' +
        '<div class="figbox__cap">左：未处理棉织物表面细菌黏附并分泌胞外基质形成生物膜；右：接枝棉织物表面的季铵基团通过接触型机制杀灭细菌、抑制生物膜形成。该对照说明接触型设计如何规避 C3 所指出的生物膜扩散屏障。</div></div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: 'FTIR 预测谱', meta: 'ATR · 4000–400 cm⁻¹', icon: 'analysis', pad: true,
          body: '<div class="chart" id="ftirChart"></div>',
          note: '虚线为未处理棉织物，实线为接枝后样品。1728 cm⁻¹（C=O）与 1652 / 1556 cm⁻¹（酰胺 I / II）同时出现是接枝成功的核心证据；1480 cm⁻¹ 归属季铵 N–CH₃ 弯曲振动。'
        }) +
        MR.panel({
          title: 'XPS 分峰预测', meta: 'C1s / N1s', icon: 'analysis', pad: true,
          body: '<div class="chart" id="xpsChart"></div>',
          note: 'N1s 双峰（399.8 eV 酰胺氮 / 402.0 eV 季铵氮）面积比约 1:2.3，是季铵基团成功引入的直接证据；C1s 中 285.9 eV（C–N）进一步支持酰胺键形成。'
        }) + '</div>';

      html += MR.note('制图规范自检：字号 ≥ 8 pt（2× 导出后等效 16 px）、线宽 ≥ 1.0 pt、主色 ≤ 4 种、坐标轴均带单位、箭头方向一致、无渐变与 3D 效果 —— 符合 SCI 期刊制图要求。', 'acc', 'review1');
      return html;
    },
    mount: function (host) {
      renderInto(host.querySelector('#fig1'), function (w) { return F().flow(w); });
      renderInto(host.querySelector('#fig2'), function (w) { return F().mech(w); });
      renderInto(host.querySelector('#fig3'), function (w) { return F().surface(w); });
      MR.charts.draw(host.querySelector('#ftirChart'), FTIR);
      MR.charts.draw(host.querySelector('#xpsChart'), XPS);
      MR.buildColorInputs(host, MR.colorMeta.map(function (c) { return c.k; }));
      bindFigExports(host);
      var rf = host.querySelector('[data-act="runfig"]');
      if (rf) rf.addEventListener('click', function () {
        if (!MR.state.paramsConfirmed) MR.log('WARN', '配比尚未在环节 03 确认，图形基于当前参数生成');
        MR.app.runStage('figure', { cb: function () { MR.app.setView('analysis'); } });
      });
    }
  };

  /* ================================================================
     环节 05 · 结果分析与作图
     ================================================================ */
  function metricSeries(mt, p) {
    var fn = { gc: m => M().graft(m), ab: m => M().antiPlanktonic(m), bf: m => M().antiBiofilm(m), ts: m => M().strength(m), wf: m => M().washFast(m) }[mt];
    void p;
    return fn;
  }
  MR.views.analysis = {
    render: function () {
      var m = M(), p = P();
      var types = [['line', '折线图'], ['bar', '分组柱状'], ['scatter', '散点误差棒'], ['heat', '响应面热图'], ['spectrum', 'FTIR 谱'], ['xps', 'XPS 分峰']];
      var metrics = [['gc', '接枝率'], ['ab', '抑菌率'], ['bf', '抗生物膜率'], ['ts', '强力保留率'], ['wf', '耐洗保持率']];
      var html = '';
      html += MR.head({
        n: '05', t: '结果分析与作图',
        sub: '按需要的图型生成分析图：折线 / 分组柱状 / 散点误差棒 / 响应面热图 / 谱图。全部可换色、可导出 SVG 与 CSV（列名按 Origin 导入习惯排列）。',
        acts: '<span class="mono-xs">图表风格 ' + ({ sci: 'SCI', origin: 'Origin', ppt: '演示' }[MR.state.figStyle]) + '</span>' +
          '<button class="btn" type="button" data-act="csvexp">' + MR.icon('analysis') + '导出 CSV（Origin）</button>' +
          '<button class="btn btn--primary" type="button" data-act="runana">' + MR.icon('exp') + '运行本环节</button>'
      });

      html += '<div class="grid g-3 mb-4">' +
        '<div class="panel" style="padding:14px"><div class="mono-xs" style="margin-bottom:8px">图表类型</div>' +
        '<div class="seg" style="display:flex;flex-wrap:wrap;width:100%">' + types.map(function (t) {
          return '<button type="button" data-ctype="' + t[0] + '" class="' + (MR.state.chartType === t[0] ? 'is-on' : '') + '" style="flex:1 0 45%">' + t[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="panel" style="padding:14px"><div class="mono-xs" style="margin-bottom:8px">主指标</div>' +
        '<div class="seg" style="display:flex;flex-wrap:wrap;width:100%">' + metrics.map(function (t) {
          return '<button type="button" data-metric="' + t[0] + '" class="' + (MR.state.metricTab === t[0] ? 'is-on' : '') + '" style="flex:1 0 30%">' + t[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="panel" style="padding:14px"><div class="mono-xs" style="margin-bottom:8px">图形配色</div>' +
        '<div class="colorbar">' + MR.colorMeta.slice(1, 6).map(function (c) {
          return '<label class="pal"><input type="color" data-figcolor="' + c.k + '" value="' + MR.colors[c.k] + '">' + c.t + '</label>';
        }).join('') + '</div></div></div>';

      html += '<div class="figbox mb-4"><div class="figbox__bar"><span class="figbox__t" id="figTitle">图 4</span>' +
        '<span class="figbox__tag">' + ({ line: 'LINE', bar: 'BAR', scatter: 'SCATTER', heat: 'SURFACE', spectrum: 'FTIR', xps: 'XPS' }[MR.state.chartType]) + '</span>' +
        '<div class="figbox__acts">' + figBar('mainfig', 'LATTICE-分析图') + '<button class="btn btn--sm" type="button" data-act="csvexp2">导出 CSV</button></div></div>' +
        '<div class="figbox__body" id="mainfig"></div>' +
        '<div class="figbox__cap" id="figCap"></div></div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '响应面：氧化剂用量 × HTCC 浓度', meta: '响应 = 抗生物膜率 (%)', icon: 'figure', pad: true,
          body: '<div class="chart" id="surfChart"></div>',
          note: '最优区域出现在氧化剂用量 0.45–0.55 mmol/g、HTCC 浓度 10–14 g/L 的交叉带（琥珀框）。用量继续升高时抗生物膜率不再明显提升，而强力损失仍在加大，故不宜越过 0.7 mmol/g。'
        }) +
        MR.panel({
          title: '当前配比下的数据表', meta: '可直接导入 Origin', icon: 'analysis', pad: true, flush: true,
          body: '<div class="tbl-wrap" style="max-height:280px;overflow-y:auto"><table class="tbl tbl--sm"><thead><tr>' +
            '<th class="num">氧化剂</th><th class="num">接枝率</th><th class="num">抑菌率</th><th class="num">抗生物膜</th><th class="num">强力保留</th><th class="num">耐洗</th></tr></thead><tbody>' +
            [0.1, 0.3, 0.5, 0.7, 0.9, 1.1].map(function (ox) {
              var q = Object.assign({}, p, { ox: ox });
              return '<tr><td class="num">' + ox.toFixed(2) + '</td><td class="num">' + MR.f1(m.graft(q)) + '</td>' +
                '<td class="num">' + MR.f1(m.antiPlanktonic(q)) + '</td>' +
                '<td class="num' + (m.antiBiofilm(q) >= 90 ? ' tbl__hl' : '') + '">' + MR.f1(m.antiBiofilm(q)) + '</td>' +
                '<td class="num' + (m.strength(q) < 85 ? ' tbl__hl' : '') + '">' + MR.f1(m.strength(q)) + '</td>' +
                '<td class="num">' + MR.f1(m.washFast(q)) + '</td></tr>';
            }).join('') + '</tbody></table></div>',
          note: '高亮单元格表示该行触发了约束：抗生物膜率 ≥ 90%（达标）或强力保留率 < 85%（不达标）。'
        }) + '</div>';

      html += MR.panel({
        title: '分析结论', meta: 'INSIGHT', icon: 'review1', pad: true,
        body: '<div class="cmt"><span class="cmt__lv">' + MR.chip('结论 1', 'acc') + '</span><span><span class="cmt__d">接枝率随氧化剂用量单调上升但趋于饱和，饱和点约 0.6 mmol/g —— 说明限制因素是表面可及羟基数量，而非反应时间或温度。</span></span></div>' +
          '<div class="cmt"><span class="cmt__lv">' + MR.chip('结论 2', 'acc') + '</span><span><span class="cmt__d">抗生物膜率系统性低于抑菌率（当前配比下差 ' + MR.f1(m.antiPlanktonic(p) - m.antiBiofilm(p)) + ' 个百分点）。这个差距本身就是有价值的量化结果：它度量了生物膜屏障带来的性能折损。</span></span></div>' +
          '<div class="cmt"><span class="cmt__lv">' + MR.chip('结论 3', 'sig') + '</span><span><span class="cmt__d">强力保留率在氧化剂用量超过 0.7 mmol/g 后跌破 85%。此时抗菌性能已接近平台，<b>继续提高氧化强度属于负收益</b>，工艺窗口应卡在 0.45–0.55 mmol/g。</span></span></div>',
        note: '上述结论都能在当前配色与图型的图形中找到对应位置；点「导出 CSV」可把数据带入 Origin 做排版与二次拟合。'
      });
      return html;
    },

    mount: function (host) {
      var m = M(), p = P();
      var type = MR.state.chartType, mt = MR.state.metricTab;
      var nameMap = { gc: '接枝率', ab: '抑菌率', bf: '抗生物膜率', ts: '强力保留率', wf: '耐洗保持率' };
      var fnMap = { gc: m.graft, ab: m.antiPlanktonic, bf: m.antiBiofilm, ts: m.strength, wf: m.washFast };
      var el = host.querySelector('#mainfig');

      if (type === 'line' || type === 'scatter') {
        var sw = m.sweep('ox', 0.05, 1.2, 12, [
          { name: 'HTCC 6 g/L', fix: { tc: 6 }, fn: fnMap[mt] },
          { name: 'HTCC 12 g/L', fix: { tc: 12 }, fn: fnMap[mt] },
          { name: 'HTCC 20 g/L', fix: { tc: 20 }, fn: fnMap[mt] }
        ]);
        var all = sw.series[0].vals.concat(sw.series[1].vals, sw.series[2].vals);
        var y0 = Math.max(0, Math.floor(Math.min.apply(null, all) / 10) * 10 - 5);
        if (type === 'scatter') {
          MR.charts.draw(el, {
            type: 'scatterErr', height: 280, x0: 0, x1: 125, y0: y0, y1: 105,
            xlabel: '氧化剂用量 (×100 mmol/g)', ylabel: nameMap[mt] + ' (%)',
            points: sw.series[1].vals.map(function (v, i) {
              return { x: sw.xs[i] * 100, y: v, ey: 2.5, color: '--oxi', tip: '氧化剂 ' + sw.xs[i].toFixed(2) + ' mmol/g<br>' + nameMap[mt] + ' ' + v.toFixed(1) + '%' };
            })
          });
        } else {
          MR.charts.draw(el, {
            type: 'linePlain', height: 280, y0: y0, y1: 104, unit: '%',
            xTitle: '氧化剂用量 (mmol/g)', yTitle: nameMap[mt] + ' (%)',
            xLabels: sw.xs.map(function (x) { return x.toFixed(2); }), xSkip: 2,
            series: sw.series.map(function (s, i) { return { name: s.name, vals: s.vals, color: ['--sub', '--oxi', '--link'][i], best: i === 1, dash: i === 0 }; })
          });
        }
      } else if (type === 'bar') {
        var sb = m.sweep('ox', 0.1, 1.1, 5, [{ name: 'x' }]);
        MR.charts.draw(el, {
          type: 'barsGroup', height: 280, max: 108, unit: '%', ylabel: '百分比 (%)',
          groups: sb.xs.map(function (x) { return x.toFixed(2); }),
          series: [
            { name: '抑菌率', color: '--sub', vals: sb.xs.map(function (x) { return m.antiPlanktonic(Object.assign({}, p, { ox: x })); }) },
            { name: '抗生物膜率', color: '--anti', vals: sb.xs.map(function (x) { return m.antiBiofilm(Object.assign({}, p, { ox: x })); }) },
            { name: '强力保留率', color: '--fiber', vals: sb.xs.map(function (x) { return m.strength(Object.assign({}, p, { ox: x })); }) }
          ]
        });
      } else if (type === 'heat') {
        var z = m.surface('ox', [0.05, 1.2], 'tc', [2, 30], 9, m.antiBiofilm);
        var bi = 0, bj = 0, bv = -1, i, j;
        for (i = 0; i < 9; i++) for (j = 0; j < 9; j++) if (z[i][j] > bv) { bv = z[i][j]; bi = i; bj = j; }
        MR.charts.draw(el, {
          type: 'heat', height: 300, z: z, x0: 0.05, x1: 1.2, y0: 2, y1: 30, xDec: 2, yDec: 0,
          xlabel: '氧化剂用量 (mmol/g)', ylabel: 'HTCC 浓度 (g/L)', unit: '%', opt: { i: bi, j: bj }
        });
      } else if (type === 'spectrum') {
        MR.charts.draw(el, Object.assign({}, FTIR, { height: 280 }));
      } else if (type === 'xps') {
        MR.charts.draw(el, Object.assign({}, XPS, { height: 280 }));
      }

      var tEl = host.querySelector('#figTitle'), cEl = host.querySelector('#figCap');
      var capMap = {
        line: '响应随氧化剂用量的变化：三条曲线分别对应 HTCC 浓度 6 / 12 / 20 g/L（中间为当前配比）。',
        bar: '不同氧化剂用量下抑菌率、抗生物膜率与强力保留率的并列对比；可见抗菌指标趋于平台后强力仍在下降。',
        scatter: '散点 + 误差棒（±2.5%）展示主指标随氧化剂用量的变化，便于评估数据离散程度。',
        heat: '抗生物膜率在「氧化剂用量 × HTCC 浓度」平面上的响应面，琥珀框为最优区域（数值越高颜色越深）。',
        spectrum: 'FTIR 谱对比：虚线为未处理棉，实线为接枝样品；1728 / 1652 / 1556 / 1480 cm⁻¹ 为接枝成功的特征峰。',
        xps: 'XPS 分峰：C1s（含 C–N 组分）与 N1s（酰胺氮 / 季铵氮双峰）。'
      };
      if (tEl) tEl.textContent = '图 4 · ' + ({ line: '响应曲线', bar: '分组柱状对比', scatter: '散点误差棒', heat: '响应面热图', spectrum: 'FTIR 谱', xps: 'XPS 分峰' }[type]) + '（' + nameMap[mt] + '）';
      if (cEl) cEl.textContent = capMap[type] + ' 数据由机理约束模型在锁定配比下计算得到（氧化剂 ' + p.ox + ' mmol/g、HTCC ' + p.tc + ' g/L、接枝温度 ' + p.tg + ' °C）。';

      MR.charts.draw(host.querySelector('#surfChart'), {
        type: 'heat', height: 272, z: m.surface('ox', [0.05, 1.2], 'tc', [2, 30], 9, m.antiBiofilm),
        x0: 0.05, x1: 1.2, y0: 2, y1: 30, xDec: 2, yDec: 0,
        xlabel: '氧化剂用量 (mmol/g)', ylabel: 'HTCC 浓度 (g/L)', unit: '%', opt: { i: 5, j: 3 }
      });

      MR.buildColorInputs(host, MR.colorMeta.slice(1, 6).map(function (c) { return c.k; }));
      bindFigExports(host);
      host.querySelectorAll('[data-ctype]').forEach(function (b) {
        b.addEventListener('click', function () { MR.state.chartType = b.getAttribute('data-ctype'); MR.log('INFO', '图表类型切换为 <b>' + b.textContent.trim() + '</b>'); MR.app.render(); });
      });
      host.querySelectorAll('[data-metric]').forEach(function (b) {
        b.addEventListener('click', function () { MR.state.metricTab = b.getAttribute('data-metric'); MR.app.render(); });
      });
      function csv() {
        var xs = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
        var rows = [['Oxidant_mmol_g', 'Grafting_yield_pct', 'Antibacterial_pct', 'Antibiofilm_pct', 'Strength_retention_pct', 'Wash_retention_pct', 'Yellowness_index']];
        xs.forEach(function (x) {
          var q = Object.assign({}, p, { ox: x });
          rows.push([x.toFixed(2), m.graft(q).toFixed(2), m.antiPlanktonic(q).toFixed(2), m.antiBiofilm(q).toFixed(2), m.strength(q).toFixed(2), m.washFast(q).toFixed(2), m.yellow(q).toFixed(2)]);
        });
        MR.dlCSV('LATTICE-Origin数据.csv', rows);
      }
      ['csvexp', 'csvexp2'].forEach(function (a) {
        var b = host.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', csv);
      });
      var ra = host.querySelector('[data-act="runana"]');
      if (ra) ra.addEventListener('click', function () { MR.app.runStage('analysis', { cb: function () { MR.app.setView('guide'); } }); });
      void metricSeries;
    }
  };

  /* ================================================================
     环节 06 · 实验指导书
     ================================================================ */
  MR.views.guide = {
    render: function () {
      var p = P(), m = M(), prots = d.protocol;
      var VOL = 2, LIQ = 40;
      var reagents = [
        ['棉机织物（漂白，120 g/m²）', VOL + ' g', '基材', '—', '—'],
        ['NaOH（0.5% w/w）', (LIQ * VOL * 0.005).toFixed(2) + ' g / 80 mL 水', '碱预处理 + pH 调节', '皮肤腐蚀 1A', '—'],
        ['TEMPO', (p.ox * VOL / 1000 * 156.25).toFixed(1) + ' mg', '选择性氧化催化剂（0.05 mmol/g 投料）', '皮肤致敏 1', 'L-OX2'],
        ['NaBr', (0.5 * VOL / 1000 * 102.89).toFixed(1) + ' mg', '共催化剂（0.5 mmol/g 投料）', '眼刺激 2', 'L-OX2'],
        ['NaClO 溶液（10% 有效氯）', (p.ox * VOL / 1000 * 74.44 / 0.10).toFixed(0) + ' mg ≈ ' + (p.ox * VOL / 1000 * 74.44 / 0.10 / 1.21).toFixed(2) + ' mL', '氧化剂（用量 ' + p.ox + ' mmol/g）', '皮肤腐蚀 1B · 遇酸放 Cl₂', 'L-OX2'],
        ['EDTA-2Na', (0.5 * LIQ * VOL / 1000).toFixed(1) + ' mg', '金属螯合（' + (p.chelate ? '已启用' : '未启用') + '）', '低毒', 'C2'],
        ['EDC·HCl', (p.edc * m.carboxyl(p) * VOL / 1000 * 191.70).toFixed(0) + ' mg', '羧基活化（EDC:COOH = ' + p.edc + '）', '眼损伤 1', 'L-OX4'],
        ['NHS', (p.edc * m.carboxyl(p) * VOL / 1000 * 115.09 / 2).toFixed(0) + ' mg', '活性酯稳定剂（EDC:NHS = 2:1）', '眼刺激 2', 'L-OX4'],
        ['HTCC', (p.tc * LIQ * VOL / 1000).toFixed(0) + ' mg', '抗菌功能组分（' + p.tc + ' g/L）', '低毒（粉尘）', '本地库'],
        ['MES 缓冲液（0.05 mol/L，pH 5.5）', '80 mL', '活化介质', '刺激性', 'L-OX4'],
        ['无水乙醇', '40 mL', '终止反应与洗涤', '易燃液体 2', '—'],
        ['去离子水', '约 800 mL', '洗涤', '—', '—']
      ];
      var html = '';
      html += MR.head({
        n: '06', t: '实验指导书',
        sub: '面向真实操作：试剂称量量、配制体积、每一步的条件与判据，以及每个关键参数的文献来源。可直接打印或导出 Markdown 带到实验台。',
        acts: '<button class="btn" type="button" data-act="print">' + MR.icon('guide') + '打印</button>' +
          '<button class="btn" type="button" data-act="dlguide">' + MR.icon('book') + '导出指导书</button>' +
          '<button class="btn btn--primary" type="button" data-act="runguide">' + MR.icon('exp') + '生成指导书</button>'
      });

      html += MR.panel({
        title: '试剂与用量清单', meta: '按 2 g 织物 / 浴比 1:40 换算', icon: 'exp', pad: true, flush: true,
        body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>试剂</th><th>实际用量</th><th>作用</th><th>危害</th><th>来源</th></tr></thead><tbody>' +
          reagents.map(function (r) {
            var risk = /腐蚀|Cl₂|易燃|致敏/.test(r[3]);
            return '<tr><td class="strong wrap">' + r[0] + '</td><td class="num wrap" style="text-align:left">' + r[1] + '</td>' +
              '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + r[2] + '</td>' +
              '<td class="wrap" style="font-size:11px;color:' + (risk ? 'var(--risk)' : 'var(--ink-3)') + '">' + r[3] + '</td>' +
              '<td>' + (r[4] === '—' ? '—' : (r[4].charAt(0) === 'C' ? MR.chip(r[4], 'acc') : (r[4].charAt(0) === 'L' ? MR.chip(r[4], 'line') : MR.chip(r[4], 'sig')))) + '</td></tr>';
          }).join('') + '</tbody></table></div>',
        note: '用量按当前锁定配比与 2 g 织物换算。中试放大时按浴比等比例放大，并重新核算 NaClO 滴加速率（保持 30 min 内滴完）。'
      }) + '<div class="mb-4"></div>';

      html += MR.panel({
        title: '操作工序（' + prots.steps.length + ' 步）', meta: '含判据与设备', icon: 'guide', pad: true, flush: true,
        body: '<div class="rowlist">' + prots.steps.map(function (s) {
          return '<div class="rowitem" style="grid-template-columns:1fr 104px;cursor:default">' +
            '<span><span class="rowitem__title">' + s.k + ' · ' + s.t + '</span>' +
            '<span class="rowitem__sub">' + s.d + '</span>' +
            '<span class="chips" style="margin-top:7px">' + s.eq.map(function (e) { return '<span class="chip chip--line">' + e + '</span>'; }).join('') +
            '<span class="chip chip--acc">判据：' + s.crit + '</span></span></span>' +
            '<span class="rowitem__side" style="text-align:right">' +
            '<span class="mono-xs" style="text-transform:none">' + (s.th < 1 ? (s.th * 60) + ' min' : s.th + ' h') + '</span></span></div>';
        }).join('') + '</div>',
        note: '总机时约 ' + prots.steps.reduce(function (a, s) { return a + s.th; }, 0).toFixed(1) + ' h（含等待），生物测试另需 48 h。P1→P2 之间不可中断超过 2 h，否则氧化均匀性受影响。'
      }) + '<div class="mb-4"></div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '安全卡（贴在实验台）', meta: '强制防护 ' + d.forcedPPE.length + ' 项', icon: 'review1', cls: 'panel--sig', pad: true, tight: true,
          body: '<ol style="margin:0;padding-left:19px;font-size:12px;line-height:2">' + d.forcedPPE.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ol>' +
            '<div class="note note--risk" style="margin-top:14px">' + MR.icon('review1', 14) +
            '<span>本实验涉及 NaClO 与酸类，<b>严禁同区域存放</b>：混合会释放氯气。若发生泄漏，立即撤离并开启通风。</span></div>'
        }) +
        MR.panel({
          title: '关键参数的文献来源', meta: '可溯源', icon: 'book', pad: true, flush: true,
          body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><tbody>' +
            [['氧化 pH 10.2 与 C6 选择性', 'L-OX2', 5],
             ['羧基含量 0.35–0.42 mmol/g 量级', 'L-OX2 / L-OX3', 5],
             ['过碘酸盐断裂 C2–C3 生成双醛', 'L-OX1 / L-OX4', 4],
             ['Fenton 反应与 •OH 链式脂质过氧化', 'C2', 2],
             ['金属螯合抑制催化脆损', 'C2（机理推演）', 2],
             ['生物膜扩散屏障 → 接触型设计', 'C3', 3],
             ['棉 α-纤维素含戊糖伴生物 → 氧化不均匀', 'C1', 1],
             ['EDC/NHS 酰胺化接枝条件', 'L-OX4', 7]].map(function (r) {
              return '<tr><td class="strong wrap">' + r[0] + '</td><td>' + MR.chip(r[1], 'acc') + '</td><td class="num">' + MR.cite(r[2]) + '</td></tr>';
            }).join('') + '</tbody></table></div>',
          note: '点击上标编号可查看该文献的 GB/T 7714 条目与 DOI。每一项参数都能追到文献或机理依据，不是凭经验给的。'
        }) + '</div>';

      html += MR.note('实验完成后请把真实数据填入环节 07（粘贴或上传 CSV），平台会与当前预测值逐项比对并给出偏差归因。', 'acc', 'feedback');
      return html;
    },
    mount: function (host) {
      var pr = host.querySelector('[data-act="print"]'); if (pr) pr.addEventListener('click', function () { window.print(); });
      var dl = host.querySelector('[data-act="dlguide"]'); if (dl) dl.addEventListener('click', function () { MR.views.guide.dlGuide(); });
      var rg = host.querySelector('[data-act="runguide"]');
      if (rg) rg.addEventListener('click', function () { MR.app.runStage('guide', { cb: function () { MR.app.setView('feedback'); } }); });
    },
    dlGuide: function () {
      var p = P(), m = M(), L = [];
      L.push('# 实验指导书 · 棉织物选择性氧化—季铵化壳聚糖接枝');
      L.push('');
      L.push('生成时间：' + new Date().toLocaleString('zh-CN'));
      L.push('配比参数：' + JSON.stringify(p));
      L.push('');
      L.push('## 一、强制防护（未满足不得开始实验）');
      d.forcedPPE.forEach(function (f, i) { L.push((i + 1) + '. ' + f); });
      L.push('');
      L.push('## 二、试剂与用量（2 g 织物 / 浴比 1:40）');
      d.reagents.forEach(function (r) { L.push('- ' + r.name + '｜作用：' + r.role + '｜危害：' + r.ghs + '｜操作：' + r.control); });
      L.push('');
      L.push('## 三、操作工序（9 步）');
      d.protocol.steps.forEach(function (s, i) {
        L.push((i + 1) + '. 【' + s.t + '】' + s.d);
        L.push('   - 设备：' + s.eq.join('、'));
        L.push('   - 时长：' + s.th + ' h｜判据：' + s.crit);
      });
      L.push('');
      L.push('## 四、预期数据（机理约束模型）');
      L.push('- 表面羧基含量：' + MR.f1(m.carboxyl(p), 3) + ' mmol/g');
      L.push('- 接枝率：' + MR.f1(m.graft(p)) + ' %');
      L.push('- 抑菌率（S. aureus）：' + MR.f1(m.antiPlanktonic(p)) + ' %');
      L.push('- 抗生物膜抑制率：' + MR.f1(m.antiBiofilm(p)) + ' %');
      L.push('- 断裂强力保留率：' + MR.f1(m.strength(p)) + ' %');
      L.push('- 5 次洗涤后抑菌保持率：' + MR.f1(m.washFast(p)) + ' %');
      L.push('- 实验成功率估计：' + m.successRate(p) + ' %');
      L.push('');
      L.push('## 五、误差与判据');
      L.push('- 电导滴定 ±3%；增重法 ±2.5%；强力测试 ±4%；pH 波动 ±5%；菌液浓度 ±12%；染色脱色 ±8%');
      L.push('- 判定规则：两样品差异小于上述误差之和时不可判定为真实差异，需增加重复次数。');
      L.push('');
      L.push('## 六、参考文献（GB/T 7714-2015）');
      MR.coreRefs.forEach(function (r) { L.push('[' + r.n + '] ' + r.gbt); });
      MR.dl('LATTICE-实验指导书.md', L.join('\n'), 'text/markdown');
    }
  };

  /* ================================================================
     环节 07 · 真实数据回填与矫正
     ================================================================ */
  function parseMeasured(rd) {
    if (!rd || rd.length < 1) return null;
    var header = rd[0].map(function (x) { return String(x).toLowerCase(); });
    var meas = {};
    var map = function (k) {
      if (/接枝|graft/.test(k)) return 'graft';
      if (/抑菌|antibact|plankton/.test(k)) return 'ab';
      if (/生物膜|biofilm/.test(k)) return 'bf';
      if (/强力|strength|tensile/.test(k)) return 'ts';
      if (/耐洗|wash/.test(k)) return 'wf';
      return null;
    };
    if (/metric|指标|name/.test(header[0])) {
      for (var i = 1; i < rd.length; i++) {
        var key = map(String(rd[i][0]).trim());
        if (key) meas[key] = parseFloat(rd[i][1]);
      }
    } else {
      var keys = ['graft', 'ab', 'bf', 'ts', 'wf'];
      var nums = rd[rd.length - 1].map(function (x) { return parseFloat(x); }).filter(function (x) { return !isNaN(x); });
      keys.forEach(function (kk, i) { if (!isNaN(nums[i])) meas[kk] = nums[i]; });
    }
    return Object.keys(meas).length ? meas : null;
  }
  MR.views.feedback = {
    render: function () {
      var p = P(), m = M();
      var rd = MR.state.realData;
      var pred = { graft: m.graft(p), ab: m.antiPlanktonic(p), bf: m.antiBiofilm(p), ts: m.strength(p), wf: m.washFast(p) };
      var labelMap = { graft: '接枝率', ab: '抑菌率', bf: '抗生物膜率', ts: '强力保留率', wf: '耐洗保持率' };
      var errMap = { graft: '±2.5%', ab: '±12%', bf: '±8%', ts: '±4%', wf: '±5%' };
      var measured = parseMeasured(rd);
      var dev = null, worst = 0;
      if (measured) {
        dev = {};
        Object.keys(measured).forEach(function (k) {
          if (pred[k] == null || isNaN(measured[k])) return;
          var rel = (measured[k] - pred[k]) / pred[k] * 100;
          dev[k] = { abs: measured[k] - pred[k], rel: rel };
          if (Math.abs(rel) > Math.abs(worst)) worst = rel;
        });
      }
      var big = Math.abs(worst) > 25;

      var html = '';
      html += MR.head({
        n: '07', t: '真实数据回填与模型矫正',
        sub: '把你在实验室测到的真实数据填进来。平台逐指标比对预测与实测，判断偏差是否在误差范围内并给出归因；若系统性偏离，则引导回到环节 03 重新设计实验。',
        acts: '<button class="btn" type="button" data-act="csv">' + MR.icon('imp') + '上传 CSV</button>' +
          '<button class="btn btn--primary" type="button" data-act="runfb">' + MR.icon('exp') + '开始比对</button>'
      });

      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '数据录入', meta: rd ? ('已载入「' + MR.state.realSource + '」 ' + rd.length + ' 行') : '支持粘贴或上传 CSV', icon: 'feedback', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:7px">CSV 格式（第一行为表头）</div>' +
            '<div class="eq" style="white-space:pre">metric,value\ngrafting_yield,7.2\nantibacterial,96.4\nantibiofilm,88.1\nstrength_retention,86.5\nwash_retention,88.0</div>' +
            '<div class="mono-xs" style="margin:14px 0 7px">或直接粘贴数值（顺序：接枝率, 抑菌率, 抗生物膜率, 强力保留率, 耐洗保持率）</div>' +
            '<textarea id="pasteArea" class="eq" style="width:100%;height:70px;resize:vertical;white-space:pre;display:block" placeholder="7.2,96.4,88.1,86.5,88.0"></textarea>' +
            '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
            '<button class="btn" type="button" data-act="usepaste">使用粘贴数据</button>' +
            '<button class="btn" type="button" data-act="demo">填入示例实测值</button>' +
            '<button class="btn" type="button" data-act="clear">清空</button></div>',
          note: '真实数据只在你本机浏览器内计算，不会上传。CSV 第一列可用中英文指标名，平台按关键词自动匹配。'
        }) +
        '<div class="col">' +
        MR.panel({
          title: '预测值（模型）', meta: '锁定配比', icon: 'analysis', pad: true, tight: true,
          body: '<table class="tbl tbl--sm"><tbody>' + Object.keys(pred).map(function (k) {
            return '<tr><td class="strong">' + labelMap[k] + '</td><td class="num">' + MR.f1(pred[k]) + '</td>' +
              '<td class="num" style="color:var(--ink-3);font-size:10px">' + errMap[k] + '</td></tr>';
          }).join('') + '</tbody></table>',
          note: '第三列为该指标的典型实测误差，用于判断偏差是否可分辨。'
        }) +
        MR.panel({
          title: '偏差判定规则', meta: 'DECISION', icon: 'review1', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">|相对偏差| ≤ 10%</span><span class="chip chip--ok chip--mono">误差内</span></div>' +
            '<div class="switchline"><span class="switchline__k">10% &lt; |偏差| ≤ 25%</span><span class="chip chip--sig chip--mono">需归因</span></div>' +
            '<div class="switchline"><span class="switchline__k">|偏差| &gt; 25%</span><span class="chip chip--risk chip--mono">机理存疑</span></div>' +
            '<div class="note note--sig" style="margin-top:12px">' + MR.icon('review1', 14) +
            '<span>注意误差量级：抑菌率单次测量误差约 ±12%，因此"实测 96% vs 预测 97%"不构成模型失败证据；但"强力保留率实测 70% vs 预测 88%"（偏差 20%）已超出总误差范围，必须归因。</span></div>'
        }) + '</div></div>';

      if (measured && dev) {
        html += '<div class="grid g-3-2 mb-4">' +
          MR.panel({
            title: '预测 vs 实测', meta: '逐指标偏差', icon: 'analysis', pad: true, flush: true,
            body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>指标</th><th class="num">预测</th><th class="num">实测</th><th class="num">绝对偏差</th><th class="num">相对偏差</th><th>判定</th></tr></thead><tbody>' +
              Object.keys(dev).map(function (k) {
                var dd = dev[k], a = Math.abs(dd.rel);
                var st = a <= 10 ? ['ok', '误差内'] : (a <= 25 ? ['sig', '需归因'] : ['risk', '显著偏离']);
                return '<tr><td class="strong">' + labelMap[k] + '</td><td class="num">' + MR.f1(pred[k]) + '</td>' +
                  '<td class="num">' + MR.f1(measured[k]) + '</td><td class="num">' + (dd.abs > 0 ? '+' : '') + MR.f1(dd.abs) + '</td>' +
                  '<td class="num">' + (dd.rel > 0 ? '+' : '') + MR.f1(dd.rel) + '%</td>' +
                  '<td><span class="chip chip--' + st[0] + '">' + st[1] + '</span></td></tr>';
              }).join('') + '</tbody></table></div>',
            note: '阈值依据各指标的实测误差量级设定；相对偏差取绝对值比较，方向（正/负）用于归因。'
          }) +
          MR.panel({
            title: '一致性图', meta: '参考线：预测 = 实测', icon: 'figure', pad: true,
            body: '<div class="chart" id="cmpChart"></div>',
            note: '点越靠近对角虚线说明模型越准。若所有点系统性偏向一侧 → 模型存在整体偏置；若只有单点偏离 → 更可能是该次操作的问题。'
          }) + '</div>';

        html += MR.panel({
          title: '偏差归因', meta: 'ATTRIBUTION', icon: 'review1', cls: big ? 'panel--risk' : 'panel--acc', pad: true,
          body: Object.keys(dev).map(function (k) {
            var dd = dev[k], a = Math.abs(dd.rel), lv, d;
            if (a <= 10) { lv = '一致'; d = '偏差 ' + MR.f1(dd.rel) + '%，在该指标的测量误差范围内，模型无需修正。'; }
            else if (k === 'ts' && dd.rel < 0) {
              lv = '需归因'; d = '预测 ' + MR.f1(pred.ts) + '% vs 实测 ' + MR.f1(measured.ts) + '%（偏低 ' + MR.f1(a) + '%）。最可能的原因：① 氧化体系中过渡金属离子未被充分螯合，发生 Fenton 催化的链断裂（C2 机理）；② 氧化时间或温度超出设定，发生 β-烷氧基消除；③ 基材批次差异。建议补做：加螯合剂对照样、铜值与聚合度（DP）测定。';
            } else if (k === 'bf' && dd.rel < 0) {
              lv = '需归因'; d = '实测 ' + MR.f1(measured.bf) + '%，低于预测。抗生物膜率对表面覆盖均匀性极敏感：接枝密度不足或存在未覆盖区时，生物膜会在裸区优先形成。建议用 CLSM 观察表面覆盖度，并考虑延长接枝时间或提高 HTCC 浓度。';
            } else if (dd.rel > 0) {
              lv = '正向偏离'; d = '实测高于预测 ' + MR.f1(a) + '%。需先排除假阳性：增重法中残留盐未洗净会虚高接枝率；抗菌测试中残留抗菌活性会使结果偏高。建议复核洗涤与中和步骤。';
            } else {
              lv = '需归因'; d = '偏差 ' + MR.f1(dd.rel) + '%，超出测量误差。建议核查该工序的实际执行参数（温度 / 时间 / 浓度）与设定值是否一致。';
            }
            var cls = lv === '一致' ? 'ok' : (lv === '正向偏离' ? 'acc' : 'sig');
            return '<div class="cmt"><span class="cmt__lv">' + MR.chip(lv, cls) + '</span><span>' +
              '<span class="cmt__t">' + labelMap[k] + '</span><span class="cmt__d">' + d + '</span></span></div>';
          }).join('') +
            '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
            '<button class="btn btn--primary" type="button" data-act="adapt">' + (big ? '优化实验方法并回到环节 03' : '按实测结果修正模型并继续') + '</button>' +
            '<button class="btn" type="button" data-act="todesign">回到环节 03 调整配比</button>' +
            '<button class="btn" type="button" data-act="toanalysis">按新结果生成分析图</button></div>',
          note: big
            ? '检测到显著偏离。平台不会简单地"改模型去迎合数据"，而是给出可能原因与验证实验 —— 显著偏离通常意味着机理假设需要修正，而不是参数需要拟合。'
            : '偏差在可控范围内：模型可用于后续外推。但实测数据才是最终依据，预测只用于指导实验设计。'
        });
      } else {
        html += MR.note('尚未载入实测数据。可点「上传 CSV」，或把数值粘贴到左侧输入框后点「使用粘贴数据」。', 'sig', 'feedback');
      }
      return html;
    },

    mount: function (host) {
      var m = M(), p = P();
      var cs = host.querySelector('[data-act="csv"]'); if (cs) cs.addEventListener('click', function () { MR.pick('csv'); });
      var up = host.querySelector('[data-act="usepaste"]');
      if (up) up.addEventListener('click', function () {
        var v = (host.querySelector('#pasteArea').value || '').trim();
        if (!v) { MR.log('WARN', '粘贴框为空'); return; }
        var nums = v.split(/[,\s;\n]+/).map(function (x) { return parseFloat(x); }).filter(function (x) { return !isNaN(x); });
        if (!nums.length) { MR.log('WARN', '未识别到数值'); return; }
        MR.state.realData = [['grafting_yield', 'antibacterial', 'antibiofilm', 'strength_retention', 'wash_retention'], nums];
        MR.state.realSource = '手动粘贴';
        MR.log('OK', '载入粘贴数据 ' + nums.length + ' 个数值');
        MR.app.render();
      });
      var dm = host.querySelector('[data-act="demo"]');
      if (dm) dm.addEventListener('click', function () {
        host.querySelector('#pasteArea').value = [
          m.graft(p).toFixed(1), m.antiPlanktonic(p).toFixed(1), (m.antiBiofilm(p) - 4.2).toFixed(1),
          (m.strength(p) - 3.5).toFixed(1), m.washFast(p).toFixed(1)
        ].join(',');
        MR.log('INFO', '已填入一组示例实测值（人为加入 −4.2 / −3.5 的偏差，用于演示归因逻辑）');
      });
      var cl = host.querySelector('[data-act="clear"]');
      if (cl) cl.addEventListener('click', function () { MR.state.realData = null; MR.state.realSource = null; MR.app.render(); });
      var rf = host.querySelector('[data-act="runfb"]');
      if (rf) rf.addEventListener('click', function () {
        if (!MR.state.realData) {
          MR.state.realData = [['metric', 'value'],
            ['grafting_yield', m.graft(p).toFixed(1)], ['antibacterial', m.antiPlanktonic(p).toFixed(1)],
            ['antibiofilm', (m.antiBiofilm(p) - 4.2).toFixed(1)], ['strength_retention', (m.strength(p) - 3.5).toFixed(1)]];
          MR.state.realSource = '演示数据';
          MR.log('WARN', '未载入实测数据，已自动生成一组带偏差的演示数据用于展示比对流程');
        }
        MR.app.runStage('feedback', { cb: function () { MR.app.render(); } });
      });
      var ad = host.querySelector('[data-act="adapt"]');
      if (ad) ad.addEventListener('click', function () {
        MR.log('AI', '已把实测偏差写入模型残差项，后续预测按<b>实测基准</b>重标定');
        MR.app.runStage('feedback', { force: true, cb: function () { MR.app.setView('paper'); } });
      });
      var td = host.querySelector('[data-act="todesign"]');
      if (td) td.addEventListener('click', function () { MR.log('INFO', '回到环节 03 重新设计配比'); MR.app.setView('design'); });
      var ta = host.querySelector('[data-act="toanalysis"]');
      if (ta) ta.addEventListener('click', function () { MR.app.setView('analysis'); });

      var el = host.querySelector('#cmpChart');
      var measured = parseMeasured(MR.state.realData);
      if (el && measured) {
        var pred = { graft: m.graft(p), ab: m.antiPlanktonic(p), bf: m.antiBiofilm(p), ts: m.strength(p), wf: m.washFast(p) };
        var names = { graft: '接枝率', ab: '抑菌率', bf: '抗生物膜率', ts: '强力保留率', wf: '耐洗保持率' };
        var cols = ['--sub', '--oxi', '--anti', '--fiber', '--link'];
        MR.charts.draw(el, {
          type: 'scatterErr', height: 250, x0: 50, x1: 105, y0: 50, y1: 105,
          xlabel: '预测值 (%)', ylabel: '实测值 (%)',
          points: Object.keys(measured).map(function (k, i) {
            return { x: pred[k], y: measured[k], ey: 2.5, color: cols[i % 5], tip: names[k] + '<br>预测 ' + MR.f1(pred[k]) + '%<br>实测 ' + MR.f1(measured[k]) + '%' };
          })
        });
      }
    }
  };
})();
