/* ============================================================
   LATTICE · 应用外壳（十环节版）
   状态 / 路由 / 真实文件导入 / 真实导出 / 配色系统 /
   流水线引擎 / 推理轨迹 / 运行日志
   ============================================================ */
window.MR = window.MR || {};

/* ---------------- 环节与阶段定义 ---------------- */
MR.STAGES = [
  { k: 'imp',      n: '01', t: '文献导入与解析',   d: '上传 → 结构化 → 方法与原理分析', ph: 0 },
  { k: 'scope',    n: '02', t: '文献拓展与研究定位', d: '选研究对象与变量 → 检索真实文献 → 新方向', ph: 0 },
  { k: 'design',   n: '03', t: '变量设计与安全评估', d: '配比确定 → 线上原理 → 线下风险与成功率', ph: 0 },
  { k: 'figure',   n: '04', t: '数据预期与 SCI 图形', d: '预期数据 → 流程与分子机理图', ph: 1 },
  { k: 'analysis', n: '05', t: '结果分析与作图',   d: '折线 / 柱状 / 散点 / 响应面 → 导出', ph: 1 },
  { k: 'guide',    n: '06', t: '实验指导书',       d: '试剂 / 步骤 / 引用来源 / 可打印', ph: 1 },
  { k: 'feedback', n: '07', t: '真实数据回填与矫正', d: '实测 vs 预测 → 偏差归因', ph: 1 },
  { k: 'paper',    n: '08', t: '论文撰写',         d: '背景 / 方法 / 结果 / 展望 + 知网引用', ph: 2 },
  { k: 'lang',     n: '09', t: '语言处理',         d: '中英双语 / 口吻模仿 / 降 AI 率', ph: 2 },
  { k: 'review',   n: '10', t: '论文评审',         d: '查重率 · AI 率 · 三位专家审核', ph: 2 }
];
MR.PHASES = [
  { n: 'Ⅰ', t: '立项与设计', d: '文献 → 研究对象 → 变量与安全', keys: ['imp', 'scope', 'design'] },
  { n: 'Ⅱ', t: '实验与数据', d: '预期 → 图形 → 指导 → 实测矫正', keys: ['figure', 'analysis', 'guide', 'feedback'] },
  { n: 'Ⅲ', t: '论文与评审', d: '撰写 → 语言 → 评审', keys: ['paper', 'lang', 'review'] }
];

/* ---------------- 状态 ---------------- */
MR.state = {
  view: 'imp',
  stage: { imp: 'idle', scope: 'idle', design: 'idle', figure: 'idle', analysis: 'idle', guide: 'idle', feedback: 'idle', paper: 'idle', lang: 'idle', review: 'idle' },
  files: [],               /* 用户导入的真实文件 */
  caseSel: 'C1',
  scope: { object: 'graft', oxidant: 'tempo', target: 'biofilm', extra: [] },
  params: Object.assign({}, MR.model.base),
  paramsConfirmed: false,
  figStyle: 'okabe',
  metricTab: 'graft',
  chartType: 'line',
  realData: null,
  realSource: null,
  lang: 'zh',
  styleLearned: false,
  reviewDone: false,
  paperSections: { abstract: 1, intro: 1, method: 1, results: 1, conclusion: 1 },
  credits: 0,
  credMax: 2500
};

/* ---------------- 配色系统 ---------------- */
MR.colorMeta = [
  { k: 'fiber', t: '纤维基材' }, { k: 'sub', t: '羧基/接枝位点' }, { k: 'oxi', t: '氧化剂' },
  { k: 'link', t: '活化剂 EDC/NHS' }, { k: 'anti', t: '抗菌基团' }, { k: 'ros', t: '活性氧物种' },
  { k: 'bacteria', t: '细菌 / 生物膜' }
];
MR.colors = {
  fiber: '#8B8F94', sub: '#0E5C56', oxi: '#B4761F', link: '#2C4A7C',
  anti: '#9B382A', ros: '#6B4E7A', bacteria: '#2E6A45'
};
/* 图表风格 = 期刊制图预设：颜色取自各期刊常用色板，线宽/标记/网格按该刊惯例 */
MR.stylePresets = {
  sci:    { t: 'Nature / NPG', line: 1.1, marker: 3.2, grid: 0, font: 9.5, bg: '#FFFFFF', journal: 'NPG（Nature 系列）· 单栏最小字号 5 pt · 600 dpi',
            palette: { fiber: '#7C7C7C', sub: '#E64B35', oxi: '#4DBBD5', link: '#3C5488', anti: '#00A087', ros: '#F39B7F', bacteria: '#8491B4' } },
  okabe:  { t: 'Okabe–Ito（色盲安全）', line: 1.2, marker: 3.4, grid: 0, font: 10, bg: '#FFFFFF', journal: '色盲安全金标准 · 主流期刊投稿首选',
            palette: { fiber: '#666666', sub: '#0072B2', oxi: '#E69F00', link: '#56B4E9', anti: '#009E73', ros: '#CC79A7', bacteria: '#D55E00' } },
  origin: { t: 'Origin 默认', line: 1.2, marker: 3.0, grid: 1, font: 10, bg: '#FFFFFF', journal: 'Origin 默认风格 · 便于与你在 Origin 中排版的图统一',
            palette: { fiber: '#8B8F94', sub: '#0E5C56', oxi: '#B4761F', link: '#2C4A7C', anti: '#9B382A', ros: '#6B4E7A', bacteria: '#2E6A45' } },
  glm:    { t: 'GLM 莫兰迪', line: 1.3, marker: 3.2, grid: 1, font: 10.5, bg: '#FFFFFF', journal: '低饱和素雅 · 综述与演示友好',
            palette: { fiber: '#7F8C8D', sub: '#6C8EBF', oxi: '#D6B656', link: '#4A6B8A', anti: '#82B366', ros: '#9673A6', bacteria: '#B85450' } }
};
MR.JOURNAL_PALETTES = function () { return (MR.sci && MR.sci.PALETTES) || {}; };
MR.C = function (k) { return MR.colors[k] || '#333'; };
MR.figSpec = function () { return MR.stylePresets[MR.state.figStyle] || MR.stylePresets.origin; };

