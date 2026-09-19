P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
s = open(P, encoding='utf-8').read()
n = 0

def rep(old, new, tag):
    global s, n
    if old in s:
        s = s.replace(old, new)
        n += 1
        print('applied:', tag)
    else:
        print('SKIP (anchor missing):', tag)

# 1) 去掉"看似二进制就去解压"的危险回退
rep("""        if (rec.flate) todo.push(rec);
        else { rec.text = latin1(rec.data); if (/[\\x00-\\x08\\x0e-\\x1f]/.test(rec.text.slice(0, 64))) todo.push(rec); }""",
    """        if (rec.flate) todo.push(rec); else rec.text = latin1(rec.data);""",
    'remove risky fallback')

# 2) 排除图像类过滤器
rep("        rec.flate = /\\/FlateDecode/.test(dict);",
    "        rec.flate = /\\/FlateDecode/.test(dict) && !/\\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|RunLengthDecode|LZWDecode)/.test(dict);",
    'exclude image filters')

# 3) 解压硬保护
rep("""  function inflateRawJS(data) {
    var pos = 0, bitbuf = 0, bitcnt = 0;
    var out = new Uint8Array(Math.max(1024, data.length * 6)), olen = 0;
    function grow(n) {
      if (olen + n <= out.length) return;
      var n2 = new Uint8Array(Math.max(out.length * 2, olen + n + 1024));
      n2.set(out.subarray(0, olen));
      out = n2;
    }""",
    """  var MAX_OUT = 32 * 1024 * 1024;
  var MAX_STEP = 20000000;
  function inflateRawJS(data) {
    var pos = 0, bitbuf = 0, bitcnt = 0, guard = 0;
    var out = new Uint8Array(Math.min(MAX_OUT, Math.max(1024, data.length * 6))), olen = 0;
    function grow(n) {
      if (olen + n <= out.length) return;
      if (olen + n > MAX_OUT) throw new Error('解压保护：输出超过上限');
      var n2 = new Uint8Array(Math.min(MAX_OUT, Math.max(out.length * 2, olen + n + 1024)));
      n2.set(out.subarray(0, olen));
      out = n2;
    }
    function tick() { if (++guard > MAX_STEP) throw new Error('解压保护：迭代超限'); }""",
    'inflate guards')

# 4) 循环打点
rep("""    function bits(n) {
      while (bitcnt < n) {""",
    """    function bits(n) {
      tick();
      while (bitcnt < n) {""",
    'tick in bits')
rep("""        for (;;) {
          var s2 = decodeSym(T.lit);""",
    """        for (;;) {
          tick();
          var s2 = decodeSym(T.lit);""",
    'tick in block loop')
rep("""    var last = 0;
    do {
      last = bits(1);""",
    """    var last = 0;
    do {
      tick();
      last = bits(1);""",
    'tick in outer loop')

# 5) 内容流扫描的大小保护
rep("          if (!t || t.indexOf('BT') < 0) return;",
    "          if (!t || t.length < 12) return;\n          if (t.length > 8 * 1024 * 1024) return;\n          if (t.indexOf('BT') < 0) return;",
    'stream size guard')

# 6) 限制待解压流数量与大小
rep("    return Promise.all(todo.map(function (r) {",
    "    todo = todo.filter(function (r) { return r.data && r.data.length > 0 && r.data.length < 6 * 1024 * 1024; }).slice(0, 400);\n    return Promise.all(todo.map(function (r) {",
    'limit todo list')

open(P, 'w', encoding='utf-8').write(s)
print('applied', n, 'patches')
