/* ============================================================
   forge.js ·  实验工坊（独立页 forge.html 用）
   ============================================================
   把 zhangifonly/ChemAIForge 的 4 套化学引擎，
   chaxiAI/chemtools 的 7 个工具模块，
   加上 lab-chem / lab-experiments，
   封装成一个统一 namespace `MR.forge`，
   让 forge.html / app.html 都共用。
   ============================================================ */
window.MR = window.MR || {};
(function () {

  /* ---------- 1. 把 chemtools 的 Chem / Tools / RAW_ELEMENTS 桥接进来 ---------- */
  function safeGet(name) { try { return window[name]; } catch (e) { return null; } }

  var chemtools = {
    Chem:   safeGet('Chem'),
    Tools:  safeGet('Tools'),
    ELEM:   window.RAW_ELEMENTS || [],
    NLP:    safeGet('ChemNLP'),
    MoleculeViewer: safeGet('MoleculeViewer'),
    ReactionViewer: safeGet('ReactionViewer'),
    HeatmapData: safeGet('HeatmapData')
  };

  /* ---------- 2. ChemAIForge 风格的 4 套引擎（纯 JS，前端可跑） ---------- */
  /* (1) react —— 反应模拟：取自既有 MR.chem.react，补充产物颜色表 */
  function forgeReact(inputNames, opts) {
    opts = opts || {};
    if (!MR.chem || !MR.chem.react) return { reacted: false, description: '化学引擎未加载', inputs: inputNames };
    return MR.chem.react(inputNames, opts);
  }

  /* (2) electrolyze —— 定量电解（法拉第定律） */
  function forgeElectrolyze(solution, current, timeSec) {
    var F = 96485; /* 库仑/摩尔 */
    var Q = (current || 1) * (timeSec || 60); /* C */
    var moles = Q / F;
    var out = { charge_C: Q, moles_electrons: moles, products: [], log: [] };
    var sol = (solution || '').toLowerCase();
    var pull = {};
    if (/cucl2|氯化铜/.test(sol)) {
      pull.cathode = { element: 'Cu', moles: moles / 2, mass_g: (moles / 2) * 63.55 };
      pull.anode  = { element: 'Cl2', moles: moles, mass_g: (moles) * 70.90 };
    } else if (/cuso4|硫酸铜/.test(sol)) {
      pull.cathode = { element: 'Cu', moles: moles / 2, mass_g: (moles / 2) * 63.55 };
      pull.anode  = { element: 'O2', moles: moles / 4, mass_g: (moles / 4) * 32.00 };
    } else if (/h2o|水/.test(sol)) {
      pull.cathode = { element: 'H2', moles: moles / 2, mass_g: (moles / 2) * 2.02 };
      pull.anode  = { element: 'O2', moles: moles / 4, mass_g: (moles / 4) * 32.00 };
    } else if (/nacl|食盐水/.test(sol)) {
      pull.cathode = { element: 'H2', moles: moles / 2, mass_g: (moles / 2) * 2.02 };
      pull.anode  = { element: 'Cl2', moles: moles, mass_g: moles * 70.90 };
    } else if (/naso4|na2so4|硫酸钠/.test(sol)) {
      pull.cathode = { element: 'H2', moles: moles / 2, mass_g: (moles / 2) * 2.02 };
      pull.anode  = { element: 'O2', moles: moles / 4, mass_g: (moles / 4) * 32.00 };
    } else if (/ag/.test(sol)) {
      pull.cathode = { element: 'Ag', moles: moles, mass_g: moles * 107.87 };
      pull.anode  = { element: 'O2', moles: moles / 4, mass_g: (moles / 4) * 32.00 };
    } else {
      pull.cathode = { element: 'H2', moles: moles / 2, mass_g: (moles / 2) * 2.02 };
      pull.anode  = { element: 'O2', moles: moles / 4, mass_g: (moles / 4) * 32.00 };
    }
    if (pull.cathode) { out.products.push({ at: '阴极', formula: pull.cathode.element, mass_g: pull.cathode.mass_g, moles: pull.cathode.moles }); out.log.push('阴极: ' + pull.cathode.element + ' 析出 ' + pull.cathode.mass_g.toFixed(3) + ' g'); }
    if (pull.anode) { out.products.push({ at: '阳极', formula: pull.anode.element, mass_g: pull.anode.mass_g, moles: pull.anode.moles }); out.log.push('阳极: ' + pull.anode.element + ' 释放 ' + pull.anode.mass_g.toFixed(3) + ' g'); }
    out.description = '电解 ' + (solution || '未知溶液') + ' @ ' + (current || 1) + ' A × ' + (timeSec || 60) + ' s, 转移电荷 ' + Q.toFixed(1) + ' C';
    return out;
  }

  /* (3) galvanicCell —— 原电池 */
  function forgeGalvanicCell(metalA, metalB, electrolyte) {
    var series = { Li: -3.04, K: -2.93, Na: -2.71, Mg: -2.37, Al: -1.66, Zn: -0.76, Cr: -0.74, Fe: -0.44, Cd: -0.40, Ni: -0.25, Sn: -0.14, Pb: -0.13, H: 0, Cu: 0.34, Ag: 0.80, Au: 1.50, Pt: 1.18, C: 0.21 };
    var e1 = series[metalA] != null ? series[metalA] : null;
    var e2 = series[metalB] != null ? series[metalB] : null;
    if (e1 == null || e2 == null) return { emf: null, electrodes: { A: metalA, B: metalB }, description: '未识别的金属，请输入元素符号' };
    var neg = e1 < e2 ? metalA : metalB;
    var pos = e1 < e2 ? metalB : metalA;
    var emf = Math.abs(e1 - e2);
    return {
      emf: emf, electrodes: { negative: neg, positive: pos, anode: neg, cathode: pos },
      electrolyte: electrolyte || 'H2SO4',
      description: neg + '–' + pos + ' 原电池在 ' + (electrolyte || 'H2SO4') + ' 中的电动势 ≈ ' + emf.toFixed(2) + ' V（' + neg + ' 为负极，' + pos + ' 为正极）',
      reactions: {
        anode:  neg + ' − ' + Math.abs(series[neg]).toFixed(2) + 'e⁻ → ' + (neg === 'Zn' ? 'Zn²⁺' : neg + 'ⁿ⁺'),
        cathode: pos + 'ⁿ⁺ + ' + Math.abs(series[pos]).toFixed(2) + 'e⁻ → ' + pos
      }
    };
  }

  /* (4) conductivity —— 溶液导电性 */
  function forgeConductivity(solution) {
    var map = [
      { test: /^(hcl|hno3|h2so4|hbr|hi)$/, kind: '强酸', level: 4 },
      { test: /^(naoh|koh|ba(oh)2|cs)$/, kind: '强碱', level: 4 },
      { test: /nacl|kno3|cacl2|mgs04|nh4no3|na2so4|cuso4|kcl|nacl|k2so4|nano3|ki|nacl/, kind: '强电解质（盐）', level: 3 },
      { test: /ch3cooh|acetic|醋|hf|hcooh|h2s|hclo|h3po4|citric|柠檬|c6h8o7|酒石|草酸|碳酸|h2co3|h3bo3/, kind: '弱酸', level: 1 },
      { test: /nh3|氨|弱碱/, kind: '弱碱', level: 1 },
      { test: /h2o|water|蒸馏/, kind: '极弱（纯水）', level: 0 },
      { test: /c2h5oh|ethanol|无水乙醇|c6h12o6|glucose|蔗糖|蔗|c12h22o11|starch|淀粉/, kind: '非电解质', level: 0 }
    ];
    var key = (solution || '').toLowerCase().replace(/\s|·|·|·/g, '');
    for (var i = 0; i < map.length; i++) {
      if (map[i].test.test(solution || '') || map[i].test.test(key)) {
        var lv = map[i].level;
        return {
          solution: solution, kind: map[i].kind,
          level: lv, levelLabel: ['极弱', '弱', '中等', '强', '很强'][lv] || '—',
          lightsBulb: lv >= 2, dimsBulb: lv === 1, noLight: lv === 0,
          description: solution + '：' + map[i].kind + ' → 导电性 ' + ['极弱', '弱', '中等', '强', '很强'][lv] + '（灯泡' + (lv >= 2 ? '亮' : (lv === 1 ? '暗淡' : '不亮')) + '）'
        };
      }
    }
    return { solution: solution, kind: '未知', level: 0, lightsBulb: false, description: '未在常见溶液库里，请人工判断。' };
  }

  /* ---------- 3. 统一暴露 ---------- */
  MR.forge = {
    /* ChemAIForge 风格 4 引擎 */
    react: forgeReact,
    electrolyze: forgeElectrolyze,
    galvanicCell: forgeGalvanicCell,
    conductivity: forgeConductivity,
    /* chaxiAI/chemtools 桥接 */
    chemtools: chemtools,
    /* 既有 lab-chem 仍可用：MR.chem / MR.experiments / MR.experimentKeywords / MR.matchExperiment / MR.findExperimentsForProfile */
    /* 工具：称量溶液配制需要 chemtools.Tools */
    molarMass: function (formula) {
      if (chemtools.Chem && chemtools.Chem.molarMass) return chemtools.Chem.molarMass(formula);
      return { mass: null, source: 'chemtools 未加载' };
    },
    /* 元素周期表 */
    elements: chemtools.ELEM,
    /* 工具：溶解度/溶液配制 —— chemtools.Tools 实际 API：dilution / prepareSolid / convertConc */
    dilute: function (vals) {
      if (!chemtools.Tools) return { error: 'chemtools.Tools 未加载' };
      return chemtools.Tools.dilution(vals);
    },
    prepareSolid: function (o) {
      if (!chemtools.Tools) return { error: 'chemtools.Tools 未加载' };
      return chemtools.Tools.prepareSolid(o);
    },
    convertConc: function (o) {
      if (!chemtools.Tools) return { error: 'chemtools.Tools 未加载' };
      return chemtools.Tools.convertConc(o);
    },
    /* 单位换算 —— chemtools.Tools.convert(kind, value, fromId, toId) */
    unitConvert: function (cat, fromId, toId, val) {
      if (!chemtools.Tools) return { error: 'chemtools.Tools 未加载' };
      return chemtools.Tools.convert(cat, val, fromId, toId);
    },
    /* 方程式配平 —— chemtools.Chem.balance(eq) */
    balanceEquation: function (eq) {
      if (chemtools.Chem && chemtools.Chem.balance) return chemtools.Chem.balance(eq);
      return { error: 'chemtools.Chem.balance 不存在' };
    },
    /* 化学式解析 */
    parseFormula: function (f) {
      if (chemtools.Chem && chemtools.Chem.parseFormula) return chemtools.Chem.parseFormula(f);
      return { error: 'chemtools.Chem.parseFormula 不存在' };
    },
    /* 自然语言反应解析（"氮气与氢气生成氨气，氮气过量"） */
    nlp: function (text) {
      if (chemtools.NLP && chemtools.NLP.parse) return chemtools.NLP.parse(text);
      return { error: 'chemtools.NLP 未加载' };
    },
    /* 通过 window.MR.viewExp / MR.viewPlan 等已有微件挂载入口也可调 */
    isReady: !!(window.MR && window.MR.chem)
  };

})();