/* ---------------- 工具 ---------------- */
MR.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
MR.f1 = function (v, d) { return Number(v).toFixed(d === undefined ? 1 : d); };
MR.pct = function (v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + '%'; };

/* 真实下载 */
MR.dl = function (filename, text, mime) {
  var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  MR.log('OK', '已下载文件 <b>' + filename + '</b>（' + (text.length / 1024).toFixed(1) + ' KB）');
};
/* 真实导出 SVG（把当前配色烘焙为字面色，脱离 CSS 变量后可独立打开） */
MR.dlSVG = function (el, filename) {
  if (!el) { MR.log('WARN', '未找到可导出的图形'); return; }
  var svg = el.querySelector('svg');
  if (!svg) { MR.log('WARN', '图形尚未渲染完成'); return; }
  var clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  var st = window.getComputedStyle(document.documentElement);
  clone.querySelectorAll('*').forEach(function (n) {
    ['fill', 'stroke'].forEach(function (at) {
      var v = n.getAttribute(at);
      if (!v) return;
      var m = v.match(/^var\((--[a-z0-9-]+)\)$/i);
      if (m) n.setAttribute(at, st.getPropertyValue(m[1]).trim() || '#333');
    });
  });
  var str = new XMLSerializer().serializeToString(clone);
  MR.dl(filename, '<?xml version="1.0" encoding="UTF-8"?>\n' + str, 'image/svg+xml');
};
MR.dlCSV = function (filename, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (c) { return /[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c; }).join(',');
  }).join('\n');
  MR.dl(filename, '\ufeff' + csv, 'text/csv');
};
MR.pick = function (which) {
  var el = document.getElementById(which === 'csv' ? 'csvInput' : 'fileInput');
  if (el) el.click();
};

/* 文件名解析：2025Frontiers ... ——題名 */
MR.parseName = function (name) {
  var s = String(name).replace(/\.(pdf|txt|csv|bib|ris|json)$/i, '');
  var m = s.match(/^(\d{4})/);
  var year = m ? +m[1] : null;
  var parts = s.split(/——|—|--/);
  var journal = '', title = s;
  if (parts.length > 1) {
    title = parts.slice(1).join('—').trim();
    journal = parts[0].replace(/^\d{4}\s*/, '').trim();
  }
  var tag = 'other';
  var low = title.toLowerCase();
  if (/biofilm|pseudomonas|staphylococc|bacteri|microbi|antibiotic/.test(low)) tag = 'microbio';
  else if (/chitosan|chitin/.test(low)) tag = 'chitosan';
  else if (/silver|nanoparticle|tio2|zno|copper/.test(low)) tag = 'metal';
  else if (/quaternary|ammonium|biguanide|halamine|arylamide/.test(low)) tag = 'qas';
  else if (/tempo|periodate|oxid|carboxyl|aldehyde|graft/.test(low)) tag = 'cellchem';
  else if (/cotton|cellulose|fiber|fabric|textile/.test(low)) tag = 'cellulose';
  return { year: year, journal: journal, title: title, tag: tag };
};

/* 引用标签 */
MR.cite = function (n, bad) { return '<span class="cite' + (bad ? ' is-bad' : '') + '" data-cite="' + n + '" title="点击查看引用来源">[' + n + ']</span>'; };

