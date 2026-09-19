# ---------- 1) pdftext.js：内容流按"正文优先"排序 ----------
P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
p = open(P, encoding='utf-8').read()

old = """    /* 4) 还原文本 */
    var pieces = [];
    Object.keys(objs).forEach(function (k) {
      var t = objs[k].text;
      if (!t || t.length < 12 || t.length > 8 * 1024 * 1024) return;
      if (t.indexOf('BT') < 0) return;
      if (t.indexOf('Tj') < 0 && t.indexOf('TJ') < 0 && t.indexOf("'") < 0) return;
      pieces.push(walk(t, fonts, nameMap));
    });

    var text = pieces.join('\\n')"""
new = """    /* 4) 还原文本。
       PDF 的对象在文件里的顺序与阅读顺序无关（正文、图注、参考文献、页眉常交错），
       因此先按"散文度 × 长度"排序再拼接：正文流通常远长于图注/页眉流。 */
    var pieces = [];
    Object.keys(objs).forEach(function (k) {
      var t = objs[k].text;
      if (!t || t.length < 12 || t.length > 8 * 1024 * 1024) return;
      if (t.indexOf('BT') < 0) return;
      if (t.indexOf('Tj') < 0 && t.indexOf('TJ') < 0 && t.indexOf("'") < 0) return;
      var one = walk(t, fonts, nameMap);
      if (!one || one.replace(/\\s/g, '').length < 10) return;
      /* 散文度：小写词与句末标点的密度，用来区分正文与图注/表格/参考文献碎片 */
      var words = (one.match(/[A-Za-z][a-z]{2,}/g) || []).length;
      var stops = (one.match(/[.,;:]\\s/g) || []).length;
      var prose = (words + stops * 2) / Math.max(1, one.length / 100);
      pieces.push({ txt: one, len: one.length, score: prose + Math.log(one.length + 1) / 3 });
    });
    pieces.sort(function (a, b) { return b.score - a.score; });

    var text = pieces.map(function (x) { return x.txt; }).join('\\n')"""
assert old in p, 'order anchor'
p = p.replace(old, new)
open(P, 'w', encoding='utf-8').write(p)
print('pdftext.js: prose-first ordering')

# ---------- 2) extract.js：标题排除图注/表注 + 短英文缩写用词边界 ----------
E = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\extract.js'
s = open(E, encoding='utf-8').read()

old2 = """      var skipRe = /^(nature|science|cell|the\\s+lancet|jama|advanced|journal|proceedings|volume|vol\\.|issue|www\\.|https?:|doi|received|accepted|published|correspondence|review article|article|editorial)/i;"""
new2 = """      var skipRe = /^(nature|science|cell|the\\s+lancet|jama|advanced|journal|proceedings|volume|vol\\.|issue|www\\.|https?:|doi|received|accepted|published|correspondence|review article|article|editorial|fig(?:ure)?\\.?\\s*\\d|table\\s*\\d|box\\s*\\d|scheme\\s*\\d|supplementary|author|editor)/i;"""
assert old2 in s, 'skipRe anchor'
s = s.replace(old2, new2)

# 含 " | " 的行是图注（Fig. 4 | …），排除
old3 = """        if (/[@\\d]{3,}/.test(l)) return;"""
new3 = """        if (/[@\\d]{3,}/.test(l)) return;
        if (l.indexOf('|') >= 0) return;                       /* 图注/表注的竖线分隔 */
        if (l.split(/\\s+/).filter(function (w) { return w.length > 2; }).length < 5) return;"""
assert old3 in s, 'title filter anchor'
s = s.replace(old3, new3)

# 英文短缩写（SEM/XRD…）用词边界匹配，避免命中人名的子串
old4 = """      var low0 = l.toLowerCase();
      var hitLex = LEXI.some(function (t) { return t.length > 3 ? low0.indexOf(t.toLowerCase()) >= 0 : l.indexOf(t) >= 0; });"""
