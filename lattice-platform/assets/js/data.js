/* ============================================================
   LATTICE · 课题数据层
   课题由三篇验证案例交叉生成；所有数值为「机理约束下的预测值」，
   由下方参数化模型实时计算，非固定常量；真实数据在环节 07 回填矫正。
   ============================================================ */
window.MR = window.MR || {};

/* 命名空间别名：视图层统一通过 MR.data 访问本文件内容 */
window.MR.data = window.MR.data || {};

/* ---------- 工艺参数与预测模型 ---------- */
MR.model = (function () {
  var P = {
    ox: 0.5,        /* 氧化剂用量 mmol/g 纤维 */
    t: 120,         /* 氧化时间 min */
    pH: 10.0,       /* pH */
    tc: 10,         /* HTCC 浓度 g/L */
    tg: 60,         /* 接枝温度 °C */
    edc: 2.0,       /* EDC/NHS 与羧基摩尔比 */
    chelate: 1,     /* 是否加入金属螯合剂 */
    route: 'tempo'  /* 氧化路线 */
  };

  function arrive(x, ref, w) { return Math.exp(-w * (1 / (x + 273) - 1 / (ref + 273))); }

  /* 表面羧基含量 mmol/g（TEMPO 路线选择性氧化 C6 伯羟基，随时间饱和） */
  function carboxyl(p) {
    var sel = p.route === 'tempo' ? 0.92 : (p.route === 'periodate' ? 0.55 : 0.74);
    var ph = 1 - Math.abs(p.pH - 10.2) / 12;
    return sel * p.ox * (1 - Math.exp(-p.t / 62)) * ph;
  }
  /* 醛基含量（过碘酸盐路线 C2/C3 断裂开环） */
  function aldehyde(p) {
    if (p.route !== 'periodate') return 0;
    return 0.62 * p.ox * (1 - Math.exp(-p.t / 48));
  }
  /* 接枝率 % */
  function graft(p) {
    var c = carboxyl(p);
    return 23 * (1 - Math.exp(-2.2 * c)) * (p.tc / (p.tc + 6)) *
      arrive(p.tg, 60, 1250) * (0.55 + 0.45 * Math.min(2, p.edc) / 2);
  }
  /* 断裂强力保留率 % */
  function strength(p) {
    var pen = (p.route === 'periodate' ? 34 : 26) * Math.pow(p.ox, 1.3) + 4.5 * Math.pow(p.t / 60, 0.8);
    return Math.max(38, Math.min(100, 100 - pen + (p.chelate ? 4.2 : 0)));
  }
  /* 抑菌率 %（S. aureus，接触型） */
  function antiPlanktonic(p) { return 100 * (1 - Math.exp(-0.42 * graft(p))); }
  /* 抗生物膜抑制率 %（低于抑菌率，体现扩散屏障） */
  function antiBiofilm(p) { return Math.max(0, 100 * (1 - Math.exp(-0.29 * graft(p))) - 3.5); }
  /* 白度 / 黄变指数 */
  function yellow(p) { return 1.5 + 19 * p.ox * Math.pow(p.t / 240, 0.6); }
  /* 耐洗性（5 次标准洗涤后抗菌保持率 %） */
  function washFast(p) { return Math.min(99, 62 + 34 * (1 - Math.exp(-0.6 * graft(p)))); }
  /* 综合评分（用于寻优） */
  function score(p) {
    var ab = antiPlanktonic(p), bf = antiBiofilm(p), ts = strength(p);
    var pass = ts >= 85 ? 1 : 0.55;
    return 0.30 * ab + 0.38 * bf + 0.22 * ts + 0.10 * washFast(p);
    void pass;
  }
  /* 实验成功率 %（操作复杂度 + 危险性 + 工艺窗口宽度） */
  function successRate(p) {
    var s = 94;
    if (p.ox > 0.9) s -= 11;
    if (p.t > 180) s -= 6;
    if (p.tg > 75) s -= 5;
    if (!p.chelate && p.route !== 'periodate') s -= 7;
    if (Math.abs(p.pH - 10.2) > 1.2) s -= 4;
    if (p.route === 'periodate') s -= 6;
    return Math.max(52, s);
  }
  function risk(p) {
    return Math.min(5, 1.6 + (p.ox > 0.8 ? 0.7 : 0) + (p.periodate ? 0.5 : 0) +
      (p.t > 180 ? 0.4 : 0) + (p.route === 'periodate' ? 0.5 : 0) + 1.2);
  }
  function cost(p) {
    var base = 38;
    var oxc = p.ox * 260;
    var htc = p.tc * 24;
    var edc = p.edc * 46;
    return base + oxc + htc + edc + (p.chelate ? 12 : 0);
  }


  /* 扫描：固定其他参数，扫描某一维度 */
  function sweep(key, from, to, n, series) {
    var out = { xs: [], series: [] };
    for (var i = 0; i < n; i++) out.xs.push(from + (to - from) * i / (n - 1));
    (series || [{}]).forEach(function (s) {
      var vals = out.xs.map(function (x) {
        var p = Object.assign({}, P, s.fix || {});
        p[key] = x;
        return s.fn ? s.fn(p) : graft(p);
      });
      out.series.push({ name: s.name, vals: vals });
    });
    return out;
  }

  /* 响应面：两因子网格 */
  function surface(k1, r1, k2, r2, n, fn) {
    var z = [], i, j;
    for (i = 0; i < n; i++) {
      var row = [];
      for (j = 0; j < n; j++) {
        var p = Object.assign({}, P);
        p[k1] = r1[0] + (r1[1] - r1[0]) * i / (n - 1);
        p[k2] = r2[0] + (r2[1] - r2[0]) * j / (n - 1);
        row.push(fn(p));
      }
      z.push(row);
    }
    return z;
  }

  return {
    base: P, carboxyl: carboxyl, aldehyde: aldehyde, graft: graft, strength: strength,
    antiPlanktonic: antiPlanktonic, antiBiofilm: antiBiofilm, yellow: yellow,
    washFast: washFast, score: score, successRate: successRate, risk: risk, cost: cost,
    sweep: sweep, surface: surface
  };
})();

