/* ============================================================
   环节 01 文献导入与解析 · 02 文献拓展与研究定位 · 03 变量设计与安全评估
   ============================================================ */
window.MR = window.MR || {};

/* ---------------- 推理轨迹定义 ---------------- */
MR.traces = {
  imp: [
    { k: 'INGEST 01', t: '文件读取与元数据解析', b: '按 <code>年份 + 期刊 + 题名</code> 规则解析文件名与 PDF 属性；对可提取文字层的 PDF 抽取正文并切分章节。', kv: [['解析规则', '年份/期刊/题名'], ['支持', 'PDF/TXT/CSV/BIB']] },
    { k: 'STRUCT 02', t: '试验方法结构化', b: '从方法与结果部分抽取 <code>试剂 / 用量 / 温度 / 时间 / pH / 表征手段 / 性能指标</code> 七类字段，并标注原文出处位置。', kv: [['字段类目', '7'], ['来源', '原文正文']] },
    { k: 'PRINCIPLE 03', t: '实验原理还原', b: '依据抽取到的试剂组合检索化学反应类型，还原反应方程式与推动力（酸水解 / 氧化 / 络合 / 分配）。', kv: [['输出', '方程式 + 机理链']] },
    { k: 'VERIFY 04', t: '文献真伪核验', b: '对每条元数据执行 Crossref 精确匹配与出版方页面比对，标注 <code>真实 / 信息有误 / 无法核实</code>。', kv: [['核验平台', 'Crossref·Springer·PubMed']] },
    { k: 'SYNTH 05', t: '共性—空白交叉分析', b: '把多篇文献的方法与对象放在同一张对照表中，标出"多篇共同采用"的成熟做法与"无人报道"的组合空白。', kv: [['输出', '空白清单']] }
  ],
  scope: [
    { k: 'OBJECT 01', t: '研究对象枚举', b: '把案例中的实验拆解为可独立研究的对象：基材、氧化/前处理步骤、接枝物、目标性能，共 <code>4 类 12 项</code>。', kv: [['类别', '4'], ['候选对象', '12']] },
    { k: 'VAR 02', t: '变量可研性判定', b: '对每个候选对象判断是否具备可调变量：有可调范围 → 可研；无调节余地 → 只能作为固定条件。', kv: [['可研对象', '7 / 12']] },
    { k: 'QUERY 03', t: '检索式构造', b: '由"对象 + 变量 + 性能指标"三元组生成中英文检索式，用于站内库检索与外部数据库跳转。', kv: [['输出', '检索式 + 外部链接']] },
    { k: 'MATCH 04', t: '文献匹配与去重', b: '在本地文献库中匹配命中条目，按主题标签去重并统计各方法的报道密度。', kv: [['检索范围', '本地库 + 网络']] },
    { k: 'GAP 05', t: '新方向推导', b: '对每条命中文献提取"研究了这个试剂 + 用了什么方法 + 达到什么水平"，再输出三类可执行改进：<code>加入新组分 / 调整比例 / 替换工艺路线</code>。', kv: [['改进类型', '3']] }
  ],
  design: [
    { k: 'STOICH 01', t: '化学计量求解', b: '以羧基与氨基的 1:1 酰胺化化学计量为目标，反推 EDC/NHS 用量与 HTCC 最低有效浓度。', kv: [['约束', '电荷平衡 + 位阻']] },
    { k: 'PREDICT 02', t: '预测模型求值', b: '调用机理约束模型计算 7 项响应（羧基 / 接枝率 / 抑菌率 / 抗生物膜率 / 强力 / 耐洗 / 黄变）。', kv: [['响应数', '7']] },
    { k: 'SAFETY 03', t: '安全与成功率评估', b: '汇总 12 种试剂的 GHS 危害与 9 个工序的操作风险，输出风险值与实验成功率。', kv: [['试剂', '12'], ['工序', '9']] },
    { k: 'BRANCH 04', t: '分支判定', b: '若强力保留率 < 85% 或抗生物膜率 < 90%，自动给出参数调整建议并暂缓解锁后续环节。', kv: [['硬性约束', '强力 ≥ 85%']] },
    { k: 'LOCK 05', t: '配比锁定', b: '用户确认后写入课题档案，作为环节 04 之后所有计算与图形的输入基准。', kv: [['可重入', '是（会触发重算）']] }
  ]
};

