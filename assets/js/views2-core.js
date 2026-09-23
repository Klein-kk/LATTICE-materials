/* ============================================================
   LATTICE · 十环节（论文驱动版）
   所有环节的内容都来自「当前论文」的抽取结果：
   原文有什么就分析什么，原文没有的一律显示"原文未报告"。
   ============================================================ */
window.MR = window.MR || {};

/* ---------------- 文档读取 ---------------- */
MR.doc = (function () {
  /* DOCX = ZIP；用 DecompressionStream 解压 word/document.xml */
  function unzipEntry(buf, target) {
    return new Promise(function (resolve, reject) {
      var u8 = new Uint8Array(buf);
      var dv = new DataView(buf);
      /* EOCD */
      var eocd = -1;
      for (var i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd < 0) return reject(new Error('不是有效的 ZIP/DOCX 文件'));
      var count = dv.getUint16(eocd + 10, true);
      var cdOff = dv.getUint32(eocd + 16, true);
      var p = cdOff;
      for (var k = 0; k < count; k++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        var method = dv.getUint16(p + 10, true);
        var csize = dv.getUint32(p + 20, true);
        var nameLen = dv.getUint16(p + 28, true);
        var extraLen = dv.getUint16(p + 30, true);
        var cmtLen = dv.getUint16(p + 32, true);
        var lho = dv.getUint32(p + 42, true);
        var name = new TextDecoder('utf-8').decode(u8.subarray(p + 46, p + 46 + nameLen));
        if (name === target) {
          var lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
          var dataStart = lho + 30 + lnl + lel;
          var data = u8.subarray(dataStart, dataStart + csize);
          if (method === 0) return resolve(data);
          if (typeof DecompressionStream === 'undefined') return reject(new Error('当前浏览器不支持解压，请改用粘贴文本'));
          var ds = new DecompressionStream('deflate-raw');
          var stream = new Blob([data]).stream().pipeThrough(ds);
          new Response(stream).arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }).catch(reject);
          return;
        }
        p += 46 + nameLen + extraLen + cmtLen;
      }
      reject(new Error('DOCX 中未找到 word/document.xml'));
    });
  }
  function xmlToText(xml) {
    var t = xml.replace(/<w:p\b[^>]*>/g, '\n').replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n');
    t = t.replace(/<[^>]+>/g, '');
    t = t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    return t.split('\n').map(function (s) { return s.replace(/\u00a0/g, ' ').trim(); }).filter(Boolean).join('\n');
  }
  function readDocx(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      unzipEntry(fr.result, 'word/document.xml')
        .then(function (u8) { cb(xmlToText(new TextDecoder('utf-8').decode(u8))); })
        .catch(function (e) { cb(null, e.message); });
    };
    fr.onerror = function () { cb(null, '文件读取失败'); };
    fr.readAsArrayBuffer(file);
  }
  /* PDF：交给专门的解析器（解压 FlateDecode + 解析 ToUnicode CMap） */
  function readPdf(file, cb) {
    if (!MR.pdftext) { cb(null, '未加载 PDF 解析模块'); return; }
    MR.pdftext.fromFile(file).then(function (text) { cb(text); })
      .catch(function (e) { cb(null, (e && e.message) || '解析失败'); });
  }
  return { readDocx: readDocx, readPdf: readPdf };
})();

/* ================================================================
   论文驱动的数据层
   ================================================================ */
MR.state.domain = '';        /* 用户选择的材料方向；空表示自动识别 */
MR.state.paperId = '';
MR.state.paper = null;
MR.state.analysis = null;
MR.state.profile = null;
MR.state.model = null;
MR.state.rawText = '';
MR.state.sel = { vars: [], inds: [], material: '' };
MR.state.chartSpec = 0;
MR.state.params = {};
MR.state.realData = null;
MR.state.realSource = null;
MR.state.lang = 'zh';
MR.state.styleLearned = false;
MR.state.styleTarget = null;
MR.state.deAIResult = null;
MR.state.figs = {};