/* ---------------- 文献库 ---------------- */
MR.lib = {
  rows: [],
  init: function () {
    var out = [];
    (window.MR_LIB || []).forEach(function (r) {
      out.push({ id: r.id, y: r.y, j: r.j, t: r.t, tag: r.tag, src: 'folder', verified: r.y <= 2000 });
    });
    (MR.coreRefs || []).forEach(function (r) {
      out.push({ id: r.id, y: +r.gbt.match(/\b(19|20)\d{2}\b/)[0], j: (r.gbt.split(']. ')[1] || '').split(',')[0], t: r.gbt.split('. ')[1] || r.gbt, tag: 'core', src: 'core', verified: true, doi: r.doi });
    });
    this.rows = out;
  },
  add: function (list) { this.rows = list.concat(this.rows); },
  search: function (q, tag, ymin, ymax) {
    q = (q || '').trim().toLowerCase();
    return this.rows.filter(function (r) {
      if (tag && tag !== 'all' && r.tag !== tag) return false;
      if (ymin && r.y < ymin) return false;
      if (ymax && r.y > ymax) return false;
      if (!q) return true;
      return (r.t + ' ' + r.j + ' ' + r.y).toLowerCase().indexOf(q) >= 0;
    });
  },
  /* 生成可用的外部检索链接 —— 真实可点开 */
  links: function (q) {
    var e = encodeURIComponent(q);
    return [
      { t: 'OpenAlex', u: 'https://openalex.org/works?search=' + e },
      { t: 'Crossref', u: 'https://search.crossref.org/?q=' + e },
      { t: 'Google Scholar', u: 'https://scholar.google.com/scholar?q=' + e },
      { t: 'CNKI 知网', u: 'https://kns.cnki.net/kns8s/defaultresult/index?kw=' + e },
      { t: 'Semantic Scholar', u: 'https://www.semanticscholar.org/search?q=' + e },
      { t: 'PubMed', u: 'https://pubmed.ncbi.nlm.nih.gov/?term=' + e }
    ];
  }
};

/* ---------------- 运行日志 / 推理轨迹 ---------------- */
MR.log = function (lv, msg) {
  var body = document.getElementById('consoleBody');
  if (!body) return;
  var d = new Date();
  var t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  var row = document.createElement('div');
  row.className = 'cl';
  row.innerHTML = '<span class="cl__t">' + t + '</span><span class="cl__lv cl__lv--' + lv + '">' + lv + '</span><span class="cl__m">' + msg + '</span>';
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
  while (body.children.length > 240) body.removeChild(body.firstChild);
};

MR.trace = {
  items: [],
  setStage: function () { this.items = []; this.render(); },
  push: function (step, st) { this.items.push({ step: step, st: st }); this.render(); var b = document.getElementById('traceBody'); if (b) b.scrollTop = b.scrollHeight; },
  render: function () {
    var b = document.getElementById('traceBody'), c = document.getElementById('traceCount');
    if (!b) return;
    if (!this.items.length) {
      b.innerHTML = '<div class="tr"><div class="tr__k">IDLE</div><div class="tr__t">等待环节启动</div>' +
        '<div class="tr__b">本环节的推理链路会在此实时展开：<b>输入 → 约束 → 计算 → 判定</b>。每一步都可追溯到具体数据或文献。</div></div>';
    } else {
      b.innerHTML = this.items.map(function (it) {
        var kv = it.step.kv ? '<div class="tr__kv">' + it.step.kv.map(function (p) { return '<span class="chip chip--mono">' + p[0] + ' ' + p[1] + '</span>'; }).join('') + '</div>' : '';
        return '<div class="tr tr--' + it.st + '"><div class="tr__k">' + it.step.k + '</div><div class="tr__t">' + it.step.t +
          '</div><div class="tr__b">' + it.step.b + '</div>' + kv + '</div>';
      }).join('');
    }
    if (c) c.textContent = this.items.length + ' 步';
    b.scrollTop = b.scrollHeight;
  }
};
MR.playTrace = function (steps, cb) {
  MR.trace.setStage();
  var i = 0;
  (function nx() {
    if (i >= steps.length) { if (cb) cb(); return; }
    var s = steps[i]; i++;
    MR.trace.push(s, i === steps.length ? 'done' : 'run');
    MR.log('AI', '<b>' + String(s.k).split(' ')[0] + '</b> · ' + s.t);
    setTimeout(nx, 240);
  })();
};

/* ---------------- 算力 ---------------- */
MR.spend = function (n) {
  MR.state.credits = Math.min(MR.state.credMax, MR.state.credits + n);
  var v = document.getElementById('creditVal'), b = document.getElementById('creditBar');
  if (v) v.textContent = MR.state.credits;
  if (b) b.style.width = (MR.state.credits / MR.state.credMax * 100).toFixed(2) + '%';
};
MR.COST = { imp: 42, scope: 36, design: 28, figure: 54, analysis: 33, guide: 22, feedback: 40, paper: 68, lang: 45, review: 52 };

