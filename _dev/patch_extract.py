import re

EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

# ---- 1) 行预处理：剔除目录/域代码行 ----
old = """    var lines = raw.split(/\\n/).map(function (l) { return l.replace(/\\u00a0/g, ' ').trim(); }).filter(Boolean);"""
new = """    var lines = raw.split(/\\n/).map(function (l) { return l.replace(/\\u00a0/g, ' ').trim(); })
      .filter(function (l) { return l && !/PAGEREF|TOC \\\\o|\\\\h \\\\z|MERGEFORMAT|REF _Ref/.test(l); });"""
assert old in s, 'lines anchor'
s = s.replace(old, new)

# ---- 2) 重写变量抽取：只接受带单位的数值 + 必须来自同一句 ----
start = s.index('  function extractVariables(secs, fullText) {')
end = s.index('  /* ---------------- 指标 ---------------- */')
newfn = '''  /* 变量抽取：只接受"名词 + 带单位数值列表"，且必须出现在同一句内。
     这样能天然排除页码、目录、化学计量比等非变量数字。 */
  function extractVariables(secs, fullText) {
    var UNIT_RE = '(?:%|％|℃|°C|MPa|kPa|GPa|h|min|s|g\\\\/cm3|g\\\\/cm³|mm|目|mol\\\\/L|mol·L-1|mL|L|r\\\\/min|rpm|wt%|ph|pH)';
    var NOUN_RE = new RegExp('([\\\\u4e00-\\\\u9fa5]{2,10}(?:掺量|添加量|加入量|用量|浓度|含量|比例|质量比|固液比|目数|温度|时间|压力|转速|密度|厚度|取代度|pH值|pH|负载量|接枝率))', 'g');
    var out = [];
    var sentences = fullText.replace(/\\\\n/g, '。').split(/[。；;\\\\n]/).map(clean).filter(function (x) { return x.length > 6; });
    sentences.forEach(function (sent) {
      var m;
      NOUN_RE.lastIndex = 0;
      var marks = [];
      while ((m = NOUN_RE.exec(sent))) marks.push({ noun: m[1], at: m.index + m[1].length });
      marks.forEach(function (mk) {
        var win = sent.slice(mk.at, mk.at + 90);
        var re = new RegExp('(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(' + UNIT_RE + ')', 'gi');
        var nums = [], unit = '', mm;
        while ((mm = re.exec(win))) {
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
          out.push({ key: key, noun: mk.noun, unit: unit, levels: nums, evidence: clean(sent).slice(0, 220), sec: '正文' });
        }
      });
    });
    /* 区间与上限补充：如"掺量在35%~45%时…超过50%后" → 35/45/50 */
    sentences.forEach(function (sent) {
      NOUN_RE.lastIndex = 0;
      var m;
      while ((m = NOUN_RE.exec(sent))) {
        var noun = m[1], tail = sent.slice(m.index + noun.length);
        var more = [];
        var rm = tail.match(new RegExp('(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*[~～\\\\-–—]\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(' + UNIT_RE + ')'));
        if (rm) { more.push(parseFloat(rm[1]), parseFloat(rm[2])); }
        var om = tail.match(new RegExp('(?:超过|大于|高于)\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(' + UNIT_RE + ')'));
        if (om) more.push(parseFloat(om[1]));
        if (!more.length) continue;
        var unit2 = (rm ? rm[3] : (om ? om[2] : ''));
        unit2 = UNIT_MAP[unit2] !== undefined ? UNIT_MAP[unit2] : unit2;
        var key2 = clean(noun + (unit2 ? ' / ' + unit2 : ''));
        var hit2 = out.filter(function (o) { return o.key === key2; })[0];
        if (hit2) { more.forEach(function (v) { if (hit2.levels.indexOf(v) < 0) hit2.levels.push(v); }); hit2.levels.sort(function (a, b) { return a - b; }); }
      }
    });
    /* 过滤：计量比句、年份、明显无关 */
    return out.filter(function (o) {
      if (/温度/.test(o.noun) && o.levels.some(function (v) { return v > 300; })) return false;
      if (/时间/.test(o.noun) && o.levels.some(function (v) { return v > 200; })) return false;
      if (o.levels.length < 2) return false;
      if (o.levels.length > 6) return false;
      return true;
    }).slice(0, 10);
  }

'''
s = s[:start] + newfn + s[end:]

# ---- 3) 指标去重：短名被长名包含时丢弃短的 ----
old3 = """    return out;
  }

  /* ---------------- 工艺步骤 ---------------- */"""
new3 = """    /* 去重：若某指标名是另一个指标名的子串，丢掉短的（如"厚度膨胀率" vs "吸水厚度膨胀率"） */
    var kept = out.filter(function (o) {
      return !out.some(function (q) { return q !== o && !q.isChar === !o.isChar && q.name.length > o.name.length && q.name.indexOf(o.name) >= 0; });
    });
    return kept;
  }

  /* ---------------- 工艺步骤 ---------------- */"""
assert old3 in s, 'indicator dedupe anchor'
s = s.replace(old3, new3)

open(EX, 'w', encoding='utf-8').write(s)
print('extract.js patched')

# ================= paper.js =================
PP = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\paper.js'
p = open(PP, encoding='utf-8').read()

old4 = """  function build(an) {
    var text = (an.rawText || '');"""
new4 = """  function build(an, rawText) {
    var text = (rawText || an.rawText || '');"""
assert old4 in p, 'build signature anchor'
p = p.replace(old4, new4)

# 最优值必须落在某个变量的水平集合内，否则视为误抽
old5 = """    var matrix = [];
    perf.forEach(function (ind) {"""
new5 = """    /* 校正：原文最优值必须落在某个变量的水平集合内，否则判为误抽（例如抽到的是提升幅度而非水平） */
    var allLevels = [];
    (an.variables || []).forEach(function (v) { allLevels = allLevels.concat(v.levels); });
    perf.forEach(function (ind) {
      if (ind.optimum != null && allLevels.indexOf(ind.optimum) < 0) {
        ind.optimumRejected = ind.optimum;
        ind.optimum = null;
      }
    });
    var matrix = [];
    perf.forEach(function (ind) {"""
assert old5 in p, 'optimum correction anchor'
p = p.replace(old5, new5)

open(PP, 'w', encoding='utf-8').write(p)
print('paper.js patched')

# ================= views2-core.js: 传入 rawText =================
VC = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\views2-core.js'
v = open(VC, encoding='utf-8').read()
old6 = "  MR.state.profile = MR.paper.build(MR.state.analysis);"
new6 = "  MR.state.profile = MR.paper.build(MR.state.analysis, p.text || '');"
assert old6 in v, 'rebuild anchor'
v = v.replace(old6, new6)
open(VC, 'w', encoding='utf-8').write(v)
print('views2-core.js patched')
