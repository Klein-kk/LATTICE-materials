import re

# ============ 1) 工序排序：按真实工艺顺序重排 ============
EX = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(EX, encoding='utf-8').read()

old = """    /* 去重保序 */
    var seen = {};
    return steps.filter(function (s) { if (seen[s.t]) return false; seen[s.t] = 1; return true; }).slice(0, 12);"""
new = """    /* 去重 + 按真实工艺顺序重排 */
    var seen = {};
    steps = steps.filter(function (s) { if (seen[s.t]) return false; seen[s.t] = 1; return true; });
    var ORDER = ['称量', '配制', '混合', '搅拌', '球磨', '筛分', '陈化', '浸泡', '碱处理', '预压', '铺装',
      '热压', '冷压', '压制', '脱模', '涂覆', '喷淋', '浸渍', '接枝', '固化', '成型', '干燥', '烘干',
      '养护', '齐边', '锯切', '水浴', '加热', '冷却', '洗涤', '清洗'];
    steps.sort(function (a, b) {
      var ia = ORDER.indexOf(a.t), ib = ORDER.indexOf(b.t);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    });
    return steps.slice(0, 10);"""
assert old in s, 'step order anchor'
s = s.replace(old, new)
open(EX, 'w', encoding='utf-8').write(s)
print('extract.js step order patched')

# ============ 2) 界面机理图：内容上移 + 顶部处理示意 ============
F = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\figures2.js'
f = open(F, encoding='utf-8').read()

old2 = """      var fy = y0 + colH - 62;           /* 基体顶面 */"""
new2 = """      var fy = y0 + colH - 96;           /* 基体顶面（上移，留出顶部示意区） */"""
assert old2 in f, 'interface fy anchor'
f = f.replace(old2, new2)

# 顶部补一行"处理示意"（针筒/溶液槽 + 处理名称）
old3 = """      /* 基体（水泥水化产物 / 基体） */"""
new3 = """      /* 顶部处理示意 */
      var sy = y0 + 34;
      s += '<rect x="' + (x + 12) + '" y="' + sy + '" width="' + (colW - 24) + '" height="34" rx="4" fill="' + (tr.state === 'raw' ? '#F4F2ED' : S('sub') + '22') + '"/>';
      s += T(x + colW / 2, sy + 14, tr.state === 'raw' ? '未作处理' : (tr.state === 'alkali' ? 'NaOH 溶液浸泡 60 °C / 3 h' : 'KH-550 乙醇溶液喷淋'), { size: 8.5, fill: tr.state === 'raw' ? '#6B7278' : S('sub'), anchor: 'middle' });
      s += T(x + colW / 2, sy + 27, tr.state === 'raw' ? '纤维表面光滑 · 极性高' : (tr.state === 'alkali' ? '去除半纤维素 / 果胶 / 木质素' : '硅醇与纤维 –OH 缩合'), { size: 8, fill: '#6B7278', anchor: 'middle' });
      /* 基体（水泥水化产物 / 基体） */"""
assert old3 in f, 'interface top anchor'
f = f.replace(old3, new3)

# 注解文字位置上移以贴合上移后的纤维
f = f.replace("s += T(x + colW / 2, fy - 42, '界面存在空隙 · 相容性弱'", "s += T(x + colW / 2, fy - 46, '界面存在空隙 · 相容性弱'")
f = f.replace("s += T(x + colW / 2, fy - 54, '纤维表面光滑 · 易拔出'", "s += T(x + colW / 2, fy - 58, '纤维表面光滑 · 易拔出'")
f = f.replace("s += T(x + colW / 2, fy - 42, '半纤维素/果胶/木质素被去除'", "s += T(x + colW / 2, fy - 46, '半纤维素/果胶/木质素被去除'")
f = f.replace("s += T(x + colW / 2, fy - 54, '表面粗糙 → 机械嵌合（胶钉）'", "s += T(x + colW / 2, fy - 58, '表面粗糙 → 机械嵌合（胶钉）'")
f = f.replace("s += T(x + colW / 2, fy - 42, '硅醇 Si–OH 与纤维 –OH 缩合'", "s += T(x + colW / 2, fy - 46, '硅醇 Si–OH 与纤维 –OH 缩合'")
f = f.replace("s += T(x + colW / 2, fy - 54, '形成 Si–O–C 桥接 + 共价交联'", "s += T(x + colW / 2, fy - 58, '形成 Si–O–C 桥接 + 共价交联'")

# ============ 3) SEM 形貌：加密度与层次，标注改为处理名 ============
start = f.index('  function semFig(w, profile) {')
end = f.index("  /* ================= 6. 期刊风格趋势图")
newsem = '''  function semFig(w, profile) {
    var panels = (profile.sem || []).filter(function (p) { return p.desc; });
    if (panels.length < 2) panels = [{ tag: '未处理', desc: '原文未报告形貌描述' }, { tag: '处理后', desc: '原文未报告形貌描述' }];
    /* 按处理方式归并，最多 4 个面板 */
    var seen = {}, use = [];
    panels.forEach(function (p) {
      var k = (p.desc.match(/未(经)?处理|碱处理|碱\\/?偶联剂|KH-?550/) || [p.tag || '形貌'])[0];
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
      var d2 = String(p.desc).replace(/\\s+/g, '');
      for (var li = 0; li < 2 && li * per < d2.length; li++) {
        s += T(x0, y0 + ph + 28 + li * 11, d2.substr(li * per, per), { size: 8, fill: '#6B7278' });
      }
    });
    return s + '</svg>';
  }

'''
f = f[:start] + newsem + f[end:]
open(F, 'w', encoding='utf-8').write(f)
print('figures2.js patched')

# ============ 4) 流程步骤名更短：'称量'等保持；条件取自原文 ============
print('done')
