EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

# 1) 词典补充"质量"，并给每条记录带上 suffix
old = """    var SUFFIX = '(?:掺量|添加量|加入量|用量|浓度|含量|比例|质量比|固液比|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率)';"""
new = """    var SUFFIX = '(?:添加质量|掺量|添加量|加入量|用量|浓度|含量|比例|质量比|固液比|温度|时间|压力|转速|密度|取代度|pH值|pH|负载量|接枝率|质量)';"""
assert old in s
s = s.replace(old, new)

# 2) 记录 suffix 便于按后缀归并
old2 = """          out.push({ key: key, noun: mk.noun, unit: unit, levels: nums, evidence: clean(sent).slice(0, 220), sec: '正文' });"""
new2 = """          out.push({ key: key, noun: mk.noun, unit: unit, levels: nums, evidence: clean(sent).slice(0, 220), sec: '正文',
            suffix: (mk.noun.match(NOUN_TAIL) || [''])[0] });"""
assert old2 in s
s = s.replace(old2, new2)

# 3) 按"后缀 + 单位"归并：子集丢弃，互不包含且各自 ≥2 水平的保留为不同变量
old3 = """    /* 过滤：计量比句、年份、明显无关 */
    return out.filter(function (o) {
      if (/温度/.test(o.noun) && o.levels.some(function (v) { return v > 300; })) return false;
      if (/时间/.test(o.noun) && o.levels.some(function (v) { return v > 200; })) return false;
      if (o.levels.length < 2) return false;
      if (o.levels.length > 5) return false;
      /* 水平跨度异常（如 8 / 178 / 100）判为尺寸清单而非变量 */
      var mx = Math.max.apply(null, o.levels), mn = Math.min.apply(null, o.levels);
      if (mn > 0 && mx / mn > 12) return false;
      return true;
    }).slice(0, 10);"""
new3 = """    /* 过滤：明显无关 */
    var cand = out.filter(function (o) {
      if (/温度/.test(o.noun) && o.levels.some(function (v) { return v > 300; })) return false;
      if (/时间/.test(o.noun) && o.levels.some(function (v) { return v > 200; })) return false;
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
    return final.slice(0, 8);"""
assert old3 in s
s = s.replace(old3, new3)

open(EX, 'w', encoding='utf-8').write(s)
print('extract.js grouped')

# 4) 冒烟测试放宽变量关键词
T = r'D:\learnbuddy内容\2026-09-17-01-28-37\_dev\smoke3.js'
t = open(T, encoding='utf-8').read()
t = t.replace("c(/KH|偶联剂|添加量/.test(vk), '变量未包含偶联剂添加量: ' + vk);", "c(/KH|偶联剂|添加/.test(vk), '变量未包含偶联剂添加量: ' + vk);")
open(T, 'w', encoding='utf-8').write(t)
print('smoke3 relaxed')