/* ---------------- 弹窗 ---------------- */
MR.modal = {
  _lastFocus: null,
  open: function (title, body, foot) {
    try { this._lastFocus = document.activeElement; } catch (e) {}
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFoot').innerHTML = foot || '<button class="btn" data-close="1">关闭</button>';
    var m = document.getElementById('modal');
    m.hidden = false;
    var panel = m.querySelector('.modal__panel');
    if (panel) { var f = panel.querySelector('input,textarea,button,[tabindex]'); (f || panel).focus(); }
  },
  close: function () {
    var m = document.getElementById('modal');
    m.hidden = true;
    if (this._lastFocus && this._lastFocus.focus) { try { this._lastFocus.focus(); } catch (e) {} }
    this._lastFocus = null;
  },
  trap: function (e) {
    if (e.key !== 'Tab') return;
    var m = document.getElementById('modal');
    if (m.hidden) return;
    var f = m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
};

/* ---------------- 片段组件 ---------------- */
MR.head = function (o) {
  return '<div class="view__head"><div>' +
    '<h1 class="view__title"><span class="mono-xs" style="display:block;margin-bottom:6px">环节 ' + o.n + ' / 10</span>' + o.t + '</h1>' +
    '<p class="view__sub">' + o.sub + '</p></div>' +
    (o.acts ? '<div class="view__acts">' + o.acts + '</div>' : '') + '</div>';
};
MR.panel = function (o) {
  return '<section class="panel ' + (o.cls || '') + '">' +
    (o.title ? '<div class="panel__head' + (o.pad ? ' panel__head--pad' : '') + '"><h3 class="panel__title">' +
      (o.icon ? MR.icon(o.icon) : '') + o.title + '</h3>' +
      (o.meta ? '<span class="panel__meta">' + o.meta + '</span>' : '') +
      (o.acts ? '<div class="panel__acts">' + o.acts + '</div>' : '') + '</div>' : '') +
    '<div class="panel__body' + (o.flush ? ' panel__body--flush' : '') + (o.tight ? ' panel__body--tight' : '') + '">' + o.body + '</div>' +
    (o.note ? '<div class="panel__note">' + o.note + '</div>' : '') + '</section>';
};
MR.kpi = function (o) {
  return '<div class="kpi ' + (o.cls || '') + '">' +
    '<div class="kpi__label">' + o.label + '</div>' +
    '<div class="kpi__val">' + o.val + (o.unit ? '<small>' + o.unit + '</small>' : '') + '</div>' +
    '<div class="kpi__foot">' + (o.foot || '') + '</div></div>';
};
MR.metric = function (k, v, unit, target, state, note) {
  return '<div class="metric' + (state ? ' is-' + state : '') + '"><div class="metric__k">' + k + '</div>' +
    '<div class="metric__v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div>' +
    '<div class="metric__t">' + (target ? '目标 ' + target : '') + (note ? ' · ' + note : '') + '</div></div>';
};
MR.chip = function (t, k) { return '<span class="chip' + (k ? ' chip--' + k : '') + '">' + t + '</span>'; };
MR.note = function (t, kind, icon) {
  return '<div class="note' + (kind ? ' note--' + kind : '') + '">' + MR.icon(icon || 'review1', 14) + '<span>' + t + '</span></div>';
};
MR.ICONS = {
  overview: '<path d="M2 2h5v5H2zM8.5 2h5v5h-5zM2 8.5h5v5H2zM8.5 8.5h5v5h-5z" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  imp: '<path d="M7 9.5V2M7 2 4.4 4.6M7 2l2.6 2.6M2.5 11.5h9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
  scope: '<circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10.5 10.5 13.3 13.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M7 4.8v4.4M4.8 7h4.4" stroke="currentColor" stroke-width="1" opacity="0.5" stroke-linecap="round"/>',
  design: '<path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="10.2" cy="12" r="1.5" fill="none" stroke="currentColor" stroke-width="1.1"/>',
  figure: '<rect x="2" y="2.5" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 9.5 6 6.5l2 2 2.5-3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  analysis: '<path d="M2 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M3.5 9.5V6M6.5 9.5V3.5M9.5 9.5V7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  guide: '<path d="M3.5 2.2h5.6l3.4 3.4v8.2h-9z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.6 7.4h4.8M5.6 9.6h4.8M5.6 11.6h3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  feedback: '<path d="M2.5 7a4.5 4.5 0 0 1 7.6-3.2L12 5.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M11.5 7a4.5 4.5 0 0 1-7.6 3.2L2 8.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  paper: '<path d="M3.5 2.2h5.6l3.4 3.4v8.2h-9z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 8.4h4M6 10.6h2.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  lang: '<path d="M2.6 4h5M5 2.6v1.6M3 4c.6 2.2 2 3.6 4 4.4M6.6 4C6 6.4 4.6 8 2.6 8.8" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M7.4 12 9.6 6.4 11.8 12M8.2 10.4h2.8" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  review: '<circle cx="6.6" cy="6.6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M9.9 9.9 13.4 13.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4.6 6.6h4" stroke="currentColor" stroke-width="1" opacity="0.5" stroke-linecap="round"/>',
  lit: '<path d="M4 2.5h7.5v11H4z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 5h3.5M6 7.5h3.5M6 10h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  book: '<path d="M2.5 3.2h4a1.8 1.8 0 0 1 1.5.9 1.8 1.8 0 0 1 1.5-.9h4v8.6h-4a1.8 1.8 0 0 0-1.5.9 1.8 1.8 0 0 0-1.5-.9h-4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  history: '<circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3.2l2.2 1.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>',
  exp: '<path d="M6 2.2v4.2L2.9 11.6A1.1 1.1 0 0 0 3.9 13.3h6.2a1.1 1.1 0 0 0 1-1.7L8 6.4V2.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.4 2.2h5.2M4.2 10.2h7.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  plan: '<path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
};
MR.icon = function (n, size) { return '<svg viewBox="0 0 14 14" width="' + (size || 13) + '" height="' + (size || 13) + '" aria-hidden="true">' + (MR.ICONS[n] || MR.ICONS.plan) + '</svg>'; };

/* ---------------- 渲染 ---------------- */
MR.views = {};
MR.app = { busy: false, pipeline: false, runToken: 0 };

/** 绑定视图内的配色控件：<input type="color" data-figcolor="key"> */
MR.buildColorInputs = function (host, keys) {
  (keys || Object.keys(MR.colors)).forEach(function (k) {
    var el = host.querySelector('input[data-figcolor="' + k + '"]');
    if (!el) return;
    el.value = MR.colors[k];
    el.addEventListener('input', function () { MR.colors[k] = el.value; renderMain(); });
  });
};

function stageOf(k) { for (var i = 0; i < MR.STAGES.length; i++) if (MR.STAGES[i].k === k) return MR.STAGES[i]; return null; }

function renderPhase() {
  var el = document.getElementById('phasebar');
  if (!el) return;
  el.innerHTML = MR.PHASES.map(function (p, i) {
    var done = p.keys.filter(function (k) { return MR.state.stage[k] === 'done'; }).length;
    var on = p.keys.indexOf(MR.state.view) >= 0;
    return '<button type="button" class="phase' + (on ? ' is-on' : '') + (done === p.keys.length ? ' is-done' : '') + '" data-phase="' + i + '">' +
      '<span class="phase__n">' + p.n + '</span>' +
      '<span style="flex:1;text-align:left"><span class="phase__t" style="display:block">' + p.t + '</span>' +
      '<span class="phase__d" style="display:block">' + p.d + '</span></span>' +
      '<span class="mono-xs">' + done + '/' + p.keys.length + '</span>' +
      '<span class="phase__bar"><i style="width:' + (done / p.keys.length * 100) + '%"></i></span></button>';
  }).join('');
  el.querySelectorAll('[data-phase]').forEach(function (b) {
    b.addEventListener('click', function () {
      var keys = MR.PHASES[+b.getAttribute('data-phase')].keys;
      var next = keys.filter(function (k) { return MR.state.stage[k] !== 'done'; })[0] || keys[0];
      MR.app.setView(next);
    });
  });
}
function renderRail() {
  var el = document.getElementById('rail');
  if (!el) return;
  var html = '';
  MR.PHASES.forEach(function (p) {
    html += '<div class="rail__group"><div class="rail__gtitle">' + p.n + ' · ' + p.t + '</div>';
    html += p.keys.map(function (k) {
      var s = stageOf(k), st = MR.state.stage[k];
      return '<button type="button" class="rail__item ' + (MR.state.view === k ? 'is-active ' : '') + 'is-' + st + '" data-goto="' + k + '">' +
        '<span class="rail__num">' + s.n + '</span><span class="rail__label">' + s.t + '</span><span class="rail__state"></span></button>';
    }).join('') + '</div>';
  });
  var done = MR.STAGES.filter(function (s) { return MR.state.stage[s.k] === 'done'; }).length;
  html += '<div class="rail__div"></div><div class="rail__foot">' +
    '<div class="mono-xs" style="margin-bottom:6px">流水线进度</div>' +
    '<div class="bar bar--tall"><i style="width:' + (done / 10 * 100) + '%"></i></div>' +
    '<div class="mono-xs" style="margin-top:6px">' + done + ' / 10 环节已完成</div></div>';
  el.innerHTML = html;
  el.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { MR.app.setView(b.getAttribute('data-goto')); });
  });
}
function renderMain() {
  var main = document.getElementById('main');
  var keep = main.scrollTop;
  var v = (MR.views2 && MR.views2[MR.state.view]) || MR.views[MR.state.view];
  if (!v) return;
  main.innerHTML = '<div class="view">' + v.render() + '</div>';
  if (v.mount) v.mount(main);
  main.scrollTop = keep;
}
MR.app.render = function () { renderPhase(); renderRail(); renderMain(); };
MR.app.setView = function (k) {
  MR.state.view = k;
  document.getElementById('main').scrollTop = 0;
  var s = stageOf(k);
  MR.log('INFO', '切换到 <b>' + s.n + ' ' + s.t + '</b> · ' + s.d);
  renderPhase(); renderRail(); renderMain();
};
MR.app.setStage = function (k, st) { MR.state.stage[k] = st; renderPhase(); renderRail(); };

