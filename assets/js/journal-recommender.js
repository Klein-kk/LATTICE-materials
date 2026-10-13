/* ============================================================
   LATTICE · 期刊投稿推荐器
   基于 domain + language + perf 给出 5 个候选期刊，
   每个有"为什么推荐" + 收稿要求 + 链接。
   数据来源：journal-submission-assistant (735034777) 与
   常见材料/化学/能源类 SCI 期刊汇总（手工标注，2026-Q4）
   ============================================================ */
window.MR = window.MR || {};
(function () {

  /* 期刊数据库（40 种覆盖材料/化学/能源/综合） */
  var JOURNALS = [
    /* 综合 Top */
    { id: 'nature', name: 'Nature', publisher: 'Springer Nature', impactFactor: 64.8, scope: '综合',
      url: 'https://www.nature.com/nature/submit-your-manuscript',
      domains: ['综合','材料','化学','物理'], languages: ['en'],
      requirements: ['原创性极高','通用科学意义','不超过 8 页','图形不超过 8 个'],
      whyField: '影响因子顶刊的原创性 / 跨学科意义 / 简短的篇幅与图数限制。',
      tier: 'T1' },

    { id: 'science', name: 'Science', publisher: 'AAAS', impactFactor: 56.9, scope: '综合',
      url: 'https://www.science.org/content/page/science-information-authors',
      domains: ['综合','材料','化学','物理','生物'], languages: ['en'],
      requirements: ['原创性极高','通用科学意义','研究文章 ≤4500 词 / 4 图','同行评议严格'],
      whyField: 'AAAS 旗舰刊，与 Nature 并列。对稿件的"跨学科影响"要求最高。',
      tier: 'T1' },

    /* 材料顶刊 */
    { id: 'nature-materials', name: 'Nature Materials', publisher: 'Springer Nature', impactFactor: 41.2, scope: '材料',
      url: 'https://www.nature.com/nmat/submit-your-manuscript',
      domains: ['材料','金属','陶瓷','高分子','纳米'], languages: ['en'],
      requirements: ['原始材料研究','影响深远','格式文章 ≤ 5000 词','图表 ≤ 8'],
      whyField: '材料类顶刊，偏好"新机理 / 新材料体系 / 量化设计"。',
      tier: 'T1' },

    { id: 'advanced-materials', name: 'Advanced Materials', publisher: 'Wiley-VCH', impactFactor: 27.4, scope: '材料',
      url: 'https://onlinelibrary.wiley.com/journal/15214095',
      domains: ['材料','金属','陶瓷','高分子','纳米','复合材料'], languages: ['en'],
      requirements: ['重要新成果','通常 5-8 页','图不超过 8 个'],
      whyField: 'Wiley-VCH 旗舰材料刊。投稿周期短，国内外接受量较大。',
      tier: 'T1' },

    { id: 'materials-science-and-engineering-r', name: 'Materials Science and Engineering: R', publisher: 'Elsevier', impactFactor: 26.8, scope: '材料',
      url: 'https://www.sciencedirect.com/journal/materials-science-and-engineering-r-reports',
      domains: ['材料','金属','陶瓷','高分子'], languages: ['en'],
      requirements: ['综述类','邀请综述优先','6000-10000 词','图不超过 25'],
      whyField: 'R 系列专门发表综述，只投综述性论文（不是研究性论文）。',
      tier: 'T1' },

    { id: 'acta-materialia', name: 'Acta Materialia', publisher: 'Elsevier', impactFactor: 9.4, scope: '金属/材料',
      url: 'https://www.sciencedirect.com/journal/acta-materialia',
      domains: ['金属','材料','复合材料'], languages: ['en'],
      requirements: ['金属结构与性能基础研究','通常 ≤ 8000 词'],
      whyField: '金属类传统顶刊。偏好"新工艺 / 新机制 / 定量设计"。',
      tier: 'T1' },

    { id: 'scripta-materialia', name: 'Scripta Materialia', publisher: 'Elsevier', impactFactor: 5.3, scope: '金属',
      url: 'https://www.sciencedirect.com/journal/scripta-materialia',
      domains: ['金属','材料'], languages: ['en'],
      requirements: ['短篇 ≤ 3500 词','≤ 4 图','立意清晰'],
      whyField: 'Acta 系列短文刊，金属/陶瓷类短期论文首选。',
      tier: 'T2' },

    { id: 'materials-letters', name: 'Materials Letters', publisher: 'Elsevier', impactFactor: 3.1, scope: '材料',
      url: 'https://www.sciencedirect.com/journal/materials-letters',
      domains: ['材料','金属','陶瓷','高分子'], languages: ['en'],
      requirements: ['≤ 3000 字','≤ 4 图','新结果优先'],
      whyField: 'Elsevier 材料类短文学报，新人 / 短期研究友好。',
      tier: 'T3' },

    /* 化学顶刊 */
    { id: 'jacs', name: 'JACS (Journal of the American Chemical Society)', publisher: 'ACS', impactFactor: 14.4, scope: '化学',
      url: 'https://publish.acs.org/publish/journals/research/submit-to-jacs',
      domains: ['化学','有机','无机','催化'], languages: ['en'],
      requirements: ['新化学成果','图不超过 8','参考文献不限'],
      whyField: 'ACS 旗舰化学刊，对新机理 / 新分子优先。',
      tier: 'T1' },

    { id: 'angewandte-chemie', name: 'Angewandte Chemie International Edition', publisher: 'Wiley-VCH', impactFactor: 16.6, scope: '化学',
      url: 'https://onlinelibrary.wiley.com/journal/15213773',
      domains: ['化学','有机','无机','催化'], languages: ['en'],
      requirements: ['大综合 + 图不超过 5'],
      whyField: 'Chem 兄弟刊，对"概念突破 / 跨学科"友好。',
      tier: 'T1' },

    { id: 'chemical-engineering-journal', name: 'Chemical Engineering Journal', publisher: 'Elsevier', impactFactor: 13.3, scope: '化工',
      url: 'https://www.sciencedirect.com/journal/chemical-engineering-journal',
      domains: ['化工','化学','能源','催化','电池'], languages: ['en'],
      requirements: ['工程应用导向','研究性 8000 词'],
      whyField: 'Elsevier 化工旗舰，偏好"过程工程 / 工业放大"。',
      tier: 'T1' },

    /* 能源/电池 */
    { id: 'nature-energy', name: 'Nature Energy', publisher: 'Springer Nature', impactFactor: 49.7, scope: '能源',
      url: 'https://www.nature.com/nenergy/submit-your-manuscript',
      domains: ['能源','电池','储能','催化'], languages: ['en'],
      requirements: ['原创性极高','能源领域突破'],
      whyField: '能源类顶刊；投稿要求"新机理 + 数据完整 + 反复复现"。',
      tier: 'T1' },

    { id: 'joule', name: 'Joule (Cell Press)', publisher: 'Cell Press', impactFactor: 38.9, scope: '能源',
      url: 'https://www.cell.com/joule/home',
      domains: ['能源','电池','储能','催化'], languages: ['en'],
      requirements: ['≤ 7000 词','突破性应用导向'],
      whyField: 'Cell Press 能源刊，影响因子顶刊 + 应用导向。',
      tier: 'T1' },

    { id: 'energy-storage-materials', name: 'Energy Storage Materials', publisher: 'Elsevier', impactFactor: 18.9, scope: '储能',
      url: 'https://www.sciencedirect.com/journal/energy-storage-materials',
      domains: ['电池','储能','电极材料'], languages: ['en'],
      requirements: ['研究 / 综述','8000-12000 词'],
      whyField: 'Elsevier 储能旗舰；偏好电池正极 / 负极 / 电解液体系。',
      tier: 'T1' },

    { id: 'journal-of-power-sources', name: 'Journal of Power Sources', publisher: 'Elsevier', impactFactor: 8.1, scope: '电池',
      url: 'https://www.sciencedirect.com/journal/journal-of-power-sources',
      domains: ['电池','储能','电极材料'], languages: ['en'],
      requirements: ['研究 / 综述','≤ 10000 词'],
      whyField: '电池领域老牌经典刊，电池 / 储能类标准投稿目标。',
      tier: 'T2' },

    { id: 'electrochimica-acta', name: 'Electrochimica Acta', publisher: 'Elsevier', impactFactor: 5.5, scope: '电化学',
      url: 'https://www.sciencedirect.com/journal/electrochimica-acta',
      domains: ['电化学','电池','腐蚀'], languages: ['en'],
      requirements: ['电化学过程基础研究'],
      whyField: '电化学经典刊，电池 / 腐蚀 / 沉积物过程首选。',
      tier: 'T2' },

    /* 中等 */
    { id: 'materials-and-design', name: 'Materials & Design', publisher: 'Elsevier', impactFactor: 7.6, scope: '材料',
      url: 'https://www.sciencedirect.com/journal/materials-and-design',
      domains: ['材料','金属','陶瓷','高分子','复合材料'], languages: ['en'],
      requirements: ['设计导向','新工艺 / 新方法'],
      whyField: '材料设计与工艺研究友好。',
      tier: 'T2' },

    { id: 'composites-part-a', name: 'Composites Part A: Applied Science and Manufacturing', publisher: 'Elsevier', impactFactor: 8.1, scope: '复合材料',
      url: 'https://www.sciencedirect.com/journal/composites-part-a-applied-science-and-manufacturing',
      domains: ['复合材料','composite','fiber','basalt','glass fiber','纤维'], languages: ['en'],
      requirements: ['复合材料研究','≤ 10000 词'],
      whyField: '复合材料经典刊，纤维 / 树脂 / 界面是核心。',
      tier: 'T2' },

    { id: 'composites-part-b', name: 'Composites Part B: Engineering', publisher: 'Elsevier', impactFactor: 12.7, scope: '复合材料',
      url: 'https://www.sciencedirect.com/journal/composites-part-b-engineering',
      domains: ['复合材料','composite','fiber','basalt','glass fiber','纤维','树脂','epoxy'], languages: ['en'],
      requirements: ['复合材料研究'],
      whyField: 'Composites B 较 A 影响因子高，结构 + 性能研究优先。',
      tier: 'T1' },

    { id: 'international-journal-of-plasticity', name: 'International Journal of Plasticity', publisher: 'Elsevier', impactFactor: 9.4, scope: '塑性/金属',
      url: 'https://www.sciencedirect.com/journal/international-journal-of-plasticity',
      domains: ['金属','塑性','材料'], languages: ['en'],
      requirements: ['塑性 / 加工 / 损伤理论'],
      whyField: '金属塑性 / 加工数值仿真与传统顶刊。',
      tier: 'T1' },

    /* 水泥/胶凝 */
    { id: 'cement-and-concrete-research', name: 'Cement and Concrete Research', publisher: 'Elsevier', impactFactor: 11.3, scope: '胶凝',
      url: 'https://www.sciencedirect.com/journal/cement-and-concrete-research',
      domains: ['胶凝','cement','concrete','混凝土','alkali','alkali-activated','C-A-S-H'], languages: ['en'],
      requirements: ['水泥 / 混凝土基础或工程'],
      whyField: '水泥 / 混凝土领域顶刊，碱激发研究友好。',
      tier: 'T1' },

    { id: 'construction-and-building-materials', name: 'Construction and Building Materials', publisher: 'Elsevier', impactFactor: 7.4, scope: '建材',
      url: 'https://www.sciencedirect.com/journal/construction-and-building-materials',
      domains: ['建材','胶凝','cement','concrete','混凝土','alkali-activated'], languages: ['en'],
      requirements: ['建材研究 / 应用'],
      whyField: '建筑材料经典刊，碱激发 / 新拌混凝土 / 耐久性研究友好。',
      tier: 'T2' },

    /* 中文体刊（极重要） */
    { id: 'cjo', name: 'Chinese Journal of Chemistry (中国化学)', publisher: 'Wiley', impactFactor: 5.4, scope: '化学',
      url: 'https://onlinelibrary.wiley.com/journal/16147065',
      domains: ['化学','材料','催草'], languages: ['en'],
      requirements: ['中文 / 英文均可','影响因子友好'],
      whyField: '中国化学会旗舰中文刊，对国内学者投稿友好。',
      tier: 'T2' },

    { id: 'cjmr', name: 'Chinese Journal of Materials Research (材料研究学报)', publisher: 'Elsevier', impactFactor: 0.8, scope: '材料',
      url: 'https://www.sciencedirect.com/journal/chinese-journal-of-materials-research',
      domains: ['材料','金属','高分子'], languages: ['zh'],
      requirements: ['中文稿件','实用导向'],
      whyField: '材料类中文核心，国内投稿重要途径。',
      tier: 'T3' },

    { id: 'tiyu-mat-journal', name: 'Material Reports 材料导报', publisher: '材料导报编辑部', impactFactor: 0.4, scope: '材料',
      url: 'http://www.mat-rep.com',
      domains: ['材料','综合'], languages: ['zh'],
      requirements: ['中文综述 / 进展报告'],
      whyField: '国内材料类核心（如发中文 zazhi）。',
      tier: 'T3' },

    /* 综述/评论 */
    { id: 'materials-today', name: 'Materials Today', publisher: 'Elsevier', impactFactor: 21.1, scope: '材料综述',
      url: 'https://www.sciencedirect.com/journal/materials-today',
      domains: ['材料','金属','陶瓷','高分子','生物'], languages: ['en'],
      requirements: ['综述或趋势报告','6000-12000 词'],
      whyField: 'Elsevier 综述旗舰，材料趋势 / 重大进展首选。',
      tier: 'T1' },

    { id: 'chem-rev', name: 'Chemical Reviews', publisher: 'ACS', impactFactor: 51.4, scope: '化学综述',
      url: 'https://publish.acs.org/publish/journals/research/submit-to-chemical-reviews',
      domains: ['化学'], languages: ['en'],
      requirements: ['邀请综述为主','全局性 15000+ 词'],
      whyField: '化学综述顶刊，免费科研报告可被其他杂志引用。',
      tier: 'T1' },

    /* 复合材料 */
    { id: 'fibers-and-polymers', name: 'Fibers and Polymers', publisher: 'Springer', impactFactor: 2.4, scope: '纤维',
      url: 'https://www.springer.com/journal/12221',
      domains: ['复合材料','纤维','高分子'], languages: ['en'],
      requirements: ['纤维 / 高分子研究'],
      whyField: '纤维类专门刊，玄武岩纤维 / 玻纤研究友好。',
      tier: 'T3' },

    { id: 'polymer-composites', name: 'Polymer Composites', publisher: 'Wiley', impactFactor: 3.4, scope: '复合材料',
      url: 'https://onlinelibrary.wiley.com/journal/15480569',
      domains: ['复合材料','高分子'], languages: ['en'],
      requirements: ['高分子 + 复合材料'],
      whyField: '高分子复合材料领域，纤维 + 树脂体系友好。',
      tier: 'T3' },

    /* 临床/分析不算 */
    { id: 'analytical-chemistry', name: 'Analytical Chemistry', publisher: 'ACS', impactFactor: 6.7, scope: '分析',
      url: 'https://publish.acs.org/publish/journals/research/submit-to-analytical-chemistry',
      domains: ['化学','分析'], languages: ['en'],
      requirements: ['分析 / 检验'],
      whyField: '分析方向顶刊，本论文如含有新分析手段适用。',
      tier: 'T1' },

    { id: 'green-chemistry', name: 'Green Chemistry', publisher: 'RSC', impactFactor: 9.8, scope: '绿色',
      url: 'https://www.rsc.org/journals-books-databases/about-journals/green-chemistry/',
      domains: ['化学','绿色'], languages: ['en'],
      requirements: ['绿色化学 / 可持续'],
      whyField: '绿色 / 可持续化学 RSC 旗舰，绿色工艺 / 材料友好。',
      tier: 'T1' },

    /* 物理 + 金属物理 */
    { id: 'physical-review-materials', name: 'Physical Review Materials', publisher: 'APS', impactFactor: 3.5, scope: '物理/材料',
      url: 'https://journals.aps.org/prmaterials/',
      domains: ['材料','物理','金属'], languages: ['en'],
      requirements: ['≥ 4000 词','6-12 图','APS 模板'],
      whyField: 'APS 物理/材料基础研究顶刊。',
      tier: 'T2' },

    { id: 'materials-today-energy', name: 'Materials Today: Energy', publisher: 'Elsevier', impactFactor: 9.0, scope: '能源',
      url: 'https://www.sciencedirect.com/journal/materials-today-energy',
      domains: ['能源','材料'], languages: ['en'],
      requirements: ['能源材料 / 储能'],
      whyField: 'Materials Today 子刊，能源 + 材料友好。',
      tier: 'T2' },

    { id: 'journal-of-materials-chemistry-a', name: 'Journal of Materials Chemistry A', publisher: 'RSC', impactFactor: 11.9, scope: '材料',
      url: 'https://www.rsc.org/journals-books-databases/about-journals/journal-of-materials-chemistry-a/',
      domains: ['材料','能源','电池'], languages: ['en'],
      requirements: ['研究 / 综述','创新材料 + 应用'],
      whyField: 'RSC 旗舰材料刊，能源 + 应用 + 综述全面。',
      tier: 'T1' },

    { id: 'acs-applied-materials-interfaces', name: 'ACS Applied Materials & Interfaces', publisher: 'ACS', impactFactor: 8.3, scope: '材料',
      url: 'https://publish.acs.org/publish/journals/research/submit-to-ami',
      domains: ['材料','界面','纳米'], languages: ['en'],
      requirements: ['应用导向材料研究'],
      whyField: 'ACS 应用材料旗舰，对应用导向友好。',
      tier: 'T1' },

    { id: 'journal-of-the-mechanical-behavior-of-biomedical-materials', name: 'Journal of the Mechanical Behavior of Biomedical Materials', publisher: 'Elsevier', impactFactor: 3.3, scope: '生物材料',
      url: 'https://www.sciencedirect.com/journal/journal-of-the-mechanical-behavior-of-biomedical-materials',
      domains: ['材料','生物'], languages: ['en'],
      requirements: ['生物材料力学'],
      whyField: '生物材料力学专门刊。',
      tier: 'T2' },

    { id: 'smart-materials-and-structures', name: 'Smart Materials and Structures', publisher: 'IOPscience', impactFactor: 4.1, scope: '智能材料',
      url: 'https://iopscience.iop.org/journal/0964-1726',
      domains: ['材料','智能'], languages: ['en'],
      requirements: ['智能 / 响应材料'],
      whyField: 'IOP 智能材料专门刊。',
      tier: 'T2' },

    { id: 'journal-of-alloys-and-compounds', name: 'Journal of Alloys and Compounds', publisher: 'Elsevier', impactFactor: 5.8, scope: '合金',
      url: 'https://www.sciencedirect.com/journal/journal-of-alloys-and-compounds',
      domains: ['金属','合金','材料'], languages: ['en'],
      requirements: ['合金 / 金属间化合物研究'],
      whyField: 'Elsevier 合金研究友好刊。',
      tier: 'T2' },

    { id: 'international-journal-of-hydrogen-energy', name: 'International Journal of Hydrogen Energy', publisher: 'Elsevier', impactFactor: 7.2, scope: '氢能',
      url: 'https://www.sciencedirect.com/journal/international-journal-of-hydrogen-energy',
      domains: ['氢能','能源','催化剂'], languages: ['en'],
      requirements: ['氢能相关研究'],
      whyField: 'Elsevier 氢能源旗舰。',
      tier: 'T2' }
  ];

  /* 给定 profile（paper）做推荐 */
  function recommend(profile) {
    profile = profile || {};
    var domain = profile.domain || '';
    /* 中文 domain 翻译 */
    var domainMap = {
      '材料':'材料', '金属':'金属', '陶瓷':'陶瓷', '高分子':'高分子', '复合':'复合材料',
      '纳米':'纳米', '化学':'化学', '催草':'催草', '电池':'电池', '能源':'能源',
      '储能':'储能', '电极':'电池', '胶凝':'胶凝', '水泥':'胶凝', '生物':'生物',
      '物理':'物理', '合金':'金属', '塑性':'金属', '智能':'材料', '纤维':'复合材料',
      '建材':'建材', '氢能':'能源', '分析':'化学'
    };
    if (domainMap[domain]) domain = domainMap[domain];
    var pfPerf = (profile.perf || []).map(function (p) { return p.name; }).join(' ');
    var materialKeywords = (profile.materials || []).map(function (m) {
      return typeof m === 'string' ? m : (m.name || '');
    }).join(' ');

    var text = (domain + ' ' + pfPerf + ' ' + materialKeywords + ' ' + ((profile.title || '') || '')).toLowerCase();

    var candidates = [];
    JOURNALS.forEach(function (j) {
      var score = 0;
      var reasons = [];
      j.domains.forEach(function (d) {
        if (text.indexOf(d.toLowerCase()) >= 0 || text.indexOf(d) >= 0) {
          score += 30;
          reasons.push('领域匹配: ' + d);
        }
      });
      var keys = {
        '复合材料': ['fiber','fibre','basalt','glass fiber','碳纤维'],
        '电池': ['cycle','capacity','nvp','nasicon','正极','negative electrode','正负极','锂','钠'],
        '能源': ['energy','储','electrochem','electrochemistry','电化学'],
        '胶凝': ['c-a-s-h','alkali-activated','碱激发','metakaolin','偏高岭土','slag','矿渣','cement','凝胶'],
        '化学': ['organic','inorganic','catalysis','reaction','phenol','分子'],
        '材料': ['tensile','拉伸','强度','硬度','hardness','强度'],
        '金属': ['alloy',' aluminum','aluminium','steel','iron','copper','mg','钛'],
        '物理': ['first-principles','计算','quantum','physics']
      };
      Object.keys(keys).forEach(function (k) {
        if (j.domains.some(function (d) { return (d.toLowerCase() || '').indexOf(k.toLowerCase()) >= 0; })) {
          if (keys[k].some(function (kw) { return text.indexOf(kw) >= 0; })) { score += 15; reasons.push('关键词命中: ' + k); }
        }
      });
      if (j.languages.indexOf('zh') >= 0 && /中文|中国/.test(text)) { score += 8; reasons.push('中文友好'); }
      if (j.languages.indexOf('en') >= 0) score += 4;
      if (j.tier === 'T1') score += 5;
      if (j.tier === 'T2') score += 8;
      if (j.tier === 'T3') score += 12;

      candidates.push({
        journal: j,
        score: score,
        reasons: reasons.length ? reasons : [j.whyField]
      });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    return candidates.slice(0, 6);
  }

  /* 上传论文格式检查（启发式） */
  function checkSubmission(text) {
    var issues = [];
    var words = (text || '').split(/\s+/).filter(Boolean);
    if (words.length < 100) issues.push({ lv: 'must', t: '论文过短（< 100 词）', d: '建议补充正文后再投稿' });
    var titles = (text || '').split('\n').filter(function (s) { return /^#+\s/.test(s) || /^\d+\s/.test(s); });
    if (titles.length < 3) issues.push({ lv: 'sig', t: '缺少章节标题', d: '建议使用 Markdown ## 或编号格式让编辑看到结构' });
    if (!/reference|bibliography|参考文献|引用/i.test(text)) issues.push({ lv: 'sig', t: '未发现参考文献章节', d: '建议补充 References / Bibliography' });
    if (!/@|gmail|edu|ac\.|.cn|@.*\.com|author|通讯/i.test(text)) issues.push({ lv: 'warn', t: '未发现通讯作者邮箱', d: '建议在首页加 ORCID 与通讯邮箱' });
    return issues;
  }

  /* AI 痕迹检测（启发式：模板句、连接词、首句连接等） */
  function aiLikelihood(text) {
    text = text || '';
    var items = [
      { k: '模板化首句连接', v: (text.match(/(首先|其次|最后|综上所述|值得注意的是|在当今)/g) || []).length },
      { k: '套话模板(如 X 对 Y 至关重要)', v: (text.match(/至关重要|具有重要意义|发挥重要作用|为了|因此|由此可见/g) || []).length },
      { k: '过分列表化', v: (text.match(/(^|\n)\s*[-*]\s+/g) || []).length },
      { k: '平均句长偏差', v: Math.min(40, Math.round(Math.abs(wordsAvg(text) - 18) / 2)) },
      { k: '专业词汇密度', v: Math.min(40, Math.round((text.match(/[A-Za-z]{5,}/g) || []).length / words.length * 1000)) }
    ];
    var total = 0;
    items.forEach(function (i) { total += Math.min(20, i.v); });
    return { items: items, score: Math.min(100, total) };
  }
  function wordsAvg(text) {
    var sents = (text || '').split(/[。.!?！？]/).filter(Boolean);
    var lens = sents.map(function (s) { return s.split(/\s+/).filter(Boolean).length; });
    return lens.length ? lens.reduce(function (a, b) { return a + b; }, 0) / lens.length : 0;
  }

  /* 暴露 */
  MR.journals = {
    list: JOURNALS,
    recommend: recommend,
    checkSubmission: checkSubmission,
    aiLikelihood: aiLikelihood
  };

})();
