import json, re, io, os

OUT = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\papers.js'
SRC = r'D:\learnbuddy内容\2026-09-17-01-28-37\_dev\src'
BASE = r'E:/生物材料文献（假期）/抗菌纺织A/抗菌纺织A'

papers = []

# 1) 用户上传的本科毕业论文（全文）
t = open(os.path.join(SRC, 'thesis.txt'), encoding='utf-8').read()
papers.append({
    'id': 'P1',
    'label': '用户上传 · 本科毕业论文',
    'name': '本科毕业论文-朱渺渺3215906059（毕业答辩版打印版）20250524.docx',
    'kind': '学位论文',
    'text': t
})

# 2) 两篇有文字层的 Nature / Trends 文献（截取摘要+方法+结论，控制体积）
def clip(path, head=14000):
    d = ''
    try:
        import pymupdf
        doc = pymupdf.open(path)
        for pg in doc:
            d += pg.get_text()
    except Exception as e:
        return ''
    d = re.sub(r'[ \t]+', ' ', d)
    d = re.sub(r'\n{2,}', '\n', d)
    return d[:head]

f2 = clip(os.path.join(BASE, '2000Nature——Oxidants, oxidative stress and the biology of ageing.pdf'), 13000)
if f2:
    papers.append({'id': 'P2', 'label': '内置验证案例', 'name': '2000Nature——Oxidants, oxidative stress and the biology of ageing.pdf', 'kind': '综述', 'text': f2})
f3 = clip(os.path.join(BASE, '2001Trends Microbiol——Mechanisms of biofilm resistance to antimicrobial agents.pdf'), 11000)
if f3:
    papers.append({'id': 'P3', 'label': '内置验证案例', 'name': '2001Trends Microbiol——Mechanisms of biofilm resistance to antimicrobial agents.pdf', 'kind': '综述', 'text': f3})

# 3) 1954 扫描件：无文字层，用于演示"抽取失败"的诚实路径
papers.append({'id': 'P4', 'label': '内置验证案例（扫描件）', 'name': '1954Nature——Structure of cotton Alpha-cellulose.pdf', 'kind': '研究论文（Letter）· 扫描件', 'text': ''})


def js_str(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n')


buf = io.StringIO()
buf.write('/* LATTICE · 内置论文全文（用于在无网络/无上传时驱动抽取引擎）\n')
buf.write('   P1 = 用户上传的本科毕业论文全文；P2/P3 = 有文字层的验证案例全文；\n')
buf.write('   P4 = 1954 年扫描件（无文字层），用于演示抽取失败时的诚实提示。 */\n')
buf.write('window.MR_PAPERS = [\n')
for i, p in enumerate(papers):
    buf.write("  { id: '%s', label: '%s', name: '%s', kind: '%s', chars: %d, text: '%s' }%s\n" % (
        p['id'], p['label'], js_str(p['name']), p['kind'], len(p['text']), js_str(p['text']),
        ',' if i < len(papers) - 1 else ''))
buf.write('];\n')

open(OUT, 'w', encoding='utf-8').write(buf.getvalue())
print('papers:', [(p['id'], len(p['text'])) for p in papers])
print('size KB:', round(os.path.getsize(OUT) / 1024, 1))
