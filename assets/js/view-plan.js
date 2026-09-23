/* ============================================================
   环节 02 · 算法生成 —— 配方化学计量 / 工艺路线 / 变量空间
   环节 03 · 算法评审 —— 五维打分 / 修订建议 / 版本追溯
   ============================================================ */
(function () {
  var d = MR.data;

  /* 用容器实测宽度渲染任意 SVG 构造器 */
  function renderInto(el, build) {
    if (!el) return;
    var lastW = -1;
    function go() {
      var w = Math.max(280, Math.round(el.clientWidth || 600));
      if (Math.abs(w - lastW) < 2) return;
      lastW = w;
      el.innerHTML = build(w);
    }
    go();
    if (window.ResizeObserver && !el.__ro) {
      el.__ro = new ResizeObserver(go);
      el.__ro.observe(el);
    }
  }

  /* ---------- 烧结程序温度曲线 ---------- */
  function profileSVG(w) {
    var h = 168, pad = { l: 46, r: 16, t: 14, b: 30 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var tMax = 22.5, yMax = 1000;
    var X = function (t) { return pad.l + iw * t / tMax; };
    var Y = function (v) { return pad.t + ih - ih * v / yMax; };
    var pts = [[0, 25], [2.63, 500], [7.63, 500], [8.97, 900], [20.97, 900], [22.5, 120]];
    var poly = pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ');
    var area = 'M' + X(0).toFixed(1) + ' ' + Y(0) + ' L' + pts.map(function (p) { return X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' L') +
      ' L' + X(22.5).toFixed(1) + ' ' + Y(0) + ' Z';
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    [0, 250, 500, 750, 1000].forEach(function (t) {
      s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line-2)"/>';
      s += '<text x="' + (pad.l - 7) + '" y="' + (Y(t) + 3.2).toFixed(1) + '" font-family="var(--f-mono)" font-size="9.5" fill="var(--ink-4)" text-anchor="end">' + t + '</text>';
    });
    s += '<path d="' + area + '" fill="var(--acc)" opacity="0.06"/>';
    s += '<polyline points="' + poly + '" fill="none" stroke="var(--acc)" stroke-width="1.8" stroke-linejoin="round"/>';
    pts.forEach(function (p) {
      s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="2.6" fill="var(--surface)" stroke="var(--acc)" stroke-width="1.5"/>';
    });
    /* 保温段标注 */
    s += '<line x1="' + X(2.63).toFixed(1) + '" y1="' + Y(560) + '" x2="' + X(7.63).toFixed(1) + '" y2="' + Y(560) + '" stroke="var(--sig)" stroke-width="1"/>';
    s += '<text x="' + ((X(2.63) + X(7.63)) / 2).toFixed(1) + '" y="' + (Y(560) - 4) + '" font-family="var(--f-mono)" font-size="9" fill="var(--sig)" text-anchor="middle">预烧 500 °C / 5 h · 3 °C min⁻¹</text>';
    s += '<line x1="' + X(8.97).toFixed(1) + '" y1="' + Y(960) + '" x2="' + X(20.97).toFixed(1) + '" y2="' + Y(960) + '" stroke="var(--sig)" stroke-width="1"/>';
    s += '<text x="' + ((X(8.97) + X(20.97)) / 2).toFixed(1) + '" y="' + (Y(960) - 4) + '" font-family="var(--f-mono)" font-size="9" fill="var(--sig)" text-anchor="middle">烧结 900 °C / 12 h · 5 °C min⁻¹</text>';
    /* X 轴 */
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="var(--line-strong)"/>';
    [0, 5, 10, 15, 20].forEach(function (t) {
      s += '<line x1="' + X(t).toFixed(1) + '" y1="' + (pad.t + ih) + '" x2="' + X(t).toFixed(1) + '" y2="' + (pad.t + ih + 4) + '" stroke="var(--line-strong)"/>';
      s += '<text x="' + X(t).toFixed(1) + '" y="' + (h - 12) + '" font-family="var(--f-mono)" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">' + t + '</text>';
    });
    s += '<text x="' + (pad.l + iw / 2).toFixed(1) + '" y="' + (h - 1) + '" font-family="var(--f-mono)" font-size="9" fill="var(--ink-4)" text-anchor="middle">时间 (h)</text>';
    s += '<text x="11" y="' + (pad.t + ih / 2).toFixed(1) + '" font-family="var(--f-mono)" font-size="9" fill="var(--ink-4)" text-anchor="middle" transform="rotate(-90 11 ' + (pad.t + ih / 2).toFixed(1) + ')">温度 (°C)</text>';
    s += '</svg>';
    return s;
  }

  /* ---------- 工艺路线流程 ---------- */
  function flowHTML() {
    var steps = d.protocol.steps;
    return '<div class="rowlist" style="margin:0 -18px">' + steps.map(function (s, i) {
      return '<div class="rowitem" style="grid-template-columns:1fr 62px;cursor:default">' +
        '<span><span class="rowitem__title">' + s.t + '</span>' +
        '<span class="rowitem__sub">' + s.d + '</span>' +
        '<span class="chips" style="margin-top:7px">' + s.eq.map(function (e) { return '<span class="chip chip--line">' + e + '</span>'; }).join('') + '</span></span>' +
        '<span class="rowitem__side" style="text-align:right">' +
        '<span class="rowitem__score" style="font-size:13px;color:var(--ink-3)">P' + (i + 1) + '</span>' +
        '<br><span class="mono-xs" style="text-transform:none">+' + s.t_h + ' h</span></span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 元素配比表 ---------- */
  function stoichHTML() {
    var rows = [
      ['Ni', 'Ni²⁺', 0.30, '0.69 Å', '+2', '氧化还原活性中心', '--c2'],
      ['Fe', 'Fe³⁺', 0.40, '0.645 Å', '+3', '骨架稳定，成本低', '--c5'],
      ['Mn', 'Mn⁴⁺', 0.26, '0.53 Å', '+4', '被 Zn/Ti 部分取代', '--c6'],
      ['Zn', 'Zn²⁺', 0.02, '0.74 Å', '+2', '抑制 Ni²⁺ 迁入 Na 层', '--acc'],
      ['Ti', 'Ti⁴⁺', 0.02, '0.605 Å', '+4', '强化 TM–O 键', '--acc']
    ];
    var charge = 0.30 * 2 + 0.40 * 3 + 0.26 * 4 + 0.02 * 2 + 0.02 * 4;
    return '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr>' +
      '<th>元素</th><th>价态</th><th class="num">占位</th><th class="num">离子半径</th><th class="num">电荷贡献</th><th>作用</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="strong"><span class="led" style="background:var(' + r[6] + ');display:inline-block;margin-right:6px"></span>' + r[0] + '</td>' +
          '<td>' + r[1] + '</td><td class="num">' + r[2].toFixed(2) + '</td><td class="num">' + r[3] + '</td>' +
          '<td class="num">' + (r[2] * (+r[4][1])).toFixed(2) + '</td><td style="color:var(--ink-3)">' + r[5] + '</td></tr>';
      }).join('') +
      '<tr><td class="strong">合计</td><td>—</td><td class="num">1.00</td><td>—</td><td class="num tbl__hl">' + charge.toFixed(2) + '</td>' +
      '<td style="color:var(--ink-3)">目标 +2.00（对应 O₃²⁻ 的电荷中性，偏差 ' + (charge - 2 > 0 ? '+' : '') + (charge - 2).toFixed(2) + '）</td></tr>' +
      '</tbody></table></div>';
  }

  /* ---------- 正交表 ---------- */
  function orthoHTML() {
    var samples = d.samples;
    return '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr>' +
      '<th>组号</th><th class="num">烧结温度</th><th class="num">共掺量</th><th class="num">烧结时间</th><th class="num">Na 过量</th><th>覆盖空缺</th></tr></thead><tbody>' +
      samples.map(function (s, i) {
        var t2 = [8, 12, 16][i % 3];
        return '<tr' + (s.id === MR.state.sampleSel ? ' class="is-hit"' : '') + ' data-sample="' + s.id + '" style="cursor:pointer">' +
          '<td class="strong">#' + s.id + '</td><td class="num">' + s.t + ' °C</td><td class="num">' + s.x + ' mol%</td>' +
          '<td class="num">' + t2 + ' h</td><td class="num">5%</td>' +
          '<td>' + (s.x >= 2 ? '<span class="chip chip--sig">G1 高空缺区</span>' : '<span class="chip chip--line">对照区</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============ 环节 02 ============ */
  MR.views.plan = {
    render: function () {
      var p = d.protocol;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 02 / 06</span>实验方案生成 · <em>' + MR.state.planVer + '</em></h1>' +
        '<p class="view__sub">从锁定的研究方向推导化学计量、工艺窗口与变量空间。所有参数均可追溯到文献先验或物理约束，不允许出现无依据的"魔法数字"。</p></div>' +
        '<div class="view__acts">' +
        '<span class="chip chip--acc">方向 ' + MR.state.direction + '</span>' +
        '<button class="btn" type="button" data-act="regen">重新生成</button>' +
        '<button class="btn btn--primary" type="button" data-act="toplan">提交算法评审 →</button></div></div>';

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '目标产物', val: 'O3', unit: 'R-3m', foot: p.formula }) +
        MR.kpi({ label: '变量因子', val: p.variables.length, unit: '个', foot: '每因子 3 水平' }) +
        MR.kpi({ label: '变量空间', val: p.design.space, unit: '组', foot: '正交抽样 ' + p.design.sampled + ' 组', cls: 'kpi--acc' }) +
        MR.kpi({ label: '关键路径机时', val: d.stats.hours, unit: 'h', foot: '原料成本 ¥ ' + d.stats.cost.toLocaleString() }) +
        '</div>';

      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '化学计量与离子占位', meta: 'STOICHIOMETRY', icon: 'plan', pad: true,
          body: stoichHTML(),
          note: 'Zn²⁺（0.74 Å）与 Ni²⁺（0.69 Å）半径差 7.2%，具备占据过渡金属位的几何条件；Ti⁴⁺（0.605 Å）与 Mn⁴⁺（0.53 Å）差 14.2%，低于 15% 的固溶度经验阈值。'
        }) +
        MR.panel({
          title: '工艺变量空间', meta: 'DESIGN OF EXPERIMENT', icon: 'exp', pad: true,
          body: p.variables.map(function (v) {
            return '<div class="param"><div class="param__k">' + v.k + '<b>' + v.v.join(' / ') + ' ' + v.unit + '</b></div>' +
              '<div class="bar"><i style="width:' + (v.level / 5 * 100) + '%"></i></div>' +
              '<div class="param__h">' + v.level + ' 水平 · 优先度 ' + ({ high: '高', mid: '中', low: '低' }[v.pri]) + '</div></div>';
          }).join('') +
          '<div class="note note--acc">' + MR.icon('plan', 14) +
          '<span>' + p.design.strategy + '</span></div>'
        }) + '</div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '工艺路线（8 工序）', meta: 'PROCESS ROUTE', icon: 'exp', pad: true, flush: true,
          body: flowHTML(),
          note: '工序时间合计 ' + p.steps.reduce(function (a, s) { return a + s.t_h; }, 0) + ' h，与设备排程甘特图的关键路径 96 h 对齐（含批次错峰与排队等待）。'
        }) +
        '<div class="col">' +
        MR.panel({
          title: '烧结程序曲线', meta: 'TEMPERATURE PROGRAM', icon: 'exp', pad: true,
          body: '<div class="chart" id="profileChart"></div>',
          note: '预烧段 3 °C min⁻¹ 用于平缓脱除碳酸根，避免 CO₂ 骤释导致颗粒碎裂；烧结段 5 °C min⁻¹ 兼顾固相扩散速率与晶粒尺寸控制。'
        }) +
        MR.panel({
          title: '受控 / 未控变量', meta: 'CONTROL STATUS', icon: 'review1', pad: true, tight: true,
          body: '<div class="mono-xs" style="margin-bottom:6px">已受控（' + p.controlled.length + '）</div>' +
            '<div class="chips mb-4">' + p.controlled.map(function (c) { return '<span class="chip chip--ok">' + c + '</span>'; }).join('') + '</div>' +
            '<div class="mono-xs" style="margin-bottom:6px">未受控 · 进入残差项（' + p.notControlled.length + '）</div>' +
            '<div class="chips">' + p.notControlled.map(function (c) { return '<span class="chip chip--sig">' + c + '</span>'; }).join('') + '</div>'
        }) + '</div></div>';

      html += MR.panel({
        title: '正交实验表 L9(3⁴)', meta: '9 组配方 × 3 重复 = 27 次烧结', icon: 'plan', pad: true, flush: true,
        body: orthoHTML(),
        note: '点击任意组号可在环节 04 中定位该样品的完整实验记录与表征数据。'
      });

      return html;
    },
    mount: function (host) {
      renderInto(host.querySelector('#profileChart'), profileSVG);
      var t = host.querySelector('[data-act="toplan"]');
      if (t) t.addEventListener('click', function () {
        MR.app.runStage('plan', { cb: function () { MR.app.setView('review1'); } });
      });
      var r = host.querySelector('[data-act="regen"]');
      if (r) r.addEventListener('click', function () {
        MR.log('AI', '重新生成方案：在保留求解约束的前提下重采样变量空间');
        MR.app.runStage('plan', { force: true });
      });
      host.querySelectorAll('[data-sample]').forEach(function (x) {
        x.addEventListener('click', function () {
          MR.state.sampleSel = x.getAttribute('data-sample');
          MR.log('INFO', '选中样品 <b>' + MR.state.sampleSel + '</b>');
          MR.app.render();
        });
      });
    }
  };

  /* ============ 环节 03 ============ */
  MR.views.review1 = {
    render: function () {
      var r = d.review1;
      var accepted = MR.state.reviewAccepted;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 03 / 06</span>算法评审 · 方案可行性复核</h1>' +
        '<p class="view__sub">在消耗实验机时之前，由独立评审智能体对方案做对抗性复核：新颖性是否成立、约束是否满足、安全是否可控、证据是否充分。评审可与生成环节相互否决。</p></div>' +
        '<div class="view__acts">' +
        '<span class="chip chip--mono chip--line">方案 ' + MR.state.planVer + '</span>' +
        (accepted ? '<span class="chip chip--ok">修订建议已采纳</span>' : '') +
        '<button class="btn btn--primary" type="button" data-act="toreview">' + (accepted ? '通过并进入自动实验 →' : '提交评审 →') + '</button></div></div>';

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '综合评审分', val: r.total.toFixed(2), unit: '/ 1.00', foot: '加权 6 项', cls: 'kpi--acc' }) +
        MR.kpi({ label: '评审结论', val: '通过', foot: r.verdict }) +
        MR.kpi({ label: '必改项', val: r.comments.filter(function (c) { return c.level === 'must'; }).length, unit: '条', foot: accepted ? '已写入方案 ' + MR.state.planVer : '待处理' }) +
        MR.kpi({ label: '提示项', val: r.comments.filter(function (c) { return c.level === 'info'; }).length, unit: '条', foot: '建议登记但不阻塞' }) +
        '</div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '评审打分卡', meta: 'WEIGHTED SCORING', icon: 'review1', pad: true,
          body: '<div class="bigscore mb-4"><div class="bigscore__num">' + r.total.toFixed(2) + '<small> / 1.00</small></div>' +
            '<div class="bigscore__txt">阈值 0.65<br>' + r.verdict + '</div></div>' +
            '<div class="scoring">' + r.scores.map(function (s) {
              return '<div class="scorerow" style="grid-template-columns:82px 1fr 74px"><span class="scorerow__k">' + s.k +
                '<span class="mono-xs" style="display:block;margin-top:2px">权重 ' + s.w.toFixed(2) + '</span></span>' +
                '<span><span class="bar"><i style="width:' + (s.v * 100) + '%"></i></span>' +
                '<span class="mono-xs" style="display:block;margin-top:5px;text-transform:none;letter-spacing:0">' + s.note + '</span></span>' +
                '<span class="scorerow__v">' + s.v.toFixed(2) + '</span></div>';
            }).join('') + '</div>',
          note: '评审智能体与生成智能体相互独立：评审方不接收生成方的推理过程，只接收方案本身与文献证据，以避免"自证正确"。'
        }) +
        '<div class="col">' +
        MR.panel({
          title: '修订建议', meta: r.comments.length + ' 条', icon: 'peer', cls: 'panel--sig', pad: true,
          body: r.comments.map(function (c) {
            return '<div class="note ' + (c.level === 'must' ? 'note--risk' : 'note--acc') + '" style="margin-bottom:10px;flex-direction:column;gap:6px">' +
              '<div style="display:flex;gap:8px;align-items:center">' + MR.icon('review1', 14) +
              '<b>' + c.t + '</b>' +
              (c.level === 'must' ? '<span class="chip chip--risk" style="margin-left:auto">必改</span>' : '<span class="chip chip--sig" style="margin-left:auto">提示</span>') + '</div>' +
              '<div style="color:var(--ink-2)">' + c.d + '</div>' +
              '<div class="ck__fix">处置方式：' + c.action + '</div></div>';
          }).join(''),
          note: accepted
            ? '全部必改项已合并进方案 ' + MR.state.planVer + '，变量空间由 27 组扩展至 54 组（正交抽样仍为 9 组）。'
            : '点击「提交评审」后，必改项将自动合并进方案并升版（v1.0 → v1.2）。'
        }) +
        MR.panel({
          title: '风险提示', meta: 'RISK', icon: 'exp', pad: true, tight: true,
          body: '<div class="note note--risk">' + MR.icon('review1', 14) + '<span>' + r.risk + '</span></div>'
        }) + '</div></div>';

      html += '<div class="grid g-2">' +
        MR.panel({
          title: '版本追溯', meta: 'REVISION HISTORY', icon: 'history', pad: true,
          body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>版本</th><th>变更内容</th><th>触发来源</th><th>状态</th></tr></thead><tbody>' +
            '<tr><td class="strong">v1.0</td><td>初始方案：3 因子 3 水平，27 组全空间</td><td>环节 02 生成</td><td><span class="chip chip--line">已归档</span></td></tr>' +
            '<tr><td class="strong">v1.1</td><td>限定 Ti 掺量上界 3 mol%，XRD 判定标准加入 TiO₂ 杂相检出阈</td><td>评审必改 #2</td><td><span class="chip chip--line">已归档</span></td></tr>' +
            '<tr' + (accepted ? '' : ' style="opacity:.45"') + '><td class="strong">v1.2</td><td>新增「淬火速率」受控变量（随炉冷却 / 冰水淬火对比组）；登记 3 项未控变量入残差项</td>' +
            '<td>评审必改 #1 + 提示 #3</td><td>' + (accepted ? '<span class="chip chip--ok">当前版本</span>' : '<span class="chip chip--sig">待生成</span>') + '</td></tr>' +
            '</tbody></table></div>',
          note: '方案版本与实验批次强绑定：每个批次记录其执行时的方案版本号，保证结果可回溯到具体的参数集合。'
        }) +
        MR.panel({
          title: '评审依据的文献证据', meta: 'EVIDENCE', icon: 'lit', pad: true, flush: true,
          body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>条目</th><th>支撑的评审结论</th></tr></thead><tbody>' +
            '<tr><td class="strong">P05</td><td>冷却速率影响 O3→P3 相变比例 → 必改 #1</td></tr>' +
            '<tr><td class="strong">P09</td><td>共沉淀 Zn 掺杂最佳首效 84.8% → 新颖性核验的邻域证据</td></tr>' +
            '<tr><td class="strong">P02</td><td>950 °C 下 Na 损失 4–6 mol% → 风险提示与 5% 过量设定</td></tr>' +
            '<tr><td class="strong">P06</td><td>Ti 掺量 > 4 mol% 出现 TiO₂ 杂相 → 必改 #2</td></tr>' +
            '</tbody></table></div>'
        }) + '</div>';

      return html;
    },
    mount: function (host) {
      var t = host.querySelector('[data-act="toreview"]');
      if (t) t.addEventListener('click', function () {
        if (!MR.state.reviewAccepted) {
          MR.state.reviewAccepted = true;
          MR.state.planVer = 'v1.2';
          MR.log('AI', '采纳 2 条必改建议，方案升版 <b>v1.0 → v1.2</b>');
          MR.app.runStage('review1', { cb: function () { MR.app.setView('exp'); } });
        } else {
          MR.app.setView('exp');
        }
      });
    }
  };
})();