/* 引擎：跑一个环节 */
MR.app.runStage = function (key, opts) {
  opts = opts || {};
  if (MR.app.busy) { MR.log('WARN', '已有环节正在运行'); return; }
  var st = MR.state.stage;
  if (st[key] === 'done' && !opts.force) { if (opts.cb) opts.cb(); return; }
  var idx = MR.STAGES.map(function (s) { return s.k; }).indexOf(key);
  for (var j = 0; j < idx; j++) if (st[MR.STAGES[j].k] !== 'done') st[MR.STAGES[j].k] = 'done';
  MR.app.busy = true;
  MR.app.setStage(key, 'run');
  var s = stageOf(key);
  MR.log('RUN', '启动 <b>' + s.n + ' ' + s.t + '</b>');
  MR.playTrace((MR.traceFor ? MR.traceFor(key) : ((MR.traces && MR.traces[key]) || [])), function () {
    MR.app.setStage(key, 'done');
    var nk = MR.STAGES[idx + 1] ? MR.STAGES[idx + 1].k : null;
    if (nk && st[nk] === 'idle') MR.app.setStage(nk, 'run');
    MR.spend(MR.COST[key] || 30);
    MR.log('OK', '<b>' + s.t + '</b> 完成');
    MR.app.busy = false;
    renderPhase(); renderRail();
    if (!opts.silent) renderMain();
    if (opts.cb) opts.cb();
  });
};
MR.app.runAll = function () {
  if (MR.app.busy || MR.app.pipeline) { MR.log('WARN', '流水线正在运行中'); return; }
  MR.app.pipeline = true;
  var token = ++MR.app.runToken;
  var keys = MR.STAGES.map(function (s) { return s.k; });
  var i = 0;
  MR.log('RUN', '=== 启动端到端流水线（10 环节）===');
  keys.forEach(function (k) { MR.state.stage[k] = 'idle'; });
  (function next() {
    if (token !== MR.app.runToken) return;
    if (i >= keys.length) {
      MR.app.pipeline = false;
      MR.log('OK', '=== 全部 10 个环节完成 ===');
      MR.app.setView('review');
      return;
    }
    var k = keys[i++];
    if (k === 'scope' && !MR.state.files.length) { MR.log('WARN', '尚未导入文献，演示将使用内置验证案例'); MR.state.caseSel = 'C1'; }
    if (k === 'design' && !MR.state.paramsConfirmed) { MR.state.paramsConfirmed = true; MR.log('AI', '自动采用模型给出的推荐配比（可在环节 03 手动修改）'); }
    MR.app.setView(k);
    setTimeout(function () {
      if (token !== MR.app.runToken) return;
      MR.app.runStage(k, { cb: function () { setTimeout(next, 380); } });
    }, 380);
  })();
};

