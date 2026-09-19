# LATTICE 架构评估与重构方案（Archi · 系统架构师）

> 版本：v1.1（v1.0 分层方案 + 主理人 verification-lead.md 实测证据标定）
> 日期：2026-09-18
> 依据：已通读 `index.html`、`pdftext.js`（761 行）、`extract.js`（972）、`domain.js`（177）、`paper.js`（212）、`views2-stages.js` 环节 01-02、`views2-core.js`、`app.js`、`app.css` 动效令牌；以及 `_dev/incident/brief.md` 与 `_dev/incident/verification-lead.md`。函数名/行号均为实读确认；不确定处标「待验证」。

## 0. 一页结论

1. 本次事故不是"一个 bug"，而是**管线没有层间契约**：L1（版面还原）产出了 27,702 字符的残次品（空格率≈0），但 L1→L3→L5 之间没有任何质量闸门，垃圾被逐层放大成 14 个区块的噪声界面。修 bug 必须配"熔断器"，否则下次换个 PDF producer 还会复发。
2. 中文化应做成独立的 **L4 本地化层**，插在 L3（抽取）与 L5（呈现）之间，不动抽取逻辑；词典原料 80% 已在 `domain.js` 里（12 个性能族中英词表 + 仪器/试剂/工序英文词表），只差"对齐"和"调用"。
3. 界面问题本质是**信息架构问题而非视觉问题**：环节 01 的 `imp.render()` 一次字符串拼接 14 个区块。方案：入口层二选一 → 渐进披露四层 → 导航从"10 步清单"改为"3 阶段工作台"。动效规范直接复用现有 CSS 令牌（--t-fast 140ms / --t-mid 240ms / --t-slow 460ms / --ease）。

---

## A. 抽取与呈现管线的分层设计

### A.1 目标分层（ASCII 图）

```
┌─────────────────────────────────────────────────────────────────┐
│ L0  字节流 / 过滤器                                              │
│     ArrayBuffer → 解码后的内容流 + 字体编码表                      │
│     现在：pdftext.js extract() 步骤1-3                            │
├─────────────────────────────────────────────────────────────────┤
│ L1  版面还原（定位空白 + 阅读顺序 + 换行）          ★ 事故点      │
│     内容流 → 带空格/换行的行序列 + 质量指标(spaceRatio等)          │
│     现在：pdftext.js walk()（只做了换行，没做空白）                 │
├─────────────────────────────────────────────────────────────────┤
│ L2  分词与句段                                                   │
│     行序列 → 句子/段落/章节/语言判定                              │
│     现在：extract.js 的 deGlue/mergeParagraphs/splitSections      │
│        （散落在 L3 入口里，且没有真正的英文分词）                   │
├─────────────────────────────────────────────────────────────────┤
│ L3  字段抽取                                                     │
│     句段 → 原料/仪器/变量/指标/工序/参考文献（带 evidence）        │
│     现在：extract.js analyze() 及 extract* 系列函数               │
├─────────────────────────────────────────────────────────────────┤
│ L4  语言本地化  ★ 新增                                           │
│     抽取结果(原文) → 抽取结果 + zh 显示字段 + 术语出处            │
│     现在：不存在                                                  │
├─────────────────────────────────────────────────────────────────┤
│ L5  画像与呈现                                                   │
│     profile 构建(paper.js) + 视图渲染(views2-*)                  │
└─────────────────────────────────────────────────────────────────┘
         每层输出带 { data, quality, warnings } 三段式契约
         quality 低于阈值 → 熔断：向上返回"降级指令"，不向下传垃圾
```

### A.2 逐层契约与现状落点

**L0 字节流/过滤器**
- 契约：输入 ArrayBuffer；输出 `{ streams:[{objNum, dict, text}], fonts, nameMap, pageOrder, coverage }`。
- 现状落点：`pdftext.js extract()` 内部——对象切片（L580-602）、`applyFilters()`（L258，过滤器链）、`inflateAuto/inflateRawJS`（L54-160，纯 JS DEFLATE）、`buildEncArray()`（L423）、`parseCMap()`（L293）、字体表构建（L622-651）。
- 降级行为：单流解码失败 → 跳过并计数（现在 `applyFilters` 返回 null 后还回退 `inflateAuto`→`latin1(raw)`，这个"把压缩字节当文本"的兜底本身有风险，待 code-reviewer 复核）；**整体覆盖率 < 50% 的流解码失败 → 硬失败，提示改用粘贴正文**。

