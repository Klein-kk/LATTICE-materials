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
      products3D: { main: '[Fe(SCN)]2+', side: [], color:'血红色' } },

    /* ========== 材料加工与合成 (8) ========== */

    { slug:'al6061-solution-aging', category:'金属与热处理', difficulty:D.MEDIUM,
      title:'6061 铝合金固溶+时效热处理', estimatedMinutes:180,
      description:'挤压/轧制态 6061 铝合金在 530±5 °C 固溶 30–60 min，水淬后于 175 °C 时效 6–12 h，得到 β″ 相强化。',
      reagents:['6061 铝合金挤压型材','无水乙醇','金相砂纸','Keller 试剂'],
      apparatus:['箱式电阻炉','淬火槽（冷水）','时效炉','硬度计','万能试验机','金相显微镜'],
      objectives:['理解 T6 工艺','测试峰时效强度','观察晶内 β″析出相'],
      probe:{ reagentKeys:['6061 铝合金'], expect:{ reacted:true, paperType:'heat-treatment' } },
      safety:['高温炉穿戴防护手套','淬火介质防烫伤','乙醇防火'],
      errorSources:['固溶温度偏离 ±10°C 导致过烧/欠烧','时效时间不足导致硬度未峰','淬火延迟导致析出'],
      products3D: { main: 'Al-alloy-6061-T6', side: ['Mg2Si'], hardness:'约 95 HRB', peakStrength:'约 290 MPa' },
      paperKeys:['al-alloy', 'solution-treatment', 'aging', '6061'] },

    { slug:'basalt-epoxy-composite', category:'复合材料', difficulty:D.MEDIUM,
      title:'玄武岩纤维/环氧树脂复合材料制备', estimatedMinutes:240,
      description:'用 KH-550 硅烷偶联剂处理玄武岩纤维表面，与环氧树脂 E-51 + 固化剂按 30:100 质量比模压或真空导入（VARTM）成型。',
      reagents:['玄武岩纤维短切或织物','环氧树脂 E-51','固化剂','KH-550 偶联剂','无水乙醇'],
      apparatus:['VARTM 真空导入系统','模压机','真空干燥箱','万能试验机','SEM'],
      objectives:['理解界面改性','优化纤维/树脂比例','测试弯曲/拉伸强度'],
      probe:{ reagentKeys:['玄武岩纤维','环氧树脂'], expect:{ reacted:true, paperType:'composite-curing' } },
      safety:['树脂避免接触皮肤','真空泵放空','乙醇防火'],
      errorSources:['树脂粘度波动','偶联剂水解不当','气泡残留在层合板'],
      products3D: { main: 'Basalt-Epoxy', side: ['Cured-E51'], tensileStrength:'约 220 MPa' },
      paperKeys:['composite', 'basalt', 'epoxy', 'KH-550'] },

    { slug:'nvp-carbon-coating', category:'电池材料合成', difficulty:D.HARD,
      title:'Na3V2(PO4)3 / C 溶胶-凝胶碳包覆', estimatedMinutes:300,
      description:'以 V2O5、NaOH、NH4H2PO4 为原料，柠檬酸为螯合剂 + 碳源，溶胶-凝胶 + 高温煅烧（700 °C / Ar）得到碳包覆 NASICON。',
      reagents:['五氧化二钒 V2O5','氢氧化钠 NaOH','磷酸二氢铵 NH4H2PO4','柠檬酸','葡萄糖'],
      apparatus:['磁力搅拌水浴','旋转蒸发仪','管式炉','手套箱','蓝电测试系统'],
      objectives:['理解 NASICON 结构','优化碳源','测试半电池容量与循环'],
      probe:{ reagentKeys:['Na3V2(PO4)3','柠檬酸'], expect:{ reacted:true, paperType:'sol-gel-carbon-coating' } },
      safety:['手套箱操作金属钠','V2O5 氧化性粉尘','管式炉高温'],
      errorSources:['磷钒摩尔比偏离','碳过多降低容量','煅烧温度不足结相'],
      products3D: { main: 'NASICON-C', side: ['C-coated'], capacity:'~113 mAh/g' },
      paperKeys:['NASICON', 'Na3V2(PO4)3', 'cathode', 'sodium-ion'] },

    { slug:'alkali-activated-cement', category:'胶凝材料', difficulty:D.MEDIUM,
      title:'矿渣/偏高岭土碱激发胶凝材料', estimatedMinutes:1440,
      description:'矿渣粉 + 偏高岭土按 7:3 复掺，水玻璃（Na2SiO3 模数 1.4）作激活剂，标准养护 28 d 测试抗压强度。',
      reagents:['矿渣粉 GBFS','偏高岭土','水玻璃','蒸馏水','标准砂'],
      apparatus:['行星搅拌机','水泥胶砂振实台','标准养护箱','万能试验机 300 kN','XRD'],
      objectives:['理解碱激发机理','优化配比','测试 28d 抗压强度'],
      probe:{ reagentKeys:['矿渣','偏高岭土','水玻璃'], expect:{ reacted:true, paperType:'alkali-activation' } },
      safety:['水玻璃碱性，避免飞溅','戴护目镜'],
      errorSources:['养护湿度不够','水玻璃模数波动','骨胶比异常'],
      products3D: { main: 'CASH-gel', side: [], strength28d:'30–60 MPa' },
      paperKeys:['alkali-activated', 'metakaolin', 'slag', 'C-A-S-H'] },

    { slug:'mg-alloy-aging', category:'金属与热处理', difficulty:D.MEDIUM,
      title:'AZ91 镁合金时效处理', estimatedMinutes:300,
      description:'固溶 415°C × 12h，水淬后 200°C 时效 4–16h，析出 β-Mg17Al12 强化相。',
      reagents:['AZ91 镁合金铸锭','无水乙醇','苦味酸腐蚀液'],
      apparatus:['箱式电阻炉','硬度计','万能试验机','SEM'],
      objectives:['理解 Mg-Al 析出','测试峰时效硬度','观察 β 相'],
      probe:{ reagentKeys:['AZ91'], expect:{ reacted:true, paperType:'heat-treatment' } },
      safety:['镁合金粉尘严禁明火','高温防护'],
      products3D: { main: 'Mg-alloy-aged', side: ['Mg17Al12'], hardness:'约 75 HV' },
      paperKeys:['magnesium', 'AZ91', 'aging', 'beta-phase'] },

    { slug:'pvdf-binder-prep', category:'电池材料合成', difficulty:D.EASY,
      title:'PVDF 粘结剂 + 导电炭黑浆料制备', estimatedMinutes:120,
      description:'PVDF 溶于 NMP，加入导电炭黑 Super P + 正极活性物质（90:5:5），磁力搅拌 12 h 均匀涂布铝箔。',
      reagents:['聚偏氟乙烯 PVDF','导电炭黑 Super P','N-甲基吡咯烷酮 NMP','铝箔','正极活性物质'],
      apparatus:['磁力搅拌器','涂布机','真空烘箱','手套箱'],
      objectives:['理解浆料流变','控制粘度','涂布厚度均匀'],
      probe:{ reagentKeys:['PVDF','导电炭黑'], expect:{ reacted:true, paperType:'binder-slurry' } },
      safety:['NMP 通风橱操作','PVDF 粉尘避免吸入'],
      products3D: { main: 'PVDF-binder', side: [], viscosity:'5000–8000 mPa·s' },
      paperKeys:['PVDF', 'binder', 'slurry', 'coating'] },

    { slug:'steel-annealing', category:'金属与热处理', difficulty:D.EASY,
      title:'钢的退火处理', estimatedMinutes:240,
      description:'冷轧态钢板加热至 Ac1 以下 20–30°C 保温 1 h，炉冷至 600°C 后空冷，消除冷作硬化。',
      reagents:['Q235 冷轧钢板','无水乙醇','4% 硝酸酒精'],
      apparatus:['箱式电阻炉','硬度计','金相显微镜'],
      objectives:['理解再结晶','消除应力','观察等轴晶'],
      probe:{ reagentKeys:['钢'], expect:{ reacted:true, paperType:'heat-treatment' } },
      safety:['高温防护','炉门烫伤'],
      errorSources:['保温温度偏移','冷却速率过快'],
      products3D: { main: 'Annealed-steel', side: [], hardness:'降低 30%' },
      paperKeys:['annealing', 'recrystallization', 'steel'] },

    { slug:'glass-fiber-drawing', category:'复合材料', difficulty:D.HARD,
      title:'玻璃纤维拉丝', estimatedMinutes:180,
      description:'将玻璃原料熔融后通过铂金漏板拉伸为 5–24 μm 直径玻璃纤维。',
      reagents:['E-玻璃配合料','浸润剂'],
      apparatus:['玻璃熔炉','铂金漏板','绕丝机','张力仪'],
      objectives:['理解玻璃熔融拉丝','控制直径','测试拉伸强度'],
      probe:{ reagentKeys:['玻璃纤维'], expect:{ reacted:true } },
      safety:['熔融玻璃高温','铂金泄漏','绕丝缠绕'],
      errorKeys:['glass-fiber', 'drawing', 'fiber-diameter'] }
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
    'acid-base-titration': ['滴定终点','标准溶液','未知浓度'],
    /* paper-aware 关键词（material-science） */
    'al6061-solution-aging': ['6061','铝合金','固溶','时效','T6','挤压型材','β″','析出相','抗拉强度','金相','Keller'],
    'basalt-epoxy-composite': ['玄武岩纤维','复合材料','环氧树脂','E-51','VARTM','模压','偶联剂','KH-550','界面','层合板'],
    'nvp-carbon-coating': ['NASICON','Na3V2(PO4)3','磷酸钒钠','钠离子电池','正极','碳包覆','溶胶凝胶','柠檬酸','半电池','倍率'],
    'alkali-activated-cement': ['矿渣','偏高岭土','水玻璃','碱激发','C-A-S-H','抗压强度','胶凝材料','Na2SiO3','模数'],
    'mg-alloy-aging': ['AZ91','镁合金','固溶','时效','β-Mg17Al12','铸态'],
    'pvdf-binder-prep': ['PVDF','粘结剂','浆料','NMP','涂布','铝箔','Super P','导电炭黑','正极浆料'],
    'steel-annealing': ['退火','再结晶','冷轧','Q235','Ac1','消除应力','冷作硬化','等轴晶'],
    'glass-fiber-drawing': ['玻璃纤维','拉丝','漏板','浸润剂','E-玻璃','直径','张力'],
    'nh4cu-deepblue': ['铜氨','配离子','深蓝色','络合'],
    'alcohol-fermentation': ['发酵','酵母','葡萄糖','酒精','酿造']
  };

  /* ---- 跨类别聚合 ---- */
  MR.experimentsByCategory = {};
  EXPERIMENTS.forEach(function(e){
    if (!MR.experimentsByCategory[e.category]) MR.experimentsByCategory[e.category] = [];
    MR.experimentsByCategory[e.category].push(e);
  });

  /* ---- 由正文扫描最优匹配实验 ----
     返回 { slug, hits, weight, experiment } 数组，按命中分排序 */
  function matchExperiment(rawText) {
    rawText = (rawText || '').toLowerCase();
    var hits = [];
    Object.keys(MR.experimentKeywords).forEach(function(slug){
      var keys = MR.experimentKeywords[slug] || [];
      var hit = 0, weighted = 0;
      keys.forEach(function(k){
        var kk = String(k).toLowerCase();
        if (!kk) return;
        var found = false;
        try {
          var re = new RegExp(kk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          var m = rawText.match(re);
          if (m && m.length) { hit += m.length; weighted += m.length * kk.length; found = true; }
        } catch (e) { /* ignore */ }
        if (!found && rawText.indexOf(kk) !== -1) hit += 1;
      });
      if (hit > 0) {
        var exp = null;
        for (var i = 0; i < EXPERIMENTS.length; i++) {
          if (EXPERIMENTS[i].slug === slug) { exp = EXPERIMENTS[i]; break; }
        }
        hits.push({ slug: slug, hits: hit, weight: weighted, experiment: exp });
      }
    });
    hits.sort(function (a, b) {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.hits - a.hits;
    });
    return hits;
  }
  MR.matchExperiment = matchExperiment;

  /* ---- 由 profile（材料/变量/仪器）反推 ----
     返回与 matchExperiment 同样 shape，但不依赖 rawText */
  function findExperimentsForProfile(profile) {
    if (!profile) return [];
    var text = '';
    (profile.materials || []).forEach(function (m) {
      text += ' ' + (typeof m === 'string' ? m : (m.name || ''));
    });
    (profile.instruments || []).forEach(function (i) {
      text += ' ' + (typeof i === 'string' ? i : JSON.stringify(i));
    });
    return matchExperiment(text);
  }
  MR.findExperimentsForProfile = findExperimentsForProfile;

})();