import os

P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\app.js'
s = open(P, encoding='utf-8').read()

old1 = """  var v = MR.views[MR.state.view];
  if (!v) return;
  main.innerHTML = '<div class="view">' + v.render() + '</div>';
  if (v.mount) v.mount(main);
  main.scrollTop = keep;"""
new1 = """  var v = (MR.views2 && MR.views2[MR.state.view]) || MR.views[MR.state.view];
  if (!v) return;
  main.innerHTML = '<div class="view">' + v.render() + '</div>';
  if (v.mount) v.mount(main);
  main.scrollTop = keep;"""
assert old1 in s, 'renderMain anchor missing'
s = s.replace(old1, new1)

old2 = "  MR.playTrace((MR.traces && MR.traces[key]) || [], function () {"
new2 = "  MR.playTrace((MR.traceFor ? MR.traceFor(key) : ((MR.traces && MR.traces[key]) || [])), function () {"
assert old2 in s, 'trace anchor missing'
s = s.replace(old2, new2)

old3 = "      if (id === 'fileInput') MR.app.handleFiles(el.files);"
new3 = "      if (id === 'fileInput') MR.app.handleDocFiles(el.files);"
assert old3 in s, 'fileInput anchor missing'
s = s.replace(old3, new3)

old4 = """  MR.log('INFO', 'LATTICE 就绪 · 10 个环节 · 3 个验证案例 · 本地文献库 ' + MR.lib.rows.length + ' 条');
  MR.log('WARN', '当前课题未定义：请上传你研究方向的文献，或先用内置验证案例体验完整流程');"""
new4 = """  MR.log('INFO', 'LATTICE 就绪 · 10 个环节 · 本地文献库 ' + MR.lib.rows.length + ' 条');
  if ((window.MR_PAPERS || []).length) {
    MR.loadPaper('P1');
    MR.log('AI', '已默认载入内置论文 P1。你也可以上传自己的 DOCX / TXT，或粘贴正文 —— 后续所有环节都只分析你导入的这篇论文。');
  }"""
assert old4 in s, 'boot anchor missing'
s = s.replace(old4, new4)

ADD = r"""

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
"""

s += ADD
open(P, 'w', encoding='utf-8').write(s)
print('app.js patched OK, size', len(s))