**L1 版面还原 ★**
- 契约：输入内容流+字体表；输出 `{ lines:[{text, page, size}], metrics:{ spaceRatio, latinWordAvgLen, lineCount }, quality, degrade }`。**关键：空格必须在这里还原**，因为 TJ kern 值、Td/TD/Tm 水平位移这些位置信息只存在于内容流，出了 L1 就永久丢失。
- 现状落点：`walk()`（pdftext.js L520-572）。已确认三个空白丢失通道：
  1. TJ 数组：walker 检测 `inArray`（L539-541）后逐段 `decodeWith` 拼接，**数组里的 kern 数字被当普通字符跳过**（L569 `i++`）——实测样本 kern ≈ -191~-242 为空格、≈ -10 为字距（见 verification-lead.md）；
  2. `Td`（L557-566）：只取一个数做"换行判定"，水平位移 tx 从不用于补空格；且样本实际使用 **`TD`（大写）**——walker 只匹配 `ch==='T' && content[i+1]==='d'`，`TD` 整族丢失，换行与水平跳格信号全灭；
  3. `Tm` 绝对定位无分支——样本首页每段都是 `a b c d e f Tm`，每个 Tm 定位块之间的位置关系全丢；`Tw`/`Tc` 未读取（样本为 `0 Tc`/`0 Tw`，kern 是唯一信号，但其它 producer 可能用 Tw）。
  阅读顺序已有（页面树 Kids→Page→Contents，L661-710）——这是 L1 里做对了的部分。
- 降级行为：见 A.3 失败契约表（F1-F6）。

**L2 分词与句段**
- 契约：输入 L1 行序列；输出 `{ sentences, paragraphs, sections, lang }`（lang 由 CJK 占比判定，现有 `textIsCJK` 逻辑 extract.js L760-761 上移至此）。
- 现状落点：`deGlue()`（extract.js L88-114，断行黏连修复——本质是 L1/L2 修复却住在 L3 文件里）、`stripRefMarks()`（L67）、`mergeParagraphs()`（L134）、`splitSections()`（L158）。**注意：L2 没有英文分词**——L3 全部靠正则 `\b` 和 substring 直接在原文上匹配，这就是为什么无空格会全线崩溃（domain.js 英文词表里大量多词短语如 'tensile strength'、'scanning electron microscope'，无空格时一个都命不中）。
- 降级行为：`deGlue` 只能修"两词黏连"，对"全文无空格"无效 → L2 检测 `latinWordAvgLen` 仍超标 → 上抛熔断，不做"词典硬切分"（过度工程且错误率高，见 ADR-001 备选分析）。

**L3 字段抽取**
- 契约：输入 L2 结构；输出现有 analysis schema（不变）：`{ title, abstract, keywords, materials, instruments, standards, variables, indicators, steps, formulation, references, paperType, concepts, confidence, warnings, quality }`，每项带 `evidence`。
- 现状落点：`analyze()`（L745）+ `extractMaterials`（L181）/ `extractInstruments`（L220）/ `extractStandards`（L265）/ `extractVariables`（L282）/ `extractIndicators`（L403）/ `extractSteps`（L491）/ `extractFormulation`（L542）/ `extractReferences`（L569）/ `extractConcepts`（L669）。
- 降级行为：字段缺失 → "未报告" + warnings（已有，L949-955，保留）；新增：`confidence < 35` 或上游 `quality==='hard-fail'` 时返回 `degraded:true`（或入口直接短路拒绝），供 L5 决定渲染"恢复卡"而非 14 个区块。

**L4 语言本地化 ★ 新增**（详见 B 节）
- 契约：输入 analysis + `lang`；输出同一 schema，每个可译字段增加 `{ zh, zhVia: 'glossary'|'rule'|'none' }`，原文字段原样保留。
- 降级：查不到译名 → `zhVia:'none'`，界面显示原文 + "待译"标记，**绝不阻断流水线，绝不机翻乱编**。

**L5 画像与呈现**
- 契约：`paper.js build()`（L64）消费 L4 结果产出 profile；视图只读 profile，不直接读 `MR.state.analysis`。
- 现状落点：画像 `build/makeModel/chartSpecs`（paper.js）；呈现 `views2-stages.js`、`views2-core.js`、`views2-paper.js`；外壳 `app.js`（renderPhase/renderRail/renderMain）。
- 降级：profile 缺项 → "未报告"（已有）；新增 L5 熔断渲染：analysis.degraded 时环节 01 只渲染「题录卡 + 恢复引导」两块。