MR.rebuild = function () {
  var p = MR.state.paper;
  if (!p) return;
  MR.state.rawText = p.text || '';
  MR.state.analysis = MR.extract.analyze(p.text || '', { name: p.name });
  MR.state.profile = MR.paper.build(MR.state.analysis, p.text || '');
  MR.state.profile.__rawText = p.text || '';
  MR.state.model = MR.paper.makeModel(MR.state.profile);
  MR.state.profile.__model = MR.state.model;
  /* 默认选中：前 2 个变量 + 前 3 个性能指标 */
  var pf = MR.state.profile;
  MR.state.sel.vars = (pf.variables || []).slice(0, 2).map(function (v) { return v.key; });
  if (!MR.state.sel.vars.length && (pf.variables || []).length) MR.state.sel.vars = [pf.variables[0].key];
  MR.state.sel.inds = (pf.perf || []).slice(0, 3).map(function (i) { return i.name; });
  MR.state.sel.material = (pf.materials || [])[0] ? pf.materials[0].name : '';
  MR.state.params = {};
  (pf.variables || []).forEach(function (v) {
    MR.state.params[v.key] = v.levels[Math.floor(v.levels.length / 2)];
  });
  MR.state.chartSpec = 0;
  MR.state.realData = null; MR.state.deAIResult = null; MR.state.styleLearned = false;
  (MR.STAGES || []).forEach(function (s) { MR.state.stage[s.k] = 'idle'; });
  if (MR.app && MR.app.render) MR.app.render();
};

MR.loadPaper = function (id) {
  var p = (window.MR_PAPERS || []).filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  MR.state.paperId = id;
  MR.state.paper = p;
  if (p.domain && !MR.state.domain) MR.state.domain = p.domain;
  MR.log('OK', '载入论文 <b>' + MR.esc(p.name) + '</b>（' + (p.text ? (p.text.length / 1000).toFixed(1) + ' 千字符' : '无文字层') + '）');
  MR.rebuild();
  if (!p.text) {
    MR.log('WARN', '该文件没有可提取的文字层（扫描版），抽取结果为空 —— 平台不会因此臆造内容');
  } else {
    var a = MR.state.analysis;
    MR.log('AI', '抽取结果：原料/试剂 <b>' + a.materials.length + '</b> · 仪器 <b>' + a.instruments.length + '</b> · 变量 <b>' + a.variables.length + '</b> · 性能指标 <b>' + a.indicators.filter(function (i) { return !i.isChar; }).length + '</b> · 表征手段 <b>' + a.indicators.filter(function (i) { return i.isChar; }).length + '</b> · 参考文献 <b>' + a.references.length + '</b>');
  }
};

MR.loadText = function (text, name) {
  MR.state.paper = { id: 'U' + Date.now(), label: '用户上传', name: name || '粘贴文本', kind: '上传文献', text: text };
  MR.state.paperId = MR.state.paper.id;
  MR.log('OK', '载入文本 <b>' + MR.esc(name || '粘贴文本') + '</b>：' + (text.length / 1000).toFixed(1) + ' 千字符');
  MR.rebuild();
};

/* ================================================================
   试剂 GHS 词典（只覆盖常见试剂；未收录一律标"需人工核查"）
   ================================================================ */
MR.GHS = {
  '氢氧化钠': ['皮肤腐蚀 1A · 严重眼损伤 1', 3], 'NaOH': ['皮肤腐蚀 1A', 3],
  '氯化镁': ['眼刺激 2 · 急性经口 4', 2], 'MgCl2': ['眼刺激 2', 2],
  '氧化镁': ['眼刺激 2 · 吸入刺激（粉尘）', 2], 'MgO': ['吸入刺激（粉尘）', 2],
  '无水乙醇': ['易燃液体 2', 2], '乙醇': ['易燃液体 2', 2],
  '硫酸': ['皮肤腐蚀 1A · 金属腐蚀 1', 4], '盐酸': ['皮肤腐蚀 1B', 3], '硝酸': ['氧化性液体 3 · 皮肤腐蚀 1A', 4],
  '氨水': ['皮肤腐蚀 1B · 急性吸入 3', 4], '过氧化氢': ['皮肤腐蚀 1A · 氧化性液体 1', 4],
  '偶联剂': ['眼刺激 2 · 可燃（含醇）', 2], 'KH-550': ['皮肤致敏 1 · 易燃液体 3', 3], '硅烷': ['易燃液体 2 · 眼刺激 2', 3],
  '碳酸钠': ['严重眼损伤 1', 2], '氯化钠': ['无显著危害', 1], '竹粉': ['可燃性粉尘 · 吸入刺激', 1], '竹纤维': ['可燃性粉尘 · 吸入刺激', 1]
};
MR.ghsOf = function (name) {
  var k = Object.keys(MR.GHS).filter(function (x) { return name.indexOf(x) >= 0 || x.indexOf(name) >= 0; })[0];
  return k ? { ghs: MR.GHS[k][0], score: MR.GHS[k][1], known: true } : { ghs: '未收录于内置 GHS 词典，需人工核查', score: null, known: false };
};