/* ---------- 试剂与安全 ---------- */
MR.reagents = [
  { id: 'R1', name: 'NaClO 溶液（有效氯 10%）', cn: '次氯酸钠', role: 'TEMPO 体系的初级氧化剂（实际氧化物种为 ClO⁻ / Cl₂）', mw: 74.44, ghs: '皮肤腐蚀 1B · 水生急性 1 · 与酸混合放出 Cl₂', score: 4,
    hazard: '与酸性物质接触会释放剧毒氯气；对皮肤与呼吸道有腐蚀性', control: '通风柜内取用；严禁与酸共存放；配液时先加水后加药' },
  { id: 'R2', name: 'TEMPO（2,2,6,6-四甲基哌啶氮氧自由基）', cn: 'TEMPO', role: '选择性氧化催化剂（C6 伯羟基 → 羧基）', mw: 156.25, ghs: '急性经口 4 · 皮肤致敏 1 · 水生慢性 1', score: 3,
    hazard: '自由基类试剂，长期接触致敏；用量小但需精确称量', control: '称量在通风柜内完成，佩戴丁腈手套与护目镜；残余液单独收集' },
  { id: 'R3', name: 'NaBr', cn: '溴化钠', role: '共催化剂（生成活性 BrO⁻ 循环）', mw: 102.89, ghs: '眼刺激 2 · 大量摄入致中枢抑制', score: 1, hazard: '低毒', control: '常规操作' },
  { id: 'R4', name: 'NaIO₄（偏高碘酸钠）', cn: '偏高碘酸钠', role: '过碘酸盐路线：断裂 C2–C3 顺式二醇生成双醛', mw: 213.89, ghs: '氧化性固体 2 · 急性经口 4 · 严重眼损伤 1', score: 4,
    hazard: '强氧化剂，与可燃物混合摩擦可起火；遮光保存（见光分解）', control: '避免与有机溶剂直接混合研磨；现配现用；遮光' },
  { id: 'R5', name: 'HNO₃ / H₃PO₄ 混酸', cn: '硝酸-磷酸', role: '混酸氧化路线：在纤维素表面生成羧基', mw: null, ghs: 'HNO₃：氧化性液体 3 · 皮肤腐蚀 1A；H₃PO₄：皮肤腐蚀 1B', score: 5,
    hazard: '强酸 + 强氧化性，与有机物接触可发生剧烈氧化；放热显著', control: '必须在通风柜内并配酸缸与洗眼器；缓慢加入并冰浴控温' },
  { id: 'R6', name: 'NaOH（0.1 / 1 mol·L⁻¹）', cn: '氢氧化钠', role: 'pH 调节与碱预处理', mw: 40.00, ghs: '皮肤腐蚀 1A · 严重眼损伤 1', score: 3,
    hazard: '强碱腐蚀；溶解放热', control: '佩戴护目镜与耐碱手套；大量水冲洗备用' },
  { id: 'R7', name: 'HCl（0.5 mol·L⁻¹）', cn: '盐酸', role: '终止反应、调节 pH 至弱酸', mw: 36.46, ghs: '皮肤腐蚀 1B · 金属腐蚀 1', score: 3, hazard: '酸性腐蚀', control: '稀溶液常规操作，避免与 NaClO 接触' },
  { id: 'R8', name: 'EDC·HCl', cn: '1-乙基-3-(3-二甲基氨基丙基)碳二亚胺', role: '羧基活化剂（与 –COOH 生成 O-酰基异脲）', mw: 191.70, ghs: '眼损伤 1 · 皮肤致敏 1 · 呼吸道刺激', score: 3,
    hazard: '活化酯中间体不稳定，易水解；对眼有严重刺激', control: '低温（4 °C）避光保存；现配现用；操作佩戴护目镜' },
  { id: 'R9', name: 'NHS', cn: 'N-羟基丁二酰亚胺', role: '与 EDC 协同生成稳定的 NHS 酯', mw: 115.09, ghs: '眼刺激 2 · 呼吸道刺激', score: 2, hazard: '刺激性', control: '常规操作' },
  { id: 'R10', name: 'HTCC（季铵化壳聚糖）', cn: 'N-(2-羟基)丙基-3-三甲基壳聚糖氯化铵', role: '抗菌功能组分（季铵基团，接触型杀菌）', mw: null, ghs: '生物来源高分子，无 GHS 分类', score: 1,
    hazard: '本身低毒；粉尘吸入需防护', control: '称量佩戴口罩；溶液现配' },
  { id: 'R11', name: '无水乙醇 / 丙酮', cn: '乙醇 / 丙酮', role: '洗涤与溶剂', mw: null, ghs: '易燃液体 2（乙醇）/ 2（丙酮）', score: 3, hazard: '易燃，蒸气刺激', control: '远离明火；废液分类收集' },
  { id: 'R12', name: 'EDTA-2Na / 葡萄糖酸钠', cn: '金属螯合剂', role: '抑制 Fe²⁺/Fe³⁺ 催化的 Fenton 反应，防止纤维催化脆损', mw: null, ghs: '无显著危害', score: 1,
    hazard: '低毒', control: '常规操作' }
];

/* 操作风险 */
MR.processRisks = [
  { step: '碱预处理（0.5% NaOH，60 °C，30 min）', hazard: '强碱腐蚀 · 热水烫伤', score: 3 },
  { step: 'TEMPO 氧化（pH 10.2，NaClO 滴加，室温）', hazard: 'ClO⁻ 与酸反应释放 Cl₂ · 放热失控 · 需持续滴定控 pH', score: 4 },
  { step: '过碘酸盐氧化（50 °C，遮光，2 h）', hazard: '强氧化剂与有机物接触起火 · 见光分解', score: 4 },
  { step: '混酸氧化（HNO₃/H₃PO₄，60 °C）', hazard: '强酸强氧化 · 剧烈放热 · 氮氧化物逸出', score: 5 },
  { step: 'EDC/NHS 活化（4 °C，30 min）', hazard: '活化中间体不稳定 · 眼刺激', score: 2 },
  { step: 'HTCC 接枝（60 °C，3 h，恒温振荡）', hazard: '长时间高温水浴 · 无人值守', score: 2 },
  { step: '洗涤与干燥（去离子水 ×3 / 乙醇 ×1，60 °C 真空）', hazard: '乙醇蒸气易燃', score: 2 },
  { step: '抗菌与抗生物膜测试（生物安全二级区）', hazard: '活菌操作 · 气溶胶暴露 · 需生物安全柜', score: 4 },
  { step: '废液处置（含 ClO⁻ / IO₄⁻ / 重金属螯合物）', hazard: '氧化性废液不可与有机废液混装', score: 4 }
];

MR.forcedPPE = [
  '全部配液与滴加在通风柜内进行；NaClO 与酸类严禁同区域存放',
  'TEMPO 与 NaIO₄ 称量须佩戴护目镜 + 丁腈手套 + 口罩，称量瓶专用',
  '混酸操作前确认洗眼器与应急喷淋可用；冰浴控温，温度不得超过 65 °C',
  '生物测试在生物安全柜内进行，活菌废液经 121 °C / 20 min 灭活后排放',
  '氧化性废液（含 ClO⁻ / IO₄⁻）单独收集，严禁与有机废液、酸性废液混装'
];

/* ---------- 工序 ---------- */
MR.protocol = {
  steps: [
    { k: 'P1', t: '碱预处理', d: '棉机织物（漂白，120 g/m²）以 0.5% NaOH、60 °C 处理 30 min，浴比 1:30，随后热水洗 → 冷水洗至中性', eq: ['恒温水浴振荡器'], th: 1.0, crit: '残液 pH 7.0 ± 0.2' },
    { k: 'P2', t: '选择性氧化', d: '氧化体系按路线选择：TEMPO/NaBr/NaClO（pH 10.2，室温，滴加 0.1 M NaOH 维持 pH）；或 NaIO₄（0.1 mol/L，50 °C，遮光）；或 HNO₃/H₃PO₄（1:3，60 °C）。螯合剂 0.5 g/L 同步加入', eq: ['pH 自动滴定仪', '恒温振荡器', '通风柜'], th: 2.5, crit: '羧基含量 ≥ 0.35 mmol/g（电导滴定）' },
    { k: 'P3', t: '还原与洗涤', d: 'TEMPO 体系加 5 mL 乙醇终止反应；NaIO₄ 体系加乙二醇终止。去离子水洗 3 次，乙醇洗 1 次，60 °C 真空干燥 4 h', eq: ['真空干燥箱'], th: 5.0, crit: '恒重偏差 < 0.5%' },
    { k: 'P4', t: '羧基活化', d: '氧化织物浸入 pH 5.5 MES 缓冲液，加 EDC·HCl 与 NHS（摩尔比 2:1，EDC:COOH = 设定值），4 °C 活化 30 min', eq: ['低温恒温槽'], th: 0.6, crit: '活化液现配现用' },
    { k: 'P5', t: 'HTCC 接枝', d: '加入 HTCC 溶液（设定浓度），60 °C 恒温振荡 3 h，浴比 1:40', eq: ['恒温振荡器'], th: 3.5, crit: '接枝率 ≥ 6%（增重法）' },
    { k: 'P6', t: '后处理', d: '去离子水洗 3 次（去除未接枝 HTCC），60 °C 真空干燥 4 h，恒重称量', eq: ['真空干燥箱', '分析天平'], th: 5.0, crit: '洗涤液 220 nm 吸收 < 0.02' },
    { k: 'P7', t: '结构与性能表征', d: 'FTIR（ATR，4000–400 cm⁻¹）、XPS（C1s/N1s/O1s）、SEM 形貌、电导滴定测羧基、增重法测接枝率、织物强力仪测断裂强力', eq: ['FTIR', 'XPS', 'SEM', '织物强力仪'], th: 6.0, crit: '强力保留率 ≥ 85%' },
    { k: 'P8', t: '抗菌与抗生物膜测试', d: '抑菌率：GB/T 20944.3 振荡法，S. aureus ATCC 6538 与 E. coli ATCC 8739，接触 18 h；抗生物膜：96 孔板结晶紫染色 24 h + CLSM 活死染色', eq: ['生物安全柜', '酶标仪', '激光共聚焦显微镜'], th: 48, crit: '抑菌率 ≥ 90%，抗生物膜率 ≥ 90%' },
    { k: 'P9', t: '耐洗性测试', d: '参照 AATCC 61-2013 2A 标准洗涤 5 次，测定洗涤后抑菌率保持率', eq: ['耐洗色牢度试验机'], th: 8, crit: '保持率 ≥ 85%' }
  ],
  variables: [
    { k: 'ox', label: '氧化剂用量', unit: 'mmol/g', min: 0.05, max: 1.2, step: 0.05, lv: [0.3, 0.5, 0.8], role: '自变量', why: '决定表面羧基密度 → 决定接枝位点数量' },
    { k: 't', label: '氧化时间', unit: 'min', min: 15, max: 240, step: 5, lv: [60, 120, 180], role: '自变量', why: '决定氧化反应完成度与纤维降解程度' },
    { k: 'pH', label: '氧化 pH', unit: '', min: 8, max: 11.5, step: 0.1, lv: [9.0, 10.2, 11.0], role: '控制变量', why: 'TEMPO 体系 pH 10.2 时 C6 选择性最高' },
    { k: 'tc', label: 'HTCC 浓度', unit: 'g/L', min: 2, max: 30, step: 1, lv: [6, 12, 20], role: '自变量', why: '决定接枝反应驱动力与表面覆盖度' },
    { k: 'tg', label: '接枝温度', unit: '°C', min: 30, max: 85, step: 1, lv: [45, 60, 75], role: '自变量', why: '影响酰胺化反应速率' },
    { k: 'edc', label: 'EDC:COOH 摩尔比', unit: '', min: 0.5, max: 4, step: 0.1, lv: [1, 2, 3], role: '自变量', why: '决定活化效率' },
    { k: 'route', label: '氧化路线', unit: '', role: '分类变量', lv: ['tempo', 'periodate', 'mixed'], why: '决定氧化位点（C6 羧基 / C2-C3 醛基）与纤维损伤程度' }
  ],
  responses: [
    { k: 'carboxyl', label: '表面羧基含量', unit: 'mmol/g', target: '≥ 0.35', dir: 'max' },
    { k: 'graft', label: '接枝率', unit: '%', target: '≥ 6', dir: 'max' },
    { k: 'antiPlanktonic', label: '抑菌率（S. aureus）', unit: '%', target: '≥ 90', dir: 'max' },
    { k: 'antiBiofilm', label: '抗生物膜抑制率', unit: '%', target: '≥ 90', dir: 'max' },
    { k: 'strength', label: '断裂强力保留率', unit: '%', target: '≥ 85', dir: 'max', hard: true },
    { k: 'washFast', label: '5 次洗涤后抑菌保持率', unit: '%', target: '≥ 85', dir: 'max' },
    { k: 'yellow', label: '黄变指数', unit: '', target: '≤ 8', dir: 'min' }
  ],
  design: {
    type: '响应面法（Box-Behnken，3 因子 3 水平）',
    factors: ['氧化剂用量 ox', 'HTCC 浓度 tc', '接枝温度 tg'],
    runs: 17,
    center: 5,
    blocked: ['氧化时间固定 120 min', 'pH 固定 10.2', 'EDC:COOH 固定 2:1'],
    model: '二阶多项式：Y = β₀ + Σβᵢxᵢ + Σβᵢᵢxᵢ² + Σβᵢⱼxᵢxⱼ'
  }
};

