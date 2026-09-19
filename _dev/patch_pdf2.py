P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
s = open(P, encoding='utf-8').read()

old = """  function inflate(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('浏览器不支持解压（DecompressionStream）'));
    var ds = new DecompressionStream('deflate');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function inflateRaw(u8) {
    var ds = new DecompressionStream('deflate-raw');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }"""

new = """  /* 不用 Response / Blob.stream()，直接操作 ReadableStream，兼容性更好 */
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
  function inflate(u8) { return viaStream(u8, 'deflate'); }
  function inflateRaw(u8) { return viaStream(u8, 'deflate-raw'); }"""

assert old in s, 'inflate anchor'
s = s.replace(old, new)

old2 = """  function inflateAny(u8) {
    if (typeof DecompressionStream !== 'undefined') {
      return inflate(u8).catch(function () { return inflateRaw(u8); }).catch(function () { return inflateAuto(u8); });
    }
    return new Promise(function (res, rej) { try { res(inflateAuto(u8)); } catch (e) { rej(e); } });
  }"""

new2 = """  function inflateAny(u8) {
    function js() { return new Promise(function (res, rej) { try { res(inflateAuto(u8)); } catch (e) { rej(e); } }); }
    if (typeof DecompressionStream !== 'undefined') {
      return inflate(u8).catch(function () { return inflateRaw(u8); }).catch(js).catch(js);
    }
    return js();
  }"""

assert old2 in s, 'inflateAny anchor'
s = s.replace(old2, new2)

open(P, 'w', encoding='utf-8').write(s)
print('pdftext.js patched: stream reader, no Response dependency')