### A.3 L1 失败契约（完整判定表）

L1 输出契约 `{ lines, metrics, quality, degrade }`，失败模式与下游行为绑定：

| # | L1 失败模式 | 检测信号（metrics） | quality | 下游契约行为 |
|---|---|---|---|---|
| F1 | 文字层缺失（扫描件） | `totalChars < 200` | hard-fail | **熔断于 L1**：不进入 L2/L3；UI 恢复卡「该 PDF 无文字层，请粘贴正文」（现有 `fromFile` 已有此路径，保留） |
| F2 | 空格还原失败/未实现 | Latin 文本且 `spaceRatio < 0.08` 或 `latinWordAvgLen > 14` | hard-fail | **熔断于 L1**：不进入 L2/L3；UI 恢复卡「该 PDF 的文字定位方式暂不支持，请粘贴正文」。**禁止** L3 在黏连文本上运行（本次事故的放大器） |
| F3 | 换行还原失败 | `lineCount / totalChars` 异常低（如 < 1 行/500 字符） | degraded | 进入 L2 但挂 `layout-warning`；L3 的摘要推断/章节切分标记低可信；UI 第 4 层诊断自动展开 |
| F4 | 部分字体解码失败 | `undecodedGlyphs / totalGlyphs > 5%` | degraded | 继续管线；受影响行标记；confidence 扣分（与 extract.js 现有 confidence 通道对接） |
| F5 | 流解码失败（过滤器不支持） | `decodedStreams / totalStreams < 50%` | hard-fail | 熔断，提示换 DOCX/粘贴正文 |
| F6 | 阅读顺序无法确定 | 页面树遍历失败 | degraded | 回退现有"散文度排序"兜底（pdftext.js L716-729），标 warning |

**关键原则（写入层间契约文档）：**
1. **hard-fail ≠ 报错弹窗**，而是"恢复卡 + 明确替代路径"——用户永远有下一步可走；
2. **degraded 必须随数据流动**：quality 标志进 L2 → L3 → profile，最终体现在 UI 的质量色点与诊断层，不得在任一环节被吞掉；
3. **下游有权拒绝上游**：L3 入口第一行检查 `quality === 'hard-fail'` 直接短路返回，不信任调用方。这是"各层独立可测"的前提（回归语料可逐层注入残次输入验证契约）。

**本次事故的映射**：样本触发 F2+F3（spaceRatio≈0、27,702 字符仅个位数换行），按新契约会在 L1 出口熔断——而不是像现在这样产出 40 分置信度的噪声再铺满 14 个区块。这是"L2/L3 默默拿到垃圾输入照样产出看起来像分析结果的东西"的制度性修复。

### A.4 当前实现的跨层耦合点（为什么这次难以局部修复）

1. **L1 的位置信息在出口处被销毁**：`extract()` 只 return 一个字符串（pdftext.js L741）。空格/字号/坐标全丢，下游任何层都无法补救 → 修复只能改 L1，但 L1 没有独立的质量输出，改了对不对没有反馈回路。
2. **L1/L2 修复逻辑住在 L3**：`deGlue()` 在 extract.js 里。上次修 Nature 断行黏连改的是抽取引擎文件，本次修 Springer 空白又要动解析器文件——**同一症状修在两个文件里**，且互相不知道对方存在。
3. **L3 直接用正则假设"词边界存在"**：`\bSEM\b`、多词短语 substring 匹配遍布 extract.js/domain.js。层契约里没有"上游保证词间有空格"这一条，也没人检查。
4. **视图层越过画像直接读分析结果并自行推导**：`views2-stages.js` 的 `AN()`（L9）直接读 `MR.state.analysis`；环节 02 里"研究空白"的 matrix 推导（L601-607）是视图在算业务逻辑。加 L4 时如果视图各读各的，翻译要改 20 处 → 必须让视图只读 profile，L4 只改一处。
5. **无熔断，UI 渲染与数据质量解耦失败**：`imp.render()` 无条件拼 14 块；`handleDocFiles` 的唯一闸门是"字符数 < 200"（app.js L597），27,702 字符的残次品轻松通过。用户看到的"乱七八糟"= 14 块 × 噪声。
6. **质量信号各自为政**：`confidence` 在 extract.js L939-945 算，`missing` 在 paper.js L118-122 算，`warnings` 又是另一套——没有统一的 `quality` 通道贯穿 L1→L5。