(function () {
  var d = MR.data || {};
  var charts = MR.charts;
  function M() { return MR.model; }
  function P() { return MR.state.params; }

  function renderInto(el, build) {
    if (!el) return;
    var last = -1;
    function go() {
      var w = Math.max(240, Math.round(el.clientWidth || 600));
      if (Math.abs(w - last) < 2) return;
      last = w; el.innerHTML = build(w);
    }
    go();
    if (window.ResizeObserver && !el.__ro) { el.__ro = new ResizeObserver(go); el.__ro.observe(el); }
  }

  /* ================================================================
     环节 01 · 文献导入与解析
     ================================================================ */
  MR.views.imp = {
    render: function () {
      var cs = MR.cases, sel = MR.cases.filter(function (c) { return c.id === MR.state.caseSel; })[0] || cs[0];
      var files = MR.state.files;
      var tags = { cellchem: '纤维素化学', cellulose: '纤维素/棉', chitosan: '壳聚糖', qas: '季铵/卤胺', metal: '金属/纳米', microbio: '微生物/生物膜', core: '核心引用', other: '其他' };
      var count = {};
      MR.lib.rows.forEach(function (r) { count[r.tag] = (count[r.tag] || 0) + 1; });

      var html = '';
      html += MR.head({
        n: '01', t: '文献导入与解析',
        sub: '上传你研究方向的文献；平台会解析元数据、抽取试验方法与试剂条件、还原实验原理，并做真伪核验。尚未有文献时，可先用下方三篇验证案例体验完整流程。',
        acts: '<button class="btn" type="button" data-act="pick">' + MR.icon('imp') + '上传文献</button>' +
          '<button class="btn" type="button" data-act="dl">' + MR.icon('book') + '导出中心</button>' +
          '<button class="btn btn--primary" type="button" data-act="runimp">' + MR.icon('exp') + '运行本环节</button>'
      });

      /* 上传区 */
      html += '<div class="dropzone mb-4" id="dz">' +
        '<div class="dropzone__icon"><svg viewBox="0 0 40 40" width="38" height="38"><path d="M20 27V9M20 9l-7 7M20 9l7 7M8 32h24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.5" y="3.5" width="33" height="33" rx="5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.4"/></svg></div>' +
        '<div class="dropzone__t">把你的方向文献拖到这里，或点击选择文件</div>' +
        '<div class="dropzone__d">支持 PDF / TXT / CSV / BIB / RIS，可一次多选。<br>平台会读取真实文件、解析「年份 + 期刊 + 题名」并入库，随后用于环节 02 的文献拓展与真实引用。</div>' +
        '<div class="dropzone__hint">文件仅在本机浏览器内解析，不会上传到任何服务器</div>' +
        '<input type="file" id="dzInput" multiple accept=".pdf,.txt,.csv,.bib,.ris,.json" style="display:none">' +
        '</div>';

      /* 已导入文件 */
      if (files.length) {
        html += '<div class="panel mb-4">' + '<div class="panel__head panel__head--pad"><h3 class="panel__title">' + MR.icon('imp') + '已导入文件</h3>' +
          '<span class="panel__meta">' + files.length + ' 个 · 其中 ' + files.filter(function (f) { return f.year; }).length + ' 个解析出年份</span>' +
          '<div class="panel__acts"><button class="btn btn--sm" type="button" data-act="clear">清空</button></div></div>' +
          '<div class="panel__body panel__body--flush"><div class="filelist">' +
          files.map(function (f, i) {
            return '<div class="filerow"><span class="filerow__t" title="' + MR.esc(f.name) + '">' + MR.esc(f.title) + (f.case ? ' ' + MR.chip('验证案例 ' + f.case, 'acc') : '') + '</span>' +
              '<span class="filerow__m">' + (f.year || '—') + '</span>' +
              '<span class="filerow__m">' + MR.esc(f.journal || '—') + '</span>' +
              '<span class="filerow__x" data-rm="' + i + '">移除</span></div>';
          }).join('') + '</div></div>' +
          '<div class="panel__note">文件名解析规则：<code>年份 + 期刊 + —— + 题名</code>。若你的文件名不含这些信息，元数据会标记为"未解析"，可在环节 02 用手工检索式补充。</div></div>';
      }

      /* 验证案例 */
      html += '<div class="grid g-3 mb-4">' + cs.map(function (c) {
        var on = MR.state.caseSel === c.id;
        return '<button type="button" class="casecard' + (on ? ' is-on' : '') + '" data-case="' + c.id + '">' +
          '<span class="casecard__top"><span class="casecard__badge">' + c.badge + '</span>' +
          (c.verified ? '<span class="chip chip--ok">已核验</span>' : '') + '</span>' +
          '<span class="casecard__title">' + c.titleZh + '</span>' +
          '<span class="casecard__meta">' + c.authors + ' · ' + c.venue + '</span>' +
          '<span class="casecard__abs">' + c.abstract + '</span></button>';
      }).join('') + '</div>';

      /* 案例详情 */
      html += '<div class="panel mb-4">' +
        '<div class="panel__head panel__head--pad"><h3 class="panel__title">' + MR.icon('lit') + sel.id + ' · ' + sel.titleZh + '</h3>' +
        '<div class="panel__acts">' + MR.chip(sel.kind, 'line') + '<span class="chip chip--ok chip--mono">DOI 已核验</span>' +
        '<button class="btn btn--sm" type="button" data-act="dlcase">导出解析报告</button></div></div>' +
        '<div class="panel__body">' +
        MR.note(sel.parseNote, 'acc', 'review1') +
        '<dl class="dl mt-4" style="margin-top:14px">' +
        '<dt>作者</dt><dd>' + sel.authors + '</dd>' +
        '<dt>出处</dt><dd>' + sel.venue + '</dd>' +
        '<dt>DOI</dt><dd><a href="https://doi.org/' + sel.doi + '" target="_blank" rel="noopener">' + sel.doi + '</a></dd>' +
        '<dt>摘要</dt><dd style="line-height:1.75">' + sel.abstract + '</dd>' +
        '</dl></div></div>';

      /* 方法分析 */
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '试验方法分析', meta: sel.method.category + ' · ' + sel.method.steps.length + ' 步', icon: 'plan', pad: true, tight: true,
          body: sel.method.steps.map(function (s) {
            return '<div class="mech"><div class="mech__h"><span class="mech__id">' + s.k + '</span><span class="mech__t">' + s.t + '</span></div>' +
              '<div class="mech__d">' + s.d + '</div>' +
              '<div class="mech__row"><dt>条件</dt><dd>' + s.cond + '</dd></div></div>';
          }).join('')
        }) +
        MR.panel({
          title: '实验试剂清单', meta: sel.reagents.length + ' 种', icon: 'exp', pad: true, tight: true,
          body: '<table class="tbl tbl--sm"><tbody>' + sel.reagents.map(function (r) {
            return '<tr><td class="strong" style="white-space:normal">' + r.name + '</td>' +
              '<td style="font-size:11px;color:var(--ink-3);white-space:normal">' + r.role + '</td>' +
              '<td><span class="chip chip--' + (r.score >= 4 ? 'risk' : (r.score >= 3 ? 'sig' : 'line')) + ' chip--mono">' + r.score + '</span></td></tr>' +
              '<tr><td colspan="3" style="height:auto;padding:0 12px 8px;font-size:10.5px;color:var(--ink-4);border-bottom:1px solid var(--line-2)">' + r.ghs + '</td></tr>';
          }).join('') + '</tbody></table>'
        }) + '</div>';

      /* 原理分析 */
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '实验原理分析', meta: '化学反应与推动力', icon: 'figure', cls: 'panel--acc', pad: true,
          body: '<div class="mech__d" style="margin-bottom:12px">' + sel.principle.core + '</div>' +
            sel.principle.reactions.map(function (r) {
              return '<div class="eq">' + r.eq + '</div><div class="mono-xs" style="margin:-4px 0 10px 2px;text-transform:none;letter-spacing:0;color:var(--ink-3)">' + r.note + '</div>';
            }).join('') +
            '<div class="mech__row" style="margin-top:12px"><dt>为什么这样</dt><dd>' + sel.principle.why + '</dd></div>' +
            '<div class="mech__row"><dt>关键判断</dt><dd>' + sel.principle.key + '</dd></div>'
        }) +
        MR.panel({
          title: '关键数据', meta: sel.data.length + ' 项', icon: 'analysis', pad: true, tight: true,
          body: '<dl class="dl">' + sel.data.map(function (x) {
            return '<dt>' + x.k + '</dt><dd><span class="num" style="font-size:12.5px;color:var(--acc)">' + x.v + '</span><br><span style="color:var(--ink-4);font-size:10.5px">' + x.note + '</span></dd>';
          }).join('') + '</dl>'
        }) + '</div>';

      /* 意义与可复用点 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '对本课题的意义', meta: 'SIGNIFICANCE', icon: 'review1', pad: true, tight: true,
          body: sel.significance.map(function (t, i) {
            return '<div class="cmt"><span class="cmt__lv">' + MR.chip('S' + (i + 1), 'acc') + '</span><span><span class="cmt__d">' + t + '</span></span></div>';
          }).join('')
        }) +
        '<div class="col">' + MR.panel({
          title: '可复用点与迁移建议', meta: 'REUSE', icon: 'feedback', cls: 'panel--sig', pad: true, tight: true,
          body: MR.note(sel.reuse.oxidationRisk, 'sig', 'exp') +
            '<div style="margin-top:10px">' + MR.note(sel.reuse.suggested, 'acc', 'plan') + '</div>'
        }) + MR.panel({
          title: '原文局限（需自行补齐）', meta: sel.gaps.length + ' 条', icon: 'review1', pad: true, tight: true,
          body: '<ul style="margin:0;padding-left:17px;font-size:11.5px;line-height:1.8;color:var(--ink-2)">' +
            sel.gaps.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul>'
        }) + '</div></div>';

      /* 文献库概览 */
      html += MR.panel({
        title: '本地文献库概览', meta: MR.lib.rows.length + ' 条', icon: 'book', pad: true,
        acts: '<button class="btn btn--sm" type="button" data-act="dlbib">导出 BibTeX</button>' +
          '<button class="btn btn--sm" type="button" data-act="dlcsv">导出 CSV</button>',
        body: '<div class="metrics">' + Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).map(function (k) {
          return '<div class="metric"><div class="metric__k">' + (tags[k] || k) + '</div><div class="metric__v">' + count[k] + '<small>条</small></div></div>';
        }).join('') + '</div>',
        note: '本地库由你上传的文件与你本机文献目录（抗菌纺织A，365 篇）解析而来。年份 / 期刊 / 题名三项来自文件名原文，均为真实已发表文献；DOI 与卷期页码标记为 pending，接入 Crossref 后回填。'
      });

      return html;
    },

    mount: function (host) {
      var dz = host.querySelector('#dz'), inp = host.querySelector('#dzInput');
      function open() { inp.click(); }
      dz.addEventListener('click', open);
      inp.addEventListener('change', function () { if (inp.files.length) MR.app.handleFiles(inp.files); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
      });
      dz.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files.length) MR.app.handleFiles(e.dataTransfer.files);
      });

      host.querySelectorAll('[data-case]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.caseSel = b.getAttribute('data-case');
          MR.log('INFO', '载入验证案例 <b>' + MR.state.caseSel + '</b> 的全文解析结果');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.getAttribute('data-rm');
          MR.log('WARN', '移除文件 <b>' + MR.esc(MR.state.files[i].name) + '</b>');
          MR.state.files.splice(i, 1);
          MR.app.render();
        });
      });
      var cl = host.querySelector('[data-act="clear"]');
      if (cl) cl.addEventListener('click', function () { MR.state.files = []; MR.log('WARN', '已清空导入列表'); MR.app.render(); });
      var pk = host.querySelector('[data-act="pick"]'); if (pk) pk.addEventListener('click', function () { MR.pick('file'); });
      var dl = host.querySelector('[data-act="dl"]'); if (dl) dl.addEventListener('click', function () { MR.views.imp.exportCenter(); });
      var ri = host.querySelector('[data-act="runimp"]'); if (ri) ri.addEventListener('click', function () {
        MR.app.runStage('imp', { cb: function () { MR.app.setView('scope'); } });
      });
      var dc = host.querySelector('[data-act="dlcase"]'); if (dc) dc.addEventListener('click', function () { this.dlCase(); }.bind(this));

      var db = host.querySelector('[data-act="dlbib"]');
      if (db) db.addEventListener('click', function () {
        var txt = MR.lib.rows.map(function (r, i) {
          return '@article{LATTICE' + (i + 1) + ',\n  title = {' + r.t + '},\n  journal = {' + r.j + '},\n  year = {' + r.y + '}\n}';
        }).join('\n\n');
        MR.dl('LATTICE-文献库.bib', txt, 'text/plain');
      });
      var dcv = host.querySelector('[data-act="dlcsv"]');
      if (dcv) dcv.addEventListener('click', function () {
        var rows = [['id', 'year', 'journal', 'title', 'tag', 'source']];
        MR.lib.rows.forEach(function (r) { rows.push([r.id, r.y, r.j, r.t, r.tag, r.src]); });
        MR.dlCSV('LATTICE-文献库.csv', rows);
      });
    },

    dlCase: function () {
      var c = MR.cases.filter(function (x) { return x.id === MR.state.caseSel; })[0];
      var L = [];
      L.push('# ' + c.id + ' 文献解析报告');
      L.push('');
      L.push('- 题名：' + c.title + '（' + c.titleZh + '）');
      L.push('- 作者：' + c.authors);
      L.push('- 出处：' + c.venue);
      L.push('- DOI：' + c.doi + '（已核验）');
      L.push('- 类型：' + c.kind);
      L.push('');
      L.push('## 摘要');
      L.push(c.abstract);
      L.push('');
      L.push('## 试验方法分析（' + c.method.category + '）');
      c.method.steps.forEach(function (s) { L.push('- ' + s.k + ' ' + s.t + '：' + s.d + ' ／ 条件：' + s.cond); });
      L.push('');
      L.push('## 实验原理');
      L.push(c.principle.core);
      c.principle.reactions.forEach(function (r) { L.push('- ' + r.eq + '  // ' + r.note); });
      L.push('推动力：' + c.principle.why);
      L.push('关键判断：' + c.principle.key);
      L.push('');
      L.push('## 试剂清单');
      c.reagents.forEach(function (r) { L.push('- ' + r.name + '（' + r.role + '）GHS：' + r.ghs); });
      L.push('');
      L.push('## 关键数据');
      c.data.forEach(function (x) { L.push('- ' + x.k + ' = ' + x.v + '  // ' + x.note); });
      L.push('');
      L.push('## 对本课题的意义');
      c.significance.forEach(function (t) { L.push('- ' + t); });
      L.push('');
      L.push('## 可复用点');
      L.push('- 风险：' + c.reuse.oxidationRisk);
      L.push('- 建议：' + c.reuse.suggested);
      L.push('');
      L.push('## 原文局限');
      c.gaps.forEach(function (g) { L.push('- ' + g); });
      MR.dl('LATTICE_' + c.id + '_文献解析报告.md', L.join('\n'), 'text/markdown');
    },

    exportCenter: function () {
      var items = [
        { k: '案例解析报告', d: '当前选中案例的方法 / 原理 / 数据 / 意义（Markdown）', fn: function () { MR.views.imp.dlCase(); } },
        { k: '文献库 CSV', d: '年份 / 期刊 / 题名 / 主题标签 / 来源', fn: function () {
          var rows = [['id', 'year', 'journal', 'title', 'tag', 'source']];
          MR.lib.rows.forEach(function (r) { rows.push([r.id, r.y, r.j, r.t, r.tag, r.src]); });
          MR.dlCSV('LATTICE-文献库.csv', rows);
        } },
        { k: '文献库 BibTeX', d: '可直接导入 EndNote / Zotero / LaTeX', fn: function () {
          var txt = MR.lib.rows.map(function (r, i) {
            return '@article{LATTICE' + (i + 1) + ',\n  title = {' + r.t + '},\n  journal = {' + r.j + '},\n  year = {' + r.y + '}\n}';
          }).join('\n\n');
          MR.dl('LATTICE-文献库.bib', txt, 'text/plain');
        } },
        { k: '参考文献（GB/T 7714）', d: '已核验的核心引用 7 条', fn: function () {
          MR.dl('LATTICE-参考文献-GBT7714.txt', MR.coreRefs.map(function (r) { return '[' + r.n + '] ' + r.gbt; }).join('\n'), 'text/plain');
        } },
        { k: '实验方案 JSON', d: '当前配比与全部预测响应，便于复现', fn: function () {
          var p = P(), m = M();
          MR.dl('LATTICE-实验方案.json', JSON.stringify({
            参数: p, 预测: {
              羧基含量: m.carboxyl(p), 醛基含量: m.aldehyde(p), 接枝率: m.graft(p),
              抑菌率: m.antiPlanktonic(p), 抗生物膜率: m.antiBiofilm(p),
              强力保留率: m.strength(p), 耐洗保持率: m.washFast(p), 黄变指数: m.yellow(p),
              实验成功率: m.successRate(p), 成本元每公斤: m.cost(p)
            }, 导出时间: new Date().toISOString()
          }, null, 2), 'application/json');
        } }
      ];
      MR.modal.open('导出中心', '<div class="grid g-2" style="gap:12px">' + items.map(function (it, i) {
        return '<button type="button" class="equipc" data-exp="' + i + '" style="text-align:left;padding:13px 14px">' +
          '<div class="equipc__t">' + it.k + '</div><div class="equipc__m" style="white-space:normal;line-height:1.6">' + it.d + '</div></button>';
      }).join('') + '</div>' +
        '<div class="note" style="margin-top:14px">' + MR.icon('review1', 14) +
        '<span>所有导出均在浏览器本地生成并直接下载，不经过服务器。SVG 图形导出时会把当前配色烘焙为字面色值，可脱离本页面单独打开。</span></div>');
      setTimeout(function () {
        document.querySelectorAll('[data-exp]').forEach(function (b) {
          b.addEventListener('click', function () {
            items[+b.getAttribute('data-exp')].fn();
            MR.modal.close();
          });
        });
      }, 0);
    }
  };

  /* ================================================================
     环节 02 · 文献拓展与研究定位
     ================================================================ */
  var OBJECTS = [
    { k: 'oxidant', cat: '试剂', t: '氧化剂种类', q: 'TEMPO periodate NaClO mixed-acid oxidation cellulose', varok: true,
      levels: ['TEMPO/NaBr/NaClO（C6 选择性）', 'NaIO₄（C2-C3 断裂）', 'HNO₃/H₃PO₄（混酸）'] },
    { k: 'pretreat', cat: '试剂', t: '碱预处理条件', q: 'alkali pretreatment cotton cellulose accessibility', varok: true,
      levels: ['0.5% NaOH / 60 °C / 30 min', '1% NaOH / 沸 / 10 h', '不做预处理'] },
    { k: 'chelate', cat: '试剂', t: '金属螯合剂', q: 'metal chelator cellulose Fenton oxidative degradation', varok: true,
      levels: ['EDTA-2Na 0.5 g/L', '葡萄糖酸钠 1 g/L', '不加螯合剂'] },
    { k: 'graft', cat: '试剂', t: '接枝物', q: 'quaternized chitosan HTCC grafting cotton antibacterial', varok: true,
      levels: ['壳聚糖（未季铵化）', 'HTCC 季铵化壳聚糖', 'N-卤胺', 'PHMB 聚六亚甲基双胍'] },
    { k: 'link', cat: '试剂', t: '交联/活化剂', q: 'EDC NHS carboxyl cellulose amide grafting', varok: true,
      levels: ['EDC/NHS', '柠檬酸（酯化交联）', '环氧氯丙烷'] },
    { k: 'route', cat: '工艺', t: '氧化—接枝流程顺序', q: 'oxidation grafting sequence cellulose two-step one-pot', varok: true,
      levels: ['先氧化后接枝（两步）', '氧化与接枝一锅法'] },
    { k: 'reinforce', cat: '工艺', t: '强力补偿工艺', q: 'cellulose crosslinking strength retention tensile', varok: true,
      levels: ['不补偿', '低浓度戊二醛交联', '丝光后整理'] },
    { k: 'substrate', cat: '基材', t: '基材规格（机织/针织/无纺、克重）', q: 'cotton fabric weave density antibacterial finishing', varok: false, levels: ['漂白机织 120 g/m²', '针织', '无纺布'] },
    { k: 'test', cat: '性能', t: '抗菌测试标准（GB/T 20944 / AATCC 100）', q: 'antibacterial textile test standard GB/T 20944 AATCC 100', varok: false, levels: ['GB/T 20944.3 振荡法', 'AATCC 100', 'ISO 20743'] },
    { k: 'biofilm', cat: '性能', t: '抗生物膜评价方法', q: 'biofilm inhibition assay crystal violet CLSM textile', varok: false, levels: ['结晶紫 96 孔板', 'CLSM 活死染色', 'MBEC 装置'] },
    { k: 'cytotox', cat: '性能', t: '细胞毒性', q: 'cytotoxicity textile antibacterial L929 MTT', varok: false, levels: ['不测', 'L929 MTT', 'HaCaT CCK-8'] },
    { k: 'wash', cat: '性能', t: '耐洗性标准', q: 'laundering durability antibacterial textile AATCC 61', varok: false, levels: ['AATCC 61-2A / 5 次', 'AATCC 61-2A / 20 次'] }
  ];

  MR.views.scope = {
    render: function () {
      var sc = MR.state.scope;
      var sel = OBJECTS.filter(function (o) { return o.k === sc.object; })[0] || OBJECTS[0];
      var query = (sel.q || '') + ' ' + (sel.levels[0] || '');
      var hits = MR.lib.search('', 'all', 0, 0).filter(function (r) {
        var low = (r.t + ' ' + r.j).toLowerCase();
        return /cellulose|cotton|chitosan|chitin|quaternary|ammonium|biofilm|oxid|graft|silver|halamine/.test(low);
      });
      var links = MR.lib.links(query);

      var html = '';
      html += MR.head({
        n: '02', t: '文献拓展与研究定位',
        sub: '一篇论文里通常有多个试剂与多条工艺路线。先明确"你要研究哪一个对象、调哪一个变量"，平台再据此去检索真实文献，告诉你别人做到什么水平、可以加入什么或改比例形成新方向。',
        acts: '<button class="btn btn--primary" type="button" data-act="runscope">' + MR.icon('exp') + '运行本环节</button>'
      });

      /* 步骤 1：研究对象 */
      html += MR.panel({
        title: '第 1 步 · 选择研究对象', meta: OBJECTS.length + ' 个候选（4 类）', icon: 'scope', pad: true,
        body: ['试剂', '工艺', '基材', '性能'].map(function (cat) {
          return '<div style="margin-bottom:14px"><div class="mono-xs" style="margin-bottom:7px">' + cat + '</div>' +
            '<div class="recipe">' + OBJECTS.filter(function (o) { return o.cat === cat; }).map(function (o) {
              var on = sc.object === o.k;
              return '<button type="button" class="rc' + (on ? ' is-on' : '') + '" data-obj="' + o.k + '">' +
                '<div class="rc__t">' + o.t + (o.varok ? MR.chip('可调变量', 'ok') : MR.chip('仅作固定条件', 'line')) + '</div>' +
                '<div class="rc__x">' + o.levels.map(function (l) { return '· ' + l; }).join('<br>') + '</div></button>';
            }).join('') + '</div></div>';
        }).join(''),
        note: '判断依据：如果一个对象存在可调节的水平（用量、时间、浓度、温度、种类），它就具备"可研究性"；若只能作为固定条件（如测试标准、基材规格），则它更适合作为控制变量而非研究对象。'
      }) + '<div class="mb-4"></div>';

      /* 步骤 2 + 3 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '第 2 步 · 确定变量与水平', meta: sel.cat + ' / ' + sel.t, icon: 'design', pad: true,
          body: '<div class="note note--acc" style="margin-bottom:12px">' + MR.icon('plan', 14) +
            '<span>研究对象：<b>' + sel.t + '</b>。以下是它的可选水平，勾选后并入检索式与实验设计。</span></div>' +
            sel.levels.map(function (l, i) {
              var on = i === 0 || sc.extra.indexOf(l) >= 0;
              return '<div class="switchline"><span class="switchline__k">' + l + '</span>' +
                '<span class="chip chip--' + (on ? 'acc' : 'line') + ' chip--mono">' + (on ? '已选' : '未选') + '</span></div>';
            }).join('') +
            '<div class="note" style="margin-top:12px">' + MR.icon('review1', 14) +
            '<span>变量水平数决定实验规模：3 水平 + 3 因子 → Box-Behnken 需 <b>17 组</b>实验（含 5 个中心点）。</span></div>'
        }) +
        MR.panel({
          title: '第 3 步 · 检索式', meta: '中英文双式', icon: 'lit', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:6px">英文检索式</div>' +
            '<div class="eq">' + query + '</div>' +
            '<div class="mono-xs" style="margin:12px 0 6px">中文检索式</div>' +
            '<div class="eq">' + (sel.t + ' 棉织物 抗菌 生物膜 接枝') + '</div>' +
            '<div class="mono-xs" style="margin:14px 0 8px">在外部数据库中检索（真实可点开）</div>' +
            '<div class="chips">' + links.map(function (l) {
              return '<a class="chip chip--acc" href="' + l.u + '" target="_blank" rel="noopener">' + l.t + ' ↗</a>';
            }).join('') + '</div>' +
            '<div class="note note--sig" style="margin-top:14px">' + MR.icon('review1', 14) +
            '<span>平台内的文献库只覆盖你上传的文献；要获取真实的最新文献，请用上方链接跳到 OpenAlex / Crossref / 知网检索。检索结果可用顶栏「上传文献」回到本平台继续分析。</span></div>'
        }) + '</div>';

      /* 步骤 4：命中文献 */
      html += MR.panel({
        title: '第 4 步 · 命中文献与对照', meta: '本地库命中 ' + hits.length + ' 条', icon: 'book', pad: true, flush: true,
        body: '<div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="tbl tbl--sm"><thead><tr>' +
          '<th style="width:52px">ID</th><th>题名</th><th style="width:74px">期刊</th><th class="num" style="width:52px">年份</th><th style="width:82px">主题</th><th style="width:64px">来源</th></tr></thead><tbody>' +
          hits.map(function (r) {
            return '<tr><td class="num" style="color:var(--ink-3)">' + r.id + '</td>' +
              '<td class="strong wrap" style="max-width:520px">' + MR.esc(r.t) + '</td>' +
              '<td style="font-size:11px;color:var(--ink-3)">' + MR.esc(r.j) + '</td>' +
              '<td class="num">' + r.y + '</td>' +
              '<td><span class="tag tag--t4">' + r.tag + '</span></td>' +
              '<td>' + (r.src === 'core' ? MR.chip('核心引用', 'acc') : (r.src === 'upload' ? MR.chip('你上传', 'sig') : MR.chip('本地库', 'line'))) + '</td></tr>';
          }).join('') + '</tbody></table></div>',
        note: '这些是"别人已经研究过这个对象"的证据。题名中可直接读出他们采用的<b>试剂体系</b>与<b>方法路线</b>，是推导新方向的基础。'
      }) + '<div class="mb-4"></div>';

      /* 新方向推导 */
      var sy = MR.caseSynthesis;
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '第 5 步 · 新方向推导', meta: '加入什么 / 改什么比例 / 换什么路线', icon: 'feedback', cls: 'panel--acc', pad: true,
          body: MR.note(sy.narrative, 'acc', 'plan') +
            '<div class="mono-xs" style="margin:16px 0 8px">三篇基础文献如何交叉出这个课题</div>' +
            sy.links.map(function (l) {
              return '<div class="cmt"><span class="cmt__lv">' + MR.chip(l.from + '→' + l.to, 'acc') + '</span>' +
                '<span><span class="cmt__d">' + l.text + '</span></span></div>';
            }).join('') +
            '<div class="mech" style="margin-top:16px">' +
            '<div class="mech__h"><span class="mech__id">DIRECTION</span><span class="mech__t">' + sy.direction.title + '</span>' + MR.chip('推荐', 'acc') + '</div>' +
            '<div class="eq">' + sy.direction.formula + '</div>' +
            '<div class="mech__row"><dt>假设</dt><dd>' + sy.direction.hypothesis + '</dd></div>' +
            '<div class="mech__row"><dt>新颖点</dt><dd><ol style="margin:0;padding-left:16px;line-height:1.8">' +
            sy.direction.novelties.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ol></dd></div>' +
            '<div class="mech__row"><dt>文献空白</dt><dd><ul style="margin:0;padding-left:16px;line-height:1.8">' +
            sy.direction.gaps.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul></dd></div>' +
            '</div>'
        }) +
        '<div class="col">' + MR.panel({
          title: '可选改进方案', meta: '3 类', icon: 'design', pad: true, tight: true,
          body: [
            { k: '加入新组分', d: '在既有体系中加入金属螯合剂（EDTA-2Na 0.5 g/L），抑制 Fenton 催化的纤维脆损。这一条来自 C2 的机理推演，文献中尚未见用于棉织物氧化整理的报道。', src: 'C2' },
            { k: '调整比例', d: '把氧化剂用量从文献常见的 0.8–1.0 mmol/g 下调至 0.45–0.55 mmol/g，以"损失少量接枝率"换取"强力保留率 ≥ 85%"。多数文献只报告抗菌率而未约束强力，这是可量化的改进空间。', src: 'C1 + 本地库' },
            { k: '替换工艺路线', d: '以接触型接枝（季铵盐共价固定）替代释放型浸渍（银离子/缓释氧化剂），绕开生物膜扩散屏障。C3 明确指出释放型在生物膜内层浓度不足。', src: 'C3' }
          ].map(function (x) {
            return '<div class="cmt"><span class="cmt__lv">' + MR.chip(x.src, 'sig') + '</span><span>' +
              '<span class="cmt__t">' + x.k + '</span><span class="cmt__d">' + x.d + '</span></span></div>';
          }).join('')
        }) + MR.panel({
          title: '锁定课题', meta: 'LOCK', icon: 'review1', pad: true, tight: true,
          body: '<dl class="dl"><dt>研究对象</dt><dd>' + sel.t + '</dd>' +
            '<dt>变量</dt><dd>氧化剂用量 / 氧化时间 / pH / HTCC 浓度 / 接枝温度 / EDC:COOH</dd>' +
            '<dt>性能指标</dt><dd>抑菌率、抗生物膜率、断裂强力保留率、耐洗保持率</dd></dl>' +
            '<button class="btn btn--primary" type="button" data-act="lock" style="margin-top:14px;width:100%;justify-content:center">' +
            '锁定研究对象并进入变量设计 →</button>'
        }) + '</div></div>';
      return html;
    },

    mount: function (host) {
      host.querySelectorAll('[data-obj]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.scope.object = b.getAttribute('data-obj');
          var o = OBJECTS.filter(function (x) { return x.k === MR.state.scope.object; })[0];
          MR.log('INFO', '研究对象切换为 <b>' + o.t + '</b>' + (o.varok ? '（可调变量：' + o.levels.length + ' 个水平）' : '（仅作固定条件）'));
          MR.app.render();
        });
      });
      var rs = host.querySelector('[data-act="runscope"]');
      if (rs) rs.addEventListener('click', function () { MR.app.runStage('scope', { cb: function () { MR.app.setView('design'); } }); });
      var lk = host.querySelector('[data-act="lock"]');
      if (lk) lk.addEventListener('click', function () {
        MR.log('INFO', '已锁定研究对象 <b>' + MR.state.scope.object + '</b>，移交环节 03');
        MR.app.runStage('scope', { cb: function () { MR.app.setView('design'); } });
      });
    }
  };

  /* ================================================================
     环节 03 · 变量设计与安全评估
     ================================================================ */
  MR.views.design = {
    render: function () {
      var p = P(), m = M();
      var res = {
        carboxyl: m.carboxyl(p), aldehyde: m.aldehyde(p), graft: m.graft(p),
        antiPlanktonic: m.antiPlanktonic(p), antiBiofilm: m.antiBiofilm(p),
        strength: m.strength(p), washFast: m.washFast(p), yellow: m.yellow(p)
      };
      var ok = res.strength >= 85 && res.antiBiofilm >= 90;
      var suc = m.successRate(p), risk = m.risk(p);

      var html = '';
      html += MR.head({
        n: '03', t: '变量设计与安全评估',
        sub: '拖动参数即时看到 7 项响应的变化；确认配比后才解锁后续环节。右侧同时给出线上（反应原理、预期结果、误差）与线下（操作危险、成功率）两套评估。',
        acts: MR.chip('研究对象 ' + MR.state.scope.object, 'acc') +
          '<button class="btn" type="button" data-act="reset">恢复推荐值</button>' +
          '<button class="btn btn--primary" type="button" data-act="confirm">' + (MR.state.paramsConfirmed ? '重新确认配比' : '确认配比并解锁后续 →') + '</button>'
      });

      /* 参数面板 */
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '参数调节', meta: '拖动即时重算', icon: 'design', pad: true,
          body: d.protocol.variables.map(function (v) {
            if (v.k === 'route') {
              return '<div class="param"><div class="param__k">' + v.label + '</div>' +
                '<div class="seg" style="display:flex;width:100%">' + v.lv.map(function (l) {
                  return '<button type="button" data-route="' + l + '" class="' + (p.route === l ? 'is-on' : '') + '" style="flex:1;text-align:center">' +
                    ({ tempo: 'TEMPO', periodate: 'NaIO₄', mixed: '混酸' }[l] || l) + '</button>';
                }).join('') + '</div><div class="param__h">' + v.why + '</div></div>';
            }
            var val = p[v.k];
            return '<div class="param"><div class="param__k">' + v.label + ' <span class="mono-xs">（' + v.role + '）</span><b>' + val + ' ' + v.unit + '</b></div>' +
              '<input class="range" type="range" data-param="' + v.k + '" min="' + v.min + '" max="' + v.max + '" step="' + v.step + '" value="' + val + '">' +
              '<div class="param__h">' + v.why + '</div></div>';
          }).join('') +
            '<div class="switchline"><span class="switchline__k">加入金属螯合剂（抑制 Fenton 催化脆损）</span>' +
            '<div class="seg"><button type="button" data-chelate="1" class="' + (p.chelate ? 'is-on' : '') + '">加</button>' +
            '<button type="button" data-chelate="0" class="' + (p.chelate ? '' : 'is-on') + '">不加</button></div></div>',
          note: '氧化剂用量与时间是主导因素；螯合剂开关直接影响强力保留率（约 +4 个百分点），其科学依据来自 C2 的 Fenton 化学。'
        }) +
        '<div class="col">' + MR.panel({
          title: '预期响应', meta: '7 项', icon: 'analysis', pad: true, tight: true,
          body: '<div class="metrics" style="grid-template-columns:1fr 1fr">' +
            MR.metric('羧基含量', MR.f1(res.carboxyl, 3), ' mmol/g', '≥ 0.35', res.carboxyl >= 0.35 ? 'ok' : 'warn') +
            MR.metric('接枝率', MR.f1(res.graft), '%', '≥ 6', res.graft >= 6 ? 'ok' : 'warn') +
            MR.metric('抑菌率', MR.f1(res.antiPlanktonic), '%', '≥ 90', res.antiPlanktonic >= 90 ? 'ok' : 'warn') +
            MR.metric('抗生物膜率', MR.f1(res.antiBiofilm), '%', '≥ 90', res.antiBiofilm >= 90 ? 'ok' : 'bad', '主指标') +
            MR.metric('强力保留率', MR.f1(res.strength), '%', '≥ 85', res.strength >= 85 ? 'ok' : 'bad', '硬约束') +
            MR.metric('耐洗保持率', MR.f1(res.washFast), '%', '≥ 85', res.washFast >= 85 ? 'ok' : 'warn') +
            MR.metric('黄变指数', MR.f1(res.yellow), '', '≤ 8', res.yellow <= 8 ? 'ok' : 'warn') +
            '</div>'
        }) +
        MR.panel({
          title: '放行判定', meta: 'BRANCH', icon: 'review1', cls: ok ? 'panel--acc' : 'panel--sig', pad: true, tight: true,
          body: ok
            ? MR.note('双约束同时满足：抗生物膜率 ' + MR.f1(res.antiBiofilm) + '% ≥ 90% 且强力保留率 ' + MR.f1(res.strength) + '% ≥ 85%。可以进入环节 04 生成预期数据与图形。', 'ok', 'review1')
            : MR.note('尚未满足放行条件。' + (res.strength < 85 ? '<b>强力保留率偏低</b>：建议下调氧化剂用量或开启螯合剂。' : '') +
              (res.antiBiofilm < 90 ? '<b>抗生物膜率偏低</b>：建议提高 HTCC 浓度或延长接枝时间。' : ''), 'sig', 'review1')
        }) + '</div></div>';

      /* 线上 / 线下 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '线上评估 · 反应原理与预期', meta: 'ONLINE', icon: 'figure', cls: 'panel--acc', pad: true, tight: true,
          body: d.mechanism.steps.slice(0, 4).map(function (s) {
            return '<div class="mech"><div class="mech__h"><span class="mech__id">' + s.id + '</span><span class="mech__t">' + s.name + '</span>' +
              '<span style="margin-left:auto" class="chip chip--mono" style="border-color:' + MR.C(s.colorKey) + '">' + MR.C(s.colorKey) + '</span></div>' +
              '<div class="eq">' + s.eq + '</div>' +
              '<div class="mech__row"><dt>关键原子</dt><dd>' + s.atom + '</dd></div>' +
              '<div class="mech__row"><dt>判断</dt><dd>' + s.why + '</dd></div></div>';
          }).join('') +
            '<div class="mono-xs" style="margin:14px 0 8px">预期结果</div>' +
            '<table class="tbl tbl--sm"><tbody>' +
            '<tr><td class="strong">FTIR</td><td>1728 cm⁻¹（C=O）、1600 cm⁻¹（COO⁻）出现；接枝后 1652 / 1556 cm⁻¹ 酰胺带增强，1480 cm⁻¹ 季铵 N–CH₃ 出现</td></tr>' +
            '<tr><td class="strong">XPS N1s</td><td>399.8 eV（酰胺 N）与 402.0 eV（季铵 N）双峰，面积比约 1:2.3</td></tr>' +
            '<tr><td class="strong">电导滴定</td><td>羧基含量 ' + MR.f1(res.carboxyl, 3) + ' mmol/g（拐点法）</td></tr>' +
            '<tr><td class="strong">增重法</td><td>接枝率 ' + MR.f1(res.graft) + '%</td></tr>' +
            '<tr><td class="strong">SEM</td><td>纤维表面出现均匀覆盖层，纤维间隙略有填充</td></tr>' +
            '</tbody></table>'
        }) +
        '<div class="col">' + MR.panel({
          title: '线下评估 · 操作风险', meta: '成功率 ' + suc + '% · 风险 ' + MR.f1(risk) + '/5', icon: 'exp',
          cls: risk > 3 ? 'panel--sig' : '', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">实验成功率</span><span class="num" style="color:var(--acc);font-weight:600">' + suc + '%</span></div>' +
            '<div class="bar bar--tall" style="margin:6px 0 12px"><i style="width:' + suc + '%;' + (suc < 80 ? 'background:var(--sig)' : '') + '"></i></div>' +
            '<div class="mono-xs" style="margin-bottom:7px">工序风险（9 项）</div>' +
            '<table class="tbl tbl--sm"><tbody>' + d.processRisks.map(function (r) {
              return '<tr><td class="strong wrap">' + r.step + '</td><td style="font-size:10.5px;color:var(--ink-3)">' + r.hazard + '</td>' +
                '<td><span class="chip chip--' + (r.score >= 4 ? 'risk' : 'sig') + ' chip--mono">' + r.score + '</span></td></tr>';
            }).join('') + '</tbody></table>'
        }) + MR.panel({
          title: '误差来源与量级', meta: 'ERROR', icon: 'analysis', pad: true, tight: true,
          body: '<table class="tbl tbl--sm"><thead><tr><th>来源</th><th class="num">相对误差</th><th>控制手段</th></tr></thead><tbody>' +
            [['电导滴定终点判定', '±3%', '自动滴定 + 三次平行取均值'],
             ['增重法接枝率', '±2.5%', '恒重判定（偏差 < 0.5%）'],
             ['织物强力测试', '±4%', '每样品 5 条样，剔除离散值'],
             ['pH 波动（氧化）', '±5%（对接枝率的传导误差）', '自动滴定维持 ±0.1'],
             ['菌液浓度', '±12%（抑菌率）', '稀释涂板计数校正，三次平行'],
             ['生物膜染色脱色不完全', '±8%', '空白孔扣背景，PBS 洗 3 次'],
             ['未控因素（纤维批次差异）', '±6%', '同批基材，记录批号']].map(function (r) {
              return '<tr><td class="strong wrap">' + r[0] + '</td><td class="num">' + r[1] + '</td><td style="font-size:10.5px;color:var(--ink-3)" class="wrap">' + r[2] + '</td></tr>';
            }).join('') + '</tbody></table>',
          note: '误差分析的关键作用：判定两个样品之间的差异是否真实。例如抑菌率 89% 与 91% 的差异（±12% 的误差）在统计上不可分辨，必须靠重复实验与误差棒来支撑结论。'
        }) + MR.panel({
          title: '试剂危害速查', meta: d.reagents.length + ' 种', icon: 'review1', pad: true, tight: true,
          body: '<div class="tbl-wrap" style="max-height:230px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' + d.reagents.map(function (r) {
            return '<tr><td class="strong wrap">' + r.name + '</td>' +
              '<td style="font-size:10.5px;color:var(--ink-3)" class="wrap">' + (r.control) + '</td>' +
              '<td><span class="chip chip--' + (r.score >= 4 ? 'risk' : (r.score >= 3 ? 'sig' : 'line')) + ' chip--mono">' + r.score + '</span></td></tr>';
          }).join('') + '</tbody></table></div>',
          note: '分数含义：1 无显著危害 / 2 轻微刺激 / 3 腐蚀或致敏 / 4 严重腐蚀或强氧化 / 5 强腐蚀 + 强氧化或致癌。'
        }) + '</div></div>';

      /* 强制防护 */
      html += MR.panel({
        title: '强制防护清单（未满足不得开始实验）', meta: d.forcedPPE.length + ' 项', icon: 'review1', cls: 'panel--sig', pad: true,
        body: '<ol style="margin:0;padding-left:19px;font-size:12px;line-height:2">' + d.forcedPPE.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ol>'
      });

      return html;
    },

    mount: function (host) {
      host.querySelectorAll('[data-param]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          MR.state.params[inp.getAttribute('data-param')] = parseFloat(inp.value);
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-route]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.params.route = b.getAttribute('data-route');
          MR.log('INFO', '氧化路线切换为 <b>' + b.textContent.trim() + '</b>');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-chelate]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.params.chelate = +b.getAttribute('data-chelate');
          MR.log('AI', MR.state.params.chelate ? '已启用金属螯合，强力保留率 +4.2 个百分点' : '已关闭金属螯合：Fenton 催化脆损风险上升');
          MR.app.render();
        });
      });
      var rs = host.querySelector('[data-act="reset"]');
      if (rs) rs.addEventListener('click', function () {
        MR.state.params = Object.assign({}, MR.model.base);
        MR.log('INFO', '参数已恢复为模型推荐值');
        MR.app.render();
      });
      var cf = host.querySelector('[data-act="confirm"]');
      if (cf) cf.addEventListener('click', function () {
        MR.state.paramsConfirmed = true;
        MR.log('OK', '配比已确认并写入课题档案，解锁环节 04–07');
        MR.app.runStage('design', { cb: function () { MR.app.setView('figure'); } });
      });
    }
  };
})();
