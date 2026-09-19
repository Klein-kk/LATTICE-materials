/* ============================================================
   环节 01 · 文献调研 —— 文献导入 / 方法—配比矩阵 / 空缺发现 / 方向推荐 + 安全预筛
   ============================================================ */
(function () {
  var d = MR.data;

  function cellLevel(n) { return n === 0 ? 0 : (n === 1 ? 2 : (n === 2 ? 3 : (n === 3 ? 4 : 5))); }

  function matrixHTML() {
    var cols = d.methods, rows = d.dopants;
    var grid = '<div class="matrix__corner">体系 \\ 方法</div>';
    cols.forEach(function (m) {
      grid += '<div class="matrix__colh" title="' + m.note + '">' + m.key + '<br><span style="color:var(--ink-4)">' + m.name + '</span></div>';
    });
    rows.forEach(function (r, ri) {
      grid += '<div class="matrix__rowh" title="' + r.name + ' · ' + r.r + ' · ' + r.note + '">' + r.name + '</div>';
      cols.forEach(function (c, ci) {
        var cell = d.matrix[ri][ci];
        var lv = cellLevel(cell.n);
        var isGap = cell.n === 0;
        var focused = MR.state.cellSel && MR.state.cellSel.r === ri && MR.state.cellSel.c === ci;
        var relevant = MR.state.gapSel && gapRows(MR.state.gapSel).indexOf(ri) >= 0;
        var tip = r.name + ' × ' + c.name + '<br>' + (cell.n ? cell.n + ' 篇文献 · 最佳首效 ' + MR.f1(cell.ice) + '%<br>' + cell.refs.join(' / ') : '空缺：无已报道组合');
        grid += '<div class="cell cell--' + lv + (isGap && MR.state.gapMode === 'vacant' ? ' is-gap' : '') +
          (focused ? ' ' : '') + '" data-cell="' + ri + ',' + ci + '" data-tip="' + tip.replace(/"/g, '&quot;') + '"' +
          ' style="cursor:pointer;' + (relevant && !focused ? 'box-shadow:inset 0 0 0 1.5px var(--sig-line);' : '') + '">' +
          '<span class="cell__v">' + (cell.n ? MR.f1(cell.ice) : '—') + '</span>' +
          '<span class="cell__n">' + (cell.n ? cell.n + ' 篇' : '空缺') + '</span></div>';
      });
    });
    return '<div class="matrix" style="grid-template-columns:92px repeat(4, minmax(0,1fr))">' + grid + '</div>';
  }

  function gapRows(gid) {
    if (gid === 'G1') return [3];          /* Zn */
    if (gid === 'G2') return [2, 0];        /* Cu, Mg */
    if (gid === 'G3') return [5];           /* Sn */
    if (gid === 'G4') return [6];           /* Zr */
    return [];
  }

  function papersHTML() {
    var sel = MR.state.cellSel;
    var dl = sel ? d.dopants[sel.r].key : null, mt = sel ? d.methods[sel.c].key : null;
    return MR.panel({
      title: '文献库与方法—配比比对', meta: d.papers.length + ' 条 · 结构化字段', icon: 'lit', pad: true,
      acts: '<button class="btn btn--sm" type="button" data-act="import">导入文献</button>',
      flush: true,
      body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr>' +
        '<th>ID</th><th>题名</th><th>方法</th><th>掺杂</th><th class="num">掺量</th><th class="num">Na 过量</th><th class="num">烧结</th><th class="num">首效</th><th class="num">首圈容量</th><th class="num">100 圈</th>' +
        '</tr></thead><tbody>' +
        d.papers.map(function (p) {
          var hit = p.method === mt && p.dopant === dl;
          return '<tr' + (hit ? ' class="is-hit"' : '') + '>' +
            '<td class="num" style="color:var(--ink-3)">' + p.id + '</td>' +
            '<td class="strong" style="max-width:330px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + MR.esc(p.title) + '">' +
            p.title + ' ' + (p.kind === '综述' ? MR.chip('综述', 'line') : '') + '</td>' +
            '<td>' + p.method + '</td><td>' + p.dopant + '</td>' +
            '<td class="num">' + (p.mol == null ? '—' : p.mol + '%') + '</td>' +
            '<td class="num">' + (p.na == null ? '—' : p.na + '%') + '</td>' +
            '<td class="num">' + (p.temp == null ? '—' : p.temp + '°C/' + p.time + 'h') + '</td>' +
            '<td class="num ' + (p.ice ? 'tbl__hl' : '') + '">' + (p.ice == null ? '—' : MR.f1(p.ice)) + '</td>' +
            '<td class="num">' + (p.cap == null ? '—' : MR.f1(p.cap)) + '</td>' +
            '<td class="num">' + (p.ret == null ? '—' : MR.f1(p.ret)) + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>',
      note: sel
        ? '已按 <b>' + d.dopants[sel.r].name + ' × ' + d.methods[sel.c].name + '</b> 过滤高亮；再次点击同一单元格可取消。所有条目为演示占位数据（DOI 前缀 10.9999/demo），字段结构与 Crossref / CNKI 元数据一一对应。'
        : '点击左侧矩阵中的任意单元格，可按「掺杂体系 × 合成方法」过滤下方文献并高亮比对结果。'
    });
  }

  function gapsHTML() {
    return MR.panel({
      title: '空缺发现', meta: 'GAP SCORING', icon: 'review1', pad: true,
      body: '<div class="rowlist" style="margin:-4px -18px 0">' + d.gaps.map(function (g) {
        var on = MR.state.gapSel === g.id;
        var rc = g.risk === 'low' ? 'ok' : (g.risk === 'medium' ? 'sig' : 'risk');
        return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-gap="' + g.id + '" ' +
          'style="grid-template-columns:1fr auto">' +
          '<span><span class="rowitem__title">' + g.id + ' · ' + g.title +
          '<span class="chip chip--' + rc + '">可行性 ' + MR.f1(g.feasibility) + '</span></span>' +
          '<span class="rowitem__sub">' + g.evidence + '</span></span>' +
          '<span class="rowitem__side"><span class="rowitem__score">' + g.score.toFixed(2) + '</span><br>空缺分</span></button>';
      }).join('') + '</div>',
      note: '空缺分 = 邻域证据强度 × 0.35 + 机理可达性 × 0.35 + 工艺迁移收益 × 0.20 + 成本可行性 × 0.10。分数高不等于值得做——G4 属"结构性不可能"型空缺，需结合可行性过滤。'
    });
  }

  function gapDetailHTML() {
    var g = d.gaps.filter(function (x) { return x.id === MR.state.gapSel; })[0] || d.gaps[0];
    return MR.panel({
      title: '空缺解析 · ' + g.id, meta: '空缺分 ' + g.score.toFixed(2), icon: 'peer', cls: 'panel--sig', pad: true,
      body:
        '<div class="rowitem__title mb-4" style="font-size:13.5px">' + g.title +
        '<span class="chip chip--' + (g.risk === 'low' ? 'ok' : (g.risk === 'medium' ? 'sig' : 'risk')) + '">风险 ' +
        ({ low: '低', medium: '中', high: '高' }[g.risk]) + '</span></div>' +
        '<dl class="dl">' +
        '<dt>文献证据</dt><dd>' + g.evidence + '</dd>' +
        '<dt>科学机理</dt><dd>' + g.mechanism + '</dd>' +
        '<dt>可行性</dt><dd>' + MR.f1(g.feasibility * 100) + '% · ' + g.riskNote + '</dd>' +
        '</dl>' +
        '<div class="bar bar--tall mt-4"><i style="width:' + (g.feasibility * 100) + '%"></i></div>' +
        '<div class="mono-xs" style="margin-top:6px">可行性评估（基于电荷平衡 / 离子半径匹配 / 热力学窗口三项约束）</div>',
      note: '空缺的判定仅基于已收录的 12 篇实验论文；当文献库扩容后，同一格可能由"空缺"转为"已报道"，因此空缺报告会随文献库版本重新计算。'
    });
  }

  function directionsHTML() {
    return MR.panel({
      title: '候选研究方向', meta: '3 条 · 已通过安全预筛', icon: 'plan', pad: true,
      body: '<div class="rowlist" style="margin:-4px -18px 0">' + d.directions.map(function (r) {
        var on = MR.state.direction === r.id;
        return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-dir="' + r.id + '" style="grid-template-columns:1fr auto">' +
          '<span><span class="rowitem__title">' + r.id + ' · ' + r.title +
          (r.recommend ? '<span class="chip chip--acc">推荐</span>' : '') +
          '<span class="chip chip--line">安全 ' + r.safety.level + '</span></span>' +
          '<span class="rowitem__sub">' + r.formula + '<br>' + r.expect + '</span></span>' +
          '<span class="rowitem__side"><span class="rowitem__score">' + r.total.toFixed(2) + '</span><br>综合分</span></button>';
      }).join('') + '</div>',
      note: '综合分 = 空缺分 × 0.4 + 可行性 × 0.3 + 文献支撑 × 0.2 + 成本 × 0.1。选择任一方向后，右侧安全档案与下方评分随之更新。'
    });
  }

  function dirDetailHTML() {
    var r = d.directions.filter(function (x) { return x.id === MR.state.direction; })[0] || d.directions[0];
    var rows = Object.keys(r.scores).map(function (k) {
      return '<div class="scorerow"><span class="scorerow__k">' + k + '</span>' +
        '<span class="bar"><i style="width:' + (r.scores[k] * 100) + '%"></i></span>' +
        '<span class="scorerow__v">' + r.scores[k].toFixed(2) + '</span></div>';
    }).join('');
    return MR.panel({
      title: '方向评分 · ' + r.id, meta: r.gap ? '来源空缺 ' + r.gap : '源自文献空白', icon: 'review1', pad: true,
      body: '<div class="scoring">' + rows + '</div>' +
        '<div class="note note--acc mt-4">' + MR.icon('plan', 14) +
        '<span><b>预期：</b>' + r.expect + '</span></div>' +
        '<div class="panel__acts" style="margin:14px 0 0;display:flex;gap:8px">' +
        '<button class="btn" type="button" data-panel="safety">查看安全档案</button>' +
        '<button class="btn btn--primary" type="button" data-act="lock">锁定 ' + r.id + ' 并生成方案 →</button></div>'
    });
  }

  function safetyHTML() {
    var s = d.safety;
    return MR.panel({
      title: '安全预筛 · ' + MR.state.direction, meta: '总风险 ' + MR.f1(s.overall) + ' / 5 · ' + s.level, icon: 'exp', pad: true,
      body:
        '<div class="note ' + (s.pass ? 'note--ok' : 'note--risk') + ' mb-4">' + MR.icon('review1', 14) +
        '<span>' + s.conclusion + '</span></div>' +
        '<div class="grid g-2" style="gap:16px"><div>' +
        '<div class="mono-xs" style="margin-bottom:7px">试剂危害（GHS 分类）</div>' +
        '<table class="tbl tbl--sm"><tbody>' + s.reagents.map(function (r) {
          return '<tr><td class="strong">' + r.name + '</td><td style="font-size:11px;color:var(--ink-3)">' + r.amount + '</td>' +
            '<td><span class="chip chip--' + r.tag + ' chip--mono">' + r.score + '</span></td></tr>' +
            '<tr><td colspan="3" style="height:auto;padding:0 12px 8px;font-size:11px;color:var(--ink-3);border-bottom:1px solid var(--line-2)">' + r.ghs + '</td></tr>';
        }).join('') + '</tbody></table></div><div>' +
        '<div class="mono-xs" style="margin-bottom:7px">工艺风险</div>' +
        '<table class="tbl tbl--sm"><tbody>' + s.process.map(function (r) {
          return '<tr><td class="strong" style="white-space:normal">' + r.step + '</td>' +
            '<td style="font-size:11px;color:var(--ink-3)">' + r.hazard + '</td>' +
            '<td><span class="chip chip--' + (r.score >= 4 ? 'risk' : 'sig') + ' chip--mono">' + r.score + '</span></td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="mono-xs" style="margin:14px 0 7px">强制防护清单（' + s.forced.length + ' 项）</div>' +
        '<ol style="margin:0;padding-left:17px;font-size:11.5px;line-height:1.8;color:var(--ink-2)">' +
        s.forced.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ol>' +
        '</div></div>',
      note: '安全评估在方案进入实验环节前强制执行：若总风险 > 3.5 或存在无解的危险试剂组合，平台将阻断流程并要求替换方向。'
    });
  }

  MR.views.lit = {
    render: function () {
      var st = d.stats;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 01 / 06</span>文献调研与方向生成</h1>' +
        '<p class="view__sub">导入文献 → 抽取结构化字段 → 归一化工艺表述 → 构建「掺杂体系 × 合成方法」矩阵 → 空缺评分 → 输出可执行方向并做安全预筛。</p></div>' +
        '<div class="view__acts">' +
        '<button class="btn" type="button" data-act="import">' + MR.icon('lit') + '导入文献</button>' +
        '<button class="btn btn--primary" type="button" data-act="runlit">' + MR.icon('exp') + '运行本环节</button>' +
        '</div></div>';

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '文献入库', val: st.papers, unit: '篇', foot: '研究论文 12 · 综述 2' }) +
        MR.kpi({ label: '字段填充率', val: MR.pct(st.fieldCoverage, 1), foot: '7 类字段自动抽取' }) +
        MR.kpi({ label: '矩阵覆盖率', val: MR.pct(st.filled / st.matrixCells, 1), foot: st.filled + ' / ' + st.matrixCells + ' 格已覆盖' }) +
        MR.kpi({ label: '空缺候选', val: d.gaps.length, unit: '条', foot: '最高空缺分 ' + d.gaps[0].score.toFixed(2), cls: 'kpi--acc' }) +
        '</div>';

      html += '<div class="grid g-mat mb-4">' +
        MR.panel({
          title: '方法—配比矩阵', meta: '7 掺杂体系 × 4 合成方法', icon: 'plan', pad: true,
          acts: '<span class="chip chip--mono chip--line">' + (MR.state.gapMode === 'vacant' ? '标记空缺' : '显示覆盖度') + '</span>',
          body: '<div class="tbl-wrap">' + matrixHTML() + '</div>' +
            '<div class="matrix__legend mt-4">' +
            '<span class="lg"><span class="sw gap"></span>空缺（无已报道组合）</span>' +
            '<span class="lg"><span class="sw" style="background:color-mix(in srgb, var(--acc-tint) 42%, var(--surface))"></span>1 篇</span>' +
            '<span class="lg"><span class="sw" style="background:var(--acc-tint-2)"></span>2 篇</span>' +
            '<span class="lg"><span class="sw" style="background:color-mix(in srgb, var(--acc) 45%, #fff)"></span>3 篇</span>' +
            '<span class="lg"><span class="sw" style="background:color-mix(in srgb, var(--acc) 78%, #fff)"></span>≥4 篇</span>' +
            '<span class="lg" style="margin-left:auto">格内数值 = 该组合已报道的最佳首圈库仑效率（%）</span>' +
            '</div>',
          note: '矩阵是"文献证据的二维投影"：纵向是元素选择的证据密度，横向是工艺路线的证据密度，空格即未被同时验证的组合。'
        }) +
        gapDetailHTML() + '</div>';

      html += '<div class="grid g-2-1 mb-4">' + gapsHTML() +
        '<div class="col">' + MR.panel({
          title: '文献导入渠道', meta: 'INGEST', icon: 'lit', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">DOI / Crossref API</span><span class="num">6 条</span></div>' +
            '<div class="switchline"><span class="switchline__k">arXiv / 预印本</span><span class="num">2 条</span></div>' +
            '<div class="switchline"><span class="switchline__k">CNKI / 万方（中文）</span><span class="num">3 条</span></div>' +
            '<div class="switchline"><span class="switchline__k">PDF 批量解析</span><span class="num">3 条</span></div>' +
            '<div class="switchline"><span class="switchline__k">手工补录</span><span class="num">0 条</span></div>' +
            '<div class="note note--sig" style="margin-top:12px">' + MR.icon('review1', 14) +
            '<span>演示数据集为内置占位条目。接入真实数据库后，本环节会按 DOI 去重、按体系聚类，并给出字段抽取置信度。</span></div>'
        }) + '</div></div>';

      html += '<div class="grid g-2 mb-4">' + directionsHTML() + dirDetailHTML() + '</div>';
      html += '<div class="mb-4">' + papersHTML() + '</div>';
      html += safetyHTML();
      return html;
    },

    mount: function (host) {
      host.querySelectorAll('[data-cell]').forEach(function (c) {
        c.addEventListener('click', function () {
          var p = c.getAttribute('data-cell').split(',');
          var r = +p[0], cc = +p[1];
          if (MR.state.cellSel && MR.state.cellSel.r === r && MR.state.cellSel.c === cc) MR.state.cellSel = null;
          else MR.state.cellSel = { r: r, c: cc };
          var cell = d.matrix[r][cc];
          if (cell.n === 0) {
            var g = { 3: 'G1', 5: 'G3', 6: 'G4' }[r];
            if (g) { MR.state.gapSel = g; MR.log('AI', '单元格 <b>' + d.dopants[r].name + ' × ' + d.methods[cc].name + '</b> 为空缺，已关联到 ' + g); }
            else MR.log('WARN', '单元格 <b>' + d.dopants[r].name + ' × ' + d.methods[cc].name + '</b> 为空缺，但邻域证据不足，未形成候选方向');
          } else {
            MR.log('INFO', '按 <b>' + d.dopants[r].name + ' × ' + d.methods[cc].name + '</b> 高亮 ' + cell.n + ' 篇文献：' + cell.refs.join('、'));
          }
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-gap]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.gapSel = b.getAttribute('data-gap');
          MR.log('AI', '展开空缺解析 <b>' + MR.state.gapSel + '</b>');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-dir]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.direction = b.getAttribute('data-dir');
          MR.log('INFO', '选择研究方向 <b>' + MR.state.direction + '</b>，加载对应安全档案');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-panel]').forEach(function (b) {
        b.addEventListener('click', function () { MR.app.openPanel(b.getAttribute('data-panel')); });
      });
      var imp = host.querySelector('[data-act="import"]');
      if (imp) imp.addEventListener('click', function () {
        MR.modal.open('导入文献', '<div class="grid g-2" style="gap:14px">' +
          ['DOI / Crossref API', 'arXiv / 预印本', 'CNKI / 万方', 'PDF 批量解析'].map(function (k) {
            return '<button class="equipc" type="button"><div class="equipc__t">' + k + '</div>' +
              '<div class="equipc__m">' + ({ 'DOI / Crossref API': '按 DOI 列表批量抓取，自动去重', 'arXiv / 预印本': '按关键词 + 时间窗检索', 'CNKI / 万方': '中文文献检索与题录导出', 'PDF 批量解析': '拖拽上传，自动抽取 7 类字段' }[k]) + '</div></button>';
          }).join('') + '</div>' +
          '<div class="note note--sig" style="margin-top:16px">' + MR.icon('review1', 14) +
          '<span>演示版本已内置 14 条占位条目。真实部署时，导入完成后会自动执行字段抽取、方法归一化、矩阵重算与空缺重评分，无需手工干预。</span></div>',
          '<button class="btn" data-close="1">取消</button><button class="btn btn--primary" data-close="1">了解</button>');
      });
      var rl = host.querySelector('[data-act="runlit"]');
      if (rl) rl.addEventListener('click', function () { MR.app.runStage('lit'); });
      var lk = host.querySelector('[data-act="lock"]');
      if (lk) lk.addEventListener('click', function () {
        MR.log('INFO', '锁定方向 <b>' + MR.state.direction + '</b>，写入课题档案，移交环节 02');
        MR.app.runStage('lit', { cb: function () { MR.app.setView('plan'); } });
      });
    }
  };
})();