---

## B. L4 英文→中文本地化层设计

### B.1 翻译范围

| 翻译 | 不翻译 |
|---|---|
| 研究对象/原料名（carboxymethyl chitosan → 羧甲基壳聚糖） | 化学式与缩写（AgNO₃、CMC、Ag NPs） |
| 变量名（concentration → 浓度、temperature → 温度） | 仪器型号（S-4800、SU8010、Spectrum Two） |
| 指标名（antibacterial rate → 抗菌率） | 标准编号（GB/T、ISO 10993、ASTM E8） |
| 工序动词（annealed → 退火、spin-coating → 旋涂） | 期刊名、厂商名（Sigma-Aldrich）、DOI |
| 章节标题（Experimental → 实验部分） | 人名、地名、机构名 |
| 摘要与关键词（展示层翻译） | evidence 原文依据（必须保持原文，供回溯） |

### B.2 可追溯性设计

```js
// L4 输出项示例（schema 增量，向后兼容）
{ name: 'carboxymethyl chitosan',      // 原文，永不改
  zh: '羧甲基壳聚糖',
  zhVia: 'glossary',                   // glossary | rule | none
  evidence: '...using carboxymethyl chitosan (CMC) and L-methionine...' }
```

- **原文与译文并存**：`name` 保留原文，`zh` 为译文；界面首次出现显示「羧甲基壳聚糖（carboxymethyl chitosan）」，后续只显示中文，hover 出原文 tooltip。
- **来源标注**：`zhVia` 三级——`glossary`（词典命中，可信）、`rule`（规则生成，如 "X concentration"→"X浓度"，界面加 ⋄ 标记）、`none`（未译，显示原文+「待译」chip）。用户在界面可纠正，纠正写入用户术语表（见 B.3 落地形式）。
- **术语一致性**：同一篇文档内建立 `Map<en, zh>`，一处确定后全文统一，避免同一术语两种译法。

### B.3 词典从哪来

原料已在 `domain.js`，问题是**中英列表各自独立、未对齐**：
- `PROPERTY_FAMILIES`（domain.js L14-27）：12 个性能族，每族 `words`(中) + `en`(英) ——覆盖力学/热学/电化学/光学/磁学/化学耐候/加工/结构/生物/传感/吸附/声学。**注意：en 与 words 是两个无序数组，不是 1:1 对照**——需要人工对齐成 `{en, zh}` 条目（约 350 条，一次性工作，建议交 tech-writer，与任务 #5 衔接）。
- `INSTRUMENT_LEX`（L70-83，中文 100+ 条）↔ `INSTRUMENT_LEX_EN`（L121-130，英文 70+ 条）：同样需对齐；缩写映射（SEM→扫描电子显微镜）可优先做，约 40 条覆盖 90% 场景。
- `PROCESS_VERBS_EN`（L148-154，80+ 词）→ 中文工序：sintered→烧结、annealed→退火、calcined→煅烧……注意英文列表含变形（synthesize/synthesized/synthesis），建表时归一到词根。
- `REAGENT_LEX_EN` / `MATERIAL_NOUN_EN`（L133-145）：chitosan→壳聚糖、graphene oxide→氧化石墨烯等。
- 变量后缀词已在 extract.js `SUFFIX`（L284）里有英文一半（concentration/temperature/...），抽出来做对照表。
- **落地形式**：`domain.js` 新增 `MR.domain.TERM_MAP = [{en, zh, cat}...]`，并暴露 `MR.domain.lookupEn(term)`。扩展机制：用户纠正存入 `localStorage['MR_USER_GLOSSARY']`，查询时用户表优先于内置表（零依赖、无后端约束下的唯一合理存储）。

### B.4 纯前端无网络的实现策略（优先级降序）

1. **词典最长匹配**（主力）：TERM_MAP 按长度降序，先匹配多词短语（'limiting oxygen index'）再匹配单词；词边界用 `\b`。
2. **规则翻译**（补充）：名词短语模式——"X concentration/ratio/temperature/content"→"X浓度/比例/温度/含量"；动词过去分词→工序（"was annealed at"→"退火"）；单位与数值原样保留。
3. **摘要/关键词整段翻译**：纯前端做不到质量可接受的整句翻译 → 设计为**可选项**：若用户配置了外部翻译端点（设置面板填 API URL+Key），L4 调用之并在界面标注「机器翻译·仅供参考」；未配置则摘要保留英文原文 + 关键词逐词词典翻译。降级链完整，断网不影响主流程。
4. **绝不做的**：不内置伪"AI 翻译"（违背平台"不臆造"的核心原则，与 extract.js L6-7 注释精神一致）。

