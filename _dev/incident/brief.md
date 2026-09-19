# LATTICE 平台事故简报（证据包）

- 时间：2026-09-18
- 报告人：工程督导 甄宇航
- 代码位置：`D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform`
- 状态：**已复现，根因已初判，待团队复核**

---

## 一、用户原话（症状描述，原文引用）

1. 「我导入了一篇进去，都没办法分析它」
2. 「很多东西都是错误的，而且有些东西我看都看不懂，为什么会那么多，那么那么杂乱」
3. 「我导入的文献，如果是英文的，你就翻译成中文。就是接下来后面的那些，就是实验的数据，什么研究对象变量什么的，你就翻译为中文」
4. 「一开始这个交互界面就开始就是导入文献，或者是你的研究方式是什么，就简约一点就好了」
5. 「不要一个页面摆上来，然后全部都是这样子乱七八糟的。你就做成这种一层一层层分层的交互」
6. 「整个交互界面，它是能够根据鼠标移动也好，就是有那种交互感」

---

## 二、复现方法与样本

样本：`2019 Cellulose--A hybrid binder of carboxymethyl chitosan and l-methionine enables a slight amount of Ag NPs to be durably effective on antibacterial cotton fabrics.pdf`
（Springer 出版，ORIGINAL RESEARCH 排版；路径在 `E:\生物材料文献（假期）\C组文献\C组文献\`）

复现脚本：`_dev/reviewtest.js`（PDF 抽取 → 10 环节渲染 → 断言）
抽取探针：直接调用 `MR.pdftext.extract(ArrayBuffer)` 与 `MR.extract.analyze(text, {name})`

---

## 三、实测数据（硬证据）

| 指标 | 实测值 | 期望 |
|---|---|---|
| PDF 抽出字符数 | 27,702 | ≥ 20,000 ✅ 文字层正常 |
| **抽出文本形态** | **全文无空格**，见下方原文样本 | 词间应有空格 |
| 摘要 | **长度 0**，`abstractSource` 为空 | 200–2000 字 |
| 关键词 | 自动归纳结果全错（把整句当关键词，见下方） | 原文关键词 |
| 章节切分 | 只有 1 个 `0|正文` | ≥ 5（Abstract/Experimental/Results/…） |
| 原料 / 试剂 | **0**（原文确有 AgNO₃、CMC、L-甲硫氨酸、柠檬酸、NaOH） | ≥ 5 |
| 仪器 | 2 | ≥ 4 |
| 变量与水平 | **0**（原文有多组浓度水平） | ≥ 2 |
| 可测指标 | 6 | ≥ 5 |
| 参考文献 | 18 | ≥ 30 |
| 抽取置信度 | 40 / 100 | ≥ 60 |
| 环节 02 渲染正文 | 1,247 字（基本空白） | 应有内容 |
| 环节 03 渲染正文 | 468 字（基本空白） | 应有内容 |

**抽出文本样本（前 400 字符，`.replace(/\n/g,' | ')` 后的实际内容）：**

```
ORIGINALRESEARCHAhybridbinderofcarboxymethylchitosanandL-methionineenablesaslightamountofAgNPstobedurablyeffectiveonantibacterialcottonfabricsJingZhou.XinYueHu.YiYuanZhu.HongFenLyu.LeiZhang.FeiYaFu.XiangDongLiu | Received:26May2019/Accepted:23August2019SpringerNatureB.V.2019AbstractThisworkproposesafacileapproachtoimprovethedurabilityofantibacterialcottonfabricby | usingcarboxymethylchitosan(CMC)andL | 
```

**自动归纳得到的关键词（错误样本）：**

```
thisworkproposesafacileapproachtoimprovethedurabilityofantibacterialcottonfabricby
/ carboxymethyl / antibacterial / l-methionine / effective / abstract / chitosan / enables
```

---

## 四、根因初判（待团队独立复核）

`assets/js/pdftext.js` 在从 PDF 内容流还原文字时，**只取字形本身，不还原"字形之间的定位空白"**。

PDF 里词间空格有两种实现方式：

- (a) 直接绘制一个空格字形 —— 本解析器能处理；
- (b) 用 **TJ 数组里的大负 kern 值**，或**相邻 Tj 之间的 Td/Tm 水平位移**"跳"出空白 —— **本解析器完全忽略**。

Springer / Elsevier 等大量使用 (b)。结果：所有英文单词黏成一整条字符串。

**危害链条：**

```
无空格 → 分词全失效 → 英文词典（大量多词短语）全部匹配不到
      → 原料 / 变量 / 摘要 / 章节 / 参考文献 全线为 0
      → 界面只剩「未报告」「未识别」+ 少量噪声词
      → 用户感知：「错误」「看不懂」「那么多那么杂乱」
```

---

## 五、已确认的其它缺陷（计入审查范围）

1. **界面信息过载**：环节 01 单页同时铺开 14 个区块 —— 10 个材料方向卡片、拖拽区、示例文档、已核验文献、题录面板、解析自检、指标族归类、原料表、仪器表、变量表、指标表、工序配方、缺失项、标准与参考文献。无分层、无进度引导、无"先做什么"的暗示。
2. **缺少语言层**：英文文献的抽取结果（研究对象 / 变量 / 指标 / 工序）以英文原样呈现，没有任何中文化处理。
3. **误抽取历史残留**：前几轮已修 `SEM/TEM` 缩写真假命中、`Acros` 命中 `across`、作者姓氏当仪器等，但**没有回归语料防复发**。
4. **测试覆盖盲区**：`_dev/smoke4.js` 只用 4 篇**自造中文样本** + 2 篇英文综述做断言；**英文"研究型"论文从未纳入**，因此本次故障未被拦截。

---

## 六、影响面

- 绝大多数材料类文献是英文 → 平台的英文路径基本全部失效。
- 核心承诺「导入什么就分析什么」对英文文献不成立。
- 直接阻塞赛事演示（方向二：自动化 AI 科研平台）。
- 用户已连续多轮反馈同一类问题（"每篇论文套同一套东西""导入什么就分析什么"），**信任度正在消耗**。

---

## 七、建议的审查分工（供团队参考，不限制成员独立判断）

| 成员 | 关注点 |
|---|---|
| Rex（SRE） | SEV 评级、影响面量化、时间线、角色分配、状态通报模板、复盘（5 Why） |
| Cody（代码审查） | `pdftext.js` 定位空白还原的正确性/性能；`extract.js` 误抽取与鲁棒性；可维护性 |
| Archi（架构） | 抽取管线分层（版面还原 → 分词 → 抽取 → 本地化 → 呈现）；界面信息架构重构（分层引导） |
| Tessa（测试） | 为何漏检；回归语料设计；断言清单；CI 门禁 |
| Docu（文档） | 结果呈现的信息密度与文案；中文化术语表；用户可理解性 |
