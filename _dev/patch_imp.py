VC = r'D:\learnbuddy内容\2026-09-17-01-28-37\lattice-platform\assets\js\views2-stages.js'
s = open(VC, encoding='utf-8').read()

start = s.index('  /* ======================= 01 文献导入与解析 ======================= */')
end = s.index('  /* ======================= 02 文献拓展与研究定位 ======================= */')

NEW = '''  /* ======================= 01 文献导入与解析 ======================= */
  MR.views2.imp = {
    render: function () {
      var an = AN(), pf = PF();
      var papers = window.MR_PAPERS || [];
      var samples = papers.filter(function (p) { return p.kind && p.kind.indexOf('示例') >= 0; });
      var cases = papers.filter(function (p) { return p.kind && p.kind.indexOf('已核验') >= 0; });
      var doms = (MR.domain && MR.domain.MATERIAL_DOMAINS) || [];
      var html = '';

      html += MR.head({
        n: '01', t: '文献导入与解析',
        sub: '本平台面向材料学科的全部方向。导入任意材料类论文（DOCX / TXT / PDF 或粘贴正文），平台会抽取其中真实出现的内容：原料与试剂、仪器设备、测试标准、工艺步骤、变量与水平、可测指标、配比与参考文献。原文没有的项目一律标为「未报告」，不会被补全，也不会进入后续分析。',
        acts: '<button class="btn" data-act="pick">' + MR.icon('imp') + '上传文献</button>' +
          '<button class="btn" data-act="paste">粘贴正文</button>'
      });

      /* 1. 材料方向 */
      html += MR.panel({
        title: '第 1 步 · 选择材料方向', meta: doms.length + ' 个方向 · 可选', icon: 'scope', pad: true,
        body: '<div class="mono-xs" style="margin-bottom:9px">选择方向后，平台会按该方向的术语表增强识别（力学 / 热学 / 电学 / 光学 / 磁学 / 化学 / 加工 / 结构 / 生物 / 吸附…），并据此解释你的结果。不选也可以，平台会自动识别。</div>' +
          '<div class="recipe">' + doms.map(function (d) {
            var on = MR.state.domain === d.k;
            return '<button type="button" class="rc' + (on ? ' is-on' : '') + '" data-dom="' + d.k + '">' +
              '<div class="rc__t">' + d.t + '</div><div class="rc__d">' + d.d + '</div>' +
              '<div class="rc__x" style="color:var(--ink-4)">' + d.hint.slice(0, 4).join(' · ') + '</div></button>';
          }).join('') + '</div>' +
          '<div class="switchline" style="margin-top:10px"><span class="switchline__k">当前：' +
          (MR.state.domain ? (doms.filter(function (x) { return x.k === MR.state.domain; })[0] || {}).t : '自动识别（未指定方向）') + '</span>' +
          '<button class="btn btn--sm" data-dom="__auto">' + (MR.state.domain ? '改为自动识别' : '已为自动') + '</button></div>'
      }) + '<div class="mb-4"></div>';

      /* 2. 上传 */
      html += '<div class="dropzone mb-4" id="dz">' +
        '<div class="dropzone__icon"><svg viewBox="0 0 40 40" width="36" height="36"><path d="M20 27V9M20 9l-7 7M20 9l7 7M8 32h24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="dropzone__t">拖入论文文件，或点击选择</div>' +
        '<div class="dropzone__d">DOCX（浏览器内直接解压解析）· TXT / MD · PDF（解压内容流并解析 ToUnicode，可抽取中文正文）<br>' +
        '扫描件或加密文档可能取不到文字，此时请用「粘贴正文」—— 平台不会用模板内容填空。</div>' +
        '<div class="dropzone__hint">文件只在本机浏览器内解析，不会上传到服务器</div></div>';

      /* 3. 可选文档 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '示例文档', meta: samples.length + ' 篇 · 平台自造', icon: 'lit', pad: true, flush: true,
          body: samples.length ? '<div class="rowlist">' + samples.map(function (p) {
            var on = MR.state.paper && MR.state.paper.id === p.id;
            var d = doms.filter(function (x) { return x.k === p.domain; })[0];
            return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-paper="' + p.id + '" style="grid-template-columns:1fr auto">' +
              '<span><span class="rowitem__title">' + MR.esc(p.name) + '</span>' +
              '<span class="rowitem__sub">' + (d ? d.t + ' · ' : '') + (p.chars / 1000).toFixed(1) + ' 千字符 · 虚构内容，仅用于演示抽取流程</span></span>' +
              '<span class="rowitem__side">' + (on ? MR.chip('当前', 'acc') : '') + '</span></button>';
          }).join('') + '</div>' : noneNote('无示例文档。'),
          note: '示例文档是平台自己写的虚构论文，覆盖金属、高分子复合材料、建筑材料、能源材料四个方向 —— 用来说明"同一套流水线能处理不同方向"，其中的配方与数值不具备任何学术效力。'
        }) +
        MR.panel({
          title: '已核验文献（仅题录）', meta: cases.length + ' 条', icon: 'book', pad: true, flush: true,
          body: cases.length ? '<div class="rowlist">' + cases.map(function (p) {
            var on = MR.state.paper && MR.state.paper.id === p.id;
            return '<button type="button" class="rowitem' + (on ? ' is-sel' : '') + '" data-paper="' + p.id + '" style="grid-template-columns:1fr auto">' +
              '<span><span class="rowitem__title" style="font-size:12px">' + MR.esc(p.name) + '</span>' +
              '<span class="rowitem__sub">' + MR.esc(p.note || '') + '</span></span>' +
              '<span class="rowitem__side">' + (on ? MR.chip('当前', 'acc') : '') + '</span></button>';
          }).join('') + '</div>' : noneNote('无核验文献。'),
          note: '这三条是真实文献，题录与 DOI 已通过 Crossref / 出版方页面核验。为遵守版权，平台不内嵌全文；如需分析请自行上传 PDF 或粘贴正文。'
        }) + '</div>';

      /* 未载入论文：给引导，不给错误 */
      if (!MR.state.paper) {
        html += MR.panel({
          title: '还没有载入论文', meta: '后续环节需要论文才能运行', icon: 'review1', cls: 'panel--acc', pad: true,
          body: '<div class="mono-xs" style="margin-bottom:8px">平台可以处理的方向</div>' +
            '<div class="chips mb-4">' + doms.map(function (d) { return '<span class="chip chip--line">' + d.t + '</span>'; }).join('') + '</div>' +
            '<div class="note note--acc">' + MR.icon('plan', 14) +
            '<span>三种开始方式：① 上传你的论文文件；② 粘贴论文正文；③ 选一篇示例文档先走通流程。<b>没有论文时，平台不会预先展示任何研究内容</b> —— 所有环节都等你导入之后才产生内容。</span></div>'
        }) + '<div class="mb-4"></div>';
        return html;
      }

      /* 抽取总览 */
      var conf = pf.confidence || 0;
      html += '<div class="metrics mb-4">' +
        MR.metric('抽取置信度', conf, ' / 100', '', conf >= 60 ? 'ok' : (conf >= 35 ? 'warn' : 'bad'), '由各字段抽取数量加权') +
        MR.metric('原料 / 试剂', an.materials.length, ' 种', '', an.materials.length ? 'ok' : 'warn') +
        MR.metric('仪器设备', an.instruments.length, ' 台', '', an.instruments.length ? 'ok' : 'warn') +
        MR.metric('变量（含水平）', an.variables.length, ' 个', '', an.variables.length ? 'ok' : 'bad') +
        MR.metric('可测指标', pf.perf.length, ' 项', '', pf.perf.length ? 'ok' : 'bad') +
        MR.metric('表征手段', pf.chars.length, ' 项', '', pf.chars.length ? 'ok' : 'warn') +
        MR.metric('工艺步骤', an.steps.length, ' 步', '', an.steps.length ? 'ok' : 'warn') +
        MR.metric('参考文献', an.references.length, ' 条', '', an.references.length ? 'ok' : 'warn') +
        '</div>';

      /* 指标按性能族归类 */
      if (pf.perf.length) {
        var fams = {};
        pf.perf.forEach(function (p) { (fams[p.family || '其他指标'] = fams[p.family || '其他指标'] || []).push(p.name); });
        html += MR.panel({
          title: '可测指标（按性能族归类）', meta: Object.keys(fams).length + ' 个族 · ' + pf.perf.length + ' 项', icon: 'analysis', pad: true,
          body: Object.keys(fams).map(function (k) {
            var fam = (MR.domain.PROPERTY_FAMILIES || []).filter(function (x) { return x.k === k; })[0] || {};
            return '<div class="switchline"><span class="switchline__k"><span class="led" style="background:' + (MR.colors[fam.color ? fam.color.replace('--', '') : 'sub'] || 'var(--acc)') + ';display:inline-block;margin-right:7px"></span>' + k +
              '<span class="mono-xs" style="display:block;text-transform:none">' + fams[k].join('、') + '</span></span>' + MR.chip(fams[k].length + ' 项', 'acc') + '</div>';
          }).join(''),
          note: '归类依据是材料学科的性能族词表（力学 / 热学 / 电学与电化学 / 光学 / 磁学 / 化学与耐候 / 加工与成型 / 结构与成分 / 生物与安全 / 吸附与分离）。归类只影响解释口径，不改变抽取到的内容。'
        }) + '<div class="mb-4"></div>';
      }

      if (!an.materials.length && !pf.perf.length) {
        html += MR.note('本次抽取没有获得有效内容：该文件可能是扫描件（无文字层）、加密文档或主要靠图片承载信息。<b>平台不会用模板内容填充</b>。请换一篇有文字层的文献，或用「粘贴正文」把正文贴进来。', 'risk', 'review1') + '<div class="mb-4"></div>';
      }

      /* 分组明细 */
      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '原料与试剂', meta: an.materials.length + ' 种', icon: 'exp', pad: true, flush: true,
          body: an.materials.length ? '<div class="tbl-wrap"><table class="tbl tbl--sm"><thead><tr><th>名称</th><th>规格/纯度</th><th>供应</th><th>类别</th></tr></thead><tbody>' +
            an.materials.map(function (m) {
              return '<tr><td class="strong wrap">' + MR.esc(m.name) + ev('…' + MR.esc((m.evidence || '').slice(0, 58))) + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(m.spec || m.purity) || '—') + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(m.supplier) || '—') + '</td>' +
                '<td>' + MR.chip(m.kind, 'line') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文中未识别到"名称 + 规格 + 供应"格式的原料/试剂描述。')
        }) +
        MR.panel({
          title: '仪器设备', meta: an.instruments.length + ' 台', icon: 'exp', pad: true, flush: true,
          body: an.instruments.length ? '<div class="tbl-wrap" style="max-height:340px;overflow-y:auto"><table class="tbl tbl--sm"><thead><tr><th>名称</th><th>型号</th><th>厂家</th></tr></thead><tbody>' +
            an.instruments.map(function (i) {
              return '<tr><td class="strong wrap">' + MR.esc(i.name) + '</td><td class="wrap" style="font-size:11px">' + (MR.esc(i.model) || '<span style="color:var(--sig)">未报告</span>') + '</td>' +
                '<td class="wrap" style="font-size:11px;color:var(--ink-3)">' + (MR.esc(i.vendor) || '—') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : noneNote('原文中未识别到仪器清单。')
        }) + '</div>';

      html += '<div class="grid g-2 mb-4">' +
        MR.panel({
          title: '变量与水平', meta: an.variables.length + ' 个', icon: 'design', pad: true, flush: true,
          body: an.variables.length ? '<div class="rowlist">' + an.variables.map(function (v) {
            return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
              '<span><span class="rowitem__title">' + MR.esc(v.key) + '</span>' +
              '<span class="rowitem__sub">取值：' + v.levels.join('、') + '（共 ' + v.levels.length + ' 个水平）</span>' + ev(MR.esc(v.evidence.slice(0, 88))) + '</span>' +
              '<span class="rowitem__side">' + MR.chip(v.sec || '原文', 'line') + '</span></div>';
          }).join('') + '</div>' : noneNote('原文中未识别到"同一参数出现两个以上取值"的变量描述 —— 后续环节无法做变量分析。')
        }) +
        MR.panel({
          title: '指标与表征手段', meta: pf.perf.length + ' + ' + pf.chars.length, icon: 'analysis', pad: true, flush: true,
          body: (pf.perf.length || pf.chars.length) ? '<div class="rowlist" style="max-height:340px;overflow-y:auto">' +
            pf.perf.map(function (i) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(i.name) +
                (i.family ? MR.chip(i.family, 'acc') : '') +
                (i.polarity === 'min' ? MR.chip('越小越优', 'sig') : MR.chip('越大越优', 'ok')) +
                (i.optimum != null ? MR.chip('原文最优 ' + i.optimum, 'acc') : '') +
                (i.improvement != null ? MR.chip('原文报道 ' + (i.improvement > 0 ? '+' : '') + i.improvement + '%', 'acc') : '') + '</span>' +
                '<span class="rowitem__sub">方向：' + ({ 'rise-fall': '先升后降（原文描述）', 'mono-up': '单调上升', 'mono-down': '单调下降' }[i.direction] || '原文未明确描述，按最优值推断') + '</span>' +
                ev(MR.esc((i.evidence || '').slice(0, 96))) + '</span>' +
                '<span class="rowitem__side">' + indKindChip(i.kind) + '</span></div>';
            }).join('') +
            pf.chars.map(function (c) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(c.name) + '</span>' +
                '<span class="rowitem__sub">表征手段 · 用于结构/界面归因</span>' + ev(MR.esc((c.evidence || '').slice(0, 78))) + '</span>' +
                '<span class="rowitem__side">' + indKindChip(c.kind) + '</span></div>';
            }).join('') + '</div>' : noneNote('原文中未识别到可测性能指标与表征手段。')
        }) + '</div>';

      html += '<div class="grid g-2-1 mb-4">' +
        MR.panel({
          title: '工序与配方', meta: an.steps.length + ' 步 · ' + PF().formulation.length + ' 项', icon: 'plan', pad: true, flush: true,
          body: (an.steps.length || PF().formulation.length) ? '<div class="rowlist">' +
            PF().formulation.map(function (f) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">' + MR.esc(f.t) + '</span><span class="rowitem__sub">' + MR.esc(f.v) + '</span>' + ev(MR.esc((f.evidence || '').slice(0, 78))) + '</span>' +
                '<span class="rowitem__side">' + MR.chip('配方', 'acc') + '</span></div>';
            }).join('') +
            an.steps.map(function (st, i) {
              return '<div class="rowitem" style="grid-template-columns:1fr auto;cursor:default">' +
                '<span><span class="rowitem__title">(' + (i + 1) + ') ' + MR.esc(st.t) + '</span>' +
                '<span class="rowitem__sub">' + MR.esc(st.d) + (st.cond ? '<br><b style="color:var(--acc)">条件：' + MR.esc(st.cond) + '</b>' : '') + '</span></span>' +
                '<span class="rowitem__side">' + MR.chip(st.from || '原文', 'line') + '</span></div>';
            }).join('') + '</div>' : noneNote('原文中未识别到工艺步骤与配方。')
        }) +
        '<div class="col">' + MR.panel({
          title: '原文缺失项（后续不再臆造）', meta: (pf.missing || []).length + ' 类', icon: 'review1', cls: pf.missing.length ? 'panel--sig' : '', pad: true, tight: true,
          body: (pf.missing || []).length ? pf.missing.map(function (m) {
            return '<div class="switchline"><span class="switchline__k">' + m + '</span>' + MR.chip('未报告', 'sig') + '</div>';
          }).join('') : MR.note('原文在变量、指标、原料、仪器、参考文献五个维度均有报告。', 'ok', 'review1')
        }) + MR.panel({
          title: '标准与检测依据', meta: an.standards.length + ' 项', icon: 'book', pad: true, tight: true,
          body: an.standards.length ? an.standards.map(function (s2) { return '<div class="switchline"><span class="switchline__k">' + MR.esc(s2) + '</span></div>'; }).join('')
            : noneNote('原文未引用测试标准编号。')
        }) + '</div></div>';

      html += MR.panel({
        title: '参考文献（原文列表）', meta: an.references.length + ' 条', icon: 'book', pad: true, flush: true,
        acts: '<button class="btn btn--sm" data-act="dlrefs">导出 GB/T 7714</button>',
        body: an.references.length ? '<div class="tbl-wrap" style="max-height:280px;overflow-y:auto"><table class="tbl tbl--sm"><tbody>' +
          an.references.map(function (r, i) {
            return '<tr><td class="num" style="width:40px;color:var(--ink-3)">[' + (i + 1) + ']</td>' +
              '<td class="wrap" style="font-size:11.5px">' + MR.esc(r.raw) + '</td>' +
              '<td style="width:70px">' + MR.chip(r.type, 'line') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : noneNote('原文未识别到参考文献列表。'),
        note: '导出时按 GB/T 7714-2015 著录；缺失字段（如 DOI、卷期页）会按原文原样保留并标注，不补造。'
      });
      return html;
    },
    mount: function (host) {
      var dz = host.querySelector('#dz');
      if (dz) {
        dz.addEventListener('click', function () { MR.pick('file'); });
        ['dragenter', 'dragover'].forEach(function (e2) { dz.addEventListener(e2, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
        ['dragleave', 'drop'].forEach(function (e2) { dz.addEventListener(e2, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
        dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) MR.app.handleDocFiles(e.dataTransfer.files); });
      }
      host.querySelectorAll('[data-dom]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-dom');
          MR.setDomain(k === '__auto' ? '' : k);
        });
      });
      host.querySelectorAll('[data-paper]').forEach(function (b) {
        b.addEventListener('click', function () { MR.loadPaper(b.getAttribute('data-paper')); });
      });
      var pk = host.querySelector('[data-act="pick"]'); if (pk) pk.addEventListener('click', function () { MR.pick('file'); });
      var ps = host.querySelector('[data-act="paste"]');
      if (ps) ps.addEventListener('click', function () {
        MR.modal.open('粘贴论文正文',
          '<div class="mono-xs" style="margin-bottom:8px">把论文的正文（含摘要、材料与方法、结果、结论）粘贴到这里</div>' +
          '<textarea id="pasteDoc" class="eq" style="width:100%;height:240px;resize:vertical;white-space:pre-wrap" placeholder="论文题目：…&#10;摘要…&#10;2 试验材料与方法…"></textarea>' +
          '<div class="note" style="margin-top:12px">' + MR.icon('review1', 14) + '<span>建议至少包含"材料与方法"和"结果与讨论"两部分，抽取引擎需要它们来识别变量与指标。</span></div>',
          '<button class="btn" data-close="1">取消</button><button class="btn btn--primary" data-ok="1">开始解析</button>');
        setTimeout(function () {
          var ok = document.querySelector('[data-ok="1"]');
          if (ok) ok.addEventListener('click', function () {
            var t = document.getElementById('pasteDoc').value || '';
            if (t.trim().length < 300) MR.log('WARN', '粘贴内容过短（< 300 字），抽取结果会很有限');
            MR.loadText(t, '粘贴文本 · ' + t.slice(0, 24).replace(/\\n/g, ' '));
            MR.modal.close();
          });
        }, 0);
      });
      var dr = host.querySelector('[data-act="dlrefs"]');
      if (dr) dr.addEventListener('click', function () {
        var lines = AN().references.map(function (r, i) { return '[' + (i + 1) + '] ' + r.raw; });
        var miss = AN().references.filter(function (r) { return (r.missing || []).length; }).length;
        MR.dl('LATTICE-参考文献-GBT7714.txt', lines.join('\\n') + (miss ? '\\n\\n# 注：' + miss + ' 条缺少必要著录项，已按原文原样保留（未补造）' : ''), 'text/plain');
      });
      bindFig(host);
    }
  };

'''

s = s[:start] + NEW + s[end:]
open(VC, 'w', encoding='utf-8').write(s)
print('views2-stages.js imp rewritten')
