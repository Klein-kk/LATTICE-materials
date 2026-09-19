import io

# ===================== A. domain.js：英文词典 =====================
D = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\domain.js'
d = open(D, encoding='utf-8').read()

# A1) 每个性能族补英文词表（用于识别英文文献的指标）
FAM_EN = {
 '力学性能': ['tensile strength','compressive strength','flexural strength','bending strength','yield strength','fatigue strength','adhesive strength','bond strength','shear strength','peel strength','impact strength','fracture toughness','elongation at break','elongation','strain','Young\'s modulus','elastic modulus','storage modulus','loss modulus','hardness','Vickers hardness','Shore hardness','wear rate','friction coefficient','creep','stress relaxation','toughness','flexibility'],
 '热学性能': ['thermal conductivity','thermal diffusivity','specific heat','thermal expansion','thermal stability','decomposition temperature','glass transition temperature','melting point','crystallization temperature','heat deflection temperature','limiting oxygen index','char residue','thermogravimetric','TGA','DSC'],
 '电学与电化学': ['conductivity','electrical conductivity','ionic conductivity','resistivity','sheet resistance','dielectric constant','dielectric loss','breakdown strength','specific capacity','discharge capacity','charge capacity','Coulombic efficiency','capacity retention','cycling stability','cycle life','rate capability','energy density','power density','electrochemical window','overpotential','Tafel slope','charge transfer resistance','impedance','capacitance','polarization','open circuit voltage'],
 '光学性能': ['transmittance','transparency','haze','refractive index','band gap','absorption edge','absorbance','fluorescence quantum yield','photoluminescence','color difference','whiteness','gloss','reflectance','color fastness','dye uptake','photocatalytic efficiency'],
 '磁学性能': ['saturation magnetization','remanence','coercivity','permeability','magnetic loss','Curie temperature'],
 '化学与耐候': ['corrosion resistance','corrosion rate','corrosion potential','inhibition efficiency','water resistance','water absorption','water uptake','thickness swelling','moisture absorption','weathering resistance','UV ageing','oxidation induction time','leaching','ion release','chemical stability','acid resistance','alkali resistance','freeze-thaw resistance','hydrophilicity','hydrophobicity','contact angle','wettability','surface energy','zeta potential'],
 '加工与成型': ['melt flow index','melt flow rate','viscosity','flowability','gel time','curing degree','shrinkage','density','bulk density','tap density','porosity','open porosity','relative density','particle size','particle size distribution','specific surface area','pore size','dispersity','dispersion stability','yield','conversion','purity','printability'],
 '结构与成分': ['crystallinity','crystallite size','lattice parameter','d-spacing','interlayer spacing','phase composition','chemical state','functional group','elemental content','molecular weight','polydispersity','degree of polymerization','degree of substitution','crosslinking degree','grafting degree','weight gain','carboxyl content','nitrogen content','ash content','zeta'],
 '生物与安全': ['antibacterial rate','antimicrobial rate','bactericidal rate','inhibition zone','biofilm inhibition','cell viability','cytotoxicity','hemolysis','biocompatibility','degradation rate','drug release','drug loading','encapsulation efficiency','endothelialization','clotting time','sensitivity','limit of detection','detection limit','LOD','linear range','selectivity','specificity','response time','recovery','accuracy','precision','repeatability','reproducibility','stability','shelf life','signal-to-noise ratio','sensitivity'],
 '吸附与分离': ['adsorption capacity','adsorption','removal efficiency','decolorization','equilibrium adsorption','selectivity','separation factor','breakthrough time','breakthrough capacity','regeneration efficiency','permeate flux','rejection','permeability','retention'],
 '声学与其他': ['sound insulation','sound absorption','damping','thermal insulation','radiation shielding']
}

pairs = []
for k, arr in FAM_EN.items():
    en_js = ', '.join("'" + w.replace("'", "\\'") + "'" for w in arr)
    pairs.append((k, en_js))

# 给每个 family 加 en: [...] —— 用正则定位每个族的 words 数组结束位置
import re
def add_en(src, fam_key, en_js):
    # 找到 { k: '力学性能', color: '--c1', words: [ ... ] }
    i = src.find("k: '" + fam_key + "', color:")
    if i < 0:
        print('MISS family:', fam_key); return src
    j = src.find(']', src.find('words:', i))
    return src[:j+1] + ", en: [" + en_js + "]" + src[j+1:]

