P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
s = open(P, encoding='utf-8').read()

# A) 把 inflate() 换成不依赖 Response 的实现
oldA = """  function inflate(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('浏览器不支持解压（DecompressionStream）'));
    var ds = new DecompressionStream('deflate');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }"""
newA = """  /* 直接操作 ReadableStream，不依赖 Response / Blob.stream() */
  function readAll(stream) {
    return new Promise(function (res, rej) {
      var reader = stream.getReader(), chunks = [], total = 0;
      (function pump() {
        reader.read().then(function (r) {
          if (r.done) {
            var out = new Uint8Array(total), off = 0;
            chunks.forEach(function (c) { out.set(c, off); off += c.length; });
            res(out);
            return;
          }
          chunks.push(r.value); total += r.value.length;
          pump();
        }).catch(rej);
      })();
    });
  }
  function viaStream(u8, fmt) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no DecompressionStream'));
    var ds = new DecompressionStream(fmt);
    var writer = ds.writable.getWriter();
    writer.write(u8);
    writer.close();
    return readAll(ds.readable);
  }
  function inflate(u8) { return viaStream(u8, 'deflate'); }"""
assert oldA in s, 'inflate anchor'
s = s.replace(oldA, newA)

# B) 把 inflateRaw() 换成同类实现
oldB = """  function inflateRaw(u8) {
    var ds = new DecompressionStream('deflate-raw');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }"""
newB = """  function inflateRaw(u8) { return viaStream(u8, 'deflate-raw'); }"""
assert oldB in s, 'inflateRaw anchor'
s = s.replace(oldB, newB)

# C) inflateAny 兜底链
oldC = """  function inflateAny(u8) {
    if (typeof DecompressionStream !== 'undefined') {
      return inflate(u8).catch(function () { return inflateRaw(u8); }).catch(function () { return inflateAuto(u8); });
    }
    return new Promise(function (res, rej) { try { res(inflateAuto(u8)); } catch (e) { rej(e); } });
  }"""
newC = """  function inflateAny(u8) {
    function js() { return new Promise(function (res, rej) { try { res(inflateAuto(u8)); } catch (e) { rej(e); } }); }
    if (typeof DecompressionStream !== 'undefined') {
      return inflate(u8).catch(function () { return inflateRaw(u8); }).catch(js);
    }
    return js();
  }"""
assert oldC in s, 'inflateAny anchor'
s = s.replace(oldC, newC)

open(P, 'w', encoding='utf-8').write(s)
print('pdftext.js patched (no Response)')
