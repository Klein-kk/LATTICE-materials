/* 通用工具：单位换算 / 溶液计算 / 文本排版 */
var Tools = (function () {

  /* =============== 单位换算 =============== */
  var UNIT_DEFS = {
    length: {
      name: '长度', base: 'm',
      units: [
        { id: 'm', label: '米 m', f: 1 },
        { id: 'km', label: '千米 km', f: 1000 },
        { id: 'dm', label: '分米 dm', f: 0.1 },
        { id: 'cm', label: '厘米 cm', f: 0.01 },
        { id: 'mm', label: '毫米 mm', f: 0.001 },
        { id: 'um', label: '微米 μm', f: 1e-6 },
        { id: 'nm', label: '纳米 nm', f: 1e-9 },
        { id: 'A', label: '埃 Å', f: 1e-10 },
        { id: 'pm', label: '皮米 pm', f: 1e-12 },
        { id: 'in', label: '英寸 in', f: 0.0254 },
        { id: 'ft', label: '英尺 ft', f: 0.3048 },
        { id: 'yd', label: '码 yd', f: 0.9144 },
        { id: 'mi', label: '英里 mi', f: 1609.344 }
      ]
    },
    mass: {
      name: '质量', base: 'g',
      units: [
        { id: 'g', label: '克 g', f: 1 },
        { id: 'kg', label: '千克 kg', f: 1000 },
        { id: 'mg', label: '毫克 mg', f: 0.001 },
        { id: 'ug', label: '微克 μg', f: 1e-6 },
        { id: 'ng', label: '纳克 ng', f: 1e-9 },
        { id: 't', label: '吨 t', f: 1e6 },
        { id: 'jin', label: '斤', f: 500 },
        { id: 'liang', label: '两', f: 50 },
        { id: 'lb', label: '磅 lb', f: 453.59237 },
        { id: 'oz', label: '盎司 oz', f: 28.349523125 },
        { id: 'u', label: '原子质量单位 u', f: 1.66053906660e-24 }
      ]
    },
    volume: {
      name: '体积', base: 'mL',
      units: [
        { id: 'mL', label: '毫升 mL', f: 1 },
        { id: 'L', label: '升 L', f: 1000 },
        { id: 'uL', label: '微升 μL', f: 0.001 },
        { id: 'm3', label: '立方米 m³', f: 1e6 },
        { id: 'dm3', label: '立方分米 dm³', f: 1000 },
        { id: 'cm3', label: '立方厘米 cm³', f: 1 },
        { id: 'in3', label: '立方英寸 in³', f: 16.387064 },
        { id: 'ft3', label: '立方英尺 ft³', f: 28316.846592 },
        { id: 'galUS', label: '美制加仑 gal', f: 3785.411784 },
        { id: 'galUK', label: '英制加仑 gal', f: 4546.09 },
        { id: 'flozUS', label: '美制液量盎司', f: 29.5735296 },
        { id: 'cupUS', label: '美制杯', f: 236.5882365 },
        { id: 'tbsp', label: '汤匙', f: 14.7867648 },
        { id: 'tsp', label: '茶匙', f: 4.9289216 }
      ]
    },
    area: {
      name: '面积', base: 'm2',
      units: [
        { id: 'm2', label: '平方米 m²', f: 1 },
        { id: 'km2', label: '平方千米 km²', f: 1e6 },
        { id: 'dm2', label: '平方分米 dm²', f: 0.01 },
        { id: 'cm2', label: '平方厘米 cm²', f: 1e-4 },
        { id: 'mm2', label: '平方毫米 mm²', f: 1e-6 },
        { id: 'ha', label: '公顷 ha', f: 10000 },
        { id: 'mu', label: '亩', f: 666.6666667 },
        { id: 'acre', label: '英亩 acre', f: 4046.8564224 },
        { id: 'ft2', label: '平方英尺 ft²', f: 0.09290304 },
        { id: 'in2', label: '平方英寸 in²', f: 0.00064516 }
      ]
    },
    pressure: {
      name: '压力 / 压强', base: 'Pa',
      units: [
        { id: 'Pa', label: '帕 Pa', f: 1 },
        { id: 'kPa', label: '千帕 kPa', f: 1000 },
        { id: 'MPa', label: '兆帕 MPa', f: 1e6 },
        { id: 'hPa', label: '百帕 hPa', f: 100 },
        { id: 'bar', label: '巴 bar', f: 1e5 },
        { id: 'mbar', label: '毫巴 mbar', f: 100 },
        { id: 'atm', label: '标准大气压 atm', f: 101325 },
        { id: 'mmHg', label: '毫米汞柱 mmHg', f: 133.322387415 },
        { id: 'Torr', label: '托 Torr', f: 133.322368421 },
        { id: 'mmH2O', label: '毫米水柱 mmH₂O', f: 9.80665 },
        { id: 'psi', label: '磅力/平方英寸 psi', f: 6894.7572932 },
        { id: 'kgfcm2', label: '千克力/平方厘米', f: 98066.5 }
      ]
    },
    energy: {
      name: '能量 / 热量', base: 'J',
      units: [
        { id: 'J', label: '焦耳 J', f: 1 },
        { id: 'kJ', label: '千焦 kJ', f: 1000 },
        { id: 'cal', label: '卡 cal', f: 4.184 },
        { id: 'kcal', label: '千卡 kcal', f: 4184 },
        { id: 'Wh', label: '瓦时 W·h', f: 3600 },
        { id: 'kWh', label: '千瓦时 kW·h', f: 3.6e6 },
        { id: 'eV', label: '电子伏 eV', f: 1.602176634e-19 },
        { id: 'BTU', label: '英热单位 BTU', f: 1055.05585262 },
        { id: 'erg', label: '尔格 erg', f: 1e-7 }
      ]
    },
    amount: {
      name: '物质的量', base: 'mol',
      units: [
        { id: 'mol', label: '摩尔 mol', f: 1 },
        { id: 'mmol', label: '毫摩尔 mmol', f: 0.001 },
        { id: 'umol', label: '微摩尔 μmol', f: 1e-6 },
        { id: 'nmol', label: '纳摩尔 nmol', f: 1e-9 },
        { id: 'kmol', label: '千摩尔 kmol', f: 1000 }
      ]
    },
    temperature: {
      name: '温度', special: true,
      units: [
        { id: 'C', label: '摄氏度 ℃' },
        { id: 'F', label: '华氏度 ℉' },
        { id: 'K', label: '开尔文 K' }
      ]
    }
  };

  function toKelvin(v, unit) {
    if (unit === 'C') return v + 273.15;
    if (unit === 'F') return (v - 32) * 5 / 9 + 273.15;
    return v;
  }
  function fromKelvin(k, unit) {
    if (unit === 'C') return k - 273.15;
    if (unit === 'F') return (k - 273.15) * 9 / 5 + 32;
    return k;
  }

  function convert(kind, value, fromId, toId) {
    var def = UNIT_DEFS[kind];
    if (!def) return NaN;
    if (def.special) {
      return fromKelvin(toKelvin(value, fromId), toId);
    }
    var f1 = 1, f2 = 1;
    def.units.forEach(function (u) {
      if (u.id === fromId) f1 = u.f;
      if (u.id === toId) f2 = u.f;
    });
    return value * f1 / f2;
  }

  /* =============== 溶液计算 =============== */

  // 稀释：C1V1 = C2V2，四个量中求未知的那个
  function dilution(vals) {
    var known = ['c1', 'v1', 'c2', 'v2'].filter(function (k) {
      return vals[k] !== null && vals[k] !== '' && !isNaN(vals[k]);
    });
    if (known.length !== 3) {
      return { error: '请填写其中任意 3 个数值，留空的那个即为待求量' };
    }
    var target = ['c1', 'v1', 'c2', 'v2'].filter(function (k) { return known.indexOf(k) === -1; })[0];
    var v = { c1: vals.c1, v1: vals.v1, c2: vals.c2, v2: vals.v2 };
    var result;
    if (target === 'c1') result = (vals.c2 * vals.v2) / vals.v1;
    else if (target === 'v1') result = (vals.c2 * vals.v2) / vals.c1;
    else if (target === 'c2') result = (vals.c1 * vals.v1) / vals.v2;
    else result = (vals.c1 * vals.v1) / vals.c2;

    if (!isFinite(result)) return { error: '计算结果无效，请检查数值（分母不能为 0）' };
    return { target: target, value: result };
  }

  // 固体配制：称取多少克
  function prepareSolid(o) {
    var vL = o.vunit === 'L' ? o.v : o.v / 1000;
    var cMol = o.cunit === 'mol/L' ? o.c : o.cunit === 'mmol/L' ? o.c / 1000 : null;
    var purity = (o.purity === null || isNaN(o.purity)) ? 100 : o.purity;
    if (purity <= 0) return { error: '纯度必须大于 0' };

    if (cMol === null) {
      // 质量浓度 g/L
      var massPure = o.c * vL;
      var massRaw = massPure / (purity / 100);
      return {
        mode: 'mass', massPure: massPure, massRaw: massRaw,
        formula: o.formula, purity: purity, vL: vL
      };
    }
    var mm = Chem.molarMass(o.formula);
    if (mm.error) return { error: '化学式解析失败：' + mm.error };
    var n = cMol * vL;
    var massPure2 = n * mm.mass;
    var massRaw2 = massPure2 / (purity / 100);
    return {
      mode: 'molar', M: mm.mass, n: n,
      massPure: massPure2, massRaw: massRaw2,
      formula: o.formula, purity: purity, vL: vL
    };
  }

  // 浓度换算：物质的量浓度 ⇄ 质量浓度 ⇄ 质量分数
  function convertConc(o) {
    var mm = Chem.molarMass(o.formula);
    if (mm.error) return { error: '化学式解析失败：' + mm.error };
    var molar = o.molar, mass = o.massConc;
    if (molar === null || isNaN(molar)) {
      if (mass === null || isNaN(mass)) return { error: '请填写物质的量浓度或质量浓度其中之一' };
      molar = mass / mm.mass;
    } else {
      mass = molar * mm.mass;
    }
    var out = { M: mm.mass, molar: molar, massConc: mass };
    if (o.density && !isNaN(o.density) && o.density > 0) {
      // 1 L 溶液质量 = density(g/mL) * 1000 mL
      var gPerL = o.density * 1000;
      out.percent = (mass / gPerL) * 100;
      out.molality = molar / ((gPerL - mass) / 1000); // mol/kg 溶剂
    }
    return out;
  }

  // ppm ⇄ mg/L ⇄ %
  function fromPpm(ppm, density) {
    var d = (density && !isNaN(density) && density > 0) ? density : 1;
    return { ppm: ppm, mgL: ppm * d, percent: ppm / 10000 };
  }
  function fromMgL(mgL, density) {
    var d = (density && !isNaN(density) && density > 0) ? density : 1;
    return { ppm: mgL / d, mgL: mgL, percent: (mgL / d) / 10000 };
  }
  function fromPercent(pct, density) {
    var d = (density && !isNaN(density) && density > 0) ? density : 1;
    return { ppm: pct * 10000, mgL: pct * 10000 * d, percent: pct };
  }

  /* =============== 文本处理 =============== */

  function countText(text) {
    var s = String(text || '');
    var noSpace = s.replace(/\s/g, '');
    var chinese = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
    var english = (s.match(/[A-Za-z]+/g) || []);
    var digits = (s.match(/\d/g) || []).length;
    var punct = (s.match(/[\u3000-\u303f\uff00-\uffef.,;:!?()\[\]{}"'\/\\-]/g) || []).length;
    var lines = s.split(/\r\n|\r|\n/);
    var paragraphs = lines.filter(function (l) { return l.trim() !== ''; }).length;
    return {
      total: s.length,
      totalNoSpace: noSpace.length,
      chinese: chinese,
      words: english.length,
      latinChars: (s.match(/[A-Za-z]/g) || []).length,
      digits: digits,
      punct: punct,
      paragraphs: paragraphs,
      lines: lines.length,
      readMinutes: Math.max(1, Math.round((chinese + english.length * 1.5) / 300))
    };
  }

  function cleanText(text, mode) {
    var t = String(text || '');
    switch (mode) {
      case 'spaces':
        t = t.replace(/[ \t]+/g, ' ').split(/\r\n|\r|\n/).map(function (l) { return l.replace(/^ +| +$/g, ''); }).join('\n');
        break;
      case 'blank':
        t = t.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
        break;
      case 'indent':
        t = t.split(/\r\n|\r|\n/).map(function (l) { return l.replace(/^[ \t\u3000]+/, ''); }).join('\n');
        break;
      case 'full':
        t = t.replace(/[\u0020-\u007e]/g, function (ch) {
          return ch === ' ' ? '\u3000' : String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
        });
        break;
      case 'half':
        t = t.replace(/[\uff01-\uff5e]/g, function (ch) {
          return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        }).replace(/\u3000/g, ' ');
        break;
      case 'punct':
        t = t.replace(/([\u4e00-\u9fa5])[ \t]*,[ \t]*/g, '$1，')
          .replace(/([\u4e00-\u9fa5])[ \t]*\.(?=$|\n|[\u4e00-\u9fa5])/gm, '$1。')
          .replace(/([\u4e00-\u9fa5])[ \t]*:[ \t]*/g, '$1：')
          .replace(/([\u4e00-\u9fa5])[ \t]*;[ \t]*/g, '$1；')
          .replace(/([\u4e00-\u9fa5])[ \t]*\?[ \t]*/g, '$1？')
          .replace(/([\u4e00-\u9fa5])[ \t]*![ \t]*/g, '$1！');
        break;
    }
    return t;
  }

  var SYMBOL_GROUPS = [
    {
      name: '化学常用', items: ['→', '⇌', '⇄', '↑', '↓', 'Δ', '℃', '℉', '·', '±', '≈', '≡', '≒', '∝']
    },
    {
      name: '希腊字母', items: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω']
    },
    {
      name: '数学符号', items: ['＋', '－', '×', '÷', '±', '∓', '＝', '≠', '≈', '≦', '≧', '≤', '≥', '＜', '＞', '√', '∛', '∞', '∑', '∏', '∫', '∂', '∇', '∠', '⊥', '∥', '°', '′', '″', '‰', '％']
    },
    {
      name: '下标 ₀-₉', items: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
    },
    {
      name: '上标 ⁰-⁹', items: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻', 'ⁿ']
    },
    {
      name: '中文标点', items: ['，', '。', '、', '；', '：', '？', '！', '「', '」', '『', '』', '《', '》', '（', '）', '【', '】', '——', '……', '～']
    },
    {
      name: '序号与圈码', items: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', '½', '⅓', '⅔', '¼', '¾']
    },
    {
      name: '装饰符号', items: ['★', '☆', '◆', '◇', '●', '○', '■', '□', '▲', '△', '▼', '▽', '※', '§', '†', '‡', '¶', '©', '®', '™', '✓', '✔', '✗', '✘']
    },
    {
      name: '箭头与流程', items: ['←', '↑', '→', '↓', '↔', '↕', '⟵', '⟶', '⟷', '⇒', '⇐', '⇔', '⇨', '⇦', '⤴', '⤵', '➜', '➤', '➢', '»', '«']
    }
  ];

  return {
    UNIT_DEFS: UNIT_DEFS,
    convert: convert,
    dilution: dilution,
    prepareSolid: prepareSolid,
    convertConc: convertConc,
    fromPpm: fromPpm,
    fromMgL: fromMgL,
    fromPercent: fromPercent,
    countText: countText,
    cleanText: cleanText,
    SYMBOL_GROUPS: SYMBOL_GROUPS
  };
})();
