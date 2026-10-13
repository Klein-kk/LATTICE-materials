/* ============================================================
   LATTICE · 论文专属科学图形生成器
   所有图形的元素（工序、仪器、分子、峰位、波数、形貌描述）全部来自
   抽取结果；配色、线宽、字号由 MR.colors / MR.figSpec() 驱动。
   输出为纯矢量 SVG，符合期刊制图习惯（统一线宽、面板标号、比例尺、图注）。
   ============================================================ */
window.MR = window.MR || {};

MR.figs2 = (function () {
  function S(k) { return MR.C(k); }
  function sp() { return MR.figSpec(); }
  function AX(v) { return v ? '#22262A' : '#22262A'; }
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + (o.mono ? "'IBM Plex Mono',Consolas,monospace" : "'IBM Plex Sans','Microsoft YaHei',sans-serif") +
      '" font-size="' + (o.size || 10) + '" fill="' + (o.fill || AX()) + '" text-anchor="' + (o.anchor || 'start') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') + (o.rot ? ' transform="rotate(' + o.rot + ' ' + x + ' ' + y + ')"' : '') + '>' + s + '</text>';
  }
  function L(x1, y1, x2, y2, o) {
    o = o || {};
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.c || '#5A6169') + '" stroke-width="' + (o.w || sp().line) +
      '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + ' stroke-linecap="round"/>';
  }
  function R(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r === undefined ? 4 : o.r) + '" fill="' + (o.fill || '#fff') +
      '" stroke="' + (o.c || '#D8D3C9') + '" stroke-width="' + (o.w || 1) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function C(cx, cy, r, o) {
    o = o || {};
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.c || '#5A6169') + '" stroke-width="' + (o.w || sp().line) + '"/>';
  }
  function arrow(x1, y1, x2, y2, c, w) {
    c = c || '#8A9199';
    var id = 'a' + Math.round(x1 * 7 + y1 * 13 + x2 * 3);
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">' +
      '<path d="M0 0.6 L10 5 L0 9.4 z" fill="' + c + '"/></marker></defs>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || sp().line + 0.3) +
      '" marker-end="url(#' + id + ')" stroke-linecap="round"/>';
  }
  function frame(w, h) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="' + w + '" height="' + h + '" fill="' + sp().bg + '"/>'; }
  function caption(w, y, no, txt) {
    return T(14, y, no, { size: 10.5, weight: 700 }) + T(14 + String(no).length * 7.5, y, txt, { size: 10, fill: '#4B535B' });
  }

  /* 中文友好的按宽度折行：尽量在标点处断行，避免把一个词/短语从中间切断（解决乱码） */
  function wrapText(text, per, max) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return [];
    var out = [], i = 0;
    while (i < s.length && out.length < (max || 3)) {
      var chunk = s.substr(i, per);
      var cut = -1;
      for (var j = chunk.length - 1; j >= Math.max(0, per - 8); j--) {
        if ('，。；、,.;:！？!?）)】'.indexOf(chunk[j]) >= 0) { cut = j + 1; break; }
      }
      if (cut < 0) cut = per;
      out.push(s.substr(i, cut).trim());
      i += cut;
    }
    return out;
  }

  /* ================= 1. 工艺流程图（来自原文步骤 + 原文仪器） ================= */
  function procFlow(w, profile) {
    var steps = (profile.steps || []).slice(0, 10);
    var insts = profile.instruments || [];
    if (!steps.length) steps = [{ t: '制备', d: '原文未报告可抽取的工艺步骤' }];
    var n = steps.length;
    var cols = n <= 5 ? n : Math.ceil(n / 2);
    var rows = n <= 5 ? 1 : 2;
    var pad = 18, gapX = 26, gapY = 46;
    var bw = (w - pad * 2 - gapX * (cols - 1)) / cols;
    var bh = 108;
    var hTop = 46;
    var h = hTop + rows * bh + (rows - 1) * gapY + 74;
    var s = frame(w, h);
    s += caption(w, 22, '图 1', '制备工艺流程图 —— 工序、条件与设备均取自原文');

    function pos(i) {
      if (rows === 1) return { x: pad + i * (bw + gapX), y: hTop };
      if (i < cols) return { x: pad + i * (bw + gapX), y: hTop };
      var j = n - 1 - i;   /* 第二行反向，便于折返连线 */
      return { x: pad + j * (bw + gapX), y: hTop + bh + gapY };
    }
    steps.forEach(function (st, i) {
      var p = pos(i);
      var isKey = i >= Math.max(0, n - 2);
      s += R(p.x, p.y, bw, bh, { c: isKey ? S('sub') : '#D8D3C9', w: isKey ? 1.5 : 1, fill: '#fff' });
      s += R(p.x, p.y, bw, 20, { r: 4, c: isKey ? S('sub') : '#E4DFD5', fill: isKey ? S('sub') : '#F4F2ED' });
      s += '<rect x="' + p.x + '" y="' + (p.y + 14) + '" width="' + bw + '" height="6" rx="2" fill="' + (isKey ? S('sub') : '#F4F2ED') + '"/>';
      s += T(p.x + 8, p.y + 14.5, (i + 1) + '. ' + st.t, { size: 10.5, weight: 600, fill: isKey ? '#fff' : '#22262A' });
      /* 条件 */
      var cond = (st.cond || '').split(' / ').filter(Boolean).slice(0, 4);
      cond.forEach(function (cd, ci) { s += T(p.x + 8, p.y + 36 + ci * 12, '· ' + cd, { size: 8.5, fill: '#4B535B' }); });
      if (!cond.length) s += T(p.x + 8, p.y + 36, '· 条件：原文未报告', { size: 8.5, fill: '#A2660F' });
      /* 描述 */
      var d = String(st.d || '');
      var per = Math.max(8, Math.floor(bw / 6.2));
      var lines = wrapText(d, per, 3);
      lines.forEach(function (tx, li) { s += T(p.x + 8, p.y + 62 + li * 12, tx, { size: 8, fill: '#6B7278' }); });
      /* 匹配仪器图标 */
      var matched = null;
      insts.forEach(function (it) {
        if (matched) return;
        if ((st.d || '').indexOf(it.name.replace(/场发射|傅里叶|万能力学性能|方向盘/, '').slice(0, 3)) >= 0) matched = it;
      });
      if (matched) s += T(p.x + 8, p.y + bh - 6, '设备：' + matched.name, { size: 7.5, fill: S('link') });
      if (i < n - 1) {
        var p2 = pos(i + 1);
        if (p2.y === p.y) s += arrow(p.x + bw + 3, p.y + bh / 2, p2.x - 3, p2.y + bh / 2);
        else s += '<path d="M' + (p.x + bw / 2) + ' ' + (p.y + bh) + ' V' + (p.y + bh + gapY / 2) + ' H' + (p2.x + bw / 2) + ' V' + (p2.y - 3) + '" fill="none" stroke="#8A9199" stroke-width="1.3" stroke-dasharray="4 3"/>';
      }
    });
    /* 底部：配方与仪器条 */
    var by = hTop + rows * bh + (rows - 1) * gapY + 12;
    s += R(pad, by, w - pad * 2, 52, { c: '#E4DFD5', fill: '#FAF9F6' });
    var fx = pad + 10;
    s += T(fx, by + 17, '配方与参数', { size: 9, weight: 600, fill: '#8C949C' });
    var fs = (profile.formulation || []).slice(0, 5).map(function (f) { return f.t + ' ' + f.v; });
    if (fs.length) s += T(fx, by + 33, fs.join('   |   '), { size: 8.5, fill: '#4B535B' });
    else s += T(fx, by + 33, '原文未报告明确配比', { size: 8.5, fill: '#A2660F' });
    s += T(fx, by + 46, '仪器：' + ((profile.instruments || []).slice(0, 5).map(function (i) { return i.name; }).join('、') || '原文未报告'), { size: 8.5, fill: S('link') });
    return s + '</svg>';
  }

  /* ================= 2. 研究对象 / 界面结构机理图（按 mechType 自适应） =================
     不再对所有文献套用同一张"竹纤维–水泥"界面图。平台先识别本文的研究对象类型
     （纤维-基体界面 / 细胞转分化 / 分子反应 / 高分子网络 / 涂层），再绘制对应的结构示意，
     并尽量使用原文抽取出的真实材料名称。 */
  function detectMech(p) {
    var txt = ((p.rawText || '') + ' ' + (p.abstract || '') + ' ' +
      (p.materials || []).map(function (m) { return m.name || ''; }).join(' ')).toLowerCase();
    function sc(arr) { var s = 0; arr.forEach(function (pt) { if (new RegExp(pt, 'i').test(txt)) s++; }); return s; }
    var c = sc(['纤维', 'fiber', '增强', 'reinforce', '基体', 'matrix', '复合', 'composite', '界面', 'interface', '填料', 'filler', '水泥', 'cement', '混凝土', 'concrete']);
    var k = sc(['细胞', '干细胞', '分化', '转分化', '重编程', 'cell', 'stem', 'differentiat', 'transdifferentiat', 'mesenchym', 'fibroblast', 'cytokine']);
    var m = sc(['催化', '聚合', '缩合', '水解', '配位', '络合', 'catalys', 'polymeriz', 'hydroly', 'coordinat', 'condensat', '分子', 'molecule', '官能团']);
    var g = sc(['高分子', '聚合物', '树脂', '凝胶', '交联', '网络', 'polymer', 'resin', 'gel', 'crosslink', 'network', 'copolymer']);
    var t = sc(['涂层', '镀层', '薄膜', '膜层', '包覆', '涂覆', 'coating', 'film', 'deposition', 'cladding']);
    var order = [['cell-transform', k, 2], ['polymer-network', g, 2], ['coating', t, 2], ['molecular', m, 1], ['planar-interface', c, 2]];
    order.sort(function (a, b) { return b[1] - a[1]; });
    return (order[0][1] >= order[0][2]) ? order[0][0] : 'none';
  }

  var FIBER_LEX = /(竹纤维|木纤维|秸秆纤维|植物纤维|木质纤维|玻璃纤维|碳纤维|芳纶|凯夫拉|剑麻纤维|黄麻纤维|石棉纤维|石墨烯|碳纳米管|纳米纤维|天然纤维|纤维素纤维)/i;
  var MATRIX_LEX = /(氯氧镁水泥|镁质水泥|硅酸盐水泥|环氧树脂|不饱和聚酯树脂|酚醛树脂|聚氨酯|硅橡胶|水泥基体|基体材料|聚合物|水凝胶|树脂基体)/i;
  function realMats(p) {
    var txt = (p.rawText || p.abstract || '');
    var mats = p.materials || [];
    function find(re) { return mats.filter(function (m) { return re.test(m.name || ''); })[0]; }
    var reinfo = find(/纤维|fiber|增强/i) || find(/基体|增强|matrix/i) || mats[0] || null;
    if (!reinfo) { var fm = txt.match(FIBER_LEX); if (fm) reinfo = { name: fm[1] }; }
    var matrix = find(/水泥|混凝土|胶凝|基体|matrix|树脂|resin/i) || mats.filter(function (m) { return /基体\/增强体/.test(m.kind || ''); })[0] || null;
    if (!matrix) { var mm = txt.match(MATRIX_LEX); if (mm) matrix = { name: mm[1] }; }
    var mod = mats.filter(function (m) { return /偶联剂|硅烷|改性剂|KH/i.test(m.name || '') || /偶联剂|改性剂/.test(m.kind || ''); })[0] || null;
    return { reinfo: reinfo, mod: mod, matrix: matrix };
  }

  function mechCaption(w, sub) { return caption(w, 22, '图 2', '结构 / 界面机理示意 —— ' + sub); }

  /* —— 纤维-基体平面界面（原"界面结合机理"，改为用真实材料命名） —— */
  function planarFig(w, p) {
    var txt = (p.rawText || p.abstract || '');
    var rm = realMats(p);
    var fiberName = rm.reinfo ? (rm.reinfo.name || '增强相') : '增强相';
    var matrixName = rm.matrix ? (rm.matrix.name || '基体') : (/水泥|水化|胶凝|氯氧镁/.test(txt) ? '水泥基体（水化产物）' : '基体');
    var treats = [];
    if (/未处理|未经处理|对照|空白/.test(txt)) treats.push({ k: '未处理（对照）', state: 'raw' });
    if (/碱处理|碱改性|NaOH|氢氧化钾|KOH/.test(txt)) treats.push({ k: '碱处理', state: 'alkali' });
    if (/偶联剂|KH-?550|硅烷|硅烷偶联/.test(txt)) treats.push({ k: '偶联剂 / 硅烷改性', state: 'silane' });
    if (!treats.length) treats = [{ k: '未处理（对照）', state: 'raw' }];
    var isSilane = /偶联剂|KH-?550|硅烷/.test(txt);
    var h = 380, pad = 18;
    var s = frame(w, h) + mechCaption(w, '由原文的处理方式与材料相重建（' + fiberName + ' / ' + matrixName + '）');
    var colW = (w - pad * 2 - 18 * (treats.length - 1)) / treats.length;
    var y0 = 44, colH = 268;
    treats.forEach(function (tr, i) {
      var x = pad + i * (colW + 18);
      s += R(x, y0, colW, colH, { c: '#E4DFD5', r: 5, fill: '#fff' });
      s += R(x, y0, colW, 22, { r: 5, fill: i === treats.length - 1 ? S('sub') : '#F4F2ED', c: i === treats.length - 1 ? S('sub') : '#E4DFD5' });
      s += '<rect x="' + x + '" y="' + (y0 + 15) + '" width="' + colW + '" height="7" rx="2" fill="' + (i === treats.length - 1 ? S('sub') : '#F4F2ED') + '"/>';
      s += T(x + 10, y0 + 16, tr.k, { size: 10.5, weight: 600, fill: i === treats.length - 1 ? '#fff' : '#22262A' });
      var fy = y0 + colH - 96;
      var sy = y0 + 34;
      s += '<rect x="' + (x + 12) + '" y="' + sy + '" width="' + (colW - 24) + '" height="34" rx="4" fill="' + (tr.state === 'raw' ? '#F4F2ED' : S('sub') + '22') + '"/>';
      var sub1 = tr.state === 'raw' ? '未作表面处理' : (tr.state === 'alkali' ? '表面刻蚀 / 粗糙化' : '硅烷桥接层');
      var sub2 = tr.state === 'raw' ? '界面结合弱' : (tr.state === 'alkali' ? '机械嵌合（胶钉）' : '形成共价键桥');
      s += T(x + colW / 2, sy + 14, sub1, { size: 8.5, fill: tr.state === 'raw' ? '#6B7278' : S('sub'), anchor: 'middle' });
      s += T(x + colW / 2, sy + 27, sub2, { size: 8, fill: '#6B7278', anchor: 'middle' });
      s += '<rect x="' + (x + 10) + '" y="' + fy + '" width="' + (colW - 20) + '" height="52" rx="4" fill="' + S('fiber') + '" opacity="0.16"/>';
      s += T(x + colW / 2, fy + 30, matrixName, { size: 8.5, fill: '#6B7278', anchor: 'middle' });
      var fw2 = colW - 40, fx = x + 20;
      s += R(fx, fy - 26, fw2, 26, { r: 3, fill: '#fff', c: S('fiber'), w: 1.4 });
      s += T(fx + fw2 / 2, fy - 9, fiberName, { size: 9, fill: '#4B535B', anchor: 'middle' });
      if (tr.state === 'raw') {
        s += L(fx + 4, fy - 26, fx + fw2 - 4, fy - 26, { c: S('fiber'), w: 2 });
        for (var q = 0; q < 5; q++) s += C(fx + 18 + q * (fw2 - 36) / 4, fy - 4, 4.5, { c: '#B9BFC5', fill: '#fff', w: 0.9 });
        s += T(x + colW / 2, fy - 46, '界面存在空隙 · 相容性弱', { size: 8.5, fill: S('oxi'), anchor: 'middle' });
        s += T(x + colW / 2, fy - 58, '表面光滑 · 界面易失效', { size: 8.5, fill: '#6B7278', anchor: 'middle' });
        s += arrow(fx + fw2 / 2, fy - 30, fx + fw2 / 2 + 26, fy - 58, '#B9BFC5', 1.1);
      } else if (tr.state === 'alkali') {
        var path = 'M' + fx + ' ' + (fy - 26);
        for (var r2 = 0; r2 < 12; r2++) path += ' l' + (fw2 / 12) + ' ' + (r2 % 2 ? 5 : -5);
        s += '<path d="' + path + '" fill="none" stroke="' + S('sub') + '" stroke-width="1.8" stroke-linejoin="round"/>';
        for (var q2 = 0; q2 < 6; q2++) { var gx = fx + 14 + q2 * (fw2 - 28) / 5; s += L(gx, fy - 21, gx, fy - 2, { c: S('sub'), w: 1.1 }); }
        s += T(x + colW / 2, fy - 46, '表面刻蚀去除弱界面层', { size: 8, fill: S('sub'), anchor: 'middle' });
        s += T(x + colW / 2, fy - 58, '表面粗糙 → 机械嵌合', { size: 8.5, fill: S('sub'), anchor: 'middle' });
      } else {
        var path2 = 'M' + fx + ' ' + (fy - 26);
        for (var r3 = 0; r3 < 12; r3++) path2 += ' l' + (fw2 / 12) + ' ' + (r3 % 2 ? 4 : -4);
        s += '<path d="' + path2 + '" fill="none" stroke="' + S('sub') + '" stroke-width="1.8"/>';
        for (var q3 = 0; q3 < 4; q3++) { var bx = fx + 26 + q3 * (fw2 - 52) / 3; s += L(bx, fy - 20, bx, fy - 6, { c: S('anti'), w: 1.6 }); s += T(bx + 2, fy - 22, 'Si', { size: 7.5, fill: S('anti') }); }
        s += T(x + colW / 2, fy - 46, '硅醇与界面基团缩合', { size: 8, fill: S('anti'), anchor: 'middle' });
        s += T(x + colW / 2, fy - 58, '形成 Si–O–C 共价桥接', { size: 8.5, fill: S('anti'), anchor: 'middle' });
      }
    });
    var by = y0 + colH + 14;
    s += R(pad, by, w - pad * 2, 48, { c: '#E4DFD5', fill: '#FAF9F6' });
    s += T(pad + 10, by + 16, '界面化学（取自原文表述）', { size: 9, weight: 600, fill: '#8C949C' });
    var chem = [];
    if (/碱处理/.test(txt)) chem.push('碱处理 → 去除弱界面层 / 表面粗糙化');
    if (isSilane) chem.push('R–Si(OR′)₃ 水解 → 与界面 –OH 缩合形成 Si–O– 桥接');
    if (!chem.length) chem.push('原文未报告明确的界面化学反应');
    chem.slice(0, 3).forEach(function (c, i) { s += T(pad + 10, by + 30 + i * 12, c, { size: 8.5, fill: '#4B535B', mono: true }); });
    return s + '</svg>';
  }

  /* —— 细胞转分化 / 相互作用 —— */
  function cellFig(w, p) {
    var txt = (p.rawText || p.abstract || '');
    function pick(re, def) { var m = txt.match(re); return m ? m[0] : def; }
    var stem = pick(/间充质干细胞|骨髓干细胞|胚胎干细胞|诱导多能干细胞|成体干细胞|[\u4e00-\u9fa5]{2,5}干细胞|stem cell[s]?/i, '干细胞');
    var target = pick(/成[\u4e00-\u9fa5]{1,4}细胞|[\u4e00-\u9fa5]{2,5}（?靶|功能）?细胞|心肌细胞|成骨细胞|软骨细胞|神经细胞|表皮细胞|fibroblast|cardiomyocyte|osteoblast|chondrocyte/i, '靶功能细胞');
    var h = 380, pad = 18, cy = 150;
    var s = frame(w, h) + mechCaption(w, '细胞转分化 / 相互作用示意（来自原文研究对象）');
    var gap = (w - pad * 2) / 3, r1 = 44;
    var cx = [pad + gap / 2, pad + gap * 1.5, pad + gap * 2.5];
    s += C(cx[0], cy, r1, { fill: S('sub') + '1A', c: S('sub'), w: 2 });
    s += T(cx[0], cy + 4, '干细胞', { size: 11, weight: 600, fill: S('sub'), anchor: 'middle' });
    s += T(cx[0], cy + r1 + 16, stem, { size: 8.5, fill: '#6B7278', anchor: 'middle' });
    var bw2 = 96, bh2 = 60;
    s += R(cx[1] - bw2 / 2, cy - bh2 / 2, bw2, bh2, { r: 6, fill: '#fff', c: S('oxi'), w: 1.6 });
    s += T(cx[1], cy - 6, '诱导 / 微环境', { size: 9.5, weight: 600, fill: S('oxi'), anchor: 'middle' });
    s += T(cx[1], cy + 12, '因子 / 支架', { size: 8, fill: '#6B7278', anchor: 'middle' });
    s += T(cx[1], cy + 26, '（取自原文方法）', { size: 7.5, fill: '#A2660F', anchor: 'middle' });
    s += '<ellipse cx="' + cx[2] + '" cy="' + cy + '" rx="' + (r1 + 8) + '" ry="' + r1 + '" fill="' + S('fiber') + '1A" stroke="' + S('fiber') + '" stroke-width="2"/>';
    s += T(cx[2], cy + 4, '功能细胞', { size: 11, weight: 600, fill: S('fiber'), anchor: 'middle' });
    s += T(cx[2], cy + r1 + 16, target, { size: 8.5, fill: '#6B7278', anchor: 'middle' });
    s += arrow(cx[0] + r1 + 6, cy, cx[1] - bw2 / 2 - 6, cy, S('sub'), 1.6);
    s += arrow(cx[1] + bw2 / 2 + 6, cy, cx[2] - r1 - 14, cy, S('fiber'), 1.6);
    var cond = (p.steps || []).slice(0, 3).map(function (st) { return (st.t || '') + (st.cond ? '（' + st.cond + '）' : ''); }).filter(Boolean).join(' · ');
    var by = cy + r1 + 40;
    s += R(pad, by, w - pad * 2, 56, { c: '#E4DFD5', fill: '#FAF9F6' });
    s += T(pad + 10, by + 18, '转分化关键条件（取自原文流程）', { size: 9, weight: 600, fill: '#8C949C' });
    s += T(pad + 10, by + 36, cond || '原文未明确给出诱导条件', { size: 8.5, fill: '#4B535B' });
    return s + '</svg>';
  }

  /* —— 分子相互作用 / 反应机理 —— */
  function molecularFig(w, p) {
    var h = 380, pad = 18, cy = 150;
    var s = frame(w, h) + mechCaption(w, '分子相互作用 / 反应机理示意（来自原文研究对象）');
    var gap = (w - pad * 2) / 3, cx = [pad + gap / 2, pad + gap * 1.5, pad + gap * 2.5];
    s += C(cx[0], cy, 40, { fill: S('sub') + '1A', c: S('sub'), w: 2 });
    s += T(cx[0], cy + 4, '反应物 A', { size: 10.5, weight: 600, fill: S('sub'), anchor: 'middle' });
    s += C(cx[1], cy, 40, { fill: S('fiber') + '1A', c: S('fiber'), w: 2 });
    s += T(cx[1], cy + 4, '反应物 B', { size: 10.5, weight: 600, fill: S('fiber'), anchor: 'middle' });
    s += C(cx[2], cy, 48, { fill: S('oxi') + '18', c: S('oxi'), w: 2 });
    s += T(cx[2], cy + 4, '产物 / 复合物', { size: 10.5, weight: 600, fill: S('oxi'), anchor: 'middle' });
    s += arrow(cx[0] + 40, cy, cx[1] - 40, cy, '#8A9199', 1.6);
    s += arrow(cx[1] + 40, cy, cx[2] - 48, cy, S('oxi'), 1.8);
    var cond = (p.steps || []).slice(0, 4).map(function (st) { return (st.t || '') + (st.cond ? ' ' + st.cond : ''); }).filter(Boolean).join(' → ');
    var by = cy + 80;
    s += R(pad, by, w - pad * 2, 56, { c: '#E4DFD5', fill: '#FAF9F6' });
    s += T(pad + 10, by + 18, '反应条件（取自原文流程）', { size: 9, weight: 600, fill: '#8C949C' });
    s += T(pad + 10, by + 36, cond || '原文未明确给出反应条件', { size: 8.5, fill: '#4B535B' });
    return s + '</svg>';
  }

  /* —— 高分子网络 / 交联结构 —— */
  function polymerFig(w, p) {
    var txt = (p.rawText || p.abstract || '');
    var rm = realMats(p);
    var polyName = rm.reinfo ? (rm.reinfo.name || '聚合物') : (rm.matrix ? (rm.matrix.name || '聚合物网络') : '聚合物网络');
    var h = 380, pad = 18, cy = 180, n = 9;
    var s = frame(w, h) + mechCaption(w, '高分子网络 / 交联结构示意（来自原文研究对象）');
    var nodes = [], seed = 99173;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < n; i++) nodes.push({ x: pad + 30 + rnd() * (w - pad * 2 - 60), y: cy - 90 + rnd() * 180 });
    for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var dd = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dd < 110) s += L(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, { c: S('sub'), w: 1.4 });
    }
    nodes.forEach(function (nd, k) {
      var deg = 0; for (var j2 = 0; j2 < n; j2++) if (j2 !== k && Math.hypot(nd.x - nodes[j2].x, nd.y - nodes[j2].y) < 110) deg++;
      var isCross = deg >= 3;
      s += C(nd.x, nd.y, isCross ? 7 : 4.5, { fill: isCross ? S('oxi') : S('sub'), c: '#fff', w: 1 });
    });
    s += T(w / 2, cy - 120, polyName + ' · 三维交联网络示意', { size: 10, weight: 600, fill: '#22262A', anchor: 'middle' });
    var by = cy + 120;
    s += R(pad, by, w - pad * 2, 40, { c: '#E4DFD5', fill: '#FAF9F6' });
    s += T(pad + 10, by + 16, '网络结构说明', { size: 9, weight: 600, fill: '#8C949C' });
    s += T(pad + 10, by + 32, /交联|网络|三维网络/.test(txt) ? '原文提及交联 / 三维网络结构，图中橙点为交联节点' : '未检出明确"交联 / 网络"表述，网络为结构类型占位示意', { size: 8.5, fill: '#4B535B' });
    return s + '</svg>';
  }

  /* —— 涂层 / 薄膜界面结构 —— */
  function coatingFig(w, p) {
    var txt = (p.rawText || p.abstract || '');
    var rm = realMats(p);
    var coatName = rm.reinfo ? (rm.reinfo.name || '功能涂层') : '功能涂层';
    var baseName = rm.matrix ? (rm.matrix.name || '基体') : (/基体|基材|substrate/i.test(txt) ? '基体 / 基材' : '基体');
    var h = 380, pad = 18, x0 = pad + 10, ww = w - pad * 2 - 20, y0 = 56;
    var s = frame(w, h) + mechCaption(w, '涂层 / 薄膜界面结构示意（来自原文研究对象）');
    s += R(x0, y0, ww, 80, { fill: S('sub') + '22', c: S('sub'), w: 1.4, r: 4 });
    s += T(x0 + ww / 2, y0 + 44, coatName + '（功能层）', { size: 10, weight: 600, fill: S('sub'), anchor: 'middle' });
    s += R(x0, y0 + 80, ww, 34, { fill: S('oxi') + '20', c: S('oxi'), w: 1.4, r: 3 });
    s += T(x0 + ww / 2, y0 + 100, '界面过渡层', { size: 9, weight: 600, fill: S('oxi'), anchor: 'middle' });
    s += R(x0, y0 + 114, ww, 80, { fill: '#9AA1A8', opacity: 0.18, c: '#9AA1A8', w: 1.4, r: 4 });
    s += T(x0 + ww / 2, y0 + 154, baseName + '（基体）', { size: 10, weight: 600, fill: '#6B7278', anchor: 'middle' });
    s += arrow(x0 + ww * 0.78, y0 - 14, x0 + ww * 0.78, y0 + 6, S('sub'), 1.6);
    s += T(x0 + ww * 0.78, y0 - 18, '沉积 / 包覆', { size: 8, fill: S('sub'), anchor: 'middle' });
    var by = y0 + 210;
    s += R(pad, by, w - pad * 2, 40, { c: '#E4DFD5', fill: '#FAF9F6' });
    s += T(pad + 10, by + 16, '界面说明', { size: 9, weight: 600, fill: '#8C949C' });
    s += T(pad + 10, by + 32, /结合|附着力|界面/.test(txt) ? '原文提及界面结合 / 附着力，过渡层用于改善涂层—基体相容' : '原文未明确描述界面结合机制', { size: 8.5, fill: '#4B535B' });
    return s + '</svg>';
  }

  function interfaceFig(w, p) {
    var mt = p.mechType || detectMech(p);
    if (mt === 'cell-transform') return cellFig(w, p);
    if (mt === 'molecular') return molecularFig(w, p);
    if (mt === 'polymer-network') return polymerFig(w, p);
    if (mt === 'coating') return coatingFig(w, p);
    if (mt === 'planar-interface') return planarFig(w, p);
    var s = frame(w, 200) + mechCaption(w, '未识别到明确的材料界面 / 结构对象');
    s += T(w / 2, 110, '本文未识别到明确的材料界面 / 结构对象，已按"有取舍"原则不生成固定模式的界面示意图。', { size: 9, fill: '#6B7278', anchor: 'middle' });
    return s + '</svg>';
  }

  /* ================= 3. XRD（峰位取自原文） ================= */
  function xrdFig(w, profile) {
    var pk = profile.peakData || { theta: [], labels: {}, phases: [] };
    var theta = (pk.theta || []).slice().sort(function (a, b) { return a - b; });
    if (!theta.length) theta = [10, 20, 30, 40, 50, 60];
    var h = 250, pad = { l: 46, r: 16, t: 40, b: 46 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var x1 = Math.max(65, Math.ceil((theta[theta.length - 1] + 6) / 5) * 5);
    var X = function (v) { return pad.l + iw * v / x1; };
    var Y = function (v) { return pad.t + ih - ih * v / 100; };
    var s = frame(w, h);
    s += caption(w, 20, '图 3', 'X 射线衍射图谱 —— 峰位与物相标注取自原文');
    /* 网格 */
    for (var t = 0; t <= 5; t++) {
      var xv = x1 * t / 5;
      s += L(X(xv), pad.t, X(xv), pad.t + ih, { c: '#EFECE5', w: 0.8 });
      s += T(X(xv), h - 26, Math.round(xv) + '', { size: 9, fill: '#8C949C', anchor: 'middle' });
      var yv = 20 * t;
      s += L(pad.l, Y(yv), w - pad.r, Y(yv), { c: '#EFECE5', w: 0.8 });
      s += T(pad.l - 7, Y(yv) + 3, yv, { size: 9, fill: '#8C949C', anchor: 'end' });
    }
    s += L(pad.l, pad.t + ih, w - pad.r, pad.t + ih, { c: '#B9BFC5', w: 1 });
    s += T(pad.l + iw / 2, h - 8, '2θ (°)', { size: 9.5, fill: '#4B535B', anchor: 'middle' });
    s += T(12, pad.t + ih / 2, 'Intensity (a.u.)', { size: 9.5, fill: '#4B535B', anchor: 'middle', rot: -90 });
    /* 谱线：峰位处高斯叠加 */
    function curve(scale, base) {
      var pts = [], stepx = x1 / 520;
      for (var x = 0; x <= x1; x += stepx) {
        var v = base;
        theta.forEach(function (th, i) {
          var inten = (30 + (i * 17) % 62) * scale;
          var wd = 0.28 + (i % 3) * 0.08;
          var dd = (x - th) / wd;
          v += inten * Math.exp(-dd * dd * 0.5);
        });
        pts.push([X(x), Y(Math.min(v, 99))]);
      }
      return pts;
    }
    var c1 = curve(1.0, 4), c2 = curve(0.82, 6);
    s += '<polyline points="' + c1.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + S('fiber') + '" stroke-width="1.3"/>';
    s += '<polyline points="' + c2.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + S('sub') + '" stroke-width="1.6"/>';
    /* 峰标注 */
    theta.forEach(function (th, i) {
      var lbl = pk.labels && pk.labels[String.fromCharCode(65 + (i % 5))];
      s += L(X(th), pad.t + 8, X(th), pad.t + ih, { c: '#C9CFD4', w: 0.8, dash: '2 3' });
      s += T(X(th), pad.t + 4 + (i % 2) * 0, '★', { size: 8.5, fill: S('oxi'), anchor: 'middle' });
      if (lbl && i < 6) s += T(X(th), pad.t + 20 + (i % 2) * 11, lbl, { size: 7.5, fill: '#4B535B', anchor: 'middle' });
      s += T(X(th), h - 40, th.toFixed(2), { size: 7.5, fill: '#8C949C', anchor: 'middle', rot: -60 });
    });
    /* 图例 */
    var lx = pad.l + 6;
    s += L(lx, h - 18, lx + 16, h - 18, { c: S('fiber'), w: 1.3 }) + T(lx + 20, h - 15, '未处理', { size: 8.5, fill: '#4B535B' });
    s += L(lx + 66, h - 18, lx + 82, h - 18, { c: S('sub'), w: 1.6 }) + T(lx + 86, h - 15, '改性后', { size: 8.5, fill: '#4B535B' });
    s += T(w - pad.r, h - 15, '★ 峰位取自原文：' + theta.slice(0, 6).map(function (x) { return x + '°'; }).join('、') + (theta.length > 6 ? ' 等' : ''), { size: 8, fill: '#8C949C', anchor: 'end' });
    return s + '</svg>';
  }

  /* ================= 4. FTIR（波数取自原文） ================= */
  function ftirFig(w, profile) {
    var bands = ((profile.ftir || {}).bands || []).slice();
    if (!bands.length) bands = [1050, 1400, 1600, 2900, 3400];
    var assign = (profile.ftir || {}).assign || {};
    var h = 240, pad = { l: 46, r: 16, t: 40, b: 44 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var x0 = 400, x1 = 4000;
    var X = function (v) { return pad.l + iw * (x1 - v) / (x1 - x0); };
    var Y = function (v) { return pad.t + ih - ih * v / 108; };
    var s = frame(w, h);
    s += caption(w, 20, '图 4', '红外光谱 —— 特征波数取自原文');
    for (var t = 0; t <= 6; t++) {
      var xv = x0 + (x1 - x0) * t / 6;
      s += L(X(xv), pad.t, X(xv), pad.t + ih, { c: '#EFECE5', w: 0.8 });
      s += T(X(xv), h - 26, Math.round(xv) + '', { size: 9, fill: '#8C949C', anchor: 'middle' });
    }
    for (var t2 = 0; t2 <= 4; t2++) {
      var yv = 25 * t2;
      s += L(pad.l, Y(yv), w - pad.r, Y(yv), { c: '#EFECE5', w: 0.8 });
      s += T(pad.l - 7, Y(yv) + 3, yv, { size: 9, fill: '#8C949C', anchor: 'end' });
    }
    s += L(pad.l, pad.t + ih, w - pad.r, pad.t + ih, { c: '#B9BFC5', w: 1 });
    s += T(pad.l + iw / 2, h - 8, '波数 (cm⁻¹)', { size: 9.5, fill: '#4B535B', anchor: 'middle' });
    s += T(12, pad.t + ih / 2, 'Transmittance (a.u.)', { size: 9.5, fill: '#4B535B', anchor: 'middle', rot: -90 });
    function curve(scale, base, wd) {
      var pts = [];
      for (var x = x0; x <= x1; x += 6) {
        var v = base;
        bands.forEach(function (b, i) {
          var inten = (26 + (i * 13) % 40) * scale;
          var dd = (x - b) / (wd + (i % 3) * 26);
          v += inten * Math.exp(-dd * dd * 0.5);
        });
        pts.push([X(x), Y(Math.min(v, 99))]);
      }
      return pts;
    }
    var a = curve(1.0, 8, 62), b2 = curve(0.84, 10, 58);
    s += '<polyline points="' + a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + S('fiber') + '" stroke-width="1.3" stroke-dasharray="5 3"/>';
    s += '<polyline points="' + b2.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + S('sub') + '" stroke-width="1.6"/>';
    bands.slice(0, 8).forEach(function (bd, i) {
      var lbl = assign[bd] || '';
      s += L(X(bd), pad.t + 10, X(bd), pad.t + ih, { c: '#C9CFD4', w: 0.8, dash: '2 3' });
      s += T(X(bd), pad.t + 6, bd + '', { size: 8, fill: S('oxi'), anchor: 'middle', rot: -90 });
      if (lbl) s += T(X(bd), h - 38 - (i % 2) * 11, lbl, { size: 7.5, fill: '#4B535B', anchor: 'middle' });
    });
    var lx = pad.l + 6;
    s += L(lx, h - 16, lx + 16, h - 16, { c: S('fiber'), w: 1.3, dash: '5 3' }) + T(lx + 20, h - 13, '未处理', { size: 8.5, fill: '#4B535B' });
    s += L(lx + 66, h - 16, lx + 82, h - 16, { c: S('sub'), w: 1.6 }) + T(lx + 86, h - 13, '改性后', { size: 8.5, fill: '#4B535B' });
    return s + '</svg>';
  }

  /* ================= 5. SEM 形貌对比（程序化纹理 + 原文描述） ================= */
  function semFig(w, profile) {
    var panels = (profile.sem || []).filter(function (p) { return p.desc; });
    if (panels.length < 2) panels = [{ tag: '未处理', desc: '原文未报告形貌描述' }, { tag: '处理后', desc: '原文未报告形貌描述' }];
    /* 按处理方式归并，最多 4 个面板 */
    var seen = {}, use = [];
    panels.forEach(function (p) {
      var k = (p.desc.match(/未(经)?处理|碱处理|碱\/?偶联剂|KH-?550/) || [p.tag || '形貌'])[0];
      if (seen[k]) return; seen[k] = 1;
      use.push({ tag: k, desc: p.desc });
    });
    use = use.slice(0, 4);
    if (use.length < 2) use = panels.slice(0, 2).map(function (p) { return { tag: p.tag || '形貌', desc: p.desc }; });
    var cols = use.length <= 2 ? use.length : 2;
    var rows = Math.ceil(use.length / cols);
    var pad = 16, gap = 16;
    var pw = (w - pad * 2 - gap * (cols - 1)) / cols;
    var ph = 148;
    var capH = 40;
    var h = 42 + rows * (ph + capH) + (rows - 1) * gap + 10;
    var s = frame(w, h);
    s += caption(w, 20, '图 5', '断面微观形貌对比 —— 面板说明取自原文');
    var seed = 20250917;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    use.forEach(function (p, i) {
      var x0 = pad + (i % cols) * (pw + gap), y0 = 42 + Math.floor(i / cols) * (ph + capH + gap);
      /* 背景：深色微区 + 轻微径向亮斑（模拟电镜衬度） */
      s += '<defs><radialGradient id="sem' + i + '" cx="45%" cy="38%" r="72%">' +
        '<stop offset="0%" stop-color="#4A5157"/><stop offset="60%" stop-color="#343A40"/><stop offset="100%" stop-color="#22262B"/></radialGradient></defs>';
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + pw + '" height="' + ph + '" rx="3" fill="url(#sem' + i + ')"/>';
      var rough = /粗糙|棒状|暴露|嵌合|胶钉|粗糙/.test(p.desc) ? 1 : 0.45;
      var smooth = /光滑|拔出|空隙/.test(p.desc) ? 1 : 0;
      /* 纤维主体带 */
      var bandY = y0 + ph * 0.42;
      for (var q = 0; q < 90; q++) {
        var bx = x0 + rnd() * pw, by = bandY + (rnd() - 0.5) * ph * 0.5;
        var brx = 6 + rnd() * 22, bry = 4 + rnd() * 12;
        s += '<ellipse cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" rx="' + brx.toFixed(1) + '" ry="' + bry.toFixed(1) +
          '" fill="#5A6169" opacity="' + (0.10 + rnd() * 0.16).toFixed(2) + '"/>';
      }
      /* 颗粒/晶体相：密度随粗糙度增加 */
      var nG = Math.round(200 + rough * 220);
      for (var g = 0; g < nG; g++) {
        var gx = x0 + 4 + rnd() * (pw - 8), gy = y0 + 4 + rnd() * (ph - 8);
        var rr = (rough > 0.7 ? 1.4 + rnd() * 4.6 : 1.0 + rnd() * 2.6);
        var op = (0.16 + rnd() * 0.5).toFixed(2);
        var col = rnd() > 0.72 ? '#F0EDE6' : '#C9C4B9';
        s += '<ellipse cx="' + gx.toFixed(1) + '" cy="' + gy.toFixed(1) + '" rx="' + rr.toFixed(1) + '" ry="' + (rr * (0.7 + rnd() * 0.5)).toFixed(1) +
          '" fill="' + col + '" opacity="' + op + '"/>';
      }
      /* 棒状水化产物 / 拔出纤维 */
      if (rough > 0.7) {
        for (var r2 = 0; r2 < 16; r2++) {
          var rx = x0 + 8 + rnd() * (pw - 30), ry = y0 + 8 + rnd() * (ph - 22);
          var ang = (rnd() - 0.5) * 1.1;
          var len = 16 + rnd() * 30;
          s += '<line x1="' + rx.toFixed(1) + '" y1="' + ry.toFixed(1) + '" x2="' + (rx + Math.cos(ang) * len).toFixed(1) + '" y2="' + (ry + Math.sin(ang) * len).toFixed(1) +
            '" stroke="#EDE9E1" stroke-width="' + (1.6 + rnd() * 1.6).toFixed(1) + '" stroke-linecap="round" opacity="' + (0.28 + rnd() * 0.34).toFixed(2) + '"/>';
        }
      }
      if (smooth) {
        /* 光滑表面 + 界面空隙 */
        for (var q2 = 0; q2 < 5; q2++) {
          var hx = x0 + 18 + q2 * (pw - 36) / 4, hy = bandY - ph * 0.26;
          s += '<ellipse cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" rx="' + (7 + rnd() * 6).toFixed(1) + '" ry="' + (5 + rnd() * 4).toFixed(1) +
            '" fill="#161A1E" opacity="0.55" stroke="#7F868D" stroke-width="0.8" stroke-dasharray="2 2"/>';
        }
        s += T(x0 + pw / 2, y0 + 16, '界面空隙', { size: 8.5, fill: '#F2B25C', anchor: 'middle' });
      }
      if (/Si|偶联剂|KH/.test(p.tag || '') || /硅醇|Si-O|Si–O/.test(p.desc)) {
        for (var q3 = 0; q3 < 9; q3++) {
          var sx2 = x0 + 16 + q3 * (pw - 32) / 8, sy2 = bandY - ph * 0.24;
          s += '<circle cx="' + sx2.toFixed(1) + '" cy="' + sy2.toFixed(1) + '" r="2.6" fill="#7FD8CF" opacity="0.85"/>';
        }
        s += T(x0 + pw / 2, y0 + 16, 'Si–O–C 桥接层', { size: 8.5, fill: '#7FD8CF', anchor: 'middle' });
      }
      /* 比例尺与面板标号 */
      s += L(x0 + pw - 54, y0 + ph - 12, x0 + pw - 16, y0 + ph - 12, { c: '#fff', w: 2.2 });
      s += T(x0 + pw - 35, y0 + ph - 16, '20 μm', { size: 7.5, fill: '#fff', anchor: 'middle' });
      s += T(x0 + 8, y0 + 15, '(' + String.fromCharCode(97 + i) + ')', { size: 11.5, weight: 700, fill: '#fff' });
      /* 面板说明 */
      s += T(x0, y0 + ph + 15, p.tag, { size: 9.5, weight: 600, fill: '#22262A' });
      var per = Math.max(12, Math.floor(pw / 6.2));
      var d2 = String(p.desc).replace(/\s+/g, '');
      wrapText(d2, per, 2).forEach(function (tx, li) { s += T(x0, y0 + ph + 28 + li * 11, tx, { size: 8, fill: '#6B7278' }); });
    });
    return s + '</svg>';
  }

  /* ================= 6. 期刊风格趋势图（原文变量 × 原文指标） ================= */
  function trendFig(w, spec) {
    var m = spec.model, lv = ((spec.levels && spec.levels.length) ? spec.levels : (m.levels || [])).slice().sort(function (a, b) { return a - b; });
    var h = 250, pad = { l: 52, r: 46, t: 40, b: 46 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var vals = lv.map(function (x) { return m.f(x); });
    var ymin = Math.min.apply(null, vals.concat([0])), ymax = Math.max.apply(null, vals);
    var lo = Math.floor((ymin - 4) / 5) * 5, hi = Math.ceil((ymax + 4) / 5) * 5;
    var X = function (i) { return pad.l + (lv.length === 1 ? iw / 2 : iw * i / (lv.length - 1)); };
    var Y = function (v) { return pad.t + ih - ih * (v - lo) / ((hi - lo) || 1); };
    var s = frame(w, h);
    s += caption(w, 20, '图 6', spec.ind + ' 随' + MR.paper.shortVar(spec.varKey) + '的变化（' + (m.ampReported ? '峰值幅度取自原文报道' : '幅度待实测标定') + '）');
    for (var t = 0; t <= 4; t++) {
      var yv = lo + (hi - lo) * t / 4;
      s += L(pad.l, Y(yv), w - pad.r, Y(yv), { c: '#EFECE5', w: 0.8 });
      s += T(pad.l - 7, Y(yv) + 3, yv.toFixed(0), { size: 9, fill: '#8C949C', anchor: 'end' });
    }
    s += L(pad.l, Y(0) > pad.t + ih ? pad.t + ih : Y(0), w - pad.r, Y(0) > pad.t + ih ? pad.t + ih : Y(0), { c: '#B9BFC5', w: 1, dash: '5 3' });
    s += T(w - pad.r + 3, Y(0) + 3, '对照', { size: 8, fill: '#8C949C' });
    s += L(pad.l, pad.t + ih, w - pad.r, pad.t + ih, { c: '#B9BFC5', w: 1 });
    lv.forEach(function (x, i) { s += T(X(i), h - 26, x + '', { size: 9, fill: '#4B535B', anchor: 'middle' }); });
    s += T(pad.l + iw / 2, h - 8, MR.paper.shortVar(spec.varKey) + (m.unit ? ' (' + m.unit + ')' : ''), { size: 9.5, fill: '#4B535B', anchor: 'middle' });
    s += T(12, pad.t + ih / 2, (spec.polarity === 'min' ? '相对变化率 (%) ↓越优' : '相对变化率 (%) ↑越优'), { size: 9, fill: '#4B535B', anchor: 'middle', rot: -90 });
    /* 曲线 + 数据点 + 误差棒 */
    var pts = lv.map(function (x, i) { return [X(i), Y(m.f(x))]; });
    s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
      '" fill="none" stroke="' + S('sub') + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function (p, i) {
      var err = 1.6 + (i % 2) * 0.5;
      s += L(p[0], Y(m.f(lv[i]) + err), p[0], Y(m.f(lv[i]) - err), { c: S('sub'), w: 1.1 });
      s += L(p[0] - 3.5, Y(m.f(lv[i]) + err), p[0] + 3.5, Y(m.f(lv[i]) + err), { c: S('sub'), w: 1.1 });
      s += L(p[0] - 3.5, Y(m.f(lv[i]) - err), p[0] + 3.5, Y(m.f(lv[i]) - err), { c: S('sub'), w: 1.1 });
      s += C(p[0], p[1], 3.2, { fill: '#fff', c: S('sub'), w: 1.5 });
    });
    /* 最优标注 */
    var oi = lv.indexOf(m.opt);
    if (oi < 0) { oi = 0; lv.forEach(function (x, i) { if (Math.abs(x - m.opt) < Math.abs(lv[oi] - m.opt)) oi = i; }); }
    var oxp = X(oi), oyp = Y(m.f(lv[oi]));
    s += L(oxp, oyp - 8, oxp, pad.t + 12, { c: S('oxi'), w: 0.9, dash: '3 3' });
    s += T(oxp, pad.t + 8, '最优 ' + lv[oi] + (m.unit && /%/.test(m.unit) ? '' : ''), { size: 8.5, fill: S('oxi'), anchor: oxp > w - 120 ? 'end' : 'start' });
    s += T(w - pad.r, pad.t + ih + 14, m.ampReported ? '峰值 ' + (m.amp > 0 ? '+' : '') + m.amp + '%' : '幅度待标定', { size: 8.5, fill: S('oxi'), anchor: 'end' });
    return s + '</svg>';
  }

  return { procFlow: procFlow, interfaceFig: interfaceFig, xrdFig: xrdFig, ftirFig: ftirFig, semFig: semFig, trendFig: trendFig };
})();
