E = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(E, encoding='utf-8').read()
n = 0
def rep(old, new, tag):
    global s, n
    if old in s:
        s = s.replace(old, new, 1); n += 1; print('ok  ', tag)
    else:
        print('MISS', tag)

# ---------- 1) 上标引用清理 + 英文文献结构识别 ----------
rep("""    var raw = String(text || '');
    var lines = raw.split(/\\n/).map(function (l) { return l.replace(/\\u00a0/g, ' ').trim(); })""",
    """    var raw = stripRefMarks(String(text || ''));
    var lines = raw.split(/\\n/).map(function (l) { return l.replace(/\\u00a0/g, ' ').trim(); })""",
    'strip ref marks')

rep("""  /* ---------------- 分节 ---------------- */""",
    """  /* ---------- 上标引用清理 ----------
     Nature 系期刊把引用编号排成上标，PDF 抽文字时会内联成 "breath68" "nanoparticles80"。
     规则：字母/右括号后紧跟 1–3 位数字，且其后是空格/标点/行尾 → 判为上标引用并去掉。
     不会误伤 "g/m2"、"0.5"、"pH 7.4"、"Ta2O5"（后者数字后紧跟字母，不满足条件）。 */
  function stripRefMarks(t) {
    return t.replace(/([A-Za-z\\)\\]])(\\d{1,3})(?=[\\s.,;:)—\\]\\-]|$)/g, function (m, a, b) {
      var v = parseInt(b, 10);
      return (v >= 1 && v <= 400) ? a : m;
    });
  }

  /* ---------------- 分节 ---------------- */""",
    'stripRefMarks fn')

# ---------- 2) 标题 / 摘要 / 关键词：兼容英文 ----------
rep("""    var titleEn = (raw.match(/([A-Z][A-Za-z\\-,\\s]{20,140})\\n/ ) || [])[1] || '';
    var absM = raw.match(/摘\\s*要\\s*\\n?([\\s\\S]{80,2600}?)(?:\\n\\s*(?:关键词|Abstract|1\\s*引\\s*言))/);
    var abstract = absM ? clean(absM[1]).slice(0, 1800) : '';
    var kwM = raw.match(/关键词\\s*[:：]?\\s*([^\\n]{4,120})/);
    var keywords = kwM ? kwM[1].split(/[；;，,、\\s]+/).filter(Boolean) : [];""",
    """    var titleEn = (raw.match(/([A-Z][A-Za-z\\-,\\s]{20,140})\\n/ ) || [])[1] || '';
    var absM = raw.match(/摘\\s*要\\s*\\n?([\\s\\S]{80,2600}?)(?:\\n\\s*(?:关键词|Abstract|1\\s*引\\s*言))/);
    var abstract = absM ? clean(absM[1]).slice(0, 1800) : '';
    var kwM = raw.match(/关键词\\s*[:：]?\\s*([^\\n]{4,120})/);
    var keywords = kwM ? kwM[1].split(/[；;，,、\\s]+/).filter(Boolean) : [];
    /* 英文文献：Abstract / Keywords 结构 */
    if (!abstract) {
      var absE = raw.match(/\\bAbstract\\b[.:]?\\s*\\n?([\\s\\S]{120,3000}?)(?:\\n\\s*(?:Key\\s*words?|Keywords|Introduction|1\\.?\\s+Introduction|Background))/i);
      if (absE) abstract = clean(absE[1]).replace(/\\s+/g, ' ').slice(0, 1800);
    }
    if (!keywords.length) {
      var kwE = raw.match(/(?:Key\\s*words?|Keywords)\\s*[:：]?\\s*([^\\n]{8,240})/i);
      if (kwE) keywords = kwE[1].split(/[;·|,，、]|\\s{2,}/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.length < 40; }).slice(0, 12);
    }
    /* 英文标题：取正文前若干行里"最像标题"的一行（词数多、非期刊名/作者行） */
    if (/[A-Za-z]/.test(title) && title.split(/\\s+/).length < 4) {
      var skipRe = /^(nature|science|cell|the\\s+lancet|jama|advanced|journal|proceedings|volume|vol\\.|issue|www\\.|https?:|doi|received|accepted|published|correspondence|review article|article|editorial)/i;
      var best = null;
      lines.slice(0, 60).forEach(function (l) {
        if (l.length < 24 || l.length > 160) return;
        if (skipRe.test(l)) return;
        if (/^[A-Z][a-z]+,?\\s+[A-Z]/.test(l) && l.split(/\\s+/).length < 8) return;   /* 作者行 */
        if (/[@\\d]{3,}/.test(l)) return;
        var words = l.split(/\\s+/).length;
        if (words < 5) return;
        if (!best || words > best.words) best = { t: l, words: words };
      });
      if (best) { titleEn = best.t; title = best.t; }
    }""",
    'english title/abstract/keywords')