---

## C. 界面信息架构重构（核心交付）

### C.0 现状诊断

`imp.render()`（views2-stages.js L227-470）一次性拼接：head → 10 张方向卡片 → 拖拽区 → 示例文档+已核验文献 →（载入后）8 个指标条 → 题录面板 → 解析自检 → 综述面板 → 指标族归类 → 原料表 → 仪器表 → 变量表 → 指标表 → 工序配方 → 缺失项 → 标准 → 参考文献。无默认折叠、无主次、无引导。用户原话"一个页面摆上来全部都是乱七八糟"即指此。

### C.1 新信息层级（ASCII 图）

```
┌─ 第 0 层 · 入口（未载入文献时，整屏只有这个）────────────────┐
│                                                              │
│              从一篇文献开始你的研究                            │
│                                                              │
│   ┌───────────────────┐   ┌───────────────────┐              │
│   │  📄 导入文献       │   │  🧭 先选研究方向   │              │
│   │  拖入 PDF/DOCX     │   │  10 个材料方向     │              │
│   │  或点击选择/粘贴   │   │  稍后导入也可以    │              │
│   └───────────────────┘   └───────────────────┘              │
│                                                              │
│         没有文献？用示例文档走一遍 →（安静的三级入口）          │
└──────────────────────────────────────────────────────────────┘
                         │ 导入成功
                         ▼
┌─ 第 1 层 · 解析结果一句话（默认展开，永远可见）───────────────┐
│  ✓ 已解析《A hybrid binder of carboxymethyl…》                │
│    研究型论文 · 英文 · 已译为中文显示 · 质量良好               │
│    [ 下一步：研究定位 → ]   （唯一的主按钮）                   │
├──────────────────────────────────────────────────────────────┤
│ 第 2 层 · 这篇文献讲了什么（默认展开）                         │
│   标题（中/英） · 摘要（来源chip） · 关键词 chips              │
├──────────────────────────────────────────────────────────────┤
│ 第 3 层 · 抽到了什么（折叠为一条概览，点击展开）               │
│   ▸ 概览条：原料5 · 仪器4 · 变量3 · 指标6 · 工序8 · 文献32     │
│   ▸ 展开后为手风琴：每次只开一块（原料/仪器/变量/指标/工序/   │
│     配方/参考文献），块头带计数徽章与质量色点                  │
├──────────────────────────────────────────────────────────────┤
│ 第 4 层 · 解析诊断（默认折叠；有 warning 时才自动展开）        │
│   ▸ 解析自检 3 条提示 · 原文缺失项 · 标准依据                  │
└──────────────────────────────────────────────────────────────┘
```

- **第 0 层文案**（极简，全文如上，无任何功能说明长段）：现有 head 里 100+ 字的平台介绍（L237 的 sub）删除，原则性说明挪进「关于」弹窗。
- **材料方向从 10 张卡片改为一个下拉/单选抽屉**：不是第一优先级信息，默认「自动识别」，10 方向收进二级选择器。
- **进入下一步的条件**：`paper 已载入 && (variables≥1 || paperType==='review')` → 主按钮可用；否则主按钮置灰并显示恢复路径（粘贴正文/换一篇/看诊断）。
- **熔断时的第 1 层**：解析质量低时第 1 层变成「⚠ 该 PDF 的文字定位方式暂不支持」恢复卡，第 2-4 层不渲染——这是 A.3 熔断在 UI 的落点。

### C.2 导航结构

- **保留左侧栏，但从"10 项清单"改为"3 阶段工作台"**：现有 PHASES（app.js L21-25）已定义三阶段（Ⅰ立项与设计 / Ⅱ实验与数据 / Ⅲ论文与评审），左侧栏默认只展开当前阶段的 3-4 个环节，其余阶段折叠为一行标题。
- **消除"10 个必做步骤"压力**：① 环节不再用 01-10 大编号做视觉主角（`MR.head` 的「环节 01 / 10」弱化为一行 mono-xs 灰字，主标题改为任务名如「导入与解析」）；② 未解锁环节显示为灰色 ghost 项 + 一句话价值描述（"写完实验后回到这里"），不显示为待办；③ phasebar 已有完成度条，保留；④ 「运行整条流水线」按钮从顶栏主按钮降级为次级（用户应被引导逐层走，而非面对一个黑盒批量按钮）。
- **顶栏保留**：上传文献 / 导出中心 / 当前课题名。推理轨迹侧栏与 RUN LOG 默认收起（专家工具，不是新手首屏）。

