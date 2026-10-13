/* ============================================================
   环节 04 · 自动实验 —— 设备选型 / 错峰排程 / 批次执行 / 重复验证 / 结果分析
   ============================================================ */
(function () {
  var d = MR.data;
  MR.state.expTab = MR.state.expTab || 'setup';
  MR.state.equipSel = MR.state.equipSel || { E1: 1, E2: 1, E3: 1, E4: 1, E5: 1, E6: 1, E7: 1, E8: 1, E9: 1, E10: 1, E11: 1, E12: 1 };

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
    if (window.ResizeObserver && !el.__ro) { el.__ro = new ResizeObserver(go); el.__ro.observe(el); }
  }

  /* ---------- 科研流程图（可导出图 A） ---------- */
  function flowSVG(w) {
    var pad = 8, gap = 20, bh = 46, labelH = 16;
    var iw = w - pad * 2;
    var bw = (iw - gap * 3) / 4;
    var h = 2 * (bh + labelH + 30) + 26;
    /* 优先使用导入论文的真实工艺步骤；否则保留内置的电池制备示例 */
    var dynamic = !!(MR.state.profile && MR.state.profile.steps && MR.state.profile.steps.length);
    var steps = dynamic
      ? MR.state.profile.steps.slice(0, 8).map(function (st) { return [st.t || '步骤', (st.cond || '').replace(/\s*\/\s*/g, ' · ')]; })
      : [
        ['前驱体共沉淀', 'pH 11.0 · 60 °C'],
        ['洗涤 / 干燥', '水洗 ×3 · 醇洗 ×2'],
        ['混钠球磨', '300 rpm · 4 h'],
        ['预烧 500 °C', '5 h · 3 °C/min'],
        ['烧结 900 °C', '12 h · 5 °C/min'],
        ['结构与成分表征', 'XRD/SEM/ICP'],
        ['极片与电池装配', 'CR2032 · 手套箱'],
        ['电化学测试', '0.1C–2C · 100 圈']
      ];
    function box(i) {
      var row = Math.floor(i / 4), col = i % 4;
      var x = pad + col * (bw + gap);
      var y = pad + row * (bh + labelH + 30) + (row === 1 ? 20 : 0);
      return { x: x, y: y, i: i };
    }
    var FONT = "'IBM Plex Sans','Microsoft YaHei',sans-serif";
    var MONO = "'IBM Plex Mono',Consolas,monospace";
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
    /* 框 */
    steps.forEach(function (st, i) {
      var b = box(i);
      var key = i === 4;
      s += '<rect x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh +
        '" rx="4" fill="' + (key ? 'var(--acc-tint)' : 'var(--surface)') + '" stroke="' + (key ? 'var(--acc)' : 'var(--line)') + '" stroke-width="' + (key ? 1.4 : 1) + '"/>';
      s += '<text x="' + (b.x + 10).toFixed(1) + '" y="' + (b.y + 19).toFixed(1) + '" font-family="' + FONT + '" font-size="11" font-weight="600" fill="var(--ink)">' + st[0] + '</text>';
      s += '<text x="' + (b.x + 10).toFixed(1) + '" y="' + (b.y + 33).toFixed(1) + '" font-family="' + MONO + '" font-size="8.5" fill="var(--ink-3)">' + st[1] + '</text>';
      s += '<text x="' + (b.x + bw - 9).toFixed(1) + '" y="' + (b.y + 14).toFixed(1) + '" font-family="' + MONO + '" font-size="8.5" fill="var(--ink-4)" text-anchor="end">P' + (i + 1) + '</text>';
    });
    /* 横向箭头 */
    for (var i = 0; i < steps.length; i++) {
      if (i % 4 === 3) continue;
      var a = box(i), c = box(i + 1);
      var y = a.y + bh / 2;
      var x1 = a.x + bw, x2 = c.x;
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y + '" x2="' + (x2 - 5).toFixed(1) + '" y2="' + y + '" stroke="var(--ink-4)" stroke-width="1"/>';
      s += '<path d="M' + (x2 - 6).toFixed(1) + ' ' + (y - 3.5) + ' L' + x2.toFixed(1) + ' ' + y + ' L' + (x2 - 6).toFixed(1) + ' ' + (y + 3.5) + ' Z" fill="var(--ink-4)"/>';
    }
    /* 换行连接 */
    if (steps.length > 4) {
      var e1 = box(3), s1 = box(4);
      s += '<path d="M' + (e1.x + bw / 2).toFixed(1) + ' ' + (e1.y + bh) + ' V' + (e1.y + bh + 14) + ' H' + (s1.x + bw / 2).toFixed(1) + ' V' + (s1.y - 6) +
        '" fill="none" stroke="var(--ink-4)" stroke-width="1"/>';
      s += '<path d="M' + ((s1.x + bw / 2) - 3.5).toFixed(1) + ' ' + (s1.y - 7) + ' L' + (s1.x + bw / 2).toFixed(1) + ' ' + s1.y + ' L' + ((s1.x + bw / 2) + 3.5).toFixed(1) + ' ' + (s1.y - 7) + ' Z" fill="var(--ink-4)"/>';
    }
    s += '<text x="' + pad + '" y="' + (h - 4) + '" font-family="' + MONO + '" font-size="8.5" fill="var(--ink-4)">图 A · 制备与测试流程图 · ' + (dynamic ? '由导入论文步骤生成' : '内置电池示例（导入论文后自动替换）') + '</text>';
    return s;
  }

  /* ---------- 甘特 ---------- */
  function ganttHTML() {
    var g = d.gantt;
    var rows = g.rows.map(function (r) {
      return '<div class="gantt__row"><div class="gantt__k">' + r.k +
        '<span class="mono-xs" style="display:block;text-transform:none">' + r.eq + '</span></div>' +
        '<div class="gantt__track">' + r.blocks.map(function (b) {
          var l = b.s / g.span * 100, wd = (b.e - b.s) / g.span * 100;
          var label = b.l.length <= 1 ? '组 ' + b.l : b.l;
          if (wd < 7) label = b.l.charAt(0);
          return '<div class="gantt__blk' + (b.q ? ' gantt__blk--q' : '') + '" style="left:' + l.toFixed(2) + '%;width:' + wd.toFixed(2) + '%' +
            (b.q ? '' : ';background:var(--acc)') + ';opacity:' + (b.now ? 1 : (b.q ? 1 : .8)) + '" ' +
            'data-tip="' + r.k + ' · ' + r.eq + '<br>' + label + '<br>T+' + b.s + ' → T+' + b.e + ' h（' + (b.e - b.s) + ' h）">' + label + '</div>';
        }).join('') + '</div></div>';
    }).join('');
    return '<div class="gantt"><div class="gantt__axis">' + g.ticks.map(function (t, i) {
      return '<span>T+' + t + (i === g.ticks.length - 1 ? ' h' : '') + '</span>';
    }).join('') + '</div>' + rows + '</div>';
  }

  /* ---------- 设备 ---------- */
  function equipHTML() {
    return '<div class="equip">' + d.equipment.map(function (e) {
      var stt = { free: ['空闲', 'free'], busy: ['占用中', 'busy'], q: ['排队 ' + e.q + ' 位', 'q'] }[e.state];
      var on = MR.state.equipSel[e.id];
      return '<button type="button" class="equipc' + (on ? ' is-on' : '') + '" data-eq="' + e.id + '">' +
        '<div class="equipc__t">' + e.name + '</div>' +
        '<div class="equipc__m">' + e.model + '</div>' +
        '<div class="equipc__s"><span class="led led--' + stt[1] + '"></span>' + stt[0] +
        '<span style="margin-left:auto">' + e.hours + ' h</span></div>' +
        '<div class="equipc__m" style="margin-top:3px">校准 ' + e.cal + '</div></button>';
    }).join('') + '</div>';
  }

  /* ---------- 批次列表 ---------- */
  function batches() {
    var list = [];
    d.samples.forEach(function (s) {
      for (var i = 1; i <= s.batches; i++) {
        list.push({ id: s.id + '-' + i, sample: s.id, t: s.t, x: s.x, bad: (s.id === 'S3' && i === 2) || (s.id === 'S8' && i === 1) });
      }
    });
    return list;
  }

  function batchRowsHTML() {
    var list = batches();
    return '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr>' +
      '<th>批次</th><th>配方</th><th class="num">温度</th><th class="num">共掺量</th><th>状态</th><th style="width:110px">进度</th>' +
      '</tr></thead><tbody>' + list.map(function (b) {
        var s = d.samples.filter(function (x) { return x.id === b.sample; })[0];
        return '<tr data-batch="' + b.id + '"><td class="strong">' + b.id + '</td><td>' + b.sample + '</td>' +
          '<td class="num">' + b.t + ' °C</td><td class="num">' + b.x + ' mol%</td>' +
          '<td class="b-st">' + (b.bad ? '<span class="chip chip--risk">已剔除 · 交叉污染</span>' : '<span class="chip chip--line">待执行</span>') + '</td>' +
          '<td><span class="bar"><i class="b-fill" style="width:' + (b.bad ? 100 : 0) + '%;' + (b.bad ? 'background:var(--risk)' : '') + '"></i></span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function startRun(host, skipPipeline) {
    if (MR.state.expRunning) { MR.log('WARN', '实验已在运行中'); return; }
    MR.state.expRunning = true;
    var btn = host.querySelector('[data-act="runexp"]');
    if (btn) { btn.disabled = true; btn.textContent = '实验运行中…'; }
    if (!skipPipeline) MR.app.runStage('exp', { silent: true });
    var rows = host.querySelectorAll('[data-batch]');
    var i = 0, done = 0;
    MR.log('RUN', '启动 27 个批次执行 · 3 组错峰投料（组 A/B/C 间隔 6 h）');
    var timer = setInterval(function () {
      if (i >= rows.length) {
        clearInterval(timer);
        MR.state.expRunning = false;
        MR.log('OK', '27 个批次执行结束 · 有效批次 25 · 首圈库伦效率批间 σ 0.6–1.8 pp');
        MR.log('AI', '检出 <b>2</b> 个批次前驱体 ICP 铁偏差 > 8%，判定为球磨罐交叉污染，已剔除并补做');
        if (btn) { btn.disabled = false; btn.textContent = '实验已完成 · 查看结果分析'; }
        MR.state.expTab = 'analysis';
        MR.app.render();
        return;
      }
      var row = rows[i];
      var bad = row.querySelector('.chip--risk');
      var fill = row.querySelector('.b-fill');
      var st = row.querySelector('.b-st');
      if (fill) fill.style.width = '100%';
      if (st && !bad) st.innerHTML = '<span class="chip chip--ok">已完成</span>';
      if (st && bad) st.innerHTML = '<span class="chip chip--risk">已剔除 · 补做中</span>';
      done++;
      if (done % 5 === 0) MR.log('INFO', '已完成 <b>' + done + ' / ' + rows.length + '</b> 个批次');
      i++;
    }, 165);
  }

  /* ---------- 敏感度 ---------- */
  function sensHTML() {
    var max = d.sensitivity[0].v;
    return d.sensitivity.map(function (s) {
      var w = s.v / max * 100;
      return '<div class="hbar">' +
        '<span class="hbar__key" data-tip="' + s.note.replace(/"/g, '&quot;') + '" style="cursor:help">' + s.k + '</span>' +
        '<span class="hbar__val">' + s.v.toFixed(2) + '</span>' +
        '<span class="hbar__track"><i style="width:' + w.toFixed(1) + '%;background:' + (s.v >= 0.2 ? 'var(--acc)' : 'var(--ink-4)') + '"></i></span>' +
        '<span class="mono-xs" style="grid-column:1/-1;text-transform:none;letter-spacing:0;color:var(--ink-3);margin-top:-4px">' + s.note + '</span>' +
        '</div>';
    }).join('');
  }

  MR.views.exp = {
    render: function () {
      var tab = MR.state.expTab;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 04 / 06</span>自动实验 · 排程 · 重复验证 · 结果分析</h1>' +
        '<p class="view__sub">方案落地为可执行的设备排程：选型 → 错峰投料 → 批次执行 → 重复一致性校验 → 表征与电化学数据回传分析。异常批次自动剔除并补做，剔除依据写入实验档案。</p></div>' +
        '<div class="view__acts">' +
        '<span class="chip chip--mono chip--line">方案 ' + MR.state.planVer + '</span>' +
        '<button class="btn' + (MR.state.expRunning ? '' : ' btn--primary') + '" type="button" data-act="runexp">' +
        MR.icon('exp') + (MR.state.expRunning ? '实验运行中…' : '启动 27 个批次') + '</button></div></div>';

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '批次总数', val: 27, unit: '批', foot: '9 组配方 × 3 重复' }) +
        MR.kpi({ label: '有效批次', val: '25', unit: '/ 27', foot: '2 批交叉污染剔除' }) +
        MR.kpi({ label: '批次可复现率', val: MR.pct(d.stats.reproRate), foot: 'σ 0.6–1.8 pp', cls: 'kpi--acc' }) +
        MR.kpi({ label: '关键路径', val: 96, unit: 'h', foot: '瓶颈：管式炉 / 电池测试系统' }) +
        '</div>';

      html += '<div class="seg mb-4" style="display:flex;width:100%;border-radius:var(--r-md);background:var(--surface)">' +
        [['setup', '实验编排与设备选型'], ['run', '运行监控与重复验证'], ['analysis', '结果数据分析']].map(function (t) {
          return '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'is-on' : '') + '" style="flex:1;text-align:center;padding:11px 8px">' + t[1] + '</button>';
        }).join('') + '</div>';

      if (tab === 'setup') {
        html += '<div class="grid g-2-1 mb-4">' +
          MR.panel({
            title: '设备选型', meta: '12 台 · 已匹配', icon: 'exp', pad: true,
            acts: '<button class="btn btn--sm" type="button" data-act="auto">自动匹配</button>',
            body: equipHTML(),
            note: '点击设备卡片可将其移出/加入本轮排程。选中设备时，系统会校验其校准有效期（超期设备将标红并阻止排程）。'
          }) +
          '<div class="col">' + MR.panel({
            title: '排程摘要', meta: 'SCHEDULE', icon: 'plan', pad: true, tight: true,
            body: '<div class="switchline"><span class="switchline__k">投料策略</span><span class="num">3 组错峰</span></div>' +
              '<div class="switchline"><span class="switchline__k">错峰间隔</span><span class="num">6 h</span></div>' +
              '<div class="switchline"><span class="switchline__k">关键路径</span><span class="num">96 h</span></div>' +
              '<div class="switchline"><span class="switchline__k">串行方案对比</span><span class="num" style="color:var(--risk)">168 h</span></div>' +
              '<div class="note note--ok" style="margin-top:12px">' + MR.icon('review1', 14) +
              '<span>错峰投料将总周期由 168 h 压缩至 <b>96 h</b>（节省 43%），且避开了管式炉与电池测试系统的单点等待。</span></div>'
          }) + MR.panel({
            title: '设备校准', meta: 'CALIBRATION', icon: 'review1', pad: true, tight: true,
            body: '<div class="note note--sig">' + MR.icon('review1', 14) +
              '<span>XRD 衍射仪距下次校准 12 天，电池测试系统距下次校准 8 天——建议在本轮测试前排期校准，否则倍率数据将带有系统偏差。</span></div>'
          }) + '</div></div>';

        html += '<div class="grid g-2 mb-4">' +
          MR.panel({
            title: '设备占用甘特图', meta: 'T+0 → T+96 h', icon: 'plan', pad: true,
            body: ganttHTML(),
            note: '斜纹块为排程中（尚未开始），实心块为进行中。同一设备上的三个批组串行执行，仅预烧/烧结（两台管式炉）与电化学测试（8 通道）允许两两并行；组 C 的电化学测试将跨出本轮 96 h 机时窗口，顺延至下一轮。'
          }) +
          MR.panel({
            title: '科研流程图（可导出）', meta: '图 A · FIGURE', icon: 'paper', pad: true,
            acts: '<button class="btn btn--sm" type="button" data-act="exfig">导出 SVG</button>',
            body: '<div class="chart" id="flowChart"></div>',
            note: '该流程图由实际工艺步骤生成：导入论文后自动替换为论文步骤，未导入时显示内置电池示例。环节 06 的论文评审会用它做「文段 ↔ 流程图 ↔ 数据」三方一致性核对。'
          }) + '</div>';
      }

      if (tab === 'run') {
        html += '<div class="grid g-3-2 mb-4">' +
          MR.panel({
            title: '批次执行状态', meta: '27 批', icon: 'exp', pad: true, flush: true,
            body: batchRowsHTML(),
            note: '进度条为实时执行进度；标记「已剔除」的批次不计入统计，其补做批次使用相同配方与设备，以保证剔除不会引入配方偏差。'
          }) +
          '<div class="col">' + MR.panel({
            title: '重复实验一致性', meta: '批次内 σ', icon: 'review1', pad: true,
            body: '<div class="chart" id="reproChart"></div>',
            note: '柱高为 3 个重复批次的首圈库仑效率均值，误差棒为批次内标准差。最优配方 S5 的 σ 最小（0.6 pp），说明该参数窗口对工艺波动最不敏感。'
          }) + MR.panel({
            title: '异常记录', meta: '2 批', icon: 'review1', pad: true, tight: true,
            body: '<div class="note note--risk" style="margin-bottom:9px">' + MR.icon('review1', 14) +
              '<span><b>S3-2</b>：前驱体 ICP 测得 Fe 占比 0.432（名义 0.400，偏差 +8.0%），判定为球磨罐残留交叉污染 → 剔除并补做。</span></div>' +
              '<div class="note note--risk">' + MR.icon('review1', 14) +
              '<span><b>S8-1</b>：同批次 ZrO₂ 球磨珠未彻底清洗，Fe 偏差 +8.6% → 剔除并补做。</span></div>'
          }) + '</div></div>';

        html += MR.panel({
          title: '批次时间线', meta: 'T+0 → T+96 h', icon: 'plan', pad: true,
          body: ganttHTML(),
          note: '当前执行位置：组 A 进入电化学测试（T+68 h），组 B / 组 C 按排程排队。'
        });
      }

      if (tab === 'analysis') {
        var m = d.trends[MR.state.metric];
        html += '<div class="grid g-3-2 mb-4">' +
          MR.panel({
            title: '主指标趋势 · ' + m.label, meta: m.unit + ' · 27 批', icon: 'plan', pad: true,
            acts: '<div class="seg">' + [['ice', '首圈效率'], ['cap', '首圈容量'], ['ret', '100 圈保持']].map(function (x) {
              return '<button type="button" data-metric="' + x[0] + '" class="' + (MR.state.metric === x[0] ? 'is-on' : '') + '">' + x[1] + '</button>';
            }).join('') + '</div>',
            body: '<div class="chart" id="trendChart"></div>',
            note: '三条曲线为三个烧结温度下的掺量响应，虚线为未掺杂基线（900 °C）。三个温度均呈"先升后降"的峰值规律，峰值位于 2 mol%、900 °C。'
          }) +
          '<div class="col">' + MR.panel({
            title: '成功率', meta: '达标 / 复现', icon: 'review1', pad: true,
            body: '<div class="grid g-2" style="gap:8px">' +
              '<div><div class="chart" id="donut1"></div><div class="mono-xs" style="text-align:center">配方达标率<br>ICE ≥ 80% 且保持率 ≥ 82%</div></div>' +
              '<div><div class="chart" id="donut2"></div><div class="mono-xs" style="text-align:center">批次可复现率<br>25 / 27 有效批次</div></div>' +
              '</div>',
            note: '9 组配方中 6 组达标（66.7%）；若按赛事/文献常用的"首效 ≥ 83%"更严阈值，则只有 S5、S6 两组达标（22.2%）。'
          }) + MR.panel({
            title: '最优样品', meta: 'S5', icon: 'exp', pad: true, tight: true,
            body: '<dl class="dl"><dt>配方</dt><dd>NaNi₀.₃Fe₀.₄Mn₀.₂₆Zn₀.₀₂Ti₀.₀₂O₂</dd>' +
              '<dt>工艺</dt><dd>共沉淀 · 900 °C / 12 h · 随炉冷却</dd>' +
              '<dt>首效</dt><dd class="num">84.6% ± 0.6</dd>' +
              '<dt>首圈容量</dt><dd class="num">128.4 ± 1.4 mAh g⁻¹</dd>' +
              '<dt>100 圈保持</dt><dd class="num">88.2% ± 0.9</dd>' +
              '<dt>2C 容量</dt><dd class="num">96.8 mAh g⁻¹</dd></dl>'
          }) + '</div></div>';

        html += '<div class="grid g-2 mb-4">' +
          MR.panel({
            title: '循环性能（1C · 100 圈）', meta: 'mAh g⁻¹', icon: 'plan', pad: true,
            body: '<div class="chart" id="cycChart"></div>',
            note: 'Zn2Ti2 样品在第 100 圈仍保持 95.8 mAh g⁻¹（保持率 88.2%），而未掺杂样品由 92.4 衰减至 70.5 mAh g⁻¹（76.3%）。'
          }) +
          MR.panel({
            title: '倍率性能', meta: 'mAh g⁻¹', icon: 'plan', pad: true,
            body: '<div class="chart" id="rateChart"></div>',
            note: 'Zn2Ti2 在 2C 下仍有 96.8 mAh g⁻¹（为 0.1C 容量的 75.4%），回到 0.1C 后恢复至 125.3 mAh g⁻¹，表明结构可逆性良好。'
          }) + '</div>';

        html += '<div class="grid g-2-1 mb-4">' +
          MR.panel({
            title: '影响因素敏感度', meta: '随机森林置换重要度 + 方差分析', icon: 'review1', pad: true,
            body: sensHTML(),
            note: '前两位因素合计贡献超过 65% 的方差；排在后两位的"环境湿度"与"淬火速率"均为未控变量，其重要度虽低但会直接抬高残差，是下一步需要闭环控制的项。'
          }) +
          MR.panel({
            title: '多体系雷达对比', meta: '6 维度归一化', icon: 'plan', pad: true,
            body: '<div class="chart" id="radarChart"></div>',
            note: '本工作在"循环保持率"与"结构稳定性"两维领先文献最佳水平，但在"工艺经济性"上因共沉淀+双掺工艺更复杂而低于商用参考。'
          }) + '</div>';

        html += '<div class="grid g-2-1">' +
          MR.panel({
            title: 'XRD 物相分析', meta: 'Cu Kα · 10–80°', icon: 'exp', pad: true,
            body: '<div class="chart" id="xrdChart"></div>',
            note: ''
          }) +
          MR.panel({
            title: '物相结论', meta: 'PHASE ANALYSIS', icon: 'review1', pad: true, tight: true,
            body: '<div class="note note--acc mb-4">' + MR.icon('review1', 14) + '<span>' + d.xrd.note + '</span></div>' +
              '<dl class="dl"><dt>空间群</dt><dd>R-3m（O3 型层状结构）</dd>' +
              '<dt>(003) 峰位</dt><dd class="num">16.84° → 16.72°（Δ = −0.12°）</dd>' +
              '<dt>I(003)/I(104)</dt><dd class="num">1.21 → 1.46</dd>' +
              '<dt>杂相</dt><dd>未检出 TiO₂ / ZnO（检出限 1%）</dd>' +
              '<dt>ICP 实测比</dt><dd class="num">0.301 : 0.398 : 0.259 : 0.020 : 0.021</dd></dl>',
            note: 'I(003)/I(104) 的提升是"阳离子混排被抑制"的直接结构证据，也是本工作机理论证的核心依据。'
          }) + '</div>';
      }

      return html;
    },

    mount: function (host) {
      var tab = MR.state.expTab;

      if (MR.state.autoExp && tab === 'run' && !MR.state.expRunning) {
        MR.state.autoExp = false;
        setTimeout(function () { startRun(host, true); }, 120);
      }

      host.querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.expTab = b.getAttribute('data-tab');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-eq]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-eq');
          MR.state.equipSel[id] = MR.state.equipSel[id] ? 0 : 1;
          var e = d.equipment.filter(function (x) { return x.id === id; })[0];
          MR.log('INFO', (MR.state.equipSel[id] ? '加入' : '移出') + '排程设备 <b>' + e.name + '</b>');
          MR.app.render();
        });
      });
      var au = host.querySelector('[data-act="auto"]');
      if (au) au.addEventListener('click', function () {
        MR.log('AI', '自动匹配：按工序需求-校准有效期-排队长度三因素排序，锁定 12 台设备');
        MR.app.render();
      });
      var ef = host.querySelector('[data-act="exfig"]');
      if (ef) ef.addEventListener('click', function () {
        MR.log('OK', '流程图「图 A」已导出为 SVG，写入图库并登记为论文候选插图');
        ef.textContent = '已导出';
      });
      var re = host.querySelector('[data-act="runexp"]');
      if (re) re.addEventListener('click', function () {
        if (MR.state.expTab !== 'run') { MR.state.expTab = 'run'; MR.app.render(); setTimeout(function () { startRun(document.getElementById('main')); }, 60); return; }
        startRun(host);
      });

      /* 图表 */
      renderInto(host.querySelector('#flowChart'), flowSVG);
      if (tab === 'run') {
        var items = d.samples.map(function (s) {
          return { k: s.id, v: s.ice, sd: s.iceSd, color: s.best ? '--acc' : '--c2', unit: '%', dim: !s.best };
        });
        MR.charts.draw(host.querySelector('#reproChart'), { type: 'bars', items: items, max: 90, height: 214 });
      }
      if (tab === 'analysis') {
        var m = d.trends[MR.state.metric];
        MR.charts.draw(host.querySelector('#trendChart'), {
          type: 'lineErr', height: 250, y0: m.y0, y1: m.y1, unit: m.unit,
          xLabels: ['1 mol%', '2 mol%', '3 mol%'],
          xTitle: 'Zn–Ti 共掺量 x = y', yTitle: m.unit, tipLabel: m.label + ' ',
          series: m.series.map(function (s, i) { return { name: s.name, vals: s.vals, sd: s.sd, color: i === 1 ? '--acc' : (i === 0 ? '--c2' : '--c3'), best: i === 1 }; }),
          base: m.base, baseLabel: '未掺杂基线 ' + m.base, area: true
        });
        MR.charts.draw(host.querySelector('#cycChart'), {
          type: 'linePlain', height: 226, y0: 60, y1: 116, unit: 'mAh g⁻¹', xTitle: '循环圈数',
          xLabels: d.cycling.x.map(String), xSkip: 1,
          series: d.cycling.series.map(function (s, i) { return { name: s.name, vals: s.vals, color: i === 1 ? '--acc' : (i === 0 ? '--c6' : '--c3'), best: i === 1, dash: i === 0 }; })
        });
        MR.charts.draw(host.querySelector('#rateChart'), {
          type: 'linePlain', height: 226, y0: 60, y1: 138, unit: 'mAh g⁻¹', xTitle: '倍率',
          xLabels: d.rate.x,
          series: d.rate.series.map(function (s, i) { return { name: s.name, vals: s.vals, color: i === 1 ? '--acc' : (i === 0 ? '--c6' : '--c3'), best: i === 1, dash: i === 0 }; })
        });
        MR.charts.draw(host.querySelector('#donut1'), {
          type: 'donut', height: 132, segs: [{ name: '达标配方', v: d.stats.passRate, color: '--acc' }, { name: '未达标', v: 1 - d.stats.passRate, color: '--c6' }],
          center: { big: MR.pct(d.stats.passRate, 1), small: '6 / 9 组' }
        });
        MR.charts.draw(host.querySelector('#donut2'), {
          type: 'donut', height: 132, segs: [{ name: '有效批次', v: d.stats.reproRate, color: '--acc' }, { name: '剔除', v: 1 - d.stats.reproRate, color: '--risk' }],
          center: { big: MR.pct(d.stats.reproRate, 1), small: '25 / 27 批' }
        });
        MR.charts.draw(host.querySelector('#radarChart'), {
          type: 'radar', height: 262, axes: d.radar.axes,
          series: d.radar.series.map(function (s, i) { return { name: s.name, vals: s.vals, color: i === 0 ? '--acc' : (i === 1 ? '--c3' : (i === 2 ? '--c6' : '--c2')), best: i === 0 }; })
        });
        MR.charts.draw(host.querySelector('#xrdChart'), {
          type: 'xrd', height: 224, peaks: d.xrd.peaks, shift: d.xrd.shift
        });
        host.querySelectorAll('[data-metric]').forEach(function (b) {
          b.addEventListener('click', function () {
            MR.state.metric = b.getAttribute('data-metric');
            MR.log('INFO', '切换主指标为 <b>' + d.trends[MR.state.metric].label + '</b>');
            MR.app.render();
          });
        });
      }
    }
  };
})();