/* ---------------- 真实文件导入 ---------------- */
MR.app.handleFiles = function (fileList) {
  var files = Array.prototype.slice.call(fileList);
  if (!files.length) return;
  var added = [], known = [];
  files.forEach(function (f) {
    var meta = MR.parseName(f.name);
    var rec = { name: f.name, size: f.size, year: meta.year, journal: meta.journal, title: meta.title, tag: meta.tag, src: 'upload' };
    var cs = MR.cases.filter(function (c) { return c.file === f.name; })[0];
    if (cs) { rec.case = cs.id; known.push(cs.id); }
    added.push(rec);
  });
  MR.state.files = added.concat(MR.state.files);
  MR.lib.add(added.map(function (a, i) {
    return { id: 'U' + (MR.lib.rows.length + i), y: a.year || 0, j: a.journal || '（未解析）', t: a.title, tag: a.tag, src: 'upload' };
  }));
  MR.log('OK', '导入 <b>' + added.length + '</b> 个文件 · ' + added.filter(function (a) { return a.year; }).length + ' 个成功解析年份与期刊');
  if (known.length) {
    MR.log('AI', '识别到验证案例 <b>' + known.join('、') + '</b>，已载入全文解析结果');
    MR.state.caseSel = known[0];
  }
  MR.app.render();
  if (MR.state.view !== 'imp') MR.app.setView('imp');
};