new4 = """      var low0 = l.toLowerCase();
      var hitLex = LEXI.some(function (t) {
        if (t.length > 3) return low0.indexOf(t.toLowerCase()) >= 0;
        return new RegExp('(^|[^A-Za-z])' + t + '([^A-Za-z]|$)').test(l);   /* 短缩写必须整词命中 */
      });"""
assert old4 in s, 'instrument token anchor'
s = s.replace(old4, new4)

# 仪器名不能是纯人名的行
old5 = """      var hitHeur = SUF.test(nameOnly) && nameOnly.length >= 3 && nameOnly.length <= 26;"""
new5 = """      var hitHeur = SUF.test(nameOnly) && nameOnly.length >= 3 && nameOnly.length <= 26;
      /* 英文行：必须含"设备/公司"线索，避免把 et al. 的人名当仪器 */
      var enName = /^[A-Z][A-Za-z\\-]+$/.test(nameOnly);
      if (enName && !/(instrument|analyser|analyzer|meter|microscope|spectro|chromatograph|tester|system|machine|device|kit|sensor|probe|reader|station|apparatus|setup|workstation|pump|furnace|oven|printer|coater|spinner|mill|centrifuge|balance|electrode|potentiostat|software)/i.test(l)) return;"""
assert old5 in s, 'instrument en guard'
s = s.replace(old5, new5)
open(E, 'w', encoding='utf-8').write(s)
print('extract.js: title/token guards')

# ---------- 3) domain.js：新增「传感与分析性能」族，并把传感类指标移出「生物与安全」 ----------
D = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\domain.js'
d = open(D, encoding='utf-8').read()

old6 = """    { k: '生物与安全', color: '--c4', words: ['抑菌率', '抗菌率', '杀菌率', '抑菌圈', '生物膜抑制率', '细胞存活率', '细胞毒性', '溶血率', '生物相容性', '降解率', '降解速率', '药物释放率', '释放曲线', '载药量', '包封率', '内皮化', '凝血时间'] },"""
new6 = """    { k: '生物与安全', color: '--c4', words: ['抑菌率', '抗菌率', '杀菌率', '抑菌圈', '生物膜抑制率', '细胞存活率', '细胞毒性', '溶血率', '生物相容性', '降解率', '降解速率', '药物释放率', '释放曲线', '载药量', '包封率', '内皮化', '凝血时间'] },
    { k: '传感与分析性能', color: '--c2', words: ['灵敏度', '检出限', '检测限', '线性范围', '选择性', '特异性', '响应时间', '恢复时间', '准确度', '精密度', '重复性', '再现性', '稳定性', '回收率', '信噪比', '基线漂移', '校准曲线', '交叉敏感性', '抗干扰性', '连续监测时长'],
      en: ['sensitivity', 'limit of detection', 'detection limit', 'lod', 'loq', 'linear range', 'linearity', 'selectivity', 'specificity', 'response time', 'recovery time', 'accuracy', 'precision', 'repeatability', 'reproducibility', 'stability', 'long-term stability', 'recovery', 'signal-to-noise ratio', 'snr', 'baseline drift', 'calibration curve', 'cross-sensitivity', 'anti-interference', 'wear time', 'shelf life'] },"""
assert old6 in d, 'sensor family anchor'
d = d.replace(old6, new6)

# 从「生物与安全」英语表里移除传感类（避免抢到别的族）
old7 = ",'sensitivity','limit of detection','detection limit','LOD','linear range','selectivity','specificity','response time','recovery','accuracy','precision','repeatability','reproducibility','stability','shelf life','signal-to-noise ratio','sensitivity'"
if old7 in d:
    d = d.replace(old7, '')
    print('removed sensor terms from bio family')
else:
    print('note: sensor terms not found verbatim in bio family')
open(D, 'w', encoding='utf-8').write(d)
print('domain.js: sensor family added')
