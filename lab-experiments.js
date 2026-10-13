/* ============================================================
   LATTICE · 化学实验目录（借鉴自 lanyuxi/huaxue · MIT）
   ============================================================
   数据 schema：
   { slug, title, description, category, difficulty, reagents, apparatus,
     objectives, estimatedMinutes, probe, safety, errorSources, products3D }
   - probe:        { reagentKeys, expect } → 用于推断核心反应
   - safety:       数组，危险/注意事项
   - errorSources: 数组，主要误差来源
   - products3D:   产物 3D 关键参数（用于 §2 figure-3d.html 展示）

   覆盖：酸碱(6) · 氧化还原(4) · 沉淀(3) · 气体(4) · 金属(2) · 有机(2) · 电化学(2) · 配位(2)
   ============================================================ */
window.MR = window.MR || {};
(function () {

  var C = {
    ACID_BASE: '酸碱反应',
    ORGANIC: '有机化学',
    THERMO: '热力学',
    REDOX: '氧化还原',
    PRECIPITATION: '沉淀与复分解',
    GAS: '气体制备与性质',
    ELECTROCHEM: '电化学',
    METAL: '金属与活动性',
    ANALYSIS: '分析与检验',
    COORDINATION: '配位与显色'
  };

  var D = { EASY: '入门', MEDIUM: '进阶', HARD: '挑战' };

  /* ---- 25 个核心实验 ---- */
  var EXPERIMENTS = [
    /* ========== 酸碱反应 (6) ========== */
    { slug:'acid-base-titration', category:C.ACID_BASE, difficulty:D.MEDIUM,
      title:'酸碱中和滴定', estimatedMinutes:45,
      description:'用标准盐酸滴定未知浓度的氢氧化钠溶液，借助酚酞指示剂判断终点。',
      reagents:['0.1 mol/L 盐酸标准液','待测氢氧化钠溶液','酚酞指示剂'],
      apparatus:['酸式滴定管','锥形瓶','移液管','铁架台','白瓷板'],
      objectives:['理解中和滴定原理','规范使用滴定管','计算未知浓度'],
      probe:{ reagentKeys:['盐酸','氢氧化钠'], expect:{ reacted:true, thermal:'exothermic', colorChange:true } },
      safety:['NaOH 强碱，避免皮肤接触','盐酸挥发，通风橱内操作'],
      errorSources:['滴定终点判断主观误差','滴定管读数误差','指示剂用量过多或过少'],
      products3D: { main: 'NaCl', side: ['H2O'], ph:'中性', yield:'>99%' } },

    { slug:'hcl-naoh-neutralization-thermo', category:C.ACID_BASE, difficulty:D.MEDIUM,
      title:'盐酸与氢氧化钠中和热测定', estimatedMinutes:40,
      description:'保温杯量热计中测定中和热。',
      reagents:['0.50 mol/L 盐酸','0.55 mol/L 氢氧化钠','蒸馏水'],
      apparatus:['保温杯量热计','温度计','量筒','环形玻璃搅拌棒'],
      objectives:['测定中和热','理解放热反应','分析误差来源'],
      probe:{ reagentKeys:['盐酸','氢氧化钠'], expect:{ reacted:true, thermal:'exothermic', gas:false } },
      safety:['NaOH 腐蚀性','废液中和后倒入'],
      products3D: { main: 'NaCl', side: ['H2O'], heat:'57.3 kJ/mol' } },

    { slug:'vinegar-soda', category:C.ACID_BASE, difficulty:D.EASY,
      title:'食醋与小苏打反应', estimatedMinutes:20,
      description:'食醋与小苏打生成 CO₂。',
      reagents:['食醋（5% 乙酸）','小苏打（碳酸氢钠）'],
      apparatus:['烧杯','气球','锥形瓶'],
      objectives:['观察产气','认识 CO₂','联系生活化学'],
      probe:{ reagentKeys:['乙酸','碳酸氢钠'], expect:{ reacted:true, gas:true } },
      safety:['醋酸弱酸，操作简单','气球膨胀后及时放气'],
      products3D: { main: 'CH3COONa', side: ['H2O','CO2'], gas: 'CO2↑' } },

    { slug:'metal-oxide-acid', category:C.ACID_BASE, difficulty:D.EASY,
      title:'氧化铜与稀硫酸反应', estimatedMinutes:25,
      description:'黑色 CuO 溶于稀硫酸生成蓝色 CuSO₄ 溶液。',
      reagents:['氧化铜粉末','1 mol/L 稀硫酸'],
      apparatus:['试管','酒精灯','试管夹'],
      objectives:['认识碱性氧化物与酸反应','观察溶液颜色变化'],
      probe:{ reagentKeys:['氧化铜','硫酸'], expect:{ reacted:true, colorChange:true } },
      safety:['稀硫酸避免溅到皮肤'],
      products3D: { main: 'CuSO4', side: ['H2O'], color: '蓝色' } },

    { slug:'limewater-co2', category:C.ACID_BASE, difficulty:D.EASY,
      title:'二氧化碳与石灰水反应', estimatedMinutes:20,
      description:'向澄清石灰水中通入 CO₂ 变浑浊。',
      reagents:['澄清石灰水','二氧化碳（钢瓶或石灰石+盐酸制取）'],
      apparatus:['试管','导管','集气瓶'],
      objectives:['掌握 CO₂ 检验','理解碱与酸性氧化物反应','观察沉淀'],
      probe:{ reagentKeys:['氢氧化钙','二氧化碳'], expect:{ reacted:true, precipitate:true } },
      safety:['石灰水碱性弱，安全'],
      products3D: { main: 'CaCO3', side: ['H2O'], precipitate:'白色' } },

    { slug:'antacid-stomach', category:C.ACID_BASE, difficulty:D.EASY,
      title:'抗酸药中和胃酸', estimatedMinutes:25,
      description:'氢氧化铝、碳酸氢钠等胃药中和模拟胃酸（稀盐酸）。',
      reagents:['0.1 mol/L 盐酸','胃舒平','碳酸氢钠','甲基橙'],
      apparatus:['烧杯','玻璃棒','pH 计'],
      objectives:['认识抗酸药原理','联系医药应用'],
      probe:{ reagentKeys:['盐酸','碳酸氢钠'], expect:{ reacted:true, gas:true } },
      safety:['稀盐酸加热避免温度过高'],
      products3D: { main: 'NaCl', side: ['H2O','CO2'], application:'医药' } },

    /* ========== 氧化还原 (4) ========== */
    { slug:'cuo-h2-reduction', category:C.REDOX, difficulty:D.MEDIUM,
      title:'氢气还原氧化铜', estimatedMinutes:30,
      description:'H₂ 通入加热 CuO 还原为 Cu。',
      reagents:['氧化铜粉末','氢气（启普发生器）'],
      apparatus:['硬质玻璃管','酒精喷灯','铁架台','导管'],
      objectives:['认识还原反应','观察黑色变红色'],
      probe:{ reagentKeys:['氢气','氧化铜'], expect:{ reacted:true, colorChange:true, thermal:'exothermic' } },
      safety:['先通 H₂ 后加热','先撤灯后撤 H₂','尾气处理或收集'],
      errorSources:['H₂ 不纯爆炸','加热不充分','空气进入产物'],
      products3D: { main: 'Cu', side: ['H2O'], color: '红色金属' } },

    { slug:'kmno4-glycerol', category:C.REDOX, difficulty:D.MEDIUM,
      title:'高锰酸钾氧化甘油', estimatedMinutes:15,
      description:'高锰酸钾晶体接触甘油自燃。',
      reagents:['高锰酸钾晶体','甘油'],
      apparatus:['蒸发皿','玻璃棒','石棉网'],
      objectives:['观察强氧化性','认识自燃现象'],
      probe:{ reagentKeys:['高锰酸钾','甘油'], expect:{ reacted:true, thermal:'exothermic', colorChange:true } },
      safety:['严禁大量','远距离观察','通风橱内操作'],
      errorSources:['配比控制不严','温度控制不当'],
      products3D: { main: 'MnO2', side: ['CO2','H2O'], effect:'自燃' } },

    { slug:'fe-cuso4-displacement', category:C.REDOX, difficulty:D.EASY,
      title:'铁与硫酸铜置换反应', estimatedMinutes:20,
      description:'铁钉浸入硫酸铜溶液，表面析出铜。',
      reagents:['铁钉（去锈、砂纸磨光）','0.5 mol/L 硫酸铜溶液'],
      apparatus:['试管','砂纸','镊子'],
      objectives:['认识金属活动性顺序','观察置换现象'],
      probe:{ reagentKeys:['铁','硫酸铜'], expect:{ reacted:true, colorChange:true } },
      safety:['废液回收，避免重金属污染'],
      products3D: { main: 'FeSO4', side: ['Cu'], color:'浅绿→红铜色' } },

    { slug:'zn-hcl-h2', category:C.REDOX, difficulty:D.EASY,
      title:'锌与稀盐酸制氢气', estimatedMinutes:15,
      description:'锌粒与稀盐酸剧烈产 H₂。',
      reagents:['锌粒','1 mol/L 稀盐酸'],
      apparatus:['启普发生器或锥形瓶+分液漏斗','导管','水槽','酒精灯'],
      objectives:['制取 H₂','认识金属活动性','验纯'],
      probe:{ reagentKeys:['锌','盐酸'], expect:{ reacted:true, gas:true, thermal:'exothermic' } },
      safety:['H₂ 验纯','远离明火','通风'],
      products3D: { main: 'ZnCl2', side: ['H2'], gas:'H2↑' } },

    /* ========== 沉淀 (3) ========== */
    { slug:'agcl-precipitate', category:C.PRECIPITATION, difficulty:D.EASY,
      title:'氯化银沉淀（银镜反应前置）', estimatedMinutes:15,
      description:'AgNO₃ + NaCl → 白色 AgCl 沉淀。',
      reagents:['0.1 mol/L 硝酸银溶液','0.1 mol/L 氯化钠溶液'],
      apparatus:['试管','胶头滴管','黑色背景纸'],
      objectives:['掌握氯离子检验','观察沉淀'],
      probe:{ reagentKeys:['硝酸银','氯化钠'], expect:{ reacted:true, precipitate:true } },
      safety:['AgNO₃ 避免沾染衣物皮肤','废液回收'],
      products3D: { main: 'AgCl', side: ['NaNO3'], precipitate:'白色' } },

    { slug:'baso5-precipitate', category:C.PRECIPITATION, difficulty:D.EASY,
      title:'硫酸钡沉淀（钡餐）', estimatedMinutes:15,
      description:'BaCl₂ + Na₂SO₄ → 白色 BaSO₄ 沉淀。',
      reagents:['0.1 mol/L 氯化钡溶液','0.1 mol/L 硫酸钠溶液'],
      apparatus:['试管','胶头滴管'],
      objectives:['掌握硫酸根检验','联系医学造影'],
      probe: { reagentKeys: ['氯化钡','硫酸钠'], expect: { reacted: true, precipitate: true } },
      safety:['BaCl₂ 有毒，避免入口'],
      products3D: { main: 'BaSO4', side: ['NaCl'], precipitate:'白色（不溶于酸）' } },

    { slug:'cuso4-naoh', category:C.PRECIPITATION, difficulty:D.EASY,
      title:'硫酸铜与氢氧化钠（蓝色沉淀）', estimatedMinutes:15,
      description:'CuSO₄ + 2NaOH → 蓝色 Cu(OH)₂ 絮状沉淀。',
      reagents:['0.5 mol/L 硫酸铜','1 mol/L 氢氧化钠'],
      apparatus:['试管','胶头滴管'],
      objectives:['认识碱与盐反应','观察蓝色絮状沉淀'],
      probe:{ reagentKeys:['硫酸铜','氢氧化钠'], expect:{ reacted:true, precipitate:true, colorChange:true } },
      safety:['NaOH 强碱，胶头滴管专用'],
      products3D: { main: 'Cu(OH)2', side: ['Na2SO4'], color:'蓝色絮状' } },

    /* ========== 气体 (4) ========== */
    { slug:'o2-prep-mno2', category:C.GAS, difficulty:D.MEDIUM,
      title:'用过氧化氢制氧气', estimatedMinutes:25,
      description:'2H₂O₂ —MnO₂→ 2H₂O + O₂↑，排水法收集。',
      reagents:['5% 过氧化氢溶液','二氧化锰粉末'],
      apparatus:['分液漏斗','蒸馏烧瓶','导管','水槽','集气瓶'],
      objectives:['掌握固液不加热制气','MnO₂ 催化','排水集气'],
      probe:{ reagentKeys:['过氧化氢'], expect:{ reacted:true, gas:true, catalyst:'MnO2' } },
      safety:['H₂O₂ 避免接触金属'],
      products3D: { main: 'H2O', side: ['O2'], gas:'O2↑' } },

    { slug:'nh3o2-prep', category:C.GAS, difficulty:D.MEDIUM,
      title:'实验室制氨气', estimatedMinutes:30,
      description:'2NH₄Cl + Ca(OH)₂ —Δ→ CaCl₂ + 2NH₃↑ + 2H₂O。',
      reagents:['氯化铵','氢氧化钙'],
      apparatus:['硬质大试管','酒精喷灯','铁架台','导管','棉花'],
      objectives:['掌握固固加热制气','向下排空气法'],
      probe:{ reagentKeys:['氯化铵','氢氧化钙'], expect:{ reacted:true, gas:true, thermal:'endothermic' } },
      safety:['管口略向下倾斜','棉花防止堵塞','湿润红色石蕊试纸验满'],
      products3D: { main: 'NH3', side: ['H2O','CaCl2'], gas:'NH3↑' } },

    { slug:'co2-prep', category:C.GAS, difficulty:D.MEDIUM,
      title:'实验室制二氧化碳', estimatedMinutes:25,
      description:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑，向上排空气法。',
      reagents:['大理石（碳酸钙）','1:2 稀盐酸'],
      apparatus:['启普发生器','导管','集气瓶'],
      objectives:['掌握固液不加热制气','向上排空气法','验满'],
      probe:{ reagentKeys:['碳酸钙','盐酸'], expect:{ reacted:true, gas:true } },
      safety:['稀盐酸 1:2 体积比','不可用浓盐酸（挥发强）','不可用硫酸（生成微溶 CaSO₄ 阻止反应）'],
      products3D: { main: 'CO2', side: ['H2O','CaCl2'], gas:'CO2↑' } },

    { slug:'gas-water-displacement', category:C.GAS, difficulty:D.EASY,
      title:'排水法收集气体（O₂ 集满演示）', estimatedMinutes:10,
      description:'O₂ 不易溶于水，瓶满置导管观察现象。',
      reagents:['氧气（同上制取）','水槽装满水','集气瓶装满水'],
      apparatus:['集气瓶','水槽','导管','毛玻璃片'],
      objectives:['理解排水集气','气密性检查'],
      probe:{ reagentKeys:['氧气'], expect:{ reacted:false } },
      safety:['玻璃片避免烫手'],
      products3D: { main: 'O2', side: [], method:'排水法' } },

    /* ========== 金属 (2) ========== */
    { slug:'metal-activity-cuso4', category:C.METAL, difficulty:D.MEDIUM,
      title:'金属活动性顺序探究', estimatedMinutes:40,
      description:'Fe / Cu / Zn / Mg 分别与稀硫酸、CuSO₄ 反应比较。',
      reagents:['铁丝','铜丝','锌粒','镁条','0.5 mol/L 稀硫酸','0.5 mol/L 硫酸铜'],
      apparatus:['试管','试管架','镊子','砂纸'],
      objectives:['金属活动性顺序','比较反应速率','书写化学方程式'],
      probe:{ reagentKeys:['镁','硫酸'], expect:{ reacted:true, gas:true } },
      safety:['稀硫酸使用后中和','废液分类收集'],
      products3D: { main: 'MgSO4', side: ['H2'], activity:'Mg > Zn > Fe > Cu' } },

    { slug:'iron-rust', category:C.METAL, difficulty:D.MEDIUM,
      title:'铁生锈条件探究', estimatedMinutes:90,
      description:'对比干燥、浸水、浸盐水、生锈速率。',
      reagents:['铁钉（去油、去锈）','蒸馏水','无水氯化钙（干燥剂）','饱和食盐水','植物油'],
      apparatus:['试管 5 支','橡皮塞','标签纸'],
      objectives:['认识铁生锈的必要条件','理解吸氧腐蚀'],
      probe:{ reagentKeys:['铁','水','氧气'], expect:{ reacted:true } },
      safety:['长期实验注意通风'],
      products3D: { main: 'Fe2O3·xH2O', side: [], condition:'水+氧气' } },

    /* ========== 有机 (2) ========== */
    { slug:'alcohol-fermentation', category:C.ORGANIC, difficulty:D.MEDIUM,
      title:'葡萄糖发酵制酒精', estimatedMinutes:120,
      description:'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂↑（酵母菌发酵）。',
      reagents:['葡萄糖溶液','酵母粉','温水'],
      apparatus:['锥形瓶','气球','恒温水浴'],
      objectives:['生物催化','认识发酵','联系食品工业'],
      probe:{ reagentKeys:['葡萄糖','酵母'], expect:{ reacted:true, gas:true } },
      safety:['避免杂菌污染','产物酒精浓度低，不可饮用'],
      products3D: { main: 'C2H5OH', side: ['CO2'], product:'乙醇' } },

    { slug:'silver-mirror', category:C.ORGANIC, difficulty:D.HARD,
      title:'银镜反应（葡萄糖）', estimatedMinutes:30,
      description:'葡萄糖 + 银氨溶液 → 银镜（葡萄糖含醛基）。',
      reagents:['5% 葡萄糖溶液','2% 硝酸银','稀氨水','氢氧化钠'],
      apparatus:['洁净试管','水浴锅'],
      objectives:['认识醛基','银镜反应','试管必须油光洁净'],
      probe:{ reagentKeys:['葡萄糖','银氨'], expect:{ reacted:true, precipitate:true, colorChange:true } },
      safety:['银氨溶液现配','不可久置（爆炸性）','废液加盐酸处理'],
      products3D: { main: 'Ag', side: ['CH3COONH4','NH3'], effect:'银镜' } },

    /* ========== 电化学 (2) ========== */
    { slug:'zn-cu-galvanic', category:C.ELECTROCHEM, difficulty:D.MEDIUM,
      title:'铜锌原电池', estimatedMinutes:30,
      description:'Zn + Cu 电极浸入稀硫酸，电子从点燃中析出。',
      reagents:['锌片','铜片','稀硫酸','导线','电流计'],
      apparatus:['烧杯','电极夹','导线','灵敏电流计','开关'],
      objectives:['原电池原理','电极反应','能量方向'],
      probe:{ reagentKeys:['锌','硫酸'], expect:{ reacted:true, gas:true, thermal:'exothermic' } },
      safety:['稀硫酸使用后中和'],
      products3D: { main: 'ZnSO4', side: ['H2','Cu'], emf:'~0.8V' } },

    { slug:'electrolysis-cucl2', category:C.ELECTROCHEM, difficulty:D.HARD,
      title:'电解氯化铜溶液', estimatedMinutes:30,
      description:'石墨电极电解 CuCl₂ 溶液，阴极析出 Cu，阳极析出 Cl₂。',
      reagents:['0.5 mol/L 氯化铜溶液','石墨电极','直流电源','导线'],
      apparatus:['U 形管','石墨电极 2 支','直流电源','导线','湿润淀粉 KI 试纸'],
      objectives:['电解原理','阴极阳极反应','两极定性比较'],
      probe:{ reagentKeys:['氯化铜'], expect:{ reacted:true, gas:true } },
      safety:['Cl₂ 有毒，通风橱内操作','湿润淀粉 KI 试纸验阳极'],
      products3D: { main: 'Cu', side: ['Cl2'], cathode:'Cu', anode:'Cl2↑' } },

    /* ========== 配位 (2) ========== */
    { slug:'nh4cu-deepblue', category:C.COORDINATION, difficulty:D.MEDIUM,
      title:'铜氨配离子（深蓝色）', estimatedMinutes:20,
      description:'CuSO₄ + 4NH₃·H₂O → 深蓝色 [Cu(NH₃)₄]²⁺。',
      reagents:['0.5 mol/L 硫酸铜','浓氨水'],
      apparatus:['试管','胶头滴管'],
      objectives:['认识配离子','理解配位键'],
      probe:{ reagentKeys:['硫酸铜','氨水'], expect:{ reacted:true, colorChange:true } },
      safety:['浓氨水挥发强，通风橱操作'],
      products3D: { main: '[Cu(NH3)4]2+', side: ['H2O'], color:'深蓝' } },

    { slug:'fe3-scn-blood-red', category:C.COORDINATION, difficulty:D.MEDIUM,
      title:'铁硫氰根配离子（血红色）', estimatedMinutes:15,
      description:'Fe³⁺ + 3SCN⁻ → 血红色 [Fe(SCN)]²⁺ 配离子。',
      reagents:['0.1 mol/L 氯化铁','0.1 mol/L 硫氰化钾'],
      apparatus:['试管','胶头滴管'],
      objectives:['Fe³⁺ 检验','配位平衡','可逆反应'],
      probe:{ reagentKeys:['氯化铁','硫氰化钾'], expect:{ reacted:true, colorChange:true } },
      safety:['FeCl₃ 避免沾染衣物（黄色污渍）'],
      products3D: { main: '[Fe(SCN)]2+', side: [], color:'血红色' } }
  ];

  MR.experiments = EXPERIMENTS;
  MR.experimentCategories = C;
  MR.experimentDifficulties = D;

  /* ---- 关键词扫描：从文献中识别可能的实验 ---- */
  MR.experimentKeywords = {
    'acid-base-titration': ['滴定','中和滴定','酸碱滴定','酚酞','指示剂','滴定管'],
    'hcl-naoh-neutralization-thermo': ['中和热','量热计','保温杯','温度变化','ΔH'],
    'vinegar-soda': ['食醋','小苏打','气球','厨房实验'],
    'cuo-h2-reduction': ['H₂','氧化铜','还原','黑色变红','硬质玻璃管','尾气处理'],
    'kmno4-glycerol': ['高锰酸钾','甘油','自燃','强氧化','紫色褪色'],
    'agcl-precipitate': ['硝酸银','AgNO₃','白色沉淀','氯离子检验','银镜前置'],
    'o2-prep-mno2': ['过氧化氢','H₂O₂','二氧化锰','制氧气','排水法','催化剂'],
    'co2-prep': ['大理石','碳酸钙','稀盐酸','制二氧化碳','启普发生器','石灰水变浑浊'],
    'zn-cu-galvanic': ['原电池','铜锌','电流计','负极','正极','电极反应'],
    'electrolysis-cucl2': ['电解','氯化铜','石墨电极','阴极','阳极','氯气'],
    'silver-mirror': ['银镜','葡萄糖','醛基','银氨溶液','水浴加热'],
    'fe-cuso4-displacement': ['置换','铁钉','硫酸铜','红色析出','金属活动性'],
    'fe3-scn-blood-red': ['铁离子','硫氰化钾','血红色','配离子','Fe³⁺'],
    'limewater-co2': ['石灰水','石灰水变浑浊','澄清石灰水','CO₂检验','二氧化碳'],
    'metal-activity-cuso4': ['金属活动性','活泼性','顺序','比较反应'],
    'acid-base-titration': ['滴定终点','标准溶液','未知浓度']
  };

  /* ---- 跨类别聚合 ---- */
  MR.experimentsByCategory = {};
  EXPERIMENTS.forEach(function(e){
    if (!MR.experimentsByCategory[e.category]) MR.experimentsByCategory[e.category] = [];
    MR.experimentsByCategory[e.category].push(e);
  });

})();