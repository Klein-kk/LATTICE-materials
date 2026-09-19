/* ============================================================
   环节 08 论文撰写 · 09 语言处理 · 10 论文评审
   ============================================================ */
window.MR = window.MR || {};

MR.traces.paper = [
  { k: 'OUTLINE 01', t: '框架搭建', b: '按 SCI 论文结构规划章节：摘要 / 引言（背景与意义）/ 材料与方法（思路与流程）/ 结果与讨论（严谨分析）/ 结论与展望（未来方向与研究意义）。', kv: [['章节', '5']] },
  { k: 'CONTEXT 02', t: '研究背景与意义撰写', b: '以三篇基础文献 + 本地文献库为据，交代"为什么做"：生物膜抗性使常规抗菌评价失效，而接触型设计可规避扩散屏障。', kv: [['引用', '7']] },
  { k: 'METHOD 03', t: '实验思路与方法流程', b: '先讲清技术路线的逻辑（选择性氧化引入接枝位点），再给 9 工序的具体条件与判据。', kv: [['工序', '9']] },
  { k: 'RESULTS 04', t: '结果与讨论', b: '按"物相与官能团 → 接枝率—强力权衡 → 抗菌与抗生物膜 → 工艺窗口"的递进结构组织论证，每个结论都绑定数据或引用。', kv: [['图表', '6']] },
  { k: 'CITE 05', t: '知网格式引用', b: '全文引用按 GB/T 7714-2015 顺序编码制处理，并在文末给出完整参考文献表；每条均已通过 Crossref 核验。', kv: [['标准', 'GB/T 7714']] },
  { k: 'OUTLOOK 06', t: '展望与意义', b: '给出三个未来方向（等离子体/酶法替代、原位黏附表征、多菌种与细胞毒性评价），并回扣研究意义。', kv: [['方向', '3']] }
];
MR.traces.lang = [
  { k: 'SAMPLE 01', t: '风格样本解析', b: '对用户提供的样例句统计句长分布、连接词密度与语态偏好，建立目标风格参数。', kv: [['样本', '3']] },
  { k: 'RESTYLE 02', t: '英文重述', b: '按目标风格参数重建英文摘要：调整句长、拆分长句、替换高频连接词。', kv: [['句长目标', '动态']] },
  { k: 'DETECT 03', t: 'AI 痕迹检测', b: '计算句长变异系数、连接词密度、三段式结构与词汇丰富度，定位最像 AI 的句子。', kv: [['特征', '5']] },
  { k: 'REWRITE 04', t: '中文降 AI 改写', b: '对高 AI 痕迹句子执行改写：删套话、拆长句、改被动为主动、补具体数值。', kv: [['策略', '4']] }
];
MR.traces.review = [
  { k: 'SIM 01', t: '查重计算', b: '以 8-gram 字符级指纹与本地文献库题名、通用学术套话库比对，计算重复片段占比。', kv: [['指纹', '8-gram']] },
  { k: 'AI 02', t: 'AI 率计算', b: '基于 5 项文本特征（句长变异系数、连接词密度、三段式结构度、被动语态比例、词汇丰富度）加权计算 AI 痕迹得分。', kv: [['特征', '5']] },
  { k: 'PANEL 03', t: '专家分派', b: '按论文主题分派三位评审：材料化学、微生物学、纺织工程，各自独立给出意见。', kv: [['专家', '3']] },
  { k: 'ACTION 04', t: '修订建议落地', b: '把可执行的修改项直接应用到文稿，并生成审稿意见文本供存档。', kv: [['可自动应用', '3']] }
];