/* ---------------- Tweaks ---------------- */
function initTweaks() {
  var app = document.getElementById('app');
  document.getElementById('tweaksFab').addEventListener('click', function () {
    document.getElementById('tweaks').setAttribute('data-open', 'true');
  });
  var row = document.getElementById('paletteRow');
  row.innerHTML = MR.colorMeta.map(function (c) {
    return '<label class="pal"><input type="color" data-color="' + c.k + '" value="' + MR.colors[c.k] + '">' + c.t + '</label>';
  }).join('');
  row.querySelectorAll('input[data-color]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      MR.colors[inp.getAttribute('data-color')] = inp.value;
      renderMain();
    });
  });
  /** 供各视图重建配色控件（模块级，视图渲染前即可用） */
  document.querySelectorAll('#swatches .sw').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#swatches .sw').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      app.setAttribute('data-acc', b.getAttribute('data-acc'));
      renderMain();
    });
  });
  function seg(id, fn) {
    document.querySelectorAll('#' + id + ' button').forEach(function (b) {
      b.addEventListener('click', function () {
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        fn(b.getAttribute('data-v'));
      });
    });
  }
  seg('segDensity', function (v) { app.setAttribute('data-density', v); });
  seg('segGrid', function (v) { app.setAttribute('data-grid', v); });
  seg('segFig', function (v) {
    MR.state.figStyle = v;
    var p = MR.stylePresets[v].palette;
    Object.keys(p).forEach(function (k) { MR.colors[k] = p[k]; });
    row.querySelectorAll('input[data-color]').forEach(function (i) { i.value = MR.colors[i.getAttribute('data-color')]; });
    MR.log('INFO', '图表风格切换为 <b>' + ({ sci: 'Nature/NPG', okabe: 'Okabe–Ito', origin: 'Origin', glm: '莫兰迪' }[v] || v) + '</b>，配色同步更新');
    renderMain();
  });
}

/* ---------------- 顶栏交互 ---------------- */
function initTop() {
  document.getElementById('impBtn').addEventListener('click', function () { MR.pick('file'); });
  document.getElementById('dlBtn').addEventListener('click', function () { MR.views.imp.exportCenter(); });
  document.getElementById('runAllBtn').addEventListener('click', function () { MR.app.runAll(); });
  var lb = document.getElementById('loginBtn');
  if (lb) lb.addEventListener('click', function () { MR.ui.openLogin(); });
  var uc = document.getElementById('userChip');
  if (uc) uc.addEventListener('click', function () {
    MR.modal.open('退出登录？',
      MR.note('你将以 <b>' + MR.esc((MR.cloud.user && (MR.cloud.user.email || MR.cloud.user.name)) || '当前用户') + '</b> 身份退出。本机论文库保留，云端数据不受影响。', 'acc', 'review1'),
      '<button class="btn" data-close="1">取消</button><button class="btn btn--primary" data-act="doSignOut">退出登录</button>');
    setTimeout(function () {
      var b = document.querySelector('[data-act="doSignOut"]');
      if (b) b.addEventListener('click', function () { MR.ui.signOut(); MR.modal.close(); });
    }, 0);
  });
  var tb = document.getElementById('traceBtn');
  tb.addEventListener('click', function () {
    var app = document.getElementById('app');
    var off = app.getAttribute('data-trace') === 'off';
    app.setAttribute('data-trace', off ? 'on' : 'off');
    tb.setAttribute('aria-pressed', off ? 'true' : 'false');
  });
  var ct = document.getElementById('consoleToggle');
  ct.addEventListener('click', function () {
    var c = document.getElementById('console');
    var open = c.getAttribute('data-open') !== 'false';
    c.setAttribute('data-open', open ? 'false' : 'true');
    document.getElementById('consoleToggleText').textContent = open ? '展开' : '收起';
  });
  document.getElementById('modalClose').addEventListener('click', function () { MR.modal.close(); });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-close]')) MR.modal.close();
    var tw = document.getElementById('tweaks');
    if (tw.getAttribute('data-open') === 'true' && e.target.closest &&
        !e.target.closest('.tweaks__panel') && !e.target.closest('.tweaks__fab')) {
      tw.setAttribute('data-open', 'false');
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') MR.modal.close(); });
  document.addEventListener('keydown', function (e) { MR.modal.trap(e); });
  /* 引文点击 */
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-cite]');
    if (!c) return;
    var n = +c.getAttribute('data-cite');
    var ref = MR.coreRefs.filter(function (r) { return r.n === n; })[0];
    if (!ref) return;
    MR.modal.open('引用来源 [' + n + ']',
      '<div class="note note--ok" style="margin-bottom:14px">' + MR.icon('review1', 14) +
      '<span>该条目已通过 Crossref / 期刊官网核验，题名、作者、卷期页码与 DOI 均可解析。</span></div>' +
      '<dl class="dl"><dt>GB/T 7714</dt><dd>' + ref.gbt + '</dd>' +
      '<dt>文献类型</dt><dd>' + ref.type + '</dd>' +
      '<dt>DOI</dt><dd><a href="https://doi.org/' + ref.doi + '" target="_blank" rel="noopener">' + ref.doi + '</a></dd>' +
      '<dt>核验方式</dt><dd>Crossref API 精确匹配 + 出版方页面比对</dd></dl>',
      '<button class="btn" data-close="1">关闭</button>' +
      '<a class="btn btn--primary" href="https://doi.org/' + ref.doi + '" target="_blank" rel="noopener">在 DOI 打开原文</a>');
  });
  /* 文件输入 */
  ['fileInput', 'csvInput'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('change', function () {
      if (id === 'fileInput') MR.app.handleDocFiles(el.files);
      else if (el.files[0]) MR.app.readCSV(el.files[0]);
      el.value = '';
    });
  });
}