# ---------- 3) 论文类型 + 概念词 ----------
rep("""    /* 质量评分：用于界面提示"抽取可信度" */""",
    """    /* 论文类型判定：研究论文 / 综述 / 临床研究 */
    var lowerAll = fullText.toLowerCase();
    var reviewSignals = /(this review|in this review|we review|review summari|overview of|perspectives|challenges and opportunities|future directions|has been widely|are summarized|review article)/.test(lowerAll);
    var clinicalSignals = /(patients|clinical trial|cohort|randomized|participants|informed consent|ethics committee|healthy volunteers)/.test(lowerAll);
    var hasMethods = /(materials and methods|methods and materials|experimental section|methods\\b)/i.test(fullText);
    var paperType = 'research';
    if (!variables.length && !steps.length && (reviewSignals || /review|perspective/i.test(title))) paperType = 'review';
    else if (clinicalSignals && !steps.length) paperType = 'clinical';
    else if (!variables.length && !hasMethods) paperType = reviewSignals ? 'review' : 'research';

    /* 概念词：综述没有变量与指标，但有"技术/器件/机制"概念，用于生成概念图与对比矩阵 */
    var CONCEPT_POOL = {
      '可穿戴传感': ['wearable', 'wearable sensor', 'skin patch', 'patch', 'microneedle', 'microneedle patch', 'flexible', 'stretchable', 'textile', 'epidermal'],
      '生物流体': ['sweat', 'interstitial fluid', 'ISF', 'ISF', 'saliva', 'tears', 'tear', 'urine', 'blood', 'exhaled breath', 'breath', 'dermal interstitial'],
      '识别元件': ['aptamer', 'antibody', 'enzyme', 'molecularly imprinted', 'MIP', 'DNAzyme', 'peptide', 'protein', 'bioreceptor', 'affinity'],
      '换能原理': ['electrochemical', 'optical', 'colorimetric', 'fluorescent', 'field-effect', 'FET', 'impedance', 'amperometric', 'potentiometric', 'voltammetric', 'transdermal', 'iontophoresis', 'microfluidic', 'SERS', 'Raman', 'wearable'],
      '材料与器件': ['nanomaterial', 'nanoparticle', 'graphene', 'carbon nanotube', 'MXene', 'gold', 'silver', 'conductive polymer', 'PEDOT', 'hydrogel', 'ionic liquid', 'nanostructure', 'low-dimensional', 'semiconductive'],
      '标志物': ['glucose', 'lactate', 'cortisol', 'insulin', 'cholesterol', 'urea', 'sodium', 'potassium', 'calcium', 'pH', 'hormone', 'thyroid', 'cortisol', 'estradiol', 'testosterone', 'cortisol', 'biomarker', 'metabolite'],
      '应用场景': ['diabetes', 'metabolic', 'endocrinology', 'fertility', 'obesity', 'stress', 'athletic', 'renal', 'point-of-care', 'telemedicine', 'continuous monitoring', 'real-time'],
      '性能与挑战': ['sensitivity', 'selectivity', 'limit of detection', 'stability', 'calibration', 'sweat rate', 'pH dependence', 'biofouling', 'interference', 'reproducibility', 'validation', 'standardization', 'regulatory', 'privacy', 'power consumption', 'wireless']
    };
    var concepts = [];
    Object.keys(CONCEPT_POOL).forEach(function (cat) {
      var hits = [];
      CONCEPT_POOL[cat].forEach(function (w) {
        var re = new RegExp('\\\\b' + w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\\\b', 'gi');
        var c = (fullText.match(re) || []).length;
        if (c >= 1) hits.push({ t: w, n: c });
      });
      hits.sort(function (a, b) { return b.n - a.n; });
      if (hits.length) concepts.push({ cat: cat, items: hits.slice(0, 6) });
    });
    /* 年份（用于时间线） */
    var years = {};
    var reY = /\\b(19[89]\\d|20[0-2]\\d)\\b/g, my;
    while ((my = reY.exec(fullText))) { years[my[1]] = (years[my[1]] || 0) + 1; }
    var timeline = Object.keys(years).map(function (y) { return { y: +y, n: years[y] }; })
      .filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return a.y - b.y; });

    /* 质量评分：用于界面提示"抽取可信度" */""",
    'paper type + concepts + timeline')

# ---------- 4) 返回值补字段 ----------
rep("""      formulation: formulation, references: references, numbers: numbers,
      confidence: score, warnings: []""",
    """      formulation: formulation, references: references, numbers: numbers,
      paperType: paperType, concepts: concepts, timeline: timeline,
      confidence: score, warnings: []""",
    'return fields')

# ---------- 5) 参考文献：英文文献常无 [J] 标记，按月-卷-页模式识别 ----------
rep("""    return pool.filter(function (l) { return l.length > 24 && /\\[[A-Z]\\]|\\[EB/.test(l); }).map(parseRef).slice(0, 80);""",
    """    var hits = pool.filter(function (l) { return l.length > 24 && /\\[[A-Z]\\]|\\[EB/.test(l); });
    if (hits.length < 3) {
      /* 英文期刊常见写法：Authors. Title. Journal, 2020, 12(3): 45-58. */
      hits = lines.filter(function (l) {
        return l.length > 40 && l.length < 400 &&
          /\\b(19|20)\\d{2}\\b/.test(l) && /[,;]\\s*(19|20)\\d{2}/.test(l) &&
          /[A-Z][a-z]+,?\\s+[A-Z]/.test(l) &&
          !/^(figure|fig\\.|table|scheme|box|abstract|introduction|we |the |in |this )/i.test(l);
      });
    }
    return hits.map(parseRef).slice(0, 80);""",
    'english references')

open(E, 'w', encoding='utf-8').write(s)
print('applied', n, 'patches')
