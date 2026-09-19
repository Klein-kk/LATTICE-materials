
---

## 追加 · PDF 解析器 v3 + 英文抽取真实修复（本轮最重要的一批）

用户报告「是不是你没办法识别英文文献」。用 3 篇真实期刊 PDF 逐环节复现，定位到**五层各自独立的缺陷**，全部修复：

**① pdftext.js 过滤器链（旧版只认 FlateDecode）**
- 2000 年 Nature 那篇用 `/Filter [ /ASCII85Decode /FlateDecode ]`，旧版把 ASCII85 字节当正文 → 抽出 4017 个随机 ASCII 乱码。
- 新增 `fASCII85 / fASCIIHex / fRunLength / fLZW` + `unPredictor`（PNG Predictor 10-15）+ `applyFilters()` 按声明顺序串联解码；遇图像类过滤器返回 null 跳过。

**② zlib 头不是 0x78（最隐蔽的一处）**
- `inflateAuto` 原来只在 `u8[0]===0x78` 时剥 2 字节 zlib 头。QuarkXPress/Distiller 3 的老 PDF 用 **4KB 窗口**，CMF 是 `0x48`，`(CMF<<8|FLG)%31===0` 依然成立但被漏判 → 整段 DEFLATE 从错误的偏移开始解析 → 全部解压失败。
- 改为按「CM=8 且 mod31 校验通过」判定，并支持 FLG.FDICT 的 6 字节偏移，失败再退回 0 偏移重试。

**③ 无 ToUnicode 时的字体编码回退**
- 老 PDF 全篇无 `/ToUnicode`，靠 `/Encoding 127 0 R`（间接引用）→ `/Differences` 字形名。
- 新增 `GLYPH`（约 200 个字形名→Unicode）、`STD_HIGH`（StandardEncoding 161–255 段）、`WIN_HIGH`（WinAnsi 0x80–0x9F 共 32 项）、`MAC_HIGH`（MacRoman 0x80–0xFF 共 **128 项**，含 0xCA nbsp 与 0xF0 U+F8FF）。
- `buildEncArray()` 解析 `/Encoding` 的两种写法（名字 / 间接对象 + BaseEncoding + Differences）；`decodeWith` 优先级：ToUnicode > Encoding 表 > ASCII 直通 > 双字节猜测。
- 结果：2000 Nature 从 4017 乱码 → **54586 字符干净正文**；2001 Trends 26572 字符；1954 那篇确认为**扫描件无文字层**（合理失败，提示语已覆盖该场景）。

**④ 阅读顺序：按页面树而不是文件物理顺序**
- 之前"标题被 Fig.4 图注顶掉、正文从中段开始"。改为遍历 `/Type /Pages` → `/Kids` → `/Page` → `/Contents`（数组按序、同页重复引用去重），不足 240 字符才退回按"散文度×长度"排序。

**⑤ extract.js 英文抽取（落实"导入什么就只分析什么"）**
- **短缩写裸匹配**：`SEM/TEM/BET/EIS` 原为大小写不敏感裸匹配 → `assembly→SEM`、`system→TEM`、`between→BET`，英文论文里凭空多出 4 项"表征手段"。改为去 `i` 标志 + `\b` 整词。
- **品牌名 Acros 命中 "across"**：`isBuy/enProcure` 两个正则里的试剂商名单无词边界 → 把 "…vancomycin across the membrane…" 当试剂清单。全部加 `\b`。
- **作者姓氏当仪器**：`system/setup/kit` 被当作设备线索 → 收紧 `DEVICE_NOUN` 并加姓氏护栏（`^[A-Z][a-z]{1,14}$` 且无设备/型号/公司线索则否决）。
- **PDF 断行黏连修复 `deGlue()`**：`animalswith / thatthe / reviewreview / TRENDSin / compounds.A` → 5 条保守规则（小写+大写开头、全大写缩写+小写、数字+大写、高频两词白名单、句末标点+大写）。功能词白名单刻意排除 and/then/one/are/our/can，避免误伤 understand/strengthen/microphone/nightmare/behaviour/hurricane。
- **行→段落合并 `mergeParagraphs()`**：两栏期刊正文行只有约 50 字符，"行"不能当"段落"。摘要推断改用它；逐行检测器（原料/仪器）仍用原始行以免超长度上限。
- **页眉剥离 `stripHeader()`**：只在片段确实含 `|` / `www.` / `http` 时切到最后一个页眉 token 之后，避免误伤 "ROS production is…"。
- **摘要推断 + 候选**：原文无 `Abstract` 时取正文首段，标注 `abstractSource = 'inferred'`，并返回 `abstractCandidates`（前 6 段）供界面「换一段」。作者/单位块用机构词、国名州名、邮编、首字母缩写密度、专有名词占比五重条件排除。
- **关键词**：无字段时从标题+摘要归纳高频实词，标注 `keywordsSource = 'derived'`，不冒充原文关键词。
- **标题**：中文文档取正文第一行实质文字（`titleSource = 'in-text'`）；英文文档优先用文件名（"年份+期刊——题目"），因为期刊首页标题常是矢量轮廓抽不出文字。正文候选增加 `[a-z]{2}[A-Z][a-z]` 黏连排除。
- **参考文献**：新增"长块按编号炸开"（`…(1994).102.Seddon…` → 一条条）+ 文末后 45% 行的编号式扫描 → 2000 Nature 从 **0 条 → 100 条**。

**⑥ 回归：中文变量曾全部为 0（严重）**
- 根因：`NOUN_RE` 给中文后缀加了 `\b`。**汉字在 JS 正则里是非单词字符**，`温度设置` 处两侧都非单词字符 → 无边界 → 所有中文变量都匹配不上。去掉 `\b`，改用 `NOUN_TAIL` 校验词尾。
- 另一处：`fullText.replace(/\\n/g, '。').split(/[。；;\\n]/)` 里的 `\\n` 是**字面反斜杠 + n**（Python 转义遗留），既没换行也没正确分句。
- 变量数字只在小句内收集（`winRaw.search(/[，,][^\s\d]/)` 截断），避免把"水淬水温 20 ℃"混进"固溶温度 520/540/560 ℃"的水平列表（旧版会因量级跨度 28 倍触发过滤而丢掉整个变量）。
- 新增工序动词短语否决（称量/计量/球磨/浸渍…），避免"按配合比称量"被当成变量。

**验证**
- 新增诊断脚本：`_dev/entest.js`（英文诊断）、`_dev/vartest.js`（中文四示例）、`_dev/matdbg.js`（试剂证据）、`_dev/pdfdbg2.js`（逐流过滤器诊断）。
- `_dev/smoke4.js`：**0 错误 · 流水线 10/10**（含 3D 图渲染断言、四示例变量断言）。
- 三篇真实 PDF：2000 Nature 标题/摘要/关键词/参考文献全对；2001 Trends 标题正确、误判清零；1954 扫描件给出明确不可抽提示。

**待办（下一批）**：综述类论文的界面路径（概念路线图 + 概念对比矩阵 + 年份时间线；数据层 `paperType/concepts/timeline` 已就绪但视图未接）、逐步引导交互、动效、实验流程 3D。