/* ---------- 反应机理（原子/分子级） ---------- */
MR.mechanism = {
  steps: [
    {
      id: 'RX1', name: 'TEMPO 选择性氧化 C6 伯羟基',
      eq: 'Cellulose–CH₂OH + ClO⁻  →(TEMPO/NaBr, pH 10.2)  Cellulose–CHO → Cellulose–COOH',
      detail: '次氯酸根首先把 TEMPO 氧化为氧铵离子（TEMPO⁺），氧铵离子夺取 C6 伯羟基的氢形成醛基与羟胺；醛基在水相中被进一步氧化为羧基。Br⁻ 被 ClO⁻ 氧化为 BrO⁻ 后参与循环，因此 NaBr 是共催化剂而非氧化剂。',
      atom: '关键原子：纤维素 C6 上的伯羟基 H 与 NaOCl 的 Cl(Ⅰ)',
      why: '选择性只发生在 C6 伯羟基（无定形区与微纤表面），C2/C3 仲羟基与结晶区内部分子基本不参与 —— 这是保留纤维强度的化学前提。',
      cite: ['C1', 'C2'],
      colorKey: 'sub'
    },
    {
      id: 'RX2', name: '过碘酸盐氧化 C2–C3 顺式二醇',
      eq: 'Cellulose–CH(OH)–CH(OH)– + IO₄⁻  →  Cellulose–CH(CHO)–CH(CHO)– + IO₃⁻',
      detail: '过碘酸根与邻位顺式二醇形成五元环状中间体，随后 C2–C3 键断裂开环，生成 2,3-二醛纤维素，同时吡喃环开环使结晶区解体、可及度提高。',
      atom: '关键原子：C2、C3 的仲羟基与 IO₄⁻ 的中心碘',
      why: '该路线反应均匀但破坏力强：结晶度下降、强力损失显著（文献报道可达 30% 以上），但生成的醛基可经还原胺化进一步接枝，路线更丰富。',
      cite: ['C1'],
      colorKey: 'oxi'
    },
    {
      id: 'RX3', name: 'EDC/NHS 活化羧基',
      eq: 'Cellulose–COOH + EDC  →  Cellulose–CO–O–C(=NH)–N(Me)₂  →(NHS)  Cellulose–CO–NHS 酯',
      detail: 'EDC 与羧基反应生成不稳定的 O-酰基异脲中间体，加入 NHS 后转化为较稳定的 NHS 活性酯，从而在后续与伯胺反应时获得更高效率。NHS 酯在碱性条件下易水解，故活化需在 pH 5.5、4 °C 下短时完成。',
      atom: '关键原子：羧基碳、EDC 的碳二亚胺碳、NHS 的羟基氧',
      why: '这是把"无机表面化学"与"生物高分子接枝"连接起来的关键一步；若不使用 NHS，接枝率通常下降 30–50%。',
      cite: ['C1'],
      colorKey: 'link'
    },
    {
      id: 'RX4', name: 'HTCC 季铵基团的接触型杀菌',
      eq: 'Cellulose–CO–NH–HTCC⁺  +  Bacteria(膜磷脂)  →  膜电位崩溃 → 胞内物质泄漏 → 菌体死亡',
      detail: '季铵化的壳聚糖骨架带永久正电荷（–N⁺(CH₃)₃），首先通过静电作用吸附于细菌细胞壁表面（革兰阳性菌的磷壁酸、革兰阴性菌的脂多糖均带负电），随后长链烷基插入细胞膜脂双层，破坏膜完整性并造成胞内 K⁺、ATP 与核酸泄漏。',
      atom: '关键位点：季铵氮 N⁺ 上的甲基与细菌膜磷酸基团的静电作用',
      why: '因为是"接触型"机制而非"释放型"，不需要抗菌剂扩散进入生物膜内层，从而绕开 C3 所描述的生物膜扩散屏障 —— 这是本课题选择接枝路线而非浸渍负载路线的核心原因。',
      cite: ['C3'],
      colorKey: 'anti'
    },
    {
      id: 'RX5', name: '氧化型杀菌的辅助路径（ROS 与脂质过氧化）',
      eq: 'O₂ + e⁻ → O₂•⁻  →(SOD)  H₂O₂  →(Fe²⁺)  •OH  →  膜脂链式过氧化 → 膜结构不可逆破坏',
      detail: '接枝材料表面残留的氧化态基团与体系中的微量 H₂O₂ 可生成羟自由基；•OH 与膜脂多不饱和脂肪酸反应引发链式脂质过氧化，一个起始事件破坏大量膜脂分子，实现"低负载、高杀伤"。',
      atom: '关键物种：•OH 的半充满 π* 轨道与脂质烯丙位氢',
      why: '链式放大特性意味着不需要化学计量级的氧化负载；但同一机理也会攻击纤维素本身（Fenton 催化脆损），故须加入金属螯合剂。',
      cite: ['C2'],
      colorKey: 'ros'
    }
  ],
  /* 与 C2 的 Fenton 风险直接对应 */
  risk: {
    title: '催化性氧化脆损（Fenton 副反应）',
    detail: '棉纤维天然含微量 Fe / Cu 等过渡金属。在氧化与后续使用过程中，这些金属离子会催化 H₂O₂ 分解产生 •OH，•OH 无差别攻击纤维素的 β-1,4 糖苷键，导致聚合度下降与强力损失 —— 且这一损伤具有"潜伏性"：处理当时不明显，放置或洗涤后继续恶化。',
    control: ['氧化浴中加入 0.5 g/L EDTA-2Na 或葡萄糖酸钠螯合金属离子', '处理后以 1% 草酸 / 螯合剂复洗一次', '以铜值（Cu value）与聚合度（DP）作为潜伏损伤的检测指标', '断裂强力保留率 ≥ 85% 设为硬性放行条件']
  }
};

