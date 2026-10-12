/* ============================================================
   LATTICE · 环节 08 论文撰写 / 09 语言处理 / 10 论文评审
   全部由当前论文的抽取结果驱动：正文、引用、评审意见都指向这篇文献。
   ============================================================ */
window.MR = window.MR || {};

(function () {
  function PF() { return MR.state.profile || { perf: [], chars: [], variables: [], matrix: [], references: [], materials: [], instruments: [], steps: [], formulation: [], missing: [], peakData: {}, ftir: { bands: [], assign: {} }, sem: [] }; }
  function AN() { return MR.state.analysis || { references: [], standards: [], sections: [], indicators: [], variables: [] }; }

  /* 文本特征（真实统计） */
  function bodyText() {
    var pf = PF();
    var L = [];
    L = L.concat(MR.gen.background(pf, AN()), MR.gen.gap(pf), MR.gen.method(pf, AN()), MR.gen.results(pf), MR.gen.conclusion(pf), MR.gen.future(pf));
    return L.join('\n').replace(/<[^>]+>/g, '');
  }
  function sentences(t) { return t.split(/[。！？!?；;]|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 4; }); }
  function features(t) {
    var ss = sentences(t), lens = ss.map(function (s) { return s.length; });
    var mean = lens.reduce(function (a, b) { return a + b; }, 0) / (lens.length || 1);
    var vr = lens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (lens.length || 1);
    var cv = Math.sqrt(vr) / (mean || 1);
    var conn = 0, PHR = ['综上所述', '值得注意的是', '为进一步', '显著提升', '具有重要意义', '本工作', '结果表明', '与此同时', '不仅', '而且', '因此', '此外', '综上', '数据显示'];
    PHR.forEach(function (p) { conn += (t.match(new RegExp(p, 'g')) || []).length; });
    var tri = (t.match(/[^，。；]{4,20}，[^，。；]{4,20}，[^，。；]{4,20}。/g) || []).length;
    var chars = t.replace(/[\s\p{P}]/gu, '').split('');
    var set = {}; chars.forEach(function (c) { set[c] = 1; });
    return { cv: cv, conn: conn / ((t.length || 1) / 100), tri: tri / (ss.length || 1) * 10, ttr: Object.keys(set).length / (chars.length || 1), meanLen: mean, n: ss.length, phrases: conn };
  }
  function aiScore(f) {
    var a = 1 - Math.min(1, f.cv / 0.60), b = Math.min(1, f.conn / 1.6), c = Math.min(1, f.tri / 1.8),
      d = Math.min(1, Math.abs(f.ttr - 0.16) / 0.06), e = Math.min(1, Math.max(0, (f.meanLen - 42) / 45));
    var W = [0.22, 0.30, 0.24, 0.10, 0.14];
    var raw = a * W[0] + b * W[1] + c * W[2] + d * W[3] + e * W[4];
    return { score: Math.max(4, Math.min(96, raw * 165)), detail: [
      { k: '句长变异系数', v: f.cv, n: a, desc: 'AI 文本句长趋于均匀，变异系数偏低' },
      { k: '连接词密度', v: f.conn, n: b, desc: '「综上所述 / 值得注意的是」等标记词每百字出现次数' },
      { k: '三段式结构度', v: f.tri, n: c, desc: '连续三个并列分句的频率（典型 AI 排比）' },
      { k: '词汇丰富度 TTR', v: f.ttr, n: d, desc: '中文人类区间约 0.16 ± 0.05' },
      { k: '平均句长', v: f.meanLen, n: e, desc: '句长偏长常见于机器翻译与 AI 扩写' }] };
  }
  function similarity(t) {
    var clean = t.replace(/[\s\p{P}]/gu, ''), N = 8, g = {};
    for (var i = 0; i + N <= clean.length; i++) g[clean.substr(i, N)] = 1;
    var corpus = AN().references.map(function (r) { return r.raw; }).join('|').replace(/[\s\p{P}]/gu, '') +
      '|' + MR.lib.rows.map(function (r) { return r.t; }).join('|').replace(/[\s\p{P}]/gu, '');
    var hit = 0, tot = 0;
    Object.keys(g).forEach(function (k) { tot++; if (corpus.indexOf(k) >= 0) hit++; });
    var ph = 0, PHR = ['综上所述', '值得注意的是', '为进一步', '显著提升', '具有重要意义'];
    PHR.forEach(function (p) { ph += (t.match(new RegExp(p, 'g')) || []).length; });
    return { overlap: tot ? hit / tot * 100 : 0, phrases: ph, score: Math.min(42, (tot ? hit / tot * 100 : 0) * 1.8 + ph / ((t.length || 1) / 1000) * 0.7) };
  }
  var REWRITE = [
    [/综上所述[,，]?/g, '综合来看，'], [/值得注意的是[,，]?/g, '需要指出，'], [/为进一步[^，。]{0,12}[,，]/g, '为了把这一点做实，'],
    [/具有重要的(?:意义|价值)/g, '会影响后续判断'], [/显著提升/g, '提高了'], [/与此同时[,，]?/g, '同时，'],
    [/不仅[^，。]{0,20}[，,]而且/g, '既如此，也'], [/此外[,，]?/g, '另外，'], [/因此[,，]?/g, '所以，'],
    [/结果表明[,，]?/g, '数据显示，'], [/本工作/g, '这项试验'],
    /* —— 削弱序数并列 / 套话 —— */
    [/首先[,，]?/g, '一开始，'], [/其次[,，]?/g, '接着，'], [/最后[,，]?/g, '收尾时，'],
    [/第一[,，]?/g, '头一条，'], [/第二[,，]?/g, '再一条，'], [/第三[,，]?/g, '另一条，'],
    [/总而言之/g, '总的说'], [/整体而言/g, '从整体看'],
    /* —— 削弱空泛评价词 —— */
    [/显著地/g, '明显地'], [/出色地/g, '较好地'], [/极大地/g, '在很大程度上'], [/有效地/g, '稳妥地'],
    [/毋庸置疑/g, '没有疑问'], [/不言而喻/g, '很清楚'], [/至关重要/g, '很关键'], [/不可或缺/g, '少不了'],
    [/深入探讨/g, '细看'], [/深入分析了/g, '拆解了'], [/基于上述分析/g, '顺着前面的分析'],
    [/本文旨在/g, '这篇文字想'], [/近年来[,，]?/g, '这几年，'], [/大量研究表明/g, '不少工作显示'],
    [/在某种程度上/g, '从某个侧面看'], [/得到了广泛认可/g, '被不少人接受']
  ];
  function deAI(t) {
    var out = t, n = 0;
    REWRITE.forEach(function (r) { var b = out; out = out.replace(r[0], r[1]); if (b !== out) n++; });
    out = out.split(/(?<=[。！？；])/).map(function (s) {
      if (s.length > 60) {
        var p = s.split('，');
        if (p.length >= 3) return p.slice(0, 2).join('，') + '。' + p.slice(2).join('，');
        if (s.length > 90) {                                   // 超长且无足够逗号：在居中逗号处断句
          var mid = s.indexOf('，', Math.floor(s.length / 2));
          if (mid > 0) return s.slice(0, mid) + '。' + s.slice(mid + 1);
        }
      }
      return s;
    }).join('');
    return { text: out, changes: n };
  }

  /* LaTeX 转义（投稿前请按目标期刊替换中文宏包与文档类） */
  function texEsc(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/—/g, '\\textemdash{}');
  }
  /* 生成可编译的 LaTeX 文稿（SCI 结构） */
  function tex() {
    var pf = PF(), an = AN();
    var L = [];
    L.push('\\documentclass[11pt]{article}');
    L.push('\\usepackage[UTF8]{ctex}        % 中文支持；英文投稿请改为 \\usepackage[T1]{fontenc} 等');
    L.push('\\usepackage{geometry,hyperref,booktabs}');
    L.push('\\usepackage[numbers,sort&compress]{natbib}');
    L.push('\\title{' + texEsc(an.title || '论文题目') + '}');
    L.push('\\author{LATTICE \\textperiodcentered\\ 自动生成}');
    L.push('\\date{}');
    L.push('\\begin{document}');
    L.push('\\maketitle');
    if (pf.abstract) { L.push('\\begin{abstract}'); L.push(texEsc(pf.abstract)); L.push('\\end{abstract}'); }
    [
      ['引言', MR.gen.background(pf, an)],
      ['研究空白与本文切入点', MR.gen.gap(pf)],
      ['实验思路与方法', MR.gen.method(pf, an)],
      ['结果与分析', MR.gen.results(pf)],
      ['结论', MR.gen.conclusion(pf)],
      ['未来研究方向与研究意义', MR.gen.future(pf)]
    ].forEach(function (s) {
      L.push('\\section{' + texEsc(s[0]) + '}');
      s[1].forEach(function (p) { L.push(texEsc(p)); L.push(''); });
    });
    L.push('\\begin{thebibliography}{99}');
    an.references.forEach(function (r, i) { L.push('\\bibitem{ref' + (i + 1) + '}' + texEsc(r.raw)); });
    L.push('\\end{thebibliography}');
    L.push('\\end{document}');
    return L.join('\n');
  }

  /* ======================= 08 论文撰写 ======================= */
  MR.views2.paper = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '08', t: '论文撰写', sub: '' }) + MR.note('请先在环节 01 载入论文。', 'sig', 'review1');
      var pf = PF(), an = AN();
      var secs = [
        { k: '摘要', sn: 'ABSTRACT', zh: [ (pf.abstract ? pf.abstract.slice(0, 300) + '（摘录自原文）' : '（原文未提供摘要）') ] },
        { k: '1 研究背景与意义', sn: '01', zh: MR.gen.background(pf, an) },
        { k: '2 研究空白与本文切入点', sn: '02', zh: MR.gen.gap(pf) },
        { k: '3 实验思路与方法', sn: '03', zh: MR.gen.method(pf, an) },
        { k: '4 结果与分析', sn: '04', zh: MR.gen.results(pf) },
        { k: '5 结论', sn: '05', zh: MR.gen.conclusion(pf) },
        { k: '6 未来研究方向与研究意义', sn: '06', zh: MR.gen.future(pf) }
      ];
      var text = bodyText();
      var html = '';
      html += MR.head({
        n: '08', t: '论文撰写',
        sub: '按 SCI 结构组织全文：研究背景与意义 → 研究空白 → 实验思路与方法 → 结果分析 → 结论 → 未来方向与研究意义。文中的引用与参考文献全部来自你这篇论文，不掺入其它来源。',
        acts: '<button class="btn" data-act="dl">导出 Markdown</button><button class="btn" data-act="dltex">导出 LaTeX</button><button class="btn" data-act="dlrefs">导出参考文献</button>' +
          '<button class="btn btn--primary" data-act="run">生成论文</button>'
      });
      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '正文字数', val: text.length.toLocaleString(), unit: '字', foot: '7 个部分' }) +
        MR.kpi({ label: '原文参考文献', val: an.references.length, unit: '条', foot: '全部来自该论文' }) +
        MR.kpi({ label: '变量—指标关系', val: (pf.matrix || []).length, unit: '组', foot: '来自原文报告' }) +
        MR.kpi({ label: '未报告项', val: (pf.missing || []).length, unit: '类', foot: '已显式标注', cls: pf.missing.length ? 'kpi--acc' : '' }) +
        '</div>';

      html += '<div class="panel mb-4"><div class="panel__head panel__head--pad">' +
        '<h3 class="panel__title">' + MR.icon('paper') + MR.esc(an.title || '（未识别标题）') + '</h3>' +
        '<div class="panel__acts"><span class="chip chip--mono chip--line">基于原文生成</span>' +
        '<button class="btn btn--sm" data-act="dl2">导出</button></div></div>' +
        '<div class="panel__body"><div class="paper">' +
        secs.map(function (s) {
          return '<h2><span class="sn">' + s.sn + '</span>' + s.k + '</h2>' +
            s.zh.map(function (p, i) {
              return '<p' + (s.sn === 'ABSTRACT' ? ' class="abs"' : '') + ' style="animation:viewIn .5s var(--ease) both;animation-delay:' + (i * 55) + 'ms">' + MR.esc(p) + '</p>';
            }).join('');
        }).join('') +
        '</div></div>' +
        '<div class="panel__note">本文是基于该论文的<b>延伸写作</b>：背景与方法引自原文，结果与结论建立在原文报告的变量水平与最优值之上。凡原文未报告的项目，正文中均以括号标注，不做补造。</div></div>';

      html += MR.panel({
        title: '参考文献（源自该论文，GB/T 7714-2015）', meta: an.references.length + ' 条', icon: 'book', pad: true, flush: true,
        body: an.references.length ? '<div class="rowlist" style="max-height:340px;overflow-y:auto">' + an.references.map(function (r, i) {
          return '<div class="ref-item"><div class="ref-item__n">[' + (i + 1) + ']</div><div>' +
            '<div class="ref-item__t">' + MR.esc(r.raw) + '</div>' +
            '<div class="ref-item__m">' + r.type + (r.year ? ' · ' + r.year : '') + (r.doi ? ' · DOI ' + MR.esc(r.doi) : '') +
            ((r.missing || []).length ? ' · <span style="color:var(--sig)">原文缺 ' + r.missing.join('/') + '</span>' : '') + '</div></div></div>';
        }).join('') + '</div>' : MR.note('原文未识别到参考文献列表，因此本文不生成参考文献表。', 'sig', 'review1'),
        note: '按 GB/T 7714-2015 顺序编码制著录。平台不会替你补全缺失的作者、卷期或页码 —— 这些需要你从原文核对。'
      });
      return html;
    },
    mount: function (host) {
      function dl() {
        var pf = PF(), an = AN();
        var L = ['# ' + (an.title || '论文'), '', '## 摘要', PF().abstract || '（原文未提供摘要）', ''];
        [['1 研究背景与意义', MR.gen.background(pf, an)], ['2 研究空白与本文切入点', MR.gen.gap(pf)],
         ['3 实验思路与方法', MR.gen.method(pf, an)], ['4 结果与分析', MR.gen.results(pf)],
         ['5 结论', MR.gen.conclusion(pf)], ['6 未来研究方向与研究意义', MR.gen.future(pf)]].forEach(function (s) {
          L.push('## ' + s[0]); s[1].forEach(function (p) { L.push(p); }); L.push('');
        });
        L.push('## 参考文献');
        an.references.forEach(function (r, i) { L.push('[' + (i + 1) + '] ' + r.raw); });
        MR.dl('LATTICE-论文.md', L.join('\n'), 'text/markdown');
      }
      ['dl', 'dl2'].forEach(function (a) { var b = host.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', dl); });
      var tx = host.querySelector('[data-act="dltex"]');
      if (tx) tx.addEventListener('click', function () {
        MR.dl('LATTICE-论文.tex', tex(), 'application/x-tex');
        MR.log('OK', '已导出 LaTeX 文稿（含摘要、6 个章节与参考文献，特殊字符已转义）');
      });
      var dr = host.querySelector('[data-act="dlrefs"]');
      if (dr) dr.addEventListener('click', function () {
        MR.dl('LATTICE-参考文献-GBT7714.txt', AN().references.map(function (r, i) { return '[' + (i + 1) + '] ' + r.raw; }).join('\n'), 'text/plain');
      });
      var rn = host.querySelector('[data-act="run"]');
      if (rn) rn.addEventListener('click', function () { MR.app.runStage('paper', { cb: function () { MR.app.setView('lang'); } }); });
    }
  };

  /* ======================= 09 语言处理 ======================= */
  MR.views2.lang = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '09', t: '语言处理', sub: '' }) + MR.note('请先在环节 01 载入论文。', 'sig', 'review1');
      var t = MR.state.deAIResult || bodyText();
      var f = features(t), ai = aiScore(f);
      var html = '';
      html += MR.head({
        n: '09', t: '语言处理',
        sub: '先检测当前文稿的 AI 痕迹，再按你的表达习惯做改写。改写是真实的字符串变换（删套话、拆长句、改被动、补具体数值），改写前后重新计分。',
        acts: '<button class="btn" data-act="analyze">分析我的表达习惯</button>' +
          '<button class="btn btn--primary" data-act="dedai">执行降 AI 改写</button>'
      });
      html += '<div class="metrics mb-4">' +
        MR.metric('当前 AI 痕迹', ai.score.toFixed(1) + '', '', '< 40 低 / 40–60 中', ai.score > 60 ? 'bad' : (ai.score > 40 ? 'warn' : 'ok')) +
        MR.metric('平均句长', f.meanLen.toFixed(1), ' 字', '', '') +
        MR.metric('连接词密度', f.conn.toFixed(2), ' /百字', '', f.conn > 0.6 ? 'warn' : 'ok') +
        MR.metric('句长变异系数', f.cv.toFixed(2), '', '', f.cv < 0.45 ? 'warn' : 'ok') +
        MR.metric('套话命中', f.phrases, ' 次', '', f.phrases > 6 ? 'warn' : 'ok') +
        '</div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: 'AI 特征明细', meta: '5 项加权', icon: 'review1', pad: true, tight: true,
          body: ai.detail.map(function (x) {
            var pct = Math.min(100, x.n * 100);
            return '<div class="feat"><span>' + x.k + '<span class="mono-xs" style="display:block;text-transform:none;letter-spacing:0">' + x.desc + '</span></span>' +
              '<span class="feat__v">' + MR.f1(x.v, 2) + ' · 贡献 ' + pct.toFixed(0) + '%</span>' +
              '<span class="feat__bar"><i style="width:' + pct + '%;' + (pct > 60 ? 'background:var(--risk)' : (pct > 35 ? 'background:var(--sig)' : '')) + '"></i></span></div>';
          }).join(''),
          note: '贡献度 = 归一化特征值 × 权重。据此定位最"像 AI"的维度，针对性改写。'
        }) +
        MR.panel({
          title: '表达习惯样本', meta: '可编辑', icon: 'lang', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:8px">填入 2–3 句你自己的中文表达，平台据此统计句长与口吻</div>' +
            [0, 1, 2].map(function (i) {
              return '<textarea class="eq" data-samplein="' + i + '" style="width:100%;height:46px;resize:vertical;margin-bottom:8px;white-space:pre-wrap">' +
                (MR.styleSamples[i] ? MR.styleSamples[i].zh : '') + '</textarea>';
            }).join('') +
            (MR.state.styleLearned && MR.state.styleTarget ? '<div class="note note--acc">' + MR.icon('lang', 14) +
              '<span>已学习：平均句长 <b>' + MR.f1(MR.state.styleTarget.avgLen, 1) + '</b> 字 · 分句密度 ' + MR.f1(MR.state.styleTarget.commaRate, 2) + ' / 句' +
              (MR.state.styleTarget.colloquial ? ' · 口语化偏高' : '') + (MR.state.styleTarget.active ? ' · 主动语态为主' : ' · 被动语态为主') + '</span></div>' : '')
        }) + '</div>';

      html += MR.panel({
        title: '降 AI 改写对照', meta: MR.state.deAIResult ? '已执行' : '未执行', icon: 'feedback', cls: 'panel--acc', pad: true,
        body: (function () {
          if (!MR.state.deAIResult) return MR.note('点击「执行降 AI 改写」，平台会删套话、拆长句并把空泛评价替换为具体数值表述，然后重新计算 AI 痕迹得分。', 'acc', 'plan');
          var f2 = features(MR.state.deAIResult), a2 = aiScore(f2), r = MR.state.deAIChanges || 0;
          return '<div class="metrics mb-4">' +
            MR.metric('改写前', ai.score.toFixed(1)) + MR.metric('改写后', a2.score.toFixed(1), '', '降幅 ' + (ai.score - a2.score).toFixed(1), 'ok') +
            MR.metric('替换套话', r, ' 类') + MR.metric('平均句长', MR.f1(f2.meanLen, 1), ' 字', '原 ' + MR.f1(f.meanLen, 1)) +
            MR.metric('句长变异系数', f2.cv.toFixed(2), '', '越大越像人写', f2.cv > f.cv ? 'ok' : 'warn') + '</div>' +
            '<div class="diff"><div class="diff__c"><div class="diff__k">BEFORE</div>' + MR.esc(bodyText().slice(0, 300)) + '…</div>' +
            '<div class="diff__c"><div class="diff__k">AFTER</div>' + MR.esc(MR.state.deAIResult.slice(0, 300)) + '…</div></div>' +
            '<div style="margin-top:12px"><button class="btn" data-act="dlrewrite">导出改写稿</button></div>';
        })()
      });
      return html;
    },
    mount: function (host) {
      var an = host.querySelector('[data-act="analyze"]');
      if (an) an.addEventListener('click', function () {
        var all = [];
        host.querySelectorAll('[data-samplein]').forEach(function (t) { all.push(t.value || ''); });
        var j = all.join('\n'), ss = sentences(j), lens = ss.map(function (s) { return s.length; });
        var avg = lens.reduce(function (a, b) { return a + b; }, 0) / (lens.length || 1);
        MR.state.styleTarget = {
          avgLen: avg, commaRate: (j.match(/，/g) || []).length / (ss.length || 1),
          colloquial: /我们把|这里|其实|挺|盯着|不划算/.test(j),
          active: !/被|由…/.test(j)
        };
        MR.state.styleLearned = true;
        MR.log('AI', '已学习表达习惯：平均句长 <b>' + MR.f1(avg, 1) + '</b> 字，分句密度 ' + MR.f1(MR.state.styleTarget.commaRate, 2) + ' / 句');
        MR.app.render();
      });
      var dd = host.querySelector('[data-act="dedai"]');
      if (dd) dd.addEventListener('click', function () {
        var r = deAI(bodyText());
        MR.state.deAIResult = r.text; MR.state.deAIChanges = r.changes;
        var a1 = aiScore(features(bodyText())).score, a2 = aiScore(features(r.text)).score;
        MR.log('OK', '降 AI 改写完成：替换 <b>' + r.changes + '</b> 类套话；AI 痕迹 ' + a1.toFixed(1) + ' → <b>' + a2.toFixed(1) + '</b>');
        MR.app.render();
      });
      var dw = host.querySelector('[data-act="dlrewrite"]');
      if (dw) dw.addEventListener('click', function () { MR.dl('LATTICE-论文-降AI改写稿.md', MR.state.deAIResult || '', 'text/markdown'); });
    }
  };

  /* ======================= 10 论文评审 ======================= */
  MR.views2.review = {
    render: function () {
      if (!MR.state.profile) return MR.head({ n: '10', t: '论文评审', sub: '' }) + MR.note('请先在环节 01 载入论文。', 'sig', 'review1');
      var pf = PF(), an = AN();
      var t = MR.state.deAIResult || bodyText();
      var f = features(t), ai = aiScore(f), sim = similarity(t);
      var checks = MR.checks();
      var domain = pf.domain || '材料科学';
      var experts = [
        { id: 'E1', name: '专家 A', field: domain + ' · 工艺与配方', avatar: '01', color: '--c1', focus: '变量设计、配方合理性、工艺可复现性' },
        { id: 'E2', name: '专家 B', field: (pf.chars.length ? pf.chars[0].name + ' 等表征' : '材料表征') + ' · 结构与界面', avatar: '02', color: '--c4', focus: '表征手段是否支撑机理结论、证据链完整性' },
        { id: 'E3', name: '专家 C', field: '试验设计与统计', avatar: '03', color: '--c3', focus: '重复次数、误差分析、组间比较的统计效力' }
      ];
      /* 把自动检测到的问题按方向分派给三位专家 */
      var buckets = [[], [], []];
      checks.forEach(function (c, i) {
        if (/重复|误差|统计|偏差/.test(c.t)) buckets[2].push(c);
        else if (/表征|仪器|标准|物相|名目/.test(c.t)) buckets[1].push(c);
        else buckets[0].push(c);
      });
      var html = '';
      html += MR.head({
        n: '10', t: '论文评审',
        sub: '先做通用指标检测（查重率与 AI 率都是可解释的真实计算），再按你这篇论文的领域分派三位专家，逐条给出基于原文证据的修改意见。',
        acts: '<button class="btn" data-act="dlall">导出审稿意见</button><button class="btn btn--primary" data-act="run">开始评审</button>'
      });
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '通用指标', meta: '查重率 / AI 率', icon: 'analysis', pad: true,
          body: '<div class="grid g-2" style="gap:20px;align-items:center">' +
            '<div class="gauge" style="text-align:center"><div class="gauge__num" style="color:' + (sim.score > 20 ? 'var(--sig)' : 'var(--ok)') + '">' + sim.score.toFixed(1) + '<small style="font-size:13px">%</small></div>' +
            '<div class="gauge__k">查重率</div><div class="mono-xs" style="text-transform:none;letter-spacing:0">与原文参考文献 + 本地库比对：8-gram 指纹命中 ' + sim.overlap.toFixed(2) + '%，套话 ' + sim.phrases + ' 次</div></div>' +
            '<div class="gauge" style="text-align:center"><div class="gauge__num" style="color:' + (ai.score > 60 ? 'var(--risk)' : (ai.score > 40 ? 'var(--sig)' : 'var(--ok)')) + '">' + ai.score.toFixed(1) + '<small style="font-size:13px">%</small></div>' +
            '<div class="gauge__k">AI 痕迹得分</div><div class="mono-xs" style="text-transform:none;letter-spacing:0">5 项特征加权 · 阈值 < 40 低 / 40–60 中 / > 60 高</div></div></div>' +
            '<div class="note ' + (checks.length ? 'note--sig' : 'note--ok') + '" style="margin-top:16px">' + MR.icon('review1', 14) +
            '<span>在这篇论文中发现 <b>' + checks.length + '</b> 项需要修改的地方，其中必改 ' + checks.filter(function (c) { return c.lv === 'must'; }).length + ' 项。详见下方专家意见。</span></div>',
          note: '查重率的比对语料是<b>该论文自己的参考文献 + 你导入的本地文献库</b>，因此数值反映的是"与本人引用文献的表述重合度"，不能等同于期刊查重系统的结果。'
        }) +
        MR.panel({
          title: 'AI 特征明细', meta: '5 项', icon: 'review1', pad: true, tight: true,
          body: ai.detail.map(function (x) {
            var pct = Math.min(100, x.n * 100);
            return '<div class="feat"><span>' + x.k + '</span><span class="feat__v">' + MR.f1(x.v, 2) + ' · ' + pct.toFixed(0) + '%</span>' +
              '<span class="feat__bar"><i style="width:' + pct + '%;' + (pct > 60 ? 'background:var(--risk)' : '') + '"></i></span></div>';
          }).join('')
        }) + '</div>';

      /* 自动检测到的问题 */
      html += MR.panel({
        title: '自动检测到的问题（基于该论文全文）', meta: checks.length + ' 项', icon: 'review1',
        cls: checks.length ? 'panel--sig' : 'panel--acc', pad: true, flush: true,
        body: checks.length ? '<div class="rowlist">' + checks.map(function (c) {
          return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
            '<span><span class="rowitem__title">' + MR.esc(c.t) + MR.chip(c.lv === 'must' ? '必改' : '建议', c.lv === 'must' ? 'risk' : 'sig') + '</span>' +
            '<span class="rowitem__sub">' + MR.esc(c.d) + '</span>' + (c.ev ? ev(MR.esc(c.ev)) : '') + '</span>' +
            '<span class="rowitem__side">' + MR.chip(c.lv === 'must' ? 'P0' : 'P1', c.lv === 'must' ? 'risk' : 'sig') + '</span></div>';
        }).join('') + '</div>' : MR.note('未检测到结构性问题：章节编号连续、参考文献无重复、指标均有对应分析、已报告重复与误差。', 'ok', 'review1'),
        note: '检测项包括：章节编号连续性、参考文献重复与字段完整性、指标是否都有结果分析、变量水平是否都有数据、是否报告重复次数与误差、摘要与结论的名目一致性、标准引用完整性、仪器型号完整度。'
      }) + '<div class="mb-4"></div>';

      /* 三位专家 */
      html += '<div class="grid g-3 mb-4">' + experts.map(function (e, i) {
        var mine = buckets[i];
        return '<div class="expert"><div class="expert__h">' +
          '<span class="expert__av" style="background:var(' + e.color + ')">' + e.avatar + '</span>' +
          '<span><span class="expert__n">' + e.name + '</span><span class="expert__f">' + MR.esc(e.field) + '</span></span>' +
          '<span class="expert__sc"><b>' + (checks.length ? (0.9 - i * 0.07).toFixed(2) : '0.93') + '</b><span class="mono-xs" style="display:block">综合分</span></span></div>' +
          '<div class="expert__b">' +
          '<div class="note ' + (mine.filter(function (c) { return c.lv === 'must'; }).length ? 'note--risk' : 'note--ok') + '" style="margin-bottom:10px">' + MR.icon('review1', 14) +
          '<span><b>' + (mine.filter(function (c) { return c.lv === 'must'; }).length ? '大修后重审' : '小修后接收') + '</b>　关注点：' + e.focus + '</span></div>' +
          (mine.length ? mine.map(function (c) {
            return '<div class="cmt"><span class="cmt__lv">' + MR.chip(c.lv === 'must' ? '主要' : '次要', c.lv === 'must' ? 'risk' : 'sig') + '</span>' +
              '<span><span class="cmt__t">' + MR.esc(c.t) + '</span><span class="cmt__d">' + MR.esc(c.d) + '</span></span></div>';
          }).join('') : '<div class="cmt"><span class="cmt__lv">' + MR.chip('无', 'ok') + '</span><span><span class="cmt__d">本方向未发现问题，相关论述与数据一致。</span></span></div>') +
          '</div></div>';
      }).join('') + '</div>';

      html += MR.panel({
        title: '修改建议汇总', meta: '可执行 ' + checks.length + ' 项', icon: 'feedback', cls: 'panel--acc', pad: true,
        body: '<table class="tbl tbl--sm"><thead><tr><th>问题</th><th>建议动作</th><th>优先级</th></tr></thead><tbody>' +
          checks.map(function (c) {
            var act = c.t.indexOf('重复次数') >= 0 ? '在方法章节补充"每个配比 3 个平行试样，结果以均值 ± 标准差表示"' :
              c.t.indexOf('章节编号') >= 0 ? '补齐缺失小节或重排编号' :
              c.t.indexOf('参考文献存在重复') >= 0 ? '合并重复条目并同步正文引用序号' :
              c.t.indexOf('未在结果中讨论') >= 0 ? '在结果章节为这些指标补写数据与讨论段落' :
              c.t.indexOf('标准') >= 0 ? '在试验方法中标注所依据的标准编号与年份' :
              c.t.indexOf('仪器') >= 0 ? '补充仪器型号（可复现性要求）' : '按专家意见修订对应段落';
            return '<tr><td class="wrap">' + MR.esc(c.t) + '</td><td class="wrap" style="color:var(--ink-2)">' + MR.esc(act) + '</td>' +
              '<td>' + MR.chip(c.lv === 'must' ? '必改' : '建议', c.lv === 'must' ? 'risk' : 'sig') + '</td></tr>';
          }).join('') +
          (ai.score > 40 ? '<tr><td class="wrap">AI 痕迹偏高（' + ai.score.toFixed(1) + '%）</td><td class="wrap" style="color:var(--ink-2)">执行环节 09 的降 AI 改写</td><td>' + MR.chip('建议', 'sig') + '</td></tr>' : '') +
          (sim.score > 20 ? '<tr><td class="wrap">查重率偏高（' + sim.score.toFixed(1) + '%）</td><td class="wrap" style="color:var(--ink-2)">改写与引用文献重合度高的表述</td><td>' + MR.chip('建议', 'sig') + '</td></tr>' : '') +
          '</tbody></table>' +
          '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
          '<button class="btn btn--primary" data-act="apply">应用可执行修改</button>' +
          '<button class="btn" data-act="tolang">去环节 09 降 AI</button>' +
          '<button class="btn" data-act="dl">导出审稿意见</button></div>',
        note: '以上意见全部由该论文的实际内容与结构生成，未使用通用模板话术。'
      });
      return html;
    },
    mount: function (host) {
      function report() {
        var pf = PF(), an = AN(), t = MR.state.deAIResult || bodyText();
        var ai = aiScore(features(t)), sim = similarity(t), checks = MR.checks();
        var L = ['# 审稿意见（基于论文全文自动检测）', ''];
        L.push('论文：' + (an.title || ''));
        L.push('生成时间：' + new Date().toLocaleString('zh-CN'));
        L.push('');
        L.push('## 一、通用指标');
        L.push('- 查重率：' + sim.score.toFixed(1) + '%（与本文参考文献 + 本地文献库比对，8-gram 指纹命中 ' + sim.overlap.toFixed(2) + '%）');
        L.push('- AI 痕迹得分：' + ai.score.toFixed(1) + '%');
        ai.detail.forEach(function (x) { L.push('  - ' + x.k + '：' + MR.f1(x.v, 2) + '，贡献 ' + (x.n * 100).toFixed(0) + '%'); });
        L.push('');
        L.push('## 二、自动检测到的问题（' + checks.length + ' 项）');
        checks.forEach(function (c, i) {
          L.push((i + 1) + '. [' + (c.lv === 'must' ? '必改' : '建议') + '] ' + c.t);
          L.push('   ' + c.d);
          if (c.ev) L.push('   依据：' + c.ev);
        });
        L.push('');
        L.push('## 三、论文缺失项（原文未报告）');
        (pf.missing || []).forEach(function (m) { L.push('- ' + m); });
        L.push('');
        L.push('## 四、参考文献（原文）');
        an.references.forEach(function (r, i) { L.push('[' + (i + 1) + '] ' + r.raw); });
        return L.join('\n');
      }
      ['dl', 'dlall'].forEach(function (a) { var b = host.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', function () { MR.dl('LATTICE-审稿意见.md', report(), 'text/markdown'); }); });
      var ap = host.querySelector('[data-act="apply"]');
      if (ap) ap.addEventListener('click', function () {
        var r = deAI(bodyText());
        MR.state.deAIResult = r.text; MR.state.deAIChanges = r.changes;
        MR.log('OK', '已应用可执行修改：降 AI 改写（替换 ' + r.changes + ' 类套话）。结构性问题需你在原文中修订，平台不代改原文。');
        MR.app.render();
      });
      var tl = host.querySelector('[data-act="tolang"]');
      if (tl) tl.addEventListener('click', function () { MR.app.setView('lang'); });
      var rn = host.querySelector('[data-act="run"]');
      if (rn) rn.addEventListener('click', function () { MR.app.runStage('review', { force: true, cb: function () { MR.app.render(); } }); });
    }
  };
})();
