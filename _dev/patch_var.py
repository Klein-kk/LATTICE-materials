EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

# 1) 变量名词典：去掉"厚度/目数"（多为试件规格而非研究对象），并加严名词捕获
old = """    var NOUN_RE = new RegExp('([\\\\u4e00-\\\\u9fa5]{2,10}(?:掺量|添加量|加入量|用量|浓度|含量|比例|质量比|固液比|目数|温度|时间|压力|转速|密度|厚度|取代度|pH值|pH|负载量|接枝率))', 'g');"""
new = """    var SUFFIX = '(?:掺量|添加量|加入量|用量|浓度|含量|比例|质量比|固液比|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率)';
    var NOUN_RE = new RegExp('([\\\\u4e00-\\\\u9fa5]{0,8}' + SUFFIX + ')', 'g');
    var NOUN_TAIL = new RegExp(SUFFIX + '$');
    function tidyNoun(n) {
      var t = n.replace(/^(其中|随着|当|在|由|将|对|与|和|及|把|以|用|加|加入|称量|测试|试件|设计|前|后|的)+/, '');
      var m2 = t.match(new RegExp('([\\\\u4e00-\\\\u9fa5]{2,6}' + SUFFIX + ')$'));
      return m2 ? m2[1] : t;
    }
    /* 是否为"提升幅度"式数字（应排除，它不是变量水平） */
    function isDelta(win, at, len) {
      var before = win.slice(Math.max(0, at - 12), at);
      var after = win.slice(at + len, at + len + 8);
      if (/提高|提升|增加|增大|降低|减少|上升|下降|高约|低了|高了|分别/.test(before)) return true;
      if (/^\\\\s*(?:左右|以上|以下)\\\\s*[)）]?/.test(after) && /分别/.test(before)) return true;
      return false;
    }
    function isTolerance(win, at) {
      return /±/.test(win.slice(Math.max(0, at - 4), at + 4));
    }"""
assert old in s, 'NOUN_RE anchor'
s = s.replace(old, new)

# 2) 名词清洗 + 排除提升幅度/公差
old2 = """      marks.forEach(function (mk) {
        var win = sent.slice(mk.at, mk.at + 90);
        var re = new RegExp('(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(' + UNIT_RE + ')', 'gi');
        var nums = [], unit = '', mm;
        while ((mm = re.exec(win))) {
          var u = UNIT_MAP[mm[2]] !== undefined ? UNIT_MAP[mm[2]] : mm[2];
          if (nums.length === 0) unit = u;
          else if (u !== unit) continue;
          var v = parseFloat(mm[1]);
          if (isFinite(v) && nums.indexOf(v) < 0) nums.push(v);
        }"""
new2 = """      marks.forEach(function (mk) {
        mk.noun = tidyNoun(mk.noun);
        if (!NOUN_TAIL.test(mk.noun)) return;
        if (!mk.noun) return;
        var win = sent.slice(mk.at, mk.at + 90);
        var re = new RegExp('(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(' + UNIT_RE + ')', 'gi');
        var nums = [], unit = '', mm;
        while ((mm = re.exec(win))) {
          if (isDelta(win, mm.index, mm[0].length)) continue;
          if (isTolerance(win, mm.index)) continue;
          var u = UNIT_MAP[mm[2]] !== undefined ? UNIT_MAP[mm[2]] : mm[2];
          if (nums.length === 0) unit = u;
          else if (u !== unit) continue;
          var v = parseFloat(mm[1]);
          if (isFinite(v) && nums.indexOf(v) < 0) nums.push(v);
        }"""
assert old2 in s, 'mark loop anchor'
s = s.replace(old2, new2)

# 3) 区间补充同样做名词清洗
old3 = """        var noun = m[1], tail = sent.slice(m.index + noun.length);"""
new3 = """        var noun = tidyNoun(m[1]), tail = sent.slice(m.index + m[1].length);
        if (!NOUN_TAIL.test(noun)) return;"""
assert old3 in s, 'range noun anchor'
s = s.replace(old3, new3)

# 4) 合并时按清洗后的名词（已隐含在 key 中）；同时排除水平数超过 5 的
old4 = """      if (o.levels.length < 2) return false;
      if (o.levels.length > 6) return false;
      return true;"""
new4 = """      if (o.levels.length < 2) return false;
      if (o.levels.length > 5) return false;
      /* 水平跨度异常（如 8 / 178 / 100）判为尺寸清单而非变量 */
      var mx = Math.max.apply(null, o.levels), mn = Math.min.apply(null, o.levels);
      if (mn > 0 && mx / mn > 12) return false;
      return true;"""
assert old4 in s, 'filter anchor'
s = s.replace(old4, new4)

open(EX, 'w', encoding='utf-8').write(s)
print('extract.js variables refined')