### C.3 鼠标交互与动效规范（具体到毫秒与缓动）

统一令牌（全部沿用 app.css 现有定义，L76-80）：`--ease: cubic-bezier(.22,.61,.36,1)`，`--ease-in: cubic-bezier(.4,0,.6,1)`，`--t-fast:140ms`，`--t-mid:240ms`，`--t-slow:460ms`。

| 场景 | 行为 | 时长/缓动 |
|---|---|---|
| 卡片 hover | `translateY(-1px)` + 阴影升一级 + 边框色加深 | 140ms --ease |
| 卡片按下 | `translateY(0) scale(.995)` | 90ms --ease-in |
| focus-visible | 2px 外描边淡入，不做位移动画 | 140ms --ease |
| 入口双卡（交互感） | 指针跟随的径向高光：`::before` 的 `--mx/--my` 随 mousemove 更新（rAF 节流，仅 transform/opacity），离开 240ms 淡出；仅 `pointer:fine` 启用 | 跟随帧率；淡出 240ms --ease |
| 层级进入（drill-in） | 新层 `opacity 0→1 + translateY(8px)→0` | 240ms --ease |
| 层级离开 | 仅 `opacity→0`（不做位移，避免抖动） | 140ms --ease-in |
| 手风琴展开 | `grid-template-rows: 0fr→1fr` + 内容 80ms 延迟淡入 | 240ms --ease |
| 视图切换 | 沿用 `viewIn` 460ms，但**子块 stagger 从 9 级砍到 4 级**（现状 app.css L297-306 有 9 级 345ms 延迟，信息多时感觉拖沓） | 460ms，stagger 40ms×4 |
| 加载 | 骨架屏 shimmer（现有 .skel 1.4s）+ 分步进度文案（"解码字体… 还原版面… 抽取字段…"对应 L0-L3，顺带教育用户） | shimmer 1.4s linear infinite |
| 成功反馈 | 主按钮 ✓ 打勾 + 绿色描边脉冲一次（不循环） | 460ms --ease |
| `prefers-reduced-motion` | 现有两处全局规则（app.css L313、L759）保留；**补充**：关闭指针跟随高光、stagger、shimmer（改静态骨架），展开/切换改瞬时或 1ms 透明度过渡。JS 侧 pointer 特效启动前必须查 `matchMedia('(prefers-reduced-motion: reduce)')` | — |

性能红线（配合 ADR-005）：动画只碰 `transform`/`opacity`；指针特效走 CSS 变量+rAF，不写 layout 属性；`backdrop-filter` 只允许出现在模态层小面积（现状 modal blur(2px) 可保留）；不给整页挂 `will-change`；单帧动画节点数 < 200。

---

## D. 架构决策记录（ADR）

### ADR-001: 空格还原放在 L1（版面还原），不在 L2（分词）补
**状态：** Proposed（阈值已实测标定）｜ **日期：** 2026-09-18
**背景：** Springer/Elsevier 用 TJ 负 kern 与 TD/Tm 位移实现词间空白，walker（pdftext.js L520-572）全部忽略，导致英文黏连。修复点选 L1 还是 L2 决定信息能不能拿回来。
**选项分析：**

| 维度 | A: L1 还原（推荐） | B: L2 词典切分 |
|---|---|---|
| 信息来源 | kern 值/位移就在内容流里，**确定性** | 位置信息已丢失，只能猜 |
| 复杂度 | Med（walk 里加三条规则：TJ 数字阈值、TD 识别、Tm 位置跟踪） | High（英文分词器 + 歧义消解） |
| 错误率 | 低（实测空格 kern ≈ -191~-242 vs 字距 ≈ -10，约 20 倍区分度） | 高（"therapist"→"the rapist"类错误） |
| 可验证性 | 可输出 spaceRatio 做断言 | 无法自证正确 |