for k, en_js in pairs:
    d = add_en(d, k, en_js)

# A2) 英文指标总表 + 领域分类时同时查中英
d = d.replace("""  var ALL_IND = [];
  PROPERTY_FAMILIES.forEach(function (f) { f.words.forEach(function (w) { ALL_IND.push(w); }); });""",
"""  var ALL_IND = [], ALL_IND_EN = [];
  PROPERTY_FAMILIES.forEach(function (f) {
    f.words.forEach(function (w) { ALL_IND.push(w); });
    (f.en || []).forEach(function (w) { ALL_IND_EN.push(w); });
  });
  ALL_IND_EN = ALL_IND_EN.filter(function (w, i) { return ALL_IND_EN.indexOf(w) === i; })
    .sort(function (a, b) { return b.length - a.length; });""")

d = d.replace("""  function classify(name) {
    for (var i = 0; i < PROPERTY_FAMILIES.length; i++) {
      var f = PROPERTY_FAMILIES[i];
      for (var j = 0; j < f.words.length; j++) {
        if (name === f.words[j]) return f;
        if (name.indexOf(f.words[j]) >= 0) return f;
      }
    }
    return { k: '其他指标', color: '--c6', words: [] };
  }""",
"""  function classify(name) {
    var low = String(name).toLowerCase();
    for (var i = 0; i < PROPERTY_FAMILIES.length; i++) {
      var f = PROPERTY_FAMILIES[i];
      var j;
      for (j = 0; j < f.words.length; j++) {
        if (name === f.words[j] || name.indexOf(f.words[j]) >= 0) return f;
      }
      var en = f.en || [];
      for (j = 0; j < en.length; j++) {
        if (low === en[j] || low.indexOf(en[j]) >= 0) return f;
      }
    }
    return { k: '其他指标', color: '--c6', words: [], en: [] };
  }""")

