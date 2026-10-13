/* ============================================================
   LATTICE · 材料学科通用知识层
   作用：让抽取与分类覆盖材料学科的全部方向，而不是只认某一篇论文。
   · PROPERTY_FAMILIES：性能指标族（用于给抽取到的指标归类，并扩大召回）
   · MATERIAL_DOMAINS：材料方向（用户选择后用于术语增强与结果解释）
   · INSTRUMENT_LEX / REAGENT_LEX / STANDARD_LEX：通用术语与标准前缀
   注意：这些词典只影响"能否识别"，不会凭空生成内容 —— 原文没有的仍然不会被输出。
   ============================================================ */
window.MR = window.MR || {};

MR.domain = (function () {

  /* ---------- 性能指标族 ---------- */
  var PROPERTY_FAMILIES = [
    { k: '力学性能', color: '--c1', words: ['静曲强度', '抗弯强度', '弯曲强度', '弯曲模量', '弹性模量', '杨氏模量', '存储模量', '损耗模量', '拉伸强度', '抗拉强度', '屈服强度', '断裂强度', '抗压强度', '压缩强度', '抗折强度', '剪切强度', '层间剪切强度', '剥离强度', '粘结强度', '界面结合强度', '冲击强度', '冲击韧性', '断裂韧性', '维氏硬度', '洛氏硬度', '布氏硬度', '邵氏硬度', '显微硬度', '硬度', '延伸率', '断裂伸长率', '应变', '泊松比', '疲劳寿命', '疲劳强度', '蠕变', '应力松弛', '耐磨性', '磨耗量', '摩擦系数', '柔韧性', '韧性'], en: ['tensile strength', 'compressive strength', 'flexural strength', 'bending strength', 'yield strength', 'fatigue strength', 'adhesive strength', 'bond strength', 'shear strength', 'peel strength', 'impact strength', 'fracture toughness', 'elongation at break', 'elongation', 'strain', 'Young\'s modulus', 'elastic modulus', 'storage modulus', 'loss modulus', 'hardness', 'Vickers hardness', 'Shore hardness', 'wear rate', 'friction coefficient', 'creep', 'stress relaxation', 'toughness', 'flexibility'] },
    { k: '热学性能', color: '--c3', words: ['热导率', '导热系数', '热扩散系数', '比热容', '热膨胀系数', '线膨胀系数', '热稳定性', '热分解温度', '热失重', '玻璃化转变温度', '熔点', '结晶温度', '结晶度', '耐热性', '热变形温度', '维卡软化点', '阻燃性能', '极限氧指数', '残炭率', '热焓'], en: ['thermal conductivity', 'thermal diffusivity', 'specific heat', 'thermal expansion', 'thermal stability', 'decomposition temperature', 'glass transition temperature', 'melting point', 'crystallization temperature', 'heat deflection temperature', 'limiting oxygen index', 'char residue', 'thermogravimetric', 'TGA', 'DSC'] },
    { k: '电学与电化学', color: '--c2', words: ['电导率', '离子电导率', '电子电导率', '电阻率', '方阻', '介电常数', '介电损耗', '击穿强度', '比容量', '放电比容量', '充电比容量', '首次库仑效率', '库仑效率', '容量保持率', '循环稳定性', '循环寿命', '倍率性能', '能量密度', '功率密度', '电化学窗口', '过电位', '塔菲尔斜率', '交换电流密度', '电荷转移电阻', '阻抗', '电容', '比电容', '极化', 'SOC', '开路电压'], en: ['conductivity', 'electrical conductivity', 'ionic conductivity', 'resistivity', 'sheet resistance', 'dielectric constant', 'dielectric loss', 'breakdown strength', 'specific capacity', 'discharge capacity', 'charge capacity', 'Coulombic efficiency', 'capacity retention', 'cycling stability', 'cycle life', 'rate capability', 'energy density', 'power density', 'electrochemical window', 'overpotential', 'Tafel slope', 'charge transfer resistance', 'impedance', 'capacitance', 'polarization', 'open circuit voltage'] },
    { k: '光学性能', color: '--c5', words: ['透光率', '透过率', '雾度', '折射率', '消光系数', '带隙', '吸收边', '吸收峰', '发射峰', '荧光量子产率', '光致发光', '色差', '白度', '黄度', '光泽度', '反射率', '色牢度', '上染率', '荧光寿命', '光催化效率'], en: ['transmittance', 'transparency', 'haze', 'refractive index', 'band gap', 'absorption edge', 'absorbance', 'fluorescence quantum yield', 'photoluminescence', 'color difference', 'whiteness', 'gloss', 'reflectance', 'color fastness', 'dye uptake', 'photocatalytic efficiency'] },
    { k: '磁学性能', color: '--c6', words: ['饱和磁化强度', '剩余磁化强度', '矫顽力', '磁导率', '磁滞损耗', '居里温度', '磁各向异性'], en: ['saturation magnetization', 'remanence', 'coercivity', 'permeability', 'magnetic loss', 'Curie temperature'] },
    { k: '化学与耐候', color: '--c4', words: ['耐蚀性', '腐蚀速率', '腐蚀电位', '缓蚀效率', '耐水性', '吸水率', '吸水厚度膨胀率', '厚度膨胀率', '吸湿率', '回潮率', '耐候性', '紫外老化', '老化寿命', '氧化诱导期', '溶出率', '离子释放量', 'pH', '酸碱性', '化学稳定性', '抗氧化性', '重金属浸出', '抗冻性', '干缩率'], en: ['corrosion resistance', 'corrosion rate', 'corrosion potential', 'inhibition efficiency', 'water resistance', 'water absorption', 'water uptake', 'thickness swelling', 'moisture absorption', 'weathering resistance', 'UV ageing', 'oxidation induction time', 'leaching', 'ion release', 'chemical stability', 'acid resistance', 'alkali resistance', 'freeze-thaw resistance', 'hydrophilicity', 'hydrophobicity', 'contact angle', 'wettability', 'surface energy', 'zeta potential'] },
    { k: '加工与成型', color: '--c6', words: ['熔融指数', '熔体流动速率', '粘度', '流动性', '凝胶时间', '固化度', '固化收缩率', '收缩率', '密度', '表观密度', '堆积密度', '真密度', '孔隙率', '开孔率', '致密度', '粒径', '粒度分布', '比表面积', '孔径分布', '分散性', '悬浮稳定性', '收率', '产率', '转化率', '纯度'], en: ['melt flow index', 'melt flow rate', 'viscosity', 'flowability', 'gel time', 'curing degree', 'shrinkage', 'density', 'bulk density', 'tap density', 'porosity', 'open porosity', 'relative density', 'particle size', 'particle size distribution', 'specific surface area', 'pore size', 'dispersity', 'dispersion stability', 'yield', 'conversion', 'purity', 'printability'] },
    { k: '结构与成分', color: '--acc', words: ['结晶度', '晶粒尺寸', '晶格参数', '晶面间距', '相组成', '物相', '化学态', '官能团', '元素含量', '分子量', '分子量分布', '聚合度', '取代度', '交联度', '接枝率', '增重率', '羧基含量', '羟基含量', '含氮量', '灰分', '挥发分', '含固量'], en: ['crystallinity', 'crystallite size', 'lattice parameter', 'd-spacing', 'interlayer spacing', 'phase composition', 'chemical state', 'functional group', 'elemental content', 'molecular weight', 'polydispersity', 'degree of polymerization', 'degree of substitution', 'crosslinking degree', 'grafting degree', 'weight gain', 'carboxyl content', 'nitrogen content', 'ash content', 'zeta'] },
    { k: '生物与安全', color: '--c4', words: ['抑菌率', '抗菌率', '杀菌率', '抑菌圈', '生物膜抑制率', '细胞存活率', '细胞毒性', '溶血率', '生物相容性', '降解率', '降解速率', '药物释放率', '释放曲线', '载药量', '包封率', '内皮化', '凝血时间', '抗菌活性', '最小抑菌浓度', '最小杀菌浓度', '抗病毒活性'], en: ['antibacterial rate', 'antimicrobial rate', 'bactericidal rate', 'inhibition zone', 'biofilm inhibition', 'cell viability', 'cytotoxicity', 'hemolysis', 'biocompatibility', 'degradation rate', 'drug release', 'drug loading', 'encapsulation efficiency', 'endothelialization', 'clotting time', 'antibacterial activity', 'minimum inhibitory concentration', 'minimum bactericidal concentration'] },
    { k: '传感与分析性能', color: '--c2', words: ['灵敏度', '检出限', '检测限', '线性范围', '特异性', '响应时间', '恢复时间', '准确度', '精密度', '重复性', '再现性', '稳定性', '长期稳定性', '回收率', '信噪比', '基线漂移', '校准曲线', '交叉敏感性', '抗干扰性', '连续监测时长', '假阳性率', '假阴性率'], en: ['sensitivity', 'limit of detection', 'detection limit', 'limit of quantification', 'linear range', 'linearity', 'selectivity', 'specificity', 'response time', 'recovery time', 'accuracy', 'precision', 'repeatability', 'reproducibility', 'long-term stability', 'stability', 'recovery', 'signal-to-noise ratio', 'baseline drift', 'calibration curve', 'cross-sensitivity', 'anti-interference', 'wear time', 'shelf life', 'false positive rate', 'false negative rate'] },
    { k: '吸附与分离', color: '--c2', words: ['吸附容量', '吸附量', '去除率', '脱色率', '平衡吸附量', '选择性', '分离因子', '穿透时间', '穿透容量', '再生效率', '渗透通量', '截留率'], en: ['adsorption capacity', 'adsorption', 'removal efficiency', 'decolorization', 'equilibrium adsorption', 'separation factor', 'breakthrough time', 'breakthrough capacity', 'regeneration efficiency', 'permeate flux', 'rejection', 'permeability', 'retention'] },
    { k: '声学与其他', color: '--c5', words: ['隔声量', '吸声系数', '阻尼系数', '隔声性能', '隔热性能', '保温性能', '防辐射'], en: ['sound insulation', 'sound absorption', 'damping', 'thermal insulation', 'radiation shielding'] }
  ];
  var ALL_IND = [], ALL_IND_EN = [];
  PROPERTY_FAMILIES.forEach(function (f) {
    f.words.forEach(function (w) { ALL_IND.push(w); });
    (f.en || []).forEach(function (w) { ALL_IND_EN.push(w); });
  });
  ALL_IND_EN = ALL_IND_EN.filter(function (w, i) { return ALL_IND_EN.indexOf(w) === i; })
    .sort(function (a, b) { return b.length - a.length; });
  /* 去重（长词在前，便于优先匹配长名） */
  ALL_IND = ALL_IND.filter(function (w, i) { return ALL_IND.indexOf(w) === i; }).sort(function (a, b) { return b.length - a.length; });

  /* ---------- 指标归类 ---------- */
  function classify(name) {
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
  }

  /* ---------- 材料方向 ---------- */
  var MATERIAL_DOMAINS = [
    { k: 'metal', t: '金属材料', d: '合金 / 热处理 / 表面工程 / 腐蚀与防护', hint: ['合金', '钢', '铝', '镁', '钛', '热处理', '淬火', '回火', '退火', '渗氮', '镀层', '腐蚀', '焊缝'], std: ['GB/T', 'ASTM E', 'ISO 6892'] },
    { k: 'inorganic', t: '无机非金属材料', d: '陶瓷 / 玻璃 / 水泥与胶凝材料', hint: ['陶瓷', '玻璃', '水泥', '胶凝', '水化', '烧结', '晶相', '莫来石', '铝酸盐', '硅酸盐'], std: ['GB/T', 'JC/T', 'ASTM C'] },
    { k: 'polymer', t: '高分子与复合材料', d: '树脂 / 纤维增强 / 界面与改性', hint: ['聚合物', '树脂', '环氧', '聚丙烯', '界面', '偶联剂', '增强', '纤维', '相容性', '接枝'], std: ['GB/T', 'ASTM D', 'ISO 527'] },
    { k: 'energy', t: '能源与储能材料', d: '锂钠电 / 超级电容 / 催化与制氢', hint: ['正极', '负极', '电解液', '隔膜', '容量', '库仑效率', '催化剂', '析氢', '析氧', '电池', '钠离子', '锂离子'], std: ['GB/T', 'IEC', 'ASTM E'] },
    { k: 'electronic', t: '电子与光电材料', d: '半导体 / 介电 / 光伏 / 发光', hint: ['半导体', '薄膜', '钙钛矿', '带隙', '载流子', '介电', '封装', '光电器件', '发光二极管'], std: ['GB/T', 'SEMI', 'IEC'] },
    { k: 'bio', t: '生物医用材料', d: '植入体 / 敷料 / 组织工程 / 抗菌', hint: ['生物相容性', '细胞', '植入', '支架', '敷料', '抗菌', '抑菌', '壳聚糖', '胶原', '水凝胶'], std: ['GB/T 16886', 'ISO 10993', 'YY/T'] },
    { k: 'textile', t: '纤维与纺织材料', d: '纱线 / 织物 / 功能整理 / 染整', hint: ['织物', '棉', '麻', '涤纶', '纺丝', '整理', '染色', '服装', '非织造'], std: ['GB/T', 'AATCC', 'ISO 105'] },
    { k: 'building', t: '建筑材料', d: '混凝土 / 板材 / 保温防火 / 装配式', hint: ['混凝土', '砂浆', '板材', '保温', '防火', '强度等级', '养护', '骨料', '砌块'], std: ['GB/T', 'GB ', 'JG/T', 'JC/T'] },
    { k: 'chem', t: '化工与催化材料', d: '催化剂 / 多孔材料 / 膜分离', hint: ['催化', '载体', '分子筛', 'MOF', '膜', '吸附', '分离', '沸石', '比表面积'], std: ['GB/T', 'ASTM D', 'ISO 9277'] },
    { k: 'env', t: '环境功能材料', d: '水处理 / 吸附降解 / 固废资源化', hint: ['吸附', '降解', '去除率', '脱色', '重金属', '固废', '资源化', '光催化', '过滤'], std: ['GB/T', 'HJ ', 'ISO 5667'] }
  ];

  /* ---------- 仪器（通用） ---------- */
  var INSTRUMENT_LEX = ['扫描电子显微镜', '场发射扫描电子显微镜', '透射电子显微镜', '扫描电镜', '电子显微镜', '金相显微镜', '光学显微镜', '原子力显微镜',
    'X射线衍射仪', 'X射线衍射', 'XRD', 'X射线光电子能谱', '能谱仪', '电子探针', 'EBSD', 'X射线荧光光谱',
    '傅里叶变换红外光谱仪', '傅里叶红外光谱', '红外光谱仪', '拉曼光谱仪', '紫外可见分光光度计', '分光光度计', '荧光光谱仪', '核磁共振波谱仪',
    '热重分析仪', '差示扫描量热仪', '同步热分析仪', '热膨胀仪', '导热系数测试仪', '激光导热仪',
    '万能材料试验机', '万能力学性能试验机', '电子万能试验机', '拉力试验机', '压力试验机', '疲劳试验机', '冲击试验机', '硬度计', '维氏硬度计', '显微硬度计', '摩擦磨损试验机',
    '电化学工作站', '电池测试系统', '蓝电测试系统', '恒流充放电测试仪', '阻抗分析仪', 'LCR测试仪', '四探针测试仪', '霍尔效应测试仪', '太阳光模拟器', '量子效率测试系统',
    '比表面积及孔径分析仪', '压实密度仪', '激光粒度仪', 'Zeta电位分析仪', '接触角测量仪', '表面张力仪',
    '行星式球磨机', '球磨机', '行星球磨机', '振动磨', '砂磨机', '高速分散机', '均质机',
    '管式炉', '马弗炉', '箱式炉', '高温烧结炉', '真空炉', '热压烧结炉', '放电等离子烧结炉', '真空干燥箱', '鼓风干燥箱', '冷冻干燥机',
    '恒温水浴锅', '水浴锅', '恒温振荡器', '恒温恒湿箱', '磁力搅拌器', '机械搅拌器', '乳化机',
    '热压机', '冷压机', '平板硫化机', '注射成型机', '双螺杆挤出机', '密炼机', '开炼机', '流延机', '旋涂仪', '静电纺丝机',
    '手套箱', '真空手套箱', '等离子体处理机', '磁控溅射仪', '电子束蒸发镀膜机', '原子层沉积系统', '化学气相沉积系统', '激光熔覆设备',
    '电子天平', '分析天平', 'pH计', 'pH 计', '电导率仪', '粘度计', '旋转粘度计', '熔融指数仪', '密度计', '真空泵', '离心机', '超声波清洗机', '筛分机', '振筛机',
    '酶标仪', '生物安全柜', '恒温培养箱', '高压灭菌锅', '共聚焦激光扫描显微镜', '活细胞工作站', '万能染色分析仪'];

  /* ---------- 试剂通用词尾 ---------- */
  var REAGENT_LEX = ['氢氧化物', '氧化物', '氯化物', '硫酸盐', '硝酸盐', '碳酸盐', '磷酸盐', '硅酸盐', '铝酸盐', '钛酸盐', '钨酸盐', '钼酸盐', '氟化物', '碘化物', '溴化物',
    '酸', '碱', '盐', '醇', '酯', '醚', '酮', '醛', '胺', '酰胺', '烷', '烯', '苯', '酚', '树脂', '乳液', '胶黏剂', '偶联剂', '硅烷', '分散剂', '消泡剂', '流平剂', '增塑剂', '固化剂', '促进剂', '引发剂', '阻燃剂', '稳定剂', '抗氧剂', '表面活性剂', '发泡剂', '成核剂', '阻聚剂',
    '水泥', '石膏', '石灰', '粉煤灰', '矿渣', '硅灰', '骨料', '砂', '纤维', '粉末', '浆料', '前驱体', '催化剂', '载体', '模板剂', '螯合剂', '络合剂', '缓冲液', '培养基'];

  /* ---------- 材料名词（用于识别"名称（规格），购自厂家"型条目） ---------- */
  var MATERIAL_NOUN = ['合金', '铝合金', '镁合金', '钛合金', '不锈钢', '碳钢', '钢', '铸铁', '铜', '铝', '镁', '钛', '锌', '镍', '钨', '钼',
    '陶瓷', '氧化铝', '氧化锆', '碳化硅', '氮化硅', '玻璃', '石英', '云母', '石墨', '石墨烯', '碳纳米管', '炭黑', '活性炭', '碳纤维', '金刚石',
    '高岭土', '偏高岭土', '蒙脱土', '膨润土', '黏土', '陶土', '硅藻土', '沸石', '分子筛', '凹凸棒土', '滑石', '碳酸钙', '硫酸钙',
    '玄武岩纤维', '玻璃纤维', '芳纶', '聚丙烯纤维', '聚乙烯醇纤维', '木质素', '纤维素', '纳米纤维素', '甲壳素', '壳聚糖', '胶原', '明胶', '海藻酸钠',
    '聚乙烯', '聚丙烯', '聚氯乙烯', '聚苯乙烯', '聚酰胺', '聚酯', '聚氨酯', '聚乳酸', '聚碳酸酯', '环氧树脂', '酚醛树脂', '不饱和聚酯', 'ABS',
    '矿渣', '粉煤灰', '硅灰', '钢渣', '赤泥', '尾矿', '建筑垃圾', '再生骨料', '水泥', '石膏', '石灰',
    '磷酸铁锂', '磷酸钒钠', '钴酸锂', '三元材料', '锰酸锂', '钛酸锂', '硬碳', '软碳', '硅碳', '金属锂', '金属钠',
    '钙钛矿', '硫化镉', '硒化铜铟镓', '氧化锌', '二氧化钛', '二氧化锡', '氧化镍', '氧化铜', '氧化铁', '四氧化三钴', '五氧化二钒', '钒酸盐',
    'MXene', 'MOF', 'ZIF', 'g-C3N4', '黑磷', '二硫化钼', '氮化硼', '碳化钨', '氮化镓', '砷化镓', '硅片', '晶圆'];

  /* ---------- 工序动词（覆盖金属/陶瓷/高分子/建筑/能源等方向） ---------- */
  var PROCESS_VERBS = ['称量', '称取', '配制', '球磨', '研磨', '混料', '干拌', '搅拌', '混合', '分散', '均质', '球化', '筛分', '过筛',
    '熔炼', '铸造', '浇注', '轧制', '锻造', '挤压', '拉拔', '退火', '正火', '淬火', '水淬', '回火', '固溶', '时效', '渗氮', '渗碳', '表面处理', '抛光', '打磨',
    '铺装', '预压', '热压', '冷压', '压制', '模压', '注射成型', '挤出', '流延', '旋涂', '涂布', '喷涂', '浸渍', '浸涂', '提拉',
    '预烧', '煅烧', '烧结', '保温', '升温', '降温', '退火处理', '脱模', '固化', '交联', '熟化', '陈化',
    '沉淀', '共沉淀', '水热', '溶剂热', '溶胶-凝胶', '静电纺丝', '电沉积', '磁控溅射', '蒸镀', '化学气相沉积', '原子层沉积', '等离子体处理',
    '干燥', '烘干', '真空干燥', '冷冻干燥', '洗涤', '清洗', '离心', '过滤', '透析', '破碎',
    '养护', '标准养护', '蒸压养护', '齐边', '锯切', '切割', '裁切', '封装', '装配', '组装', '电池装配'];

  /* ---------- 标准前缀 ---------- */
  var STANDARD_LEX = ['GB/T', 'GB', 'JC/T', 'JG/T', 'JB/T', 'YB/T', 'HG/T', 'LY/T', 'QB/T', 'SN/T', 'DL/T', 'CJ/T', 'JT/T', 'YY/T', 'HJ', 'AQ',
    'ASTM', 'ISO', 'IEC', 'EN', 'DIN', 'JIS', 'AATCC', 'ANSI', 'SEMI', 'EN 10993', 'ISO 10993', 'T/CSTM', 'T/CECS', 'T/CNFIA'];

  /* ---------- 用户选择的领域 → 术语增强 ---------- */
  function hintWords(k) {
    var d = MATERIAL_DOMAINS.filter(function (x) { return x.k === k; })[0];
    return d ? d.hint : [];
  }

  /* ---------- 英文仪器 ---------- */
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
    'silane', 'thiol', 'amine', 'carboxyl', 'hydroxyl', 'aldehyde', 'substrate', 'electrode', 'microelectrode', 'precursor', 'catalyst',
    /* 通用化学品 —— 论文最常见的英文试剂写法 */
    'sodium chloride', 'sodium hydroxide', 'potassium hydroxide', 'sodium carbonate', 'sodium bicarbonate', 'sodium nitrate', 'sodium sulfate',
    'potassium chloride', 'potassium nitrate', 'ammonium chloride', 'ammonium nitrate', 'ammonium sulfate', 'ammonium hydroxide',
    'calcium chloride', 'calcium carbonate', 'calcium hydroxide', 'magnesium chloride', 'magnesium hydroxide', 'magnesium sulfate',
    'zinc oxide', 'zinc sulfate', 'copper sulfate', 'iron sulfate', 'ferrous sulfate', 'ferric chloride',
    'hydrochloric acid', 'sulfuric acid', 'nitric acid', 'phosphoric acid', 'acetic acid', 'citric acid', 'oxalic acid', 'tartaric acid',
    'absolute ethanol', 'anhydrous ethanol', 'ethanol', 'methanol', 'isopropanol', 'butanol', 'ethylene glycol', 'propylene glycol',
    'glycerol', 'glycerin', 'acetone', 'toluene', 'xylene', 'hexane', 'cyclohexane', 'chloroform', 'dichloromethane',
    'dimethyl sulfoxide', 'DMSO', 'N-methyl-2-pyrrolidone', 'NMP', 'dimethylformamide', 'DMF', 'tetrahydrofuran', 'THF',
    'deionized water', 'distilled water', 'argon', 'nitrogen', 'oxygen', 'hydrogen',
    'vanadium pentoxide', 'ammonium dihydrogen phosphate', 'sodium perchlorate', 'ethylene carbonate', 'propylene carbonate',
    'sodium metal', 'aluminum foil'];

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
    STANDARD_LEX_EN: STANDARD_LEX_EN,
    classify: classify,
    MATERIAL_DOMAINS: MATERIAL_DOMAINS,
    INSTRUMENT_LEX: INSTRUMENT_LEX,
    REAGENT_LEX: REAGENT_LEX,
    MATERIAL_NOUN: MATERIAL_NOUN,
    PROCESS_VERBS: PROCESS_VERBS,
    STANDARD_LEX: STANDARD_LEX,
    hintWords: hintWords
  };
})();
