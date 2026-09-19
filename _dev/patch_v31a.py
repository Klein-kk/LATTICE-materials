import io

# ============================================================
# 1) pdftext.js：加入纯 JS DEFLATE 解压，摆脱 DecompressionStream 依赖
# ============================================================
P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
s = open(P, encoding='utf-8').read()

INFLATE = r'''
  /* ---------- 纯 JS DEFLATE 解压（不依赖 DecompressionStream） ---------- */
  var LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  var DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  var CLCIDX = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  function inflateRawJS(data) {
    var pos = 0, bitbuf = 0, bitcnt = 0;
    var out = new Uint8Array(Math.max(1024, data.length * 6)), olen = 0;
    function grow(n) {
      if (olen + n <= out.length) return;
      var n2 = new Uint8Array(Math.max(out.length * 2, olen + n + 1024));
      n2.set(out.subarray(0, olen));
      out = n2;
    }
    function bits(n) {
      while (bitcnt < n) { bitbuf |= (data[pos++] || 0) << bitcnt; bitcnt += 8; }
      var v = bitbuf & ((1 << n) - 1);
      bitbuf >>>= n; bitcnt -= n;
      return v;
    }
    function buildHuff(lengths) {
      var counts = new Array(16).fill(0), i;
      for (i = 0; i < lengths.length; i++) counts[lengths[i]]++;
      counts[0] = 0;
      var offs = new Array(17).fill(0);
      for (i = 1; i < 16; i++) offs[i + 1] = offs[i] + counts[i];
      var symbols = new Array(lengths.length).fill(0);
      for (i = 0; i < lengths.length; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
      return { counts: counts, symbols: symbols };
    }
    function decodeSym(h) {
      var code = 0, first = 0, index = 0;
      for (var len = 1; len <= 15; len++) {
        code |= bits(1);
        var count = h.counts[len];
        if (code - first < count) return h.symbols[index + (code - first)];
        index += count; first = (first + count) << 1; code <<= 1;
      }
      throw new Error('无效的 Huffman 码');
    }
    function fixedTables() {
      var ll = new Array(288);
      for (var i = 0; i < 144; i++) ll[i] = 8;
      for (var j = 144; j < 256; j++) ll[j] = 9;
      for (var k = 256; k < 280; k++) ll[k] = 7;
      for (var m = 280; m < 288; m++) ll[m] = 8;
      return { lit: buildHuff(ll), dist: buildHuff(new Array(30).fill(5)) };
    }
    function dynTables() {
      var hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      var cl = new Array(19).fill(0);
      for (var i = 0; i < hclen; i++) cl[CLCIDX[i]] = bits(3);
      var clH = buildHuff(cl);
      var lengths = [];
      while (lengths.length < hlit + hdist) {
        var sym = decodeSym(clH);
        if (sym < 16) lengths.push(sym);
        else if (sym === 16) { var prev = lengths[lengths.length - 1], rep = 3 + bits(2); while (rep--) lengths.push(prev); }
        else if (sym === 17) { var r2 = 3 + bits(3); while (r2--) lengths.push(0); }
        else { var r3 = 11 + bits(7); while (r3--) lengths.push(0); }
      }
      return { lit: buildHuff(lengths.slice(0, hlit)), dist: buildHuff(lengths.slice(hlit)) };
    }
    var last = 0;
    do {
      last = bits(1);
      var type = bits(2);
      if (type === 0) {
        if (bitcnt > 0) { pos += 0; bitbuf = 0; bitcnt = 0; }
        var len = data[pos] | (data[pos + 1] << 8); pos += 4;
        grow(len); out.set(data.subarray(pos, pos + len), olen); olen += len; pos += len;
      } else {
        var T = type === 1 ? fixedTables() : dynTables();
        for (;;) {
          var s2 = decodeSym(T.lit);
          if (s2 < 256) { grow(1); out[olen++] = s2; }
          else if (s2 === 256) break;
          else {
            var li = s2 - 257;
            if (li >= LBASE.length) throw new Error('长度码越界');
            var len2 = LBASE[li] + bits(LEXT[li]);
            var di = decodeSym(T.dist);
            var dist = DBASE[di] + bits(DEXT[di]);
            grow(len2);
            for (var q = 0; q < len2; q++) { out[olen] = out[olen - dist]; olen++; }
          }
        }
      }
    } while (!last);
    return out.subarray(0, olen);
  }
  /* 自动识别 zlib 头（0x78）并剥离 */
  function inflateAuto(u8) {
    if (u8.length > 2 && u8[0] === 0x78 && ((u8[0] << 8 | u8[1]) % 31 === 0)) return inflateRawJS(u8.subarray(2));
    return inflateRawJS(u8);
  }
  /* 优先用浏览器原生，失败或不存在则回退到纯 JS */
  function inflateAny(u8) {
    if (typeof DecompressionStream !== 'undefined') {
      return inflate(u8).catch(function () { return inflateRaw(u8); }).catch(function () { return inflateAuto(u8); });
    }
    return new Promise(function (res, rej) { try { res(inflateAuto(u8)); } catch (e) { rej(e); } });
  }
'''

s = s.replace("  function inflateRaw(u8) {", INFLATE + "\n  function inflateRaw(u8) {")