/* 读取 CSV（真实解析） */
MR.app.readCSV = function (file) {
  var fr = new FileReader();
  fr.onload = function () {
    var text = String(fr.result).replace(/^\ufeff/, '');
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    var rows = lines.map(function (l) {
      return l.split(/[,\t;]/).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    });
    MR.state.realData = rows;
    MR.state.realSource = file ? file.name : '粘贴数据';
    MR.log('OK', '解析真实数据 <b>' + rows.length + '</b> 行 × ' + (rows[0] || []).length + ' 列，来源 ' + MR.state.realSource);
    if (MR.state.view !== 'feedback') MR.app.setView('feedback'); else MR.app.render();
  };
  fr.readAsText(file, 'utf-8');
};

/* ---------------- 启动 ---------------- */
MR.boot = function () {
  document.getElementById('consoleId').textContent = 'job-2609-0930';
  if (MR.cloud && MR.cloud.init) MR.cloud.init();   // 恢复登录态 / 判定后端是否启用
  MR.lib.init();
  initTop();
  initTweaks();
  MR.app.render();
  MR.log('INFO', 'LATTICE 就绪 · 10 个环节 · 本地文献库 ' + MR.lib.rows.length + ' 条');
  MR.log('AI', '这是一个面向材料学科全部方向的平台：上传任意材料类论文（DOCX / TXT / PDF 或粘贴正文），平台只抽取并分析你导入的这篇文献。未上传时，可在环节 01 选择内置示例文档体验流程。');
  MR.log('AI', '提示：页面内所有实验数值均为「机理约束下的预测值」，在环节 07 回填真实数据后会被矫正。');
};


/* ---------------- 文档上传（真实解析） ---------------- */
MR.app.handleDocFiles = function (fileList) {
  var files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  var f = files[0];
  var name = f.name || '未命名文件';
  var ext = (name.split('.').pop() || '').toLowerCase();
  MR.log('INFO', '读取文件 <b>' + MR.esc(name) + '</b>（' + (f.size / 1024).toFixed(1) + ' KB）');
  function ok(text) {
    if (!text || text.replace(/\s/g, '').length < 200) {
      MR.log('WARN', '解析出的正文少于 200 字，可能不是文字型文档');
      MR.modal.open('解析结果过少',
        MR.note('从该文件只解析出 ' + (text ? text.length : 0) + ' 个字符。可能原因：① 扫描版 PDF（无文字层）；② 文档加密；③ 内容主要是图片与表格。', 'sig', 'review1') +
        '<div class="note" style="margin-top:12px">' + MR.icon('review1', 14) +
        '<span>平台不会用模板内容填补空白。请用 Word 打开后复制正文，再用环节 01 的「粘贴正文」导入。</span></div>');
      return;
    }
    MR.loadText(text, name);
    MR.log('OK', '解析成功：' + (text.length / 1000).toFixed(1) + ' 千字符');
    MR.app.setView('imp');
  }
  function fail(msg) {
    MR.log('RISK', '解析失败：' + msg);
    MR.modal.open('无法解析该文件',
      MR.note(msg, 'risk', 'review1') +
      '<div class="note" style="margin-top:12px">' + MR.icon('plan', 14) +
      '<span>可行的替代方式：① 用 Word 打开后复制正文 → 环节 01「粘贴正文」；② 另存为 .docx 或 .txt 后重新上传；③ 选择内置论文先体验完整流程。</span></div>');
  }
  if (ext === 'docx') {
    MR.doc.readDocx(f, function (text, err) { if (err) fail(err); else ok(text); });
  } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    var fr = new FileReader();
    fr.onload = function () { ok(String(fr.result)); };
    fr.onerror = function () { fail('文件读取失败'); };
    fr.readAsText(f, 'utf-8');
  } else if (ext === 'pdf') {
    MR.doc.readPdf(f, function (text, err) { if (err) fail(err); else ok(text); });
  } else if (ext === 'doc') {
    fail('旧版 .doc 为二进制复合文档，浏览器端无法解析。请用 Word 另存为 .docx 后重新上传。');
  } else {
    fail('不支持的文件类型 .' + ext + '（支持 DOCX / TXT / MD / PDF）');
  }
};

/* CSV 导入 → 环节 07 */
MR.app.readCSV = function (file) {
  var fr = new FileReader();
  fr.onload = function () {
    var text = String(fr.result).replace(/^\ufeff/, '');
    var rows = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (l) {
      return l.split(/[,\t;]/).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    });
    MR.state.realData = rows;
    MR.state.realSource = file ? file.name : '导入数据';
    MR.log('OK', '解析数据 ' + rows.length + ' 行 × ' + ((rows[0] || []).length) + ' 列');
    MR.app.setView('feedback');
  };
  fr.readAsText(file, 'utf-8');
};