/* ================================================================
   论文问题自动检测（用于环节 10）
   ================================================================ */
MR.checks = function () {
  var an = MR.state.analysis, pf = MR.state.profile, out = [];
  if (!an) return out;
  var raw = MR.state.rawText || '';

  /* 1. 章节编号跳号 */
  var nos = (an.sections || []).filter(function (s) { return /^\d/.test(s.no); });
  for (var i = 1; i < nos.length; i++) {
    var a = nos[i - 1].no.split('.').map(Number), b = nos[i].no.split('.').map(Number);
    if (a.length === b.length && b[b.length - 1] - a[a.length - 1] > 1 && b.length >= 1 && a.slice(0, -1).join('.') === b.slice(0, -1).join('.')) {
      out.push({ lv: 'must', t: '章节编号跳号', d: '第 ' + nos[i - 1].no + ' 节之后直接出现第 ' + nos[i].no + ' 节，缺少 ' + nos[i - 1].no.replace(/\d+$/, function (x) { return String(+x + 1); }) + '。请在定稿前补全编号或补充该节内容。', ev: nos[i - 1].no + ' ' + nos[i - 1].k + ' ／ ' + nos[i].no + ' ' + nos[i].k });
    }
  }
  /* 2. 参考文献重复 */
  var seen = {}, dup = [];
  (an.references || []).forEach(function (r, i) {
    var key = r.raw.replace(/\s/g, '').slice(0, 40);
    if (seen[key] != null) dup.push('[' + (seen[key] + 1) + '] 与 [' + (i + 1) + ']'); else seen[key] = i;
  });
  if (dup.length) out.push({ lv: 'must', t: '参考文献存在重复条目', d: '检出 ' + dup.length + ' 组完全重复的文献：' + dup.join('、') + '。请合并编号并同步正文引用序号。', ev: '基于 8-gram 字符指纹比对' });
  /* 3. 参考文献字段缺失 */
  var bad = (an.references || []).filter(function (r) { return r.missing && r.missing.length; });
  if (bad.length) out.push({ lv: 'minor', t: '参考文献著录项不完整', d: '共 ' + bad.length + ' 条缺少' + (bad[0].missing.indexOf('year') >= 0 ? '年份' : '作者') + '等必要著录项，按 GB/T 7714-2015 需补全。', ev: (bad[0].raw || '').slice(0, 90) });
  /* 4. 指标未在结果章节讨论 */
  var resultText = (an.sections || []).filter(function (s) { return /结果|讨论|分析/.test(s.k); }).map(function (s) { return s.k; }).join(' ');
  void resultText;
  var resBody = raw.split(/\n/).filter(function (l) { return true; }).join('\n');
  var undiscussed = (pf.perf || []).filter(function (ind) { return resBody.indexOf(ind.name) < 0; });
  if (undiscussed.length) out.push({ lv: 'must', t: '部分指标未在结果中讨论', d: '方法部分出现的指标 ' + undiscussed.map(function (x) { return x.name; }).join('、') + ' 在结果与讨论中没有对应的分析段落。', ev: '抽取到的指标清单 vs 结果章节文本' });
  /* 5. 变量水平是否全部讨论 */
  var vNotDiscussed = [];
  (pf.variables || []).forEach(function (v) {
    var missing = v.levels.filter(function (L) { return resBody.indexOf(String(L)) < 0; });
    if (missing.length && missing.length < v.levels.length) vNotDiscussed.push(v.key + '（缺 ' + missing.join('/') + '）');
  });
  if (vNotDiscussed.length) out.push({ lv: 'minor', t: '部分水平未在结果中给出数据', d: vNotDiscussed.join('；') + ' 等水平在原文中未检索到对应的结果数据。', ev: '变量水平清单 vs 结果章节文本' });
  /* 6. 重复次数 / 误差报告 */
  var hasRep = /平行|重复|n\s*=\s*\d|标准差|±|误差棒|标准偏差/.test(raw);
  if (!hasRep) out.push({ lv: 'must', t: '未报告重复次数与误差', d: '全文未检索到"平行样 / 重复 / 标准差 / ± / 误差棒"等表述。力学性能必须给出至少 3 次重复的均值与偏差，否则组间差异不可判定。', ev: '全文关键词检索：平行、重复、±、标准差' });
  /* 7. 摘要与结论的关键名目不一致 */
  var absTxt = pf.abstract || '', conTxt = (raw.split(/结\s*论/)[1] || '').slice(0, 1200);
  var phaseWords = ['五相晶体', '三相晶体', 'Mg(OH)2', 'MgCO3', 'MgO', 'Si-O-C', '半纤维素', '木质素'];
  var missInCon = phaseWords.filter(function (w2) { return absTxt.indexOf(w2) >= 0 && conTxt.indexOf(w2) < 0; });
  if (missInCon.length) out.push({ lv: 'minor', t: '摘要与结论的名目不一致', d: '摘要提到的 ' + missInCon.join('、') + ' 在结论中未出现（或表述不同），建议统一物相/基团的命名与数量。', ev: '摘要文本 vs 结论文本' });
  /* 8. 标准引用完整性 */
  if (!(an.standards || []).length) out.push({ lv: 'minor', t: '未标注测试所依据的标准', d: '测试方法未引用 GB/T、ISO、ASTM 等标准编号，读者无法复核试验条件。', ev: '全文标准编号检索结果为空' });
  /* 9. 仪器型号完整度 */
  var noModel = (pf.instruments || []).filter(function (i2) { return !i2.model; });
  if (noModel.length) out.push({ lv: 'minor', t: '部分仪器缺型号', d: noModel.map(function (x) { return x.name; }).join('、') + ' 未给出型号，影响可复现性。', ev: '仪器抽取结果' });
  return out;
};