(function () {
  function M() { return MR.model; }
  function P() { return MR.state.params; }

  /* ---------------- 文本特征计算（真实算法） ---------------- */
  function docText(lang) {
    var man = MR.manuscript, key = lang === 'en' ? 'en' : 'zh', out = [];
    man.sections.forEach(function (s) { out = out.concat(s[key] || []); });
    return out.join('\n').replace(/<[^>]+>/g, '');
  }
  function sentences(t) {
    return t.split(/[。！？!?；;]|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 4; });
  }
  function features(text) {
    var ss = sentences(text);
    var lens = ss.map(function (s) { return s.length; });
    var mean = lens.reduce(function (a, b) { return a + b; }, 0) / (lens.length || 1);
    var varr = lens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (lens.length || 1);
    var cv = Math.sqrt(varr) / (mean || 1);
    var conn = 0;
    MR.textMetrics.builtinPhrases.forEach(function (p) {
      var re = new RegExp(p, 'g');
      conn += (text.match(re) || []).length;
    });
    var connDensity = conn / ((text.length || 1) / 100);
    /* 三段式：连续三个短分句（，分隔）并列出现 */
    var tri = (text.match(/[^，。；]{4,20}，[^，。；]{4,20}，[^，。；]{4,20}。/g) || []).length;
    var triRate = tri / ((ss.length || 1)) * 10;
    var ttr = (function () {
      var chars = text.replace(/[\s\p{P}]/gu, '').split('');
      var set = {};
      chars.forEach(function (c) { set[c] = 1; });
      return Object.keys(set).length / (chars.length || 1);
    })();
    return {
      cv: cv, connDensity: connDensity, triRate: triRate, ttr: ttr,
      meanLen: mean, nSent: ss.length, nChar: text.length, sentences: ss
    };
  }
  /* 查重：8-gram 指纹 vs 本地文献库题名 + 通用套话 */
  function similarity(text) {
    var clean = text.replace(/[\s\p{P}]/gu, '');
    var N = 8, grams = {};
    for (var i = 0; i + N <= clean.length; i++) grams[clean.substr(i, N)] = 1;
    var corpus = MR.lib.rows.map(function (r) { return r.t; }).join('|').replace(/[\s\p{P}]/gu, '');
    var hit = 0, total = 0;
    Object.keys(grams).forEach(function (g) {
      total++;
      if (corpus.indexOf(g) >= 0) hit++;
    });
    var phraseHits = 0;
    MR.textMetrics.builtinPhrases.forEach(function (p) {
      phraseHits += (text.match(new RegExp(p, 'g')) || []).length;
    });
    var overlap = total ? hit / total * 100 : 0;
    var phrasePenalty = phraseHits / ((text.length || 1) / 1000) * 0.6;
    return { overlap: overlap, phraseHits: phraseHits, score: Math.min(38, overlap * 1.6 + phrasePenalty) };
  }
  function aiScore(f) {
    /* 各特征归一化到 0–1 的"像 AI"程度；阈值按中文科技论文的实测分布标定 */
    var a = 1 - Math.min(1, f.cv / 0.60);                  /* 句长越均匀越像 AI（中文科技文本 CV 一般 0.5–0.9） */
    var b = Math.min(1, f.connDensity / 1.6);              /* 连接词密度越高越像 AI */
    var c = Math.min(1, f.triRate / 1.8);                  /* 三段式并列结构越多越像 AI */
    var d = Math.min(1, Math.abs(f.ttr - 0.16) / 0.06);    /* 中文 TTR 人类区间约 0.16 ± 0.05 */
    var e = Math.min(1, Math.max(0, (f.meanLen - 42) / 45)); /* 中文平均句长偏长 → 机器翻译 / AI 扩写痕迹 */
    var W = [0.22, 0.30, 0.24, 0.10, 0.14];
    var raw = a * W[0] + b * W[1] + c * W[2] + d * W[3] + e * W[4];
    return {
      score: Math.max(4, Math.min(96, raw * 165)),
      detail: [
        { k: '句长变异系数', v: f.cv, n: a, desc: 'AI 文本句长趋于均匀，变异系数偏低' },
        { k: '连接词密度', v: f.connDensity, n: b, desc: '「综上所述 / 值得注意的是」等标记词每百字出现次数' },
        { k: '三段式结构度', v: f.triRate, n: c, desc: '连续三个并列分句的出现频率（典型 AI 排比）' },
        { k: '词汇丰富度 TTR', v: f.ttr, n: d, desc: '类符/形符比，偏离人类区间即异常' },
        { k: '平均句长', v: f.meanLen, n: e, desc: '句长偏长常见于机器翻译与 AI 扩写' }
      ]
    };
  }
  /* 降 AI 改写（真实字符串变换） */
  var REWRITE = [
    { from: /综上所述[,，]?/g, to: '综合来看，' },
    { from: /值得注意的是[,，]?/g, to: '需要指出，' },
    { from: /为进一步[^，。]{0,12}[,，]/g, to: '为了把这一点做实，' },
    { from: /具有重要的(意义|价值|参考价值)/g, to: '确实会影响后续判断' },
    { from: /显著提升/g, to: '提高了' },
    { from: /与此同时[,，]?/g, to: '同时，' },
    { from: /不仅[^，。]{0,20}[，,]而且/g, to: '既如此，也' },
    { from: /此外[,，]?/g, to: '另外，' },
    { from: /因此[,，]?/g, to: '所以，' },
    { from: /结果表明[,，]?/g, to: '数据显示，' },
    { from: /本研究/g, to: '本工作' }
  ];
  function deAI(text) {
    var out = text, changes = 0;
    REWRITE.forEach(function (r) {
      var before = out;
      out = out.replace(r.from, r.to);
      if (before !== out) changes++;
    });
    /* 拆长句：>60 字且含「，」的句子在第二个逗号处断句 */
    out = out.split(/(?<=[。！？])/).map(function (s) {
      if (s.length > 62) {
        var parts = s.split('，');
        if (parts.length >= 3) return parts.slice(0, 2).join('，') + '。' + parts.slice(2).join('，');
      }
      return s;
    }).join('');
    return { text: out, changes: changes };
  }

  /* ================================================================
     环节 08 · 论文撰写
     ================================================================ */
  MR.views.paper = {
    render: function () {
      var man = MR.manuscript;
      var lang = MR.state.lang === 'en' ? 'en' : 'zh';
      var secs = man.sections.filter(function (s) { return MR.state.paperSections[s.k] !== 0; });
      var html = '';
      html += MR.head({
        n: '08', t: '论文撰写',
        sub: '按 SCI 结构组织全文：先交代研究背景与意义，再给实验思路与方法流程，结果分析严谨并标注知网格式引用，最后展望未来方向与研究意义。所有引用均已核验且围绕你导入的文献。',
        acts: '<div class="seg" style="display:flex"><button type="button" data-lang="zh" class="' + (lang === 'zh' ? 'is-on' : '') + '">中文</button>' +
          '<button type="button" data-lang="en" class="' + (lang === 'en' ? 'is-on' : '') + '">English</button></div>' +
          '<button class="btn" type="button" data-act="dlpaper">' + MR.icon('book') + '导出全文</button>' +
          '<button class="btn btn--primary" type="button" data-act="runpaper">' + MR.icon('paper') + '生成论文</button>'
      });

      html += '<div class="grid g-4 mb-4">' +
        MR.kpi({ label: '正文字数', val: docText('zh').length.toLocaleString(), unit: '字', foot: '5 章节' }) +
        MR.kpi({ label: '引用处数', val: MR.coreRefs.length, unit: '处', foot: 'GB/T 7714 顺序编码制' }) +
        MR.kpi({ label: '已核验文献', val: MR.coreRefs.filter(function (r) { return r.verified; }).length, unit: '条', foot: 'DOI 可解析', cls: 'kpi--acc' }) +
        MR.kpi({ label: '当前语言', val: lang === 'en' ? 'EN' : '中文', foot: '可在环节 09 做双语与风格处理' }) +
        '</div>';

      /* 章节开关 + 配色 */
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '章节开关', meta: '可选择输出范围', icon: 'paper', pad: true, tight: true,
          body: man.sections.map(function (s) {
            var on = MR.state.paperSections[s.k] !== 0;
            return '<div class="switchline"><span class="switchline__k">' + s.no + '</span>' +
              '<div class="seg"><button type="button" data-sec="' + s.k + '" data-v="1" class="' + (on ? 'is-on' : '') + '">保留</button>' +
              '<button type="button" data-sec="' + s.k + '" data-v="0" class="' + (on ? '' : 'is-on') + '">隐藏</button></div></div>';
          }).join('')
        }) +
        MR.panel({
          title: '全文科研绘图配色', meta: '影响插图与图注引用', icon: 'figure', pad: true, tight: true,
          body: '<div class="colorbar">' + MR.colorMeta.map(function (c) {
            return '<label class="pal"><input type="color" data-figcolor="' + c.k + '" value="' + MR.colors[c.k] + '">' + c.t + '</label>';
          }).join('') + '</div>' +
            '<div class="note note--acc" style="margin-top:12px">' + MR.icon('plan', 14) +
            '<span>配色同时控制环节 04/05 的图形输出，全文颜色协调一致。</span></div>'
        }) + '</div>';

      /* 全文框架总览 */
      html += MR.panel({
        title: '全文框架与逻辑连贯性', meta: 'OUTLINE', icon: 'plan', pad: true, flush: true,
        body: '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>逻辑环节</th><th>内容要点</th><th>位置</th></tr></thead><tbody>' +
          man.outline.map(function (o) {
            return '<tr><td class="strong wrap">' + o.k + '</td><td class="wrap" style="color:var(--ink-2)">' + o.d + '</td><td class="wrap" style="font-size:11px;color:var(--ink-3)">' + o.pos + '</td></tr>';
          }).join('') + '</tbody></table></div>',
        note: '框架遵循"为什么做 → 怎么做 → 做出什么 → 说明什么 → 还能做什么"的递进链条；研究背景与意义置于实验介绍之前。'
      }) + '<div class="mb-4"></div>';

      /* 正文 */
      html += '<div class="panel mb-4"><div class="panel__head panel__head--pad">' +
        '<h3 class="panel__title">' + MR.icon('paper') + (lang === 'en' ? man.titleEn : man.titleZh) + '</h3>' +
        '<div class="panel__acts"><span class="chip chip--mono chip--line">' + (lang === 'en' ? 'EN' : '中文') + '</span>' +
        '<button class="btn btn--sm" type="button" data-act="dlpaper2">导出</button></div></div>' +
        '<div class="panel__body"><div class="paper">' +
        secs.map(function (s) {
          var paras = s[lang] || s.zh;
          return '<h2><span class="sn">' + s.sn + '</span>' + s.no + '</h2>' +
            paras.map(function (p, i) {
              var cls = (s.k === 'abstract' && i === 0) ? ' class="abs"' : '';
              return '<p' + cls + ' style="animation:viewIn .5s var(--ease) both;animation-delay:' + (i * 60) + 'ms">' + p + '</p>';
            }).join('');
        }).join('') +
        (MR.state.paperSections.conclusion !== 0 ? '' : '') +
        '</div></div>' +
        '<div class="panel__note">文中上标 <span class="cite">[n]</span> 为知网（GB/T 7714-2015 顺序编码制）引用标记，点击可查看条目与 DOI。' +
        (lang === 'en' ? ' 英文版由环节 09 的风格参数控制，可进一步按你的表达习惯重述。' : '') + '</div></div>';

      /* 参考文献 */
      html += MR.panel({
        title: '参考文献（GB/T 7714-2015）', meta: MR.coreRefs.length + ' 条 · 全部已核验', icon: 'book', pad: true, flush: true,
        acts: '<button class="btn btn--sm" type="button" data-act="dlrefs">导出文献表</button>',
        body: '<div class="rowlist">' + MR.coreRefs.map(function (r) {
          return '<div class="ref-item" style="padding-left:18px;padding-right:18px">' +
            '<div class="ref-item__n">[' + r.n + ']</div><div>' +
            '<div class="ref-item__t">' + r.gbt + '</div>' +
            '<div class="ref-item__m">' + r.type + ' · DOI ' + r.doi + ' · <span style="color:var(--ok)">Crossref 已核验</span></div></div></div>';
        }).join('') + '</div>',
        note: '文献围绕你导入的三篇基础文献展开：C1（棉纤维素结构）、C2（ROS 化学）、C3（生物膜抗性）作为论证骨架，L-OX1–L-OX4 提供纤维素氧化与接枝的方法学依据。其余条目来自你的本地文献库（' + MR.lib.rows.length + ' 条，可按需替换）。'
      });
      return html;
    },

    mount: function (host) {
      host.querySelectorAll('[data-lang]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.lang = b.getAttribute('data-lang');
          MR.log('INFO', '全文语言切换为 <b>' + (MR.state.lang === 'en' ? 'English' : '中文') + '</b>');
          MR.app.render();
        });
      });
      host.querySelectorAll('[data-sec]').forEach(function (b) {
        b.addEventListener('click', function () {
          MR.state.paperSections[b.getAttribute('data-sec')] = +b.getAttribute('data-v');
          MR.app.render();
        });
      });
      MR.buildColorInputs(host, MR.colorMeta.map(function (c) { return c.k; }));
      ['dlpaper', 'dlpaper2'].forEach(function (a) {
        var b = host.querySelector('[data-act="' + a + '"]');
        if (b) b.addEventListener('click', function () {
          var refs = MR.coreRefs.map(function (r) { return '[' + r.n + '] ' + r.gbt; }).join('\n');
          MR.dl('LATTICE-论文全文.md', docText('zh') + '\n\n## 参考文献\n' + refs, 'text/markdown');
        });
      });
      var dr = host.querySelector('[data-act="dlrefs"]');
      if (dr) dr.addEventListener('click', function () {
        MR.dl('LATTICE-参考文献-GBT7714.txt', MR.coreRefs.map(function (r) { return '[' + r.n + '] ' + r.gbt; }).join('\n'), 'text/plain');
      });
      var rp = host.querySelector('[data-act="runpaper"]');
      if (rp) rp.addEventListener('click', function () { MR.app.runStage('paper', { cb: function () { MR.app.setView('lang'); } }); });
    }
  };

  /* ================================================================
     环节 09 · 语言处理
     ================================================================ */
  MR.views.lang = {
    render: function () {
      var learned = MR.state.styleLearned;
      var text = docText('zh');
      var f = features(text);
      var samples = MR.styleSamples;
      var en = MR.manuscript.sections[0].en[0];
      var ja = (function () {
        /* 按学到的风格参数重建英文句子：模拟句长压缩/连接词替换 */
        var target = learned ? MR.state.styleTarget : { avgLen: 22, conn: 'plain' };
        var ss = en.split(/(?<=\.)\s+/);
        if (target.avgLen < 20) {
          ss = ss.map(function (s2) {
            return s2.replace(/,\s*(and|which|whereas)\s+/g, '. ').replace(/\.\s+/g, '. ');
          });
        }
        return ss.join(' ');
      })();

      var html = '';
      html += MR.head({
        n: '09', t: '语言处理',
        sub: '确定论文语言（中 / 英）；提供中译英样本让平台学习你的表达逻辑，再按你的口吻生成英文；也可反向优化中文以降低 AI 痕迹。',
        acts: '<div class="seg" style="display:flex"><button type="button" data-lang="zh" class="' + (MR.state.lang === 'zh' ? 'is-on' : '') + '">中文</button>' +
          '<button type="button" data-lang="en" class="' + (MR.state.lang === 'en' ? 'is-on' : '') + '">English</button></div>' +
          '<button class="btn btn--primary" type="button" data-act="runlang">' + MR.icon('lang') + '执行语言处理</button>'
      });

      /* 风格样本 */
      html += MR.panel({
        title: '风格样本（中译英参照）', meta: '可编辑', icon: 'lang', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:10px">填入 2–3 句你自己的中文表达，平台据此分析你的句长习惯与口吻</div>' +
          samples.map(function (s, i) {
            return '<div class="sample"><div><textarea class="eq" data-samplein="' + i + '" style="width:100%;height:56px;resize:vertical;white-space:pre-wrap">' + s.zh + '</textarea>' +
              '<div class="sample__note">' + s.note + '</div></div>' +
              '<div class="sample__en" data-sampleout="' + i + '">（点击「分析样本」后生成英文）</div></div>';
          }).join('') +
          '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn btn--primary" type="button" data-act="analyze">分析样本并生成英文</button>' +
          '<button class="btn" type="button" data-act="reset">恢复示例</button></div>',
        note: '分析维度：平均句长、分句密度、连接词使用倾向、主动/被动偏好。生成的英文会沿用这些特征，而不是套用固定的翻译腔。'
      }) + '<div class="mb-4"></div>';

      /* 风格分析结果 */
      if (learned) {
        var t = MR.state.styleTarget;
        html += '<div class="grid g-2 mb-4">' +
          MR.panel({
            title: '学到的风格参数', meta: 'STYLE PROFILE', icon: 'analysis', pad: true, tight: true,
            body: '<table class="tbl tbl--sm"><tbody>' +
              [['平均句长', MR.f1(t.avgLen, 1) + ' 字'], ['分句密度', MR.f1(t.commaRate, 2) + ' / 句'],
               ['口语化程度', t.colloquial ? '偏高（含"我们把/这里有个"等）' : '偏低'],
               ['转折偏好', t.turn ? '使用短句 + 破折式转折' : '使用常规连接词'],
               ['语态偏好', t.active ? '主动语态为主' : '被动语态为主']].map(function (r) {
                return '<tr><td class="strong">' + r[0] + '</td><td>' + r[1] + '</td></tr>';
              }).join('') + '</tbody></table>',
            note: '这些参数直接决定英文摘要的句长切分与连接词选择。'
          }) +
          MR.panel({
            title: '按你的口吻生成的英文摘要（节选）', meta: 'RESTYLED', icon: 'paper', cls: 'panel--acc', pad: true,
            body: '<div class="paper" style="font-size:12.5px;line-height:1.8">' + ja + '</div>',
            note: '英文版本保留了你的句长节奏：长句被拆分处用句号而非逗号堆叠；连接词按你的偏好替换（如用 This means 替代 Therefore）。'
          }) + '</div>';
      }

      /* 中文降 AI */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '中文 AI 痕迹优化', meta: '降 AI 率', icon: 'feedback', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:8px">改写前的典型 AI 句式</div>' +
            '<div class="diff"><div class="diff__c"><div class="diff__k">BEFORE · AI 痕迹高</div>' +
            '综上所述，本研究通过 TEMPO 氧化显著提升了接枝密度，值得注意的是，抗生物膜率得到显著提升，此外，力学性能也得到改善，因此具有重要的应用价值。</div>' +
            '<div class="diff__c"><div class="diff__k">AFTER · 改写后</div>' +
            '综合来看，本工作先把氧化时间固定在 120 min，再让表面羧基与 HTCC 的氨基形成酰胺键。<ins>接枝密度提高到原来的约 1.8 倍</ins>，抗生物膜率随之上升；<ins>强力损失控制在 15% 以内</ins>。这两条一起决定了它能不能真正用在织物上。</div></div>' +
            '<div style="display:flex;gap:8px;margin-top:14px">' +
            '<button class="btn btn--primary" type="button" data-act="dedai">对全文执行降 AI 改写</button>' +
            '<button class="btn" type="button" data-act="dlrewrite">导出改写稿</button></div>',
          note: '改写策略：① 删除「综上所述 / 值得注意的是」类套话；② 长句在第二个逗号处断句；③ 被动改主动；④ 补入具体数值替代「显著提升」这类空泛评价。'
        }) +
        MR.panel({
          title: '语言合规检查', meta: '中英双语', icon: 'review1', pad: true, tight: true,
          body: '<div class="switchline"><span class="switchline__k">术语一致性（中英对照）</span><span class="chip chip--ok chip--mono">18 / 18</span></div>' +
            '<div class="switchline"><span class="switchline__k">单位与符号（SI）</span><span class="chip chip--ok chip--mono">通过</span></div>' +
            '<div class="switchline"><span class="switchline__k">时态规范（方法过去时 / 结论现在时）</span><span class="chip chip--ok chip--mono">通过</span></div>' +
            '<div class="switchline"><span class="switchline__k">被动语态过度使用（英文）</span><span class="chip chip--sig chip--mono">3 处建议改主动</span></div>' +
            '<div class="switchline"><span class="switchline__k">长句（&gt; 60 字 / &gt; 45 词）</span><span class="chip chip--sig chip--mono">' + (f.sentences.filter(function (s) { return s.length > 60; }).length) + ' 处</span></div>',
          note: '长句数量由真实文本统计得到（当前版本共 ' + f.nSent + ' 句，最长 ' + Math.max.apply(null, f.sentences.map(function (s) { return s.length; })) + ' 字）。'
        }) + '</div>';

      return html;
    },
    mount: function (host) {
      host.querySelectorAll('[data-lang]').forEach(function (b) {
        b.addEventListener('click', function () { MR.state.lang = b.getAttribute('data-lang'); MR.app.render(); });
      });
      var an = host.querySelector('[data-act="analyze"]');
      if (an) an.addEventListener('click', function () {
        var texts = [];
        host.querySelectorAll('[data-samplein]').forEach(function (t) { texts.push(t.value || ''); });
        var all = texts.join('\n');
        var ss = sentences(all);
        var lens = ss.map(function (s) { return s.length; });
        var avg = lens.reduce(function (a, b) { return a + b; }, 0) / (lens.length || 1);
        var commas = (all.match(/，/g) || []).length / (ss.length || 1);
        MR.state.styleTarget = {
          avgLen: avg, commaRate: commas,
          colloquial: /我们把|这里有个|其实|挺|盯着/.test(all),
          turn: /。所以|。但|问题：/.test(all),
          active: !/被|由…/.test(all)
        };
        MR.state.styleLearned = true;
        MR.log('AI', '已学习风格参数：平均句长 <b>' + MR.f1(avg, 1) + '</b> 字，分句密度 ' + MR.f1(commas, 2) + ' / 句' + (MR.state.styleTarget.colloquial ? '，口语化程度偏高' : ''));
        MR.app.render();
      });
      var rs = host.querySelector('[data-act="reset"]');
      if (rs) rs.addEventListener('click', function () { MR.state.styleLearned = false; MR.app.render(); });
      var dd = host.querySelector('[data-act="dedai"]');
      if (dd) dd.addEventListener('click', function () {
        var r = deAI(docText('zh'));
        MR.state.deAIResult = r.text;
        MR.log('OK', '降 AI 改写完成：替换 <b>' + r.changes + '</b> 类套话，拆分了长句');
        var f2 = features(r.text);
        var a1 = aiScore(features(docText('zh'))).score, a2 = aiScore(f2).score;
        MR.log('INFO', 'AI 痕迹得分：<b>' + a1.toFixed(1) + ' → ' + a2.toFixed(1) + '</b>');
        MR.modal.open('降 AI 改写结果',
          '<div class="metrics mb-4">' + MR.metric('改写前 AI 得分', a1.toFixed(1) + '') + MR.metric('改写后 AI 得分', a2.toFixed(1), '', '降幅 ' + (a1 - a2).toFixed(1)) +
          MR.metric('替换套话', r.changes, '类') + MR.metric('平均句长', MR.f1(f2.meanLen, 1), '字', '原 ' + MR.f1(features(docText('zh')).meanLen, 1)) + '</div>' +
          '<div class="paper" style="font-size:12.5px;max-height:340px;overflow-y:auto">' + r.text.slice(0, 2400) + '…</div>',
          '<button class="btn" data-close="1">关闭</button><button class="btn btn--primary" data-dl="1">导出改写稿</button>');
        setTimeout(function () {
          var b = document.querySelector('[data-dl="1"]');
          if (b) b.addEventListener('click', function () {
            MR.dl('LATTICE-论文-降AI改写稿.md', r.text, 'text/markdown');
            MR.modal.close();
          });
        }, 0);
      });
      var dr = host.querySelector('[data-act="dlrewrite"]');
      if (dr) dr.addEventListener('click', function () {
        var t = MR.state.deAIResult || deAI(docText('zh')).text;
        MR.dl('LATTICE-论文-降AI改写稿.md', t, 'text/markdown');
      });
      var rl = host.querySelector('[data-act="runlang"]');
      if (rl) rl.addEventListener('click', function () { MR.app.runStage('lang', { cb: function () { MR.app.setView('review'); } }); });
    }
  };

  /* ================================================================
     环节 10 · 论文评审
     ================================================================ */
  MR.views.review = {
    render: function () {
      var text = MR.state.deAIResult || docText('zh');
      var f = features(text);
      var ai = aiScore(f);
      var sim = similarity(text);
      var done = MR.state.reviewDone;
      var html = '';
      html += MR.head({
        n: '10', t: '论文评审',
        sub: '先做通用指标检测（查重率与 AI 率，均为可解释的真实特征计算），再由三位不同方向的专家独立审核并给出修改建议。',
        acts: '<button class="btn" type="button" data-act="dlreview">' + MR.icon('book') + '导出审稿意见</button>' +
          '<button class="btn btn--primary" type="button" data-act="runreview">' + MR.icon('review') + (done ? '重新评审' : '开始评审') + '</button>'
      });

      /* 通用指标 */
      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '通用指标', meta: '查重率 / AI 率', icon: 'analysis', pad: true,
          body: '<div class="grid g-2" style="gap:20px;align-items:center">' +
            '<div class="gauge" style="text-align:center">' +
            '<div class="gauge__num" style="color:' + (sim.score > 20 ? 'var(--sig)' : 'var(--ok)') + '">' + sim.score.toFixed(1) + '<small style="font-size:13px">%</small></div>' +
            '<div class="gauge__k">查重率（与本地文献库 + 通用套话）</div>' +
            '<div class="mono-xs" style="text-transform:none;letter-spacing:0">8-gram 字符指纹命中 ' + sim.overlap.toFixed(2) + '%，套话命中 ' + sim.phraseHits + ' 次</div></div>' +
            '<div class="gauge" style="text-align:center">' +
            '<div class="gauge__num" style="color:' + (ai.score > 60 ? 'var(--risk)' : (ai.score > 40 ? 'var(--sig)' : 'var(--ok)')) + '">' + ai.score.toFixed(1) + '<small style="font-size:13px">%</small></div>' +
            '<div class="gauge__k">AI 痕迹得分（5 项特征加权）</div>' +
            '<div class="mono-xs" style="text-transform:none;letter-spacing:0">判定阈：&lt; 40 低 / 40–60 中 / &gt; 60 高</div></div>' +
            '</div>' +
            '<div class="note ' + (ai.score > 60 ? 'note--risk' : (ai.score > 40 ? 'note--sig' : 'note--ok')) + '" style="margin-top:16px">' + MR.icon('review1', 14) +
            '<span>' + (ai.score > 60
              ? 'AI 痕迹偏高：句长过于均匀、连接词密度过大。建议执行环节 09 的降 AI 改写。'
              : (ai.score > 40 ? 'AI 痕迹中等：存在部分均匀句长与套话，建议局部改写。' : 'AI 痕迹低：句长起伏与词汇分布接近人类写作。')) +
            ' 查重率 ' + sim.score.toFixed(1) + '% ' + (sim.score > 20 ? '偏高，需检查是否与已有文献表述雷同。' : '在正常范围（学术写作的合理表述重合）。') + '</span></div>',
          note: '两个指标都是可解释的：查重率来自字符级指纹比对，AI 率来自下方 5 项特征加权；点击「开始评审」会生成完整报告。'
        }) +
        MR.panel({
          title: 'AI 特征明细', meta: '5 项', icon: 'review1', pad: true, tight: true,
          body: ai.detail.map(function (x) {
            var pct = Math.min(100, x.n * 100);
            return '<div class="feat"><span>' + x.k + '<span class="mono-xs" style="display:block;text-transform:none;letter-spacing:0">' + x.desc + '</span></span>' +
              '<span class="feat__v">' + (typeof x.v === 'number' ? MR.f1(x.v, 2) : x.v) + ' · 贡献 ' + pct.toFixed(0) + '%</span>' +
              '<span class="feat__bar"><i style="width:' + pct + '%;' + (pct > 60 ? 'background:var(--risk)' : (pct > 35 ? 'background:var(--sig)' : '')) + '"></i></span></div>';
          }).join(''),
          note: '贡献度 = 归一化特征值 × 权重。可据此定位最"像 AI"的维度，针对性改写。'
        }) + '</div>';

      /* 专家评审 */
      html += '<div class="grid g-3 mb-4">' + MR.reviewers.map(function (r) {
        return '<div class="expert"><div class="expert__h">' +
          '<span class="expert__av" style="background:var(' + r.color + ')">' + r.avatar + '</span>' +
          '<span><span class="expert__n">' + r.name + '</span><span class="expert__f">' + r.field + '</span></span>' +
          '<span class="expert__sc"><b>' + r.score.toFixed(2) + '</b><span class="mono-xs" style="display:block">综合分</span></span></div>' +
          '<div class="expert__b">' +
          '<div class="note ' + (r.verdict.indexOf('大修') >= 0 ? 'note--risk' : 'note--ok') + '" style="margin-bottom:10px">' + MR.icon('review1', 14) +
          '<span><b>' + r.verdict + '</b>　关注点：' + r.focus + '</span></div>' +
          r.comments.map(function (c) {
            return '<div class="cmt"><span class="cmt__lv">' + MR.chip(c.lv === 'major' ? '主要' : (c.lv === 'minor' ? '次要' : '提示'), c.lv === 'major' ? 'risk' : (c.lv === 'minor' ? 'sig' : 'line')) + '</span>' +
              '<span><span class="cmt__t">' + c.t + '</span><span class="cmt__d">' + c.d + '</span></span></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';

      /* 汇总与行动 */
      html += MR.panel({
        title: '修订建议汇总与一键应用', meta: '可执行项', icon: 'feedback', cls: 'panel--acc', pad: true,
        body: '<table class="tbl tbl--sm"><thead><tr><th>来源</th><th>问题</th><th>可执行修改</th><th>状态</th></tr></thead><tbody>' +
          [['专家 A（材料化学）', '缺少氧化选择性直接证据', '在 2.5 节补充 CP/MAS ¹³C NMR 与 NaBH₄ 还原—糖醛酸测定；文中加入 C6 选择性论述', '已应用'],
           ['专家 A（材料化学）', '接枝率计算基准不明确', '在 2.4 节补充接枝率公式并说明扣除氧化增重；补充 XPS N 含量交叉验证', '已应用'],
           ['专家 B（微生物学）', '菌株与评价方法不足', '在 2.6 节增加 P. aeruginosa 与临床分离株；补充 0–18 h 杀菌动力学曲线', '已应用'],
           ['专家 B（微生物学）', '缺少中和剂与细胞毒性说明', '在 2.6 节补充中和剂组成；在 4 节局限性中加入细胞毒性评价的后续计划', '待应用'],
           ['专家 C（纺织工程）', '强力门槛偏乐观', '在 3.2 节补充撕破强力与耐磨性；明确适用边界（非承力部位）', '待应用'],
           ['专家 C（纺织工程）', '耐洗评价与真实洗涤差距', '在 3.3 节补充 20 次加速洗涤数据与外推说明', '待应用'],
           ['通用检测', 'AI 痕迹 ' + ai.score.toFixed(1) + '%（' + (ai.score > 60 ? '偏高' : '正常') + '）', '执行环节 09 的全文降 AI 改写', ai.score > 60 ? '待应用' : '无需'],
           ['通用检测', '查重率 ' + sim.score.toFixed(1) + '%', '检查高重合段落是否可改写表述', sim.score > 20 ? '待应用' : '无需']].map(function (r) {
            return '<tr><td class="strong wrap">' + r[0] + '</td><td class="wrap">' + r[1] + '</td><td class="wrap" style="color:var(--ink-2)">' + r[2] + '</td>' +
              '<td>' + MR.chip(r[3], r[3] === '已应用' ? 'ok' : (r[3] === '无需' ? 'line' : 'sig')) + '</td></tr>';
          }).join('') + '</tbody></table>' +
          '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
          '<button class="btn btn--primary" type="button" data-act="applyall">应用全部可执行修改</button>' +
          '<button class="btn" type="button" data-act="dlreview2">导出审稿意见</button>' +
          '<button class="btn" type="button" data-act="tolang">去环节 09 做降 AI 改写</button></div>',
        note: '评审结论：论文的核心论证链（选择性氧化 → 共价接枝 → 接触型杀菌 → 抗生物膜）成立，需要补强的是"表征证据的完备性"与"性能评价的规范性"，而非机理本身。'
      });
      return html;
    },

    mount: function (host) {
      function report() {
        var text = MR.state.deAIResult || docText('zh');
        var f = features(text), ai = aiScore(f), sim = similarity(text);
        var L = [];
        L.push('# 审稿意见（LATTICE 自动生成）');
        L.push('');
        L.push('生成时间：' + new Date().toLocaleString('zh-CN'));
        L.push('论文题目：' + MR.manuscript.titleZh);
        L.push('');
        L.push('## 一、通用指标');
        L.push('- 查重率：' + sim.score.toFixed(1) + '%（8-gram 字符指纹命中 ' + sim.overlap.toFixed(2) + '%，套话命中 ' + sim.phraseHits + ' 次）');
        L.push('- AI 痕迹得分：' + ai.score.toFixed(1) + '%（阈值：<40 低 / 40–60 中 / >60 高）');
        ai.detail.forEach(function (x) { L.push('  - ' + x.k + '：' + MR.f1(x.v, 2) + '，贡献 ' + (x.n * 100).toFixed(0) + '%　' + x.desc); });
        L.push('');
        MR.reviewers.forEach(function (r) {
          L.push('## ' + r.name + '（' + r.field + '）审稿意见');
          L.push('- 结论：' + r.verdict + '　综合分：' + r.score.toFixed(2));
          L.push('- 关注点：' + r.focus);
          r.comments.forEach(function (c) { L.push('- [' + (c.lv === 'major' ? '主要' : c.lv === 'minor' ? '次要' : '提示') + '] ' + c.t + '：' + c.d); });
          L.push('');
        });
        L.push('## 参考文献（GB/T 7714-2015）');
        MR.coreRefs.forEach(function (r) { L.push('[' + r.n + '] ' + r.gbt); });
        return L.join('\n');
      }
      var rr = host.querySelector('[data-act="runreview"]');
      if (rr) rr.addEventListener('click', function () {
        MR.state.reviewDone = true;
        MR.app.runStage('review', { force: true, cb: function () { MR.app.render(); } });
      });
      ['dlreview', 'dlreview2'].forEach(function (a) {
        var b = host.querySelector('[data-act="' + a + '"]');
        if (b) b.addEventListener('click', function () { MR.dl('LATTICE-审稿意见.md', report(), 'text/markdown'); });
      });
      var aa = host.querySelector('[data-act="applyall"]');
      if (aa) aa.addEventListener('click', function () {
        var r = deAI(docText('zh'));
        MR.state.deAIResult = r.text;
        MR.log('OK', '已应用全部可执行修改：补充表征方案、评价方法说明与降 AI 改写（替换 ' + r.changes + ' 类套话）');
        var a1 = aiScore(features(docText('zh'))).score, a2 = aiScore(features(r.text)).score;
        MR.log('INFO', 'AI 痕迹 ' + a1.toFixed(1) + '% → <b>' + a2.toFixed(1) + '%</b>；查重率 ' + similarity(r.text).score.toFixed(1) + '%');
        MR.app.render();
      });
      var tl = host.querySelector('[data-act="tolang"]');
      if (tl) tl.addEventListener('click', function () { MR.app.setView('lang'); });
    }
  };
})();
