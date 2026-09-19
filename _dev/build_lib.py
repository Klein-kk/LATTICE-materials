import json, re, io, collections

rows = json.load(open('src/library.json', encoding='utf-8'))

FORCE = ['fiber-reactive chitosan derivative', 'periodate', 'N-halamine', 'biguanide', 'silver nanocoated',
         'genetic basis for Pseudomonas', 'oxygen-plasma treated poly', 'neem leaf extract', 'Chitin and chitosan',
         'arylamide oligomers', 'Oxidants, oxidative', 'Mechanisms of biofilm', 'Structure of cotton Alpha',
         'Ozone gas is an effective', 'quaternary ammonium', 'oxidized cellulose', 'reactive oxygen species',
         'antimicrobial textile finish', 'light stability of N-halamine', 'graft copolymerization onto cellulose',
         'hyperbranched', 'cotton cellulose fabric gra', 'layer-by-layer', 'plasma',
         'cross-linking chitosan', 'Antibacterial cotton', 'Durable antimicrobial', 'silver nanoparticles',
         'Staphylococcus', 'biofilm', 'Cellulose nanofib', 'chitosan']


def tag(t):
    t = t.lower()
    if re.search(r'chitosan|chitin', t):
        return 'chitosan'
    if re.search(r'quaternary|ammonium|biguanide|phmb|halamine|halogen|arylamide|peptide|gemini', t):
        return 'qas'
    if re.search(r'silver|nanoparticle|nanocoated|tio2|zno|copper|zinc|nanocomposite|nanofib|nanocellulose', t):
        return 'metal'
    if re.search(r'biofilm|pseudomonas|staphylococc|mrsa|bacteri|microbi|antibiotic|microbiome|infection|skin', t):
        return 'microbio'
    if re.search(r'tempo|periodate|oxid|carboxyl|aldehyde|hydroly|regenerat|dissol|esterif|etherif|reactive oxygen', t):
        return 'cellchem'
    if re.search(r'cotton|cellulose|lyocell|viscose|fiber|fabric|textile', t):
        return 'cellulose'
    return 'other'


for r in rows:
    if not r.get('year') or not r.get('journal'):
        continue
    r['tag'] = tag(r['title'])
    r['tlen'] = len(r['title'])
    low = r['title'].lower()
    r['forced'] = any(f.lower() in low for f in FORCE)

keep = {}
for r in rows:
    if not r.get('tag'):
        continue
    keep.setdefault(r['title'][:60], r)
pool = list(keep.values())

sel = [r for r in pool if r['forced']]
taken = set(id(r) for r in sel)

quota = {'cellchem': 14, 'cellulose': 16, 'chitosan': 8, 'qas': 10, 'metal': 14, 'microbio': 20}
cur = collections.Counter(r['tag'] for r in sel)
for k, q in quota.items():
    need = q - cur.get(k, 0)
    if need <= 0:
        continue
    cand = [r for r in pool if r['tag'] == k and id(r) not in taken]
    cand.sort(key=lambda x: x['tlen'])
    add = cand[:need]
    sel += add
    taken |= set(id(r) for r in add)

sel = sorted(sel, key=lambda x: (x['year'], x['title']))

out = io.StringIO()
out.write('/* LATTICE \u00b7 \u771f\u5b9e\u6587\u732e\u7d22\u5f15 \u00b7 \u7531\u7528\u6237\u672c\u5730\u6587\u732e\u76ee\u5f55\u300c\u6297\u83cc\u7eba\u7ec7A\u300d\uff08365 \u7bc7\uff09\u89e3\u6790\u751f\u6210\n')
out.write('   \u5e74\u4efd / \u671f\u520a / \u9898\u540d \u4e09\u9879\u4e3a\u6587\u4ef6\u540d\u539f\u6587\uff0c\u5747\u4e3a\u771f\u5b9e\u5df2\u53d1\u8868\u6587\u732e\uff1b\n')
out.write('   DOI \u4e0e\u5377\u671f\u9875\u7801\u6807\u8bb0\u4e3a pending\uff0c\u63a5\u5165 Crossref / CNKI API \u540e\u56de\u586b\u3002 */\n')
out.write('window.MR_LIB = [\n')
for i, r in enumerate(sel):
    t = r['title'].replace("'", "\\'")
    out.write("  { id:'L%03d', y:%d, j:'%s', t:'%s', tag:'%s' },\n" % (i + 1, r['year'], r['journal'].replace("'", ''), t, r['tag']))
out.write('];\n')
open('src/library.js', 'w', encoding='utf-8').write(out.getvalue())
print('total', len(sel))
print(collections.Counter(r['tag'] for r in sel))
