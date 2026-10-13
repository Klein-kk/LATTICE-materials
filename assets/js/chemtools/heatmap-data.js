/* 元素性质数据：周期表热力图着色用 */
(function () {
  'use strict';

  /* 电负性（Pauling 标度）；稀有气体无电负性，不列入 */
  var EN = {
    H: 2.20, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98,
    Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.90, P: 2.19, S: 2.58, Cl: 3.16,
    K: 0.82, Ca: 1.00, Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55, Fe: 1.83,
    Co: 1.88, Ni: 1.91, Cu: 1.90, Zn: 1.65, Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96,
    Kr: 3.00, Rb: 0.82, Sr: 0.95, Y: 1.22, Zr: 1.33, Nb: 1.60, Mo: 2.16, Tc: 1.90,
    Ru: 2.20, Rh: 2.28, Pd: 2.20, Ag: 1.93, Cd: 1.69, In: 1.78, Sn: 1.96, Sb: 2.05,
    Te: 2.10, I: 2.66, Xe: 2.60, Cs: 0.79, Ba: 0.89, La: 1.10, Ce: 1.12, Pr: 1.13,
    Nd: 1.14, Pm: 1.13, Sm: 1.17, Eu: 1.20, Gd: 1.20, Tb: 1.20, Dy: 1.22, Ho: 1.23,
    Er: 1.24, Tm: 1.25, Yb: 1.10, Lu: 1.27, Hf: 1.30, Ta: 1.50, W: 2.36, Re: 1.90,
    Os: 2.20, Ir: 2.20, Pt: 2.28, Au: 2.54, Hg: 2.00, Tl: 1.62, Pb: 2.33, Bi: 2.02,
    Po: 2.00, At: 2.20, Fr: 0.70, Ra: 0.90, Ac: 1.10, Th: 1.30, Pa: 1.50, U: 1.38,
    Np: 1.36, Pu: 1.28, Am: 1.13, Cm: 1.28, Bk: 1.30, Cf: 1.30, Es: 1.30, Fm: 1.30,
    Md: 1.30, No: 1.30, Lr: 1.30
  };

  /* 熔点 °C（常压）；部分元素标注为升华温度 */
  var MP = {
    H: -259, He: -272, Li: 180, Be: 1287, B: 2076, C: 3550, N: -210, O: -218, F: -220, Ne: -249,
    Na: 98, Mg: 650, Al: 660, Si: 1414, P: 44, S: 115, Cl: -102, Ar: -189,
    K: 63, Ca: 842, Sc: 1541, Ti: 1668, V: 1910, Cr: 1907, Mn: 1246, Fe: 1538,
    Co: 1495, Ni: 1455, Cu: 1085, Zn: 420, Ga: 30, Ge: 938, As: 817, Se: 221, Br: -7, Kr: -157,
    Rb: 39, Sr: 777, Y: 1526, Zr: 1855, Nb: 2477, Mo: 2623, Tc: 2157, Ru: 2334,
    Rh: 1964, Pd: 1555, Ag: 962, Cd: 321, In: 157, Sn: 232, Sb: 631, Te: 450,
    I: 114, Xe: -112, Cs: 28, Ba: 727, La: 920, Ce: 795, Pr: 931, Nd: 1021,
    Pm: 1042, Sm: 1074, Eu: 822, Gd: 1313, Tb: 1356, Dy: 1412, Ho: 1474, Er: 1529,
    Tm: 1545, Yb: 824, Lu: 1663, Hf: 2233, Ta: 3017, W: 3422, Re: 3186, Os: 3033,
    Ir: 2446, Pt: 1768, Au: 1064, Hg: -39, Tl: 304, Pb: 327, Bi: 271, Po: 254,
    Fr: 27, Ra: 700, Ac: 1050, Th: 1750, Pa: 1568, U: 1135, Np: 640, Pu: 640,
    Am: 1176, Cm: 1345, Bk: 986, Cf: 900, Es: 860
  };

  /* 原子半径 pm（经验值，约等于共价半径） */
  var R = {
    H: 37, He: 32, Li: 152, Be: 112, B: 85, C: 77, N: 75, O: 73, F: 71, Ne: 38,
    Na: 186, Mg: 160, Al: 143, Si: 117, P: 110, S: 104, Cl: 99, Ar: 98,
    K: 231, Ca: 197, Sc: 162, Ti: 147, V: 134, Cr: 128, Mn: 127, Fe: 126,
    Co: 125, Ni: 124, Cu: 128, Zn: 137, Ga: 122, Ge: 122, As: 119, Se: 117, Br: 114, Kr: 112,
    Rb: 244, Sr: 215, Y: 180, Zr: 160, Nb: 146, Mo: 139, Tc: 136, Ru: 134,
    Rh: 134, Pd: 137, Ag: 144, Cd: 149, In: 163, Sn: 141, Sb: 141, Te: 137,
    I: 133, Xe: 131, Cs: 262, Ba: 217, La: 187, Ce: 182, Pr: 182, Nd: 181,
    Pm: 180, Sm: 180, Eu: 199, Gd: 179, Tb: 177, Dy: 177, Ho: 176, Er: 176,
    Tm: 175, Yb: 194, Lu: 174, Hf: 159, Ta: 146, W: 139, Re: 137, Os: 135,
    Ir: 136, Pt: 139, Au: 144, Hg: 151, Tl: 170, Pb: 175, Bi: 155, Po: 167,
    Fr: 260, Ra: 221, Ac: 188, Th: 180, Pa: 161, U: 156, Np: 155, Pu: 159
  };

  /* 地壳丰度 ppm（按质量） */
  var ABUND = {
    H: 1400, He: 0.008, Li: 20, Be: 2.8, B: 10, C: 200, N: 19, O: 461000, F: 585, Ne: 0.005,
    Na: 23600, Mg: 23300, Al: 82300, Si: 282000, P: 1050, S: 350, Cl: 145, Ar: 3.5,
    K: 20900, Ca: 41500, Sc: 22, Ti: 5650, V: 120, Cr: 102, Mn: 950, Fe: 56300,
    Co: 25, Ni: 84, Cu: 60, Zn: 70, Ga: 19, Ge: 1.5, As: 1.8, Se: 0.05, Br: 2.4, Kr: 0.001,
    Rb: 90, Sr: 370, Y: 33, Zr: 165, Nb: 20, Mo: 1.2, Tc: 0, Ru: 0.001, Rh: 0.001,
    Pd: 0.015, Ag: 0.075, Cd: 0.15, In: 0.25, Sn: 2.3, Sb: 0.2, Te: 0.001, I: 0.45,
    Xe: 0.00003, Cs: 3, Ba: 425, La: 39, Ce: 66.5, Pr: 9.2, Nd: 41.5, Pm: 0,
    Sm: 7.05, Eu: 2.0, Gd: 6.2, Tb: 1.2, Dy: 5.2, Ho: 1.3, Er: 3.5, Tm: 0.52,
    Yb: 3.2, Lu: 0.8, Hf: 3.3, Ta: 2.0, W: 1.25, Re: 0.0007, Os: 0.0015,
    Ir: 0.001, Pt: 0.005, Au: 0.004, Hg: 0.08, Tl: 0.85, Pb: 14, Bi: 0.085, Po: 0.0000002,
    Fr: 0.000000001, Ra: 0.0000009, Ac: 0.00000055, Th: 9.6, Pa: 0.0000014, U: 2.8,
    Np: 0, Pu: 0, Am: 0, Cm: 0, Bk: 0, Cf: 0, Es: 0
  };

  var RANGES = {
    en: [0.7, 4.0],
    mp: [-273, 3422],
    radius: [30, 262],
    abund: [0.001, 500000]
  };

  var NAMES = {
    en: '电负性 (Pauling)',
    mp: '熔点 (°C)',
    radius: '原子半径 (pm)',
    abund: '地壳丰度 (ppm)'
  };

  var DATA = { en: EN, mp: MP, radius: R, abund: ABUND };

  /* 蓝系色带：浅 → 深 */
  var C0 = [232, 242, 252], C1 = [16, 78, 140];

  function lerp(a, b, t) {
    return [Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t)];
  }

  function color(mode, symbol) {
    var table = DATA[mode];
    if (!table) return null;
    var v = table[symbol];
    if (v === undefined || v === null || isNaN(v)) return null;
    var range = RANGES[mode];
    var t = (v - range[0]) / (range[1] - range[0]);
    if (mode === 'abund') t = (Math.log10(Math.max(v, 0.001)) - Math.log10(range[0])) / (Math.log10(range[1]) - Math.log10(range[0]));
    t = Math.max(0, Math.min(1, t));
    var c = lerp(C0, C1, Math.pow(t, 0.85));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  function value(mode, symbol) {
    var v = DATA[mode] && DATA[mode][symbol];
    return (v === undefined || v === null || isNaN(v)) ? null : v;
  }

  function unit(mode) {
    return { en: '', mp: ' °C', radius: ' pm', abund: ' ppm' }[mode] || '';
  }

  window.Heat = { color: color, value: value, unit: unit, name: function (m) { return NAMES[m]; }, ranges: RANGES };
})();