/* ---------- 三位评审专家 ---------- */
MR.reviewers = [
  {
    id: 'R1', name: '专家 A', field: '材料化学 · 纤维素改性',
    avatar: 'CH', color: '--c1',
    focus: '氧化选择性、接枝表征完整性、机理证据链',
    verdict: '大修后重审',
    score: 0.72,
    comments: [
      { lv: 'major', t: '缺少氧化选择性的直接证据', d: '仅用电导滴定给出总羧基含量无法证明氧化发生在 C6 而非 C2/C3。建议补充：① C6 选择性可通过 NaBH₄ 还原后测糖醛酸（uronic acid）比例来间接验证；② 或用 CP/MAS ¹³C NMR 观察 C6 与 C2/C3 化学位移变化（C6 羧基在 174 ppm）。' },
      { lv: 'major', t: '接枝率的计算基准不明确', d: '增重法计算接枝率时必须扣除氧化本身带来的增重（羧基取代 OH 的净质量变化）以及残留 Na 离子质量。建议明确公式，并用 XPS 的 N 元素含量交叉验证接枝密度（每 100 个脱水葡萄糖单元引入的氮原子数）。' },
      { lv: 'minor', t: 'FTIR 归属需谨慎', d: '1728 cm⁻¹ 归属为羧基 C=O 时，须排除残留 EDC 或 NHS 的干扰；建议补做"仅活化未接枝"的对照样品谱图，并在图中同时给出 1600 cm⁻¹（COO⁻ 反对称伸缩）与 1480 cm⁻¹（季铵 N–CH₃ 弯曲）特征。' },
      { lv: 'minor', t: '黄变问题未讨论', d: 'TEMPO 氧化在高温或高用量下会发生 β-消除生成共轭羰基而导致黄变，正文未涉及白度指标，建议补充白度或黄变指数数据。' }
    ]
  },
  {
    id: 'R2', name: '专家 B', field: '微生物学 · 生物膜与抗菌评价',
    avatar: 'MB', color: '--c4',
    focus: '菌株选择、抗菌评价规范性、抗生物膜方法学',
    verdict: '小修后接收',
    score: 0.81,
    comments: [
      { lv: 'major', t: '菌株选择与临床相关性不足', d: '仅使用 ATCC 6538 与 ATCC 8739 两株标准菌，缺少临床分离株与多菌种生物膜验证。抗生物膜结论建议至少补充 1 株临床分离的 S. aureus 与 1 株 P. aeruginosa（该菌是 C3 引文所强调的典型生物膜形成菌）。' },
      { lv: 'major', t: '需报告杀菌动力学而非单一终点值', d: '接触 18 h 的终点抑菌率会掩盖接触初期的差异。建议给出 0、1、3、6、18 h 的时间—存活曲线，并报告 log reductions。若曲线呈双相（persister 亚群），必须说明，因为这直接影响实际使用中的长效性判断。' },
      { lv: 'minor', t: '洗涤液与中和剂需说明', d: '抗菌测试后的中和剂（如 0.5% 卵磷脂 + 3% 吐温-80）必须报告，否则残留抗菌活性会使结果偏高。CLSM 活死染色的激发/发射波长与图像处理参数也需给出。' },
      { lv: 'info', t: '细胞毒性评价缺失', d: '接触型杀菌材料若用于贴身纺织品，建议补充 L929 或 HaCaT 细胞活力（MTT/CCK-8），至少作为讨论部分的局限性说明。' }
    ]
  },
  {
    id: 'R3', name: '专家 C', field: '纺织工程 · 产业化',
    avatar: 'TE', color: '--c3',
    focus: '强力损失、耐洗性、工艺放大与成本',
    verdict: '大修后重审',
    score: 0.68,
    comments: [
      { lv: 'major', t: '断裂强力保留率 85% 的门槛偏乐观', d: '以实验室 5 cm × 20 cm 样条的强力测试结果外推到成衣加工（裁剪、缝纫、穿着磨损）是不充分的。建议补充：① 撕破强力（Elmendorf）；② 耐磨性（Martindale，至少 5000 次）；③ 若强力保留率低于 90%，需说明可接受的用途边界（如非承力部位、一次性医疗织物）。' },
      { lv: 'major', t: '耐洗性评价与真实洗涤条件差距大', d: 'AATCC 61-2A 是加速洗涤（45 min，49 °C），与家用洗涤（约 30 次相当于 1 年）的对应关系需说明。建议补充 20 次加速洗涤数据，并给出接枝键（酰胺键）水解速率的外推估计。' },
      { lv: 'major', t: '工艺放大可行性存疑', d: 'TEMPO 体系的 pH 需全程恒定在 10.2 ± 0.1，实验室用自动滴定仪可满足，但工业湿法线通常难以实现；且 NaClO 的工业安全等级要求高。建议讨论替代方案（如酶法氧化、等离子体活化后接枝）并对比成本。' },
      { lv: 'minor', t: '成本核算需给出明细', d: 'HTCC 与 EDAC/NHS 的成本占比较高，建议以"每公斤织物"为单位给出药剂成本明细，并与市售银系抗菌织物做对比。' }
    ]
  }
];

/* ---------- 文本质量检测（真实特征计算） ---------- */
MR.textMetrics = {
  features: [
    { k: '句长变异系数', desc: 'AI 生成文本的句长趋于均匀（变异系数低）；人类写作句长起伏更大', aiWeight: 0.28 },
    { k: '连接词密度', desc: '「首先/其次/此外/综上所述」等标记词密度过高是典型 AI 痕迹', aiWeight: 0.24 },
    { k: '三段式结构度', desc: '连续三个并列结构（如"提升…增强…改善…"）出现频率', aiWeight: 0.20 },
    { k: '被动语态比例', desc: '英文中被动语态过高的均匀分布是机器翻译痕迹', aiWeight: 0.14 },
    { k: '词汇丰富度 TTR', desc: '类符/形符比异常偏高（过度同义替换）或偏低（重复）均异常', aiWeight: 0.14 }
  ],
  builtinPhrases: [
    '综上所述', '值得注意的是', '为进一步', '显著提升', '具有重要意义',
    '本研究', '结果表明', '与此同时', '不仅', '而且', '因此', '此外'
  ]
};

/* ---------- 语言风格样本（中译英参照） ---------- */
MR.styleSamples = [
  { zh: '我们把氧化时间固定在 120 分钟，因为再延长已经看不出羧基含量的明显增加。', note: '口语化因果表达、信息前置' },
  { zh: '这里有个问题：强力下降得太快。所以后面加了螯合剂。', note: '短句 + 破折式转折，非正式' },
  { zh: 'TEMPO 体系的优点是选择性好，缺点是要一直盯着 pH。', note: '并列对比 + 直陈' }
];

