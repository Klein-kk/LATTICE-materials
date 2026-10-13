/* ============================================================
   LATTICE · 化学反应引擎（借鉴自 lanyuxi/huaxue · MIT · 翻译为 vanilla JS）
   ============================================================
   输入：Substance[] + ReactionConditions
   输出：ReactionResult
   - 13 维现象描述
   - 物质库：~40 种常见反应物
   - 规则集：酸碱中和 / 金属置换 / 沉淀 / 气体 / 氧化还原 / 配位
   ============================================================ */
window.MR = window.MR || {};
(function () {

  /* ---------------- 1. 物质库（中文名 / 类别 / 化学式） ---------------- */
  var SUBSTANCES = [
    /* 酸 */
    { formula: 'HCl',      name: '盐酸',     category: 'acid',     molar: 36.46 },
    { formula: 'H2SO4',    name: '硫酸',     category: 'acid',     molar: 98.08 },
    { formula: 'HNO3',     name: '硝酸',     category: 'acid',     molar: 63.01 },
    { formula: 'CH3COOH',  name: '乙酸',     category: 'acid',     molar: 60.05, weak: true },
    /* 碱 */
    { formula: 'NaOH',     name: '氢氧化钠', category: 'base',     molar: 40.00 },
    { formula: 'KOH',      name: '氢氧化钾', category: 'base',     molar: 56.11 },
    { formula: 'Ca(OH)2',  name: '氢氧化钙', category: 'base',     molar: 74.10, weak: true },
    { formula: 'NH3·H2O',  name: '氨水',     category: 'base',     molar: 35.05, weak: true },
    /* 盐（中性） */
    { formula: 'NaCl',     name: '氯化钠',   category: 'salt',     molar: 58.44 },
    { formula: 'KNO3',     name: '硝酸钾',   category: 'salt',     molar: 101.10 },
    { formula: 'Na2SO4',   name: '硫酸钠',   category: 'salt',     molar: 142.04 },
    { formula: 'ZnSO4',    name: '硫酸锌',   category: 'salt',     molar: 161.47 },
    { formula: 'MgSO4',    name: '硫酸镁',   category: 'salt',     molar: 120.37 },
    { formula: 'FeSO4',    name: '硫酸亚铁', category: 'salt',     molar: 151.91 },
    { formula: 'FeCl3',    name: '氯化铁',   category: 'salt',     molar: 162.20 },
    { formula: 'CuSO4',    name: '硫酸铜',   category: 'salt',     molar: 159.61 },
    { formula: 'NaNO3',    name: '硝酸钠',   category: 'salt',     molar: 84.99 },
    { formula: 'CuCl2',    name: '氯化铜',   category: 'salt',     molar: 134.45 },
    /* 碳酸盐（产气） */
    { formula: 'CaCO3',     name: '碳酸钙',   category: 'carbonate',molar: 100.09 },
    { formula: 'NaHCO3',    name: '碳酸氢钠', category: 'carbonate',molar: 84.01 },
    { formula: 'Na2CO3',    name: '碳酸钠',   category: 'carbonate',molar: 105.99 },
    { formula: 'NH4Cl',    name: '氯化铵',   category: 'carbonate',molar: 53.49 },
    /* 金属单质 */
    { formula: 'Zn',        name: '锌',       category: 'metal',    molar: 65.38 },
    { formula: 'Fe',        name: '铁',       category: 'metal',    molar: 55.85 },
    { formula: 'Cu',        name: '铜',       category: 'metal',    molar: 63.55 },
    { formula: 'Mg',        name: '镁',       category: 'metal',    molar: 24.31 },
    /* 氧化物 */
    { formula: 'CuO',       name: '氧化铜',   category: 'oxide',    molar: 79.55 },
    { formula: 'Fe2O3',     name: '氧化铁',   category: 'oxide',    molar: 159.69 },
    /* 气体 */
    { formula: 'H2',        name: '氢气',     category: 'gas',      molar: 2.02 },
    { formula: 'O2',        name: '氧气',     category: 'gas',      molar: 32.00 },
    { formula: 'CO2',       name: '二氧化碳', category: 'gas',      molar: 44.01 },
    { formula: 'NH3',       name: '氨气',     category: 'gas',      molar: 17.03 },
    { formula: 'Cl2',       name: '氯气',     category: 'gas',      molar: 70.90 },
    /* 水 */
    { formula: 'H2O',      name: '水',       category: 'water',    molar: 18.02 },
    /* 指示剂 */
    { formula: 'Phenolphthalein', name: '酚酞', category: 'indicator', molar: 318.32 },
    /* 氧化剂 */
    { formula: 'KMnO4',    name: '高锰酸钾', category: 'oxidizer', molar: 158.03 },
    { formula: 'H2O2',     name: '过氧化氢', category: 'oxidizer', molar: 34.01 },
    { formula: 'MnO2',      name: '二氧化锰', category: 'oxidizer', molar: 86.94, catalyst: true },
    /* 还原剂 */
    { formula: 'C',        name: '碳',       category: 'reducer',  molar: 12.01 },
    /* 有机 */
    { formula: 'C6H12O6',  name: '葡萄糖',   category: 'organic',  molar: 180.16 },
    { formula: 'C2H5OH',   name: '乙醇',     category: 'organic',  molar: 46.07 },
    { formula: 'C3H8O3',   name: '甘油',     category: 'organic',  molar: 92.09 },
    /* 配位试剂 */
    { formula: 'KSCN',     name: '硫氰化钾', category: 'other',    molar: 97.18 },
    { formula: 'AgNO3',    name: '硝酸银',   category: 'other',    molar: 169.87 },
    { formula: 'BaCl2',    name: '氯化钡',   category: 'other',    molar: 208.23 },
    /* ------------------ 材料类（paper-aware） ------------------ */
    /* 合金占位符（6061 是 Al-Mg-Si 系，未必进入 chem 池） */
    { formula: 'Al-alloy-6061', name: '6061 铝合金', category: 'alloy', molar: 0,
      alloy: true, composition: 'Al-Mg-Si-Cu', meltingPoint: 660, density: 2.7 },
    { formula: 'Al-alloy-7075', name: '7075 铝合金', category: 'alloy', molar: 0,
      alloy: true, composition: 'Al-Zn-Mg-Cu', meltingPoint: 660, density: 2.81 },
    { formula: 'Mg-alloy-AZ91', name: 'AZ91 镁合金', category: 'alloy', molar: 0,
      alloy: true, composition: 'Mg-Al-Zn', meltingPoint: 595, density: 1.81 },
    { formula: 'Ti-alloy-TC4', name: 'TC4 钛合金', category: 'alloy', molar: 0,
      alloy: true, composition: 'Ti-6Al-4V', meltingPoint: 1668, density: 4.43 },
    /* 纤维 / 树脂（复合材料） */
    { formula: 'Basalt-fiber', name: '玄武岩纤维', category: 'fiber', molar: 0,
      fiber: true, density: 2.65, tensileStrength: 3800 },
    { formula: 'Epoxy-E51', name: '环氧树脂 E-51', category: 'polymer', molar: 0,
      polymer: true, tg: 120, viscosity: 1.2 },
    { formula: 'Hardener', name: '固化剂', category: 'polymer', molar: 0,
      polymer: true, role: 'amine-curing' },
    { formula: 'Silane-KH550', name: 'KH-550 偶联剂', category: 'silane', molar: 221.4,
      surface: true, function: 'amino-silane' },
    /* 胶凝材料（碱激发） */
    { formula: 'Metakaolin', name: '偏高岭土', category: 'mineral', molar: 0,
      mineral: true, reactive: 'Si-Al', source: 'calcined-kaolin' },
    { formula: 'Slag-powder', name: '矿渣粉', category: 'mineral', molar: 0,
      mineral: true, reactive: 'Ca-Al-Si', source: 'GBFS' },
    { formula: 'Water-glass', name: '水玻璃', category: 'mineral', molar: 0,
      mineral: true, activator: 'Na2SiO3', ph: 12 },
    /* 电池正极 / 钠电 */
    { formula: 'NVP', name: 'Na3V2(PO4)3', category: 'cathode', molar: 457.81,
      cathode: true, capacity: 117, voltage: 3.4 },
    { formula: 'V2O5', name: '五氧化二钒', category: 'oxide',   molar: 181.88 },
    { formula: 'NH4H2PO4', name: '磷酸二氢铵', category: 'salt',  molar: 115.03 },
    { formula: 'Citric-acid', name: '柠檬酸', category: 'organic', molar: 192.12,
      weak: true, chelator: true },
    /* 电池辅料 */
    { formula: 'PVDF', name: '聚偏氟乙烯', category: 'polymer', molar: 0,
      polymer: true, binder: true, solvent: 'NMP' },
    { formula: 'Carbon-black', name: '导电炭黑', category: 'carbon', molar: 12.01,
      conductive: true },
    { formula: 'Al-foil', name: '铝箔', category: 'metal', molar: 26.98 },
    { formula: 'Glucose-C6H12O6', name: '葡萄糖', category: 'organic', molar: 180.16 },
    { formula: 'Yeast', name: '酵母', category: 'bio', molar: 0,
      biocatalyst: true },
    { formula: 'Ag-ammine', name: '银氨溶液', category: 'other', molar: 0,
      complex: '[Ag(NH3)2]+' },
    { formula: 'Sodium-metal', name: '金属钠', category: 'metal', molar: 22.99 },
    /* 沉淀/产物 */
    { formula: 'Mg2Si', name: 'Mg₂Si', category: 'precipitate', molar: 76.71 },
    { formula: 'Mg(OH)2', name: '氢氧化镁', category: 'precipitate', molar: 58.32 },
    { formula: 'Al(OH)3', name: '氢氧化铝', category: 'precipitate', molar: 78.00 },
    { formula: 'Fe2O3-hydrate', name: 'Fe₂O₃·xH₂O（铁锈）', category: 'precipitate', molar: 178.69 },
    { formula: 'CASH-gel', name: 'C-A-S-H 凝胶', category: 'mineral', molar: 0,
      gel: true, cementitious: true },
    { formula: 'NASICON-C', name: '碳包覆 NASICON', category: 'cathode', molar: 0,
      coated: true, parent: 'NVP', coating: 'carbon' },
    { formula: 'C2H5OH', name: '乙醇', category: 'organic', molar: 46.07 }
  ];

  /* 名称归一化表（带 / 后缀 / 别名） */
  var NAME_ALIASES = {
    '盐酸':'HCl','硫酸':'H2SO4','硝酸':'HNO3','乙酸':'CH3COOH','醋酸':'CH3COOH',
    '氢氧化钠':'NaOH','烧碱':'NaOH','NaOH':'NaOH',
    '氢氧化钙':'Ca(OH)2','熟石灰':'Ca(OH)2','石灰水':'Ca(OH)2','澄清石灰水':'Ca(OH)2',
    '氨水':'NH3·H2O','氨气':'NH3','氢氧化钾':'KOH',
    '氯化钠':'NaCl','硝酸钾':'KNO3','硫酸钠':'Na2SO4','硫酸锌':'ZnSO4','硫酸镁':'MgSO4','硫酸亚铁':'FeSO4',
    '氯化铁':'FeCl3','硫酸铜':'CuSO4','硝酸钠':'NaNO3','氯化铜':'CuCl2',
    '碳酸钙':'CaCO3','大理石':'CaCO3','碳酸氢钠':'NaHCO3','小苏打':'NaHCO3','碳酸钠':'Na2CO3','纯碱':'Na2CO3',
    '氯化铵':'NH4Cl','锌':'Zn','锌粒':'Zn','铁':'Fe','铁钉':'Fe','铜':'Cu','铜丝':'Cu','镁':'Mg','镁条':'Mg',
    '氧化铜':'CuO','氧化铁':'Fe2O3','氢气':'H2','氧气':'O2','二氧化碳':'CO2','CO2':'CO2',
    '氯气':'Cl2','水':'H2O','蒸馏水':'H2O',
    '酚酞':'Phenolphthalein','酚酞指示剂':'Phenolphthalein',
    '高锰酸钾':'KMnO4','过氧化氢':'H2O2','二氧化锰':'MnO2',
    '碳':'C','葡萄糖':'C6H12O6','乙醇':'C2H5OH','酒精':'C2H5OH','甘油':'C3H8O3','无水乙醇':'C2H5OH',
    '硫氰化钾':'KSCN','硫氰酸钾':'KSCN','硝酸银':'AgNO3','氯化钡':'BaCl2',
    '锌粒':'Zn','食醋':'CH3COOH',
    /* paper-aware 映射 */
    '6061 铝合金':'Al-alloy-6061','6061铝合金':'Al-alloy-6061','6061':'Al-alloy-6061',
    '7075 铝合金':'Al-alloy-7075','7075铝合金':'Al-alloy-7075','7075':'Al-alloy-7075',
    'AZ91 镁合金':'Mg-alloy-AZ91','AZ91':'Mg-alloy-AZ91','镁合金':'Mg-alloy-AZ91',
    'TC4':'Ti-alloy-TC4','钛合金':'Ti-alloy-TC4',
    '玄武岩纤维':'Basalt-fiber','玄武岩':'Basalt-fiber','basalt':'Basalt-fiber',
    '环氧树脂':'Epoxy-E51','环氧树脂 E-51':'Epoxy-E51','E51':'Epoxy-E51','E-51':'Epoxy-E51',
    '固化剂':'Hardener',
    'KH-550':'Silane-KH550','KH550':'Silane-KH550','硅烷偶联剂':'Silane-KH550','偶联剂':'Silane-KH550',
    '偏高岭土':'Metakaolin','metakaolin':'Metakaolin',
    '矿渣粉':'Slag-powder','矿渣':'Slag-powder','高炉矿渣':'Slag-powder','GBFS':'Slag-powder',
    '水玻璃':'Water-glass','硅酸钠':'Water-glass','Na2SiO3':'Water-glass',
    'Na3V2(PO4)3':'NVP','Na3V2(PO4)₃':'NVP','磷酸钒钠':'NVP','NASICON':'NVP',
    '五氧化二钒':'V2O5','V2O5':'V2O5',
    '磷酸二氢铵':'NH4H2PO4','NH4H2PO4':'NH4H2PO4',
    '柠檬酸':'Citric-acid','citric acid':'Citric-acid',
    '聚偏氟乙烯':'PVDF','PVDF':'PVDF',
    '导电炭黑':'Carbon-black','炭黑':'Carbon-black','Super P':'Carbon-black',
    '铝箔':'Al-foil',
    '葡萄糖':'Glucose-C6H12O6',
    '酵母':'Yeast','酵母粉':'Yeast',
    '银氨溶液':'Ag-ammine','银氨':'Ag-ammine','[Ag(NH3)2]+':'Ag-ammine',
    '金属钠':'Sodium-metal','钠':'Sodium-metal',
    '氢氧化镁':'Mg(OH)2',
    '氢氧化铝':'Al(OH)3',
    'Mg₂Si':'Mg2Si','Mg2Si':'Mg2Si'
  };

  function resolveSubstance(name){
    if (!name) return null;
    var key = String(name).trim();
    /* 先查精确别名 */
    if (NAME_ALIASES[key]) {
      var formula = NAME_ALIASES[key];
      return findByFormula(formula);
    }
    /* 否则用原始名查物质库 */
    for (var i = 0; i < SUBSTANCES.length; i++) {
      if (SUBSTANCES[i].name === key || SUBSTANCES[i].formula === key) return SUBSTANCES[i];
    }
    /* 模糊匹配：strip 前缀浓度、容器词、括号补充 */
    var stripped = key
      .replace(/^0?\.\d+\s*mol\/L\s*/i, '')   // "0.1 mol/L 盐酸" → "盐酸"
      .replace(/^\d+%\s*/, '')                 // "5% 食醋" → "食醋"
      .replace(/\(\s*\d+%\s*\)/g, '')          // "食醋(5%)" → "食醋"
      .replace(/\s*(溶液|固体|粉末|晶体|标准液|标准溶液|待测|母液|稀溶液)\s*/g, '') // 剥常见容器词
      .trim();
    if (stripped && stripped !== key) {
      if (NAME_ALIASES[stripped]) return findByFormula(NAME_ALIASES[stripped]);
      for (var j = 0; j < SUBSTANCES.length; j++) {
        if (SUBSTANCES[j].name === stripped) return SUBSTANCES[j];
      }
    }
    return null;
  }
  function findByFormula(formula){
    for (var i = 0; i < SUBSTANCES.length; i++) if (SUBSTANCES[i].formula === formula) return SUBSTANCES[i];
    return null;
  }
  function findByCategory(inputs, cat){
    for (var i = 0; i < inputs.length; i++) if (inputs[i].category === cat) return inputs[i];
    return null;
  }
  function hasCategory(inputs, cat){
    for (var i = 0; i < inputs.length; i++) if (inputs[i].category === cat) return true;
    return false;
  }
  function hasFormula(inputs, formula){
    for (var i = 0; i < inputs.length; i++) if (inputs[i].formula === formula) return true;
    return false;
  }

  /* ---------------- 2. 反应规则 ---------------- */
  function acidBaseNeutralization(inputs){
    var acid = findByCategory(inputs, 'acid');
    var base = findByCategory(inputs, 'base');
    if (!acid || !base) return null;
    /* 强酸强碱放热；弱酸弱碱仅微热 */
    var isStrongAcid = !acid.weak;
    var isStrongBase = !base.weak;
    var thermal = (isStrongAcid && isStrongBase) ? 'exothermic' : 'none';
    return {
      reacted: true,
      products: [
        { formula: 'salt', name: '盐', category: 'salt' },
        { formula: 'H2O', name: '水', category: 'water' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: false,
      thermal: thermal,
      phTrend: 'neutral',
      equation: acid.formula + ' + ' + base.formula + ' → 盐 + H₂O',
      description: '酸碱中和反应，生成盐和水，' + (thermal === 'exothermic' ? '放出热量' : '无明显热效应') + '。'
    };
  }

  function metalAcid(inputs){
    var metal = findByCategory(inputs, 'metal');
    var acid = findByCategory(inputs, 'acid');
    if (!metal || !acid) return null;
    /* 铜不反应；强酸才能跟金属反应 */
    if (metal.formula === 'Cu') return null;
    if (acid.formula === 'H2SO4' && metal.formula === 'Fe') return null;  /* 浓硫酸钝化 */
    return {
      reacted: true,
      products: [
        { formula: metal.formula + '-salt', name: '盐', category: 'salt' },
        { formula: 'H2', name: '氢气', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'exothermic',
      phTrend: 'increase',
      equation: metal.formula + ' + 酸 → 盐 + H₂↑',
      description: '活泼金属与酸反应生成盐并放出氢气，伴有气泡，反应放热。'
    };
  }

  function carbonateAcid(inputs){
    var acid = findByCategory(inputs, 'acid');
    var carb = findByCategory(inputs, 'carbonate');
    if (!acid || !carb) return null;
    var gas = carb.formula === 'CaCO3' || carb.formula.indexOf('CO3') !== -1 ? 'CO2' : null;
    if (!gas) return null;
    return {
      reacted: true,
      products: [
        { formula: carb.formula.replace(/CO3$/, '') + 'Cl2', name: '盐', category: 'salt' },
        { formula: 'H2O', name: '水', category: 'water' },
        { formula: 'CO2', name: '二氧化碳', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: carb.formula + ' + 2' + acid.formula + ' → 盐 + H₂O + CO₂↑',
      description: '碳酸盐与酸反应生成 CO₂ 气体，常用启普发生器收集。'
    };
  }

  function agno3WithCl(inputs){
    var hasAg = false, hasCl = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'AgNO3') hasAg = true;
      if (inputs[i].formula === 'NaCl' || inputs[i].formula === 'HCl' || inputs[i].formula === 'BaCl2' || inputs[i].formula === 'NH4Cl' || inputs[i].formula === 'CuCl2' || inputs[i].formula === 'FeCl3') hasCl = true;
    }
    if (!hasAg || !hasCl) return null;
    return {
      reacted: true,
      products: [
        { formula: 'AgCl', name: '氯化银', category: 'salt' },
        { formula: 'NaNO3', name: '硝酸钠', category: 'salt' }
      ],
      producesGas: false,
      producesPrecipitate: true,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: 'AgNO₃ + Cl⁻ → AgCl↓ + NO₃⁻',
      description: '可溶性氯化物与硝酸银反应，生成白色氯化银沉淀（不溶于稀硝酸），用于氯离子检验。'
    };
  }

  function baso4Precipitate(inputs){
    if (!hasFormula(inputs, 'BaCl2') || !hasFormula(inputs, 'Na2SO4')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'BaSO4', name: '硫酸钡', category: 'salt' },
        { formula: 'NaCl', name: '氯化钠', category: 'salt' }
      ],
      producesGas: false,
      producesPrecipitate: true,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: 'BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl',
      description: '生成白色硫酸钡沉淀，不溶于强酸，医学上用作钡餐。'
    };
  }

  function cuSo4Naoh(inputs){
    if (!hasFormula(inputs, 'CuSO4') || !hasFormula(inputs, 'NaOH')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Cu(OH)2', name: '氢氧化铜', category: 'salt' },
        { formula: 'Na2SO4', name: '硫酸钠', category: 'salt' }
      ],
      producesGas: false,
      producesPrecipitate: true,
      colorChange: true,
      thermal: 'none',
      phTrend: 'increase',
      equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
      description: '生成蓝色絮状氢氧化铜沉淀。'
    };
  }

  function feDisplacementCu(inputs){
    if (!hasFormula(inputs, 'Fe') || !hasFormula(inputs, 'CuSO4')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'FeSO4', name: '硫酸亚铁', category: 'salt' },
        { formula: 'Cu', name: '铜', category: 'metal' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: 'Fe + CuSO₄ → FeSO₄ + Cu',
      description: '铁比铜活泼，置换出金属铜沉积在铁钉表面，溶液由蓝变浅绿。'
    };
  }

  function h2o2Decomposition(inputs){
    if (!hasFormula(inputs, 'H2O2')) return null;
    var hasCatalyst = hasFormula(inputs, 'MnO2');
    return {
      reacted: true,
      products: [
        { formula: 'H2O', name: '水', category: 'water' },
        { formula: 'O2', name: '氧气', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: '2H₂O₂ —' + (hasCatalyst ? 'MnO₂' : 'Δ') + '→ 2H₂O + O₂↑',
      description: '过氧化氢分解生成水和氧气' + (hasCatalyst ? '，二氧化锰为催化剂。' : '。')
    };
  }

  function nh3CuDeepBlue(inputs){
    if (!hasFormula(inputs, 'CuSO4')) return null;
    var hasNH3 = hasFormula(inputs, 'NH3·H2O');
    if (!hasNH3) return null;
    return {
      reacted: true,
      products: [
        { formula: '[Cu(NH3)4]2+', name: '铜氨配离子', category: 'other' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'none',
      phTrend: 'increase',
      equation: 'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺',
      description: '硫酸铜加过量氨水生成深蓝色铜氨配离子，常用于络合滴定。'
    };
  }

  function fe3ScnBloodRed(inputs){
    if (!hasFormula(inputs, 'FeCl3') || !hasFormula(inputs, 'KSCN')) return null;
    return {
      reacted: true,
      products: [
        { formula: '[Fe(SCN)]2+', name: '硫氰合铁配离子', category: 'other' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: 'Fe³⁺ + SCN⁻ → [Fe(SCN)]²⁺',
      description: '生成血红色硫氰合铁配离子，用于 Fe³⁺ 检验；是可逆反应。'
    };
  }

  function cuoAcid(inputs){
    if (!hasFormula(inputs, 'CuO')) return null;
    var acid = findByCategory(inputs, 'acid');
    if (!acid) return null;
    return {
      reacted: true,
      products: [
        { formula: 'CuSO4', name: '硫酸铜', category: 'salt' },
        { formula: 'H2O', name: '水', category: 'water' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: 'CuO + H₂SO₄ → CuSO₄ + H₂O',
      description: '黑色氧化铜溶于稀硫酸生成蓝色硫酸铜溶液，是碱性氧化物与酸反应的典型。'
    };
  }

  function cuoH2Reduction(inputs){
    if (!hasFormula(inputs, 'H2') || !hasFormula(inputs, 'CuO')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Cu', name: '铜', category: 'metal' },
        { formula: 'H2O', name: '水', category: 'water' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: 'H₂ + CuO —Δ→ Cu + H₂O',
      description: '氢气还原氧化铜，黑色粉末逐渐变红，是典型的氧化还原反应。'
    };
  }

  function electrolysisCuCl2(inputs){
    if (!hasFormula(inputs, 'CuCl2')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Cu', name: '铜（阴极）', category: 'metal' },
        { formula: 'Cl2', name: '氯气（阳极）', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: '阴极：Cu²⁺ + 2e⁻ → Cu；阳极：2Cl⁻ - 2e⁻ → Cl₂↑',
      description: '电解氯化铜溶液：阴极红色铜析出，阳极产生黄绿色氯气，可用湿润淀粉 KI 试纸检验。',
      requiresPower: true
    };
  }

  function znoAcetateSimplified(inputs){
    /* Zn + 2NaOH（复杂反应，简化） */
    if (!hasFormula(inputs, 'Zn') || !hasFormula(inputs, 'NaOH')) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Na2ZnO2', name: '锌酸钠', category: 'salt' },
        { formula: 'H2', name: '氢气', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: 'Zn + 2NaOH → Na₂ZnO₂ + H₂↑',
      description: '锌是两性金属，能与强碱反应放出氢气。'
    };
  }

  /* ---------------- paper-aware 反应规则（材料类） ---------------- */

  /* 热处理模拟：合金 + 温度/时间变量 → 峰值在某一温度
     inputs 需含 alloy，conditionByName 含 temperature/time */
  function heatTreatmentSim(inputs, conditionByName){
    var alloy = null;
    for (var i = 0; i < inputs.length; i++) if (inputs[i].alloy) { alloy = inputs[i]; break; }
    if (!alloy) return null;
    var T = parseFloat(conditionByName.temperature);
    var t = parseFloat(conditionByName.time);
    if (!T || !t) return null;
    /* 简化模型：屈服强度 = K * exp(-((T-Topt)/sigma)^2) * exp(-((t-topt)/sigmaT)^2)
       不同合金给不同最优工艺窗口 */
    var params = {
      'Al-alloy-6061': { Topt: 530, sigma: 25, topt: 6,  sigmaT: 3, K: 290, unit: 'MPa' },
      'Al-alloy-7075': { Topt: 470, sigma: 20, topt: 8,  sigmaT: 4, K: 540, unit: 'MPa' },
      'Mg-alloy-AZ91': { Topt: 410, sigma: 30, topt: 12, sigmaT: 6, K: 220, unit: 'MPa' },
      'Ti-alloy-TC4':  { Topt: 720, sigma: 40, topt: 4,  sigmaT: 2, K: 920, unit: 'MPa' }
    }[alloy.formula] || { Topt: 500, sigma: 25, topt: 6, sigmaT: 3, K: 250, unit: 'MPa' };
    var sigmaStrength = params.K *
      Math.exp(-Math.pow((T - params.Topt) / params.sigma, 2)) *
      Math.exp(-Math.pow((t - params.topt) / params.sigmaT, 2));
    return {
      reacted: true,
      paperType: 'heat-treatment',
      products: [
        { formula: alloy.formula + '-HT', name: alloy.name + '（峰值时效态）', category: alloy.category }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'endothermic',
      phTrend: 'neutral',
      equation: alloy.name + '  + ' + T + '°C × ' + t + 'h → 强化相析出',
      description: '固溶+时效处理模拟：在 ' + T + '°C × ' + t + 'h 下，估算强度 ≈ ' + sigmaStrength.toFixed(1) + ' ' + params.unit +
        '（最优工艺 ' + params.Topt + '°C × ' + params.topt + 'h @ ' + params.K + ' ' + params.unit + '）。',
      indicators: [{
        name: '估算强度', value: sigmaStrength, unit: params.unit,
        optimum: { x: T, y: sigmaStrength, Topt: params.Topt, topt: params.topt, K: params.K }
      }],
      metadata: { alloy: alloy.formula, temperature: T, time: t, params: params }
    };
  }

  /* 碱激发胶凝：矿粉 + 偏高岭土 + 水玻璃 → C-A-S-H gel */
  function alkaliActivationSim(inputs){
    var hasSlag = false, hasMeta = false, hasWG = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'Slag-powder') hasSlag = true;
      if (inputs[i].formula === 'Metakaolin')   hasMeta = true;
      if (inputs[i].formula === 'Water-glass')  hasWG   = true;
    }
    if (!hasWG || (!hasSlag && !hasMeta)) return null;
    return {
      reacted: true,
      paperType: 'alkali-activation',
      products: [
        { formula: 'CASH-gel', name: 'C-A-S-H 凝胶', category: 'mineral' },
        { formula: 'Na2SiO3-res', name: '碱激发残液', category: 'salt' }
      ],
      producesGas: false,
      producesPrecipitate: true,
      colorChange: false,
      thermal: 'exothermic',
      phTrend: 'increase',
      equation: (hasSlag ? '矿渣 + ' : '偏高岭土 + ') + '水玻璃 → C-A-S-H 凝胶 + Na-残液',
      description: '碱激发胶凝模拟：水玻璃作激活剂，在 28 天养护下生成 C-A-S-H 凝胶，28d 抗压强度可达 30–60 MPa。',
      metadata: { hasSlag: hasSlag, hasMeta: hasMeta, hasWG: hasWG }
    };
  }

  /* 溶胶-凝胶 + 碳包覆：NVP + 柠檬酸 + 葡萄糖 → NASICON/C */
  function carbonCoatingSim(inputs){
    var hasNVP = false, hasCSource = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'NVP') hasNVP = true;
      if (inputs[i].formula === 'Citric-acid' || inputs[i].formula === 'Glucose-C6H12O6') hasCSource = true;
    }
    if (!hasNVP || !hasCSource) return null;
    var carbonFraction = hasCSource ? 5 : 0;
    var capacity = (hasCSource) ? 113 : 102;
    return {
      reacted: true,
      paperType: 'sol-gel-carbon-coating',
      products: [
        { formula: 'NASICON-C', name: '碳包覆 Na3V2(PO4)3', category: 'cathode' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'endothermic',
      phTrend: 'neutral',
      equation: 'Na3V2(PO4)3 + C源 —高温→ C包覆 NASICON',
      description: '碳包覆提供导电网络，估算容量 ≈ ' + capacity + ' mAh/g（理论 117），' + carbonFraction + '% 碳。',
      indicators: [
        { name: '估算容量', value: capacity, unit: 'mAh/g' }
      ],
      metadata: { carbonFraction: carbonFraction, capacity: capacity }
    };
  }

  /* 银镜反应：葡萄糖 + 银氨 → 银镜 */
  function silverMirrorReaction(inputs){
    var hasGlu = false, hasAg = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'Glucose-C6H12O6') hasGlu = true;
      if (inputs[i].formula === 'Ag-ammine') hasAg = true;
    }
    if (!hasGlu || !hasAg) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Ag', name: '银（银镜）', category: 'metal' },
        { formula: 'C6H12O7', name: '葡萄糖酸', category: 'organic' }
      ],
      producesGas: false,
      producesPrecipitate: false,
      colorChange: true,
      thermal: 'endothermic',
      phTrend: 'neutral',
      equation: 'CHO-(CHOH)4-CH2OH + 2[Ag(NH3)2]+ + 2OH- → Ag↓ + ...',
      description: '葡萄糖醛基被银氨氧化，析出银沉积于试管内壁。'
    };
  }

  /* 葡萄糖发酵：葡萄糖 + 酵母 → 乙醇 + CO2 */
  function fermentationSim(inputs){
    var hasGlu = false, hasYeast = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'Glucose-C6H12O6') hasGlu = true;
      if (inputs[i].formula === 'Yeast') hasYeast = true;
    }
    if (!hasGlu || !hasYeast) return null;
    return {
      reacted: true,
      products: [
        { formula: 'C2H5OH', name: '乙醇', category: 'organic' },
        { formula: 'CO2',    name: '二氧化碳', category: 'gas' }
      ],
      producesGas: true,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'exothermic',
      phTrend: 'neutral',
      equation: 'C₆H₁₂O₆ —酵母→ 2C₂H₅OH + 2CO₂↑',
      description: '酵母在无氧条件下发酵葡萄糖生成乙醇与 CO₂'
    };
  }

  /* 铁生锈：Fe + H2O + O2 → Fe2O3·xH2O */
  function ironRusting(inputs){
    var hasFe = false, hasH2O = false, hasO2 = false;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].formula === 'Fe') hasFe = true;
      if (inputs[i].formula === 'H2O') hasH2O = true;
      if (inputs[i].formula === 'O2') hasO2 = true;
    }
    if (!hasFe || !hasH2O || !hasO2) return null;
    return {
      reacted: true,
      products: [
        { formula: 'Fe2O3-hydrate', name: '铁锈 Fe₂O₃·xH₂O', category: 'precipitate' }
      ],
      producesGas: false,
      producesPrecipitate: true,
      colorChange: true,
      thermal: 'none',
      phTrend: 'neutral',
      equation: '4Fe + 3O₂ + xH₂O → 2Fe₂O₃·xH₂O',
      description: '吸氧腐蚀：铁在有水有氧时生锈，对比实验中盐水加快速率。'
    };
  }

  /* 规则数组（按优先级排序：特异性强的在前） */
  var REACTIONS = [
    carbonCoatingSim,
    alkaliActivationSim,
    heatTreatmentSim,
    silverMirrorReaction,
    fermentationSim,
    ironRusting,
    agno3WithCl,
    baso4Precipitate,
    cuSo4Naoh,
    fe3ScnBloodRed,
    nh3CuDeepBlue,
    h2o2Decomposition,
    feDisplacementCu,
    carbonateAcid,
    cuoH2Reduction,
    cuoAcid,
    znoAcetateSimplified,
    metalAcid,
    electrolysisCuCl2,
    acidBaseNeutralization
  ];

  function noReaction(inputs){
    return {
      reacted: false,
      products: inputs.slice(),
      producesGas: false,
      producesPrecipitate: false,
      colorChange: false,
      thermal: 'none',
      phTrend: 'unknown',
      equation: '',
      description: '当前条件下未观察到明显反应。'
    };
  }

  /* ---------------- 3. 主入口 ---------------- */
  function react(inputNames, conditionByName){
    conditionByName = conditionByName || {};
    var inputs = [];
    for (var i = 0; i < inputNames.length; i++) {
      var s = resolveSubstance(inputNames[i]);
      if (s) inputs.push(s);
    }
    if (inputs.length < 2 && !inputs.some(function (x) { return x.alloy; })) return noReaction(inputs);
    for (var j = 0; j < REACTIONS.length; j++) {
      var r = REACTIONS[j](inputs, conditionByName);
      if (r) return Object.assign({ inputs: inputNames.slice() }, r);
    }
    return noReaction(inputs);
  }

  /* ---------------- 4. 产物 3D 解析 ---------------- */
  /* 把产物的 formula 串拆成 3D 分子所需的原子 + 位置） */
  function parseFormulaFor3D(formula){
    if (!formula) return { atoms: [] };
    /* 简化解析：只识别元素符号 + 下标；忽略 ()/系数 */
    var clean = formula.replace(/[\[\]\(\)]/g, '').replace(/\d+\b/g, function(m){ return m.length>1?'_'+m:''; });
    var re = /([A-Z][a-z]?)/g;
    var atoms = [];
    var i = 0, idx = 0;
    while ((m = re.exec(clean)) !== null) {
      atoms.push({ el: m[1], n: idx++ });
    }
    return { atoms: atoms };
  }

  /* 挂载到 MR */
  MR.chem = {
    SUBSTANCES: SUBSTANCES,
    NAME_ALIASES: NAME_ALIASES,
    resolveSubstance: resolveSubstance,
    findByFormula: findByFormula,
    findByCategory: findByCategory,
    react: react,
    parseFormulaFor3D: parseFormulaFor3D,
    REACTIONS: REACTIONS
  };

})();