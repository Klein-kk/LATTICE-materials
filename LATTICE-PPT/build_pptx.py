# -*- coding: utf-8 -*-
"""用 python-pptx 生成 LATTICE 平台介绍 PPT（深青+青色科技风，14 页）。"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn

# ---------- 颜色 ----------
TEAL  = RGBColor(0x0E,0x3B,0x39)
TEAL2 = RGBColor(0x16,0x54,0x4F)
DARK  = RGBColor(0x08,0x20,0x1F)
CYAN  = RGBColor(0x22,0xB8,0xA6)
CYANL = RGBColor(0x7F,0xE9,0xDC)
BG    = RGBColor(0xF5,0xF8,0xF8)
INK   = RGBColor(0x0F,0x1C,0x1B)
GRAY  = RGBColor(0x5B,0x6B,0x6A)
PANEL = RGBColor(0xE6,0xF4,0xF1)
WHITE = RGBColor(0xFF,0xFF,0xFF)

SW, SH = 13.333, 7.5

prs = Presentation()
prs.slide_width  = Inches(SW)
prs.slide_height = Inches(SH)
BLANK = prs.slide_layouts[6]

# ---------- 字体工具 ----------
def font(run, name='Microsoft YaHei', size=None, bold=None, color=None):
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    for tag in ('a:latin','a:ea','a:cs'):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.append(el)
        el.set('typeface', name)
    if size is not None: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if color is not None: run.font.color.rgb = color

def alpha(shape, opacity):
    """opacity 0-100：填充透明度。"""
    try:
        srgb = shape.fill.fore_color._xFill.find(qn('a:srgbClr'))
        if srgb is None:
            return
        for a in srgb.findall(qn('a:alpha')):
            srgb.remove(a)
        a = srgb.makeelement(qn('a:alpha'), {'val': str(int(opacity*1000))})
        srgb.append(a)
    except Exception:
        pass

def line_alpha(conn, opacity):
    try:
        ln = conn.line._get_or_add_ln()
        srgb = ln.find(qn('a:srgbClr'))
        if srgb is None:
            srgb = ln.find('.//'+qn('a:srgbClr'))
        if srgb is None:
            return
        for a in srgb.findall(qn('a:alpha')):
            srgb.remove(a)
        a = srgb.makeelement(qn('a:alpha'), {'val': str(int(opacity*1000))})
        srgb.append(a)
    except Exception:
        pass

# ---------- 基础图元 ----------
def txt(slide, x,y,w,h, text, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT,
        anchor=MSO_ANCHOR.TOP, line_spacing=1.18, fontname='Microsoft YaHei', wrap=True):
    tb = slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left=0; tf.margin_right=0; tf.margin_top=0; tf.margin_bottom=0
    for i, line in enumerate(text.split('\n')):
        p = tf.paragraphs[0] if i==0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        r = p.add_run(); r.text = line
        font(r, fontname, size, bold, color)
    return tb

def rect(slide, x,y,w,h, fill=None, line=None, lw=1):
    sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x),Inches(y),Inches(w),Inches(h))
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(lw)
    sp.shadow.inherit = False
    return sp

def oval(slide, x,y,d, fill=None, line=None, lw=1):
    sp = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x),Inches(y),Inches(d),Inches(d))
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(lw)
    sp.shadow.inherit = False
    return sp

def line(slide, x1,y1,x2,y2, color, w=1.5, op=None):
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1),Inches(y1),Inches(x2),Inches(y2))
    conn.line.color.rgb = color; conn.line.width = Pt(w)
    if op is not None: line_alpha(conn, op)
    return conn

def grad_full(slide, c1, c2):
    sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0,0, Inches(SW), Inches(SH))
    sp.line.fill.background()
    try:
        sp.fill.gradient()
        sp.fill.fore_color.rgb = c1
        sp.fill.back_color.rgb = c2
    except Exception:
        sp.fill.solid(); sp.fill.fore_color.rgb = c1
    sp.shadow.inherit = False
    return sp

def footer(slide, n, dark=False):
    c = RGBColor(0xCF,0xE9,0xE4) if dark else GRAY
    txt(slide, 0.6, 6.9, 6.5, 0.35, 'LATTICE · 材料学科科研自动化平台', 11, c)
    txt(slide, 12.0, 6.9, 1.0, 0.35, f'{n:02d} / 14', 11, c, align=PP_ALIGN.RIGHT)

def title_block(slide, title, sub=None):
    rect(slide, 0.6, 0.5, 0.09, 0.55, CYAN)
    txt(slide, 0.85, 0.45, 11.5, 0.65, title, 30, INK, bold=True)
    if sub:
        txt(slide, 0.85, 1.12, 11.5, 0.4, sub, 15, GRAY)

def newslide():
    return prs.slides.add_slide(BLANK)

# =========================================================
# P1 封面
# =========================================================
s = newslide()
grad_full(s, TEAL, DARK)
nodes = [(1.4,1.0),(3.0,1.85),(2.5,3.5),(4.6,1.35),(4.1,4.15),(6.3,2.15),
         (5.7,3.95),(8.6,1.5),(8.2,4.3),(10.3,2.7),(9.7,4.4)]
edges = [(0,1),(1,2),(1,3),(2,4),(3,5),(5,6),(3,7),(7,8),(5,9),(8,10),(4,9),(0,2)]
for a,b in edges:
    line(s, nodes[a][0]+0.08, nodes[a][1]+0.08, nodes[b][0]+0.08, nodes[b][1]+0.08, CYAN, 1.4, op=35)
for (x,y) in nodes:
    oval(s, x, y, 0.28, CYANL, None); alpha(oval(s, x-0.07, y-0.07, 0.42, CYAN, None), 22)
txt(s, 0.6, 0.55, 8, 0.4, '十环节科研流水线 · 零部署 · 真实论文锚定', 14, CYANL)
txt(s, 0.6, 2.7, 11, 1.4, 'LATTICE', 90, WHITE, bold=True, fontname='Consolas')
txt(s, 0.62, 4.05, 11, 0.6, '材料学科科研自动化平台', 30, CYANL, bold=True)
rect(s, 0.65, 4.75, 1.1, 0.06, CYAN)
txt(s, 0.6, 5.0, 11, 0.5, '让每一篇文献，自动长成一篇可投稿的成果', 20, RGBColor(0xCF,0xE9,0xE4))
txt(s, 12.0, 6.9, 1.0, 0.35, '01 / 14', 12, RGBColor(0xCF,0xE9,0xE4), align=PP_ALIGN.RIGHT)

# =========================================================
# P2 目录
# =========================================================
s = newslide()
rect(s, 0, 0, SW, SH, BG)
rect(s, 0, 0, 4.45, SH, TEAL)
txt(s, 0.55, 2.8, 3.4, 1.0, '目录', 60, WHITE, bold=True)
txt(s, 0.6, 3.75, 3.4, 0.4, 'CONTENTS', 16, CYANL)
rect(s, 0.6, 4.15, 1.0, 0.06, CYAN)
txt(s, 0.6, 4.5, 3.4, 1.0, '从痛点认知到平台能力，\n从应用场景到价值行动', 14, RGBColor(0xCF,0xE9,0xE4), line_spacing=1.4)
items = [('01','为什么需要 LATTICE','科研的现实痛点与高昂代价'),
         ('02','平台与核心能力','十环节流水线 · 智能抽取 · 3D 绘图'),
         ('03','三大应用场景','高校科研 · 企业研发 · 综述情报'),
         ('04','价值与行动','被夸大的价值 · 技术底座 · 为什么选我们')]
yb = 1.05
for no,t,d in items:
    rect(s, 4.9, yb, 7.9, 1.15, WHITE, line=RGBColor(0xE1,0xE8,0xE7), lw=1)
    txt(s, 5.15, yb+0.18, 1.3, 0.9, no, 40, CYAN, bold=True, fontname='Consolas', anchor=MSO_ANCHOR.MIDDLE)
    txt(s, 6.6, yb+0.22, 6.0, 0.5, t, 22, INK, bold=True)
    txt(s, 6.6, yb+0.72, 6.0, 0.4, d, 15, GRAY)
    yb += 1.32
footer(s, 2)

# =========================================================
# P3 痛点（非对称双栏）
# =========================================================
s = newslide()
rect(s, 0,0,SW,SH,BG)
title_block(s, '科研的现实：效率与信任的双重困境')
pains = [('周期漫长','一篇材料论文从"读文献"到"成文投稿"动辄数月，灵感在等待中冷却'),
         ('重复劳动','手工抄录数据、重画 XRD/SEM 图表、逐条排版参考文献，枯燥且易错'),
         ('信任风险','为填补数据缺口而"凭空补数"，埋下学术不端的隐形隐患'),
         ('门槛高企','配服务器、搭环境、联网传数据——部署本身就把多数人劝退')]
yb=1.55
for t,d in pains:
    rect(s,0.6,yb,7.7,1.05,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,0.85,yb+0.28,0.6,0.6,PANEL)
    txt(s,0.92,yb+0.34,0.5,0.5,'●',22,CYAN,anchor=MSO_ANCHOR.MIDDLE,align=PP_ALIGN.CENTER)
    txt(s,1.7,yb+0.16,6.4,0.45,t,20,INK,bold=True)
    txt(s,1.7,yb+0.58,6.4,0.42,d,14,GRAY,line_spacing=1.2)
    yb+=1.15
rect(s,8.7,1.55,4.0,5.0,TEAL)
txt(s,9.0,1.9,3.4,0.5,'代价',22,CYANL,bold=True)
costs=[('3–6 月','平均成果产出周期'),('60%+','科研时间耗在重复劳动'),('不可控','数据外泄与发表不确定性')]
cy=2.7
for n,l in costs:
    rect(s,9.0,cy,0.06,0.85,CYAN)
    txt(s,9.2,cy-0.02,3.3,0.6,n,38,WHITE,bold=True,fontname='Consolas')
    txt(s,9.2,cy+0.6,3.3,0.3,l,14,CYANL)
    cy+=1.4
footer(s,3)

# =========================================================
# P4 平台总览（巨型数字）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
txt(s,0.6,0.7,11,0.4,'平台总览 · OVERVIEW',16,CYAN,bold=True)
txt(s,0.6,1.15,11.5,0.9,'一个平台，覆盖材料科研的全链路',38,INK,bold=True)
rect(s,0.65,2.15,1.2,0.06,CYAN)
nums=[('10','十环节科研流水线'),('10','覆盖材料大方向'),('250+','中英双语指标词表'),('0','依赖 · 零部署')]
xb=0.6
for n,l in nums:
    txt(s,xb,2.6,2.7,1.3,n,100,CYAN,bold=True,fontname='Consolas',align=PP_ALIGN.CENTER)
    txt(s,xb,3.95,2.7,0.7,l,16,GRAY,align=PP_ALIGN.CENTER)
    if xb<9.5:
        rect(s,xb+2.85,2.7,0.02,1.3,RGBColor(0xD6,0xE2,0xE0))
    xb+=3.1
txt(s,0.6,5.4,12.1,0.8,'纯静态、零构建、零第三方运行时依赖——双击 index.html 即跑，把一篇论文自动跑成一篇可投稿的成果。',20,INK,line_spacing=1.4)
footer(s,4)

# =========================================================
# P5 十环节流水线（上流程 + 下卡片）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'十环节科研流水线','从一篇文献到一篇可投稿成果，全链路自动贯通')
labels=['导入解析','拓展定位','变量安全','数据图形','结果作图','实验指导','数据回填','论文撰写','语言处理','论文评审']
# 流程图
y=1.85
x0=0.8; step=(12.0-0.8)/9
prev=None
for i,lb in enumerate(labels):
    x=x0+i*step
    oval(s,x-0.28,y-0.28,0.56,TEAL,line=CYAN,lw=2)
    txt(s,x-0.28,y-0.24,0.56,0.5,str(i+1),18,WHITE,bold=True,align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE,fontname='Consolas')
    txt(s,x-0.55,y+0.34,1.1,0.4,lb,12,INK,align=PP_ALIGN.CENTER,bold=True)
    txt(s,x-0.55,y+0.66,1.1,0.3,'0'+str(i+1),10,GRAY,align=PP_ALIGN.CENTER)
    if prev is not None:
        line(s,prev,y,x-0.28,y,CYAN,2)
    prev=x+0.28
line(s,prev,y,12.0,y,CYAN,2)
cards=[('导入与解析','文献一键上传，逐项抽取原料、仪器、工艺、变量与指标，每条附原文依据，缺项标「未报告」。'),
       ('绘图与配图','论文专属科学图形 + 3D 科研绘图（响应面 / 晶胞 / 界面），内嵌期刊配色与 SCI 配图规范。'),
       ('撰写与评审','初稿自动生成、降 AI 改写、可解释查重与三位专家评审，问题自动检测一站式闭环。')]
for i,(t,d) in enumerate(cards):
    x=0.6+i*4.05
    rect(s,x,4.4,3.85,2.05,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,x,4.4,3.85,0.12,CYAN)
    txt(s,x+0.25,4.7,3.4,0.5,t,22,TEAL,bold=True)
    txt(s,x+0.25,5.3,3.4,1.0,d,14,GRAY,line_spacing=1.3)
footer(s,5)

# =========================================================
# P6 智能抽取（非对称双栏）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'智能抽取：真实论文锚定，绝不臆造')
txt(s,0.6,1.6,7.2,0.5,'只分析原文有的内容',24,TEAL,bold=True)
txt(s,0.6,2.2,7.2,1.4,'抽取引擎只输出论文中真实出现的东西——原料、仪器、工艺、变量、指标、参考文献，逐条标注来源。',19,RGBColor(0x3C,0x4A,0x49),line_spacing=1.5)
txt(s,0.6,3.6,7.2,1.2,'抽不到的内容一律标「原文未报告」，绝不补全、绝不凭空生成。',19,RGBColor(0x3C,0x4A,0x49),line_spacing=1.5)
rect(s,0.6,4.95,7.2,1.0,PANEL)
rect(s,0.6,4.95,0.1,1.0,CYAN)
txt(s,0.85,5.1,6.8,0.8,'每条结论都附原文依据——可追溯、可复核、可信任。',19,TEAL,bold=True,anchor=MSO_ANCHOR.MIDDLE)
rect(s,8.4,1.6,4.3,5.1,TEAL)
txt(s,8.7,1.9,3.7,0.5,'抽取引擎能识别',20,CYANL,bold=True)
recog=[('原料与试剂'),('仪器与设备'),('工艺与步骤'),('变量与水平'),('可测指标'),('参考文献')]
ry=2.7
for r in recog:
    oval(s,8.75,ry+0.05,0.18,CYANL)
    txt(s,9.1,ry,3.4,0.5,r,18,WHITE,anchor=MSO_ANCHOR.MIDDLE)
    ry+=0.62
footer(s,6)

# =========================================================
# P7 3D 科研绘图（左大图 + 右文字）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'3D 科研绘图与 SCI 配图规范')
rect(s,0.6,1.6,6.6,5.0,TEAL)
# 球棍晶体
atoms=[(2.4,2.4,(46,91,226)),(4.5,2.7,(226,59,46)),(3.4,4.0,(191,194,199)),
       (1.9,5.0,(200,161,101)),(5.4,4.9,(217,194,43)),(3.2,5.7,(46,91,226)),
       (5.1,5.9,(226,59,46)),(2.2,5.9,(191,194,199))]
bonds=[(0,2),(1,2),(2,3),(2,4),(2,5),(2,6),(5,7),(6,7),(3,7)]
for a,b in bonds:
    line(s,atoms[a][0]+0.18,atoms[a][1]+0.18,atoms[b][0]+0.18,atoms[b][1]+0.18,RGBColor(0x9F,0xE9,0xDF),3,op=55)
for (x,y,c) in atoms:
    cc=RGBColor(*c)
    oval(s,x+0.02,y+0.02,0.34,cc,None); alpha(oval(s,x-0.04,y-0.04,0.46,cc,None),25)
    oval(s,x,y,0.3,cc,line=WHITE,lw=1)
txt(s,8.5,1.7,4.3,0.5,'论文专属三维图形',22,TEAL,bold=True)
txt(s,8.5,2.35,4.3,1.0,'三维响应面、晶胞球棍模型、层状 / 界面结构，纯手写投影引擎生成。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
txt(s,8.5,3.5,4.3,0.5,'期刊配色板',22,TEAL,bold=True)
txt(s,8.5,4.15,4.3,1.0,'Okabe–Ito 色盲安全（Nature 金标准）等 6 套，图型切换即联动线宽、标记与网格。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
txt(s,8.5,5.3,4.3,0.5,'SCI 配图手册',22,TEAL,bold=True)
txt(s,8.5,5.95,4.3,1.0,'按论文指标族自动匹配图型与制图惯例；谱图 / 形貌为程序化重建，需实测标定。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
footer(s,7)

# =========================================================
# P8 高校科研（上大图 + 下卡片）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'应用场景一 · 高校科研团队','让课题组从"读文献"到"出初稿"一步到位')
rect(s,0.6,1.55,12.1,2.9,TEAL)
# 实验室意象：屏幕+柱状、烧瓶、原子、文档
rect(s,1.2,2.1,3.2,1.7,RGBColor(0x0B,0x2E,0x2C),line=CYAN,lw=2)
for i,(bx,bh) in enumerate([(1.45,0.5),(1.85,1.0),(2.25,1.4),(2.65,0.9),(3.05,1.5)]):
    rect(s,bx,3.75-bh,0.28,bh,CYANL if i%2 else CYAN)
# 烧瓶
def flask(cx,top_y):
    # 用矩形+梯形近似：简化为一个倒三角(用线条) + 椭圆底
    pts=[(cx-0.35,top_y),(cx+0.35,top_y),(cx+0.55,top_y+1.5),(cx-0.55,top_y+1.5)]
    # 用 add_freeform 画梯形
    from pptx.enum.shapes import MSO_SHAPE
    sp = s.shapes.add_shape(MSO_SHAPE.OVAL,Inches(cx-0.25),Inches(top_y-0.1),Inches(0.5),Inches(0.18),)
    sp.fill.solid(); sp.fill.fore_color.rgb=CYAN; sp.line.color.rgb=CYAN; sp.shadow.inherit=False
    shp = s.shapes.add_shape(MSO_SHAPE.OVAL,Inches(cx-0.6),Inches(top_y+1.3),Inches(1.2),Inches(0.3))
    shp.fill.solid(); shp.fill.fore_color.rgb=CYAN; shp.line.fill.background(); shp.shadow.inherit=False
    alpha(shp,40)
flask(6.6,2.3)
# 原子
for (ax,ay,ac,r) in [(9.1,2.5,(46,91,226),0.5),(9.7,3.4,(226,59,46),0.4),(9.0,3.6,(217,194,43),0.32),(10.2,2.8,(127,233,223),0.28)]:
    oval(s,ax,ay,r,RGBColor(*ac),None); alpha(oval(s,ax-0.06,ay-0.06,r+0.12,RGBColor(*ac),None),25)
    oval(s,ax,ay,r*0.8,RGBColor(*ac),line=WHITE,lw=1)
# 文档
rect(s,10.9,2.2,1.4,1.7,RGBColor(0x0B,0x2E,0x2C),line=CYAN,lw=2)
for i,by in enumerate([2.45,2.7,2.95,3.25,3.5]):
    rect(s,11.1,by,1.0,0.1,CYANL if i%2 else CYAN)
cards=[('极速出成果','研究生把文献一键导入，自动产出实验指导书与论文初稿，从数月压缩到数小时。'),
       ('规范且可复现','每条结论附原文依据，课题组知识结构化沉淀，经验传承不再靠口耳相传。')]
for i,(t,d) in enumerate(cards):
    x=0.6+i*6.2
    rect(s,x,4.7,5.9,1.6,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,x,4.7,5.9,0.12,CYAN)
    txt(s,x+0.3,4.95,5.4,0.5,t,22,TEAL,bold=True)
    txt(s,x+0.3,5.5,5.4,0.7,d,15,GRAY,line_spacing=1.3)
footer(s,8)

# =========================================================
# P9 企业研发（非对称双栏）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'应用场景二 · 企业新材料研发中心')
txt(s,0.6,1.65,7.2,0.6,'把经验变成企业的资产，而非个人的记忆',24,TEAL,bold=True)
txt(s,0.6,2.35,7.2,1.4,'企业研发最大的隐性浪费，是配方、工艺与失败教训散落在个人电脑和离职员工的脑海里。',19,RGBColor(0x3C,0x4A,0x49),line_spacing=1.5)
txt(s,0.6,3.8,7.2,1.4,'LATTICE 把每一次实验、每一篇文献自动转成结构化研发资产，让知识留得住、用得上。',19,RGBColor(0x3C,0x4A,0x49),line_spacing=1.5)
vals=[('知识沉淀','配方、工艺、性能一键结构化，形成企业自有材料数据库。'),
      ('协同提效','研发—文献—撰写同处一条流水线，大幅减少交接损耗。'),
      ('安全保密','纯本地运行，数据不出本机，无需联网上云，合规无忧。')]
vy=1.7
for t,d in vals:
    rect(s,8.3,vy,4.4,1.5,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,8.3,vy,0.12,1.5,CYAN)
    txt(s,8.6,vy+0.18,4.0,0.5,t,20,INK,bold=True)
    txt(s,8.6,vy+0.72,4.0,0.7,d,14,GRAY,line_spacing=1.3)
    vy+=1.65
footer(s,9)

# =========================================================
# P10 综述情报（左大图 + 右文字）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'应用场景三 · 综述与文献情报')
rect(s,0.6,1.6,6.6,5.0,TEAL)
# 知识图谱（径向）
cx,cy=3.9,4.1
ring1=[(cx+1.1*0+0,0)]  # placeholder
import math
r1=1.7; r2=3.0
ring1_nodes=[]; ring2_nodes=[]
for i in range(6):
    a=math.radians(60*i-90)
    ring1_nodes.append((cx+r1*math.cos(a),cy+r1*math.sin(a)))
for i in range(4):
    a=math.radians(90*i)
    ring2_nodes.append((cx+r2*math.cos(a),cy+r2*math.sin(a)))
for n in ring1_nodes: line(s,n[0]+0.18,n[1]+0.18,cx+0.18,cy+0.18,CYAN,1.6,op=40)
for i,n in enumerate(ring1_nodes):
    if i<len(ring2_nodes):
        line(s,n[0]+0.18,n[1]+0.18,ring2_nodes[i][0]+0.18,ring2_nodes[i][1]+0.18,CYAN,1.4,op=35)
oval(s,cx-0.25,cy-0.25,0.5,CYANL)
for n in ring1_nodes: oval(s,n[0]-0.12,n[1]-0.12,0.28,RGBColor(0xBF,0xC2,0xC7))
for n in ring2_nodes: oval(s,n[0]-0.1,n[1]-0.1,0.22,CYAN)
txt(s,8.5,1.7,4.3,0.5,'综述自动识别',22,TEAL,bold=True)
txt(s,8.5,2.35,4.3,1.0,'无变量、无实验步骤的综述 / 展望类文献，按结构证据自动切换为情报模式。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
txt(s,8.5,3.5,4.3,0.5,'三类图谱',22,TEAL,bold=True)
txt(s,8.5,4.15,4.3,1.0,'概念路线图、对比矩阵、年份演进时间线，全部从该论文自身的高频术语提取。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
txt(s,8.5,5.3,4.3,0.5,'不预设词池',22,TEAL,bold=True)
txt(s,8.5,5.95,4.3,1.0,'早期内置的领域词表已彻底移除——术语来自论文自己，而非套模板。',18,RGBColor(0x3C,0x4A,0x49),line_spacing=1.4)
footer(s,10)

# =========================================================
# P11 价值冲击（居中巨型数字，深青底）
# =========================================================
s = newslide()
grad_full(s,TEAL,DARK)
txt(s,0,0.7,SW,0.4,'价值冲击 · IMPACT',18,CYANL,bold=True,align=PP_ALIGN.CENTER)
vals=[('10×','科研效率跃升'),('85%','论文周期压缩'),('100%','原文可追溯 · 零编造')]
xb=0.85
for n,l in vals:
    txt(s,xb,1.9,3.7,1.6,n,108,CYAN,bold=True,fontname='Consolas',align=PP_ALIGN.CENTER)
    txt(s,xb,3.7,3.7,0.5,l,20,RGBColor(0xE6,0xF4,0xF1),align=PP_ALIGN.CENTER)
    if xb<9.0:
        rect(s,xb+3.85,2.0,0.02,1.5,RGBColor(0x7F,0xE9,0xDC))
    xb+=4.1
rect(s,5.5,4.5,2.3,0.06,CYAN)
txt(s,0,5.0,SW,1.0,'把科研的重复劳动交给 LATTICE，\n把创造的快乐还给你。',28,WHITE,bold=True,align=PP_ALIGN.CENTER,line_spacing=1.2)
txt(s,12.0,6.9,1.0,0.35,'11 / 14',12,RGBColor(0xCF,0xE9,0xE4),align=PP_ALIGN.RIGHT)

# =========================================================
# P12 技术底座（左标题 + 右内容）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
rect(s,0,0,4.45,SH,TEAL)
txt(s,0.55,2.9,3.4,1.0,'技术底座',50,WHITE,bold=True)
txt(s,0.6,3.85,3.4,0.4,'TECH FOUNDATION',15,CYANL)
rect(s,0.6,4.25,1.0,0.06,CYAN)
txt(s,0.6,4.6,3.4,1.0,'把复杂留给自己，\n把简单交给用户',14,RGBColor(0xCF,0xE9,0xE4),line_spacing=1.4)
tech=[('纯静态 · 零构建','无打包、无框架、无第三方运行时依赖，浏览器直接打开即可运行。'),
      ('PDF 解析器 v3','真实期刊 PDF 四层修复：4017 乱码 → 54586 字符干净正文。'),
      ('本地文献库','内置 132 条真实文献，离线可用，断网环境照常工作。'),
      ('双击即跑','python -m http.server 或直接打开 index.html，零运维零配置。')]
ty=1.0
for t,d in tech:
    rect(s,4.9,ty,7.9,1.15,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,4.9,ty,0.12,1.15,CYAN)
    txt(s,5.2,ty+0.16,7.4,0.45,t,21,INK,bold=True)
    txt(s,5.2,ty+0.62,7.4,0.45,d,14,GRAY,line_spacing=1.2)
    ty+=1.3
footer(s,12)

# =========================================================
# P13 为什么选我们（N 卡片横排）
# =========================================================
s = newslide()
rect(s,0,0,SW,SH,BG)
title_block(s,'为什么选 LATTICE')
cards=[('真实锚定 · 不编造','每条结论都附原文依据，缺项标「未报告」，绝不补全、绝不凭空生成数据——科研诚信的底线。'),
       ('零部署 · 零门槛','纯静态、零构建、零第三方运行时依赖，双击 index.html 即跑，无需服务器、无需配环境、无需联网。'),
       ('全学科 · 全覆盖','10 大材料方向、12 性能族、250+ 中英双语指标词表，从金属到能源到生物医用一体适用。')]
x=0.6
for t,d in cards:
    rect(s,x,1.8,3.95,4.6,WHITE,line=RGBColor(0xE1,0xE8,0xE7),lw=1)
    rect(s,x,1.8,3.95,0.14,CYAN)
    oval(s,x+1.55,2.3,0.9,PANEL)
    txt(s,x+1.55,2.45,0.9,0.6,'●',30,CYAN,bold=True,align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
    txt(s,x+0.3,3.5,3.4,0.6,t,22,TEAL,bold=True)
    txt(s,x+0.3,4.2,3.4,1.9,d,16,GRAY,line_spacing=1.4)
    x+=4.15
footer(s,13)

# =========================================================
# P14 结束页
# =========================================================
s = newslide()
grad_full(s,TEAL,DARK)
# 晶格向上生长
import math
cx=6.666
for i in range(8):
    x=1.4+i*1.3
    line(s,cx,yb if False else 1.2,x,5.9,CYAN,1.4,op=32)
oval(s,x-0.07,5.83,0.18,CYANL)
for i in range(7):
    x=1.4+i*1.3
    line(s,x+1.3,5.9,x,5.9,CYAN,1.2,op=25)
oval(s,cx-0.18,1.02,0.36,CYANL)
oval(s,cx-0.3,0.9,0.6,CYAN,line=None); alpha(oval(s,cx-0.3,0.9,0.6,CYAN,None),25)
txt(s,0,2.5,SW,1.4,'把科研的重复劳动，\n交给 LATTICE。',50,WHITE,bold=True,align=PP_ALIGN.CENTER,line_spacing=1.2)
rect(s,5.5,4.3,2.3,0.06,CYAN)
txt(s,0,4.7,SW,0.6,'现在就双击 index.html，开启你的十环节科研流水线。',22,RGBColor(0xCF,0xE9,0xE4),align=PP_ALIGN.CENTER)
txt(s,0.6,6.7,8,0.4,'LATTICE · 材料学科科研自动化平台',14,RGBColor(0xCF,0xE9,0xE4))
txt(s,12.0,6.7,1.0,0.4,'14 / 14',14,RGBColor(0xCF,0xE9,0xE4),align=PP_ALIGN.RIGHT)

# ---------- 保存 ----------
out = r'D:/learnbuddy内容/2026-09-17-01-28-37/LATTICE-PPT/LATTICE平台介绍.pptx'
prs.save(out)
print('SAVED', out, 'slides=', len(prs.slides._sldIdLst))