# A3) 英文仪器 / 试剂 / 材料 / 工艺动词 / 标准
d = d.replace("""  return {
    PROPERTY_FAMILIES: PROPERTY_FAMILIES,
    ALL_IND: ALL_IND,""",
"""  /* ---------- 英文仪器 ---------- */
  var INSTRUMENT_LEX_EN = ['scanning electron microscope', 'SEM', 'TEM', 'transmission electron microscope', 'atomic force microscope', 'AFM',
    'X-ray diffraction', 'XRD', 'X-ray photoelectron spectroscopy', 'XPS', 'energy dispersive', 'EDS', 'EDX', 'Raman', 'FTIR', 'Fourier transform infrared',
    'nuclear magnetic resonance', 'NMR', 'UV-vis', 'ultraviolet-visible', 'spectrophotometer', 'spectrometer', 'mass spectrometer', 'LC-MS', 'GC-MS', 'HPLC',
    'enzyme-linked immunosorbent assay', 'ELISA', 'potentiostat', 'electrochemical workstation', 'impedance analyzer', 'LCR meter', 'four-point probe',
    'source meter', 'battery tester', 'cycler', 'thermogravimetric analyser', 'TGA', 'differential scanning calorimeter', 'DSC', 'thermal conductivity analyser',
    'universal testing machine', 'tensile tester', 'fatigue tester', 'hardness tester', 'nanoindenter', 'tribometer', 'confocal microscope', 'fluorescence microscope',
    'optical microscope', 'microplate reader', 'flow cytometer', 'spin coater', 'dip coater', 'sputter coater', 'evaporator', 'CVD system', 'ALD system',
    'electrospinning', '3D printer', 'screen printer', 'inkjet printer', 'plasma cleaner', 'glovebox', 'tube furnace', 'muffle furnace', 'autoclave',
    'centrifuge', 'lyophilizer', 'freeze dryer', 'vacuum oven', 'analytical balance', 'pH meter', 'vortex mixer', 'sonicator', 'ball mill', 'roll-to-roll',
    'microfluidic', 'wearable patch', 'biosensor', 'glucose monitor', 'continuous glucose monitor', 'CGM', 'transdermal sensor', 'microneedle patch'];

  /* ---------- 英文试剂 / 材料 ---------- */
  var REAGENT_LEX_EN = ['gold', 'silver', 'platinum', 'palladium', 'copper', 'zinc', 'iron oxide', 'titanium dioxide', 'graphene', 'graphene oxide', 'reduced graphene oxide',
    'carbon nanotube', 'carbon dots', 'MXene', 'MoS2', 'quantum dot', 'nanoparticle', 'nanowire', 'nanosheet', 'nanorod', 'nanocrystal',
    'polymer', 'polyethylene', 'polypropylene', 'polystyrene', 'polyurethane', 'PDMS', 'PEG', 'PVA', 'PEDOT', 'PSS', 'PVDF', 'Nafion', 'polyimide',
    'hydrogel', 'chitosan', 'alginate', 'cellulose', 'collagen', 'gelatin', 'serum albumin', 'bovine serum albumin', 'DNA', 'RNA', 'aptamer', 'antibody',
    'enzyme', 'glucose oxidase', 'lactate oxidase', 'horseradish peroxidase', 'protein', 'peptide', 'lipid', 'cholesterol', 'cortisol', 'insulin',
    'ionic liquid', 'eutectic solvent', 'electrolyte', 'buffer', 'phosphate-buffered saline', 'PBS', 'surfactant', 'crosslinker', 'initiator', 'monomer',
    'silane', 'thiol', 'amine', 'carboxyl', 'hydroxyl', 'aldehyde', 'substrate', 'electrode', 'microelectrode', 'precursor', 'catalyst'];

  /* ---------- 英文材料名词 ---------- */
  var MATERIAL_NOUN_EN = ['steel', 'alloy', 'aluminium alloy', 'magnesium alloy', 'titanium alloy', 'stainless steel', 'ceramic', 'alumina', 'zirconia',
    'silicon carbide', 'silicon nitride', 'glass', 'quartz', 'graphite', 'diamond', 'cement', 'gypsum', 'mortar', 'concrete', 'aggregate', 'slag',
    'fly ash', 'silica fume', 'kaolin', 'metakaolin', 'bentonite', 'zeolite', 'MOF', 'perovskite', 'silicon wafer', 'nanocellulose', 'lignin', 'chitin',
    'silk fibroin', 'textile', 'cotton', 'polyester', 'fabric', 'membrane', 'coating', 'film', 'fibre', 'fiber', 'composite', 'nanocomposite', 'aerogel', 'foam'];

  /* ---------- 英文工艺动词 ---------- */
  var PROCESS_VERBS_EN = ['synthesize', 'synthesized', 'synthesis', 'fabricate', 'fabricated', 'prepare', 'prepared', 'deposit', 'deposited', 'coated', 'coating',
    'spin-coat', 'spin-coating', 'drop-cast', 'dip-coated', 'electrospun', 'electrospinning', 'electrodeposited', 'sputtered', 'annealed', 'annealing',
    'sintered', 'sintering', 'calcined', 'pyrolysed', 'polymerized', 'cured', 'crosslinked', 'functionalized', 'immobilized', 'grafted', 'assembled',
    'patterned', 'lithography', 'printed', 'molded', 'extruded', 'injected', 'compression-moulded', 'centrifuged', 'dialysed', 'lyophilized', 'sonicated',
    'filtered', 'washed', 'dried', 'evaporated', 'etching', 'etched', 'polished', 'milled', 'ball-milled', 'sieved', 'mixed', 'stirred', 'heated', 'cooled',
    'quenched', 'aged', 'cured', 'seeded', 'encapsulated', 'integrated', 'calibrated', 'characterized', 'characterised', 'measured', 'tested', 'validated',
    'inoculated', 'incubated', 'cultured', 'sterilized', 'purified', 'extracted', 'chromatography', 'speckled'];

  /* ---------- 标准（含英文体系） ---------- */
  var STANDARD_LEX_EN = ['ASTM', 'ISO', 'IEC', 'ANSI', 'USP', 'CLSI', 'IEEE', 'EN', 'DIN', 'JIS', 'BS', 'FDA', 'EMA', 'WHO', 'NIST', 'MIL-STD', 'IPC', 'AATCC'];

  return {
    PROPERTY_FAMILIES: PROPERTY_FAMILIES,
    ALL_IND: ALL_IND,
    ALL_IND_EN: ALL_IND_EN,
    INSTRUMENT_LEX_EN: INSTRUMENT_LEX_EN,
    REAGENT_LEX_EN: REAGENT_LEX_EN,
    MATERIAL_NOUN_EN: MATERIAL_NOUN_EN,
    PROCESS_VERBS_EN: PROCESS_VERBS_EN,
    STANDARD_LEX_EN: STANDARD_LEX_EN,""")
open(D, 'w', encoding='utf-8').write(d)
print('domain.js: English lexicons added')
