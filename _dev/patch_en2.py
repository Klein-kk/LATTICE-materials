E = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(E, encoding='utf-8').read()
n = 0
def rep(old, new, tag):
    global s, n
    if old in s:
        s = s.replace(old, new, 1); n += 1; print('ok  ', tag)
    else:
        print('MISS', tag)

# ---------- 1) 指标词表合并英文 ----------
rep("""    var base = (MR.domain && MR.domain.ALL_IND) ? MR.domain.ALL_IND.slice() : [];""",
    """    var base = (MR.domain && MR.domain.ALL_IND) ? MR.domain.ALL_IND.slice() : [];
    var baseEn = (MR.domain && MR.domain.ALL_IND_EN) ? MR.domain.ALL_IND_EN.slice() : [];""", 'en base')
rep("""    var all = base.concat(extra, fb);""",
    """    var all = base.concat(baseEn, extra, fb);""", 'merge en indicators')

# ---------- 2) 章节标题：补英文无编号标题 ----------
rep("""    var HEAD = /^\\s*((\\d+(\\.\\d+)*)\\s*[、. ]?\\s*)?(摘\\s*要|Abstract|关键词|引\\s*言|绪\\s*论|材料与方法|试验原料|试验方法|实验方法|材料与方法|结果与分析|试验结果分析|结果与讨论|讨论|结\\s*论|参考文献|致\\s*谢|References)\\s*$/i;""",
    """    var HEAD = /^\\s*((\\d+(\\.\\d+)*)\\s*[、. ]?\\s*)?(摘\\s*要|Abstract|Summary|关键词|Key\\s*words|引\\s*言|绪\\s*论|材料与方法|试验原料|试验方法|实验方法|结果与分析|试验结果分析|结果与讨论|讨论|结\\s*论|参考文献|致\\s*谢|References|Acknowledg|Introduction|Background|Materials?\\s+and\\s+Methods|Methods?|Experimental(?:\\s+Section)?|Results?|Results?\\s+and\\s+Discussion|Discussion|Conclusions?|Perspectives?|Future\\s+(?:directions|perspectives)|Box\\s+\\d+|Supplementary)\\s*[.:]?\\s*$/i;""",
    'english headings')

# ---------- 3) 英文仪器 ----------
rep("""      var LEXI = (MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL;
      var hitLex = LEXI.some(function (t) { return l.indexOf(t) >= 0; });""",
    """      var LEXI = ((MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL)
        .concat((MR.domain && MR.domain.INSTRUMENT_LEX_EN) ? MR.domain.INSTRUMENT_LEX_EN : []);
      var low0 = l.toLowerCase();
      var hitLex = LEXI.some(function (t) { return t.length > 3 ? low0.indexOf(t.toLowerCase()) >= 0 : l.indexOf(t) >= 0; });""",
    'english instruments')

# ---------- 4) 英文试剂 / 材料 ----------
rep("""      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : [],
        (MR.domain && MR.domain.MATERIAL_NOUN) ? MR.domain.MATERIAL_NOUN : []);
      var hitTail = LEXR.some(function (t) { return l.indexOf(t) >= 0; });""",
    """      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : [],
        (MR.domain && MR.domain.MATERIAL_NOUN) ? MR.domain.MATERIAL_NOUN : [],
        (MR.domain && MR.domain.REAGENT_LEX_EN) ? MR.domain.REAGENT_LEX_EN : [],
        (MR.domain && MR.domain.MATERIAL_NOUN_EN) ? MR.domain.MATERIAL_NOUN_EN : []);
      var low1 = l.toLowerCase();
      var hitTail = LEXR.some(function (t) { return t.length > 3 ? low1.indexOf(t.toLowerCase()) >= 0 : l.indexOf(t) >= 0; });""",
    'english reagents')

# isBuy 也要认英文的采购/来源写法
rep("""      var isBuy = /(购自|采购|来源于|有限公司|公司|集团|试剂|分析纯|\\bAR\\b|纯度|含量\\s*[≥>≧])/.test(l);""",
    """      var isBuy = /(购自|采购|来源于|有限公司|公司|集团|试剂|分析纯|\\bAR\\b|纯度|含量\\s*[≥>≧])/.test(l) ||
        /(purchased from|obtained from|supplied by|Sigma-?Aldrich|Merck|Thermo\\s?Fisher|Aladdin|Macklin|TCI|Acros|Alfa\\s?Aesar|Fisher Scientific|Millipore|Invitrogen|Becton|Corning|analytical grade|reagent grade|\\b99(?:\\.\\d+)?%|\\b98(?:\\.\\d+)?%)/i.test(l);""",
    'english purchase patterns')