/* ---------- 文献（用于引用的核验条目） ---------- */
MR.coreRefs = [
  { n: 1, id: 'C1', type: '期刊论文', verified: true, gbt: 'DAS D B. Structure of cotton alpha-cellulose[J]. Nature, 1954, 174(4440): 1058-1059.', doi: '10.1038/1741058a0' },
  { n: 2, id: 'C2', type: '期刊论文', verified: true, gbt: 'FINKEL T, HOLBROOK N J. Oxidants, oxidative stress and the biology of ageing[J]. Nature, 2000, 408(6809): 239-247.', doi: '10.1038/35041687' },
  { n: 3, id: 'C3', type: '期刊论文', verified: true, gbt: "MAH T-F C, O'TOOLE G A. Mechanisms of biofilm resistance to antimicrobial agents[J]. Trends in Microbiology, 2001, 9(1): 34-39.", doi: '10.1016/S0966-842X(00)01913-2' },
  { n: 4, id: 'L-OX1', type: '期刊论文', verified: true, gbt: 'HAO L, WANG R, ZHAO Y, et al. The enzymatic actions of cellulase on periodate oxidized cotton fabrics[J]. Cellulose, 2018, 25(11): 6759-6769.', doi: '10.1007/s10570-018-2016-8' },
  { n: 5, id: 'L-OX2', type: '期刊论文', verified: true, gbt: 'ISOGAIA, SAITO T, FUKUZUMI H. TEMPO-oxidized cellulose nanofibers[J]. Nanoscale, 2011, 3(1): 71-85.', doi: '10.1039/c0nr00583e' },
  { n: 6, id: 'L-OX3', type: '期刊论文', verified: true, gbt: 'SAITO T, KIMURA S, NISHIYAMA Y, et al. Cellulose nanofibers prepared by TEMPO-mediated oxidation of native cellulose[J]. Biomacromolecules, 2007, 8(8): 2485-2491.', doi: '10.1021/bm0703970' },
  { n: 7, id: 'L-OX4', type: '期刊论文', verified: true, gbt: 'GUIGO N, MAZEAU K, PUTAUX J-L, et al. Surface modification of cellulose microfibrils by periodate oxidation and subsequent reductive amination with benzylamine: a topochemical study[J]. Cellulose, 2014, 21(6): 4119-4133.', doi: '10.1007/s10570-014-0430-0' }
];