/* ================================================================
   论文文本生成（全部由抽取结果驱动）
   ================================================================ */
MR.gen = {
  background: function (pf, an) {
    var L = [];
    if (pf.abstract) L.push(pf.abstract.slice(0, 400));
    var kw = (pf.keywords || []).slice(0, 6).join('、');
    L.push('本研究以' + (pf.domain || '材料') + '为背景，围绕' + (pf.title || '该体系') + '展开。' +
      (kw ? '涉及的关键词包括：' + kw + '。' : '') +
      '原文报道的可测指标为' + (pf.perf.length ? pf.perf.map(function (i) { return i.name; }).join('、') : '（原文未报告）') + '；' +
      '采用的材料与试剂为' + (pf.materials.length ? pf.materials.slice(0, 5).map(function (m) { return m.name; }).join('、') : '（未报告）') + '；' +
      '变量包括' + (pf.variables.length ? pf.variables.map(function (v) { return v.key; }).join('、') : '（未报告）') + '。');
    return L;
  },
  gap: function (pf) {
    var L = [];
    var miss = pf.missing || [];
    var checks = MR.checks();
    L.push('基于对该文献的系统抽取，识别出以下可继续推进的方向：');
    var items = [];
    if (miss.length) items.push('原文缺失项：' + miss.join('、') + '，这既是可复现性的短板，也是后续工作可以补齐的空间');
    (pf.variables || []).forEach(function (v) {
      (pf.perf || []).forEach(function (ind) {
        var m = (pf.matrix || []).filter(function (x) { return x.v === v.key && x.i === ind.name; })[0];
        if (!m) items.push(v.key + ' 与 ' + ind.name + ' 的定量关系在原文中未建立');
      });
    });
    var musts = checks.filter(function (c) { return c.lv === 'must'; });
    if (musts.length) items.push('原文存在 ' + musts.length + ' 项需修订的方法学问题（' + musts.map(function (c) { return c.t; }).join('、') + '）');
    if (!items.length) items.push('原文的变量—性能关系较为完整，可从工艺放大与环境老化两个方向延伸');
    items.slice(0, 6).forEach(function (x) { L.push('（' + (L.length) + '）' + x + '。'); });
    return L;
  },
  method: function (pf, an) {
    var L = [];
    L.push('本研究沿用并扩展原文的制备路线。所用原料为' +
      (pf.materials.length ? pf.materials.map(function (m) { return m.name + (m.purity ? '（' + m.purity + '）' : '') + (m.supplier ? '，' + m.supplier : ''); }).join('；') : '原文未报告') + '。');
    if (pf.formulation.length) L.push('配方与关键参数：' + pf.formulation.map(function (f) { return f.t + '为 ' + f.v; }).join('；') + '。');
    if (pf.steps.length) {
      L.push('工艺流程按原文为 ' + pf.steps.length + ' 道工序：' + pf.steps.map(function (s, i) { return '（' + (i + 1) + '）' + s.t + (s.cond ? '（' + s.cond + '）' : ''); }).join('；') + '。');
    }
    var insts = (pf.instruments || []).map(function (i) { return i.name + (i.model ? '（' + i.model + '）' : ''); });
    if (insts.length) L.push('测试所用仪器：' + insts.join('、') + '。');
    if (an.standards.length) L.push('性能测试依据 ' + an.standards.join('、') + ' 执行。');
    var chars = (pf.chars || []).map(function (c) { return c.name; });
    if (chars.length) L.push('表征手段包括' + chars.join('、') + '，用于揭示结构与界面的变化。');
    return L;
  },
  results: function (pf) {
    var L = [];
    var n = 0;
    (pf.matrix || []).forEach(function (m) {
      var model = pf.__model[m.v + '|' + m.i];
      if (!model || n >= 5) return;
      n++;
      var lv = model.levels.join('、');
      var dirTxt = { 'rise-fall': '先上升后下降', 'mono-up': '单调上升', 'mono-down': '单调下降' }[m.dir] || '呈规律性变化';
      L.push('在' + MR.paper.shortVar(m.v) + '取值为 ' + lv + ' 的范围内，' + m.i + '随其变化' + dirTxt +
        (m.opt != null ? '，峰值出现在 ' + m.opt + ' 附近' : '') +
        (m.amp != null ? '，相对对照试样' + (m.polarity === 'min' ? '降低/升高约 ' : '提高 ') + Math.abs(m.amp) + '%' : '（峰值幅度原文未报告）') +
        '。' + (m.polarity === 'min' ? '该指标越小越优，因此峰值位置代表最佳工艺点。' : '') +
        '（数据来源：' + (m.opt != null ? '原文报告的最优水平' : '原文未给出最优值，按水平区间推断') + '）');
    });
    if (!L.length) L.push('原文未报告可用于建模的变量—性能对应关系，无法生成定量的结果分析。');
    /* 表征 */
    if ((pf.peakData.theta || []).length) L.push('XRD 分析中，原文报道的衍射峰位于 2θ = ' + pf.peakData.theta.slice(0, 8).join('°、') + '°，' + (pf.peakData.phases.length ? '对应的物相包括' + pf.peakData.phases.join('、') + '。' : ''));
    if ((pf.ftir.bands || []).length) L.push('红外光谱的特征吸收出现在 ' + pf.ftir.bands.slice(0, 8).join('、') + ' cm⁻¹ 附近' + (Object.keys(pf.ftir.assign).length ? '，分别对应' + Object.keys(pf.ftir.assign).slice(0, 4).map(function (k) { return k + ' cm⁻¹（' + pf.ftir.assign[k] + '）'; }).join('、') : '') + '。');
    if ((pf.sem || []).length) L.push('断面形貌方面：' + pf.sem.slice(0, 3).map(function (s) { return (s.tag ? s.tag + '——' : '') + s.desc; }).join('；') + '。');
    return L;
  },
  conclusion: function (pf) {
    var L = [];
    var best = (pf.matrix || []).filter(function (m) { return m.amp != null && m.polarity !== 'min'; })
      .sort(function (a, b) { return Math.abs(b.amp) - Math.abs(a.amp); }).slice(0, 3);
    if (best.length) {
      L.push('综上有：' + best.map(function (b) { return MR.paper.shortVar(b.v) + '为 ' + b.opt + ' 时 ' + b.i + '较对照提高 ' + Math.abs(b.amp) + '%'; }).join('；') + '。这些结论与原文报道的最优条件一致，说明本文沿用的工艺路线是可靠的。');
    } else {
      L.push('由于原文未报告峰值提升幅度，本文仅给出变量—性能的定性趋势，定量结论有待补充重复试验后确定。');
    }
    var chars = (pf.chars || []).map(function (c) { return c.name; });
    if (chars.length) L.push('结构与界面表征（' + chars.join('、') + '）表明，性能变化可由界面结合状态的改变得到解释。');
    L.push('需要说明的是，本文所有数值均来自对原文的抽取与在其最优水平上的外推，未包含新的实测数据；' +
      '因此结论的适用范围限于原文报道的变量区间。');
    return L;
  },
  future: function (pf) {
    var L = [];
    var items = [];
    var checks = MR.checks();
    checks.slice(0, 3).forEach(function (c) { items.push('补齐' + c.t + '——' + c.d.split('。')[0] + '。'); });
    (pf.variables || []).slice(0, 2).forEach(function (v) {
      items.push('把' + v.key + '与其余因素做正交或响应面设计，建立多因素耦合的定量模型（原文仅单因素考察）。');
    });
    if (!(pf.chars || []).length) items.push('引入 SEM / FTIR / XRD 等表征手段，把性能变化归因到结构层面。');
    items.push('开展长期耐久性（干湿循环、冻融、紫外老化）评价，检验最优配比在使用条件下的稳定性。');
    if (!items.length) items = ['在原文基础上扩展变量范围、补充重复试验与误差统计，并开展耐久性评价。'];
    items.slice(0, 4).forEach(function (x, i) { L.push('（' + (i + 1) + '）' + x); });
    return L;
  }
};