**决策：** 选 A。三条修复规则（已标定）：
- **R1 — TJ kern → 空格**：`|kern| / 1000 × fontSize ≥ 0.6 × spaceWidth` → 插 1 个空格；`≥ 1.6 × spaceWidth` → 插 2 个。spaceWidth 取值顺序：① 简单字体 `/Widths[32]`；② Type0 `/W` 数组 space 条目；③ 回退 0.25 em（经验区间 0.20–0.35 em）。交叉验证：195/1000 × 9.96pt ≈ 1.94pt，与 9.96pt 字体空格宽（≈2.5pt）同量级；字距 10.2/1000 × 9.96 ≈ 0.10pt 远在阈值下，`(chem)-10.2(icals)` 正确连成 chemicals。CJK 字体（Type0/Identity）默认不启用此规则。
- **R2 — TD/Tm 操作符**：识别改为 `/^(Td|TD|Tm)\b/`；`TD`/`Td` 的 ty≠0 → 换行，|tx| ≥ 0.6×spaceWidth → 补空格；`Tm` 维护文本矩阵位置，e/f 位移按同阈值判定。样本实测使用 `13.9874 0 TD` 换行 + `Tm` 绝对定位，二者是当前解析器的盲区。
- **R3 — Tw/Tc**：样本为 `0 Tc`/`0 Tw`（kern 是唯一信号），但 L1 仍读取 Tw/Tc 状态备用；遇 Tw≠0 样本时启用（待验证）。
- 同时 L1 输出 spaceRatio / latinWordAvgLen / lineCount 质量指标（供 A.3 契约）。
- 性能注记：R1 判定在现有 TJ 扫描循环内是 O(1) 增量，无第二遍扫描。

**后果：** 修复是确定性的且有回归断言抓手；代价是要动 walk() 的核心循环（code-reviewer 把关正确性与性能）。L2 的 deGlue 保留为独立防线。

### ADR-002: 翻译层做在纯前端（词典+规则），不引入后端
**状态：** Proposed ｜ **日期：** 2026-09-18
**背景：** 用户要求英文文献中文化。平台零依赖、file:// 可开、无后端是硬约束（index.html 直接 script 引入，无构建）。
**选项分析：**

| 维度 | A: 前端词典+规则（推荐） | B: 调外部翻译 API | C: 自建后端翻译服务 |
|---|---|---|---|
| 覆盖目标 | 字段级翻译 100%（变量/指标/工序/对象都是术语，词典天然适合） | 整句好但术语未必准 | 同 B |
| 成本 | 一次性对齐 ~600 条术语 | 密钥管理 + 按量计费 | 服务器 + 运维 |
| 离线可用 | ✅ | ❌ | ❌ |
| 与"不臆造"原则 | 完全一致 | 机翻会编 | 同 B |

**决策：** A 为主，B 作为摘要整段翻译的**可选增强**（用户自配端点，标注「机器翻译」），缺省时降级为原文+逐词翻译。C 否决。
**后果：** 术语质量取决于 TERM_MAP 对齐工作（交 tech-writer）；摘要整段翻译体验有上限，但用户核心诉求（"实验数据、研究对象、变量翻译成中文"）100% 覆盖。

### ADR-003: 10 环节流水线不砍，改为"渐进式工作台"呈现
**状态：** Proposed ｜ **日期：** 2026-09-18
**背景：** 用户嫌"一个页面全是乱七八糟"且要"一层一层分层交互"。10 环节是产品骨架（赛事叙事也是"10 环节流水线"），砍掉损失大。
**选项分析：**

| 维度 | A: 保留10环节+渐进披露（推荐） | B: 砍成3-4个大步骤 |
|---|---|---|
| 改动面 | 只改呈现层（rail/head/折叠） | 状态机、trace、runAll 全要改 |
| 赛事叙事 | 保留"10 环节"卖点 | 削弱 |
| 用户感知 | "一次只看一层"→ 减压 | 同样减压 |
| 风险 | 低 | 高（数据流耦合在 STAGES 数组上） |

**决策：** A。环节模型不动（`MR.STAGES`/`MR.PHASES` 保留），呈现层做三件事：左栏按阶段折叠、环节内渐进披露（C.1 四层）、下一步按钮驱动的主线导航。
**后果：** 重构限于 views2-* 与 app.css；`runStage/runAll` 不动。环节 01 的 render() 需要按层拆成子函数（这是本次最大的前端工作量，约重写 imp 视图的 60%）。