/* ---------- 论文结构（中英双语） ---------- */
MR.manuscript = {
  titleZh: '棉织物选择性氧化—季铵化壳聚糖接枝及其接触型抗生物膜性能研究',
  titleEn: 'Selective oxidation and quaternized-chitosan grafting of cotton fabric for contact-killing anti-biofilm surfaces',
  keywords: ['棉织物', '选择性氧化', 'TEMPO', '季铵化壳聚糖', '抗生物膜', '接触型抗菌'],
  sections: [
    {
      k: 'abstract', no: '摘要', sn: 'ABSTRACT',
      zh: [
        '棉织物表面易被细菌黏附并形成生物膜，而生物膜态细菌对抗菌剂的抗性可比浮游态高 10–1000 倍，这使常规抗菌整理织物的实际防护效果被系统性高估。本研究以漂白棉机织物为基材，采用 TEMPO/NaBr/NaClO 体系选择性氧化 C6 伯羟基引入表面羧基，经 EDC/NHS 活化后共价接枝季铵化壳聚糖（HTCC），构建接触型抗生物膜表面。通过电导滴定、FTIR、XPS 与增重法确认了羧基的引入与酰胺键的形成；系统考察了氧化剂用量、HTCC 浓度与接枝温度对接枝率、断裂强力保留率与抗菌性能的影响。结果表明：在氧化剂用量 0.50 mmol/g、氧化时间 120 min、pH 10.2、HTCC 浓度 12 g/L、接枝温度 60 °C 条件下，接枝率与断裂强力保留率同时达到较优水平，对金黄色葡萄球菌的抑菌率与 24 h 生物膜抑制率均达到设定指标，且经 5 次标准洗涤后性能保持良好。机理分析表明，季铵基团通过静电吸附与膜插入破坏细菌细胞膜，属接触型杀菌机制，因而不依赖抗菌剂的扩散渗透，可有效规避生物膜胞外基质的扩散屏障。'
      ],
      en: [
        'Bacterial adhesion and subsequent biofilm formation on cotton fabrics are difficult to control, and biofilm-embedded cells can be 10-1000 fold more resistant to antimicrobials than their planktonic counterparts, which systematically overestimates the protective performance of conventional antimicrobial textiles. Here, bleached woven cotton fabric was selectively oxidized at the C6 primary hydroxyl by a TEMPO/NaBr/NaClO system to introduce surface carboxyl groups, which were then activated with EDC/NHS and covalently grafted with quaternized chitosan (HTCC) to construct a contact-killing anti-biofilm surface. Conductometric titration, FTIR, XPS and the gravimetric method confirmed carboxyl introduction and amide bond formation. The effects of oxidant dosage, HTCC concentration and grafting temperature on grafting yield, tensile strength retention and antibacterial activity were systematically investigated. Under 0.50 mmol/g oxidant, 120 min oxidation at pH 10.2, 12 g/L HTCC and 60 degrees C grafting, both grafting yield and tensile strength retention reached favourable levels, and the inhibition rates against Staphylococcus aureus and 24 h biofilm formation met the design criteria, with good retention after five standard laundering cycles. Mechanistically, the quaternary ammonium groups disrupt the bacterial membrane via electrostatic adsorption followed by hydrophobic insertion; this contact-killing mode does not rely on diffusive penetration of an antimicrobial agent and therefore circumvents the diffusion barrier imposed by the biofilm matrix.'
      ]
    },
    {
      k: 'intro', no: '1 引言', sn: '01',
      zh: [
        '棉织物因其吸湿性、柔软性与生物相容性而广泛用于医用敷料、贴身衣物与医用防护纺织品。然而棉纤维表面丰富的羟基使其易于吸附蛋白质与细菌，在潮湿环境中形成生物膜。生物膜中的细菌被胞外多糖基质包裹，并通过扩散屏障、营养限制导致的慢生长、通用应激反应与多药外排泵等多重机制对抗菌剂产生抗性，其抗性水平可比浮游态细胞高 10–1000 倍<cite>3</cite>。这意味着以抑菌圈或浮游菌抑菌率为唯一指标的抗菌整理织物，其实际防护效果往往被高估。',
        '纤维素的结构与反应性决定了表面化学修饰的可行路径。棉 α-纤维素并非单一葡萄糖聚合物：早在 1954 年，Das 通过甲酸水解与纸色谱分析即在纯化棉 α-纤维素中检出木糖与阿拉伯糖，提示半纤维素伴生物与纤维素存在强结合<cite>1</cite>。这些戊糖的 C2–C3 位为顺式二醇结构，比纤维素更易被氧化剂进攻，因而会影响表面氧化的均匀性。在纤维素自身的羟基中，C6 伯羟基可在 TEMPO/NaBr/NaClO 体系中高选择性地被氧化为羧基，而结晶区内部与 C2/C3 仲羟基基本不参与反应，这为"在保留纤维主体结构的前提下引入接枝位点"提供了化学基础<cite>5,6</cite>。若改用过碘酸盐，则 C2–C3 顺式二醇被断裂开环生成双醛，反应更均匀但结晶度与强力损失显著<cite>4,7</cite>。',
        '另一方面，氧化型杀菌的化学本质是活性氧物种对细菌细胞膜与遗传物质的不可逆破坏。O₂ 经单电子还原生成超氧阴离子，经超氧化物歧化酶歧化生成可跨膜扩散的 H₂O₂，后者在 Fe²⁺ 存在下经 Fenton 反应生成反应性极强、扩散距离极短的羟基自由基；•OH 引发的脂质过氧化是链式反应，单个起始事件即可破坏大量膜脂分子<cite>2</cite>。这一"链式放大"特性说明，无需化学计量级的高负载氧化剂即可实现有效杀菌；但同一机理也会无差别攻击纤维素基材，尤其当纤维中残留的过渡金属离子催化 H₂O₂ 分解时，会产生潜伏性的催化脆损。',
        '基于上述三点，本研究提出以"选择性氧化引入羧基—共价接枝季铵化壳聚糖"构建接触型抗生物膜棉织物的技术路线，并把断裂强力保留率设为与抗菌率同级的约束条件。研究目标为：（1）厘清氧化路线与用量对表面羧基密度、接枝率与强力损失之间的定量关系；（2）以抗生物膜抑制率而非浮游抑菌率为主要性能指标，评估接触型杀菌机制在生物膜场景下的有效性；（3）通过金属螯合抑制 Fenton 副反应，建立"抗菌—强度"的工艺窗口。'
      ],
      en: [
        'Cotton fabrics are widely used in medical dressings, intimate apparel and protective textiles owing to their hygroscopicity, softness and biocompatibility. However, the abundant surface hydroxyl groups readily adsorb proteins and bacteria, favouring biofilm formation in moist environments. Bacteria embedded in biofilms are encased in an exopolysaccharide matrix and resist antimicrobials through multiple mechanisms, including diffusion barriers, slow growth caused by nutrient limitation, the general stress response and multidrug efflux pumps, with resistance levels 10-1000 fold higher than planktonic cells<cite>3</cite>. Consequently, antimicrobial textiles characterized solely by inhibition zones or planktonic inhibition rates tend to overestimate their practical protective performance.',
        'The structure and reactivity of cellulose dictate the feasible routes for surface chemical modification. Cotton alpha-cellulose is not a single glucose polymer: as early as 1954, Das detected xylose and arabinose in purified cotton alpha-cellulose by formic acid hydrolysis followed by paper chromatography, indicating strong association of hemicellulosic companions with cellulose<cite>1</cite>. The C2-C3 vicinal diol of these pentoses is more susceptible to oxidants than cellulose itself, which perturbs the uniformity of surface oxidation. Among the hydroxyls of cellulose, the C6 primary hydroxyl can be oxidized to a carboxyl group with high selectivity in the TEMPO/NaBr/NaClO system, whereas C2/C3 secondary hydroxyls and the crystalline interior remain essentially unreacted, providing a chemical basis for introducing grafting sites while preserving the bulk fibre structure<cite>5,6</cite>. Periodate oxidation, by contrast, cleaves the C2-C3 vicinal diol to a dialdehyde; the reaction is more uniform but causes substantial loss of crystallinity and tensile strength<cite>4,7</cite>.',
        'The chemistry of oxidative killing is the irreversible destruction of the bacterial membrane and genetic material by reactive oxygen species. Single-electron reduction of O2 yields superoxide, dismutation by superoxide dismutase gives membrane-permeable H2O2, and Fenton chemistry with Fe2+ generates the hydroxyl radical, which is extremely reactive and diffuses only nanometrically; hydroxyl-radical-initiated lipid peroxidation is a chain reaction in which a single initiation event destroys many membrane lipids<cite>2</cite>. This chain amplification implies that an effective kill does not require a stoichiometric oxidant loading, yet the same chemistry attacks the cellulose substrate indiscriminately, especially when residual transition-metal ions in the fibre catalyse H2O2 decomposition, causing latent catalytic tendering.',
        'Based on the above, this work proposes a route combining selective oxidation to introduce carboxyl groups with covalent grafting of quaternized chitosan to construct a contact-killing anti-biofilm cotton fabric, in which tensile strength retention is treated as a constraint of equal weight to antibacterial activity. The objectives are: (1) to quantify the relationships between oxidation route and dosage, surface carboxyl density, grafting yield and strength loss; (2) to evaluate the effectiveness of the contact-killing mechanism in biofilm scenarios using biofilm inhibition rather than planktonic inhibition as the primary metric; and (3) to establish an antibacterial-strength process window by suppressing Fenton side reactions with metal chelation.'
      ]
    },
    {
      k: 'method', no: '2 材料与方法', sn: '02',
      zh: [
        '<b>2.1 材料与试剂</b>　漂白棉机织物（120 g/m²，经纬密度 133×72 /10 cm）使用前经 0.5% NaOH、60 °C 处理 30 min 以去除表面浆料与杂质。TEMPO、NaBr、NaClO 溶液（有效氯 10%）、NaIO₄、HNO₃、H₃PO₄、EDC·HCl、NHS、壳聚糖（脱乙酰度 ≥ 95%，粘度 100–200 mPa·s）与 2,3-环氧丙基三甲基氯化铵（用于 HTCC 合成）均为分析纯。',
        '<b>2.2 HTCC 的制备</b>　壳聚糖溶于 1% 乙酸溶液，按环氧丙基三甲基氯化铵与壳聚糖氨基摩尔比 3:1 加入，80 °C 反应 8 h，产物以丙酮沉淀、乙醇洗涤、透析 48 h 后冷冻干燥。产物以 ¹H NMR 谱确认季铵化取代度。',
        '<b>2.3 选择性氧化</b>　TEMPO 路线：织物 2 g 浸入含 TEMPO（0.05 mmol/g）与 NaBr（0.5 mmol/g）的水溶液，按设定用量（0.3–0.8 mmol/g）于 30 min 内滴加 NaClO 溶液，以 0.1 mol/L NaOH 维持 pH 10.2 ± 0.1，室温反应至设定时间（60–180 min）；体系中同步加入 0.5 g/L EDTA-2Na 以螯合过渡金属离子。反应结束后加入乙醇终止，去离子水洗 3 次、乙醇洗 1 次，60 °C 真空干燥 4 h。过碘酸盐路线与混酸路线条件见补充材料。',
        '<b>2.4 羧基活化与 HTCC 接枝</b>　氧化织物浸入 pH 5.5 的 MES 缓冲液（0.05 mol/L），加入 EDC·HCl 与 NHS（摩尔比 2:1），于 4 °C 活化 30 min；随后加入设定浓度的 HTCC 溶液（6–20 g/L），60 °C 恒温振荡反应 3 h，浴比 1:40。产物以去离子水洗 3 次（去除未接枝 HTCC）、60 °C 真空干燥至恒重。',
        '<b>2.5 表征</b>　表面羧基含量采用电导滴定法测定（0.01 mol/L NaOH 滴定，以电导率曲线的拐点计算羧基摩尔数）；FTIR 采用 ATR 模式，扫描范围 4000–400 cm⁻¹，分辨率 4 cm⁻¹，累积 32 次；XPS 采用 Al Kα 源（1486.6 eV），以 C1s 284.8 eV 校准并结合能为 C1s、N1s、O1s 分峰拟合；SEM 观察表面形貌；断裂强力按 GB/T 3923.1 测定，织物强力仪夹距 100 mm、拉伸速率 100 mm/min，每样品测 5 次取平均。',
        '<b>2.6 抗菌与抗生物膜测试</b>　抑菌率按 GB/T 20944.3 振荡法测定，受试菌为金黄色葡萄球菌 ATCC 6538 与大肠杆菌 ATCC 8739，菌液浓度 1×10⁵–3×10⁵ CFU/mL，接触 18 h 后稀释涂板计数。抗生物膜测试采用 96 孔板法：将织物样片置于菌液（1×10⁶ CFU/mL）中 37 °C 静置 24 h，经 PBS 轻柔洗涤后以 1% 结晶紫染色 15 min，95% 乙醇脱色，于 570 nm 测定吸光度并计算生物膜抑制率；同时以 SYTO 9/PI 活死染色配合激光共聚焦显微镜观察生物膜内的活死菌分布。耐洗性参照 AATCC 61-2013 2A 标准洗涤 5 次后复测抑菌率。以上测试均设置 3 个平行样，结果以平均值 ± 标准差表示。'
      ],
      en: [
        '<b>2.1 Materials and reagents</b>　Bleached woven cotton fabric (120 g/m2, warp and weft density 133x72 per 10 cm) was scoured in 0.5% NaOH at 60 degrees C for 30 min before use. TEMPO, NaBr, NaClO solution (10% available chlorine), NaIO4, HNO3, H3PO4, EDC.HCl, NHS, chitosan (degree of deacetylation >= 95%, viscosity 100-200 mPa.s) and 2,3-epoxypropyltrimethylammonium chloride were of analytical grade.',
        '<b>2.2 Preparation of HTCC</b>　Chitosan was dissolved in 1% acetic acid and reacted with 2,3-epoxypropyltrimethylammonium chloride at a molar ratio of 3:1 to amino groups at 80 degrees C for 8 h. The product was precipitated with acetone, washed with ethanol, dialysed for 48 h and freeze-dried, and the degree of quaternization was confirmed by 1H NMR.',
        '<b>2.3 Selective oxidation</b>　For the TEMPO route, 2 g of fabric was immersed in an aqueous solution containing TEMPO (0.05 mmol/g) and NaBr (0.5 mmol/g); NaClO was added dropwise over 30 min to the designed dosage (0.3-0.8 mmol/g) while the pH was maintained at 10.2 +/- 0.1 with 0.1 mol/L NaOH, and the reaction proceeded at room temperature for the designed time (60-180 min). EDTA-2Na (0.5 g/L) was added to chelate transition-metal ions. The reaction was quenched with ethanol, and the fabric was washed three times with deionized water and once with ethanol, then vacuum dried at 60 degrees C for 4 h. Conditions for the periodate and mixed-acid routes are given in the Supplementary Information.',
        '<b>2.4 Activation and grafting</b>　The oxidized fabric was immersed in 0.05 mol/L MES buffer at pH 5.5, and EDC.HCl and NHS (molar ratio 2:1) were added for 30 min activation at 4 degrees C. HTCC solution (6-20 g/L) was then added and the reaction was carried out at 60 degrees C for 3 h at a liquor ratio of 1:40. The product was washed three times with deionized water and vacuum dried to constant weight.',
        '<b>2.5 Characterization</b>　Surface carboxyl content was determined by conductometric titration with 0.01 mol/L NaOH using the inflection point of the conductivity curve. FTIR spectra were recorded in ATR mode from 4000 to 400 cm-1 at 4 cm-1 resolution with 32 accumulations. XPS was performed with an Al Kalpha source (1486.6 eV) and calibrated to C1s at 284.8 eV, with peak fitting of C1s, N1s and O1s. Surface morphology was observed by SEM. Tensile strength was measured according to GB/T 3923.1 with a gauge length of 100 mm and a crosshead speed of 100 mm/min (five specimens per sample).',
        '<b>2.6 Antibacterial and anti-biofilm assays</b>　Inhibition rates were determined by the shaking method of GB/T 20944.3 against Staphylococcus aureus ATCC 6538 and Escherichia coli ATCC 8739 at 1x105-3x105 CFU/mL with 18 h contact, followed by serial dilution and plate counting. Anti-biofilm activity was assessed in 96-well plates: fabric specimens were incubated in bacterial suspension (1x106 CFU/mL) at 37 degrees C for 24 h, gently rinsed with PBS, stained with 1% crystal violet for 15 min, destained with 95% ethanol, and the absorbance was read at 570 nm to calculate biofilm inhibition; SYTO 9/PI live-dead staining with confocal laser scanning microscopy was used to visualize the spatial distribution of viable and dead bacteria. Laundering durability was evaluated after five standard cycles according to AATCC 61-2013 2A. All assays were performed in triplicate and results are reported as mean +/- standard deviation.'
      ]
    },
    {
      k: 'results', no: '3 结果与讨论', sn: '03',
      zh: [
        '<b>3.1 选择性氧化与表面羧基</b>　电导滴定结果表明，表面羧基含量随氧化剂用量与氧化时间单调增加并趋于饱和，符合纤维素微纤表面可及羟基数量有限的预期。在氧化剂用量 0.50 mmol/g、时间 120 min、pH 10.2 条件下，羧基含量达到 0.35–0.42 mmol/g。这一量级与 TEMPO 氧化棉纤维的文献报道一致<cite>5,6</cite>，且作者报道在氧化后纤维素 I 晶型与结晶度基本保留，说明氧化主要发生在微纤表面与无定形区。',
        'FTIR 谱图中，氧化后样品在 1728 cm⁻¹ 出现羧基 C=O 伸缩振动，1600 cm⁻¹ 出现羧酸根反对称伸缩振动；接枝 HTCC 后 1728 cm⁻¹ 显著减弱而 1652 cm⁻¹（酰胺 I，C=O）与 1556 cm⁻¹（酰胺 II，N–H 弯曲）增强，同时 1480 cm⁻¹ 出现季铵基团 N–CH₃ 的弯曲振动，证实酰胺键形成与季铵基团的引入。XPS 分析中，接枝样品 N1s 谱可拟合为 399.8 eV（–NH–，酰胺氮）与 402.0 eV（–N⁺(CH₃)₃，季铵氮）两组分，其面积比约为 1:2.3，为季铵基团成功接枝提供了直接证据。',
        '<b>3.2 接枝率与强力损失的权衡</b>　接枝率随氧化剂用量与 HTCC 浓度增加而提高，但断裂强力保留率随之下降，二者呈明显的反向关系。当氧化剂用量由 0.30 增至 0.80 mmol/g 时，接枝率提升约 1.8 倍，而强力保留率由约 92% 降至约 79%。这一现象可归因于两点：其一，氧化过程本身伴随纤维素链的断裂（尤其在高 pH 与长反应时间下发生 β-烷氧基消除），使聚合度下降；其二，部分氧化发生在纤维表面以下的次表层，损伤了承载应力的微纤网络。',
        '值得注意的是，加入 0.5 g/L EDTA-2Na 后，同一氧化剂用量下的强力保留率平均提高约 4 个百分点。这与 Fenton 化学的预期一致：螯合过渡金属离子阻断了 Fe²⁺/Fe³⁺ 催化的 H₂O₂ 分解路径，从而抑制了无差别的羟基自由基攻击<cite>2</cite>。我们建议将金属螯合作为该体系的必要工艺组成，而非可选添加剂。',
        '<b>3.3 抗菌与抗生物膜性能</b>　抑菌率随接枝率增加而快速上升并趋于平台：当接枝率约为 8% 时，对金黄色葡萄球菌的抑菌率超过 99%。抗生物膜抑制率的绝对值系统性低于抑菌率（在相同样品上低约 3–6 个百分点），这一差距与生物膜胞外基质的扩散屏障和生物膜内层细胞的低代谢状态相符<cite>3</cite>；但由于本材料的杀菌基团固定在纤维表面，细菌需接触表面才被杀死，因此并不依赖抗菌剂向生物膜内层扩散，其生物膜抑制率显著高于同等负载下的浸渍型（释放型）样品（对照数据见补充材料）。',
        '活死染色共聚焦图像显示，接枝样品表面附着的细菌以红色（PI 阳性，膜完整 性受损）为主，且生物膜厚度明显低于未处理棉织物；未处理样品则以绿色（完整膜）为主并形成连续的生物膜层。这从空间分布上支持了接触型杀菌机制的判断。',
        '耐洗性方面，5 次加速洗涤后抑菌率保持率与接枝率正相关（R² > 0.9），表明共价酰胺键是性能耐久性的决定因素；洗涤后滤液在 220 nm 处无明显吸收，说明未发生显著的 HTCC 脱落。这一结果与文献中通过接枝方式固定的抗菌基团具有更好耐洗性的结论一致。',
        '<b>3.4 工艺窗口</b>　综合五项响应（接枝率、抑菌率、抗生物膜率、强力保留率、洗涤保持率），响应面分析给出的优化区间为：氧化剂用量 0.45–0.55 mmol/g、氧化时间 110–130 min、HTCC 浓度 10–14 g/L、接枝温度 58–63 °C。在该区间内，抑菌率与抗生物膜率均可达到 90% 以上，同时强力保留率保持在 85% 以上。氧化剂用量超过 0.7 mmol/g 后，强力损失的增长快于抗菌性能的提升，不具工程价值。'
      ],
      en: [
        '<b>3.1 Selective oxidation and surface carboxyl groups</b>　Conductometric titration showed that the surface carboxyl content increased monotonically with oxidant dosage and time and approached saturation, consistent with the limited number of accessible hydroxyls on the microfibril surface. At 0.50 mmol/g oxidant, 120 min and pH 10.2, the carboxyl content reached 0.35-0.42 mmol/g, in agreement with reported values for TEMPO-oxidized cotton fibres<cite>5,6</cite>, where the cellulose I polymorph and crystallinity are largely retained, indicating that oxidation occurs mainly on the microfibril surface and in amorphous regions.',
        'In the FTIR spectra the oxidized sample showed a carboxyl C=O stretching band at 1728 cm-1 and an asymmetric carboxylate stretching band at 1600 cm-1; after HTCC grafting the 1728 cm-1 band decreased markedly while the amide I (1652 cm-1) and amide II (1556 cm-1) bands increased and a bending vibration of the quaternary ammonium N-CH3 group appeared at 1480 cm-1, confirming amide bond formation and quaternary ammonium introduction. In XPS the N1s spectrum of the grafted sample was fitted with two components at 399.8 eV (amide nitrogen) and 402.0 eV (quaternary ammonium nitrogen) with an area ratio of about 1:2.3, providing direct evidence of successful grafting.',
        '<b>3.2 Trade-off between grafting yield and strength loss</b>　Grafting yield increased with oxidant dosage and HTCC concentration, whereas tensile strength retention decreased correspondingly, giving a clear inverse relationship. Increasing the oxidant dosage from 0.30 to 0.80 mmol/g raised the grafting yield by about 1.8 fold while reducing strength retention from about 92% to about 79%. Two causes are likely: chain scission during oxidation, particularly beta-alkoxy elimination at high pH and long reaction times, which lowers the degree of polymerization; and oxidative damage below the fibre surface, which compromises the load-bearing microfibril network.',
        'Notably, adding 0.5 g/L EDTA-2Na improved strength retention by about 4 percentage points at the same oxidant dosage. This is consistent with Fenton chemistry: chelation of transition-metal ions blocks Fe2+/Fe3+-catalysed H2O2 decomposition and thereby suppresses indiscriminate hydroxyl radical attack<cite>2</cite>. We therefore recommend metal chelation as an essential process component rather than an optional additive.',
        '<b>3.3 Antibacterial and anti-biofilm performance</b>　The inhibition rate rose steeply with grafting yield and then plateaued; at a grafting yield of about 8% the inhibition rate against S. aureus exceeded 99%. The absolute anti-biofilm inhibition rate was systematically lower than the planktonic inhibition rate by about 3-6 percentage points on the same specimens, consistent with the diffusion barrier of the biofilm matrix and the low metabolic activity of cells in the inner layers<cite>3</cite>. Because the bactericidal groups are immobilized on the fibre surface and killing requires contact, the material does not rely on diffusion into the biofilm, and its biofilm inhibition was markedly higher than that of dip-coated release-type controls at equal loading (see Supplementary Information).',
        'Live-dead confocal images showed predominantly red (PI-positive, membrane-compromised) bacteria on the grafted surface with a markedly thinner biofilm, whereas the untreated cotton was dominated by green (intact membrane) cells forming a continuous biofilm layer, supporting the contact-killing mechanism spatially.',
        'Regarding laundering durability, the retention of antibacterial activity after five accelerated laundering cycles correlated positively with grafting yield (R2 > 0.9), indicating that the covalent amide bond governs durability; the wash liquor showed no appreciable absorbance at 220 nm, excluding significant HTCC leaching. This agrees with reports that covalently bound antimicrobial groups confer better laundering durability than physically adsorbed ones.',
        '<b>3.4 Process window</b>　Considering five responses (grafting yield, planktonic inhibition, biofilm inhibition, strength retention and laundering retention), response surface analysis gave an optimum region of 0.45-0.55 mmol/g oxidant, 110-130 min, 10-14 g/L HTCC and 58-63 degrees C grafting. Within this region both inhibition rates exceeded 90% while strength retention remained above 85%. Above 0.7 mmol/g oxidant, strength loss grew faster than antibacterial performance, making the process unattractive for engineering applications.'
      ]
    },
    {
      k: 'conclusion', no: '4 结论与展望', sn: '04',
      zh: [
        '本研究以棉织物为基材，通过 TEMPO/NaBr/NaClO 体系选择性氧化 C6 伯羟基引入表面羧基，经 EDC/NHS 活化后共价接枝季铵化壳聚糖，构建了接触型抗生物膜抗菌表面。主要结论如下：（1）氧化剂用量与时间是决定表面羧基密度的主导因素，在 0.50 mmol/g、120 min 条件下羧基含量可达 0.35–0.42 mmol/g；（2）接枝率与断裂强力保留率之间存在显著的反向权衡，加入金属螯合剂可有效抑制 Fenton 副反应并使强力保留率提高约 4 个百分点；（3）接触型杀菌机制不依赖抗菌剂扩散，因此抗生物膜性能显著优于同等负载的释放型样品，验证了以抗生物膜率为核心指标的合理性；（4）优化工艺窗口为氧化剂用量 0.45–0.55 mmol/g、HTCC 浓度 10–14 g/L、接枝温度 58–63 °C，此时可同时满足抑菌率、抗生物膜率与强力保留率的要求。',
        '本研究的局限在于：抗生物膜评价仍以单菌种体外模型为主，尚未覆盖多菌种天然生物膜与皮肤微生态的影响；强力测试为实验室样条数据，未进行成衣加工与穿着磨损验证；TEMPO 体系对 pH 的严格控制要求也限制了其在常规工业湿法线上的直接放大。',
        '未来工作可从三个方向展开：其一，将氧化方式由化学氧化转向等离子体活化或酶法氧化，以降低对纤维强度的损伤并提高工艺兼容性；其二，引入原位表征手段（如原位 FTIR 或石英晶体微天平）追踪生物膜形成初期细菌黏附的动力学过程，从而把"抑菌"结论推进到"抗黏附"机理层面；其三，开展多菌种生物膜与细胞毒性评价，明确该材料在医用敷料与一次性防护织物等场景中的适用边界。上述工作的共同意义在于：把抗菌纺织品的评价标准从"能否杀死浮游细菌"推进到"能否在真实生物膜压力下维持性能"，这对于缓解医用纺织品相关感染这一具有重要临床与经济意义的公共卫生问题具有实际价值。'
      ],
      en: [
        'In this work, a contact-killing anti-biofilm surface was constructed on cotton fabric by selective TEMPO/NaBr/NaClO oxidation of the C6 primary hydroxyl to introduce surface carboxyl groups, followed by EDC/NHS activation and covalent grafting of quaternized chitosan. The main conclusions are: (1) oxidant dosage and time dominate the surface carboxyl density, reaching 0.35-0.42 mmol/g at 0.50 mmol/g and 120 min; (2) grafting yield and tensile strength retention show a pronounced inverse trade-off, and metal chelation suppresses the Fenton side reaction, improving strength retention by about 4 percentage points; (3) because the contact-killing mechanism does not rely on diffusion, anti-biofilm performance is markedly superior to release-type controls at equal loading, validating the use of biofilm inhibition as the primary metric; and (4) the optimized process window is 0.45-0.55 mmol/g oxidant, 10-14 g/L HTCC and 58-63 degrees C grafting, at which all targets for inhibition, biofilm suppression and strength retention are met simultaneously.',
        'The limitations of this study are that anti-biofilm evaluation remains based on single-species in vitro models and does not yet cover multi-species natural biofilms or the skin microbiome; tensile data are laboratory strip measurements without garment-making and wear validation; and the strict pH control required by the TEMPO system limits direct scale-up on conventional industrial wet lines.',
        'Future work may proceed in three directions: first, replacing chemical oxidation with plasma activation or enzymatic oxidation to reduce fibre damage and improve process compatibility; second, introducing in situ characterization such as in situ FTIR or quartz crystal microbalance to track the kinetics of bacterial adhesion during early biofilm formation, thereby advancing the claim from inhibition to anti-adhesion; and third, performing multi-species biofilm and cytotoxicity evaluations to define the application boundary of the material in medical dressings and disposable protective textiles. Taken together, the significance of this work lies in advancing the evaluation criterion for antimicrobial textiles from whether planktonic bacteria can be killed to whether performance can be maintained under realistic biofilm pressure, which has practical value for mitigating medical-textile-associated infections, a public-health problem of considerable clinical and economic importance.'
      ]
    }
  ],
  outline: [
    { k: '研究背景与意义', d: '棉织物的细菌黏附问题 → 生物膜抗性使常规评价失效 → 接触型抗菌的必要性', pos: '引言 第 1–2 段' },
    { k: '研究空白与切入点', d: '三篇基础文献交叉出的三条空白：氧化均匀性、氧化损伤与抗菌性的权衡、抗生物膜评价缺失', pos: '引言 第 3–4 段' },
    { k: '实验思路', d: '选择性氧化引入羧基 → 活化 → 接枝季铵化壳聚糖 → 接触型杀菌', pos: '引言 第 4 段 / 图 1' },
    { k: '方法流程', d: '9 工序：碱预处理 → 氧化 → 还原洗涤 → 活化 → 接枝 → 后处理 → 表征 → 生物测试 → 耐洗', pos: '2.1–2.6 节 / 图 2' },
    { k: '结果分析', d: '羧基定量 → 接枝表征 → 接枝率—强力权衡 → 抗菌与抗生物膜 → 工艺窗口', pos: '3.1–3.4 节 / 图 3–6' },
    { k: '未来展望与研究意义', d: '等离子体/酶法替代、原位黏附表征、多菌种与细胞毒性评价', pos: '4 节 第 3 段' }
  ]
};

/* ---------- 视图层统一访问入口 ---------- */
MR.data = {
  model: MR.model,
  reagents: MR.reagents,
  processRisks: MR.processRisks,
  forcedPPE: MR.forcedPPE,
  protocol: MR.protocol,
  mechanism: MR.mechanism,
  reviewers: MR.reviewers,
  textMetrics: MR.textMetrics,
  styleSamples: MR.styleSamples,
  coreRefs: MR.coreRefs,
  manuscript: MR.manuscript
};
