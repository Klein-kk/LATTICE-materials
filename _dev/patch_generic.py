import io, os

# ============ 1) views2-core.js ============
VC = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\views2-core.js'
v = open(VC, encoding='utf-8').read()

# PDF 改为调用专用解析器
start = v.index('  /* PDF：抽取未压缩/FlateDecode 文本流中的 Tj/TJ 片段')
end = v.index('  return { readDocx: readDocx, readPdf: readPdf };')
newpdf = '''  /* PDF：交给专门的解析器（解压 FlateDecode + 解析 ToUnicode CMap） */
  function readPdf(file, cb) {
    if (!MR.pdftext) { cb(null, '未加载 PDF 解析模块'); return; }
    MR.pdftext.fromFile(file).then(function (text) { cb(text); })
      .catch(function (e) { cb(null, (e && e.message) || '解析失败'); });
  }
'''
v = v[:start] + newpdf + v[end:]

# 领域状态 + 设置函数（放在状态声明之后）
old = "MR.state.paperId = 'P1';"
new = """MR.state.domain = '';        /* 用户选择的材料方向；空表示自动识别 */
MR.state.paperId = '';"""
assert old in v
v = v.replace(old, new)

# loadPaper 支持"仅题录"的案例
old2 = """MR.loadPaper = function (id) {
  var p = (window.MR_PAPERS || []).filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  MR.state.paperId = id;
  MR.state.paper = p;"""
new2 = """MR.loadPaper = function (id) {
  var p = (window.MR_PAPERS || []).filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  MR.state.paperId = id;
  MR.state.paper = p;
  if (p.domain && !MR.state.domain) MR.state.domain = p.domain;"""
assert old2 in v
v = v.replace(old2, new2)

# 追加 setDomain
v += """

/* 材料方向：影响术语召回与结果解释，不改变"只分析原文"的原则 */
MR.setDomain = function (k) {
  MR.state.domain = k || '';
  var d = (MR.domain.MATERIAL_DOMAINS || []).filter(function (x) { return x.k === k; })[0];
  MR.log('INFO', d ? ('材料方向设为 <b>' + d.t + '</b>（' + d.d + '），术语召回已按该方向增强') : '材料方向设为自动识别');
  if (MR.state.paper && MR.state.paper.text) MR.rebuild(); else MR.app.render();
};
"""
open(VC, 'w', encoding='utf-8').write(v)
print('views2-core.js patched')

# ============ 2) index.html ============
H = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\index.html'
h = open(H, encoding='utf-8').read()
old3 = """<script src="assets/js/papers.js"></script>
<script src="assets/js/extract.js"></script>"""
new3 = """<script src="assets/js/papers.js"></script>
<script src="assets/js/domain.js"></script>
<script src="assets/js/pdftext.js"></script>
<script src="assets/js/extract.js"></script>"""
assert old3 in h
h = h.replace(old3, new3)
h = h.replace('<title>LATTICE · 材料科研自动化流水线</title>', '<title>LATTICE · 材料学科科研自动化平台</title>')
h = h.replace('<meta name="description" content="面向材料领域的自动化科研流水线：文献导入 → 研究对象确立 → 变量与安全设计 → SCI 图形生成 → 结果分析 → 实验指导 → 真实数据矫正 → 论文撰写 → 语言处理 → 论文评审。">',
              '<meta name="description" content="面向材料学科全部方向的科研自动化平台：上传任意材料类论文，平台抽取其真实的原料、仪器、变量与指标，并在这些内容之上完成变量设计、图形生成、结果分析、实验指导、论文写作与评审。">')
open(H, 'w', encoding='utf-8').write(h)
print('index.html patched')

# ============ 3) app.js：PDF 走新解析器 + 启动不预载论文 ============
AP = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\app.js'
a = open(AP, encoding='utf-8').read()
old4 = """  if ((window.MR_PAPERS || []).length) {
    MR.loadPaper('P1');
    MR.log('AI', '已默认载入内置论文 P1。你也可以上传自己的 DOCX / TXT，或粘贴正文 —— 后续所有环节都只分析你导入的这篇论文。');
  }"""
new4 = """  MR.log('AI', '这是一个面向材料学科全部方向的平台：上传任意材料类论文（DOCX / TXT / PDF 或粘贴正文），平台只抽取并分析你导入的这篇文献。未上传时，可在环节 01 选择内置示例文档体验流程。');"""
assert old4 in a, 'boot log anchor'
a = a.replace(old4, new4)
old5 = "  } else if (ext === 'pdf') {\n    MR.doc.readPdf(f, function (text, err) { if (err) fail(err); else ok(text); });"
assert old5 in a, 'pdf branch anchor'
open(AP, 'w', encoding='utf-8').write(a)
print('app.js patched')

# ============ 4) boot.js：不再默认载入 ============
B = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\boot.js'
b = open(B, encoding='utf-8').read()
b = b.replace("      MR.log('INFO', '流水线引擎就绪 · 10 个环节 · 本地文献库 ' + MR.lib.rows.length + ' 条 · 3 个验证案例');",
              "      MR.log('INFO', '流水线引擎就绪 · 10 个环节 · 材料方向 ' + MR.domain.MATERIAL_DOMAINS.length + ' 类 · 性能指标词表 ' + MR.domain.ALL_IND.length + ' 项 · 本地文献库 ' + MR.lib.rows.length + ' 条');")
open(B, 'w', encoding='utf-8').write(b)
print('boot.js patched')
