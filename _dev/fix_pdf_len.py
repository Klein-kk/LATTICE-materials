P = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\pdftext.js'
lines = open(P, encoding='utf-8').read().split('\n')
idx = None
for i, l in enumerate(lines):
    if 'if (lenM &&' in l:
        idx = i
        break
assert idx is not None, 'anchor line not found'
# 该 if 语句因换行被拆成 2 行，紧接着是第 3 行守卫；整体替换为 3 行规范实现
new = [
    '        /* 若 /Length 是间接引用（形如 /Length 12 0 R），长度不可信 → 改用 endstream 定位 */',
    '        var lenDecl = dict.match(/\\/Length[^\\r\\n]{0,24}/);',
    '        if (lenM && lenDecl && /\\d+\\s+\\d+\\s+R/.test(lenDecl[0])) len = -1;',
    '        if (len > 0 && start + len <= u8.length && (endTag < 0 || start + len <= endTag + 4)) {',
    '          raw = u8.subarray(start, start + len);',
    '        }'
]
# 删除原 3 行（broken if 两行 + guard 一行 + 块内两行 + 闭合一行）
end = idx
while end < len(lines) and 'raw = u8.subarray(start, start + len);' not in lines[end]:
    end += 1
# 再吞掉闭合大括号与可能的校验注释行
end += 1
while end < len(lines) and lines[end].strip() in ('}', ''):
    end += 1
    break
lines[idx:end] = new
open(P, 'w', encoding='utf-8').write('\n'.join(lines))
print('patched lines', idx, '->', end)
