/* ============================================================
   LATTICE · 浏览器端 PDF 文字抽取（零依赖）
   关键点（v3 —— 针对真实期刊 PDF 的三次升级）：
     · 过滤器链：/Filter [ /ASCII85Decode /FlateDecode ] 这类多级链全部支持
       （旧版只认 FlateDecode，遇到 ASCII85 会把压缩字节当正文读出乱码）；
     · 字体编码回退：没有 /ToUnicode 的老 PDF（2000 年前后大量存在）改用
       /Encoding 的 WinAnsi / MacRoman / Standard 表 + /Differences 字形名，
       且支持 /Encoding 为“间接引用 obj”的写法；
     · 阅读顺序：按 页面树 /Kids → /Page → /Contents 的顺序还原文字，
       而不是按文件里对象的物理顺序（否则标题常被图注顶掉）。
     · 仍然：每个字体用自己的表解码（/Fn Tf 跟踪），纯 JS DEFLATE 带硬保护。
   ============================================================ */
window.MR = window.MR || {};

MR.pdftext = (function () {

  /* ---------------- 字节/字符串工具 ---------------- */
  function latin1(u8) {
    var CH = 8192, out = [];
    for (var i = 0; i < u8.length; i += CH) out.push(String.fromCharCode.apply(null, u8.subarray(i, i + CH)));
    return out.join('');
  }
  function unescapePdf(s) {
    return s.replace(/\\(n|r|t|b|f|\(|\)|\\|[0-7]{1,3})/g, function (_, g) {
      if (/^[0-7]+$/.test(g)) return String.fromCharCode(parseInt(g, 8));
      return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' })[g] || g;
    });
  }
  function hexToBytes(h) {
    h = h.replace(/[^0-9A-Fa-f]/g, '');
    if (h.length % 2) h += '0';
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }
  function hexToStr(h) {
    var out = '';
    for (var i = 0; i + 3 < h.length + 1; i += 4) {
      var cp = parseInt(h.substr(i, 4), 16);
      if (!isFinite(cp)) break;
      out += String.fromCharCode(cp);
    }
    return out;
  }

  /* ---------------- 纯 JS DEFLATE（含 zlib 头剥离） ---------------- */
  var LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  var DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  var CLCIDX = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  var MAX_OUT = 24 * 1024 * 1024, MAX_STEP = 12000000;

  function inflateRawJS(data) {
    var pos = 0, bitbuf = 0, bitcnt = 0, guard = 0, olen = 0;
    var out = new Uint8Array(Math.min(MAX_OUT, Math.max(2048, data.length * 8)));
    function grow(n) {
      if (olen + n <= out.length) return;
      if (olen + n > MAX_OUT) throw new Error('out-limit');
      var n2 = new Uint8Array(Math.min(MAX_OUT, Math.max(out.length * 2, olen + n + 2048)));
      n2.set(out.subarray(0, olen)); out = n2;
    }
    function bits(n) {
      if (++guard > MAX_STEP) throw new Error('step-limit');
      while (bitcnt < n) { bitbuf |= (data[pos++] || 0) << bitcnt; bitcnt += 8; }
      var v = bitbuf & ((1 << n) - 1);
      bitbuf >>>= n; bitcnt -= n;
      return v;
    }
    function buildHuff(lens) {
      var counts = new Array(16).fill(0), i;
      for (i = 0; i < lens.length; i++) counts[lens[i]]++;
      counts[0] = 0;
      var offs = new Array(17).fill(0);
      for (i = 1; i < 16; i++) offs[i + 1] = offs[i] + counts[i];
      var syms = new Array(lens.length).fill(0);
      for (i = 0; i < lens.length; i++) if (lens[i]) syms[offs[lens[i]]++] = i;
      return { counts: counts, symbols: syms };
    }
    function decode(h) {
      var code = 0, first = 0, index = 0;
      for (var len = 1; len <= 15; len++) {
        code |= bits(1);
        var c = h.counts[len];
        if (code - first < c) return h.symbols[index + (code - first)];
        index += c; first = (first + c) << 1; code <<= 1;
      }
      throw new Error('bad-huffman');
    }
    function fixedT() {
      var ll = new Array(288), i;
      for (i = 0; i < 144; i++) ll[i] = 8;
      for (i = 144; i < 256; i++) ll[i] = 9;
      for (i = 256; i < 280; i++) ll[i] = 7;
      for (i = 280; i < 288; i++) ll[i] = 8;
      return { lit: buildHuff(ll), dist: buildHuff(new Array(30).fill(5)) };
    }
    function dynT() {
      var hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4, i;
      var cl = new Array(19).fill(0);
      for (i = 0; i < hclen; i++) cl[CLCIDX[i]] = bits(3);
      var clH = buildHuff(cl), lens = [];
      while (lens.length < hlit + hdist) {
        var s = decode(clH);
        if (s < 16) lens.push(s);
        else if (s === 16) { var p = lens[lens.length - 1], r = 3 + bits(2); while (r--) lens.push(p); }
        else if (s === 17) { var r2 = 3 + bits(3); while (r2--) lens.push(0); }
        else { var r3 = 11 + bits(7); while (r3--) lens.push(0); }
      }
      return { lit: buildHuff(lens.slice(0, hlit)), dist: buildHuff(lens.slice(hlit)) };
    }
    var last = 0;
    do {
      last = bits(1);
      var type = bits(2);
      if (type === 0) {
        bitbuf = 0; bitcnt = 0;
        var len = data[pos] | (data[pos + 1] << 8);
        pos += 4;
        grow(len);
        out.set(data.subarray(pos, pos + len), olen);
        olen += len; pos += len;
      } else {
        var T = type === 1 ? fixedT() : dynT();
        for (;;) {
          var sym = decode(T.lit);
          if (sym < 256) { grow(1); out[olen++] = sym; }
          else if (sym === 256) break;
          else {
            var li = sym - 257;
            if (li < 0 || li >= LBASE.length) throw new Error('len-code');
            var l2 = LBASE[li] + bits(LEXT[li]);
            var di = decode(T.dist);
            var dist = DBASE[di] + bits(DEXT[di]);
            if (dist <= 0 || dist > olen) throw new Error('bad-dist');
            grow(l2);
            for (var q = 0; q < l2; q++) { out[olen] = out[olen - dist]; olen++; }
          }
        }
      }
    } while (!last);
    return out.subarray(0, olen);
  }
  function inflateAuto(u8) {
    /* zlib 头不一定是 0x78 —— 老 PDF（Distiller 3 / QuarkXPress）常用 4KB 窗口，
       CMF 可能是 0x48 等。判据应为「CM=8 且 (CMF<<8|FLG) % 31 === 0」。
       旧版只认 0x78，导致这类流整段解压失败。 */
    var skip = [];
    if (u8.length > 2 && (u8[0] & 0x0f) === 8 && (((u8[0] << 8) | u8[1]) % 31) === 0) {
      skip.push((u8[1] & 0x20) ? 6 : 2);        /* FLG.FDICT 时还有 4 字节字典 ID */
    }
    skip.push(0);
    for (var i = 0; i < skip.length; i++) {
      try {
        var r = inflateRawJS(u8.subarray(skip[i]));
        if (r && r.length) return r;
      } catch (e) { /* 试下一种偏移 */ }
    }
    return null;
  }

  /* ---------------- 其余流过滤器（v3 新增：过滤器链） ---------------- */
  function fASCII85(u8) {
    var out = [], i = 0, n = u8.length, t = [], c, v, k, q, b4;
    if (n > 1 && u8[0] === 0x3c && u8[1] === 0x7e) i = 2;      /* 跳过 <~ */
    for (; i < n; i++) {
      c = u8[i];
      if (c === 0x7e) break;                                    /* ~> */
      if (c === 0x7a && t.length === 0) { out.push(0, 0, 0, 0); continue; }
      if (c < 0x21 || c > 0x75) continue;
      t.push(c - 33);
      if (t.length === 5) {
        v = t[0] * 52200625 + t[1] * 614125 + t[2] * 7225 + t[3] * 85 + t[4];
        out.push(Math.floor(v / 16777216) & 255, Math.floor(v / 65536) & 255, Math.floor(v / 256) & 255, v % 256);
        t = [];
      }
    }
    if (t.length > 1) {
      k = t.length;
      while (t.length < 5) t.push(84);
      v = t[0] * 52200625 + t[1] * 614125 + t[2] * 7225 + t[3] * 85 + t[4];
      b4 = [Math.floor(v / 16777216) & 255, Math.floor(v / 65536) & 255, Math.floor(v / 256) & 255, v % 256];
      for (q = 0; q < k - 1; q++) out.push(b4[q]);
    }
    return new Uint8Array(out);
  }
  function fASCIIHex(u8) {
    var hex = '', i, c;
    for (i = 0; i < u8.length; i++) {
      c = u8[i];
      if (c === 0x3e) break;
      if ((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)) hex += String.fromCharCode(c);
    }
    return hexToBytes(hex);
  }
  function fRunLength(u8) {
    var out = [], i = 0, l, q, r, b;
    while (i < u8.length && out.length < MAX_OUT) {
      l = u8[i++];
      if (l === 128) break;
      if (l < 128) { for (q = 0; q <= l; q++) out.push(u8[i + q]); i += l + 1; }
      else { b = u8[i++]; for (r = 0; r < 257 - l; r++) out.push(b); }
    }
    return new Uint8Array(out);
  }
  function fLZW(u8) {
    var dict = [], out = [], i, code, prev = null, bitbuf = 0, bitcnt = 0, pos = 0, bits = 9;
    function reset() { dict = []; for (i = 0; i < 256; i++) dict.push([i]); dict.push(null); dict.push(null); }
    reset();
    function nextCode(nb) {
      while (bitcnt < nb) { if (pos >= u8.length) return -1; bitbuf = (bitbuf << 8) | u8[pos++]; bitcnt += 8; }
      bitcnt -= nb;
      return (bitbuf >>> bitcnt) & ((1 << nb) - 1);
    }
    for (;;) {
      if (out.length > MAX_OUT) break;
      code = nextCode(bits);
      if (code < 0 || code === 257) break;
      if (code === 256) { reset(); bits = 9; prev = null; continue; }
      var entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (prev) entry = prev.concat([prev[0]]);
      else break;
      for (i = 0; i < entry.length; i++) out.push(entry[i]);
      if (prev) dict.push(prev.concat([entry[0]]));
      prev = entry;
      if (dict.length + 1 >= (1 << bits) && bits < 12) bits++;
    }
    return new Uint8Array(out);
  }
  function unPredictor(u8, predictor, colors, bpc, columns) {
    if (predictor < 10) return u8;
    var bpp = Math.ceil(colors * bpc / 8), rowLen = Math.ceil(colors * bpc * columns / 8);
    if (rowLen <= 0) return u8;
    var rows = Math.floor(u8.length / (rowLen + 1)), out = new Uint8Array(rows * rowLen);
    var p = 0, prev = new Uint8Array(rowLen), r, q;
    for (r = 0; r < rows; r++) {
      var ft = u8[p++], row = u8.subarray(p, p + rowLen); p += rowLen;
      var cur = new Uint8Array(rowLen);
      for (q = 0; q < rowLen; q++) {
        var a = q >= bpp ? cur[q - bpp] : 0, b = prev[q], c = q >= bpp ? prev[q - bpp] : 0, x = row[q];
        if (ft === 0) cur[q] = x;
        else if (ft === 1) cur[q] = (x + a) & 255;
        else if (ft === 2) cur[q] = (x + b) & 255;
        else if (ft === 3) cur[q] = (x + ((a + b) >> 1)) & 255;
        else if (ft === 4) {
          var pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          cur[q] = (x + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c))) & 255;
        } else cur[q] = x;
      }
      out.set(cur, r * rowLen);
      prev = cur;
    }
    return out;
  }
  var IMAGE_FILTERS = { DCTDecode: 1, JPXDecode: 1, CCITTFaxDecode: 1, JBIG2Decode: 1 };
  /* 按 /Filter 声明的链依次解码；遇到图像类过滤器返回 null（调用方跳过） */
  function applyFilters(raw, dict) {
    var fs = [], arr = dict.match(/\/Filter\s*\[([^\]]*)\]/), one;
    if (arr) {
      (arr[1].match(/\/([A-Za-z0-9]+)/g) || []).forEach(function (x) { fs.push(x.slice(1)); });
    } else {
      one = dict.match(/\/Filter\s*\/([A-Za-z0-9]+)/);
      if (one) fs.push(one[1]);
    }
    if (!fs.length) return null;
    var cur = raw, i, f;
    for (i = 0; i < fs.length; i++) {
      f = fs[i];
      if (IMAGE_FILTERS[f]) return null;
      else if (f === 'ASCII85Decode' || f === 'A85') cur = fASCII85(cur);
      else if (f === 'ASCIIHexDecode' || f === 'AHx') cur = fASCIIHex(cur);
      else if (f === 'FlateDecode' || f === 'Fl') {
        var o = inflateAuto(cur);
        if (!o) return null;
        cur = o;
        var pm = dict.match(/\/Predictor\s+(\d+)/);
        if (pm && +pm[1] >= 10) {
          cur = unPredictor(cur, +pm[1],
            +((dict.match(/\/Colors\s+(\d+)/) || [0, 1])[1]),
            +((dict.match(/\/BitsPerComponent\s+(\d+)/) || [0, 8])[1]),
            +((dict.match(/\/Columns\s+(\d+)/) || [0, 1])[1]));
        }
      }
      else if (f === 'LZWDecode' || f === 'LZW') cur = fLZW(cur);
      else if (f === 'RunLengthDecode' || f === 'RL') cur = fRunLength(cur);
      else return null;
    }
    return latin1(cur);
  }

  /* ---------------- CMap ---------------- */
  function parseCMap(txt, map) {
    var m, re1 = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((m = re1.exec(txt))) {
      var re2 = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, m2;
      while ((m2 = re2.exec(m[1]))) map[parseInt(m2[1], 16)] = hexToStr(m2[2]);
    }
    var re3 = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((m = re3.exec(txt))) {
      var re4 = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g, m4;
      while ((m4 = re4.exec(m[1]))) {
        var lo = parseInt(m4[1], 16), hi = parseInt(m4[2], 16);
        if (hi < lo || hi - lo > 4096) continue;
        if (m4[3]) {
          var st = parseInt(m4[3], 16);
          for (var c = lo; c <= hi; c++) map[c] = String.fromCharCode(st + (c - lo));
        } else if (m4[4]) {
          var items = m4[4].match(/<([0-9A-Fa-f]+)>/g) || [];
          items.forEach(function (it, i) { map[lo + i] = hexToStr(it.replace(/[<>]/g, '')); });
        }
      }
    }
    return map;
  }

  /* ---------------- 字形名 → Unicode（无 ToUnicode 时靠它） ---------------- */
  var GLYPH = (function () {
    var g = {}, i;
    for (i = 0; i < 26; i++) {
      g[String.fromCharCode(65 + i)] = String.fromCharCode(65 + i);
      g[String.fromCharCode(97 + i)] = String.fromCharCode(97 + i);
    }
    var numNames = ['zero','one','two','three','four','five','six','seven','eight','nine'];
    for (i = 0; i < 10; i++) g[numNames[i]] = String(i);
    var pairs = [
      "space= ", "exclam=!", "quotedbl=\"", "numbersign=#", "dollar=$", "percent=%",
      "ampersand=&", "quotesingle='", "parenleft=(", "parenright=)", "asterisk=*", "plus=+",
      "comma=,", "hyphen=-", "period=.", "slash=/", "colon=:", "semicolon=;", "less=<",
      "equal==", "greater=>", "question=?", "at=@", "bracketleft=[", "backslash=\\",
      "bracketright=]", "asciicircum=^", "underscore=_", "grave=`", "braceleft={",
      "bar=|", "braceright=}", "asciitilde=~",
      "quoteleft=\u2018", "quoteright=\u2019", "quotedblleft=\u201c", "quotedblright=\u201d",
      "quotesinglbase=\u201a", "quotedblbase=\u201e", "guilsinglleft=\u2039", "guilsinglright=\u203a",
      "guillemotleft=\u00ab", "guillemotright=\u00bb", "endash=\u2013", "emdash=\u2014",
      "ellipsis=\u2026", "bullet=\u2022", "dagger=\u2020", "daggerdbl=\u2021",
      "periodcentered=\u00b7", "perthousand=\u2030", "trademark=\u2122", "copyright=\u00a9",
      "registered=\u00ae", "degree=\u00b0", "section=\u00a7", "paragraph=\u00b6",
      "germandbls=\u00df", "florin=\u0192", "fraction=\u2044", "Euro=\u20ac", "apple=\uf8ff",
      "exclamdown=\u00a1", "questiondown=\u00bf", "cent=\u00a2", "sterling=\u00a3",
      "yen=\u00a5", "currency=\u00a4", "brokenbar=\u00a6", "dieresis=\u00a8", "acute=\u00b4",
      "cedilla=\u00b8", "macron=\u00af", "plusminus=\u00b1", "mu=\u00b5", "multiply=\u00d7",
      "divide=\u00f7", "onesuperior=\u00b9", "twosuperior=\u00b2", "threesuperior=\u00b3",
      "onequarter=\u00bc", "onehalf=\u00bd", "threequarters=\u00be", "ordfeminine=\u00aa",
      "ordmasculine=\u00ba", "logicalnot=\u00ac", "AE=\u00c6", "ae=\u00e6", "Oslash=\u00d8",
      "oslash=\u00f8", "Thorn=\u00de", "thorn=\u00fe", "Eth=\u00d0", "eth=\u00f0",
      "infinity=\u221e", "notequal=\u2260", "lessequal=\u2264", "greaterequal=\u2265",
      "partialdiff=\u2202", "summation=\u2211", "product=\u220f", "pi=\u03c0",
      "integral=\u222b", "radical=\u221a", "approxequal=\u2248", "Delta=\u2206",
      "Omega=\u03a9", "lozenge=\u25ca", "element=\u2208", "notelement=\u2209",
      "congruent=\u2245", "dotlessi=\u0131", "circumflex=\u02c6", "tilde=\u02dc",
      "breve=\u02d8", "dotaccent=\u02d9", "ring=\u02da", "hungarumlaut=\u02dd",
      "ogonek=\u02db", "caron=\u02c7",
      "Aacute=\u00c1", "Acircumflex=\u00c2", "Adieresis=\u00c4", "Agrave=\u00c0",
      "Aring=\u00c5", "Atilde=\u00c3", "Ccedilla=\u00c7", "Eacute=\u00c9",
      "Ecircumflex=\u00ca", "Edieresis=\u00cb", "Egrave=\u00c8", "Iacute=\u00cd",
      "Icircumflex=\u00ce", "Idieresis=\u00cf", "Igrave=\u00cc", "Ntilde=\u00d1",
      "Oacute=\u00d3", "Ocircumflex=\u00d4", "Odieresis=\u00d6", "Ograve=\u00d2",
      "Otilde=\u00d5", "Uacute=\u00da", "Ucircumflex=\u00db", "Udieresis=\u00dc",
      "Ugrave=\u00d9", "Yacute=\u00dd", "Ydieresis=\u0178",
      "aacute=\u00e1", "acircumflex=\u00e2", "adieresis=\u00e4", "agrave=\u00e0",
      "aring=\u00e5", "atilde=\u00e3", "ccedilla=\u00e7", "eacute=\u00e9",
      "ecircumflex=\u00ea", "edieresis=\u00eb", "egrave=\u00e8", "iacute=\u00ed",
      "icircumflex=\u00ee", "idieresis=\u00ef", "igrave=\u00ec", "ntilde=\u00f1",
      "oacute=\u00f3", "ocircumflex=\u00f4", "odieresis=\u00f6", "ograve=\u00f2",
      "otilde=\u00f5", "uacute=\u00fa", "ucircumflex=\u00fb", "udieresis=\u00fc",
      "ugrave=\u00f9", "yacute=\u00fd", "ydieresis=\u00ff",
      "OE=\u0152", "oe=\u0153", "Scaron=\u0160", "scaron=\u0161", "Zcaron=\u017d",
      "zcaron=\u017e", "Lslash=\u0141", "lslash=\u0142", "Sacute=\u015a", "sacute=\u015b",
      "Zacute=\u0179", "zacute=\u017a", "Zdotaccent=\u017b", "zdotaccent=\u017c",
      "Aogonek=\u0104", "aogonek=\u0105", "Eogonek=\u0118", "eogonek=\u0119",
      "Cacute=\u0106", "cacute=\u0107", "Nacute=\u0143", "nacute=\u0144",
      "Scedilla=\u015e", "scedilla=\u015f", "Abreve=\u0102", "abreve=\u0103",
      "Lcaron=\u013d", "lcaron=\u013e", "Racute=\u0154", "racute=\u0155",
      "Rcaron=\u0158", "rcaron=\u0159", "Tcommaaccent=\u0162", "tcommaaccent=\u0163",
      "Uring=\u016e", "uring=\u016f", "Amacron=\u0100", "amacron=\u0101",
      "Emacron=\u0112", "emacron=\u0113", "Imacron=\u012a", "imacron=\u012b",
      "Omacron=\u014c", "omacron=\u014d", "Umacron=\u016a", "umacron=\u016b",
      "fi=\ufb01", "fl=\ufb02", "ff=\ufb00", "ffi=\ufb03", "ffl=\ufb04"
    ];
    pairs.forEach(function (p) {
      var i2 = p.indexOf('=');
      g[p.slice(0, i2)] = p.slice(i2 + 1);
    });
    return g;
  })();

  /* StandardEncoding 的 161~255 段（差异部分） */
  var STD_HIGH = (function () {
    var m = {}, t = '161=exclamdown;162=cent;163=sterling;164=fraction;165=yen;166=florin;' +
      '167=section;168=currency;169=quotesingle;170=quotedblleft;171=guillemotleft;' +
      '172=guilsinglleft;173=guilsinglright;174=fi;175=fl;177=endash;178=dagger;' +
      '179=daggerdbl;180=periodcentered;182=paragraph;183=bullet;184=quotesinglbase;' +
      '185=quotedblbase;186=quotedblright;187=guillemotright;188=ellipsis;189=perthousand;' +
      '191=questiondown;193=grave;194=acute;195=circumflex;196=tilde;197=macron;198=breve;' +
      '199=dotaccent;200=dieresis;202=ring;203=cedilla;205=hungarumlaut;206=ogonek;207=caron;' +
      '208=emdash;225=AE;227=ordfeminine;232=Lslash;233=Oslash;234=OE;235=ordmasculine;' +
      '241=ae;245=dotlessi;248=lslash;249=oslash;250=oe;251=germandbls';
    t.split(';').forEach(function (p) {
      var i = p.indexOf('=');
      m[+p.slice(0, i)] = GLYPH[p.slice(i + 1)] || '';
    });
    return m;
  })();

  /* 0x80~0x9F：Windows-1252 与 Latin-1 的差异区（32 项） */
  var WIN_HIGH = '\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039' +
    '\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122' +
    '\u0161\u203a\u0153\u009d\u017e\u0178';
  /* 0x80~0xFF：MacRoman 高半区（128 项） */
  var MAC_HIGH = '\u00c4\u00c5\u00c7\u00c9\u00d1\u00d6\u00dc\u00e1\u00e0\u00e2\u00e4\u00e3' +
    '\u00e5\u00e7\u00e9\u00e8\u00ea\u00eb\u00ed\u00ec\u00ee\u00ef\u00f1\u00f3\u00f2\u00f4' +
    '\u00f6\u00f5\u00fa\u00f9\u00fb\u00fc\u2020\u00b0\u00a2\u00a3\u00a7\u2022\u00b6\u00df' +
    '\u00ae\u00a9\u2122\u00b4\u00a8\u2260\u00c6\u00d8\u221e\u00b1\u2264\u2265\u00a5\u00b5' +
    '\u2202\u2211\u220f\u03c0\u222b\u00aa\u00ba\u03a9\u00e6\u00f8\u00bf\u00a1\u00ac\u221a' +
    '\u0192\u2248\u2206\u00ab\u00bb\u2026\u00a0\u00c0\u00c3\u00d5\u0152\u0153\u2013\u2014' +
    '\u201c\u201d\u2018\u2019\u00f7\u25ca\u00ff\u0178\u2044\u20ac\u2039\u203a\ufb01\ufb02' +
    '\u2021\u00b7\u201a\u201e\u2030\u00c2\u00ca\u00c1\u00cb\u00c8\u00cd\u00ce\u00cf\u00cc' +
    '\u00d3\u00d4\uf8ff\u00d2\u00da\u00db\u00d9\u0131\u02c6\u02dc\u00af\u02d8\u02d9\u02da' +
    '\u00b8\u02dd\u02db\u02c7';

  /* 为一个字体构造 256 项编码表；无法确定时返回 null */
  function buildEncArray(fdict, objs) {
    var spec = fdict.match(/\/Encoding\s*(\/[A-Za-z0-9]+|\d+\s+\d+\s+R)/);
    if (!spec) return null;
    var base = null, diffs = null;
    if (spec[1].charAt(0) === '/') {
      base = spec[1].slice(1);
      if (base.indexOf('Identity') === 0) return null;          /* Type0：走双字节路径 */
    } else {
      var on = parseInt(spec[1], 10), od = objs[on] && objs[on].dict;
      if (!od) return null;
      var bn = od.match(/\/BaseEncoding\s*\/([A-Za-z0-9]+)/);
      base = bn ? bn[1] : 'StandardEncoding';
      var dm = od.match(/\/Differences\s*\[([\s\S]{0,12000}?)\]/);
      if (dm) diffs = dm[1];
    }
    var enc = new Array(256), i;
    for (i = 0; i < 256; i++) {
      if (base === 'MacRomanEncoding' && i >= 128) enc[i] = MAC_HIGH.charAt(i - 128) || '';
      else if (base === 'WinAnsiEncoding' && i >= 128 && i < 160) enc[i] = WIN_HIGH.charAt(i - 128) || '';
      else enc[i] = String.fromCharCode(i);
    }
    if (base === 'StandardEncoding') {
      enc[39] = GLYPH.quoteright !== undefined ? GLYPH.quoteright : "'";
      enc[96] = GLYPH.quoteleft !== undefined ? GLYPH.quoteleft : '`';
      Object.keys(STD_HIGH).forEach(function (k) { enc[+k] = STD_HIGH[k]; });
    }
    if (diffs) {
      var toks = diffs.match(/\/[A-Za-z0-9._]+|\d+/g) || [], code = 0;
      toks.forEach(function (t) {
        if (t.charAt(0) === '/') {
          var nm = t.slice(1);
          if (code < 256) enc[code] = GLYPH[nm] !== undefined ? GLYPH[nm] : '';
          code++;
        } else code = parseInt(t, 10);
      });
    }
    return enc;
  }

  /* ---------------- 解码'可读度'评分（用于无 CMap 时的兜底） ---------------- */
  function readability(s) {
    if (!s) return -1;
    var good = 0, bad = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x4e00 && c <= 0x9fff) good += 2;
      else if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) good += 1;
      else if (c === 32 || c === 10 || c === 13 || c === 9) good += 0.6;
      else if (c >= 0x2000 && c <= 0x206f) good += 1;
      else if (c < 32 || (c >= 0xe000 && c <= 0xf8ff)) bad += 2;
      else bad += 0.35;
    }
    return good - bad * 2;
  }
  function decodeWith(bytes, font) {
    var map = font && font.map, two = font && font.two, enc = font && font.enc;
    var a = '', b = '', i;
    if (map && Object.keys(map).length) {
      for (i = 0; i + 1 < bytes.length; i += 2) {
        var code = (bytes[i] << 8) | bytes[i + 1];
        a += map[code] !== undefined ? map[code] : '';
      }
      for (i = 0; i < bytes.length; i++) b += map[bytes[i]] !== undefined ? map[bytes[i]] : String.fromCharCode(bytes[i]);
      if (two) return readability(b) > readability(a) ? b : a;
      return readability(a) > readability(b) ? a : b;
    }
    /* v3：无 ToUnicode 但有 /Encoding 表 —— 老期刊 PDF 的主力路径 */
    if (enc) {
      var s = '';
      for (i = 0; i < bytes.length; i++) s += enc[bytes[i]] !== undefined ? enc[bytes[i]] : '';
      return s;
    }
    /* 无任何编码信息：若字节全在可打印 ASCII 区间，按单字节解 */
    var allAscii = bytes.length > 0;
    for (i = 0; i < bytes.length; i++) {
      if (bytes[i] < 32 || bytes[i] > 126) { allAscii = false; break; }
    }
    if (allAscii) {
      var as = '';
      for (i = 0; i < bytes.length; i++) as += String.fromCharCode(bytes[i]);
      return as;
    }
    var u16 = '', ok = bytes.length >= 2 && bytes.length % 2 === 0;
    if (ok) {
      for (i = 0; i + 1 < bytes.length; i += 2) {
        var cp = (bytes[i] << 8) | bytes[i + 1];
        if (cp === 0 || (cp < 32 && cp !== 10 && cp !== 13 && cp !== 9)) { ok = false; break; }
        u16 += String.fromCharCode(cp);
      }
    }
    var l1 = '';
    for (i = 0; i < bytes.length; i++) if (bytes[i] >= 32 || bytes[i] === 10) l1 += String.fromCharCode(bytes[i]);
    if (ok && readability(u16) > readability(l1)) return u16;
    return l1;
  }

  /* ---------------- 内容流文本还原 ---------------- */
  function walk(content, fonts, nameMap) {
    var out = [], i = 0, n = content.length, lastY = null, curFont = null, curSize = 12;
    function fontOf() { return fonts[nameMap[curFont]] || null; }
    while (i < n) {
      var ch = content[i];
      if (ch === '/') {
        var mm = content.substr(i).match(/^\/([A-Za-z0-9#+.\-]+)\s+([\d.]+)\s+Tf/);
        if (mm) { curFont = mm[1]; curSize = parseFloat(mm[2]) || 12; i += mm[0].length; continue; }
      }
      if (ch === '(') {
        var depth = 1, j = i + 1, buf = '';
        while (j < n && depth > 0) {
          var c = content[j];
          if (c === '\\') { buf += content.substr(j, 2); j += 2; continue; }
          if (c === '(') depth++;
          else if (c === ')') { depth--; if (!depth) break; }
          buf += c; j++;
        }
        var after = content.substr(j + 1, 8);
        var inArray = false;
        var lb = content.lastIndexOf('[', i), rb = content.lastIndexOf(']', i);
        if (lb > rb) { var fwd = content.indexOf(']', j); if (fwd > 0 && /^\s*TJ/.test(content.substr(fwd + 1, 6))) inArray = true; }
        if (/^\s*Tj/.test(after) || /^\s*'/.test(after) || /^\s*"/.test(after) || inArray) {
          var raw = unescapePdf(buf);
          var bytes = new Uint8Array(raw.length);
          for (var q = 0; q < raw.length; q++) bytes[q] = raw.charCodeAt(q) & 0xff;
          out.push(decodeWith(bytes, fontOf()));
        }
        i = j + 1; continue;
      }
      if (ch === '<' && content[i + 1] !== '<') {
        var k = content.indexOf('>', i);
        if (k < 0) break;
        var hx = content.substr(i + 1, k - i - 1);
        if (/^[0-9A-Fa-f\s]+$/.test(hx)) out.push(decodeWith(hexToBytes(hx), fontOf()));
        i = k + 1; continue;
      }
      if (ch === 'T' && content[i + 1] === 'd') {
        var back = content.substr(Math.max(0, i - 40), 40);
        var md = back.match(/([-−]?[\d.]+)\s+([-−]?[\d.]+)\s*$/);
        if (md) {
          var y = parseFloat(md[1].replace('−', '-'));
          if (lastY !== null && Math.abs(y - lastY) > curSize * 0.55) out.push('\n');
          lastY = y;
        }
        i += 2; continue;
      }
      if (ch === 'T' && content[i + 1] === '*') { out.push('\n'); i += 2; continue; }
      if (ch === 'E' && content[i + 1] === 'T') { out.push('\n'); i += 2; continue; }
      i++;
    }
    return out.join('');
  }

  /* ---------------- 主入口 ---------------- */
  function extract(buf) {
    var u8 = new Uint8Array(buf);
    var S = latin1(u8);

    /* 1) 逐个 obj 切片（用 indexOf 定位，避免正则回溯与 $ 边界问题） */
    var objs = {}, re = /(\d+)\s+(\d+)\s+obj\b/g, m, starts = [];
    while ((m = re.exec(S))) starts.push({ num: +m[1], at: m.index, dhead: re.lastIndex });
    starts.forEach(function (o, i) {
      var endObj = S.indexOf('endobj', o.dhead);
      var body = S.slice(o.dhead, endObj < 0 ? (starts[i + 1] ? starts[i + 1].at : S.length) : endObj);
      var sIdx = body.indexOf('stream');
      var dict = sIdx >= 0 ? body.slice(0, sIdx) : body;
      objs[o.num] = { dict: dict, raw: null, text: null, num: o.num };
      if (sIdx >= 0) {
        var st = o.dhead + sIdx + 6;
        if (S[st] === '\r') st++;
        if (S[st] === '\n') st++;
        var en = S.indexOf('endstream', st);
        if (en < 0) en = o.dhead + body.length;
        var raw = u8.subarray(st, en);
        while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) raw = raw.subarray(0, raw.length - 1);
        objs[o.num].raw = raw;
      }
    });
    Object.keys(objs).forEach(function (k) {
      var o = objs[k];
      if (o.raw && o.raw.length > 6 * 1024 * 1024) o.raw = null;
    });

    /* 2) 解压所有流：按 /Filter 链解码（ASCII85/Flate/LZW/RL/AHx） */
    function decodeStream(o) {
      if (!o || !o.raw) return null;
      var out = applyFilters(o.raw, o.dict || '');
      if (out === null) {
        var o2 = inflateAuto(o.raw);
        out = o2 ? latin1(o2) : latin1(o.raw);
      }
      return out;
    }
    Object.keys(objs).forEach(function (k) {
      var o = objs[k];
      if (!o.raw) return;
      if (/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)/.test(o.dict)) return;
      if (/\/Subtype\s*\/Image/.test(o.dict)) return;
      o.text = decodeStream(o);
    });

    /* 3) 字体表：资源名 → 字体记录（ToUnicode 优先，其次 /Encoding 表） */
    var fonts = {}, fontObjNum = {};
    Object.keys(objs).forEach(function (k) {
      var d = objs[k].dict || '';
      if (!/\/Type\s*\/Font/.test(d) &&
          !/\/Subtype\s*\/(Type0|TrueType|Type1|Type3|CIDFontType0|CIDFontType2)(?![A-Za-z0-9])/.test(d)) return;
      if (/\/Subtype\s*\/(CIDFontType0|CIDFontType2)/.test(d)) return;   /* 子字体本身不作为资源名 */
      var tu = d.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
      var two = /\/Subtype\s*\/Type0/.test(d) || /\/Encoding\s*\/Identity-[HV]/.test(d);
      var rec = {
        tu: tu ? +tu[1] : null, two: two, map: null, enc: null,
        base: (d.match(/\/BaseFont\s*\/([A-Za-z0-9+,\-]+)/) || [])[1] || ''
      };
      if (!two) rec.enc = buildEncArray(d, objs);
      fontObjNum[k] = rec;
    });
    Object.keys(fontObjNum).forEach(function (k) {
      var f = fontObjNum[k];
      if (!f.tu || !objs[f.tu]) return;
      var target = objs[f.tu];
      if (!target.text) target.text = decodeStream(target);
      if (!target.text) return;
      f.map = parseCMap(target.text, {});
    });
    var nameMap = {}, reFont = /\/Font\s*<<([\s\S]{0,3000}?)>>/g, mf;
    while ((mf = reFont.exec(S))) {
      var rePair = /\/([A-Za-z0-9#+.\-]+)\s+(\d+)\s+\d+\s+R/g, mp;
      while ((mp = rePair.exec(mf[1]))) if (!nameMap[mp[1]]) nameMap[mp[1]] = +mp[2];
    }
    Object.keys(nameMap).forEach(function (nm) { fonts[nameMap[nm]] = fontObjNum[nameMap[nm]] || null; });

    function contentOf(num) {
      var o = objs[num];
      if (!o || !o.text || o.text.length < 8) return '';
      if (o.text.indexOf('BT') < 0) return '';
      if (o.text.indexOf('Tj') < 0 && o.text.indexOf('TJ') < 0 && o.text.indexOf("'") < 0) return '';
      return walk(o.text, fonts, nameMap);
    }

    /* 4) 阅读顺序：优先 页面树 Kids → Page → /Contents 顺序 */
    var pageOrder = [];
    (function () {
      var pages = [], k;
      Object.keys(objs).forEach(function (n) {
        var d = objs[n].dict || '';
        if (/\/Type\s*\/Pages/.test(d)) pages.push(+n);
      });
      var root = null;
      pages.forEach(function (n) { if (!/\/Parent\s+\d+\s+\d+\s+R/.test(objs[n].dict)) root = n; });
      if (root === null && pages.length) root = pages[0];
      var seen = {};
      function walkKids(n, depth) {
        if (depth > 24 || seen[n] || !objs[n]) return;
        seen[n] = 1;
        var d = objs[n].dict || '';
        if (/\/Type\s*\/Page(?![s])/.test(d)) { pageOrder.push(n); return; }
        var km = d.match(/\/Kids\s*\[([\s\S]{0,6000}?)\]/);
        if (!km) return;
        (km[1].match(/(\d+)\s+\d+\s+R/g) || []).forEach(function (r) { walkKids(+r.match(/\d+/)[0], depth + 1); });
      }
      if (root !== null) walkKids(root, 0);
      if (pageOrder.length < 2) {
        pageOrder = [];
        Object.keys(objs).forEach(function (n) {
          var d = objs[n].dict || '';
          if (/\/Type\s*\/Page(?![s])/.test(d)) pageOrder.push(+n);
        });
        pageOrder.sort(function (a, b) { return a - b; });
      }
    })();

    var ordered = [];
    pageOrder.forEach(function (pn) {
      var d = objs[pn] ? (objs[pn].dict || '') : '';
      var refs = [];
      var ca = d.match(/\/Contents\s*\[([\s\S]{0,4000}?)\]/);
      if (ca) (ca[1].match(/(\d+)\s+\d+\s+R/g) || []).forEach(function (r) { refs.push(+(r.match(/\d+/) || [0])[0]); });
      else {
        var c1 = d.match(/\/Contents\s+(\d+)\s+\d+\s+R/);
        if (c1) refs.push(+c1[1]);
      }
      var localSeen = {};
      refs.forEach(function (r) {
        if (localSeen[r]) return;           /* 同一页重复引用同一流：去重 */
        localSeen[r] = 1;
        var t = contentOf(r);
        if (t && t.replace(/\s/g, '').length > 4) ordered.push(t);
      });
    });

    var text;
    if (ordered.join('').replace(/\s/g, '').length >= 240) {
      text = ordered.join('\n');
    } else {
      /* 兜底：按"散文度 × 长度"排序（正文流通常远长于图注/页眉流） */
      var pieces = [];
      Object.keys(objs).forEach(function (k) {
        var t = objs[k].text;
        if (!t || t.length < 12 || t.length > 8 * 1024 * 1024) return;
        var one = contentOf(+k);
        if (!one || one.replace(/\s/g, '').length < 10) return;
        var words = (one.match(/[A-Za-z][a-z]{2,}/g) || []).length;
        var stops = (one.match(/[.,;:]\s/g) || []).length;
        var prose = (words + stops * 2) / Math.max(1, one.length / 100);
        pieces.push({ txt: one, len: one.length, score: prose + Math.log(one.length + 1) / 3 });
      });
      pieces.sort(function (a, b) { return b.score - a.score; });
      text = pieces.map(function (x) { return x.txt; }).join('\n');
    }

    text = text.replace(/\u0000/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    text = text.split('\n').filter(function (l) {
      var s2 = l.trim();
      if (!s2) return true;
      return /[\u4e00-\u9fa5A-Za-z0-9]/.test(s2);
    }).join('\n');
    return Promise.resolve(text);
  }

  function fromFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        extract(fr.result).then(function (text) {
          var n = (text || '').replace(/\s/g, '').length;
          if (n < 200) {
            reject(new Error('只提取到 ' + n + ' 个有效字符。可能原因：① 扫描件/图片型 PDF（无文字层）；② 字体无编码表也未嵌入 ToUnicode 映射；③ 加密文档。\n建议：用 Word 打开后复制正文，或在环节 01 用「粘贴正文」。'));
          } else resolve(text);
        }).catch(function (e) { reject(new Error('解析失败：' + (e && e.message ? e.message : e))); });
      };
      fr.onerror = function () { reject(new Error('文件读取失败')); };
      fr.readAsArrayBuffer(file);
    });
  }

  return { fromFile: fromFile, extract: extract, _dbg: { fASCII85: fASCII85, applyFilters: applyFilters, inflateAuto: inflateAuto, latin1: latin1 } };
})();
