EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

# ---------- 1) 原料抽取：加入"名称（规格），购自厂家"通用启发式 + 材料名词 ----------
old = """      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : []);
      var hitTail = LEXR.some(function (t) { return l.indexOf(t) >= 0; });
      var hitChem = CHEM_RE.test(l); CHEM_RE.lastIndex = 0;
      if (!(hitTail || hitChem) || !isBuy) return;"""
new = """      var LEXR = REAGENT_TAIL.concat((MR.domain && MR.domain.REAGENT_LEX) ? MR.domain.REAGENT_LEX : [],
        (MR.domain && MR.domain.MATERIAL_NOUN) ? MR.domain.MATERIAL_NOUN : []);
      var hitTail = LEXR.some(function (t) { return l.indexOf(t) >= 0; });
      var hitChem = CHEM_RE.test(l); CHEM_RE.lastIndex = 0;
      /* 通用启发式：材料类论文的标准写法「名称（规格），购自/采购于厂家」 */
      var canonical = /^[\\u4e00-\\u9fa5A-Za-z0-9\\s\\-·\\.]{2,40}[（(][^）)]{1,40}[）)][\\s]*[，,；;][\\s]*(?:购自|采购于|来源于|由.*?提供)/.test(l);
      if (!(hitTail || hitChem || canonical) || !isBuy) return;"""
assert old in s, 'material anchor'
s = s.replace(old, new)

# ---------- 2) 仪器抽取：加入"仪器后缀 + 型号"通用启发式 ----------
old2 = """      var LEXI = (MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL;
      var isInst = LEXI.some(function (t) { return l.indexOf(t) >= 0; });
      if (!isInst || l.length > 90) return;"""
new2 = """      var LEXI = (MR.domain && MR.domain.INSTRUMENT_LEX) ? MR.domain.INSTRUMENT_LEX : INSTR_TAIL;
      var hitLex = LEXI.some(function (t) { return l.indexOf(t) >= 0; });
      /* 通用启发式：以仪器类后缀收尾 + 行内出现明显型号 */
      var SUF = /(?:机|仪|仪|器|镜|锅|炉|箱|台|设备|系统|装置|分析仪|测试仪|试验机|工作站|反应釜|槽|缸|泵)$/;
      var modelLike = /[A-Z]{1,8}[-–]?[A-Z0-9]{0,8}\\d{2,}[A-Z0-9\\-]*/;
      var nameOnly = l.split(/[\\t,，;；（(]/)[0].trim();
      var hitHeur = SUF.test(nameOnly) && nameOnly.length >= 3 && nameOnly.length <= 26;
      var isInst = hitLex || hitHeur;
      if (!isInst || l.length > 100) return;
      if (!hitLex && !modelLike.test(l) && !/公司|大学|研究所|厂/.test(l)) return;"""
assert old2 in s, 'instrument anchor'
s = s.replace(old2, new2)

# 仪器"名称"取值：优先用整行前缀
old3 = """      var full = (l.split(/[\\t,，;；]/)[0] || '').trim();
      if (full.length >= 3 && full.length <= 24) name = full;"""
new3 = """      var full = (l.split(/[\\t,，;；（(]/)[0] || '').trim();
      if (full.length >= 3 && full.length <= 26) name = full;
      /* 去掉可能混入的序号/单位前缀 */
      name = name.replace(/^[（(\\d）+\\s]+/, '').replace(/^(?:表|图)\\s*\\d+/, '').trim();"""
assert old3 in s, 'instrument name anchor'
s = s.replace(old3, new3)

# ---------- 3) 工序抽取：用 domain.PROCESS_VERBS + 放宽长度阈值 ----------
old4 = """    var para = lines.filter(function (l) { return l.length > 60 && /(称量|搅拌|铺装|热压|冷压|养护|浸泡|清洗|烘干|锯切)/.test(l); });"""
new4 = """    var VERBS = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : []);
    var para = lines.filter(function (l) { return l.length > 30 && VERBS.some(function (v) { return l.indexOf(v) >= 0; }); });"""
assert old4 in s, 'step para anchor'
s = s.replace(old4, new4)

old5 = """      var v = STEP_VERBS.find(function (x) { return s.indexOf(x) >= 0; });
      if (!v) return;"""
new5 = """      /* 取句中"最靠后的动词"作为该步的主操作（更贴近真实工艺顺序） */
      var hits = VERBS.filter(function (x) { return s.indexOf(x) >= 0; });
      if (!hits.length) return;
      var v = hits.sort(function (a, b) { return s.indexOf(b) - s.indexOf(a); })[0];"""
assert old5 in s, 'step verb anchor'
s = s.replace(old5, new5)

# 句子池上限放宽
s = s.replace("    sentencePool.slice(0, 14).forEach(function (s) {", "    sentencePool.slice(0, 26).forEach(function (s) {")

# ---------- 4) 流程箭头行也使用扩展动词表 ----------
old6 = """      var hits = STEP_VERBS.filter(function (v) { return l.indexOf(v) >= 0; });
      if (hits.length >= 3 && (!best || hits.length > best.hits.length)) best = { line: l, hits: hits };"""
new6 = """      var V2 = STEP_VERBS.concat((MR.domain && MR.domain.PROCESS_VERBS) ? MR.domain.PROCESS_VERBS : []);
      var hits = V2.filter(function (v) { return l.indexOf(v) >= 0; });
      if (hits.length >= 3 && (!best || hits.length > best.hits.length)) best = { line: l, hits: hits };"""
assert old6 in s, 'flow line anchor'
s = s.replace(old6, new6)

# ---------- 5) 工序排序表扩展 ----------
old7 = """    var ORDER = ['称量', '配制', '混合', '搅拌', '球磨', '筛分', '陈化', '浸泡', '碱处理', '预压', '铺装',
      '热压', '冷压', '压制', '脱模', '涂覆', '喷淋', '浸渍', '接枝', '固化', '成型', '干燥', '烘干',
      '养护', '齐边', '锯切', '水浴', '加热', '冷却', '洗涤', '清洗'];"""
new7 = """    var ORDER = ['称量', '称取', '配制', '混料', '混合', '分散', '搅拌', '球磨', '研磨', '筛分', '过筛', '陈化',
      '熔炼', '铸造', '浇注', '轧制', '锻造', '挤压', '拉拔',
      '沉淀', '共沉淀', '水热', '溶剂热', '溶胶-凝胶', '静电纺丝', '电沉积', '磁控溅射', '蒸镀', '化学气相沉积', '原子层沉积', '等离子体处理',
      '浸泡', '碱处理', '表面处理', '浸渍', '浸涂', '涂布', '旋涂', '喷涂', '提拉',
      '铺装', '预压', '铺层', '热压', '冷压', '压制', '模压', '注射成型', '挤出', '流延',
      '预烧', '煅烧', '烧结', '固溶', '淬火', '水淬', '回火', '退火', '正火', '时效', '渗氮', '渗碳',
      '升温', '保温', '降温', '固化', '交联', '熟化', '脱模', '成型',
      '养护', '标准养护', '蒸压养护', '干燥', '烘干', '真空干燥', '冷冻干燥',
      '齐边', '锯切', '切割', '裁切',
      '洗涤', '清洗', '离心', '过滤', '透析', '封装', '装配', '组装', '电池装配', '抛光', '打磨'];"""
assert old7 in s, 'order anchor'
s = s.replace(old7, new7)

open(EX, 'w', encoding='utf-8').write(s)
print('extract.js v3.1 patched')
