/* 自然语言反应场景解析 + 限量反应物计算
 * 把「氮气与氢气反应生成氨气，氮气过量」这类描述转成化学方程式，
 * 复用 Chem.balance() 配平后计算限量物、剩余量与生成物比例。
 */
var NlpChem = (function () {

  /* ---------------- 物质名称映射表 ---------------- */
  var SUBSTANCES = [
    // 单质
    { n: ['氮气'], f: 'N2', cn: '氮气', c: 'element' },
    { n: ['氢气'], f: 'H2', cn: '氢气', c: 'element' },
    { n: ['氧气'], f: 'O2', cn: '氧气', c: 'element' },
    { n: ['氯气'], f: 'Cl2', cn: '氯气', c: 'element' },
    { n: ['臭氧'], f: 'O3', cn: '臭氧', c: 'element' },
    { n: ['铁'], f: 'Fe', cn: '铁', c: 'metal' },
    { n: ['铜'], f: 'Cu', cn: '铜', c: 'metal' },
    { n: ['铝'], f: 'Al', cn: '铝', c: 'metal' },
    { n: ['锌'], f: 'Zn', cn: '锌', c: 'metal' },
    { n: ['镁'], f: 'Mg', cn: '镁', c: 'metal' },
    { n: ['钠'], f: 'Na', cn: '钠', c: 'metal' },
    { n: ['钙'], f: 'Ca', cn: '钙', c: 'metal' },
    { n: ['木炭', '焦炭', '碳'], f: 'C', cn: '碳', c: 'element' },
    { n: ['硫'], f: 'S', cn: '硫', c: 'element' },
    { n: ['磷'], f: 'P', cn: '磷', c: 'element' },
    // 氧化物
    { n: ['四氧化三铁'], f: 'Fe3O4', cn: '四氧化三铁', c: 'oxide' },
    { n: ['三氧化二铁', '铁锈', '氧化铁'], f: 'Fe2O3', cn: '氧化铁', c: 'oxide' },
    { n: ['氧化亚铁'], f: 'FeO', cn: '氧化亚铁', c: 'oxide' },
    { n: ['氧化铜'], f: 'CuO', cn: '氧化铜', c: 'oxide' },
    { n: ['氧化亚铜'], f: 'Cu2O', cn: '氧化亚铜', c: 'oxide' },
    { n: ['氧化铝'], f: 'Al2O3', cn: '氧化铝', c: 'oxide' },
    { n: ['生石灰', '氧化钙'], f: 'CaO', cn: '氧化钙', c: 'oxide' },
    { n: ['氧化镁'], f: 'MgO', cn: '氧化镁', c: 'oxide' },
    { n: ['二氧化硅'], f: 'SiO2', cn: '二氧化硅', c: 'oxide' },
    { n: ['二氧化碳'], f: 'CO2', cn: '二氧化碳', c: 'oxide' },
    { n: ['一氧化碳'], f: 'CO', cn: '一氧化碳', c: 'oxide' },
    { n: ['二氧化硫'], f: 'SO2', cn: '二氧化硫', c: 'oxide' },
    { n: ['三氧化硫'], f: 'SO3', cn: '三氧化硫', c: 'oxide' },
    { n: ['一氧化氮'], f: 'NO', cn: '一氧化氮', c: 'oxide' },
    { n: ['二氧化氮'], f: 'NO2', cn: '二氧化氮', c: 'oxide' },
    { n: ['双氧水', '过氧化氢'], f: 'H2O2', cn: '过氧化氢', c: 'other' },
    { n: ['水蒸气', '水蒸汽', '水'], f: 'H2O', cn: '水', c: 'other' },
    // 其他常见物质
    { n: ['氨气', '氨'], f: 'NH3', cn: '氨气', c: 'other' },
    // 酸
    { n: ['盐酸', '氢氯酸', '氯化氢'], f: 'HCl', cn: '盐酸', c: 'acid' },
    { n: ['硫酸'], f: 'H2SO4', cn: '硫酸', c: 'acid' },
    { n: ['硝酸'], f: 'HNO3', cn: '硝酸', c: 'acid' },
    { n: ['碳酸'], f: 'H2CO3', cn: '碳酸', c: 'acid' },
    { n: ['磷酸'], f: 'H3PO4', cn: '磷酸', c: 'acid' },
    // 碱
    { n: ['烧碱', '火碱', '苛性钠', '氢氧化钠'], f: 'NaOH', cn: '氢氧化钠', c: 'base' },
    { n: ['熟石灰', '消石灰', '氢氧化钙'], f: 'Ca(OH)2', cn: '氢氧化钙', c: 'base' },
    { n: ['氢氧化铜'], f: 'Cu(OH)2', cn: '氢氧化铜', c: 'base' },
    { n: ['氢氧化铁'], f: 'Fe(OH)3', cn: '氢氧化铁', c: 'base' },
    { n: ['氢氧化亚铁'], f: 'Fe(OH)2', cn: '氢氧化亚铁', c: 'base' },
    { n: ['氢氧化铝'], f: 'Al(OH)3', cn: '氢氧化铝', c: 'base' },
    { n: ['氢氧化钡'], f: 'Ba(OH)2', cn: '氢氧化钡', c: 'base' },
    { n: ['氢氧化钾'], f: 'KOH', cn: '氢氧化钾', c: 'base' },
    // 碳酸盐
    { n: ['石灰石', '大理石', '碳酸钙'], f: 'CaCO3', cn: '碳酸钙', c: 'carbonate' },
    { n: ['纯碱', '苏打', '碳酸钠'], f: 'Na2CO3', cn: '碳酸钠', c: 'carbonate' },
    { n: ['小苏打', '碳酸氢钠'], f: 'NaHCO3', cn: '碳酸氢钠', c: 'carbonate' },
    { n: ['碳酸钡'], f: 'BaCO3', cn: '碳酸钡', c: 'carbonate' },
    { n: ['碳酸镁'], f: 'MgCO3', cn: '碳酸镁', c: 'carbonate' },
    // 盐
    { n: ['食盐', '氯化钠'], f: 'NaCl', cn: '氯化钠', c: 'salt' },
    { n: ['硫酸铜'], f: 'CuSO4', cn: '硫酸铜', c: 'salt' },
    { n: ['硫酸亚铁'], f: 'FeSO4', cn: '硫酸亚铁', c: 'salt' },
    { n: ['硫酸铁'], f: 'Fe2(SO4)3', cn: '硫酸铁', c: 'salt' },
    { n: ['硫酸钠'], f: 'Na2SO4', cn: '硫酸钠', c: 'salt' },
    { n: ['硫酸钡'], f: 'BaSO4', cn: '硫酸钡', c: 'salt' },
    { n: ['硫酸锌'], f: 'ZnSO4', cn: '硫酸锌', c: 'salt' },
    { n: ['硫酸镁'], f: 'MgSO4', cn: '硫酸镁', c: 'salt' },
    { n: ['硫酸铝'], f: 'Al2(SO4)3', cn: '硫酸铝', c: 'salt' },
    { n: ['氯化铁'], f: 'FeCl3', cn: '氯化铁', c: 'salt' },
    { n: ['氯化亚铁'], f: 'FeCl2', cn: '氯化亚铁', c: 'salt' },
    { n: ['氯化钙'], f: 'CaCl2', cn: '氯化钙', c: 'salt' },
    { n: ['氯化钡'], f: 'BaCl2', cn: '氯化钡', c: 'salt' },
    { n: ['氯化铝'], f: 'AlCl3', cn: '氯化铝', c: 'salt' },
    { n: ['氯化锌'], f: 'ZnCl2', cn: '氯化锌', c: 'salt' },
    { n: ['硝酸银'], f: 'AgNO3', cn: '硝酸银', c: 'salt' },
    { n: ['硝酸钾'], f: 'KNO3', cn: '硝酸钾', c: 'salt' },
    { n: ['高锰酸钾'], f: 'KMnO4', cn: '高锰酸钾', c: 'salt' },
    { n: ['氯酸钾'], f: 'KClO3', cn: '氯酸钾', c: 'salt' },
    // 有机物
    { n: ['沼气', '甲烷'], f: 'CH4', cn: '甲烷', c: 'organic' },
    { n: ['酒精', '乙醇'], f: 'C2H5OH', cn: '乙醇', c: 'organic' },
    { n: ['乙烯'], f: 'C2H4', cn: '乙烯', c: 'organic' },
    { n: ['乙炔'], f: 'C2H2', cn: '乙炔', c: 'organic' },
    { n: ['苯'], f: 'C6H6', cn: '苯', c: 'organic' },
    { n: ['葡萄糖'], f: 'C6H12O6', cn: '葡萄糖', c: 'organic' },
    { n: ['蔗糖'], f: 'C12H22O11', cn: '蔗糖', c: 'organic' }
  ];

  /* ---------------- 化合价与离子表 ---------------- */
  var CATION_V = { H: 1, Na: 1, K: 1, Ag: 1, NH4: 1, Ca: 2, Mg: 2, Zn: 2, Cu: 2, Ba: 2, Fe: 2, Al: 3 };
  var ANION_V = { Cl: -1, SO4: -2, NO3: -1, CO3: -2, OH: -1, O: -2, S: -2, PO4: -3, Br: -1, I: -1, F: -1 };
  var ACID_ANION = { HCl: 'Cl', H2SO4: 'SO4', HNO3: 'NO3', H2CO3: 'CO3', H3PO4: 'PO4' };
  var BASE_CATION = {
    NaOH: 'Na', KOH: 'K', 'Ca(OH)2': 'Ca', 'Cu(OH)2': 'Cu',
    'Fe(OH)3': 'Fe', 'Fe(OH)2': 'Fe', 'Al(OH)3': 'Al',
    'Ba(OH)2': 'Ba', 'Mg(OH)2': 'Mg', 'Zn(OH)2': 'Zn'
  };
  var BASE_CATION_V = { 'Fe(OH)3': 3, 'Fe(OH)2': 2 };
  var CARB_CATION = {
    CaCO3: 'Ca', Na2CO3: 'Na', BaCO3: 'Ba', MgCO3: 'Mg',
    NaHCO3: 'Na', K2CO3: 'K', CuCO3: 'Cu', ZnCO3: 'Zn'
  };

  var METAL_CATS = { alkali: 1, alkaline: 1, transition: 1, post: 1, lanthanide: 1, actinide: 1 };

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }

  /* ---------------- 输入模式判定 ---------------- */
  function detectMode(text) {
    var t = String(text || '');
    if (!t.trim()) return 'equation';
    // 含化学方程式特征符号
    if (/[=→]|->|[+\^]/.test(t)) return 'equation';
    // 含标准化学式写法（大写字母+小写+数字）
    if (/[A-Z][a-z]?\d/.test(t)) return 'equation';
    return 'natural';
  }

  /* ---------------- 物质实体识别 ---------------- */
  function extractSubstances(text) {
    var found = [];
    SUBSTANCES.forEach(function (s) {
      s.n.forEach(function (nm) {
        var idx = 0, pos;
        while ((pos = text.indexOf(nm, idx)) !== -1) {
          found.push({ name: nm, formula: s.f, cn: s.cn, cat: s.c, index: pos, len: nm.length });
          idx = pos + nm.length;
        }
      });
    });
    // 长名优先，去掉位置重叠的短名
    found.sort(function (a, b) { return (b.len - a.len) || (a.index - b.index); });
    var kept = [];
    found.forEach(function (f) {
      var overlap = kept.some(function (k) {
        return !(f.index + f.len <= k.index || k.index + k.len <= f.index);
      });
      if (!overlap) kept.push(f);
    });
    kept.sort(function (a, b) { return a.index - b.index; });
    return kept;
  }

  function nameOf(formula) {
    for (var i = 0; i < SUBSTANCES.length; i++) {
      if (SUBSTANCES[i].f === formula) return SUBSTANCES[i].cn;
    }
    return formula;
  }

  /* ---------------- 数量提取 ---------------- */
  function extractAmounts(text, subs) {
    var re = /(\d+(?:\.\d+)?)\s*(mol|摩尔|毫升|ml|克|g|升|l)(?![a-z])/gi;
    var m, res = [];
    while ((m = re.exec(text)) !== null) {
      var value = parseFloat(m[1]);
      var u = m[2].toLowerCase();
      var unit = (u === 'mol' || u === '摩尔') ? 'mol'
        : (u === '毫升' || u === 'ml') ? 'mL'
          : (u === '克' || u === 'g') ? 'g' : 'L';
      var pos = m.index;
      // 找最近的物质：可能在数量前面或后面
      var best = null, bestDist = Infinity;
      subs.forEach(function (s) {
        var d1 = pos - (s.index + s.len);          // 物质在数量左边
        var d2 = s.index - (pos + m[0].length);    // 物质在数量右边
        var d = Math.min(d1 >= 0 ? d1 : Infinity, d2 >= 0 ? d2 : Infinity);
        if (d < bestDist) { bestDist = d; best = s; }
      });
      if (best && bestDist < 12) {
        res.push({ formula: best.formula, value: value, unit: unit });
      }
    }
    return res;
  }

  /* ---------------- 过量 / 不足条件提取 ---------------- */
  // offset：condText 在原文中的起始位置，用于把物质索引换算到条件句坐标
  function extractCondition(condText, subs, offset) {
    offset = offset || 0;
    var excessWords = ['过量', '过多', '足量', '充分', '过量加入', '过量反应'];
    var lackWords = ['不足', '少量', '短缺', '有限', '限量', '不足反应'];
    var out = { excess: null, limiting: null, conditions: [] };

    var condKeywords = ['高温', '高压', '加热', '点燃', '催化剂', '常压', '光照', '通电', '电解'];
    condKeywords.forEach(function (k) {
      if (condText.indexOf(k) !== -1) out.conditions.push(k);
    });

    function nearby(word, type) {
      var idx = 0, pos;
      while ((pos = condText.indexOf(word, idx)) !== -1) {
        var best = null, bestDist = Infinity;
        subs.forEach(function (s) {
          var end = (s.index - offset) + s.len;
          var d = pos - end;
          if (d >= 0 && d < bestDist) { bestDist = d; best = s; }
        });
        if (best && bestDist < 20) {
          if (type === 'excess') out.excess = best.formula;
          else out.limiting = best.formula;
        }
        idx = pos + word.length;
      }
    }
    excessWords.forEach(function (w) { nearby(w, 'excess'); });
    lackWords.forEach(function (w) { nearby(w, 'lack'); });
    return out;
  }

  /* ---------------- 生成盐的化学式 ---------------- */
  function buildSalt(cationSym, cationV, anionSym) {
    var av = Math.abs(ANION_V[anionSym]);
    if (!av) return null;
    var cv = cationV || CATION_V[cationSym] || 1;
    var g = gcd(cv, av);
    var nCat = av / g, nAn = cv / g;
    var catStr = cationSym + (nCat > 1 ? nCat : '');
    // 只有多原子阴离子才需要括号（Cl2 不加括号，但 (SO4)3 要加）
    var polyatomic = anionSym.length > 2 || /[A-Z]/.test(anionSym.slice(1));
    var anStr = nAn > 1 ? (polyatomic ? '(' + anionSym + ')' + nAn : anionSym + nAn) : anionSym;
    return catStr + anStr;
  }

  function isMetal(sym) {
    var el = ELEMENT_MAP[sym];
    return !!el && !!METAL_CATS[el.category];
  }

  /* ---------------- 生成物推断 ---------------- */
  function inferProducts(reactants, text, allSubs) {
    var R = reactants.slice();
    var formulas = R.map(function (r) { return r.formula; });
    var cats = R.map(function (r) { return r.cat; });
    var parsed = formulas.map(function (f) { return Chem.parseFormula(f).elements || {}; });

    function has(cat) { return cats.indexOf(cat) !== -1; }
    function findByCat(cat) {
      for (var i = 0; i < R.length; i++) if (R[i].cat === cat) return R[i];
      return null;
    }

    // 1) 燃烧 / 与氧反应
    if (/燃烧|点燃|在氧/.test(text)) {
      var fuel = null;
      for (var i = 0; i < R.length; i++) if (R[i].formula !== 'O2') { fuel = R[i]; break; }
      if (!fuel) return null;
      var el = Chem.parseFormula(fuel.formula).elements || {};
      var prods = [];
      var incomplete = /不完全|不充分/.test(text);
      if (el.C) prods.push(incomplete ? 'CO' : 'CO2');
      if (el.H) prods.push('H2O');
      if (el.S) prods.push('SO2');
      if (el.N && !el.C && !el.H) prods.push('N2');
      if (el.Mg) prods.push('MgO');
      if (el.Fe && !el.O) prods.push('Fe3O4');
      if (prods.length) return prods;
      return null;
    }

    // 2) 还原反应：还原剂 + 金属氧化物 → 金属 + 氧化产物
    if (/还原/.test(text)) {
      var reducerMap = { CO: 'CO2', H2: 'H2O', C: 'CO2' };
      var reducer = null, oxide = null;
      for (var j = 0; j < R.length; j++) {
        if (reducerMap[R[j].formula] !== undefined && !reducer) reducer = R[j];
        if (R[j].cat === 'oxide') {
          var oe = Chem.parseFormula(R[j].formula).elements || {};
          var keys = Object.keys(oe);
          if (keys.length === 2 && oe.O !== undefined) {
            var metal = keys[0] === 'O' ? keys[1] : keys[0];
            if (isMetal(metal)) oxide = { item: R[j], metal: metal };
          }
        }
      }
      if (reducer && oxide) return [oxide.metal, reducerMap[reducer.formula]];
      return null;
    }

    // 3) 金属 + 酸 → 盐 + H2
    var acid = findByCat('acid');
    if (acid && has('metal')) {
      var metal = null;
      for (var k = 0; k < R.length; k++) if (R[k].cat === 'metal') { metal = R[k]; break; }
      var an = ACID_ANION[acid.formula];
      if (an && metal) {
        // 硝酸与金属不生成氢气，单独处理
        if (acid.formula === 'HNO3') return null;
        var salt = buildSalt(metal.formula, CATION_V[metal.formula], an);
        if (salt) return [salt, 'H2'];
      }
      return null;
    }

    // 4) 碳酸盐 + 酸 → 盐 + H2O + CO2
    var carb = findByCat('carbonate');
    if (carb && acid) {
      var cat2 = CARB_CATION[carb.formula];
      var an2 = ACID_ANION[acid.formula];
      if (cat2 && an2) {
        var salt2 = buildSalt(cat2, CATION_V[cat2], an2);
        if (salt2) return [salt2, 'H2O', 'CO2'];
      }
      return null;
    }

    // 5) 金属氧化物 + 酸 → 盐 + H2O
    if (acid && has('oxide')) {
      for (var o = 0; o < R.length; o++) {
        if (R[o].cat !== 'oxide') continue;
        var oe2 = Chem.parseFormula(R[o].formula).elements || {};
        var ks = Object.keys(oe2);
        if (ks.length !== 2 || oe2.O === undefined) continue;
        var m2 = ks[0] === 'O' ? ks[1] : ks[0];
        if (!isMetal(m2)) continue;
        var v = Math.round(oe2.O * 2 / oe2[m2]);  // 由氧化物推化合价
        if (m2 === 'Fe' && v !== 2 && v !== 3) v = 3;
        var an3 = ACID_ANION[acid.formula];
        if (!an3) continue;
        var salt3 = buildSalt(m2, v, an3);
        if (salt3) return [salt3, 'H2O'];
      }
      return null;
    }

    // 6) 酸 + 碱 → 盐 + H2O（中和）
    var base = findByCat('base');
    if (acid && base) {
      var cat3 = BASE_CATION[base.formula];
      var an4 = ACID_ANION[acid.formula];
      if (cat3 && an4) {
        var v3 = BASE_CATION_V[base.formula] || CATION_V[cat3];
        var salt4 = buildSalt(cat3, v3, an4);
        if (salt4) return [salt4, 'H2O'];
      }
      return null;
    }

    // 7) 单质 + 单质 → 无法推断
    return null;
  }

  /* ---------------- 限量反应物计算 ---------------- */
  function computeLimiting(bal, amounts, explicitLimiting, explicitExcess) {
    var reactants = bal.left.map(function (x) { return { formula: x.formula, coef: x.coef }; });
    var formulaList = reactants.map(function (r) { return r.formula; });

    // 把质量 / 体积换算成物质的量
    var moles = {};
    Object.keys(amounts).forEach(function (f) {
      var a = amounts[f];
      if (a.unit === 'mol') moles[f] = a.value;
      else if (a.unit === 'g') {
        var mm = Chem.molarMass(f);
        moles[f] = mm.error ? null : a.value / mm.mass;
      } else if (a.unit === 'L') {
        moles[f] = a.value / 22.4;
      } else if (a.unit === 'mL') {
        moles[f] = (a.value / 1000) / 22.4;
      }
    });

    var limiting = explicitLimiting || null;
    if (limiting && formulaList.indexOf(limiting) === -1) limiting = null;

    if (!limiting && explicitExcess && formulaList.indexOf(explicitExcess) !== -1) {
      for (var i = 0; i < reactants.length; i++) {
        if (reactants[i].formula !== explicitExcess) { limiting = reactants[i].formula; break; }
      }
    }

    var givenCount = formulaList.filter(function (f) { return moles[f] !== undefined && moles[f] !== null; });
    if (!limiting && givenCount.length >= 2) {
      var minRatio = Infinity;
      reactants.forEach(function (r) {
        if (moles[r.formula] === undefined || moles[r.formula] === null) return;
        var ratio = moles[r.formula] / r.coef;
        if (ratio < minRatio - 1e-12) { minRatio = ratio; limiting = r.formula; }
      });
    }
    if (!limiting) limiting = reactants[0].formula;

    var limItem = null;
    reactants.forEach(function (r) { if (r.formula === limiting) limItem = r; });
    if (!limItem) limItem = reactants[0];

    var nLimit = (moles[limItem.formula] !== undefined && moles[limItem.formula] !== null)
      ? moles[limItem.formula] : 1;
    var hasGivenAmount = Object.keys(moles).some(function (f) {
      return moles[f] !== undefined && moles[f] !== null;
    });

    // 反应物的理论需求 / 消耗 / 剩余
    var reactOut = reactants.map(function (r) {
      var need = nLimit * (r.coef / limItem.coef);
      var given = (moles[r.formula] === undefined || moles[r.formula] === null) ? null : moles[r.formula];
      return {
        formula: r.formula, cn: nameOf(r.formula), coef: r.coef,
        need: need, given: given,
        remaining: (given === null) ? null : given - need,
        isLimiting: r.formula === limItem.formula
      };
    });

    var products = bal.right.map(function (p) {
      return {
        formula: p.formula, cn: nameOf(p.formula), coef: p.coef,
        moles: nLimit * (p.coef / limItem.coef)
      };
    });

    // 过量物：有剩余的，或显式指定的，或除限量物外的第一个
    var excessItem = null;
    reactOut.forEach(function (r) {
      if (!r.isLimiting && (excessItem === null || (r.remaining !== null && r.remaining > 0))) {
        if (excessItem === null || (r.remaining !== null && r.remaining > 0)) excessItem = r;
      }
    });
    if (!excessItem) {
      reactOut.forEach(function (r) { if (!r.isLimiting && !excessItem) excessItem = r; });
    }

    return {
      limiting: limItem.formula,
      limitingCn: nameOf(limItem.formula),
      nLimit: nLimit,
      hasGivenAmount: hasGivenAmount,
      reactants: reactOut,
      products: products,
      excess: excessItem ? excessItem.formula : null,
      excessCn: excessItem ? excessItem.cn : null,
      excessRemaining: excessItem ? excessItem.remaining : null,
      excessGiven: excessItem ? excessItem.given : null
    };
  }

  /* ---------------- 主入口 ---------------- */
  function analyze(text) {
    var raw = String(text || '').trim();
    if (!raw) return { error: '请输入化学方程式或反应场景描述' };

    if (detectMode(raw) === 'equation') {
      return { mode: 'equation' };
    }

    // 分割主体与条件（以逗号 / 分号 / 句号 分隔）
    var cut = raw.search(/[，,；;。]/);
    var mainPart = cut >= 0 ? raw.slice(0, cut) : raw;
    var condPart = cut >= 0 ? raw.slice(cut + 1) : '';

    // 物质识别（用全文，便于条件里定位）
    var subsAll = extractSubstances(raw);
    subsAll.forEach(function (s) { s.indexInFull = s.index; });
    if (!subsAll.length) {
      return { error: '没有识别到任何化学物质。请改用化学方程式，或检查物质名称（如「氮气」「氢氧化钠」）。' };
    }

    var subsMain = extractSubstances(mainPart);

    // 切分反应物 / 生成物
    var reactPart = mainPart, prodPart = '';
    var genIdx = mainPart.indexOf('生成');
    if (genIdx === -1) genIdx = mainPart.search(/产生|得到/);
    if (genIdx !== -1) {
      var kwLen = /生成|产生|得到/.exec(mainPart.slice(genIdx))[0].length;
      reactPart = mainPart.slice(0, genIdx);
      prodPart = mainPart.slice(genIdx + kwLen);
    }
    reactPart = reactPart.replace(/反应|一起|混合|和|与|跟/g, '');

    var reactants = extractSubstances(reactPart);
    var products = prodPart ? extractSubstances(prodPart) : [];

    // 去重（按化学式）
    var seenR = {};
    reactants = reactants.filter(function (s) {
      if (seenR[s.formula]) return false; seenR[s.formula] = 1; return true;
    });
    var seenP = {};
    products = products.filter(function (s) {
      if (seenP[s.formula]) return false; seenP[s.formula] = 1; return true;
    });

    if (reactants.length < 1) {
      return { error: '没有识别到反应物，请检查描述（例如：氮气与氢气反应生成氨气）。' };
    }

    var inferred = false;
    if (!products.length) {
      // 燃烧 / 点燃：即使没提氧气，也补上 O2 作为反应物
      if (/燃烧|点燃/.test(mainPart)) {
        var hasO2 = reactants.some(function (x) { return x.formula === 'O2'; });
        if (!hasO2) {
          reactants.push({ formula: 'O2', cn: '氧气', cat: 'oxide' });
          inferred = true;
        }
      }
      var guess = inferProducts(reactants, mainPart, subsMain);
      if (!guess) {
        return {
          error: '识别到反应物 ' + reactants.map(function (r) { return r.cn; }).join('、') +
            '，但无法推断生成物。请补充生成物，或改用化学方程式输入。'
        };
      }
      products = guess.map(function (f) {
        return { formula: f, cn: nameOf(f), cat: (SUBSTANCES.filter(function (s) { return s.f === f; })[0] || {}).c || 'other' };
      });
      inferred = true;
    }

    // 组装方程式并配平
    var eqStr = reactants.map(function (r) { return r.formula; }).join(' + ') + ' = ' +
      products.map(function (p) { return p.formula; }).join(' + ');
    var bal = Chem.balance(eqStr);
    if (bal.error) {
      return {
        error: '推断出的反应无法配平（' + eqStr + '）。请改用化学方程式输入。'
      };
    }

    // 数量与条件
    var amountsList = extractAmounts(raw, subsAll);
    var amounts = {};
    amountsList.forEach(function (a) { amounts[a.formula] = { value: a.value, unit: a.unit }; });

    var condText = condPart || mainPart;
    var condOffset = condPart ? cut + 1 : 0;
    var cond = extractCondition(condText, subsAll, condOffset);

    var limit = computeLimiting(bal, amounts, cond.limiting, cond.excess);

    return {
      mode: 'natural',
      equation: eqStr,
      balanced: bal,
      reactants: reactants.map(function (r) { return { formula: r.formula, cn: r.cn }; }),
      products: products.map(function (p) { return { formula: p.formula, cn: p.cn }; }),
      inferredProducts: inferred,
      conditions: cond.conditions,
      explicitExcess: cond.excess,
      explicitLimiting: cond.limiting,
      limiting: limit,
      amounts: amountsList
    };
  }

  return {
    analyze: analyze,
    detectMode: detectMode,
    nameOf: nameOf,
    SUBSTANCES: SUBSTANCES
  };
})();