### ADR-004: 信息密度策略：默认低密度，密度权力交给用户
**状态：** Proposed ｜ **日期：** 2026-09-18
**背景：** 专家用户（要核对 evidence）与新手用户（要简约）共用同一界面。现有 Tweaks 面板已有"信息密度"切换（index.html L137-141，compact/cozy），但目前只改字号间距，不改信息结构。
**决策：** 结构密度（折叠/展开的默认态）也纳入密度档位：默认（cozy）= C.1 的渐进披露；紧凑（compact）= 全部手风琴默认展开、诊断常开、左栏全展开——接近现状界面，供专家/演示复核用。密度状态持久化到 localStorage。
**备选：** 只做字号密度（现状）——否决，因为用户抱怨的是"东西多"不是"字大"。
**后果：** 视图渲染要读 `data-density` 决定默认展开态；专家路径不损失，新手路径达标。待验证：compact 档是否保留全部 14 块（倾向保留，但排序按 C.1 层序）。

### ADR-005: CSS 动效的性能边界
**状态：** Proposed ｜ **日期：** 2026-09-18
**背景：** 用户要"根据鼠标移动有交互感"。平台无框架无构建，且低端教学机可能跑 file://。
**决策：** ① 动画属性白名单 = `transform` + `opacity`；② 指针跟随特效用 CSS 变量（--mx/--my）+ rAF 节流 + `pointer:fine` 媒体查询才启用；③ 单帧动画节点数 < 200；④ 不用 scroll-driven JS 动画、不大面积 backdrop-filter；⑤ `prefers-reduced-motion` 一刀切降级（补全 JS 侧检测，现状只有 CSS 侧 app.css L313/L759）。缓动与时长全部走现有令牌，不发明新曲线。
**备选：** 引入动画库（GSAP 等）——否决，违背零依赖约束。canvas 粒子背景——否决，与"高级简约"设计语言冲突且费电。
**后果：** "交互感"通过 hover 微位移、指针高光、分层进入动效实现，足够满足诉求；性能有客观红线可测。

### ADR-006: 层间熔断契约（circuit breaker）
**状态：** Proposed ｜ **日期：** 2026-09-18
**背景：** 本次事故的直接放大器是"L1 残次输出无人拦截"。`fromFile` 只查字符数（pdftext.js L750），`handleDocFiles` 也只查 200 字（app.js L597）。
**决策：** 每层输出统一为 `{ data, quality, warnings }`；两处硬熔断：L1 `spaceRatio<0.08 && latin` → 拒绝进入 L3，UI 给粘贴正文引导；L3 `confidence<35 || degraded` → L5 渲染恢复卡而非完整面板。完整失败模式见 A.3 表（F1-F6）。熔断事件写 RUN LOG（MR.log 已有）。
**备选：** 只加 warnings 不熔断——否决，本次证明用户不会在 14 块噪声里注意到一条 warning。
**后果：** 任何上游回归（新 PDF producer、新字体花招）的爆炸半径被限制在"一张恢复卡"，而不是"整屏垃圾"。这是防复发的架构级保险，与回归语料（任务 #4）互补：测试防已知，熔断兜未知。F1-F6 契约表已同步 testing-expert 作为断言清单输入。

---

## E. 用户诉求 → 方案映射（验收对照）

| 用户原话 | 落点 |
|---|---|
| 「英文文献翻译成中文…实验数据、研究对象、变量翻译为中文」 | B 节 L4 层：术语级 100% 覆盖 + 原文并存可追溯 + 摘要可选机翻降级（ADR-002） |
| 「一开始就是导入文献，或者研究方式是什么，简约一点」 | C.1 第 0 层：入口双卡，整屏只做一件事 |
| 「一层一层分层的交互」 | C.1 第 1-4 层渐进披露 + ADR-003/004 |
| 「根据鼠标移动有交互感」 | C.3 动效规范（指针高光/hover/层级进入）+ ADR-005 |

## F. 实施顺序建议（供排期参考，非交付要求）

1. L1 空格还原（R1/R2）+ spaceRatio 熔断（ADR-001/006）——阻塞英文路径，最高优先；
2. L3 confidence 熔断 → imp 视图恢复卡（ADR-006）——小改动，立竿见影；
3. TERM_MAP 对齐（交 tech-writer）+ L4 模块 + 视图只读 profile（解耦 A.4-4）；
4. imp 视图四层重构 + 入口层（ADR-003/004）；
5. 动效规范落地（ADR-005）。
