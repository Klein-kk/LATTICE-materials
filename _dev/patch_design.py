C = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\css\app.css'
s = open(C, encoding='utf-8').read()

old = """  /* 纸面与油墨 */
  --paper:      #F5F3EE;
  --paper-2:    #EFEBE3;
  --surface:    #FFFFFF;
  --surface-2:  #FAF9F6;
  --surface-3:  #F2F0EA;
  --ink:        #14181C;
  --ink-2:      #4B535B;
  --ink-3:      #878F97;
  --ink-4:      #B4BABE;
  --line:       #E1DCD2;
  --line-2:     #EBE7DF;
  --line-strong:#CFC9BC;

  /* 强调色（可由 Tweaks 覆写） */
  --acc:        #0E5C56;
  --acc-2:      #177E76;
  --acc-ink:    #0A423E;
  --acc-tint:   #E3EDEB;
  --acc-tint-2: #CEE0DD;

  /* 信号色 · 空缺 / 待办 / 注意 */
  --sig:        #A2660F;
  --sig-tint:   #F7EEDB;
  --sig-line:   #E6D4AE;

  /* 风险 */
  --risk:       #9B382A;
  --risk-tint:  #F8E8E4;
  --risk-line:  #EDCFC8;

  /* 通过 */
  --ok:         #2E6A45;
  --ok-tint:    #E5EFE7;
  --ok-line:    #C9DCCF;"""
new = """  /* 纸面与油墨（中性冷调 · 高级简约） */
  --paper:      #F6F7F8;
  --paper-2:    #F1F2F4;
  --surface:    #FFFFFF;
  --surface-2:  #FAFBFC;
  --surface-3:  #F2F3F5;
  --ink:        #15181C;
  --ink-2:      #4C5258;
  --ink-3:      #868D94;
  --ink-4:      #ABAفF2;
  --line:       #E4E6E9;
  --line-2:     #EFF0F2;
  --line-strong:#CFD3D8;

  /* 强调色（可由 Tweaks 覆写） */
  --acc:        #16544F;
  --acc-2:      #1E6F68;
  --acc-ink:    #0C3D39;
  --acc-tint:   #EDF3F2;
  --acc-tint-2: #D8E5E3;

  /* 信号色 · 空缺 / 待办 / 注意 */
  --sig:        #8A6410;
  --sig-tint:   #F8F3E6;
  --sig-line:   #E8DDBF;

  /* 风险 */
  --risk:       #8E3A2E;
  --risk-tint:  #F9EEEB;
  --risk-line:  #EDD5CF;

  /* 通过 */
  --ok:         #2C6342;
  --ok-tint:    #EBF2ED;
  --ok-line:    #CDDFD3;"""
assert old in s, 'tokens anchor'
s = s.replace(old, new)

# 数据色同步（避免旧的暖色残留）
s = s.replace("""  --c1: #0E5C56;
  --c2: #2C4A7C;
  --c3: #A2660F;
  --c4: #9B382A;
  --c5: #5F6B23;
  --c6: #7A7480;""",
"""  --c1: #16544F;
  --c2: #2C4A7C;
  --c3: #8A6410;
  --c4: #8E3A2E;
  --c5: #5F6B23;
  --c6: #77808A;""")

# 底纹更淡（简约感）
s = s.replace("linear-gradient(to right, rgba(20,24,28,.035) 1px, transparent 1px),\n    linear-gradient(to bottom, rgba(20,24,28,.035) 1px, transparent 1px);\n  background-size:8px 8px;",
              "linear-gradient(to right, rgba(20,24,28,.022) 1px, transparent 1px),\n    linear-gradient(to bottom, rgba(20,24,28,.022) 1px, transparent 1px);\n  background-size:10px 10px;")
s = s.replace("background-size:8px 8px;", "background-size:10px 10px;")

# 焦点态更清晰
s = s.replace(":focus-visible{ outline:2px solid var(--acc-2); outline-offset:1px; border-radius:var(--r-xs); }",
              ":focus-visible{ outline:2px solid var(--acc-2); outline-offset:2px; border-radius:var(--r-xs); }\nbutton:focus-visible, a:focus-visible{ outline-offset:2px; }")

# 视图标题排版更克制
s = s.replace(".view__title{ font-size:25px; font-weight:600; letter-spacing:-.015em; line-height:1.15; }",
              ".view__title{ font-size:23px; font-weight:600; letter-spacing:-.02em; line-height:1.2; }")

# 面板：去掉多余阴影，统一发丝线
s = s.replace(".panel{\n  background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md);\n  display:flex; flex-direction:column; min-width:0;\n}",
              ".panel{\n  background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md);\n  display:flex; flex-direction:column; min-width:0;\n}")

# 按钮：更清晰的层级与悬停
s = s.replace(""".btn:hover{ background:var(--surface-2); color:var(--ink); border-color:var(--line-strong); }""",
""".btn:hover{ background:var(--surface-3); color:var(--ink); border-color:var(--line-strong); }
.btn:active{ transform:translateY(1px); }
.btn:focus-visible{ outline:2px solid var(--acc-2); outline-offset:2px; }""")
s = s.replace(""".btn--primary:hover{ background:var(--acc-2); border-color:var(--acc-2); color:#fff; }""",
""".btn--primary:hover{ background:var(--acc-2); border-color:var(--acc-2); color:#fff; box-shadow:0 1px 2px rgba(12,61,57,.18); }""")

open(C, 'w', encoding='utf-8').write(s)
print('app.css tokens refreshed')

# 修掉上面误输入的一个字符
s2 = open(C, encoding='utf-8').read()
if '--ink-4:      #ABA\u0641F2;' in s2 or '#ABA' in s2:
    import re
    s2 = re.sub(r'--ink-4:\s*#[0-9A-Fa-f\u0600-\u06FF]{6};', '--ink-4:      #ABAEB2;', s2)
    open(C, 'w', encoding='utf-8').write(s2)
    print('ink-4 fixed')

# ============ extra.css：新增 .sec-title 等 ============
E = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\css\extra.css'
e = open(E, encoding='utf-8').read()
e += """

/* ---------- 分区标题（3D 图形区等） ---------- */
.sec-title{
  display:flex; align-items:center; gap:10px; margin:26px 0 12px;
  font-size:14px; font-weight:600; letter-spacing:-.01em; color:var(--ink);
}
.sec-title::after{ content:""; flex:1; height:1px; background:var(--line); }
.sec-title .mono-xs{ font-weight:400; letter-spacing:.04em; }

/* ---------- 图型手册卡片 ---------- */
.mech{ border-color:var(--line); }
.mech__h{ gap:8px; }
.mech .chip{ white-space:nowrap; }

/* ---------- 交互清晰度：可点击元素统一反馈 ---------- */
.rowitem:active, .casecard:active, .rc:active, .equipc:active, .hstep:active{ transform:translateY(1px); }
.rowitem:focus-visible, .rc:focus-visible, .equipc:focus-visible{ outline:2px solid var(--acc-2); outline-offset:2px; }
.switchline .btn--sm{ min-width:52px; }
.hstep.is-on{ box-shadow:inset 0 -2px 0 var(--acc); }
figure, .figbox{ margin:0; }
"""
open(E, 'w', encoding='utf-8').write(e)
print('extra.css extended')
