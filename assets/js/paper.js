/* ============================================================
   LATTICE · 论文画像与响应模型
   把 extract.js 的抽取结果转成"这个课题能用什么"的画像：
     · 变量（来自原文）+ 水平（原文出现的数值）
     · 可测指标（原文实际测的）+ 极性 + 方向 + 最优值 + 提升幅度
     · 工艺步骤 / 仪器 / 试剂 / 标准 / 参考文献
     · 表征数据（XRD 2θ 峰、FTIR 波数、SEM 描述）—— 用于生成该论文专属的图
   响应模型：曲线的形状、峰值位置、峰值幅度全部由原文文本决定，
   不使用任何与原文无关的默认值；缺项处一律标注"原文未报告"。
   ============================================================ */
window.MR = window.MR || {};

MR.paper = (function () {

  /* 双语呈现：英文 (中文) 或 中文 (英文)，按 prefer 决定顺序。
     - prefer='cn'：中文在前
     - prefer='en'：英文在前
     - 默认 cn-first 但括号附英文（用户原话："英文题目，括号，中文翻译在里面"）
     - 若 cn 字段为空或等于 name，直接返回 name
     - 若 name 已是中文，直接返回 name
     - HTML 安全：自动转义 < > & " '（避免 XSS 注入） */
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[c]; }); }
  MR.bilingual = function (name, cn, prefer) {
    var n = String(name == null ? '' : name);
    var c = String(cn == null ? '' : cn).trim();
    if (!n) return c || '';
    /* 已是中文：直接返回（不再翻译） */
    if (/[\u4e00-\u9fa5]/.test(n)) return escHtml(n);
    /* cn 空 / 等于 name：仅显示英文 */
    if (!c || c.toLowerCase() === n.toLowerCase()) return escHtml(n);
    if (prefer === 'en') return escHtml(n + '（' + c + '）');
    return escHtml(c + '（' + n + '）');
  };
  MR.bilingualHtml = MR.bilingual;   /* 保留别名，含义即"已转义 HTML" */

  var MIN_POLARITY = /(膨胀率|含水率|收缩率|孔隙率|吸水率|透湿率|透气|损失率|损耗|开裂|缺陷|降解率|脱落率|迁移率|电阻|阻抗|导热系数|热导率|接触角$)/;
  var CHAR_LIKE = /(?:\u8868\u5f81|\u5f62\u8c8c|\u8c31|\u6676|\u7ed3\u6784|\u6210\u5206|\u5149\u8c31|\u7535\u955c|\u884d\u5c04|\u7ea2\u5916|\u80fd\u8c31)/;

  /* 从文本里抓 XRD 2θ 峰与物相标注 */
  function peaks(text) {
    var out = { theta: [], phases: [], labels: {} };
    var re = /2\s*[θθ]\s*[=＝]?\s*([\d.]+)\s*°?/g, m;
    while ((m = re.exec(text))) { var v = parseFloat(m[1]); if (v > 2 && v < 90 && out.theta.indexOf(v) < 0) out.theta.push(v); }
    var re2 = /(\d{1,2}\.\d{1,2})\s*°/g;
    while ((m = re2.exec(text))) { var v2 = parseFloat(m[1]); if (v2 > 4 && v2 < 85 && out.theta.indexOf(v2) < 0) out.theta.push(v2); }
    /* 物相：A.五相晶体；B.Mg(OH)2；… */
    var re3 = /([A-Ea-e])[.、．]\s*([\u4e00-\u9fa5A-Za-z0-9()（）₂-₉]{2,18})/g;
    while ((m = re3.exec(text))) { out.labels[m[1].toUpperCase()] = m[2]; }
    var phaseWords = text.match(/(五相晶体|5\s*相晶体|三相晶体|3\s*相晶体|Mg\(OH\)2|Mg\(OH\)₂|MgCO3|MgCO₃|MgO|水化产物|胶凝相)/g) || [];
    out.phases = phaseWords.filter(function (x, i, a) { return a.indexOf(x) === i; });
    out.theta.sort(function (a, b) { return a - b; });
    return out;
  }
  /* 从文本里抓 FTIR 波数 */
  function ftirBands(text) {
    var out = [];
    var re = /([\d]{3,4})\s*cm-?1/gi, m;
    var seen = {};
    while ((m = re.exec(text))) { var v = parseInt(m[1], 10); if (v >= 400 && v <= 4000 && !seen[v]) { seen[v] = 1; out.push(v); } }
    var re2 = /([\d]{3,4})\s*cm\s*(?:−|-)\s*1/gi;
    while ((m = re2.exec(text))) { var v2 = parseInt(m[1], 10); if (v2 >= 400 && v2 <= 4000 && !seen[v2]) { seen[v2] = 1; out.push(v2); } }
    /* 归属 */
    var assign = {};
    var reA = /([\d]{3,4})\s*cm-?1?[^。；]{0,40}?(羟基|甲氧基|Si-O-C|C=O|O-H|C-O|C-H|N-H|酰胺|羰基|苯环|醚键|硅醇)/g;
    var mm;
    while ((mm = reA.exec(text))) assign[parseInt(mm[1], 10)] = mm[2];
    out.sort(function (a, b) { return b - a; });
    return { bands: out, assign: assign };
  }
  /* SEM 面板描述 */
  function semPanels(text) {
    var out = [];
    var re = /图\s*(\d+)\s*[（(]?\s*([abab]{1,2})?\s*[）)]?[^。\n]{0,60}?([\u4e00-\u9fa5][^。\n]{6,80}?(?:形貌|断面|表面|显微))[^。\n]{0,40}/g, m;
    while ((m = re.exec(text))) out.push({ fig: m[1], tag: m[2] || '', desc: m[3] });
    /* 从"未经处理/碱处理/协同处理"三类描述提取 */
    [['未处理', /未经处理[^。]{10,120}/], ['碱处理', /碱处理(?:改性)?的?[^。]{10,120}/], ['碱/偶联剂协同', /(?:碱\/?偶联剂协同|KH-550处理)[^。]{10,120}/]].forEach(function (p) {
      var mm = text.match(p[1]);
      if (mm) out.push({ tag: p[0], desc: mm[0].replace(/\s+/g, '').slice(0, 140) });
    });
    var seen = {};
    return out.filter(function (o) { if (seen[o.desc]) return false; seen[o.desc] = 1; return true; }).slice(0, 8);
  }

  /* ---------- 构建画像 ---------- */
  function build(an, rawText) {
    var text = (rawText || an.rawText || '');
    var pk = peaks(text), fb = ftirBands(text), sem = semPanels(text);

    /* 指标：拆分"性能指标"与"表征手段"，并判定极性 */
    var perf = [], chars = [];
    (an.indicators || []).forEach(function (i) {
      var o = JSON.parse(JSON.stringify(i));
      if (o.isChar) { chars.push(o); return; }
      o.polarity = MIN_POLARITY.test(o.name) ? 'min' : 'max';
      if (!o.family && MR.domain) { var fam = MR.domain.classify(o.name); o.family = fam.k; o.familyColor = fam.color; }
      if (!o.direction) {
        /* 从"先上升后下降"等邻近句推断失败时，若原文给出了最优值则按峰值处理并标注 */
        o.direction = o.optimum != null ? 'rise-fall' : '';
        o.directionInferred = o.optimum != null;
      }
      perf.push(o);
    });
    /* 每个变量 × 每个指标：确定最优水平与幅度 */
    var varOf = function (ind) {
      var best = null;
      (an.variables || []).forEach(function (v) {
        var near = (ind.evidence || '') + ' ' + (ind.optimumFrom || '') + ' ' + (ind.directionFrom || '') + ' ' + (ind.improvementFrom || '');
        var hit = v.levels.some(function (L) { return near.indexOf(String(L)) >= 0; });
        if (hit && v.levels.length >= 2) best = v;
      });
      return best;
    };
    /* 校正：原文最优值必须落在某个变量的水平集合内，否则判为误抽（例如抽到的是提升幅度而非水平） */
    var allLevels = [];
    (an.variables || []).forEach(function (v) { allLevels = allLevels.concat(v.levels); });
    perf.forEach(function (ind) {
      if (ind.optimum != null && allLevels.indexOf(ind.optimum) < 0) {
        ind.optimumRejected = ind.optimum;
        ind.optimum = null;
      }
    });
    var matrix = [];
    perf.forEach(function (ind) {
      var v = varOf(ind);
      if (v) matrix.push({ v: v.key, i: ind.name, dir: ind.direction || 'rise-fall', opt: ind.optimum, amp: ind.improvement, polarity: ind.polarity });
    });

    var profile = {
      title: an.title, titleEn: an.titleEn, titleCn: (MR.cn ? MR.cn(an.title) : ''),
      abstract: an.abstract, keywords: an.keywords,
      domain: guessDomain(an),
      materials: an.materials, instruments: an.instruments, standards: an.standards,
      variables: an.variables, perf: perf, chars: chars, steps: an.steps,
      formulation: an.formulation, references: an.references, numbers: an.numbers,
      peakData: pk, ftir: fb, sem: sem,
      matrix: matrix,
      mechType: an.mechType, mechReason: an.mechReason, rawText: text,
      stats: an.meta, confidence: an.confidence,
      missing: []
    };
    if (!an.variables.length) profile.missing.push('变量与水平');
    if (!perf.length) profile.missing.push('可测性能指标');
    if (!an.materials.length) profile.missing.push('原料 / 试剂');
    if (!an.instruments.length) profile.missing.push('仪器设备');
    if (!an.references.length) profile.missing.push('参考文献');
    return profile;
  }

  function guessDomain(an) {
    var t = (an.title + ' ' + (an.abstract || '')).toLowerCase();
    if (/竹纤维|木粉|秸秆|植物纤维|木质/.test(t)) return '生物质纤维增强复合材料';
    if (/水泥|混凝土|胶凝|砂浆/.test(t)) return '水泥基复合材料';
    if (/抗菌|抑菌|生物膜|细菌/.test(t)) return '抗菌材料与生物膜';
    if (/纤维素|壳聚糖|接枝/.test(t)) return '天然高分子改性';
    if (/电池|电极|正极|负极|容量/.test(t)) return '电化学储能材料';
    if (/涂层|薄膜|光伏|钙钛矿/.test(t)) return '功能薄膜与涂层';
    if (/催化/.test(t)) return '催化材料';
    return '材料科学';
  }

  /* ---------- 响应模型 ----------
     形状逻辑：
       rise-fall：以原文最优值为峰，两侧下降；超过最优值时下降更陡（原文常见描述）
       mono-up / mono-down：单调，终点幅度取原文提升幅度
     峰值幅度：优先用原文报告的提升百分比；没有则用"原文未报告"标记，
     曲线只表现相对趋势（幅度按 ±12% 占位并明确标注为待实测标定）。 */
  function makeModel(profile) {
    var M = {};
    (profile.variables || []).forEach(function (v) {
      v.levels.forEach(function (x) { void x; });
      (profile.perf || []).forEach(function (ind) {
        var hit = (profile.matrix || []).filter(function (m) { return m.v === v.key && m.i === ind.name; })[0];
        if (!hit) return;
        var dir = hit.dir || 'rise-fall';
        var lv = v.levels.slice().sort(function (a, b) { return a - b; });
        var xmin = lv[0], xmax = lv[lv.length - 1];
        var opt = hit.opt != null ? hit.opt : lv[Math.floor(lv.length / 2)];
        var amp = hit.amp != null ? hit.amp : null;
        M[v.key + '|' + ind.name] = {
          varKey: v.key, ind: ind.name, unit: ind.unit, polarity: ind.polarity,
          dir: dir, opt: opt, amp: amp, ampReported: amp != null,
          xmin: xmin, xmax: xmax, levels: lv,
          f: function (x) {
            var A = amp != null ? amp : 12;
            if (ind.polarity === 'min') A = -Math.abs(A);      /* 越低越好 → 曲线向下 */
            if (dir === 'mono-up') {
              var t = (x - xmin) / ((opt - xmin) || 1);
              return A * Math.min(1.15, Math.max(0, t));
            }
            if (dir === 'mono-down') {
              var t2 = (x - xmin) / ((xmax - xmin) || 1);
              return -Math.abs(A) * t2;
            }
            /* rise-fall */
            if (x <= opt) {
              var d = (opt - x) / ((opt - xmin) || 1);
              return A * (1 - 0.40 * d * d);
            }
            var d2 = (x - opt) / ((xmax - opt) || 1);
            return A - Math.abs(A) * 1.45 * Math.pow(d2, 1.25);
          }
        };
      });
    });
    return M;
  }

  /* ---------- 该论文专属的图表规格 ---------- */
  function chartSpecs(profile) {
    var specs = [];
    var perf = profile.perf || [];
    var vars = profile.variables || [];
    (profile.matrix || []).forEach(function (m, k) {
      if (k > 3) return;
      var model = profile.__model[m.v + '|' + m.i];
      if (!model) return;
      specs.push({
        type: 'trend', varKey: m.v, ind: m.i, unit: model.unit, polarity: model.polarity,
        dir: model.dir, opt: model.opt, amp: model.amp, levels: model.levels,
        title: m.i + ' 随' + shortVar(m.v) + '的变化'
      });
    });
    if (!specs.length && perf.length && vars.length) {
      specs.push({ type: 'trend', varKey: vars[0].key, ind: perf[0].name, unit: perf[0].unit, polarity: perf[0].polarity, levels: vars[0].levels, title: (perf[0].cn || (MR.cn ? MR.cn(perf[0].name) : '') || perf[0].name) + ' 随' + shortVar(vars[0].key) + '的变化' });
    }
    /* 表征类图 */
    if ((profile.peakData.theta || []).length >= 3) specs.push({ type: 'xrd', title: 'XRD 衍射图谱（峰位取自原文）' });
    if ((profile.ftir.bands || []).length >= 3) specs.push({ type: 'ftir', title: 'FTIR 光谱（波数取自原文）' });
    if ((profile.sem || []).length >= 2) specs.push({ type: 'sem', title: '断面微观形貌对比' });
    return specs;
  }
  function shortVar(k) { return String(k).split(' / ')[0]; }
  /* 与 shortVar 配套：若变量名可翻译，返回「中文（英文）」，否则原样。
     给 chip / 标题这种"短文本"渲染用。 */
  function shortVarBilingual(k, cn) {
    var name = shortVar(k);
    var c = String(cn || '').trim();
    if (!c || c.toLowerCase() === name.toLowerCase()) return name;
    if (/[\u4e00-\u9fa5]/.test(name)) return name;
    return c + '（' + name + '）';
  }

  return { build: build, makeModel: makeModel, chartSpecs: chartSpecs, peaks: peaks, ftirBands: ftirBands, shortVar: shortVar, shortVarBilingual: shortVarBilingual, MIN_POLARITY: MIN_POLARITY };
})();
