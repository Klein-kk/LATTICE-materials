/* ============================================================
   LATTICE · 桌面精灵（高分子 IP 小助手「小晶」）
   ------------------------------------------------------------
   纯前端悬浮窗：可拖拽、悬停显示当前论文摘要 + 关联热点方向，
   点击展开对话窗（基于已抽取数据做"接地"答疑 + 给出检索方向）。
   无后端、无真实 LLM：对话是"规则化 + 数据驱动"的问答，
   不会凭空生成论文里没有的信息。
   设计全部使用平台主题变量，自动适配明/暗主题与强调色。
   ============================================================ */
window.MR = window.MR || {};

MR.mascot = (function () {

  var POS_KEY = 'lattice.mascot.pos';
  var SEEN_KEY = 'lattice.mascot.seen';
  var W = 62, H = 62;
  var sprite, bubble, chat, chatBody, inputEl, els = {};
  var ctx = { title: '', abstract: '', domain: '', paperType: '', materials: [], keywords: [], hots: [] };
  var inited = false;

  /* 关联热点方向（启发式：按本篇领域给一个方向池，非实时趋势数据） */
  var TRENDS = {
    '生物质纤维增强复合材料': ['绿色复合材料', '纤维表面改性', '界面增韧', '可再生建材'],
    '水泥基复合材料': ['低碳胶凝材料', '纤维增韧水泥', '氯氧镁水泥', '3D 打印建材'],
    '抗菌材料与生物膜': ['抗菌肽', '光催化抗菌', '抗生物膜涂层', '医用高分子'],
    '天然高分子改性': ['壳聚糖改性', '纤维素纳米晶', '可降解包装', '智能水凝胶'],
    '电化学储能材料': ['固态电池', '钠离子电池', '硅碳负极', '电极界面工程'],
    '功能薄膜与涂层': ['柔性透明导电膜', '钙钛矿光伏', '防腐涂层', '超疏水表面'],
    '催化材料': ['单原子催化', '电催化析氢', '光催化降解', 'CO₂ 还原'],
    '材料科学': ['机器学习辅助材料设计', '高通量筛选', '多尺度表征', '可解释机理']
  };

  /* ---------- SVG 形象：高分子晶格小人「小晶」 ---------- */
  function spriteSVG() {
    /* currentColor 跟随 CSS 设置的 --acc；节点与化学键构成晶格网 */
    return '<svg viewBox="0 0 56 56" aria-hidden="true">' +
      '<g class="lm-ring" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.5">' +
        '<path d="M28 6 L46 16.5 L46 37.5 L28 48 L10 37.5 L10 16.5 Z"/>' +
        '<path d="M28 6 L28 48 M10 16.5 L46 37.5 M46 16.5 L10 37.5"/>' +
      '</g>' +
      '<circle cx="20" cy="25" r="3.4" fill="currentColor"/>' +
      '<circle cx="36" cy="25" r="3.4" fill="currentColor"/>' +
      '<circle cx="28" cy="40" r="3.4" fill="currentColor"/>' +
      '<g fill="currentColor">' +
        '<circle cx="22.5" cy="24" r="1.1" fill="#fff"/>' +
        '<circle cx="33.5" cy="24" r="1.1" fill="#fff"/>' +
      '</g>' +
      '<path d="M22 30 Q28 34 34 30" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' +
      '</svg>';
  }
  function miniSVG() {
    return '<svg viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" opacity="0.8">' +
      '<path d="M28 8 L45 18 L45 38 L28 48 L11 38 L11 18 Z"/></g>' +
      '<circle cx="21" cy="24" r="3" fill="currentColor"/><circle cx="35" cy="24" r="3" fill="currentColor"/>' +
      '<circle cx="28" cy="39" r="3" fill="currentColor"/></svg>';
  }

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function $(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 初始位置：右下，避开 trace / console ---------- */
  function defaultPos() {
    var x = clamp(window.innerWidth - W - 22, 8, window.innerWidth - W - 8);
    var y = clamp(window.innerHeight - H - 96, 8, window.innerHeight - H - 8);
    return { x: x, y: y };
  }
  function loadPos() {
    try {
      var p = JSON.parse(localStorage.getItem(POS_KEY));
      if (p && isFinite(p.x) && isFinite(p.y)) {
        p.x = clamp(p.x, 8, window.innerWidth - W - 8);
        p.y = clamp(p.y, 8, window.innerHeight - H - 8);
        return p;
      }
    } catch (e) {}
    return defaultPos();
  }
  function savePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (e) {} }

  /* ---------- 创建 DOM ---------- */
  function build() {
    sprite = $('' +
      '<div class="lattice-sprite" id="lmSprite" role="button" tabindex="0" aria-label="LATTICE 小晶 · 桌面助手">' +
      spriteSVG() +
      '<span class="lm-dot" title="已就绪"></span>' +
      '</div>');
    sprite.style.left = '0px'; sprite.style.top = '0px';

    bubble = $('' +
      '<div class="lattice-bubble" id="lmBubble" role="tooltip">' +
      '<h4 id="lmBTitle"></h4>' +
      '<div id="lmBAbstract" class="lm-k"></div>' +
      '<div class="lm-k" style="margin-top:8px">关联热点方向</div>' +
      '<div class="lm-hots" id="lmHots"></div>' +
      '</div>');

    chat = $('' +
      '<div class="lattice-chat" id="lmChat" role="dialog" aria-label="小晶解答">' +
      '<div class="lc-head">' +
        '<span class="lc-ava">' + miniSVG() + '</span>' +
        '<span><span class="lc-title">小晶 · 论文助手</span><br><span class="lc-sub" id="lmSub">基于本篇已抽取数据答疑</span></span>' +
        '<button class="lc-x" id="lmClose" type="button" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="lc-body" id="lcBody"></div>' +
      '<div class="lc-quick" id="lcQuick"></div>' +
      '<div class="lc-input"><input id="lcInput" type="text" placeholder="问问小晶（基于本篇数据）…" /><button id="lcSend" type="button">发送</button></div>' +
      '</div>');

    document.body.appendChild(sprite);
    document.body.appendChild(bubble);
    document.body.appendChild(chat);

    els = {
      bTitle: document.getElementById('lmBTitle'),
      bAbstract: document.getElementById('lmBAbstract'),
      hots: document.getElementById('lmHots'),
      sub: document.getElementById('lmSub'),
      body: document.getElementById('lcBody'),
      quick: document.getElementById('lcQuick'),
      input: document.getElementById('lcInput'),
      send: document.getElementById('lcSend'),
      close: document.getElementById('lmClose')
    };

    var p = loadPos();
    setPos(p);
    bind();
  }

  function setPos(p) {
    sprite.style.left = p.x + 'px';
    sprite.style.top = p.y + 'px';
    positionBubble(p);
  }
  function positionBubble(p) {
    var rightSide = (p.x + W / 2) < window.innerWidth / 2;
    var bw = 320, bh = bubble.offsetHeight || 150;
    var x = rightSide ? (p.x + W + 12) : (p.x - bw - 12);
    x = clamp(x, 8, window.innerWidth - bw - 8);
    var y = clamp(p.y - 10, 8, window.innerHeight - bh - 8);
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
  }

  /* ---------- 拖拽 + 边缘吸附 ---------- */
  function bind() {
    var dragging = false, ox = 0, oy = 0, moved = false;
    sprite.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      sprite.classList.add('lm-dragging');
      sprite.setPointerCapture(e.pointerId);
      var x = parseFloat(sprite.style.left), y = parseFloat(sprite.style.top);
      ox = e.clientX - x; oy = e.clientY - y;
      hideBubble();
      e.preventDefault();
    });
    sprite.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved = true;
      var x = clamp(e.clientX - ox, 8, window.innerWidth - W - 8);
      var y = clamp(e.clientY - oy, 8, window.innerHeight - H - 8);
      setPos({ x: x, y: y });
    });
    sprite.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      sprite.classList.remove('lm-dragging');
      try { sprite.releasePointerCapture(e.pointerId); } catch (x) {}
      /* 边缘吸附：按中心位置选左 / 右 */
      var cx = parseFloat(sprite.style.left) + W / 2;
      var x = (cx < window.innerWidth / 2) ? 12 : (window.innerWidth - W - 12);
      var y = clamp(parseFloat(sprite.style.top), 8, window.innerHeight - H - 8);
      setPos({ x: x, y: y });
      savePos({ x: x, y: y });
      /* 没移动过 = 点击：切换对话窗 */
      if (!moved) toggleChat();
    });
    sprite.addEventListener('mouseenter', function () { if (!chat.classList.contains('show')) showBubble(); });
    sprite.addEventListener('mouseleave', function () { hideBubble(); });
    sprite.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChat(); }
    });

    els.close.addEventListener('click', hideChat);
    els.send.addEventListener('click', sendInput);
    els.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendInput(); });

    window.addEventListener('resize', function () {
      var p = loadPos(); setPos(p);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideChat(); hideBubble(); }
    });
  }

  function showBubble() {
    refreshBubble();
    bubble.classList.add('show');
  }
  function hideBubble() { bubble.classList.remove('show'); }

  function refreshBubble() {
    els.bTitle.textContent = ctx.title || '尚未导入文献';
    els.bAbstract.textContent = ctx.abstract || '把文献拖进平台（或粘贴正文），小晶会在这里显示它的摘要。';
    els.hots.innerHTML = '';
    (ctx.hots || []).slice(0, 6).forEach(function (h) {
      var c = document.createElement('span');
      c.className = 'lm-chip'; c.textContent = h; els.hots.appendChild(c);
    });
    if (!(ctx.hots || []).length) {
      var c = document.createElement('span'); c.className = 'lm-chip'; c.textContent = '导入后显示'; els.hots.appendChild(c);
    }
    positionBubble(loadPos());
  }

  /* ---------- 对话窗 ---------- */
  function toggleChat() {
    if (chat.classList.contains('show')) hideChat(); else showChat();
  }
  function showChat() {
    hideBubble();
    if (!els.body.children.length || !localStorage.getItem(SEEN_KEY)) greet();
    localStorage.setItem(SEEN_KEY, '1');
    chat.classList.add('show');
    setTimeout(function () { els.input.focus(); }, 60);
  }
  function hideChat() { chat.classList.remove('show'); }

  function greet() {
    if (!ctx.title) {
      bot('嗨，我是小晶 ✦ 把文献导入平台后，我可以基于它的**真实抽取数据**为你答疑：核心变量、性能指标、工艺步骤、材料清单，甚至给出检索方向。现在还没有文献哦～');
    } else {
      bot('嗨，我是小晶 ✦ 这篇《' + ctx.title + '》我已经读过了。你可以问我：它讲什么、有哪些变量和指标、实验步骤、或者想要检索方向，我都基于原文数据回答，绝不瞎编。');
    }
    renderQuick();
  }

  function addMsg(text, who) {
    var m = document.createElement('div');
    m.className = 'lc-msg ' + (who === 'me' ? 'me' : 'bot');
    m.innerHTML = text;
    els.body.appendChild(m);
    els.body.scrollTop = els.body.scrollHeight;
    return m;
  }
  function bot(text) { addMsg(text, 'bot'); }
  function me(text) { addMsg(esc(text), 'me'); }

  function renderQuick() {
    if (!ctx.title) {
      els.quick.innerHTML = '';
      var b = document.createElement('button'); b.textContent = '怎么用我？';
      b.onclick = function () { me('怎么用你？'); bot('导入一篇材料类文献（上传或粘贴正文），平台会抽取它的原料、变量、指标、步骤。然后：① 鼠标移到我身上看摘要；② 点开我提问；③ 想要更多文献时点「检索方向」，我会帮你搜。'); };
      els.quick.appendChild(b);
      return;
    }
    /* research-assistant 10 子技能（精简为 8 个最常用 preset） */
    var items = [
      ['这篇讲什么？',          '这篇讲什么'],
      ['变量与指标',            '变量与指标'],
      ['实验步骤',              '实验步骤'],
      ['📚 文献检索',           '帮我检索相关文献'],
      ['🔗 引文格式化',         '把引用格式化'],
      ['📮 期刊推荐',           '推荐投稿期刊'],
      ['✨ 学术润色',           '润色建议'],
      ['📝 综述 / 开题建议',    '综述结构建议'],
      ['检索方向',              '检索方向']
    ];
    els.quick.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button'); b.textContent = it[0];
      b.onclick = function () { me(it[0]); bot(answer(it[1])); };
      els.quick.appendChild(b);
    });
  }

  function sendInput() {
    var v = (els.input.value || '').trim();
    if (!v) return;
    els.input.value = '';
    me(v);
    bot(answer(v));
  }

  /* ---------- 接地问答（规则 + 数据驱动） ---------- */
  function answer(q) {
    var s = String(q || '').toLowerCase();
    var an = MR.state && MR.state.analysis, pf = MR.state && MR.state.profile;
    if (!pf || !an) {
      if (/检索|搜索|查|search|方向|scholar|知网|cnki/.test(s)) return searchAdvice(null);
      return '现在还没有导入文献，我没法读取数据。先把文献拖进平台（或粘贴正文），我再基于它的真实抽取结果回答你。';
    }
    if (/摘要|讲什么|概述|概括|about|summary|什么|主题|研究什么|核心/.test(s)) return summary(pf);
    if (/变量|variable|因素|水平|配比/.test(s)) return variables(pf);
    if (/指标|性能|perf|indicator|测试|结果|提升|最优/.test(s)) return indicators(pf);
    if (/步骤|工艺|流程|step|怎么做|制备|method/.test(s)) return steps(pf);
    if (/材料|原料|试剂|material|组分|配方/.test(s)) return materials(pf);
    if (/仪器|设备|instrument|表征手段|怎么测|怎么表征/.test(s)) return instruments(pf);
    if (/类型|综述|研究|review|临床|type|算不算/.test(s)) return paperType(an, pf);
    if (/参考|文献|reference|引用|别人/.test(s)) return references(an);
    if (/检索|搜索|查|search|方向|scholar|知网|cnki|更多|拓展|找/.test(s)) return searchAdvice(pf);

    /* ===== 研究助手 10 子技能（融合 Yts1919/research-assistant） ===== */
    if (/检索|文献检索|paper search|literature/.test(s)) return adviceLiterature(pf);
    if (/精读|深读|细读|读懂|paper reading/.test(s)) return advicePaperReading(pf);
    if (/综述|literature review|写综述|review/.test(s)) return adviceLiteratureReview(pf);
    if (/分节|起草|写章节|section|写作|section writing/.test(s)) return adviceSectionWriting(pf);
    if (/画图|图表|figure|出图|image/.test(s)) return adviceFigureGen(pf);
    if (/引用|citation|格式化|ref|gb|ieee|apa/.test(s)) return adviceCitation();
    if (/润色|改写|语法|中英|translation|polish|academic/.test(s)) return advicePolish();
    if (/预评审|模拟审稿|互盲|prereview|审稿/.test(s)) return advicePreReview(pf);
    if (/开题|proposal|研究方案|研究目标/.test(s)) return adviceProposal(pf);
    if (/格式|模板|重排版|格式化版式|reformat|format/.test(s)) return adviceReformat(pf);
    if (/投稿|期刊推荐|投哪个|where to submit/.test(s)) return adviceJournal(pf);

    /* 兜底：尝试在已抽取字段里做关键词命中 */
    return fallback(q, pf, an);
  }

  /* ===== research-assistant 10 子技能方法 ===== */
  function adviceLiterature(pf) {
    return '📚 **文献检索建议**（基于 <code>Yts1919/research-assistant</code> 文献检索模块）：<br>'
      + '1. 用关键词组合：领域（如「' + (pf.domain || '材料') + '」）+ 材料名 + 工艺名。'
      + '2. 中英文交叉：' + (pf.keywords && pf.keywords[0] || '关键词') + ' + alloy 的 AND 组合<br>'
      + '3. 推荐源：知网 CNKI / 万方 + Web of Science + Scopus + Google Scholar + PubMed<br>'
      + '4. 推荐时段：近 5 年 + 经典文献。<br>'
      + '5. 自动操作：在本平台用右上角"科研绘图" → 文献搜索或 PubMed 检索。';
  }
  function advicePaperReading(pf) {
    var msg = '📖 **精读论文**（基于 research-assistant 精读模块）：<br>'
      + '结构化卡片按四段读：<b>研究问题</b> → <b>方法</b> → <b>结果</b> → <b>结论与意义</b>。<br>'
      + '针对你的《' + esc(pf.title || '这篇') + '》：<br>';
    if (pf.perf && pf.perf[0]) msg += '· 主要指标：<code>' + pf.perf[0].name + '</code>（最优 ' + (pf.perf[0].optimum || '?') + (pf.perf[0].unit || '') + '）<br>';
    if (pf.materials && pf.materials[0]) msg += '· 主要材料：' + pf.materials.slice(0, 3).map(function (m) { return '<code>' + esc(m.name) + '</code>'; }).join('、');
    return msg + '<br>· 重点关注：作者如何用「变量 + 水平 + 响应」支撑结论？是否报告了误差与重复次数？';
  }
  function adviceLiteratureReview(pf) {
    return '📝 **文献综述撰写建议**（research-assistant literature-review）：<br>'
      + '1. 分层：研究背景 → 研究现状（按主题/方法/对象）→ 文献评述 → 你的课题意义。<br>'
      + '2. 必须每条引用真实文献（避免 AI 编造）。<br>'
      + '3. 推荐：本平台环节 08 论文撰写即可基于当前抽取结果生成。<br>'
      + '4. 避免模板句套话（"X 对 Y 至关重要"这种已经被 AI 检测打标）。<br>'
      + '5. 综述提交前过 <a style="color:var(--acc)" href="https://github.com/docsor1212/paper-reference-formatter" target="_blank">paper-reference-formatter</a> 统一文献格式。';
  }
  function adviceSectionWriting(pf) {
    return '✍️ **分节起草建议**（research-assistant section-writing）：<br>'
      + '· 引言：研究背景 + 文献缺口 + 你这篇的目的<br>'
      + '· 实验：材料 → 工艺 → 测试方法（GB/T 国标注标准）<br>'
      + '· 结果与讨论：每一项数据 + 引用文献对比 + 误差分析<br>'
      + '· 结论：3~5 条核心结论（与摘要呼应）<br>'
      + '· 自动操作：本平台环节 08 论文撰写会自动给分节大纲；环节 09 语言处理做降 AIGC 改写。';
  }
  function adviceFigureGen(pf) {
    return '🎨 **图表生成建议**（research-assistant + academic-figures + Show2Know 47 类）：<br>'
      + '可用图表类型（17 类前端可绘）：折线 / 柱状 / 散点 / XRD 谱图 / FTIR / 热力图 / 桑基图 / 小提琴图 / 瀑布图 / 双 Y 轴 / 雷达 / 环形 / 箱线 / 直方图 / 饼图 等。<br>'
      + '· SVG 在线预览：<a style="color:var(--acc)" href="./figures-gallery.html" target="_blank">/figures-gallery.html</a><br>'
      + '· 出版级 600dpi：调用 <code>academic-figures</code> 引擎（学术诚信要求不直接用 AI 生成数据图）。<br>'
      + '· 推荐配色：Nature → Okabe-Ito；中文期刊 → default glm。';
  }
  function adviceCitation() {
    return '🔗 **引文格式化**：<br>'
      + '· GB/T 7714（中国国标） · APA（社会科学） · IEEE（电气/电子） · MLA（人文）<br>'
      + '· 推荐工具：<a style="color:var(--acc)" href="https://github.com/docsor1212/paper-reference-formatter" target="_blank">paper-reference-formatter</a><br>'
      + '· 文献真实核验（避免伪造 DOI）：<a style="color:var(--acc)" href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank">PubMed</a> / <a style="color:var(--acc)" href="https://doi.org" target="_blank">DOI</a> / arXiv<br>'
      + '· arXiv 自 2026-05 起对幻觉引用禁投一年；务必先核验再投稿。<br>'
      + '· 本平台环节 08 在论文生成时会自动按 GB/T 7714 排版引用。';
  }
  function advicePolish() {
    return '✨ **学术润色 / 改写建议**：<br>'
      + '· 自动执行：本平台环节 09 语言处理 → 降 AIGC 改写（用同义词替换 + 句式变换 + 7 类痕迹模式）。<br>'
      + '· 规则：本平台环境变量要求中文 paper 写"学术化书面语"，禁止口语化的"在当今"等。<br>'
      + '· 推荐外部工具：<a style="color:var(--acc)" href="https://github.com/docsor1212/paper-polisher-pro" target="_blank">paper-polisher-pro</a> 或 <a style="color:var(--acc)" href="https://github.com" target="_blank">academic-natural-rewrite</a>。<br>'
      + '· 翻译英文：参考 <a style="color:var(--acc)" href="https://arxiv.org/help/language" target="_blank">arXiv 投稿须知</a> 摘要 < 200 词。';
  }
  function advicePreReview(pf) {
    return '🔍 **模拟审稿 / 互盲预评审**（research-assistant pre-review）：<br>'
      + '本平台环节 10 已内置三位互盲专家（工艺 / 表征 / 统计），自动针对你的论文画像发现问题。<br>'
      + '· P0 必改 / P1 建议 / P2 可选。<br>'
      + '· 关键问题：变量是否都给值？指标是否都分析？误差与重复是否报告？<br>'
      + '· 引文真实性用 <a style="color:var(--acc)" href="https://github.com/docsor1212/reference-verification" target="_blank">reference-verification</a> 单独核验。';
  }
  function adviceProposal(pf) {
    return '🎯 **开题 / 研究方案建议**（research-assistant proposal-writing）：<br>'
      + '· 题目（20 字内，含关键词）<br>'
      + '· 研究背景（200-300 字）<br>'
      + '· 文献综述（500-800 字 + 30+ 真实文献）<br>'
      + '· 研究目标（3-5 条定量目标）<br>'
      + '· 研究方法（变量 / 指标 / 表征 / 统计）<br>'
      + '· 进度安排（甘特图）<br>'
      + '本平台环节 03 变量设计 + 05 结果分析可直接提供方法学支撑。';
  }
  function adviceReformat() {
    return '📐 **格式改写 / 重排版**（research-assistant format-reformat）：<br>'
      + '· 按学校模板 / 期刊模板 自动改字号、边距、列宽。<br>'
      + '· 推荐工具：<a style="color:var(--acc)" href="https://github.com" target="_blank">thesis-format-zh</a> 中文论文格式检查工具。<br>'
      + '· 国外投稿：IEEE / Elsevier / Wiley-VCH 模板均在科研绘图环节准备。';
  }
  function adviceJournal(pf) {
    return '📮 **期刊投稿建议**（融合 journal-submission-assistant + docsor1212 journal db）：<br>'
      + '本平台环节 10 论文评审 已内置 40 个候选期刊的推荐引擎。<br>'
      + '每条推荐给出：领域匹配分 + 关键词命中 + IF 梯度 + 语言 + 官方投稿链接 + 收稿要求。<br>'
      + '打开环节 10 → "推荐投稿期刊" 面板查看完整列表。<br>'
      + '投稿前最后一步：① AI 痕迹 < 40%；② 查重率 < 20%；③ 通讯邮箱标注；④ ORCID；⑤ 投稿系统账号与作者顺序已核对。';
  }

  function summary(pf) {
    var parts = [];
    parts.push('**《' + (pf.title || '未命名') + '》**');
    if (pf.domain) parts.push('· 领域：' + pf.domain);
    if (pf.abstract) parts.push('· 摘要：' + pf.abstract.slice(0, 220) + (pf.abstract.length > 220 ? '…' : ''));
    if (pf.materials && pf.materials.length) parts.push('· 主要材料：' + pf.materials.slice(0, 5).map(function (m) { return m.name; }).join('、'));
    if (pf.keywords && pf.keywords.length) parts.push('· 关键词：' + pf.keywords.slice(0, 8).join('、'));
    return parts.join('<br>');
  }
  function variables(pf) {
    var vs = pf.variables || [];
    if (!vs.length) return '这篇文献里没有识别到"同一参数出现多个取值"的**可控变量**（可能是综述，或数值未以「参数+数值+单位」形式出现）。';
    return '识别到 <b>' + vs.length + '</b> 个变量：<br>' +
      vs.map(function (v) { return '· ' + esc(v.key) + '：' + v.levels.join(' / '); }).join('<br>');
  }
  function indicators(pf) {
    var ps = pf.perf || [], cs = pf.chars || [];
    if (!ps.length && !cs.length) return '没有识别到可测性能指标；若原文有指标名+单位，重新导入或粘贴正文可改善抽取。';
    var out = '性能指标（' + ps.length + '）：<br>' + ps.slice(0, 10).map(function (i) {
      var extra = [];
      if (i.optimum != null) extra.push('最优 ' + i.optimum + (i.unit || ''));
      if (i.improvement != null) extra.push('提升 ' + i.improvement + '%');
      return '· ' + esc(i.name) + (i.unit ? '（' + esc(i.unit) + '）' : '') + (extra.length ? ' — ' + extra.join('，') : '');
    }).join('<br>');
    if (cs.length) out += '<br>表征手段（' + cs.length + '）：' + cs.map(function (c) { return esc(c.name); }).join('、');
    return out;
  }
  function steps(pf) {
    var ss = pf.steps || [];
    if (!ss.length) return '没有识别到明确的工艺步骤（综述类通常没有）。';
    return '工艺步骤（' + ss.length + ' 步）：<br>' + ss.map(function (s, i) { return (i + 1) + '. ' + esc(s.t) + (s.cond ? '（' + esc(s.cond) + '）' : ''); }).join('<br>');
  }
  function materials(pf) {
    var ms = pf.materials || [];
    if (!ms.length) return '没有识别到明确的材料/试剂清单（综述类通常没有；也可能以表格形式给出）。';
    return '材料与试剂（' + ms.length + '）：<br>' + ms.slice(0, 10).map(function (m) {
      return '· ' + esc(m.name) + (m.kind ? ' 〔' + esc(m.kind) + '〕' : '') + (m.supplier ? ' — ' + esc(m.supplier) : '');
    }).join('<br>');
  }
  function instruments(pf) {
    var is = pf.instruments || [];
    if (!is.length) return '没有识别到仪器清单（可能仪器名未与型号/厂家同句出现）。';
    return '仪器设备（' + is.length + '）：<br>' + is.slice(0, 10).map(function (i) { return '· ' + esc(i.name) + (i.model ? ' ' + esc(i.model) : ''); }).join('<br>');
  }
  function paperType(an, pf) {
    return '类型：<b>' + esc(an.typeLabel || '研究论文') + '</b><br>' + esc(an.typeReason || '') +
      (an.typeNote ? '<br><span style="opacity:.8">' + esc(an.typeNote) + '</span>' : '');
  }
  function references(an) {
    var rs = an.references || [];
    if (!rs.length) return '没有识别到参考文献条目（可能是非编号格式，或 PDF 未按行分条）。';
    var head = rs.slice(0, 5).map(function (r) { return '· ' + esc((r.authors || '').slice(0, 40)) + (r.year ? ' (' + r.year + ')' : ''); }).join('<br>');
    return '共识别 <b>' + rs.length + '</b> 条参考文献。示例：<br>' + head + (rs.length > 5 ? '<br>…' : '');
  }

  /* 检索方向：基于本篇领域 + 关键词，给出可点击的检索入口 */
  function searchAdvice(pf) {
    var domain = pf ? (pf.domain || '') : '';
    var kw = pf ? (pf.keywords || []).slice(0, 4) : [];
    var mats = pf ? (pf.materials || []).slice(0, 3).map(function (m) { return m.name; }) : [];
    var seeds = [];
    if (kw.length) seeds.push(kw.join(' '));
    if (mats.length) seeds.push(mats.join(' '));
    if (domain) seeds.push(domain);
    if (!seeds.length) seeds.push('materials science');
    var queries = [];
    queries.push(seeds[0]);
    if (seeds.length > 1) queries.push(seeds.slice(0, 2).join(' '));
    if (domain) queries.push(domain + ' recent advances 2024');
    var html = '我帮你准备了几个检索方向（点击直接打开搜索）：<br>';
    queries.forEach(function (q) {
      var gs = 'https://scholar.google.com/scholar?q=' + encodeURIComponent(q);
      var bx = 'https://xueshu.baidu.com/s?wd=' + encodeURIComponent(q);
      html += '<div style="margin:5px 0">· ' + esc(q) +
        ' <a href="' + gs + '" target="_blank" rel="noopener" style="color:var(--acc)">Google 学术</a>' +
        ' / <a href="' + bx + '" target="_blank" rel="noopener" style="color:var(--acc)">百度学术</a></div>';
    });
    html += '<span style="opacity:.8">（检索词来自本篇的标题/关键词/材料，是"接地"的，不是我编的。）</span>';
    return html;
  }

  /* 兜底：在已抽取文本里找关键词命中 */
  function fallback(q, pf, an) {
    var hit = [];
    var lower = q.toLowerCase();
    (pf.materials || []).forEach(function (m) { if (m.name && lower.indexOf(m.name.toLowerCase()) >= 0) hit.push('材料「' + m.name + '」在清单中：' + (m.kind || '') + (m.supplier ? '，来源 ' + m.supplier : '')); });
    (pf.variables || []).forEach(function (v) { if (lower.indexOf(v.key.toLowerCase()) >= 0) hit.push('变量「' + v.key + '」的水平为 ' + v.levels.join(' / ')); });
    (pf.perf || []).forEach(function (i) { if (lower.indexOf(i.name.toLowerCase()) >= 0) hit.push('指标「' + i.name + '」' + (i.unit ? '（单位 ' + i.unit + '）' : '')); });
    if (hit.length) return '在我读到的数据里：<br>' + hit.slice(0, 6).join('<br>');
    return '这个问题我只能基于**本篇已抽取的数据**判断，没有在它的原料/变量/指标/步骤里找到对应内容。你可以试试点上面的快捷按钮，或换个角度问（比如"这篇讲什么""核心变量""检索方向"）。想要更泛的文献，就点"检索方向"。';
  }

  /* ---------- 刷新（被 MR.rebuild 调用） ---------- */
  function refresh() {
    var pf = MR.state && MR.state.profile, an = MR.state && MR.state.analysis;
    if (!pf) { ctx = { title: '', abstract: '', domain: '', paperType: '', materials: [], keywords: [], hots: [] }; return; }
    ctx.title = pf.title || (an && an.title) || '未命名文献';
    ctx.abstract = (pf.abstract || (an && an.abstract) || '').slice(0, 160);
    ctx.domain = pf.domain || '';
    ctx.paperType = (an && an.typeLabel) || '';
    ctx.materials = pf.materials || [];
    ctx.keywords = pf.keywords || [];
    ctx.hots = (TRENDS[pf.domain] || TRENDS['材料科学'] || []).slice();
    /* 已开对话时刷新快捷按钮与副标题 */
    if (els.sub) els.sub.textContent = ctx.title ? ('已读《' + (ctx.title.length > 14 ? ctx.title.slice(0, 14) + '…' : ctx.title) + '》') : '基于本篇已抽取数据答疑';
    if (chat.classList && chat.classList.contains('show')) { renderQuick(); refreshBubble(); }
  }

  /* ---------- 启动 ---------- */
  function init() {
    if (inited) return;
    if (typeof document === 'undefined' || !document.body) return;
    build();
    inited = true;
    refresh();
    /* 挂钩：任何重新分析（导入 / 粘贴 / 切换示例）后刷新小晶的数据 */
    var _rebuild = MR.rebuild;
    if (typeof _rebuild === 'function') {
      MR.rebuild = function () { _rebuild.apply(MR, arguments); try { refresh(); } catch (e) {} };
    }
    var _load = MR.loadPaper;
    if (typeof _load === 'function') {
      MR.loadPaper = function (id) { _load.apply(MR, arguments); try { refresh(); } catch (e) {} };
    }
  }

  return { init: init, refresh: refresh };
})();

/* 在 body 末尾执行（脚本挂在 boot.js 之前，此时 MR.state 已存在） */
(function () { try { MR.mascot.init(); } catch (e) { if (window.console) console.error('mascot init', e); } })();
