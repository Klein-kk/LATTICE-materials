
---

## 追加 · 界面层：综述路径 + 题录溯源 + 概念提取去模板化

**1) 环节 01 补齐"解析出的题录信息"面板**（`views2-stages.js` 的 `MR.views2.imp`）
- 标题 / 英文题名 / 摘要 / 关键词四项，每项右侧挂**来源 chip**：`原文自带 / 正文识别 / 取自文件名 / 自动推断 / 自动归纳`，并在面板 note 里解释语义 —— 原文没有的字段明确标注来源，不冒充原文内容。
- 摘要旁加「换一段 N/M」按钮：原文无 `Abstract` 时把 `abstractCandidates`（前 6 段）交给用户切换，而不是替他拍板。
- 新增「解析自检」面板，直接展示 `analysis.warnings`（未识别到变量/原料、摘要为推断、判为综述等）。
- 类型为 `review` 时额外显示「文献类型：综述 / 展望」面板，列出概念类别与年份频次。

**2) 综述类文献的三张概念图**（`cfRoute / cfMatrix / cfTime`，注入环节 02/03/04）
- **概念路线图**：竖向时间轴 + 类别色块 + 概念胶囊，SVG 内嵌 `@keyframes cfDraw / cfFade` 做描边生长与逐行浮现。
- **概念对比矩阵**：分组横向条形 + 类别图例（单类别时色带难分辨，图例解决）。
- **年份演进时间线**：柱由底向上生长，最高频年份高亮。
- 通过 `MR.views2.concept = { data, panel, draw, route, matrix, time }` 导出，供其它环节复用与单独调试。

**3) 去掉最后一块硬编码领域词池（重要）**
- 旧版 `CONCEPT_POOL` 是一张"可穿戴传感"领域词表，套到生物膜论文上会产出「标志物: pH」「应用场景: stress」这类无意义归类 —— 与用户此前批评的"每篇论文都测同一套指标"属同一类错误。
- 改为 `extractConcepts()`：从**论文自身**提取 2–3 词术语短语（频次≥2）、高频长词（≥8，过通用学术停用词表）、中文 3–5 字片段（≥5）；再按材料学科**通用**词表归到「性能族 / 表征与分析手段 / 材料与试剂 / 核心术语」。
- 统计前用 `conceptSourceText()` 剔除参考文献区、重复页眉页脚（`insightreview articles`）、引文行（`44, 1818–1824`），否则 `Proc. Natl. Acad. Sci.` 会被当成概念。
- 规则细化：整词重复的短语（`review review review`）丢弃；单字被更长的短语覆盖时丢弃（`oxidative stress` 优先于 `stress`）；非「核心术语」类别要求是术语短语或高频整词（避免把 `protein` 当"试剂"）。
- 实测：2000 Nature → `oxidative stress×51 · life span×25 · stress resistance×13 · caloric restriction×9`；2001 Trends → `antimicrobial agents×19 · biofilm cells×13 · planktonic cells×6`。

**4) 综述判定改结构证据**（`analyze()`）
- 旧版靠 `!variables.length && !steps.length`，但英文正文里 `aged/synthesis` 之类会 substring 命中 "工序"，综述永远判不出来。
- 先修根因：`extractSteps` 的英文动词改为**整词匹配**（`vbHit`，旧版 `aged` 会命中 `damaged/stages`、`synthesis` 命中 `biosynthesis`）。
- 再改判据：`!variables.length && (文件名/标题含 review|trends|perspectives|进展… || 正文综述措辞) && 无方法学章节` → review。

**5) 两处指标误判**
- `indLexicon()` 曾把 `domain.hintWords()` 并入指标词表，而那是**方向提示词**（金属方向的「合金」「钢」「铝」）→ 材料名被当成"可测指标"。已移除。
- 中文论文的 `titleEn` 曾取到中文文件名 → 「English title」显示中文。现要求候选**不含 CJK** 才当英文题名。

**6) 动效（"还会动"）**
- `.view > *` 逐块入场（`blockIn`，nth-child 递增 delay 0→345ms）；`.figbox` 悬停微抬 + 阴影；`@media (prefers-reduced-motion: reduce)` 全局关闭动画与过渡。
- 三张概念图自带 SVG 级 `@keyframes`（描边生长 / 条形横向生长 / 柱体纵向生长），导出 SVG 时动画一并带走。

**新增测试脚本**：`_dev/reviewtest.js`（综述论文从 PDF 抽取 → 10 环节渲染 → 概念图是否生成）、`_dev/dumptext.js` + `_dev/cftext.js` + `_dev/cfcheck.html`（独立渲染三张概念图并用 Edge 无头截图复核版式）、`_dev/vartest.js`、`_dev/matdbg.js`、`_dev/cfnode.js`。
**验证**：`smoke4` 0 错误 10/10；`reviewtest` 综述三图在 02/03/04 均出 SVG 且无错误；线上截图确认。
**在线链接**：https://ee46cdb091a6446e967c29d9454b2dc3.app.workbuddy.host

**遗留**：环节 05/06/07 对综述仍走研究论文口径（analysis/guide/feedback 未接概念路径）；元素级动画在 `prefers-reduced-motion` 下完全关闭（可考虑保留淡入）。