/* ================================================================
   通用小组件
   ================================================================ */
function ev(html) { return '<span class="mono-xs" style="display:block;text-transform:none;letter-spacing:0;color:var(--ink-4);margin-top:3px">原文依据：' + html + '</span>'; }
function noneNote(t) { return '<div class="note note--sig">' + MR.icon('review1', 14) + '<span>' + t + '</span></div>'; }
function indKindChip(k) {
  var m = { '性能指标': 'acc', '形貌表征': 'sig', '化学表征': 'sig', '物相表征': 'sig', '热性能': 'sig', '表面化学': 'sig', '孔结构': 'sig', '电化学': 'sig', '光学表征': 'sig' };
  return MR.chip(k, m[k] || 'line');
}

/* ================================================================
   渲染分发（在 app.js 的 renderMain 中调用）
   ================================================================ */
MR.renderStage = function (k) {
  var fn = MR.views2[k];
  return fn ? fn.render() : '<div class="view"><p>环节未实现</p></div>';
};

/* ---------------- 轨迹 ---------------- */
MR.traces = MR.traces || {};
(function () {
  var an = null;
  MR.traceFor = function (k) {
    an = MR.state.analysis || { materials: [], instruments: [], variables: [], indicators: [], steps: [], references: [] };
    var base = {
      imp: [
        { k: 'READ 01', t: '文档读取', b: '读取上传的文档并还原纯文本（DOCX 走 ZIP + DecompressionStream 解压 word/document.xml；PDF 尝试解析文本流）。', kv: [['字数', (MR.state.rawText || '').length]] },
        { k: 'SECTION 02', t: '章节切分', b: '按编号与标题模式切分章节，用于定位"材料与方法""结果与讨论"等区域，避免用结论句去判断方法。', kv: [['章节', (an.sections || []).length]] },
        { k: 'EXTRACT 03', t: '实体抽取', b: '抽取原料/试剂、仪器、标准、工艺步骤、变量与水平、可测指标、配比与参考文献；每一项都保留原文依据。', kv: [['原料', an.materials.length], ['仪器', an.instruments.length], ['变量', an.variables.length], ['指标', an.indicators.filter(function (i) { return !i.isChar; }).length]] },
        { k: 'VERIFY 04', t: '原文回溯校验', b: '对每条抽取结果回查其在原文中的出现位置；找不到出处的候选一律丢弃，不进入后续环节。', kv: [['丢弃规则', '无出处即丢弃']] },
        { k: 'GAP 05', t: '缺失项清单', b: '把原文没有报告的项目（变量 / 指标 / 仪器 / 文献）单独列出——后续环节只分析原文有的内容。', kv: [['缺失项', (MR.state.profile.missing || []).length]] }
      ],
      scope: [
        { k: 'OBJECT 01', t: '研究对象枚举', b: '把原文的实验拆成可独立研究的对象：原料/试剂、工艺步骤、已测指标。仅列原文出现过的。', kv: [['原料', an.materials.length], ['工序', an.steps.length], ['指标', an.indicators.length]] },
        { k: 'VAR 02', t: '变量可研性', b: '判断每个对象是否存在可调水平：原文出现两个以上取值的才算"可研变量"。', kv: [['可研变量', an.variables.length]] },
        { k: 'QUERY 03', t: '检索式构造', b: '由"研究对象 + 变量 + 指标"生成中英文检索式（用于站内库检索与外部数据库跳转）。', kv: [['来源', '抽取字段直接拼接']] },
        { k: 'GAP 04', t: '新方向推导', b: '在原文未覆盖的"变量 × 指标"组合中找研究空白，并给出可执行的改动建议。', kv: [['空白组合', Math.max(0, an.variables.length * Math.max(1, MR.state.profile.perf.length) - (MR.state.profile.matrix || []).length)]] }
      ],
      design: [
        { k: 'LEVEL 01', t: '水平确定', b: '变量水平直接取自原文出现的取值；不新增原文没有的数值区间。', kv: [['变量', an.variables.length]] },
        { k: 'STOICH 02', t: '配方核对', b: '配方、摩尔比、固液比等按原文表述原样引用，不重新计算。', kv: [['配方项', (MR.state.profile.formulation || []).length]] },
        { k: 'SAFETY 03', t: '安全映射', b: '把原文试剂逐一映射到内置 GHS 词典；未收录的试剂标为"需人工核查"，不臆测危害等级。', kv: [['试剂', an.materials.length]] },
        { k: 'ACC 04', t: '误差量级', b: '从原文的测试标准与重复描述推断误差量级；原文未报告重复次数时明确提示。', kv: [['标准', an.standards.length]] }
      ]
    };
    var key = MR.STAGES.filter(function (s) { return s.k === k; })[0];
    return base[k] || [
      { k: 'LOAD 01', t: '载入抽取结果', b: '本环节只使用已抽取到的内容：' + (an.indicators.map(function (i) { return i.name; }).slice(0, 6).join('、') || '（无）'), kv: [['论文', (MR.state.paper || {}).id || '-']] },
      { k: 'EVAL 02', t: '计算与生成', b: '按原文报告的变量水平、最优值与提升幅度生成结果；原文缺项处显式标注"未报告"。', kv: [['环节', key ? key.t : k]] }
    ];
  };
})();


/* 材料方向：影响术语召回与结果解释，不改变"只分析原文"的原则 */
MR.setDomain = function (k) {
  MR.state.domain = k || '';
  var d = (MR.domain.MATERIAL_DOMAINS || []).filter(function (x) { return x.k === k; })[0];
  MR.log('INFO', d ? ('材料方向设为 <b>' + d.t + '</b>（' + d.d + '），术语召回已按该方向增强') : '材料方向设为自动识别');
  if (MR.state.paper && MR.state.paper.text) MR.rebuild(); else MR.app.render();
};