# 所有解压调用改走 inflateAny
s = s.replace("      return inflate(r.data).then(function (out) { r.text = latin1(out); })\n        .catch(function () {\n          return inflateRaw(r.data).then(function (out) { r.text = latin1(out); }).catch(function () { r.text = latin1(r.data); });\n        });",
              "      return inflateAny(r.data).then(function (out) { r.text = latin1(out); })\n        .catch(function () { r.text = latin1(r.data); });")
s = s.replace("          return inflate(need.data).then(function (o) { need.text = latin1(o); finish(); })\n            .catch(function () { need.text = latin1(need.data); finish(); });",
              "          return inflateAny(need.data).then(function (o) { need.text = latin1(o); finish(); })\n            .catch(function () { need.text = latin1(need.data); finish(); });")

# 兜底：流对象若未标记 FlateDecode 但内容为空，也尝试解压
s = s.replace("        if (rec.flate) todo.push(rec); else rec.text = latin1(rec.data);",
              "        if (rec.flate) todo.push(rec);\n        else { rec.text = latin1(rec.data); if (/[\\x00-\\x08\\x0e-\\x1f]/.test(rec.text.slice(0, 64))) todo.push(rec); }")
open(P, 'w', encoding='utf-8').write(s)
print('pdftext.js: pure-JS inflate added')

# ============================================================
# 2) domain.js：补充材料名词与工序动词表
# ============================================================
D = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\domain.js'
d = open(D, encoding='utf-8').read()

old = "  /* ---------- 标准前缀 ---------- */"
new = """  /* ---------- 材料名词（用于识别"名称（规格），购自厂家"型条目） ---------- */
  var MATERIAL_NOUN = ['合金', '铝合金', '镁合金', '钛合金', '不锈钢', '碳钢', '钢', '铸铁', '铜', '铝', '镁', '钛', '锌', '镍', '钨', '钼',
    '陶瓷', '氧化铝', '氧化锆', '碳化硅', '氮化硅', '玻璃', '石英', '云母', '石墨', '石墨烯', '碳纳米管', '炭黑', '活性炭', '碳纤维', '金刚石',
    '高岭土', '偏高岭土', '蒙脱土', '膨润土', '黏土', '陶土', '硅藻土', '沸石', '分子筛', '凹凸棒土', '滑石', '碳酸钙', '硫酸钙',
    '玄武岩纤维', '玻璃纤维', '芳纶', '聚丙烯纤维', '聚乙烯醇纤维', '木质素', '纤维素', '纳米纤维素', '甲壳素', '壳聚糖', '胶原', '明胶', '海藻酸钠',
    '聚乙烯', '聚丙烯', '聚氯乙烯', '聚苯乙烯', '聚酰胺', '聚酯', '聚氨酯', '聚乳酸', '聚碳酸酯', '环氧树脂', '酚醛树脂', '不饱和聚酯', 'ABS',
    '矿渣', '粉煤灰', '硅灰', '钢渣', '赤泥', '尾矿', '建筑垃圾', '再生骨料', '水泥', '石膏', '石灰',
    '磷酸铁锂', '磷酸钒钠', '钴酸锂', '三元材料', '锰酸锂', '钛酸锂', '硬碳', '软碳', '硅碳', '金属锂', '金属钠',
    '钙钛矿', '硫化镉', '硒化铜铟镓', '氧化锌', '二氧化钛', '二氧化锡', '氧化镍', '氧化铜', '氧化铁', '四氧化三钴', '五氧化二钒', '钒酸盐',
    'MXene', 'MOF', 'ZIF', 'g-C3N4', '黑磷', '二硫化钼', '氮化硼', '碳化钨', '氮化镓', '砷化镓', '硅片', '晶圆'];

  /* ---------- 工序动词（覆盖金属/陶瓷/高分子/建筑/能源等方向） ---------- */
  var PROCESS_VERBS = ['称量', '称取', '配制', '球磨', '研磨', '混料', '干拌', '搅拌', '混合', '分散', '均质', '球化', '筛分', '过筛',
    '熔炼', '铸造', '浇注', '轧制', '锻造', '挤压', '拉拔', '退火', '正火', '淬火', '水淬', '回火', '固溶', '时效', '渗氮', '渗碳', '表面处理', '抛光', '打磨',
    '铺装', '预压', '热压', '冷压', '压制', '模压', '注射成型', '挤出', '流延', '旋涂', '涂布', '喷涂', '浸渍', '浸涂', '提拉',
    '预烧', '煅烧', '烧结', '保温', '升温', '降温', '退火处理', '脱模', '固化', '交联', '熟化', '陈化',
    '沉淀', '共沉淀', '水热', '溶剂热', '溶胶-凝胶', '静电纺丝', '电沉积', '磁控溅射', '蒸镀', '化学气相沉积', '原子层沉积', '等离子体处理',
    '干燥', '烘干', '真空干燥', '冷冻干燥', '洗涤', '清洗', '离心', '过滤', '透析', '破碎',
    '养护', '标准养护', '蒸压养护', '齐边', '锯切', '切割', '裁切', '封装', '装配', '组装', '电池装配'];

  /* ---------- 标准前缀 ---------- */"""
assert old in d
d = d.replace(old, new, 1)
d = d.replace("    STANDARD_LEX: STANDARD_LEX,", "    MATERIAL_NOUN: MATERIAL_NOUN,\n    PROCESS_VERBS: PROCESS_VERBS,\n    STANDARD_LEX: STANDARD_LEX,")
open(D, 'w', encoding='utf-8').write(d)
print('domain.js: material nouns + process verbs added')
