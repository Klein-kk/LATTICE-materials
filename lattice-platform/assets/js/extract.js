/* ============================================================
   LATTICE · 文献抽取引擎
   输入：论文正文（DOCX / PDF / TXT / 粘贴文本）+ 元信息
   输出：该文献中"实际写了什么"的结构化结果 —— 原料、试剂、仪器、
        标准、工艺步骤、变量与水平、可测指标、配比、数据、参考文献。
   原则：只抽取原文出现过的内容；找不到的字段一律标为"未报告"，
        绝不补全、绝不臆造。每一项都带 evidence（原文依据）。
   ============================================================ */
window.MR = window.MR || {};

MR.extract = (function () {

  /* ---------------- 词典 ---------------- */
  var REAGENT_TAIL = ['氧化镁', '氯化镁', '氢氧化钠', '氢氧化钾', '硫酸', '盐酸', '硝酸', '磷酸', '乙酸', '乙醇', '甲醇', '丙酮', '氨水',
    '碳酸钠', '碳酸钙', '硅酸钠', '硫酸钠', '氯化钠', '柠檬酸', '硬脂酸', '钛酸酯', '硅烷', '偶联剂', '树脂', '乳液', '胶黏剂', '发泡剂',
    '水泥', '石膏', '粉煤灰', '矿渣', '竹粉', '木粉', '秸秆', '纤维素', '木质素', '半纤维素', '果胶', '淀粉', '蛋白质', '壳聚糖',
    '碳纤维', '玻璃纤维', '玄武岩纤维', '聚丙烯', '聚乙烯', '环氧树脂', '酚醛', '聚氨酯', '银', '氧化锌', '二氧化钛', '纳米'];
  var CHEM_RE = /(MgO|MgCl2|MgCl₂|MgSO4|Mg\(OH\)2|CaO|Ca\(OH\)2|NaCl|NaOH|KOH|H2SO4|HCl|HNO3|H3PO4|H2O2|Na2CO3|NaHCO3|SiO2|TiO2|ZnO|AgNO3|KH-?550|KH-?570|KH-?560|A-?151|Si\(OC2H5\)4|TEOS|C\d+H\d+(O\d+)?)/g;

  var INSTR_TAIL = ['显微镜', '电子显微镜', '扫描电镜', '光谱仪', '光谱测定仪', '红外光谱', '衍射仪', '试验机', '试验仪', '天平', '水浴锅',
    '热压机', '冷压机', '压力机', '搅拌机', '搅拌器', '烘箱', '干燥箱', '马弗炉', '电阻炉', '烧结炉', '恒温槽', '振荡器', '离心机', '粘度计',
    '卡尺', '测厚仪', '千分尺', '万用表', '色谱', '热重', '差示扫描', '粒度仪', '比表面', '接触角', '白度仪', '色差仪', '拉力机', '万能试验机',
    '力学性能试验机', '真密度仪', '压汞仪', '孔隙率'];

  /* 指标词表：优先取材料学科通用词表（覆盖力学/热学/电学/光学/磁学/化学/加工/结构/生物/吸附…） */
  function indLexicon() {
    var base = (MR.domain && MR.domain.ALL_IND) ? MR.domain.ALL_IND.slice() : [];
    var baseEn = (MR.domain && MR.domain.ALL_IND_EN) ? MR.domain.ALL_IND_EN.slice() : [];
    /* 注意：曾把 domain.hintWords() 并入指标词表，但那些是**方向提示词**
       （如金属方向的「合金」「钢」「铝」），不是可测指标 —— 会把材料名当成"指标"。
       这里不再并入。 */
    var fb = ['含水率', '含量', '产率', '转化率', '收率', '纯度', '白度', '色差', '光泽度', '密度', '孔隙率', '粒径', '比表面积'];
    var all = base.concat(baseEn, fb);
    return all.filter(function (w, i) { return w && all.indexOf(w) === i; }).sort(function (a, b) { return b.length - a.length; });
  }
  /* 表征手段。
     注意：拉丁字母缩写必须整词匹配 —— 旧版用 /i 裸匹配，导致 assembly→SEM、
     system→TEM、between→BET 这类"字母串巧合"被当成表征手段塞进指标里（凭空生成内容）。
     中文词不受影响；缩写去掉 i 标志并要求 \b 边界。 */
  var CHAR_METHOD = [
    { k: 'SEM', t: '扫描电子显微镜', unit: '—', kind: '形貌表征', re: /(扫描电子显微镜|扫描电镜|场发射扫描|\bSEM\b|S-?4800|SU\d{4})/ },
    { k: 'FTIR', t: '傅里叶变换红外光谱', unit: 'cm⁻¹', kind: '化学表征', re: /(傅里叶|红外光谱|\bFT-?IR\b|Spectrum\s?\d)/ },
    { k: 'XRD', t: 'X 射线衍射', unit: '°', kind: '物相表征', re: /(X射线衍射|\bXRD\b|衍射图谱|SmartLab|Rigaku)/ },
    { k: 'TG', t: '热重分析', unit: '°C', kind: '热性能', re: /(热重|\bTGA\b|\bTG-?DSC\b|差示扫描)/ },
    { k: 'XPS', t: 'X 射线光电子能谱', unit: 'eV', kind: '表面化学', re: /(\bXPS\b|光电子能谱)/ },
    { k: 'TEM', t: '透射电子显微镜', unit: '—', kind: '形貌表征', re: /(透射电子显微镜|\bTEM\b)/ },
    { k: 'BET', t: '比表面积与孔径分析', unit: 'm²/g', kind: '孔结构', re: /(比表面积|\bBET\b|孔径分布)/ },
    { k: 'CLSM', t: '激光共聚焦显微镜', unit: '—', kind: '形貌表征', re: /(共聚焦|\bCLSM\b|激光共聚焦)/ },
    { k: 'EIS', t: '电化学阻抗谱', unit: 'Ω', kind: '电化学', re: /(电化学阻抗|\bEIS\b|\bNyquist\b)/ },
    { k: '紫外可见', t: '紫外-可见分光光度', unit: 'nm', kind: '光学表征', re: /(紫外|\bUV-?Vis\b|分光光度)/ }
  ];
  var DIR_PATTERNS = [
    { d: 'rise-fall', re: /先(上升|增加|增大|提高|升高)[^。；]{0,12}后(下降|降低|减小|回落)/ },
    { d: 'fall-rise', re: /先(下降|降低|减小)[^。；]{0,12}后(上升|增加|增大|提高)/ },
    { d: 'mono-up', re: /(随着|随)[^。；]{0,30}(提高|增加|增大|升高|提升)[^。；]{0,30}(上升|增加|增大|提高|增强|升高)/ },
    { d: 'mono-down', re: /(随着|随)[^。；]{0,30}(提高|增加|增大|升高)[^。；]{0,30}(下降|降低|减小|减弱)/ }
  ];
  var LINK_WORDS = ['且', '并', '同时', '使', '从而', '进而', '导致', '因为', '由于', '说明', '表明', '因为'];

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }

  /* ---------- 上标引用清理 ----------
     Nature 系期刊把引用编号排成上标，PDF 抽文字时会内联成 "breath68" "nanoparticles80"。
     规则：字母/右括号后紧跟 1–3 位数字，且其后是空格/标点/行尾 → 判为上标引用并去掉。
     不会误伤 "g/m2"、"0.5"、"pH 7.4"、"Ta2O5"（后者数字后紧跟字母，不满足条件）。 */
  function stripRefMarks(t) {
    return t.replace(/([A-Za-z\)\]])(\d{1,3})(?=[\s.,;:)—\]\-]|$)/g, function (m, a, b) {
      var v = parseInt(b, 10);
      return (v >= 1 && v <= 400) ? a : m;
    });
  }

  /* ---------- PDF 断行黏连修复 ----------
     期刊 PDF 抽文字时会把段内换行黏成一个词：animalswith / thatthe / reviewreview / TRENDSin。
     这类黏连词会污染摘要、关键词与指标匹配，因此在任何分词之前先修复。
     三条规则都很保守（只处理"几乎不可能是真词"的形态），不会把正常单词切开。 */
  /* 只保留"在高频实词里几乎不作为词尾"的功能词。
     明确排除：and（understand）、then（strengthen）、one（microphone）、are（nightmare）、
     our（behaviour）、can（hurricane）。 */
  var GLUE_FUNC = /(with|that|this|from|which|their|these|those|where|when|also|such|been|have|was|were|has|the|for)$/;
  /* 最常见的两词黏连（PDF 断行产物），单独用白名单精确处理，避免误伤 breathe 这类真实单词 */
  var GLUE_PAIR = /\b(ofthe|inthe|forthe|andthe|tothe|atthe|onthe|fromthe|withthe|bythe|asthe|isthe|arethe|wasthe|werethe|itis|itwas|itwas|thatthe|thisis|suchas|aswell|ofthis|inthis|forthis|andthis|ofthat|inthat|andthat|aswellas)\b/g;
  function ungluePair(w) {
    var m = w.match(/^(of|in|for|and|to|at|on|from|with|by|as|is|are|was|were|it|that|this|such)(the|that|this|as|was|is|well)$/);
    return m ? m[1] + ' ' + m[2] : w;
  }
  function deGlue(t) {
    if (!t || t.length < 5) return t;
    /* 1) 小写词后直接跟"大写开头的小写词"：MacmillanMagazines → Macmillan Magazines */
    t = t.replace(/([a-z]{2,})([A-Z][a-z]{2,})/g, '$1 $2');
    /* 2) 全大写缩写后直接跟小写词：TRENDSin → TRENDS in */
    t = t.replace(/([A-Z]{2,})([a-z]{4,})/g, '$1 $2');
    /* 2b) 数字后直接跟"大写开头的小写词"：页眉 "...nature.com239Nearly a century" → 切开 */
    t = t.replace(/(\d)([A-Z][a-z]{3,})/g, '$1 $2');
    /* 2c) 高频两词黏连白名单 */
    t = t.replace(GLUE_PAIR, ungluePair);
    /* 2d) 句末标点后紧跟大写字母：PDF 断行导致 "compounds.A difference" → 补空格。
       用 (?=[a-z]|\s[a-z]) 排除 "U.S.A." 这类缩写被拆成 "U. S. A."。 */
    t = t.replace(/([.!?])([A-Z](?=[a-z]|\s[a-z]))/g, '$1 $2');
    /* 3) 词级：整词重复（reviewreview）或"前缀+功能词"（animalswith / thatthe） */
    t = t.replace(/[A-Za-z]{8,}/g, function (w) {
      var half = w.length / 2;
      if (w.length % 2 === 0 && w.slice(0, half).toLowerCase() === w.slice(half).toLowerCase()) {
        return w.slice(0, half) + ' ' + w.slice(half);
      }
      if (w.length >= 8 && /^[a-z]+$/.test(w)) {
        var m = w.match(GLUE_FUNC);
        if (m && w.length - m[1].length >= 3) return w.slice(0, w.length - m[1].length) + ' ' + m[1];
      }
      return w;
    });
    return t;
  }

  /* 期刊页眉常被黏进正文首段："insightreview articles NATURE|VOL 408|9 NOVEMBER 2000|www.nature.com239 Nearly a century ago…"
     做法：只在片段里确实出现页眉特征（| / www. / http）时才处理，并切到最后一段页眉之后。
     这样既不会误伤"ROS production is…"这类正常开头，也不会误伤含长数字的正常句子。 */
  function stripHeader(p) {
    var s = String(p || '');
    var head = s.slice(0, 300);
    if (!/\||https?:|www\./.test(head)) return s;
    var re = /\S*(?:\||https?:|www\.)\S*/g, m, end = -1;
    while ((m = re.exec(head))) end = m.index + m[0].length;
    if (end < 0) return s;
    var rest = s.slice(end).replace(/^[\s|]+/, '');
    rest = rest.replace(/^(?:[A-Z0-9&.\u2013\u2014-]{2,}\s+)+/, '');
    return rest;
  }

  /* 两栏期刊 PDF 抽出的正文行往往只有 ~50 字符，"行"不能当"段落"用。
     这里把连续行合回段落，供需要段级语义的地方（摘要推断）使用。
     注意：逐行检测器（原料/仪器）仍用原始行，避免超过长度上限。 */
  function mergeParagraphs(lines) {
    var out = [], buf = '';
    function flush() { var s = buf.trim(); if (s) out.push(s); buf = ''; }
    lines.forEach(function (l) {
      var t = String(l || '').trim();
      if (!t) { flush(); return; }
      if (!buf) { buf = t; return; }
      var prevEnd = /[.。!?！？]$/.test(buf);
      var startsUpper = /^[A-Z\u4e00-\u9fa5"“（(]/.test(t);
      if (prevEnd && startsUpper && buf.length > 120) { flush(); buf = t; return; }
      buf += ' ' + t;
    });
    flush();
    return out;
  }
  /* 按句子边界截断到接近 maxLen，避免把句子切一半 */
  function firstSentences(s, maxLen) {
    if (!s || s.length <= maxLen) return s || '';
    var cut = s.slice(0, maxLen);
    var i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    return i > 200 ? cut.slice(0, i + 1) : cut;
  }

  /* ---------- 分节 ---------- */
  function splitSections(lines) {
    var secs = [], cur = { no: '0', k: '正文', text: [] };
    var HEAD = /^\s*((\d+(\.\d+)*)\s*[、. ]?\s*)?(摘\s*要|Abstract|Summary|关键词|Key\s*words|引\s*言|绪\s*论|材料与方法|试验原料|试验方法|实验方法|结果与分析|试验结果分析|结果与讨论|讨论|结\s*论|参考文献|致\s*谢|References|Acknowledg|Introduction|Background|Materials?\s+and\s+Methods|Methods?|Experimental(?:\s+Section)?|Results?|Results?\s+and\s+Discussion|Discussion|Conclusions?|Perspectives?|Future\s+(?:directions|perspectives)|Box\s+\d+|Supplementary)\s*[.:]?\s*$/i;
    var NUMHEAD = /^\s*(\d+(\.\d+){0,3})\s+([\u4e00-\u9fa5A-Za-z][^\n]{1,40})$/;
    lines.forEach(function (l) {
      var m = l.match(NUMHEAD);
      if (m) {
        if (cur.text.length) secs.push(cur);
        cur = { no: m[1], k: clean(m[3]), text: [] };
        return;
      }
      if (HEAD.test(l) && l.length < 20) {
        if (cur.text.length) secs.push(cur);
        cur = { no: '', k: clean(l), text: [] };
        return;
      }
      cur.text.push(l);
    });
    if (cur.text.length) secs.push(cur);
    return secs;
  }

  /* ---------------- 原料 / 试剂 ---------------- */
  function extractMaterials(lines) {
    var out = [];
    lines.forEach(function (l) {
      if (l.length > 160) return;
      /* 品牌名必须整词匹配：旧版 Acros（试剂商）会命中英文单词 "across"，
         导致正文句子被当成试剂清单（"…vancomycin across the membrane…"）。 */
      var isBuy = /(购自|采购|来源于|有限公司|公司|集团|试剂|分析纯|\bAR\b|纯度|含量\s*[≥>≧])/.test(l) ||
        /(purchased from|obtained from|supplied by|\bSigma-?Aldrich\b|\bMerck\b|\bThermo\s?Fisher\b|\bAladdin\b|\bMacklin\b|\bTCI\b|\bAcros\b|\bAlfa\s?Aesar\b|Fisher Scientific|\bMillipore\b|\bInvitrogen\b|\bBecton\b|\bCorning\b|analytical grade|reagent grade|\b99(?:\.\d+)?%|\b98(?:\.\d+)?%)/i.test(l);
      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : [],
        (MR.domain && MR.domain.MATERIAL_NOUN) ? MR.domain.MATERIAL_NOUN : [],
        (MR.domain && MR.domain.REAGENT_LEX_EN) ? MR.domain.REAGENT_LEX_EN : [],
        (MR.domain && MR.domain.MATERIAL_NOUN_EN) ? MR.domain.MATERIAL_NOUN_EN : []);
      var low1 = l.toLowerCase();
      var hitTail = LEXR.some(function (t) { return t.length > 3 ? low1.indexOf(t.toLowerCase()) >= 0 : l.indexOf(t) >= 0; });
      var hitChem = CHEM_RE.test(l); CHEM_RE.lastIndex = 0;
      /* 通用启发式：材料类论文的标准写法「名称（规格），购自/采购于厂家」 */
      var canonical = /^[\u4e00-\u9fa5A-Za-z0-9\s\-·\.]{2,40}[（(][^）)]{1,40}[）)][\s]*[，,；;][\s]*(?:购自|采购于|来源于|由.*?提供)/.test(l);
      /* 英文正文句子的误判护栏：一句正常英文叙述里会出现多个功能词，
         而"试剂清单行"不会。没有采购/厂家线索时直接否决，避免把论文句子当试剂。 */
      var enProcure = /(purchased|obtained|supplied|bought|\bSigma-?Aldrich\b|\bMerck\b|\bThermo\s?Fisher\b|\bAladdin\b|\bMacklin\b|\bTCI\b|\bAcros\b|\bAlfa\s?Aesar\b|Fisher Scientific|\bMillipore\b|\bInvitrogen\b|analytical grade|reagent grade)/i.test(l);
      var isProse = (l.match(/\s(?:the|of|and|to|in|that|is|are|was|were|been|have|has|with|from|for|by|as|at|on|this|these|its|it)\s/gi) || []).length >= 3;
      if (isProse && !enProcure && !canonical) return;
      if (!(hitTail || hitChem || canonical) || !isBuy) return;
      /* 名称：取到括号/逗号前 */
      var nameM = l.match(/^([\u4e00-\u9fa5A-Za-z0-9\-（）()·]{2,28})(?:（|\()/);
      var name = nameM ? nameM[1] : l.split(/[，,；;]/)[0].slice(0, 24);
      var spec = (l.match(/[（(]([^）)]{2,40})[）)]/) || [])[1] || '';
      var sup = (l.match(/(?:购自|采购于|来源于)([^，,；;。]{2,30})/) || [])[1] || '';
      var pure = (l.match(/([≥>≧]\s*[\d.]+\s*%|分析纯|化学纯|AR|CP|GR)/) || [])[1] || '';
      out.push({
        name: clean(name), spec: clean(spec), purity: clean(pure), supplier: clean(sup),
        kind: /偶联剂|硅烷|树脂|乳液/.test(l) ? '改性剂' : (/竹粉|木粉|秸秆|纤维|水泥|粉煤灰|矿渣/.test(name) ? '基体/增强体' : '化学试剂'),
        evidence: clean(l)
      });
    });
    return out.filter(function (o, i, a) { return a.findIndex(function (x) { return x.name === o.name; }) === i; });
  }

  /* ---------------- 仪器 ---------------- */
  function extractInstruments(lines, tables) {
    var out = [];
    lines.forEach(function (l, i) {
      var LEXI = ((MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL)
        .concat((MR.domain && MR.domain.INSTRUMENT_LEX_EN) ? MR.domain.INSTRUMENT_LEX_EN : []);
      var low0 = l.toLowerCase();
      var hitLex = LEXI.some(function (t) {
        if (t.length > 3) return low0.indexOf(t.toLowerCase()) >= 0;
        return new RegExp('(^|[^A-Za-z])' + t + '([^A-Za-z]|$)').test(l);   /* 短缩写必须整词命中 */
      });
      /* 通用启发式：以仪器类后缀收尾 + 行内出现明显型号 */
      var SUF = /(?:机|仪|仪|器|镜|锅|炉|箱|台|设备|系统|装置|分析仪|测试仪|试验机|工作站|反应釜|槽|缸|泵)$/;
      var modelLike = /[A-Z]{1,8}[-–]?[A-Z0-9]{0,8}\d{2,}[A-Z0-9\-]*/;
      var nameOnly = l.split(/[\t,，;；（(]/)[0].trim();
      var hitHeur = SUF.test(nameOnly) && nameOnly.length >= 3 && nameOnly.length <= 26;
      /* 英文行：必须含"设备/公司/型号"线索。
         旧版把 system / setup / kit 也算线索，结果 "Hirsch, Ajjan and Wang … system"
         这类句子会把作者姓氏当成仪器（凭空生成内容）。现在收紧，并加姓氏护栏。 */
      var DEVICE_NOUN = /(microscope|spectrom|spectrophot|diffractometer|analyser|analyzer|calorimeter|viscometer|rheometer|chromatograph|potentiostat|electrode|centrifuge|balance|incubator|autoclave|extruder|furnace|oven|reactor|coater|spinner|tester|testing machine|apparatus|instrument|workstation|pump|probe|sensor|machine|device|meter)/i;
      var PERSON = /^[A-Z][a-z]{1,14}$/;
      if (PERSON.test(nameOnly) && !DEVICE_NOUN.test(l) && !modelLike.test(l) && !/公司|Inc|Ltd|Corp|GmbH/.test(l)) return;
      var isInst = hitLex || hitHeur;
      if (!isInst || l.length > 100) return;
      if (!hitLex && !modelLike.test(l) && !/公司|大学|研究所|厂/.test(l)) return;
      /* 型号：含字母且含数字的短 token，或明显的设备型号 */
      var modelM = l.match(/\b([A-Z]{1,6}[-–]?[A-Z0-9]{0,6}\d{2,}[A-Z0-9\-]*)\b/) || l.match(/(SU\d{4}|Spectrum\s?\d|KSH-\d+|BHS-\d+|DLX-?[A-Z]*\s?\d+|CWT\d+|HZ-\w+)/i);
      var name = '';
      for (var q = 0; q < INSTR_TAIL.length; q++) { if (l.indexOf(INSTR_TAIL[q]) >= 0) { name = INSTR_TAIL[q]; break; } }
      /* 更完整的名称：向前扩到行首或分隔符 */
      var full = (l.split(/[\t,，;；（(]/)[0] || '').trim();
      if (full.length >= 3 && full.length <= 26) name = full;
      /* 去掉可能混入的序号/单位前缀 */
      name = name.replace(/^[（(\d）+\s]+/, '').replace(/^(?:表|图)\s*\d+/, '').trim();
      var next = lines[i + 1] || '', next2 = lines[i + 2] || '';
      var vendor = '';
      if (/公司|大学|研究所|厂|Inc|Ltd|Corp/.test(next)) vendor = clean(next);
      else if (/公司|大学|研究所|厂|Inc|Ltd|Corp/.test(next2)) vendor = clean(next2);
      var model = modelM ? clean(modelM[1]) : (next.length <= 24 ? clean(next) : '');
      out.push({ name: clean(name), model: model, vendor: vendor, evidence: clean(l + (model ? ' / ' + model : '')) });
    });
    void tables;
    return out.filter(function (o, i, a) { return o.name && a.findIndex(function (x) { return x.name === o.name; }) === i; });
  }

  /* ---------------- 标准 ---------------- */
  function extractStandards(text) {
    var pre = ((MR.domain && MR.domain.STANDARD_LEX) ? MR.domain.STANDARD_LEX : ['GB/T', 'ISO', 'ASTM'])
      .concat((MR.domain && MR.domain.STANDARD_LEX_EN) ? MR.domain.STANDARD_LEX_EN : [])
      .map(function (x) { return x.replace(/[\/]/g, '\\/'); });
    pre = pre.filter(function (x) { return !/\s/.test(x); });
    var re = new RegExp('\\b(' + pre.join('|') + ')\\s?[\\d]+(?:[.\\-–]\\d+)*(?:\\s?[-–]\\s?\\d{4})?', 'g');
    var m, out = [];
    while ((m = re.exec(text))) out.push(clean(m[0]));
    return uniq(out);
  }

  /* ---------------- 变量与水平 ---------------- */
  var UNIT_MAP = { '%': '%', '％': '%', '℃': '°C', '°C': '°C', '摄氏度': '°C', 'MPa': 'MPa', 'kPa': 'kPa', 'h': 'h', 'min': 'min', 's': 's', 'g/cm3': 'g/cm³', 'g/cm³': 'g/cm³', 'mm': 'mm', '目': '目', 'r/min': 'r/min', 'rpm': 'rpm', 'mol/L': 'mol/L', 'mL': 'mL', 'g': 'g', 'kg': 'kg', 'pH': '' };
  var VAR_NOUN = ['掺量', '添加量', '浓度', '含量', '温度', '时间', '压力', '比例', '密度', '厚度', '目数', '固液比', '质量比', '摩尔比', '用量', '速度', '转速', '湿度', 'pH', 'pH值', '水灰比', '取代度', '接枝率', '负载量'];

  /* 变量抽取：只接受"名词 + 带单位数值列表"，且必须出现在同一句内。
     这样能天然排除页码、目录、化学计量比等非变量数字。 */
  function extractVariables(secs, fullText) {
    var UNIT_RE = '(?:%|％|℃|°C|MPa|kPa|GPa|h|min|s|ms|µs|us|Hz|kHz|nM|µM|uM|mM|M|mg\\/mL|mg\\/dL|mmol\\/L|mol\\/L|mol·L-1|nA|µA|uA|mA|mV|V|Ω|kΩ|nm|µm|um|μm|mm|cm|mL|µL|uL|L|g\\/cm3|g\\/cm³|mg|µg|ug|ng|pg|wt%|vol%|ppm|ppb|目|r\\/min|rpm|ph|pH)';
    var SUFFIX = '(?:添加质量|质量比|固液比|掺量|添加量|加入量|用量|浓度|含量|比例|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率|包覆量|质量|量|concentration|concentrations|content|ratio|temperature|time|pressure|speed|density|loading|amount|level|levels|mol%)';
    /* 注意：\b 对中文无效 —— 汉字在 JS 正则里是非单词字符，后缀后加 \b 会让
       所有中文变量都匹配不上（曾导致四个中文示例变量全部为 0）。这里不加 \b，
       改为用 NOUN_TAIL 校验词尾。 */
    var NOUN_RE = new RegExp('([\\u4e00-\\u9fa5A-Za-z0-9\\-\\s]{0,22}?' + SUFFIX + ')', 'gi');
    var NOUN_TAIL = new RegExp(SUFFIX + '$');
    function tidyNoun(n) {
      var t = n.replace(/^(其中|随着|按|称|当|在|由|将|对|与|和|及|把|以|用|加|加入|称量|测试|试件|设计|分别|再|先|后|均|各|的|中|at|of|the|a|an|with|for)+/i, '').trim();
      var m2 = t.match(new RegExp('((?:[\\u4e00-\\u9fa5]{2,6}|[A-Za-z][A-Za-z\\- ]{1,18}?)' + SUFFIX + ')$', 'i'));
      t = m2 ? m2[1] : t;
      /* 工序动词短语常以「量」收尾（按配合比称量 / 按化学计量），它们不是变量 */
      if (/称量|称取|量取|计量|搅拌|球磨|干燥|浸渍|洗涤|制备/.test(t)) return '';
      return t;
    }
    /* 是否为"提升幅度"式数字（应排除，它不是变量水平） */
    function isDelta(win, at, len) {
      var before = win.slice(Math.max(0, at - 12), at);
      var after = win.slice(at + len, at + len + 8);
      /* 只把"提升/降低"类动词视为幅度描述；「分别为」是正常的水平枚举，不能当幅度 */
      if (/提高|提升|增加|增大|降低|减少|上升|下降|高约|低了|高了/.test(before)) return true;
      if (/^\s*(?:左右|以上|以下)\s*[)）]?/.test(after) && /提高|提升|降低/.test(before)) return true;
      return false;
    }
    function isTolerance(win, at) {
      return /±/.test(win.slice(Math.max(0, at - 4), at + 4));
    }
    var out = [];
    var sentences = fullText.replace(/\n/g, '。').split(/[。；;\n]/).map(clean).filter(function (x) { return x.length > 6; });
    sentences.forEach(function (sent) {
      var m;
      NOUN_RE.lastIndex = 0;
      var marks = [];
      while ((m = NOUN_RE.exec(sent))) marks.push({ noun: m[1], at: m.index + m[1].length });
      marks.forEach(function (mk) {
        mk.noun = tidyNoun(mk.noun);
        if (!NOUN_TAIL.test(mk.noun)) return;
        if (!mk.noun) return;
        /* 只在小句内收集数字：跨小句会把无关数值（如水淬水温 20 ℃）混进变量水平，
           既造成水平错误，又可能触发"量级跨度"过滤而丢掉整个变量。 */
        var winRaw = sent.slice(mk.at, mk.at + 140);
        var cut = winRaw.search(/[，,][^\s\d]/);
        var win = cut > 0 ? winRaw.slice(0, cut) : winRaw.slice(0, 90);
        var re = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + UNIT_RE + ')', 'gi');
        var nums = [], unit = '', mm;
        while ((mm = re.exec(win))) {
          if (isDelta(win, mm.index, mm[0].length)) continue;
          if (isTolerance(win, mm.index)) continue;
          var u = UNIT_MAP[mm[2]] !== undefined ? UNIT_MAP[mm[2]] : mm[2];
          if (nums.length === 0) unit = u;
          else if (u !== unit) continue;
          var v = parseFloat(mm[1]);
          if (isFinite(v) && nums.indexOf(v) < 0) nums.push(v);
        }
        if (nums.length >= 2 && nums.length <= 8) {
          var key = clean(mk.noun + (unit ? ' / ' + unit : ''));
          var hit = out.filter(function (o) { return o.key === key; })[0];
          if (hit) { if (nums.length > hit.levels.length) { hit.levels = nums; hit.evidence = clean(sent).slice(0, 220); } return; }
          out.push({ key: key, noun: mk.noun, unit: unit, levels: nums, evidence: clean(sent).slice(0, 220), sec: '正文',
            suffix: (mk.noun.match(NOUN_TAIL) || [''])[0] });
        }
      });
    });
    /* 区间与上限补充：如"掺量在35%~45%时…超过50%后" → 35/45/50 */
    sentences.forEach(function (sent) {
      NOUN_RE.lastIndex = 0;
      var m;
      while ((m = NOUN_RE.exec(sent))) {
        var noun = tidyNoun(m[1]), tail = sent.slice(m.index + m[1].length);
        if (!NOUN_TAIL.test(noun)) return;
        var more = [];
        var rm = tail.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*[~～\\-–—]\\s*(\\d+(?:\\.\\d+)?)\\s*(' + UNIT_RE + ')'));
        if (rm) { more.push(parseFloat(rm[1]), parseFloat(rm[2])); }
        var om = tail.match(new RegExp('(?:超过|大于|高于)\\s*(\\d+(?:\\.\\d+)?)\\s*(' + UNIT_RE + ')'));
        if (om) more.push(parseFloat(om[1]));
        if (!more.length) continue;
        var unit2 = (rm ? rm[3] : (om ? om[2] : ''));
        unit2 = UNIT_MAP[unit2] !== undefined ? UNIT_MAP[unit2] : unit2;
        var key2 = clean(noun + (unit2 ? ' / ' + unit2 : ''));
        var hit2 = out.filter(function (o) { return o.key === key2; })[0];
        if (hit2) { more.forEach(function (v) { if (hit2.levels.indexOf(v) < 0) hit2.levels.push(v); }); hit2.levels.sort(function (a, b) { return a - b; }); }
      }
    });
    /* 过滤：明显无关 */
    var cand = out.filter(function (o) {
      /* 只过滤明显不合理的量级（固溶/烧结温度可达 1200 ℃ 以上，不能按低温阈值卡） */
      if (/温度/.test(o.noun) && o.levels.some(function (v) { return v > 2200; })) return false;
      if (/时间/.test(o.noun) && o.levels.some(function (v) { return v > 2000; })) return false;
      if (o.levels.length < 2) return false;
      if (o.levels.length > 5) return false;
      var mx = Math.max.apply(null, o.levels), mn = Math.min.apply(null, o.levels);
      if (mn > 0 && mx / mn > 12) return false;
      return true;
    });
    /* 按"后缀 + 单位"分组：子集丢弃；互不包含的保留为不同变量 */
    var groups = {};
    cand.forEach(function (o) { var g = (o.suffix || o.noun) + '|' + o.unit; (groups[g] = groups[g] || []).push(o); });
    var final = [];
    Object.keys(groups).forEach(function (g) {
      var list = groups[g].slice().sort(function (a, b) { return b.levels.length - a.levels.length; });
      var keptLocal = [];
      list.forEach(function (o) {
        var isSubset = keptLocal.some(function (k) { return o.levels.every(function (v) { return k.levels.indexOf(v) >= 0; }); });
        if (!isSubset) keptLocal.push(o);
      });
      /* 只保留水平最多的那一个；若确实互不包含且水平数相当，才保留多个 */
      var top = keptLocal[0];
      var others = keptLocal.slice(1).filter(function (o) {
        return o.levels.length >= 2 && o.levels.some(function (v) { return top.levels.indexOf(v) < 0; }) && o.levels.length >= top.levels.length - 1 && countDiff(o, top) >= 2;
      });
      final = final.concat([top].concat(others));
    });
    function countDiff(a, b) {
      return a.levels.filter(function (v) { return b.levels.indexOf(v) < 0; }).length;
    }
    /* 去掉"质量比/固液比"这类由配比来的同名条目（它们更可能出现在配方栏） */
    return final.slice(0, 8);
  }

  /* ---------------- 指标 ---------------- */
  function extractIndicators(secs, fullText) {
    var LEX = indLexicon();
    var out = [];
    var lines = fullText.split('\n');
    /* 1) 章节标题命中（最可靠） */
    secs.forEach(function (sec) {
      if (!/方法|测定|测试|表征|分析|结果|讨论|性能|评价/.test(sec.k)) return;
      LEX.forEach(function (ind) {
        if (sec.k.indexOf(ind) < 0) return;
        if (out.some(function (o) { return o.name === ind; })) return;
        out.push({ name: ind, kind: '性能指标', unit: '', direction: '', optimum: null, improvement: null,
          evidence: sec.no + ' ' + sec.k, source: '章节标题', hits: 1 });
      });
    });
    /* 2) 正文命中：统计出现次数，并要求"在测量语境中出现"或"出现 ≥3 次" */
    var counts = {};
    LEX.forEach(function (ind) {
      var re = new RegExp(ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      var n = (fullText.match(re) || []).length;
      if (n) counts[ind] = n;
    });
    LEX.forEach(function (ind) {
      if (!counts[ind]) return;
      if (out.some(function (o) { return o.name === ind; })) return;
      var ctx = null;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf(ind) < 0) continue;
        if (/(测定|测试|检测|评价|表征|测量|分析|计算|结果|如表|如图)/.test(lines[i]) && lines[i].length < 400) { ctx = lines[i]; break; }
      }
      if (!ctx && counts[ind] < 3) return;
      var unit = '';
      if (ctx) {
        var um = ctx.match(new RegExp(ind + '[^。；]{0,14}?[（(]([^）)]{1,10})[）)]'));
        if (um) unit = um[1];
        else if (/MPa|GPa/.test(ctx) && /强度|模量/.test(ind)) unit = 'MPa';
        else if (/(率|度)$/.test(ind) && /%/.test(ctx)) unit = '%';
        else if (/cm-?1|cm⁻¹/.test(ctx) && /波数|位移/.test(ind)) unit = 'cm⁻¹';
        else if (/℃|°C/.test(ctx) && /温度/.test(ind)) unit = '°C';
        else if (/mAh/.test(ctx) && /容量/.test(ind)) unit = 'mAh/g';
      }
      out.push({ name: ind, kind: '性能指标', unit: unit, direction: '', optimum: null, improvement: null,
        evidence: clean(ctx || ('全文出现 ' + counts[ind] + ' 次')).slice(0, 200), source: '正文', hits: counts[ind] });
    });
    /* 3) 表征手段 */
    CHAR_METHOD.forEach(function (c) {
      var hit = c.re.test(fullText); c.re.lastIndex = 0;
      if (hit) out.push({ name: c.t, kind: c.kind, unit: c.unit, method: c.k, isChar: true,
        direction: '', optimum: null, improvement: null, evidence: '正文中出现 ' + c.k + ' 相关表述', source: '表征手段' });
    });
    /* 4) 方向 / 最优值 / 提升幅度 */
    var sents = fullText.split(/[。；\n]/).map(clean).filter(function (x) { return x.length > 8; });
    out.forEach(function (o) {
      var near = sents.filter(function (x) { return x.indexOf(o.name) >= 0 || (o.isChar && x.indexOf(o.method || '') >= 0); });
      near.forEach(function (x) {
        DIR_PATTERNS.forEach(function (p) { if (!o.direction && p.re.test(x)) o.direction = p.d; });
        var mm = x.match(new RegExp(o.name + '[^。；]{0,40}?(?:为|达|超过|达到)\\s*(?:最大|最高)[^。；]{0,20}?([\\d.]+)\\s*(%|％|℃|°C|MPa|h|min|g\\/cm3|mm)?'));
        if (!mm) mm = x.match(new RegExp('([\\d.]+)\\s*(%|％|℃|°C|MPa|h|min|g\\/cm3|mm)?[^。；]{0,24}?' + o.name + '[^。；]{0,24}?(?:最大|最高)'));
        if (mm && o.optimum == null) { o.optimum = parseFloat(mm[1]); o.optimumFrom = clean(x).slice(0, 180); }
        var im = x.match(new RegExp(o.name + '[^。；]{0,50}?(?:提高|提升|增加|增大|降低|减少)[了]?\\s*([\\d.]+)\\s*%'));
        if (!im) im = x.match(new RegExp('(?:提高|提升|增加|增大|降低|减少)[了]?[^。；]{0,24}?' + o.name + '[^。；]{0,20}?([\\d.]+)\\s*%'));
        if (im && o.improvement == null) { o.improvement = parseFloat(im[1]); o.improvementFrom = clean(x).slice(0, 180); }
      });
    });
    /* 5) 去重：短名被长名包含时丢弃短的（仅在同一大类内） */
    var kept = out.filter(function (o) {
      return !out.some(function (q) { return q !== o && (!!q.isChar === !!o.isChar) && q.name.length > o.name.length && q.name.indexOf(o.name) >= 0; });
    });
    /* 6) 归类到性能族 */
    kept.forEach(function (o) {
      if (o.isChar) return;
      var fam = MR.domain ? MR.domain.classify(o.name) : { k: '其他指标', color: '--c6' };
      o.family = fam.k; o.familyColor = fam.color;
    });
    return kept;
  }

  /* ---------------- 工艺步骤 ---------------- */
  var STEP_VERBS = ['称量', '配制', '搅拌', '混合', '铺装', '热压', '冷压', '养护', '锯切', '齐边', '浸泡', '碱处理', '清洗', '洗涤',
    '烘干', '干燥', '水浴', '加热', '冷却', '成型', '压制', '固化', '喷淋', '涂覆', '接枝', '浸渍', '预压', '脱模', '筛分', '球磨', '陈化'];
  /* 英文工序词必须整词匹配：旧版用 substring，`aged` 会命中 damaged/stages、
     `tested` 命中 untested、`synthesis` 命中 biosynthesis —— 于是在综述里
     凭空生成"工序"，还会连带把综述误判成研究论文。 */
  var VB_RE_CACHE = {};
  function vbHit(line, v) {
    if (/^[\u4e00-\u9fa5]/.test(v)) return line.indexOf(v) >= 0;
    if (!VB_RE_CACHE[v]) VB_RE_CACHE[v] = new RegExp('\\b' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return VB_RE_CACHE[v].test(line);
  }
  function extractSteps(text) {
    /* 优先用"流程箭头行"（如 搅拌 铺装 热压 冷压 养护 齐边） */
    var lines = text.split('\n');
    var best = null;
    lines.forEach(function (l) {
      if (l.length > 60) return;
      var V2 = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : [],
        (MR.domain && MR.domain.PROCESS_VERBS_EN) ? MR.domain.PROCESS_VERBS_EN : []);
      var hits = V2.filter(function (v) { return vbHit(l, v); });
      if (hits.length >= 3 && (!best || hits.length > best.hits.length)) best = { line: l, hits: hits };
    });
    var seq = best ? best.hits : [];
    /* 从"试样制备"段落补充带条件的步骤句 */
    var steps = [];
    var VERBS = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : [],
      (MR.domain && MR.domain.PROCESS_VERBS_EN) ? MR.domain.PROCESS_VERBS_EN : []);
    var para = lines.filter(function (l) { return l.length > 30 && VERBS.some(function (v) { return vbHit(l, v); }); });
    var sentencePool = para.join('。').split(/[。；]/).map(clean).filter(function (s) { return s.length > 12; });
    sentencePool.slice(0, 26).forEach(function (s) {
      /* 取句中"最靠后的动词"作为该步的主操作（更贴近真实工艺顺序） */
      var hits = VERBS.filter(function (x) { return vbHit(s, x); });
      if (!hits.length) return;
      var v = hits.sort(function (a, b) { return s.indexOf(b) - s.indexOf(a); })[0];
      var cond = s.match(/([\d.]+\s*(?:℃|°C|MPa|h|min|s|%|g\/cm3|mm|r\/min))(?:\s*[，,、]?\s*[\d.]+\s*(?:℃|°C|MPa|h|min|s|%|g\/cm3|mm|r\/min))*/g) || [];
      steps.push({ t: v, d: clean(s).slice(0, 200), cond: uniq(cond.map(clean)).join(' / '), from: '试样制备段' });
    });
    if (!steps.length && seq.length) {
      seq.forEach(function (v) { steps.push({ t: v, d: '（来自工艺流程图）', cond: '', from: '流程图' }); });
    }
    /* 去重 + 按真实工艺顺序重排 */
    var seen = {};
    steps = steps.filter(function (s) { if (seen[s.t]) return false; seen[s.t] = 1; return true; });
    var ORDER = ['称量', '称取', '配制', '混料', '混合', '分散', '搅拌', '球磨', '研磨', '筛分', '过筛', '陈化',
      '熔炼', '铸造', '浇注', '轧制', '锻造', '挤压', '拉拔',
      '沉淀', '共沉淀', '水热', '溶剂热', '溶胶-凝胶', '静电纺丝', '电沉积', '磁控溅射', '蒸镀', '化学气相沉积', '原子层沉积', '等离子体处理',
      '浸泡', '碱处理', '表面处理', '浸渍', '浸涂', '涂布', '旋涂', '喷涂', '提拉',
      '铺装', '预压', '铺层', '热压', '冷压', '压制', '模压', '注射成型', '挤出', '流延',
      '预烧', '煅烧', '烧结', '固溶', '淬火', '水淬', '回火', '退火', '正火', '时效', '渗氮', '渗碳',
      '升温', '保温', '降温', '固化', '交联', '熟化', '脱模', '成型',
      '养护', '标准养护', '蒸压养护', '干燥', '烘干', '真空干燥', '冷冻干燥',
      '齐边', '锯切', '切割', '裁切',
      '洗涤', '清洗', '离心', '过滤', '透析', '封装', '装配', '组装', '电池装配', '抛光', '打磨'];
    steps.sort(function (a, b) {
      var ia = ORDER.indexOf(a.t), ib = ORDER.indexOf(b.t);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    });
    return steps.slice(0, 10);
  }

  /* ---------------- 配比 ---------------- */
  function extractFormulation(text) {
    var out = [];
    var re = /n\s*\(([^)]{1,24})\)\s*[:：]\s*n\s*\(([^)]{1,24})\)\s*[:：]\s*n?\s*\(?([^)]{1,24})\)?\s*=\s*([\d.]+)\s*[:：]\s*([\d.]+)\s*[:：]\s*([\d.]+)/g, m;
    while ((m = re.exec(text))) out.push({ t: '摩尔比', v: 'n(' + m[1] + ') : n(' + m[2] + ') : n(' + m[3] + ') = ' + m[4] + ' : ' + m[5] + ' : ' + m[6], evidence: clean(m[0]) });
    [['设计密度', /设计密度为?\s*([\d.]+)\s*g\/cm3/], ['设计厚度', /(?:设计)?厚度为?\s*([\d.]+)\s*mm/],
     ['固液比', /固液比为?\s*([\d.]+)\s*[:：]\s*([\d.]+)/], ['质量比', /质量比为?\s*([\d.]+)\s*[:：]\s*([\d.]+)/],
     ['热压温度', /热压温度为?\s*([\d.]+)\s*(?:℃|°C)/], ['养护时间', /养护\s*([\d.]+)\s*(?:天|d)/],
     ['试件尺寸', /尺寸为?\s*([\d.]+\s*mm\s*[×x]\s*[\d.]+\s*mm\s*[×x]\s*[\d.]+\s*mm)/]].forEach(function (p) {
      var mm = text.match(p[1]);
      if (mm) out.push({ t: p[0], v: clean(mm.slice(1).join(' : ')), evidence: clean(mm[0]) });
    });
    return out;
  }

  /* ---------------- 参考文献 ---------------- */
  function parseRef(l) {
    var s = clean(l).replace(/^\[\d+\]\s*/, '').replace(/^\d{1,3}[.)]\s+/, '');
    var type = /\[J\]/.test(s) ? '期刊论文' : /\[D\]/.test(s) ? '学位论文' : /\[C\]/.test(s) ? '会议论文'
      : /\[M\]/.test(s) ? '专著' : /\[S\]/.test(s) ? '标准' : /\[P\]/.test(s) ? '专利' : /\[EB\/OL\]/.test(s) ? '网络资源' : '期刊论文';
    var authors = (s.split('.')[0] || '').slice(0, 60);
    var year = (s.match(/\b(19|20)\d{2}\b/) || [''])[0];
    var doi = (s.match(/10\.\d{4,9}\/[^\s,;\]]+/) || [''])[0];
    var vol = (s.match(/,\s*(\d{1,4})\s*\((\d{1,3})\)/) || []);
    var pages = (s.match(/(\d{1,5})\s*[-–—]\s*(\d{1,5})/) || []);
    var src = (s.match(/[.。]\s*([^.,，。]{4,40})\s*[，,]\s*(?:19|20)\d{2}/) || [])[1] || '';
    return { raw: s, type: type, authors: authors, src: clean(src), year: year, volume: vol[1] || '', issue: vol[2] || '', pages: pages[1] ? pages[1] + '-' + pages[2] : '', doi: doi, missing: [!authors && 'authors', !year && 'year'].filter(Boolean) };
  }
  function extractReferences(secs, lines) {
    /* 参考文献常被 PDF 抽成"一大段"（编号与正文黏连）：
       "…(1994).102.Seddon, J. M. et al.The use of…" 。
       先按编号把这种长块炸成一条条，再做识别。 */
    var exploded = [];
    lines.forEach(function (l) {
      var nums = (l.match(/\b\d{1,3}\.\s?[A-Z][a-z]/g) || []).length;
      if (l.length > 400 && nums >= 3 && /\b(19|20)\d{2}\b/.test(l)) {
        l.split(/(?=\b\d{1,3}\.\s?[A-Z][a-z])/).forEach(function (p) {
          var q = p.trim();
          if (q.length > 24) exploded.push(q);
        });
      } else exploded.push(l);
    });

    var sec = secs.filter(function (s) { return /参考文献|References/i.test(s.k); })[0];
    var pool = sec ? sec.text : [];
    if (pool.length < 3) {
      pool = exploded.filter(function (l) { return /\[[JDCMS]\]/.test(l) || (/\[[A-Z]\]/.test(l) && l.length > 30); });
    }
    var hits = pool.filter(function (l) { return l.length > 24 && /\[[A-Z]\]|\[EB/.test(l); });
    if (hits.length < 3) {
      /* 英文期刊编号式（Nature/Science 等）：
         "1. Harman, D. Aging: a theory based on free radical … J. Gerontol. 11, 298–300 (1956)."
         参考文献一定在文末，因此只在后 45% 的行里找编号条目，避开正文里的列表编号。 */
      var tail = exploded.slice(Math.floor(exploded.length * 0.55));
      var numbered = tail.filter(function (l) {
        if (l.length <= 32 || l.length > 600) return false;
        if (!/^\s*\[?\d{1,3}\]?[.)]?\s+[A-Z]/.test(l)) return false;
        if (!/\b(19|20)\d{2}\b/.test(l)) return false;
        var body = l.replace(/^\s*\[?\d{1,3}\]?[.)]?\s+/, '');
        return !/^(figure|fig\.|table|box|scheme|we\b|the\b|in\b|this\b|these\b|materials|methods|results|discussion|introduction|conclusion|acknowledg)/i.test(body);
      });
      if (numbered.length >= 3) hits = numbered;
    }
    if (hits.length < 3) {
      /* 英文期刊常见写法：Authors. Title. Journal, 2020, 12(3): 45-58. */
      hits = exploded.filter(function (l) {
        return l.length > 40 && l.length < 400 &&
          /\b(19|20)\d{2}\b/.test(l) && /[,;(]\s*(19|20)\d{2}/.test(l) &&
          /[A-Z][a-z]+,?\s+[A-Z]/.test(l) &&
          !/^(figure|fig\.|table|scheme|box|abstract|introduction|we |the |in |this )/i.test(l);
      });
    }
    return hits.map(parseRef).slice(0, 100);
  }

  /* ---------------- 概念（综述类文献的"变量"替代物） ----------------
     原则：**绝不预设某个学科的概念池**。旧版内置了一张"可穿戴传感"领域词表，
     套到生物膜论文上就会出现「标志物: pH」「应用场景: stress」这类无意义归类 ——
     这和"每篇论文都测同一套指标"是同一类错误。
     现在改为从**原文自身**找反复出现的术语：
       · 2~3 词短语（几乎一定是术语）→ 频次 ≥2 即入选；
       · 单个长词 → 要求频次 ≥8 且不在通用学术停用词表内；
       · 中文 → 3~5 字连续片段，频次 ≥5 且不含功能字；
     再按材料学科的**通用**词表（性能族 / 仪器 / 原料）归类，归不进去的进「核心术语」。
     这样任何方向的论文拿到的都是"它自己的"概念。 */
  var EN_STOP_SET = (function () {
    var s = {};
    var core = 'the a an and or of to in for on with by from at as is are was were be been being that this these those it its their our we they he she which who whom whose not no nor but if then than so such can could may might will would should must have has had do does did more most some any all each both few other into over under about after before between during through above below up down out off again further once here there when where why how also however moreover thus therefore while whereas although because since upon along toward towards per versus vs et al fig figure figs table tables eq equation section sections ref refs approximately around nearly almost often sometimes always usually generally mainly largely overall together relatively significantly markedly greatly slightly somewhat furthermore additionally finally hence meanwhile contrast addition particular several various important major minor few little large small widely commonly recently currently previously etc cf same other others both either neither each every such many much very well less least own due able unable non pre post sub super multi inter intra micro macro semi anti auto co re un im il ir dis mis over out able'.split(/\s+/);
    var extra = 'relative total specific control treated untreated typical average mean value values higher lower level levels rate rates time times number numbers final initial type types case cases condition conditions presence absence ability potential possible likely common general normal standard distinct certain full half whole part parts group groups order range ranges given found observed related similar including include includes included containing contains contain greater lesser'.split(/\s+/);
    core.concat(extra).forEach(function (w) { if (w) s[w] = 1; });
    return s;
  })();
  var CJK_FUNC = /[的了和与在对以及或而其之所能使被把从到由并且则即就都也很更最会要需可有无不这那此该等将已再又还只仅如若因故但于作为其中来上去下前后同样另外]/;
  function catOfConcept(term) {
    var fam = MR.domain ? MR.domain.classify(term) : null;
    if (fam && fam.k && fam.k !== '其他指标') return fam.k;
    var padded = ' ' + String(term).toLowerCase() + ' ';
    var ins = ((MR.domain && MR.domain.INSTRUMENT_LEX_EN) || []).concat((MR.domain && MR.domain.INSTRUMENT_LEX) || []);
    if (ins.some(function (w) { return w && padded.indexOf(' ' + String(w).toLowerCase() + ' ') >= 0; })) return '表征与分析手段';
    var mat = ((MR.domain && MR.domain.REAGENT_LEX_EN) || []).concat((MR.domain && MR.domain.MATERIAL_NOUN_EN) || [])
      .concat((MR.domain && MR.domain.MATERIAL_NOUN) || []);
    if (mat.some(function (w) { return w && padded.indexOf(' ' + String(w).toLowerCase() + ' ') >= 0; })) return '材料与试剂';
    return '核心术语';
  }
  /* 概念统计前先切掉参考文献区：期刊缩写（Proc. Natl. Acad. Sci.）会被当成"概念"，
     而它们其实是引文，不属于本文的技术概念。 */
  function conceptSourceText(t) {
    var lines = String(t || '').split('\n'), cut = lines.length, i;
    for (i = 0; i < lines.length; i++) {
      if (/^\s*(references|bibliography|参考文献|致\s*谢|acknowledge?ments?)\s*[:.]?\s*$/i.test(lines[i])) { cut = i; break; }
    }
    lines = lines.slice(0, cut);
    /* 页眉页脚这类"每页重复出现"的短行（如 Nature 的 "insightreview articles"）先统计再剔除 */
    var lc = {};
    lines.forEach(function (l) {
      var s = String(l || '').trim();
      if (s && s.length <= 70) lc[s] = (lc[s] || 0) + 1;
    });
    return lines.filter(function (l) {
      var s = String(l || '');
      if (!s || s.length > 600) return false;                             /* 被抽成一大段的引文块 */
      if ((s.match(/\b\d{1,3}\.\s?[A-Z][a-z]/g) || []).length >= 3) return false;
      if (s.trim().length <= 70 && lc[s.trim()] >= 3) return false;        /* 重复短行 = 页眉页脚 */
      if (/\|\s*VOL|VOL\s*\d|www\.|https?:|©|all rights reserved|Macmillan/i.test(s) && s.length < 120) return false;
      if (/\b\d{1,3}\s*,\s*\d{2,5}\s*[–-]\s*\d{2,5}\b/.test(s)) return false;   /* 卷, 起页–止页 = 引文 */
      return true;
    }).join('\n');
  }
  function extractConcepts(text, titleLike) {
    var t = conceptSourceText(text);
    var toks = (t.match(/[A-Za-z][A-Za-z\-]{1,}/g) || []).map(function (x) { return x.toLowerCase(); });
    var phrase = {}, single = {}, i, n, q;
    for (i = 0; i < toks.length; i++) {
      var a = toks[i];
      if (EN_STOP_SET[a] || a.length < 4) continue;          /* 停用词不作短语起点 */
      if (a.length >= 6) single[a] = (single[a] || 0) + 1;
      for (n = 2; n <= 3; n++) {
        if (i + n > toks.length) break;
        var parts = toks.slice(i, i + n), bad = false;
        for (q = 0; q < parts.length; q++) { if (EN_STOP_SET[parts[q]] || parts[q].length < 3) { bad = true; break; } }
        if (bad) break;
        var ph = parts.join(' ');
        phrase[ph] = (phrase[ph] || 0) + 1;
      }
    }
    var items = [];
    Object.keys(phrase).forEach(function (k) {
      if (phrase[k] < 2) return;
      var ws = k.split(' ');
      var allSame = ws.every(function (x) { return x === ws[0]; });      /* "review review review" 版式残留 */
      if (allSame) return;
      items.push({ t: k, n: phrase[k] });
    });
    Object.keys(single).forEach(function (k) { if (single[k] >= 8) items.push({ t: k, n: single[k] }); });
    /* 单个词若已被某个短语覆盖，则丢弃（短语信息量更大，例如 oxidative stress 优先于 stress） */
    items = items.filter(function (it) {
      if (it.t.indexOf(' ') >= 0) return true;
      return !items.some(function (o) { return o.t.indexOf(' ') >= 0 && (' ' + o.t + ' ').indexOf(' ' + it.t + ' ') >= 0; });
    });
    /* 中文：3~5 字连续片段，频次 ≥5，不含功能字 */
    var cjkItems = [];
    if (/[\u4e00-\u9fa5]/.test(t)) {
      var cjk = t.match(/[\u4e00-\u9fa5]{3,5}/g) || [];
      var cc = {};
      cjk.forEach(function (g) { if (!CJK_FUNC.test(g)) cc[g] = (cc[g] || 0) + 1; });
      Object.keys(cc).forEach(function (k) { if (cc[k] >= 5) cjkItems.push({ t: k, n: cc[k] }); });
      cjkItems = cjkItems.filter(function (it) {
        return !cjkItems.some(function (o) { return o !== it && o.n >= it.n && o.t.indexOf(it.t) >= 0 && o.t.length > it.t.length; });
      });
    }
    /* 标题词加权：题目里的词更"主题"，只影响排序，不改变显示的频次 */
    var tl = ' ' + String(titleLike || '').toLowerCase() + ' ';
    items.concat(cjkItems).forEach(function (it) { it.score = it.n + (tl.indexOf(it.t) >= 0 ? 6 : 0); });
    var pool = items.concat(cjkItems).sort(function (x, y) { return y.score - x.score; }).slice(0, 60);
    var groups = {};
    pool.forEach(function (it) { var c = catOfConcept(it.t); (groups[c] = groups[c] || []).push({ t: it.t, n: it.n }); });
    var order = ['核心术语', '表征与分析手段', '材料与试剂'];
    ((MR.domain && MR.domain.PROPERTY_FAMILIES) || []).forEach(function (f) { order.push(f.k); });
    var out = [];
    order.forEach(function (k) {
      if (!groups[k] || !groups[k].length) return;
      /* 专业类别要求是"术语短语"或高频整词，避免把 protein 这类主题词当成"试剂" */
      var g = (k === '核心术语') ? groups[k].slice()
        : groups[k].filter(function (x) { return x.n >= 10 || x.t.indexOf(' ') >= 0; }).filter(function (x) { return x.n >= 4; });
      if (!g.length) return;
      var byN = function (x, y) { return y.n - x.n; };
      /* 短语（如 "quorum sensing"）比单个词更能代表一个"概念"，优先展示 */
      var ph = g.filter(function (x) { return x.t.indexOf(' ') >= 0; }).sort(byN);
      var wd = g.filter(function (x) { return x.t.indexOf(' ') < 0; }).sort(byN);
      out.push({ cat: k, items: ph.slice(0, 4).concat(wd.slice(0, 4)).slice(0, 6) });
    });
    return out.slice(0, 8);
  }

  /* ---------------- 数据点 ---------------- */
  function extractNumbers(text) {
    var out = [];
    var re = /([\u4e00-\u9fa5]{2,10})\s*(?:为|是|达到|达到|:)\s*([\d.]+)\s*(MPa|%|℃|°C|h|min|mm|g\/cm3|g|mL)/g, m;
    while ((m = re.exec(text))) out.push({ k: clean(m[1]), v: m[2], unit: m[3] });
    var seen = {};
    return out.filter(function (o) { var k = o.k + o.v + o.unit; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 40);
  }

  /* ---------------- 主入口 ---------------- */
  function analyze(text, meta) {
    meta = meta || {};
    var raw = deGlue(stripRefMarks(String(text || '')));
    var lines = raw.split(/\n/).map(function (l) { return l.replace(/\u00a0/g, ' ').trim(); })
      .filter(function (l) { return l && !/PAGEREF|TOC \\o|\\h \\z|MERGEFORMAT|REF _Ref/.test(l); });
    var secs = splitSections(lines);
    var fullText = lines.join('\n');

    /* ------- 标题 ------- */
    var title = '';
    var titleSource = '';
    var titleEn = (raw.match(/([A-Z][A-Za-z\-,\s]{20,140})\n/) || [])[1] || '';
    var tm = raw.match(/(?:论文题目|题目|题\s*目)\s*[:：]\s*([^\n]{6,80})/);
    if (tm) { title = clean(tm[1]); titleSource = 'explicit'; }
    /* 文档主体是中文还是英文（决定标题该从哪里取） */
    var cjkN = (raw.match(/[\u4e00-\u9fa5]/g) || []).length;
    var textIsCJK = cjkN > 30 && cjkN > raw.length * 0.06;

    if (!title && textIsCJK) {
      /* 中文文档：题目就是正文第一行实质性文字，跳过免责声明/摘要/关键词/章节标题等 */
      var TBOILER = /^(【|摘\s*要|关键词|Key\s*words|Abstract|引\s*言|绪\s*论|目\s*录|学位论文|本科|硕士|博士|声明|授权|致\s*谢)/;
      for (var ti = 0; ti < Math.min(lines.length, 16); ti++) {
        var L = lines[ti];
        if (!L || L.length < 8 || L.length > 70) continue;
        if (TBOILER.test(L)) continue;
        if (/^(论文题目|题目|题\s*目)/.test(L)) continue;
        if (!/[\u4e00-\u9fa5]/.test(L)) continue;
        if (/[。；;，,、：:]$/.test(L)) continue;
        title = L; titleSource = 'in-text';
        break;
      }
    }

    /* 文件名标题：期刊 PDF 的首页标题常常是矢量轮廓（抽不出文字），
       而文件名往往就是"年份+期刊——题目"。这是最可靠的兜底来源。 */
    var nameTitle = '';
    if (meta.name) {
      nameTitle = String(meta.name).replace(/\.(docx?|pdf|txt|md)$/i, '').replace(/_+/g, ' ').trim();
      var mNT = nameTitle.match(/^(?:\d{4}\s*)?[^—–\-:：]*[—–\-:：]+\s*(.+)$/);
      if (!mNT) mNT = nameTitle.match(/^\d{4}\s*(\S.*)$/);
      if (mNT && mNT[1].replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').length >= 8) nameTitle = mNT[1];
      nameTitle = clean(nameTitle).replace(/^[—–\-:：\s]+/, '').trim();
      /* 文件名必须"像题目"：至少 3 个有实义的长词（避免 paper-final-v3 之类被当标题） */
      var ntWords = nameTitle.split(/\s+/).filter(function (w) { return /[A-Za-z\u4e00-\u9fa5]{3,}/.test(w); }).length;
      if (ntWords < 3 && !/[\u4e00-\u9fa5]{4,}/.test(nameTitle)) nameTitle = '';
    }

    /* 正文中的标题候选：首屏里"最像标题"的一行（词数适中、无句号、非期刊页眉/图注） */
    var inTextTitle = '';
    (function () {
      var skipRe = /^(nature|science|cell|the\s+lancet|jama|advanced|journal|proceedings|volume|vol\.|issue|www\.|https?:|doi|received|accepted|published|correspondence|review article|article|editorial|fig(?:ure)?\.?\s*\d|table\s*\d|box\s*\d|scheme\s*\d|supplementary|author|editor|insight|perspective|download|content|search|browse|this\s+week|cover|abstract|keywords?)/i;
      var best = null;
      lines.slice(0, 70).forEach(function (l) {
        if (l.length < 24 || l.length > 170) return;
        if (skipRe.test(l)) return;
        if (/\|\s*VOL|VOL\s*\d|www\.|nature\.com|\bdoi\b/i.test(l)) return;
        if (/^[A-Z][a-z]+,?\s+[A-Z]/.test(l) && l.split(/\s+/).length < 8) return;   /* 作者行 */
        if (/[@\d]{3,}/.test(l)) return;
        if (l.indexOf('|') >= 0) return;
        if (/\.$/.test(l)) return;                                                   /* 句号收尾更像正文 */
        if (/^(the|a|an|in|we|this|these|although|however|because|moreover|thus)\s/i.test(l)) return;
        /* PDF 把段内换行黏成一行时会出现 "longevity.The" / "thatthe" 这种黏连，标题不会有 */
        if (/[a-z]{2}[A-Z][a-z]/.test(l)) return;
        if (l.split(/\s+/).filter(function (w) { return /[A-Za-z]{3,}/.test(w); }).length < 4) return;
        var words = l.split(/\s+/).filter(function (w) { return /[A-Za-z\u4e00-\u9fa5]/.test(w); }).length;
        if (words < 5 || words > 30) return;
        var sc = words + (/[:,]/.test(l) ? 3 : 0);
        if (!best || sc > best.sc) best = { t: l, sc: sc };
      });
      if (best) inTextTitle = best.t;
    })();

    if (!title) {
      /* 英文文献：文件名题目（"年份+期刊——题目"）比正文行更可靠 ——
         期刊 PDF 首页标题常是矢量轮廓，抽不出文字；而正文行容易被段落黏连污染。
         因此只要文件名"像题目"就优先采用，正文候选仅作兜底。 */
      var pick = '';
      if (nameTitle) { pick = nameTitle; titleSource = 'filename'; }
      else if (inTextTitle && inTextTitle.split(/\s+/).length >= 5) { pick = inTextTitle; titleSource = 'in-text'; }
      if (!pick) {
        var cand = lines.slice(0, 12).filter(function (l) { return l.length >= 8 && l.length <= 80 && !/学院|专业|学号|姓名|日期|声明|授权/.test(l); });
        pick = cand[0] || ''; titleSource = pick ? 'in-text' : '';
      }
      title = pick || '（未识别标题）';
      if (!titleEn || titleEn === title) titleEn = title;
    } else if (!titleEn) {
      /* 只有真的是英文才当"英文题名"，否则中文论文会把中文文件名显示成 English title */
      var enCand = inTextTitle || nameTitle;
      if (enCand && /[A-Za-z]{4,}/.test(enCand) && !/[\u4e00-\u9fa5]/.test(enCand)) titleEn = enCand;
    }

    /* ------- 摘要 ------- */
    var abstractSource = '';
    var abstractCandidates = [];
    var absM = raw.match(/摘\s*要\s*\n?([\s\S]{80,2600}?)(?:\n\s*(?:关键词|Abstract|1\s*引\s*言))/);
    var abstract = '';
    if (absM) { abstract = clean(absM[1]).slice(0, 1800); abstractSource = 'explicit'; }
    if (!abstract) {
      var absE = raw.match(/\bAbstract\b[.:]?\s*\n?([\s\S]{120,3000}?)(?:\n\s*(?:Key\s*words?|Keywords|Introduction|1\.?\s+Introduction|Background))/i);
      if (absE) { abstract = clean(absE[1]).replace(/\s+/g, ' ').slice(0, 1800); abstractSource = 'explicit'; }
    }
    if (!abstract) {
      /* Nature / Science 等不写 "Abstract" 标题，正文首段即摘要。
         先合并行→段落，再取"第一段实质文字"推断，并标注为"推断"。 */
      var paras = mergeParagraphs(lines).map(stripHeader).filter(function (p) {
        if (p.length < 150) return false;
        if (!/[a-z]{4}/.test(p)) return false;
        if (!/^[A-Z"“(]/.test(p)) return false;                                /* 必须从句首开始，排除断句残片 */
        if (/@|e-?mail|https?:|www\.|\bdoi\b|downloaded|all rights|©|\(e-mail/i.test(p)) return false;
        /* 作者/单位块的特征：机构词、国名州名、邮编、大量 "X. Y." 首字母缩写、专有名词过密 */
        if (/\b(Universit|Institute|Institutes|Laboratory|Laboratories|Department|Hospital|Cent(?:er|re)|College|Academy|School|Faculty|Division)\b/.test(p)) return false;
        if (/\b(USA|U\.S\.A|United States|United Kingdom|Germany|France|Japan|Canada|Australia|Netherlands|Maryland|California|New York|Beijing|Shanghai|Corresponding author)\b/.test(p)) return false;
        if (/\b\d{5}(?:-\d{4})?\b/.test(p)) return false;
        if ((p.match(/\b[A-Z]\.\s?[A-Z]?\.?/g) || []).length >= 3) return false;
        var lower = (p.match(/\b[a-z]{3,}\b/g) || []).length;
        var upper = (p.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
        if (upper > lower * 0.6) return false;
        if (/^(figure|fig\.|table|box|scheme)/i.test(p)) return false;
        if (p.indexOf('|') >= 0) return false;
        /* 版式残留：同一词在开头反复出现（Trends 类期刊页眉的 "ReviewReview Review…"） */
        var headToks = p.slice(0, 90).split(/\s+/), seenW = {}, rep = 0;
        headToks.forEach(function (w) { if (w.length > 2) seenW[w] = (seenW[w] || 0) + 1; });
        Object.keys(seenW).forEach(function (k) { if (seenW[k] >= 3) rep = 1; });
        if (rep) return false;
        return true;
      });
      /* 原文没有 Abstract 字段时，无法 100% 确定"哪一段才是摘要"。
         因此把候选段落一并返回，界面上允许用户"换一段"，而不是替他拍板。 */
      abstractCandidates = paras.slice(0, 6).map(function (p) { return firstSentences(p, 900); });
      if (abstractCandidates.length) { abstract = abstractCandidates[0]; abstractSource = 'inferred'; }
    }

    /* ------- 关键词 ------- */
    var kwM = raw.match(/关键词\s*[:：]?\s*([^\n]{4,120})/);
    var keywords = kwM ? kwM[1].split(/[；;，,、\s]+/).filter(Boolean) : [];
    var kwSource = keywords.length ? 'explicit' : '';
    if (!keywords.length) {
      var kwE = raw.match(/(?:Key\s*words?|Keywords)\s*[:：]?\s*([^\n]{8,240})/i);
      if (kwE) {
        keywords = kwE[1].split(/[;·|,，、]|\s{2,}/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.length < 40; }).slice(0, 12);
        if (keywords.length) kwSource = 'explicit';
      }
    }
    if (!keywords.length) {
      /* 无关键词字段：从"标题 + 摘要"里归纳高频实词。明确标注来源为"自动归纳"，
         与原文自带关键词区分开，不制造"原文有这个词"的假象。 */
      var seeds = ((titleEn || '') + ' ' + (title || '') + ' ' + (abstract || '').slice(0, 700)).toLowerCase();
      var STOP = {};
      ('the a an and or of to in for on with by from at as is are was were be been being that this these those it its their our we they he she which who whom whose not no nor but if then than so such can could may might will would should must have has had do does did more most some any all each both few other into over under about after before between during through above below up down out off again further once here there when where why how also however moreover thus therefore study studies results result showed show shown using used use new novel high low increase decrease increased decreased effect effects analysis data method methods different significant respectively due via within without among across based present presented reported report suggest suggests one two three first second').split(/\s+/).forEach(function (w) { STOP[w] = 1; });
      var freq = {};
      (seeds.match(/[A-Za-z][A-Za-z\-]{4,}/g) || []).forEach(function (w) {
        var k = w.toLowerCase().replace(/^-+|-+$/g, '');
        if (!k || STOP[k] || k.length < 5) return;
        freq[k] = (freq[k] || 0) + 1;
      });
      var derived = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a] || b.length - a.length; }).slice(0, 8);
      if (derived.length >= 3) { keywords = derived; kwSource = 'derived'; }
    }

    var materials = extractMaterials(lines);
    var instruments = extractInstruments(lines);
    var standards = extractStandards(fullText);
    var variables = extractVariables(secs, fullText);
    var indicators = extractIndicators(secs, fullText);
    var steps = extractSteps(fullText);
    var formulation = extractFormulation(fullText);
    var references = extractReferences(secs, lines);
    var numbers = extractNumbers(fullText);

    /* 论文类型判定：研究论文 / 综述 / 临床研究
       原则：以**结构证据**为主（有没有变量、工序、材料清单、方法学章节），
       再用标题 / 文件名 / 正文措辞佐证。只看关键词会误判 —— Trends、Nature Reviews
       这类刊的标题里往往没有 "review" 字样。 */
    var lowerAll = fullText.toLowerCase();
    var reviewSignals = /(this review|in this review|we review|review summari|overview of|perspectives|challenges and opportunities|future directions|has been widely|are summarized|review article|here we discuss|we discuss|this article reviews)/.test(lowerAll);
    var clinicalSignals = /(patients|clinical trial|cohort|randomized|participants|informed consent|ethics committee|healthy volunteers)/.test(lowerAll);
    var hasMethodsSec = secs.some(function (s) { return /材料与方法|试验方法|实验方法|测试方法|表征方法|methods?|experimental|protocol|procedure|preparation|fabrication/i.test(s.k); });
    var nameAll = String(meta.name || '') + ' ' + String(title || '');
    var reviewNameHit = /review|综述|trends|perspectives|progress\s+in|advances\s+in|述评|评论|进展/i.test(nameAll);
    var paperType = 'research';
    if (!variables.length && (reviewNameHit || reviewSignals) && !hasMethodsSec) paperType = 'review';
    else if (!variables.length && !steps.length && !hasMethodsSec && !materials.length) paperType = 'review';
    else if (!variables.length && clinicalSignals && !steps.length) paperType = 'clinical';

    /* 概念（综述类文献的"变量"替代物） */
    var concepts = extractConcepts(fullText, title + ' ' + (titleEn || ''));
    /* 年份（用于时间线） */
    var years = {};
    var reY = /\b(19[89]\d|20[0-2]\d)\b/g, my;
    while ((my = reY.exec(fullText))) { years[my[1]] = (years[my[1]] || 0) + 1; }
    var timeline = Object.keys(years).map(function (y) { return { y: +y, n: years[y] }; })
      .filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return a.y - b.y; });

    /* 质量评分：用于界面提示"抽取可信度" */
    var score = 0;
    score += Math.min(20, materials.length * 4);
    score += Math.min(15, instruments.length * 4);
    score += Math.min(20, variables.length * 7);
    score += Math.min(25, indicators.filter(function (i) { return !i.isChar; }).length * 8);
    score += Math.min(10, steps.length * 3);
    score += Math.min(10, references.length ? 10 : 0);

    /* 抽取可信度自检：把"可能被误读"的点显式告知用户，而不是默默给一份看起来完整的结果 */
    var warnings = [];
    if (!materials.length) warnings.push('未识别到原料/试剂：原文可能未设"材料与试剂"段落，或以表格给出。');
    if (!variables.length) warnings.push('未识别到变量与水平：该文可能不是"控制变量式"研究（综述/临床类常见）。');
    if (!indicators.filter(function (i) { return !i.isChar; }).length) warnings.push('未识别到可测性能指标。');
    if (!references.length) warnings.push('未识别到参考文献条目：PDF 参考文献可能未按行分条。');
    if (abstractSource === 'inferred') warnings.push('摘要为"推断"（原文无 Abstract 标题，取自正文首段）。');
    if (kwSource === 'derived') warnings.push('关键词为"自动归纳"（原文无关键词字段，取自标题与摘要高频词）。');
    if (paperType === 'review') warnings.push('本文判定为综述/展望类：没有变量与实验步骤，流程将按"技术概念路线"呈现。');

    return {
      meta: { name: meta.name || '', size: meta.size || 0, chars: raw.length, paragraphs: lines.length, sections: secs.length },
      title: title, titleEn: clean(titleEn), titleSource: titleSource,
      abstract: abstract, abstractSource: abstractSource, abstractCandidates: abstractCandidates,
      keywords: keywords, keywordsSource: kwSource,
      sections: secs.map(function (s) { return { no: s.no, k: s.k, len: s.text.length }; }),
      materials: materials, instruments: instruments, standards: standards,
      variables: variables, indicators: indicators, steps: steps,
      formulation: formulation, references: references, numbers: numbers,
      paperType: paperType, concepts: concepts, timeline: timeline,
      confidence: score, warnings: warnings
    };
  }

  return { analyze: analyze, parseRef: parseRef, indLexicon: indLexicon, CHAR_METHOD: CHAR_METHOD, STEP_VERBS: STEP_VERBS };
})();
