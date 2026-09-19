/* ============================================================
   环节 05 · 论文写作 —— 结构规划 / 文段生成 / 引用绑定 / 术语一致性
   环节 06 · 论文评审 —— 三重一致性核对 / 引用核验 / 遗漏条件 / 绘图建议 / GB-T 7714 导出
   ============================================================ */
(function () {
  var d = MR.data;
  MR.state.citeSel = MR.state.citeSel || null;

  function citeOf(n) {
    for (var i = 0; i < d.citations.length; i++) if (d.citations[i].n === n) return d.citations[i];
    return null;
  }
  function paperOf(id) {
    for (var i = 0; i < d.papers.length; i++) if (d.papers[i].id === id) return d.papers[i];
    return null;
  }

  /* 把 <cite>n</cite> / <cite>a,b</cite> 转成可点击上标 */
  function bindCites(html) {
    return html.replace(/<cite>([\d,\s]+)<\/cite>/g, function (m, g) {
      return g.split(',').map(function (x) {
        var n = x.trim();
        var bad = n === '3';
        return '<span class="cite' + (bad ? ' is-bad' : '') + '" data-cite="' + n + '" title="点击查看引用溯源">[' + n + ']</span>';
      }).join('');
    });
  }

  function citeTraceHTML() {
    var sel = MR.state.citeSel;
    return MR.panel({
      title: '引用溯源', meta: d.citations.length + ' 处绑定', icon: 'lit', pad: true, cls: 'panel--acc',
      body: (sel ? (function () {
        var c = citeOf(+sel);
        if (!c) return '';
        var p = paperOf(c.ref);
        return '<div class="note note--acc" style="margin-bottom:12px;flex-direction:column;gap:5px">' +
          '<div style="display:flex;gap:8px;align-items:center">' + MR.icon('lit', 14) +
          '<b>[' + c.n + '] ' + c.type + '</b><span class="chip chip--line" style="margin-left:auto">' + c.ref + '</span></div>' +
          '<div style="color:var(--ink-2);font-size:11.5px">所支撑的论断：' + c.use + '</div>' +
          '<div style="color:var(--ink-3);font-size:11.5px">' + (p ? p.authors + ' · ' + p.venue + ' · ' + p.year : '') + '</div>' +
          '</div>';
      })() : '') +
        '<div class="rowlist" style="margin:0 -18px">' + d.citations.map(function (c) {
          var p = paperOf(c.ref);
          var on = sel && +sel === c.n;
          return '<div class="ref-item' + (on ? ' is-flagged' : '') + '" data-citerow="' + c.n + '" style="padding-left:18px;padding-right:18px;cursor:pointer">' +
            '<div class="ref-item__n">[' + c.n + ']</div><div>' +
            '<div class="ref-item__t">' + (p ? p.title : '') + '</div>' +
            '<div class="ref-item__m">' + c.type + ' · ' + c.ref + ' · 支撑"' + c.use + '"</div></div></div>';
        }).join('') + '</div>',
      note: '每处引用都登记了"引用类型 + 所支撑的具体论断"。这一层绑定让环节 06 的引用核验成为可能——只有知道引用在支撑什么，才能判断引用是否恰当。'
    });
  }

  function termHTML() {
    var terms = [
      ['首圈库仑效率', 6, 'ok'], ['层状氧化物', 5, 'ok'], ['阳离子混排', 5, 'ok'],
      ['共沉淀法', 4, 'ok'], ['电化学阻抗谱（EIS）', 2, 'ok'], ['O3→P3 相变', 3, 'ok'],
      ['微分容量（dQ/dV）', 1, 'warn'], ['压实密度', 0, 'risk']
    ];
    return MR.panel({
      title: '术语一致性校验', meta: '18 个术语 · 修正 3 处', icon: 'review1', pad: true, tight: true,
      body: terms.map(function (t) {
        return '<div class="switchline"><span class="switchline__k">' + t[0] + '</span>' +
          '<span class="chip chip--' + t[2] + ' chip--mono">' + t[1] + ' 次</span></div>';
      }).join('') +
        '<div class="note note--sig" style="margin-top:12px">' + MR.icon('review1', 14) +
        '<span>「微分容量」在全文中仅出现 1 次，且所在段落引用了 dQ/dV 曲线（图 5 建议），术语与图表尚未闭环；「压实密度」在正文中出现 0 次，属评审指出的遗漏条件。</span></div>'
    });
  }

  MR.views.paper = {
    render: function () {
      var m = d.manuscript;
      var st = MR.state.stage.paper;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 05 / 06</span>论文写作</h1>' +
        '<p class="view__sub">文段中的每一个数值都来自环节 04 的实验记录与表征文件，每一处引用都绑定到文献库条目。禁止引入任何未在本课题数据中出现过的数值。</p></div>' +
        '<div class="view__acts">' +
        '<button class="btn" type="button" data-act="refs">' + MR.icon('book') + '参考文献</button>' +
        '<button class="btn" type="button" data-act="export">' + MR.icon('paper') + '导出文稿</button>' +
        '<button class="btn btn--primary" type="button" data-act="genpaper">' + MR.icon('paper') + (st === 'done' ? '重新生成' : '生成论文') + '</button>' +
        '</div></div>';

      html += '<div class="grid g-5 mb-4">' +
        MR.kpi({ label: '正文字数', val: m.words.toLocaleString(), unit: '字', foot: '4 节 · 4 图 2 表', cls: 'kpi--acc' }) +
        MR.kpi({ label: '引用绑定', val: d.citations.length, unit: '处', foot: '4 类引用类型' }) +
        MR.kpi({ label: '数值来源', val: '100%', foot: '全部取自实验记录' }) +
        MR.kpi({ label: '术语校验', val: '18', unit: '个', foot: '修正 3 处不一致' }) +
        MR.kpi({ label: '待补插图', val: d.peerReview.figures.length, unit: '张', foot: '由环节 06 提出' }) +
        '</div>';

      html += '<div class="grid g-2-1">' +
        MR.panel({
          title: m.title, meta: m.en, icon: 'paper', pad: true,
          acts: '<span class="chip chip--mono chip--line">DEMO 文稿</span>',
          body: '<div class="paper">' + m.sections.map(function (sec) {
            return '<h2><span class="sn">' + sec.sn + '</span>' + sec.k + '</h2>' +
              sec.body.map(function (p, i) {
                if (sec.k === '摘要' && i > 0) return '<p style="font-size:12.5px;color:var(--ink-2)">' + p + '</p>';
                var cls = (sec.k === '摘要' && i === 0) ? ' class="abs"' : '';
                return '<p' + cls + ' style="animation:viewIn .5s var(--ease) both;animation-delay:' + (i * 70) + 'ms">' + bindCites(p) + '</p>';
              }).join('');
          }).join('') + '</div>',
          note: '点击文中任意上标引用（如 [8]）可在右侧「引用溯源」中定位到对应的文献条目与所支撑的论断。红色删除线标记的引用为环节 06 判定存在类型不匹配的条目。'
        }) +
        '<div class="col">' + citeTraceHTML() + termHTML() +
        MR.panel({
          title: '写作规范', meta: 'COMPLIANCE', icon: 'review1', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">数值可追溯</span><span class="chip chip--ok chip--mono">4,286 字 / 0 例外</span></div>' +
            '<div class="switchline"><span class="switchline__k">单位规范（SI）</span><span class="chip chip--ok chip--mono">通过</span></div>' +
            '<div class="switchline"><span class="switchline__k">专业术语使用</span><span class="chip chip--ok chip--mono">18 项</span></div>' +
            '<div class="switchline"><span class="switchline__k">被动语态/客观陈述</span><span class="chip chip--sig chip--mono">3 处待改</span></div>'
        }) + '</div></div>';

      return html;
    },
    mount: function (host) {
      host.querySelectorAll('[data-cite]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.citeSel = b.getAttribute('data-cite');
          var c = citeOf(+MR.state.citeSel);
          MR.log('AI', '引用 [<b>' + MR.state.citeSel + '</b>] → ' + (c ? c.ref + ' · ' + c.type + ' · 支撑"' + c.use + '"' : ''));
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-citerow]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.citeSel = b.getAttribute('data-citerow');
          MR.app.render();
        });
      });
      var g = host.querySelector('[data-act="genpaper"]');
      if (g) g.addEventListener('click', function () {
        MR.state.paperReady = true;
        MR.app.runStage('paper', { force: MR.state.stage.paper === 'done', cb: function () { MR.app.setView('peer'); } });
      });
      var r = host.querySelector('[data-act="refs"]');
      if (r) r.addEventListener('click', function () { MR.app.openPanel('refs'); });
      var e = host.querySelector('[data-act="export"]');
      if (e) e.addEventListener('click', function () {
        MR.modal.open('导出文稿', '<dl class="dl">' +
          '<dt>格式</dt><dd>DOCX（含题录域，可自动更新参考文献编号）/ PDF / LaTeX</dd>' +
          '<dt>章节</dt><dd>摘要 · 引言 · 实验方法 · 结果与讨论 · 结论（4 节 + 摘要）</dd>' +
          '<dt>引用</dt><dd>' + d.citations.length + ' 处，采用 GB/T 7714-2015 顺序编码制</dd>' +
          '<dt>图表</dt><dd>已生成 1 张流程图（图 A）；' + d.peerReview.figures.length + ' 张建议补充的实验图待拍摄</dd>' +
          '</dl>' +
          '<div class="note note--sig" style="margin-top:14px">' + MR.icon('review1', 14) +
          '<span>环节 06 的评审尚未完成：有 4 项一致性问题与 3 项遗漏条件待修订。建议在评审通过后再正式导出投稿版本。</span></div>',
          '<button class="btn" data-close="1">取消</button><button class="btn btn--primary" data-close="1">导出草稿</button>');
      });
    }
  };

  /* ============ 环节 06 ============ */
  MR.views.peer = {
    render: function () {
      var pr = d.peerReview;
      var html = '';
      html += '<div class="view__head"><div>' +
        '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 06 / 06</span>论文评审 · 一致性核验与投稿准备</h1>' +
        '<p class="view__sub">把「论文文段」「科研流程图」「实验数据」三者放在一起逐条比对，并核验引用类型、遗漏条件与图表完备性——这一步要证明"写出来的"和"做出来的"是同一件事。</p></div>' +
        '<div class="view__acts">' +
        '<span class="chip chip--sig">' + pr.verdict + '</span>' +
        '<button class="btn btn--primary" type="button" data-act="runpeer">' + MR.icon('peer') + '开始评审</button>' +
        '</div></div>';

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '评审综合分', val: pr.score.toFixed(2), unit: '/ 1.00', foot: '阈值 0.75 · 小修', cls: 'kpi--acc' }) +
        MR.kpi({ label: '一致性核对', val: pr.consistency.length, unit: '条', foot: '2 通过 · 4 待修' }) +
        MR.kpi({ label: '引用问题', val: pr.citationChecks.filter(function (c) { return c.level !== 'ok'; }).length, unit: '条', foot: '含 1 条类型不匹配' }) +
        MR.kpi({ label: '绘图建议', val: pr.figures.length, unit: '张', foot: '高优先 2 张' }) +
        '</div>';

      html += MR.panel({
        title: '三重一致性核对', meta: '文段 ↔ 流程图 ↔ 数据', icon: 'review1', pad: true,
        body: pr.consistency.map(function (c) {
          var lv = { ok: ['ok', '一致'], warn: ['warn', '待补充 / 待复核'], bad: ['bad', '需修正'] }[c.level];
          return '<div class="ck ck--' + lv[0] + '" style="margin-bottom:12px">' +
            '<div class="ck__c" style="grid-column:1/-1;border-right:0;border-bottom:1px solid var(--line-2)">' +
            '<div class="ck__st">' + (c.level === 'ok' ? '✓' : (c.level === 'warn' ? '!' : '✕')) + ' ' + lv[1] +
            (c.levelNote ? ' · ' + c.levelNote : '') + '<span class="mono-xs" style="margin-left:auto">' + c.id + '</span></div>' +
            '<div style="margin-top:5px;font-weight:600;color:var(--ink);font-size:12.5px">' + c.claim + '</div></div>' +
            '<div class="ck__c"><div class="ck__k">论文文段</div>' + c.text + '</div>' +
            '<div class="ck__c"><div class="ck__k">流程图 / 配方表</div>' + c.flow + '</div>' +
            '<div class="ck__c"><div class="ck__k">实验数据 / 图表</div>' + c.data + '</div>' +
            (c.fix ? '<div class="ck__c" style="grid-column:1/-1;border-right:0;border-top:1px solid var(--line-2)"><div class="ck__fix">↳ ' + c.fix + '</div></div>' : '') +
            '</div>';
        }).join(''),
        note: '核对的粒度不是"章节级"而是"论断级"：平台先从文段中抽取出可核验的论断（数值、条件、方法），再到流程图与数据文件中寻找对应记录，找不到对应即判为"待补充"或"需修正"。'
      }) + '<div class="mb-4"></div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '引用核验', meta: pr.citationChecks.length + ' 条', icon: 'lit', pad: true,
          body: pr.citationChecks.map(function (c) {
            var lv = { ok: ['ok', '通过', '✓'], warn: ['sig', '提醒', '!'], bad: ['bad', '不通过', '✕'] }[c.level];
            return '<div class="note ' + (c.level === 'ok' ? 'note--ok' : (c.level === 'warn' ? 'note--sig' : 'note--risk')) + '" style="margin-bottom:10px;flex-direction:column;gap:5px">' +
              '<div style="display:flex;gap:8px;align-items:center">' + MR.icon('lit', 14) +
              '<b>[' + c.n + '] ' + c.issue + '</b>' +
              '<span class="chip chip--' + (lv[0] === 'bad' ? 'risk' : (lv[0] === 'sig' ? 'sig' : 'ok')) + '" style="margin-left:auto">' + lv[1] + ' ' + c.ref + '</span></div>' +
              '<div style="color:var(--ink-2)">' + c.detail + '</div></div>';
          }).join(''),
          note: '引用核验依赖环节 05 建立的"引用—论断"绑定关系，因此可以判断出「综述被当作具体参数的方法参考」这类语义级问题，而不只是检查格式。'
        }) +
        '<div class="col">' +
        MR.panel({
          title: '遗漏条件检出', meta: '3 项', icon: 'review1', cls: 'panel--sig', pad: true, tight: true,
          body: '<div class="note note--risk mb-4">' + MR.icon('review1', 14) +
            '<span>以下 3 项关键实验条件在论文中未报告，且均会影响结论的可复现性或归因：</span></div>' +
            '<div class="switchline"><span class="switchline__k">环境湿度（RH）实测值</span><span class="chip chip--sig chip--mono">2.1 / 2.2 节</span></div>' +
            '<div class="switchline"><span class="switchline__k">随炉冷却的实测降温速率</span><span class="chip chip--sig chip--mono">2.1 节</span></div>' +
            '<div class="switchline"><span class="switchline__k">极片压实密度</span><span class="chip chip--sig chip--mono">2.2 节</span></div>' +
            '<div class="note note--sig" style="margin-top:12px">' + MR.icon('review1', 14) +
            '<span>其中环境湿度已在敏感度分析中显示会导致 38% 的批次一致性偏差，属"有实测证据但未写入论文"的遗漏，优先级最高。</span></div>'
        }) +
        MR.panel({
          title: '结论可靠性评分', meta: 'CLAIM LEVEL', icon: 'peer', pad: true, tight: true,
          body: '<div class="scoring">' +
            [['文段—数据一致性', 0.94], ['文段—流程图一致性', 0.78], ['引用恰当性', 0.72], ['条件完备性', 0.65], ['图表完备性', 0.60]].map(function (s) {
              return '<div class="scorerow"><span class="scorerow__k">' + s[0] + '</span>' +
                '<span class="bar"><i style="width:' + (s[1] * 100) + '%"></i></span>' +
                '<span class="scorerow__v">' + s[1].toFixed(2) + '</span></div>';
            }).join('') + '</div>' +
            '<div class="note note--acc" style="margin-top:12px">' + MR.icon('review1', 14) +
            '<span>数值一致性最高（0.94），图表完备性最低（0.60）——说明"算得对、写得准"，但"证据呈现不足"。这正是 6 条绘图建议要解决的问题。</span></div>'
        }) + '</div></div>';

      html += MR.panel({
        title: '科研绘图建议', meta: pr.figures.length + ' 条 · 按建议插入位置排序', icon: 'paper', pad: true, cls: 'panel--acc',
        acts: '<button class="btn btn--sm" type="button" data-act="backexp">把补充实验加回环节 04</button>',
        body: '<div class="rowlist" style="margin:-4px -18px 0">' + pr.figures.map(function (f) {
          var pc = f.pri === 'high' ? 'risk' : (f.pri === 'mid' ? 'sig' : 'line');
          var pt = { high: '高优先', mid: '建议', low: '可选' }[f.pri];
          return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
            '<span><span class="rowitem__title">' + f.id + ' · ' + f.type + '<span class="chip chip--' + pc + '">' + pt + '</span></span>' +
            '<span class="rowitem__sub"><b style="color:var(--ink-2)">建议插入位置：</b>' + f.where + '<br>' +
            '<b style="color:var(--ink-2)">理由：</b>' + f.why + '<br>' +
            '<b style="color:var(--ink-2)">所需图像：</b>' + f.need + '</span></span>' +
            '<span class="rowitem__side"><span class="chip chip--line chip--mono">' + f.type.split(' ')[0] + '</span></span></div>';
        }).join('') + '</div>',
        note: '绘图建议不是笼统的"多配几张图"，而是先定位到具体段落，再说明该段落缺少哪一类直接证据，最后给出可交付的图像形态（含放大倍数、标注内容、是否需要统计图）。'
      });

      html += '<div class="grid g-2-1 mt-4">' +
        MR.panel({
          title: '参考文献 · GB/T 7714-2015', meta: d.references.length + ' 条 · 顺序编码制', icon: 'book', pad: true, flush: true,
          acts: '<button class="btn btn--sm" type="button" data-act="refs">查看全部</button>',
          body: '<div class="tbl-wrap" style="max-height:290px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
            d.references.slice(0, 6).map(function (r) {
              var bad = r.n === 3;
              return '<tr' + (bad ? ' class="is-hit"' : '') + '><td class="num" style="width:36px;color:var(--ink-3)">[' + r.n + ']</td>' +
                '<td style="white-space:normal;height:auto;padding:9px 12px;font-size:11.5px;line-height:1.6">' + r.gbt +
                (bad ? ' <span class="chip chip--risk">类型待调整</span>' : '') + '</td></tr>';
            }).join('') + '</tbody></table></div>',
          note: '编号与正文上标一一对应，采用顺序编码制；导出时可选择「著者-出版年制」。'
        }) +
        MR.panel({
          title: '投稿准备度', meta: 'READINESS', icon: 'review1', pad: true, tight: true,
          body: '<dl class="dl">' +
            '<dt>评审结论</dt><dd><span class="chip chip--sig">' + pr.verdict + '</span></dd>' +
            '<dt>必改项</dt><dd>4 项一致性问题（含 1 项数值表述）· 1 项引用类型 · 3 项遗漏条件</dd>' +
            '<dt>补充实验</dt><dd>F1 SEM / F2 XRD 局部放大为高优先，需回环节 04 排期</dd>' +
            '<dt>建议动作</dt><dd>先补 3 项遗漏条件与引用修正 → 补拍 F1/F2 → 导出投稿版</dd>' +
            '</dl>' +
            '<div class="panel__acts" style="display:flex;gap:8px;margin-top:16px">' +
            '<button class="btn" type="button" data-act="exportReview">导出审稿意见</button>' +
            '<button class="btn btn--primary" type="button" data-act="refs">导出参考文献</button></div>'
        }) + '</div>';

      return html;
    },
    mount: function (host) {
      var r = host.querySelector('[data-act="runpeer"]');
      if (r) r.addEventListener('click', function () {
        MR.state.peerReady = true;
        MR.app.runStage('peer', { force: MR.state.stage.peer === 'done' });
      });
      host.querySelectorAll('[data-act="refs"]').forEach(function (b) {
        b.addEventListener('click', function () { MR.app.openPanel('refs'); });
      });
      var be = host.querySelector('[data-act="backexp"]');
      if (be) be.addEventListener('click', function () {
        MR.state.expTab = 'setup';
        MR.log('INFO', '已生成补充实验申请：F1 SEM 形貌图 / F2 XRD 局部放大图，回写至环节 04 排程');
        MR.app.setView('exp');
      });
      var ex = host.querySelector('[data-act="exportReview"]');
      if (ex) ex.addEventListener('click', function () {
        MR.modal.open('审稿意见（自动生成）', '<div class="paper" style="font-size:13px">' +
          '<p><b>评审结论：</b>' + d.peerReview.verdict + '（综合分 ' + d.peerReview.score.toFixed(2) + ' / 1.00）</p>' +
          '<p><b>1. 一致性问题（4 项）</b><br>' + d.peerReview.consistency.filter(function (c) { return c.level !== 'ok'; }).map(function (c) { return '（' + c.id + '）' + c.claim + '——' + c.fix; }).join('<br>') + '</p>' +
          '<p><b>2. 引用问题（3 项）</b><br>' + d.peerReview.citationChecks.filter(function (c) { return c.level !== 'ok'; }).map(function (c) { return '[' + c.n + '] ' + c.issue + '：' + c.detail; }).join('<br>') + '</p>' +
          '<p><b>3. 遗漏条件（3 项）</b><br>环境湿度实测值、随炉冷却速率、极片压实密度未在实验方法中报告。</p>' +
          '<p><b>4. 图表建议（6 项，高优先 2 项）</b><br>建议在 4.2 节后补充 SEM 形貌图，在 4.1 节补充 XRD (003) 局部放大图。</p>' +
          '</div>',
          '<button class="btn" data-close="1">关闭</button><button class="btn btn--primary" data-close="1">确认并生成修订任务</button>');
      });
    }
  };
})();
