EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

# 1) 词典提升为"材料学科通用词典 + 用户所选方向增强"
old = """  var IND_SUFFIX = ['静曲强度', '弹性模量', '弯曲强度', '拉伸强度', '抗压强度', '抗折强度', '冲击强度', '剪切强度', '剥离强度', '压缩强度',
    '硬度', '断裂伸长率', '含水率', '吸水厚度膨胀率', '吸水率', '厚度膨胀率', '收缩率', '孔隙率', '密度', '表观密度', '堆积密度',
    '热导率', '导热系数', '比热容', '耐水性', '抗冻性', '干缩率', '透气性', '透湿率', '回潮率', '白度', '色差', '光泽度',
    '抑菌率', '抗菌率', '杀菌率', '生物膜抑制率', '细胞存活率', '抑菌圈', '接触角', '表面自由能', 'Zeta电位', '粒径', '比表面积',
    '接枝率', '增重率', '取代度', '聚合度', '结晶度', '羧基含量', '羟值', '酸值', '含量', '产率', '转化率', '降解率', '释放率',
    '电导率', '阻抗', '电容', '循环稳定性', '容量保持率', '比容量', '库仑效率', '载流子迁移率', '带隙', '光催化效率'];"""
new = """  /* 指标词表：优先取材料学科通用词表（覆盖力学/热学/电学/光学/磁学/化学/加工/结构/生物/吸附…） */
  function indLexicon() {
    var base = (MR.domain && MR.domain.ALL_IND) ? MR.domain.ALL_IND.slice() : [];
    var extra = (MR.domain && MR.state && MR.state.domain && MR.domain.hintWords) ? MR.domain.hintWords(MR.state.domain) : [];
    var fb = ['含水率', '含量', '产率', '转化率', '收率', '纯度', '白度', '色差', '光泽度', '密度', '孔隙率', '粒径', '比表面积'];
    var all = base.concat(extra, fb);
    return all.filter(function (w, i) { return w && all.indexOf(w) === i; }).sort(function (a, b) { return b.length - a.length; });
  }"""
assert old in s, 'IND_SUFFIX anchor'
s = s.replace(old, new)

# 2) extractIndicators 全面改用通用词表 + 出现频次过滤 + 归类
start = s.index('  function extractIndicators(secs, fullText) {')
end = s.index('  /* ---------------- 工艺步骤 ---------------- */')
newfn = '''  function extractIndicators(secs, fullText) {
    var LEX = indLexicon();
    var out = [];
    var lines = fullText.split('\\n');
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
      var re = new RegExp(ind.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g');
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
    var sents = fullText.split(/[。；\\n]/).map(clean).filter(function (x) { return x.length > 8; });
    out.forEach(function (o) {
      var near = sents.filter(function (x) { return x.indexOf(o.name) >= 0 || (o.isChar && x.indexOf(o.method || '') >= 0); });
      near.forEach(function (x) {
        DIR_PATTERNS.forEach(function (p) { if (!o.direction && p.re.test(x)) o.direction = p.d; });
        var mm = x.match(new RegExp(o.name + '[^。；]{0,40}?(?:为|达|超过|达到)\\\\s*(?:最大|最高)[^。；]{0,20}?([\\\\d.]+)\\\\s*(%|％|℃|°C|MPa|h|min|g\\\\/cm3|mm)?'));
        if (!mm) mm = x.match(new RegExp('([\\\\d.]+)\\\\s*(%|％|℃|°C|MPa|h|min|g\\\\/cm3|mm)?[^。；]{0,24}?' + o.name + '[^。；]{0,24}?(?:最大|最高)'));
        if (mm && o.optimum == null) { o.optimum = parseFloat(mm[1]); o.optimumFrom = clean(x).slice(0, 180); }
        var im = x.match(new RegExp(o.name + '[^。；]{0,50}?(?:提高|提升|增加|增大|降低|减少)[了]?\\\\s*([\\\\d.]+)\\\\s*%'));
        if (!im) im = x.match(new RegExp('(?:提高|提升|增加|增大|降低|减少)[了]?[^。；]{0,24}?' + o.name + '[^。；]{0,20}?([\\\\d.]+)\\\\s*%'));
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

'''
s = s[:start] + newfn + s[end:]

# 3) 仪器词典通用化
old3 = """      var isInst = INSTR_TAIL.some(function (t) { return l.indexOf(t) >= 0; });"""
new3 = """      var LEXI = (MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL;
      var isInst = LEXI.some(function (t) { return l.indexOf(t) >= 0; });"""
assert old3 in s, 'instrument anchor'
s = s.replace(old3, new3)

# 4) 试剂词典通用化
old4 = """      var hitTail = REAGENT_TAIL.some(function (t) { return l.indexOf(t) >= 0; });"""
new4 = """      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : []);
      var hitTail = LEXR.some(function (t) { return l.indexOf(t) >= 0; });"""
assert old4 in s, 'reagent anchor'
s = s.replace(old4, new4)

# 5) 标准前缀通用化
old5 = """    var re = /\\b(GB\\/T|GB|JC\\/T|ASTM|ISO|AATCC|JIS|EN|DIN|HG\\/T|LY\\/T)\\s?[\\d]+(?:[.\\-–]\\d+)*(?:\\s?[-–]\\s?\\d{4})?/g;"""
new5 = """    var pre = (MR.domain && MR.domain.STANDARD_LEX ? MR.domain.STANDARD_LEX : ['GB/T', 'ISO', 'ASTM']).map(function (x) { return x.replace(/[\\/]/g, '\\\\/'); });
    pre = pre.filter(function (x) { return !/\\s/.test(x); });
    var re = new RegExp('\\\\b(' + pre.join('|') + ')\\\\s?[\\\\d]+(?:[.\\\\-–]\\\\d+)*(?:\\\\s?[-–]\\\\s?\\\\d{4})?', 'g');"""
assert old5 in s, 'standard anchor'
s = s.replace(old5, new5)

# 6) 导出 classify 供外部使用
s = s.replace("return { analyze: analyze, parseRef: parseRef, IND_SUFFIX: IND_SUFFIX, CHAR_METHOD: CHAR_METHOD, STEP_VERBS: STEP_VERBS };",
  "return { analyze: analyze, parseRef: parseRef, indLexicon: indLexicon, CHAR_METHOD: CHAR_METHOD, STEP_VERBS: STEP_VERBS };")
open(EX, 'w', encoding='utf-8').write(s)
print('extract.js generalized')

# 7) paper.js：把性能族带入画像
PP = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\paper.js'
p = open(PP, encoding='utf-8').read()
old7 = """      o.polarity = MIN_POLARITY.test(o.name) ? 'min' : 'max';"""
new7 = """      o.polarity = MIN_POLARITY.test(o.name) ? 'min' : 'max';
      if (!o.family && MR.domain) { var fam = MR.domain.classify(o.name); o.family = fam.k; o.familyColor = fam.color; }"""
assert old7 in p, 'family anchor'
p = p.replace(old7, new7)
open(PP, 'w', encoding='utf-8').write(p)
print('paper.js family attached')
