/* 化学计算核心：化学式解析 / 摩尔质量 / 方程式配平
 * 配平算法：构建原子守恒矩阵，用有理数高斯消元求零空间，再整数化
 */
var Chem = (function () {

  /* ---------------- 分数（有理数）运算 ---------------- */
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
  function F(n, d) {
    if (d === 0) throw new Error('除以零');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  function fadd(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fsub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fmul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function fdiv(a, b) { return F(a.n * b.d, a.d * b.n); }
  function fneg(a) { return F(-a.n, a.d); }
  function fzero(a) { return a.n === 0; }

  /* ---------------- 行最简形 & 零空间 ---------------- */
  function rref(matrix, rows, cols) {
    var R = [], i, j;
    for (i = 0; i < rows; i++) {
      R.push([]);
      for (j = 0; j < cols; j++) R[i].push(F(matrix[i][j], 1));
    }
    var pivots = [], r = 0;
    for (var c = 0; c < cols && r < rows; c++) {
      var pr = -1;
      for (i = r; i < rows; i++) { if (!fzero(R[i][c])) { pr = i; break; } }
      if (pr === -1) continue;
      var tmp = R[r]; R[r] = R[pr]; R[pr] = tmp;
      var pv = R[r][c];
      for (j = 0; j < cols; j++) R[r][j] = fdiv(R[r][j], pv);
      for (i = 0; i < rows; i++) {
        if (i === r || fzero(R[i][c])) continue;
        var f = R[i][c];
        for (j = 0; j < cols; j++) R[i][j] = fsub(R[i][j], fmul(f, R[r][j]));
      }
      pivots.push(c);
      r++;
    }
    return { R: R, pivots: pivots };
  }

  // 返回零空间的一组整数基
  function nullSpace(matrix, rows, cols) {
    var res = rref(matrix, rows, cols);
    var R = res.R, pivots = res.pivots;
    var isPiv = new Array(cols).fill(false);
    pivots.forEach(function (c) { isPiv[c] = true; });
    var basis = [];
    for (var c = 0; c < cols; c++) {
      if (isPiv[c]) continue;
      var v = new Array(cols);
      for (var j = 0; j < cols; j++) v[j] = F(0, 1);
      v[c] = F(1, 1);
      for (var i = 0; i < pivots.length; i++) v[pivots[i]] = fneg(R[i][c]);
      basis.push(intVector(v));
    }
    return basis;
  }

  // 分数向量 → 最简整数向量
  function intVector(v) {
    var L = 1, i;
    for (i = 0; i < v.length; i++) L = lcm(L, v[i].d);
    var iv = v.map(function (x) { return x.n * (L / x.d); });
    var g = 0;
    for (i = 0; i < iv.length; i++) g = gcd(g, iv[i]);
    if (g === 0) g = 1;
    iv = iv.map(function (x) { return x / g; });
    // 让首个非零项为正
    for (i = 0; i < iv.length; i++) {
      if (iv[i] !== 0) { if (iv[i] < 0) iv = iv.map(function (x) { return -x; }); break; }
    }
    return iv;
  }

  /* ---------------- 化学式解析 ---------------- */

  // 归一化书写：统一结晶水分隔符、去除空白
  function normalize(s) {
    return String(s)
      .replace(/[•＊*]/g, '·')
      .replace(/\s+/g, '');
  }

  var CHARGE_HOLDER = '\u0001';

  // 解析单个化学式（不含前置系数）
  // 返回 { elements: {sym: count}, charge: number, error: string }
  function parseFormula(input) {
    var s = normalize(input);
    if (!s) return { elements: {}, charge: 0, error: '输入为空' };

    // 剥离离子电荷 ^2+ / ^- / ^3-
    var charge = 0;
    s = s.replace(/\^(\d*)([+-])/g, function (m, d, sign) {
      charge += (sign === '+' ? 1 : -1) * (d === '' ? 1 : parseInt(d, 10));
      return '';
    });

    var stack = [{}];
    var i = 0;
    var mult = 1;   // 结晶水前的倍数，如 CuSO4·5H2O 中的 5
    function top() { return stack[stack.length - 1]; }

    // 开头数字当作整体系数
    var lead = readNumber(s, 0);
    if (lead.end > 0) { mult = lead.value; i = lead.end; }

    while (i < s.length) {
      var ch = s[i];
      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push({}); i++; continue;
      }
      if (ch === ')' || ch === ']' || ch === '}') {
        if (stack.length < 2) return { elements: {}, charge: 0, error: '括号不匹配：多余的 ' + ch };
        var grp = stack.pop(); i++;
        var num = readNumber(s, i);
        i = num.end;
        var cur = top();
        // 回到顶层时应用结晶水倍数
        var factor = num.value * (stack.length === 1 ? mult : 1);
        for (var k in grp) cur[k] = (cur[k] || 0) + grp[k] * factor;
        continue;
      }
      if (ch === '·') {
        i++;
        var nn = readNumber(s, i);
        i = nn.end;
        mult = nn.value;
        continue;
      }
      if (/[A-Z]/.test(ch)) {
        var sym = ch; i++;
        if (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
        var n2 = readNumber(s, i);
        i = n2.end;
        if (!ELEMENT_MAP[sym]) {
          return { elements: {}, charge: 0, error: '未知元素符号「' + sym + '」（注意大小写）' };
        }
        var t = top();
        var inGroup = stack.length > 1;
        t[sym] = (t[sym] || 0) + n2.value * (inGroup ? 1 : mult);
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        // 出现在开头或不该出现的位置：跳过
        i++; continue;
      }
      return { elements: {}, charge: 0, error: '无法识别的字符「' + ch + '」' };
    }

    if (stack.length !== 1) return { elements: {}, charge: 0, error: '括号不匹配：缺少右括号' };
    var out = stack[0];
    if (Object.keys(out).length === 0) return { elements: {}, charge: 0, error: '没有解析到任何元素' };
    return { elements: out, charge: charge, error: null };
  }

  // 从位置 i 开始读取数字（支持小数）
  function readNumber(s, i) {
    var m = s.slice(i).match(/^(\d+(\.\d+)?)/);
    if (!m) return { value: 1, end: i };
    return { value: parseFloat(m[1]), end: i + m[1].length };
  }

  // 剥离前置系数与物态标注
  function stripDecorations(term) {
    var t = term.trim();
    var hadCoef = false;
    // 物态标注 (g) (l) (s) (aq) 与 ↑ ↓
    t = t.replace(/[↑↓]\s*$/, '');
    t = t.replace(/\((?:g|l|s|aq|cr|固|液|气)\)\s*$/i, '');
    // 前置系数
    var m = t.match(/^(\d+(?:\.\d+)?)\s*(?=[A-Z(\[])/);
    if (m) { t = t.slice(m[1].length); hadCoef = true; }
    return { formula: t.trim(), hadCoef: hadCoef };
  }

  /* ---------------- 摩尔质量 ---------------- */
  function molarMass(formulaStr) {
    var parsed = parseFormula(formulaStr);
    if (parsed.error) return { error: parsed.error };
    var total = 0, detail = [];
    for (var sym in parsed.elements) {
      var el = ELEMENT_MAP[sym];
      var count = parsed.elements[sym];
      var sub = el.mass * count;
      total += sub;
      detail.push({
        symbol: sym, cn: el.cn, z: el.z, count: count,
        atomMass: el.mass, subTotal: sub, percent: 0
      });
    }
    detail.forEach(function (d) { d.percent = (d.subTotal / total) * 100; });
    detail.sort(function (a, b) { return b.subTotal - a.subTotal; });
    return {
      mass: total,
      detail: detail,
      charge: parsed.charge,
      elements: parsed.elements
    };
  }

  /* ---------------- 方程式配平 ---------------- */
  function balance(equationStr) {
    var raw = String(equationStr || '').trim();
    if (!raw) return { error: '请输入化学方程式' };

    // 保护 ^ 电荷标记，避免与 + 分隔符冲突
    var charges = [];
    var work = raw.replace(/\^\s*(\d*)\s*([+-])/g, function (m, d, sign) {
      charges.push({ n: d === '' ? 1 : parseInt(d, 10), sign: sign });
      return CHARGE_HOLDER + (charges.length - 1) + CHARGE_HOLDER;
    });

    // 统一箭头
    work = work.replace(/\s*(?:-->|->|=>|→|⇌|⇄|↔)\s*/g, '=').replace(/\s*(?:==)\s*/g, '=');

    var parts = work.split('=').map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
    if (parts.length !== 2) return { error: '请用 = 或 → 把方程式分成反应物和生成物两边' };

    var sides = parts.map(function (side) {
      return side.split('+').map(function (t) { return t.trim(); }).filter(function (t) { return t !== ''; });
    });
    if (!sides[0].length || !sides[1].length) {
      return { error: '反应物和生成物都不能为空（离子电荷请用 ^ 标记，如 Cu^2+）' };
    }

    var species = [];       // { formula, side, elements, charge }
    var elementSet = {};
    var hasCharge = false;

    for (var s = 0; s < 2; s++) {
      for (var k = 0; k < sides[s].length; k++) {
        var term = sides[s][k];
        var charge = 0;
        var holderRe = new RegExp(CHARGE_HOLDER + '(\\d+)' + CHARGE_HOLDER, 'g');

        // 显示形式：还原成 ^2+ 这样的书写
        var displayTerm = term.replace(holderRe, function (m, idx) {
          var c = charges[parseInt(idx, 10)];
          if (!c) return '';
          charge += (c.sign === '+' ? 1 : -1) * c.n;
          return '^' + (c.n === 1 ? '' : c.n) + c.sign;
        });
        // 计算形式：去掉电荷标记
        var workTerm = term.replace(holderRe, '');

        var deco = stripDecorations(workTerm);
        if (!deco.formula) return { error: '第 ' + (s + 1) + ' 边第 ' + (k + 1) + ' 项为空' };
        var p = parseFormula(deco.formula);
        if (p.error) return { error: '「' + deco.formula + '」解析失败：' + p.error };
        charge += p.charge;
        if (charge !== 0) hasCharge = true;
        for (var e in p.elements) elementSet[e] = true;
        species.push({
          formula: deco.formula,
          display: stripDecorations(displayTerm).formula || deco.formula,
          side: s, elements: p.elements, charge: charge
        });
      }
    }

    var elementList = Object.keys(elementSet);
    var n = species.length;
    var rows = elementList.length + (hasCharge ? 1 : 0);

    var M = [];
    for (var r = 0; r < rows; r++) {
      M.push(new Array(n).fill(0));
    }
    for (var j = 0; j < n; j++) {
      var sp = species[j];
      var sign = sp.side === 0 ? 1 : -1;
      for (var ei = 0; ei < elementList.length; ei++) {
        M[ei][j] = (sp.elements[elementList[ei]] || 0) * sign;
      }
      if (hasCharge) M[rows - 1][j] = sp.charge * sign;
    }

    // 每行缩放为整数（行等价变换，不改变零空间）
    for (var ri = 0; ri < rows; ri++) {
      var mult = 1;
      while (mult < 1e6 && !M[ri].every(function (v) {
        return Math.abs(v * mult - Math.round(v * mult)) < 1e-9;
      })) { mult *= 10; }
      M[ri] = M[ri].map(function (v) { return Math.round(v * mult); });
    }

    var basis = nullSpace(M, rows, n);
    if (!basis.length) {
      return { error: '无法配平：原子（或电荷）不守恒，请检查两边元素是否一致' };
    }

    var solution = pickSolution(basis, n);
    if (!solution) {
      return { error: '该方程式存在多种配平方式，请补充条件或检查书写' };
    }

    // 把负系数项移到对侧，保证所有系数为正
    var left = [], right = [];
    for (var q = 0; q < n; q++) {
      var c = solution[q];
      if (c === 0) continue;
      if (c > 0) {
        if (species[q].side === 0) left.push({ formula: species[q].display, coef: c });
        else right.push({ formula: species[q].display, coef: c });
      } else {
        var abs = Math.abs(c);
        if (species[q].side === 0) right.push({ formula: species[q].display, coef: abs });
        else left.push({ formula: species[q].display, coef: abs });
      }
    }
    if (!left.length || !right.length) {
      return { error: '配平结果无效（所有物质落在同一侧），请检查方程式' };
    }

    var elems = elementList.map(function (sym) {
      var l = 0, rr = 0;
      species.forEach(function (sp, idx) {
        var cnt = (sp.elements[sym] || 0) * solution[idx];
        if (sp.side === 0) l += cnt; else rr += cnt;
      });
      return { symbol: sym, cn: ELEMENT_MAP[sym] ? ELEMENT_MAP[sym].cn : sym, left: l, right: rr };
    });

    var qLeft = 0, qRight = 0;
    if (hasCharge) {
      species.forEach(function (sp, idx) {
        var c = sp.charge * solution[idx];
        if (sp.side === 0) qLeft += c; else qRight += c;
      });
    }

    return {
      left: left, right: right,
      elements: elems,
      hasCharge: hasCharge,
      chargeLeft: qLeft, chargeRight: qRight,
      multiple: basis.length > 1
    };
  }

  // 从零空间基中挑一组全正（或全负）的最小整数解
  function pickSolution(basis, n) {
    var i, j;
    for (i = 0; i < basis.length; i++) {
      var b = normalizeSign(basis[i]);
      if (b.every(function (x) { return x > 0; })) return b;
    }
    if (basis.length === 1) return null;

    var R = basis.length <= 4 ? 4 : 2;
    var range = [];
    for (i = -R; i <= R; i++) range.push(i);

    var best = null, bestSum = Infinity;
    (function rec(idx, coeffs) {
      if (best !== null && bestSum <= basis.length + 1) return;
      if (idx === basis.length) {
        if (coeffs.every(function (x) { return x === 0; })) return;
        var v = new Array(n).fill(0);
        for (var a = 0; a < basis.length; a++) {
          for (var b2 = 0; b2 < n; b2++) v[b2] += coeffs[a] * basis[a][b2];
        }
        var pos = v.every(function (x) { return x > 0; });
        var neg = v.every(function (x) { return x < 0; });
        if (!pos && !neg) return;
        if (neg) v = v.map(function (x) { return -x; });
        var sum = v.reduce(function (a2, b3) { return a2 + b3; }, 0);
        if (sum < bestSum) { bestSum = sum; best = v; }
        return;
      }
      for (var t = 0; t < range.length; t++) {
        coeffs.push(range[t]);
        rec(idx + 1, coeffs);
        coeffs.pop();
      }
    })(0, []);

    return best;
  }

  function normalizeSign(v) {
    for (var i = 0; i < v.length; i++) {
      if (v[i] !== 0) return v[i] < 0 ? v.map(function (x) { return -x; }) : v.slice();
    }
    return v.slice();
  }

  /* ---------------- 显示辅助：数字转下标 ---------------- */
  var SUB_MAP = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  var SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
  var SUB_REV = {}; var SUP_REV = {};
  Object.keys(SUB_MAP).forEach(function (k) { SUB_REV[SUB_MAP[k]] = k; });
  Object.keys(SUP_MAP).forEach(function (k) { SUP_REV[SUP_MAP[k]] = k; });

  // H2SO4 + Ca^2+ → H₂SO₄ + Ca²⁺（化学式中紧跟元素/括号的数字转为下标）
  function toFancy(text) {
    var s = String(text);
    // 先处理 ^ 上标
    s = s.replace(/\^([0-9+\-]+)/g, function (m, body) {
      return body.split('').map(function (ch) { return SUP_MAP[ch] || ch; }).join('');
    });
    // 下标：数字紧跟在字母、汉字或右括号之后
    s = s.replace(/([A-Za-z\u4e00-\u9fa5\)\]\}₀-₉])([0-9]+)/g, function (m, pre, digits) {
      return pre + digits.split('').map(function (ch) { return SUB_MAP[ch]; }).join('');
    });
    return s;
  }

  function toPlain(text) {
    return String(text).split('').map(function (ch) {
      if (SUB_REV[ch]) return SUB_REV[ch];
      if (SUP_REV[ch]) return '^' + SUP_REV[ch];
      return ch;
    }).join('');
  }

  return {
    parseFormula: parseFormula,
    molarMass: molarMass,
    balance: balance,
    toFancy: toFancy,
    toPlain: toPlain,
    _intVector: intVector,
    _nullSpace: nullSpace
  };
})();