# ---------- 5) 工艺动词：英文 ----------
rep("""    var VERBS = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : []);""",
    """    var VERBS = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : [],
      (MR.domain && MR.domain.PROCESS_VERBS_EN) ? MR.domain.PROCESS_VERBS_EN : []);""", 'english process verbs (para)')
rep("""      var V2 = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : []);""",
    """      var V2 = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : [],
        (MR.domain && MR.domain.PROCESS_VERBS_EN) ? MR.domain.PROCESS_VERBS_EN : []);""", 'english process verbs (flow)')

# ---------- 6) 标准：补英文体系 ----------
rep("""    var pre = (MR.domain && MR.domain.STANDARD_LEX ? MR.domain.STANDARD_LEX : ['GB/T', 'ISO', 'ASTM']).map(function (x) { return x.replace(/[\\/]/g, '\\\\/'); });""",
    """    var pre = ((MR.domain && MR.domain.STANDARD_LEX) ? MR.domain.STANDARD_LEX : ['GB/T', 'ISO', 'ASTM'])
      .concat((MR.domain && MR.domain.STANDARD_LEX_EN) ? MR.domain.STANDARD_LEX_EN : [])
      .map(function (x) { return x.replace(/[\\/]/g, '\\\\/'); });""", 'english standards')

# ---------- 7) 变量：认英文数值列表写法 ----------
rep("""    var UNIT_RE = '(?:%|％|℃|°C|MPa|kPa|GPa|h|min|s|g\\\\/cm3|g\\\\/cm³|mm|目|mol\\\\/L|mol·L-1|mL|L|r\\\\/min|rpm|wt%|ph|pH)';""",
    """    var UNIT_RE = '(?:%|％|℃|°C|MPa|kPa|GPa|h|min|s|ms|µs|us|Hz|kHz|nM|µM|uM|mM|M|mg\\\\/mL|mg\\\\/dL|mmol\\\\/L|mol\\\\/L|mol·L-1|nA|µA|uA|mA|mV|V|Ω|kΩ|nm|µm|um|μm|mm|cm|mL|µL|uL|L|g\\\\/cm3|g\\\\/cm³|mg|µg|ug|ng|pg|wt%|vol%|ppm|ppb|目|r\\\\/min|rpm|ph|pH)';""",
    'english units')
rep("""    var SUFFIX = '(?:添加质量|质量比|固液比|掺量|添加量|加入量|用量|浓度|含量|比例|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率|包覆量|含量|质量|量)';""",
    """    var SUFFIX = '(?:添加质量|质量比|固液比|掺量|添加量|加入量|用量|浓度|含量|比例|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率|包覆量|质量|量|concentration|concentrations|content|ratio|temperature|time|pressure|speed|density|loading|amount|level|levels|mol%)';""",
    'english variable nouns')
rep("""    var NOUN_RE = new RegExp('([\\\\u4e00-\\\\u9fa5]{0,8}' + SUFFIX + ')', 'g');""",
    """    var NOUN_RE = new RegExp('([\\\\u4e00-\\\\u9fa5A-Za-z0-9\\\\-\\\\s]{0,22}?' + SUFFIX + ')\\\\b', 'gi');""",
    'english noun capture')
rep("""      var t = n.replace(/^(其中|随着|当|在|由|将|对|与|和|及|把|以|用|加|加入|称量|测试|试件|设计|分别|再|先|后|均|各|的|中)+/, '');
      var m2 = t.match(new RegExp('([\\\\u4e00-\\\\u9fa5]{2,6}' + SUFFIX + ')$'));""",
    """      var t = n.replace(/^(其中|随着|当|在|由|将|对|与|和|及|把|以|用|加|加入|称量|测试|试件|设计|分别|再|先|后|均|各|的|中|at|of|the|a|an|with|for)+/i, '').trim();
      var m2 = t.match(new RegExp('((?:[\\\\u4e00-\\\\u9fa5]{2,6}|[A-Za-z][A-Za-z\\\\- ]{1,18}?)' + SUFFIX + ')$', 'i'));""",
    'english noun tidy')

open(E, 'w', encoding='utf-8').write(s)
print('applied', n, 'patches')
