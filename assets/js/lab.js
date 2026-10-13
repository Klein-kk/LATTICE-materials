/* ============================================================
   LATTICE · 虚拟实验台模块（嵌入主站环节 03 · 变量设计与安全评估）
   ============================================================
   用法：MR.lab.renderLabPanel(host, profile)
   - host: 容器 DOM
   - profile: 当前文献的解析数据（可选，未导入时用内置示例）
   ============================================================ */
window.MR = window.MR || {};
(function () {

  /* ---------- OrbitControls 加载（主站 vendor 里没有，从 CDN 补） ---------- */
  var orbitControlsLoaded = false;
  function ensureOrbitControls(cb) {
    if (orbitControlsLoaded) { cb(); return; }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    script.onload = function () { orbitControlsLoaded = true; cb(); };
    script.onerror = function () { orbitControlsLoaded = false; cb(); };
    document.head.appendChild(script);
  }

  /* ---------- 简化版相机控制（无 OrbitControls 时降级） ---------- */
  function simpleControls(camera, domElement, opts) {
    opts = opts || {};
    var self = this;
    self.target = opts.target || new THREE.Vector3(0, 0, 0);
    self.autoRotate = opts.autoRotate !== false;
    self.autoRotateSpeed = opts.autoRotateSpeed || 0.5;
    self.enableDamping = true;
    self.dampingFactor = 0.08;
    self.enabled = true;

    var spherical = new THREE.Spherical();
    var target = new THREE.Vector3().copy(self.target);
    var rotateSpeed = 0.5;
    var isDragging = false;
    var lastX = 0, lastY = 0;

    function updateSpherical() {
      spherical.setFromVector3(camera.position.clone().sub(self.target));
    }
    updateSpherical();

    function onPointerDown(e) {
      isDragging = true;
      lastX = e.clientX; lastY = e.clientY;
      domElement.setPointerCapture && domElement.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      var dx = (e.clientX - lastX) / domElement.clientWidth * 360 * rotateSpeed;
      var dy = (e.clientY - lastY) / domElement.clientHeight * 360 * rotateSpeed;
      spherical.theta -= dx * Math.PI / 180;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * Math.PI / 180));
      lastX = e.clientX; lastY = e.clientY;
    }
    function onPointerUp() { isDragging = false; }
    function onWheel(e) {
      e.preventDefault();
      spherical.radius *= (1 + e.deltaY * 0.001);
      spherical.radius = Math.max(1, Math.min(20, spherical.radius));
    }
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    self.update = function () {
      if (self.autoRotate && !isDragging) {
        spherical.theta += self.autoRotateSpeed * 0.01;
      }
      camera.position.setFromSpherical(spherical).add(self.target);
      camera.lookAt(self.target);
    };
    self.dispose = function () {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
      domElement.removeEventListener('wheel', onWheel);
    };
    return self;
  }

  function makeControls(camera, domElement, opts) {
    if (typeof THREE.OrbitControls === 'function') {
      return new THREE.OrbitControls(camera, domElement);
    }
    return new simpleControls(camera, domElement, opts);
  }

  /* ---------- 1. 根据 profile 推导文献-aware 的实验上下文 ---------- */
  /* 返回 { reagents, formulation, variables, instruments, standards,
           experiment, variableSweep, paperCitation, derivedFallback } */
  function derivePaperContext(profile) {
    if (!profile) return null;

    /* 1. 收集试剂（既走 chem 引擎，又把"未识别但论文里有"的留作展示） */
    var materials = profile.materials || [];
    var reagentsResolved = [];
    var reagentsAll = [];
    materials.forEach(function (m) {
      var name = typeof m === 'string' ? m : (m.name || '');
      var clean = String(name).replace(/（.*?）/g, '').replace(/(99\.0%|98\.0%|96%|97%|AR|≧AR|≧98\.\d+%|≧\d+%)/g, '').trim();
      if (!clean) return;
      reagentsAll.push(clean);
      var sub = (MR.chem && MR.chem.resolveSubstance) ? MR.chem.resolveSubstance(clean) : null;
      if (sub) {
        reagentsResolved.push({
          name: clean, formula: sub.formula, category: sub.category,
          color: categoryColor(sub.category), known: true
        });
      } else {
        /* 论文里有但 chem 没收录（如合金/树脂）：派生物理存在 */
        reagentsResolved.push({
          name: clean, formula: '(材料)', category: 'material',
          color: categoryColor('material'), known: false,
          rationale: '仅在文献中出现，未对应化学引擎条目；按物理试剂展示'
        });
      }
    });

    /* 2. 命中实验目录（先 rawText → 然后仅 profile 二次兜底） */
    var rawText = (profile.__rawText) || (profile.rawText) || '';
    var expHits = (MR.matchExperiment) ? MR.matchExperiment(rawText) : [];
    if ((!expHits || expHits.length === 0) && MR.findExperimentsForProfile) {
      expHits = MR.findExperimentsForProfile(profile);
    }
    var experiment = (expHits && expHits.length) ? expHits[0] : null;

    /* 3. 派生实验：若未命中，从材料 + 变量推出"工艺类型"模拟 */
    var derivedFallback = null;
    if (!experiment) {
      derivedFallback = deriveFallbackExperiment(profile, reagentsResolved);
    }

    /* 4. 变量扫描：从 matrix 抽出 paper 在每个变量 × 指标下的最优值与幅度 */
    var variableSweep = [];
    var matrix = profile.matrix || [];
    if (matrix.length) {
      matrix.forEach(function (m) {
        var v = (profile.variables || []).find(function (x) { return x.key === m.v; });
        if (!v) return;
        variableSweep.push({
          variable: v,
          indicator: m.i,
          direction: m.dir,
          optimum: m.opt,
          amplitude: m.amp,
          polarity: m.polarity
        });
      });
    }

    /* 5. 引用行：从 numbers 抽出 2~3 行原文证据 */
    var paperCitation = (profile.numbers || []).slice(0, 4);

    return {
      reagents: reagentsAll,
      reagentsResolved: reagentsResolved,
      formulation: profile.formulation || {},
      variables: profile.variables || [],
      instruments: (profile.instruments || []).map(function (i) {
        return typeof i === 'string' ? { name: i } : i;
      }),
      standards: profile.standards || [],
      perf: profile.perf || [],
      chars: profile.chars || [],
      experiment: (experiment && experiment.experiment) || null,
      experimentHits: expHits || [],
      variableSweep: variableSweep,
      paperCitation: paperCitation,
      derivedFallback: derivedFallback,
      title: profile.title || ''
    };
  }

  /* 论文未命中实验目录时，用材料/变量类型反推一种"工艺类型"模拟 */
  function deriveFallbackExperiment(profile, reagents) {
    var matNames = reagents.map(function (r) { return r.name; }).join(' ');
    var varKey = (profile.variables || []).map(function (v) { return v.key; }).join(' ');
    var t = (profile.title || '') + ' ' + matNames + ' ' + varKey;
    /* 按关键词推断 paperType */
    var paperType =
      /电池|电化学|容量|充放电|正极|负极|电解液|磷酸铁|钒酸盐|NASICON/.test(t)  ? 'sol-gel-carbon-coating' :
      /碱激发|C-A-S-H|偏高岭土|矿渣|胶凝|水泥|水玻璃/.test(t)                     ? 'alkali-activation' :
      /复合材料|玄武岩|玻璃纤维|树脂|偶联剂|VARTM|层合/.test(t)                     ? 'composite-curing' :
      /退火|再结晶/.test(t)                                                        ? 'steel-annealing' :
      /(6061|7075|AZ91|T6|TC4|铝合金|镁合金|钛合金|时效|固溶|β″)/.test(t)         ? 'heat-treatment' :
      'unspecified';
    return {
      slug: 'paper-derived-' + paperType,
      title: '派生：基于材料与变量推断的实验工艺',
      paperType: paperType,
      description: '文献未在实验目录中精确命中；根据材料与变量自动推出对应的材料/合成工艺模拟。'
    };
  }

  /* 兼容旧 API（供 SAMPLE_PROFILES 之类的旧调用者使用） */
  function extractFromProfile(profile) {
    if (!profile) return null;
    var ctx = derivePaperContext(profile);
    return {
      reagents: ctx.reagents, formulation: ctx.formulation, variables: ctx.variables
    };
  }

  /* ---------- SVG 变量扫描图（小图） ---------- */
  /* sweeps: [{ variable, indicator, optimum, amplitude }]
     返回 SVG markup，宽度 280 高度 110 的 mini chart */
  function renderVariableSweepSVG(sweeps) {
    if (!sweeps || sweeps.length === 0) return '<div style="color:var(--ink-3);font-size:11.5px">原文未给出变量-响应矩阵，无法绘制扫描图。</div>';
    var W = 280, H = 110, padL = 24, padR = 10, padT = 16, padB = 26;
    var sw = W - padL - padR, sh = H - padT - padB;
    var parts = [];
    /* 显示第一个 sweep（多的话，让用户选） */
    var swp = sweeps[0];
    var levels = (swp.variable && swp.variable.levels) || [];
    var xKey = swp.variable ? (swp.variable.key || '') : '';
    var yKey = swp.indicator || '';
    /* 若无 optimum，构造一条带 1.0 峰值的钟形曲线 */
    var n = Math.max(3, levels.length);
    var points = [];
    for (var i = 0; i < n; i++) {
      var t = (i + 1) / (n + 1);
      var y = 1.0 - Math.abs(t - 0.5) * 2.0;
      points.push(Math.max(0.05, y));
    }
    var arr = points.map(function (y, i) { return y; });
    if (swp.amplitude != null && typeof swp.amplitude === 'number') {
      arr = arr.map(function (y) { return y * (swp.amplitude / 100) || y; });
    }
    var max = Math.max.apply(null, arr.concat([0.1]));
    var peak = arr.indexOf(Math.max.apply(null, arr));
    var px = function (i) { return padL + (i / Math.max(1, n - 1)) * sw; };
    var py = function (y) { return padT + (1 - y / max) * sh; };
    /* 网格 + 轴 */
    parts.push('<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (H - padB) + '" stroke="#3a3a40" stroke-width="1"/>');
    parts.push('<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="#3a3a40" stroke-width="1"/>');
    /* 折线 + 面积 */
    var pathPts = arr.map(function (y, i) { return px(i) + ',' + py(y); }).join(' ');
    parts.push('<polyline points="' + pathPts + '" fill="none" stroke="#2dd4bf" stroke-width="2"/>');
    var areaPts = [px(0) + ',' + (H - padB)].concat(arr.map(function (y, i) { return px(i) + ',' + py(y); })).concat([px(n - 1) + ',' + (H - padB)]).join(' ');
    parts.push('<polygon points="' + areaPts + '" fill="rgba(45,212,191,.15)"/>');
    /* 数据点 */
    arr.forEach(function (y, i) {
      parts.push('<circle cx="' + px(i) + '" cy="' + py(y) + '" r="3" fill="#2dd4bf"/>');
    });
    /* 最优点标记 */
    if (peak >= 0) {
      parts.push('<circle cx="' + px(peak) + '" cy="' + py(arr[peak]) + '" r="6" fill="none" stroke="#facc15" stroke-width="2"/>');
    }
    /* 标签 */
    parts.push('<text x="' + (W - padR) + '" y="' + padT + '" text-anchor="end" fill="var(--ink-2)" font-size="10" font-family="var(--mono)">' + yKey + '</text>');
    levels.forEach(function (lv, i) {
      if (i < n) {
        parts.push('<text x="' + px(i) + '" y="' + (H - padB + 14) + '" text-anchor="middle" fill="var(--ink-3)" font-size="9.5">' + lv + '</text>');
      }
    });
    parts.push('<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--ink-3)" font-size="10">' + xKey + '</text>');
    if (peak >= 0 && levels[peak] != null) {
      parts.push('<text x="' + px(peak) + '" y="' + (py(arr[peak]) - 8) + '" text-anchor="middle" fill="#facc15" font-size="10">opt ' + levels[peak] + '</text>');
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' + parts.join('') + '</svg>';
  }

  /* ---------- 2. 未导入文献时的示例（来自 lab-experiments） ---------- */
  var SAMPLE_PROFILES = [
    {
      slug: 'acid-base-titration',
      title: '酸碱中和滴定',
      materials: ['盐酸', '氢氧化钠', '酚酞'],
      variables: [{ key: 'conc', label: '盐酸浓度', levels: [0.05, 0.1, 0.2] }]
    },
    {
      slug: 'agcl-precipitate',
      title: 'AgCl 沉淀',
      materials: ['硝酸银', '氯化钠'],
      variables: [{ key: 'conc', label: 'AgNO₃ 浓度', levels: [0.05, 0.1, 0.2] }]
    },
    {
      slug: 'cuo-h2-reduction',
      title: 'H₂ 还原 CuO',
      materials: ['氧化铜', '氢气'],
      variables: [{ key: 'temp', label: '加热温度', levels: [200, 300, 400] }]
    },
    {
      slug: 'zn-cu-galvanic',
      title: 'Zn-Cu 原电池',
      materials: ['锌粒', '铜丝', '硫酸'],
      variables: [{ key: 'conc', label: 'H₂SO₄ 浓度', levels: [0.1, 0.5, 1.0] }]
    }
  ];

  /* ---------- 3. 渲染实验台 ---------- */
  function renderLabPanel(host, profile) {
    var ctx = derivePaperContext(profile);
    var isReal = !!ctx;
    var title = isReal
      ? '虚拟实验台（基于当前文献）'
      : '虚拟实验台（示例打样）';

    /* 试剂面板：包含论文全部 + 派生（已知/未标识） */
    var availableReagents = ctx ? ctx.reagentsResolved.slice() : [];

    /* 未载入文献时，回落到 SAMPLE_PROFILES 的 4 套经典实验 */
    if (!ctx) {
      var seenS = {};
      SAMPLE_PROFILES.forEach(function (s) { s.materials.forEach(function (m) {
        if (seenS[m]) return; seenS[m] = 1;
        var sub = MR.chem.resolveSubstance(m);
        if (sub) availableReagents.push({
          name: m, formula: sub.formula, category: sub.category, known: true,
          color: categoryColor(sub.category)
        });
      }); });
    }

    /* --- 实验匹配卡 + 派生实验 --- */
    var matchedExp = ctx && ctx.experiment;
    var fallbackExp = ctx && ctx.derivedFallback;
    var expTitle = matchedExp ? matchedExp.title : (fallbackExp ? fallbackExp.title : '未识别实验');
    var expDesc  = matchedExp ? matchedExp.description : (fallbackExp ? fallbackExp.description : '请导入文献以识别可能的实验。');
    var expMeta  = matchedExp
      ? '类别 ' + (matchedExp.category || '—') + ' · 耗时 ' + (matchedExp.estimatedMinutes || 0) + ' min · 难度 ' + (matchedExp.difficulty || '—')
      : '派生类型 ' + ((fallbackExp && fallbackExp.paperType) || 'unspecified');

    /* --- 变量扫描图 --- */
    var sweepSVG = renderVariableSweepSVG(ctx && ctx.variableSweep);

    /* --- 仪器 / 标准 chips --- */
    var instrumentChips = (ctx && ctx.instruments || []).slice(0, 8).map(function (i) {
      var n = i.name || i;
      return '<span style="background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-pill);padding:3px 9px;font-size:11px">' + n + '</span>';
    }).join('');
    var standardChips = (ctx && ctx.standards || []).slice(0, 8).map(function (s) {
      var n = (typeof s === 'string') ? s : (s.name || s.code || '');
      return '<span style="background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.2);border-radius:var(--r-pill);padding:3px 9px;font-size:11px;font-family:var(--mono)">' + n + '</span>';
    }).join('');

    /* --- 反应条件（来自 profile.variables） --- */
    var cond = {};
    (ctx && ctx.variables || []).forEach(function (v) {
      if (!v) return;
      if (v.key && /温度|Temp|temperature/i.test(v.key)) cond.temperature = (v.levels && v.levels[0]) || v.value;
      if (v.key && /时间|time/i.test(v.key))              cond.time = (v.levels && v.levels[0]) || v.value;
    });
    var condLabel = '';
    if (cond.temperature) condLabel += '<span style="font-family:var(--mono);background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:2px 7px;margin-right:4px">温度 ' + cond.temperature + '</span>';
    if (cond.time) condLabel += '<span style="font-family:var(--mono);background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:2px 7px;margin-right:4px">时间 ' + cond.time + '</span>';
    if (!condLabel) condLabel = '<span style="color:var(--ink-3);font-size:11.5px">原文未提供温度/时间参数，化学引擎已采用文献关键变量。</span>';

    /* --- 引用 evidence 行 --- */
    var citeLines = (ctx && ctx.paperCitation || []).slice(0, 3).map(function (n) {
      var txt = (typeof n === 'string') ? n : (n.text || n.value || JSON.stringify(n));
      if (!txt) return '';
      return '<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-2);background:var(--surface-2);border-left:2px solid var(--acc);padding:5px 8px;margin:4px 0;border-radius:4px;line-height:1.45">' + String(txt).slice(0, 180) + '</div>';
    }).join('');

    /* 烧杯状态 */
    var beaker = [];
    var reactionResult = null;

    /* 渲染 */
    host.innerHTML = `
      <div class="panel panel--acc" style="margin-top:20px">
        <div class="panel__head">
          <div class="panel__t">${title}</div>
          <div class="panel__m">${availableReagents.length} 种材料 · 化学反应引擎 · 文献感知</div>
        </div>
        <div class="panel__body">

          <!-- 文献识别区：实验匹配 + 产物分析 + 仪器 + 标准 + 引用 -->
          ${isReal ? `
          <div class="lab-paper" style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;margin-bottom:14px">
            <!-- 左：实验识别 -->
            <div class="lab-card" style="background:var(--surface-1);border:1px solid var(--line);border-radius:10px;padding:10px 12px">
              <div class="mono-xs" style="letter-spacing:.12em;color:var(--ink-3);margin-bottom:6px">📚 文献识别 · 实验工艺</div>
              <div style="font-size:13.5px;font-weight:600;margin-bottom:4px">${expTitle}</div>
              <div style="font-size:11.5px;color:var(--ink-2);line-height:1.5;margin-bottom:6px">${expDesc}</div>
              <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-bottom:6px">${expMeta}</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">${condLabel}</div>
            </div>

            <!-- 中：产物分析 -->
            <div class="lab-card" style="background:var(--surface-1);border:1px solid var(--line);border-radius:10px;padding:10px 12px">
              <div class="mono-xs" style="letter-spacing:.12em;color:var(--ink-3);margin-bottom:6px">📈 产物分析 · 变量-响应</div>
              ${sweepSVG}
              ${ctx && ctx.perf && ctx.perf[0] ? `<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-2);margin-top:4px">关键指标: ${ctx.perf[0].name}${ctx.perf[0].optimum ? ' · 原文最优 ' + ctx.perf[0].optimum : ''}</div>` : ''}
            </div>

            <!-- 右：仪器 + 标准 + 引用 -->
            <div class="lab-card" style="background:var(--surface-1);border:1px solid var(--line);border-radius:10px;padding:10px 12px;overflow:hidden">
              <div class="mono-xs" style="letter-spacing:.12em;color:var(--ink-3);margin-bottom:6px">🧪 仪器 / 标准</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${instrumentChips || '<span style="color:var(--ink-3);font-size:11px">原文未列仪器</span>'}</div>
              <div class="mono-xs" style="letter-spacing:.12em;color:var(--ink-3);margin:6px 0 4px">📏 标准</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${standardChips || '<span style="color:var(--ink-3);font-size:11px">原文未列标准</span>'}</div>
              ${citeLines ? '<div class="mono-xs" style="letter-spacing:.12em;color:var(--ink-3);margin:8px 0 4px">📌 原文证据</div>' + citeLines : ''}
            </div>
          </div>
          ` : ''}

          <div class="lab-wrap" style="display:grid;grid-template-columns:280px 1fr 300px;gap:16px;min-height:400px">

            <!-- 试剂架 -->
            <div class="lab-rack">
              <div class="mono-xs" style="margin-bottom:10px;letter-spacing:.12em;color:var(--ink-3)">试剂架（点击加入烧杯 · ${availableReagents.length}）</div>
              <div class="lab-rack-grid" id="labRackGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:340px;overflow-y:auto"></div>
            </div>

            <!-- 烧杯 3D 视口 -->
            <div class="lab-stage">
              <div class="lab-stage__host" id="labStageHost" style="background:linear-gradient(180deg,#0c0c10 0%,#08080a 100%);border-radius:12px;overflow:hidden;position:relative;min-height:340px">
                <div id="labCanvasHost" style="position:absolute;inset:0"></div>
                <div style="position:absolute;top:12px;right:12px;display:flex;gap:6px">
                  <button class="btn" data-act="lab-react" style="padding:6px 12px;font-size:12px">▶ 触发反应</button>
                  <button class="btn" data-act="lab-clear" style="padding:6px 12px;font-size:12px">✕ 清空</button>
                </div>
                <div id="labAdded" style="position:absolute;bottom:12px;left:12px;right:12px;display:flex;flex-wrap:wrap;gap:5px"></div>
              </div>
            </div>

            <!-- 反应结果 -->
            <div class="lab-result">
              <div class="mono-xs" style="margin-bottom:10px;letter-spacing:.12em;color:var(--ink-3)">反应结果</div>
              <div id="labResult" style="min-height:200px"></div>
              <div class="mono-xs" style="margin-top:14px;margin-bottom:6px;letter-spacing:.12em;color:var(--ink-3)">产物 3D</div>
              <div id="labProduct3D" style="background:var(--surface-2);border-radius:10px;overflow:hidden;min-height:200px;position:relative">
                <div id="labProductHost" style="position:absolute;inset:0"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    /* ---------- 4. 试剂架渲染 ---------- */
    var rackGrid = host.querySelector('#labRackGrid');
    rackGrid.innerHTML = availableReagents.map(function (r, i) {
      return `
        <div class="lab-reagent" data-i="${i}" style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:9px;cursor:pointer;transition:background .15s,border-color .15s;user-select:none">
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase">${r.category}</div>
          <div style="font-size:12.5px;font-weight:600;margin:3px 0 4px">${r.name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:var(--mono);font-size:10.5px;color:var(--acc)">${r.formula}</span>
            <span style="width:8px;height:8px;border-radius:50%;background:${r.color}"></span>
          </div>
        </div>`;
    }).join('');
    rackGrid.querySelectorAll('.lab-reagent').forEach(function (el) {
      el.addEventListener('click', function () {
        var r = availableReagents[+el.dataset.i];
        if (beaker.find(function (b) { return b.name === r.name; })) return;
        beaker.push(r);
        el.style.opacity = '0.4';
        el.style.borderStyle = 'dashed';
        refreshAdded();
        updateBeaker3D();
      });
    });

    /* ---------- 5. 已添加列表 ---------- */
    function refreshAdded() {
      var el = host.querySelector('#labAdded');
      if (beaker.length === 0) { el.innerHTML = ''; return; }
      el.innerHTML = beaker.map(function (r, i) {
        return `
          <div style="background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.3);border-radius:var(--r-pill);padding:4px 10px;font-size:11.5px;display:flex;align-items:center;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:${r.color}"></span>
            <span style="font-weight:600">${r.name}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--ink-3)">${r.formula}</span>
            <button data-rm="${i}" style="background:none;border:0;color:var(--ink-3);cursor:pointer;font-size:13px;padding:0 2px">×</button>
          </div>`;
      }).join('');
      el.querySelectorAll('[data-rm]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = +btn.dataset.rm;
          var removed = beaker[idx].name;
          beaker.splice(idx, 1);
          rackGrid.querySelectorAll('.lab-reagent').forEach(function (rEl, ri) {
            if (availableReagents[ri].name === removed) {
              rEl.style.opacity = '1';
              rEl.style.borderStyle = 'solid';
            }
          });
          refreshAdded();
          updateBeaker3D();
        });
      });
    }

    /* ---------- 6. 3D 烧杯（简化版，three.js） ---------- */
    var stageHost = host.querySelector('#labStageHost');
    var stageCanvasHost = host.querySelector('#labCanvasHost');
    var stageRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    stageRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    stageCanvasHost.appendChild(stageRenderer.domElement);
    var stageScene = new THREE.Scene();
    var stageCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    stageCamera.position.set(2.2, 1.5, 3.5);
    stageScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(3, 5, 4); stageScene.add(dl);
    var stageControls = makeControls(stageCamera, stageRenderer.domElement, { target: new THREE.Vector3(0, 0.5, 0), autoRotate: true });
    stageControls.enableDamping = true;
    stageControls.autoRotate = true;
    stageControls.autoRotateSpeed = 0.6;

    /* 桌面 + 烧杯 */
    var desk = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 })
    );
    desk.position.y = -0.04;
    stageScene.add(desk);

    var glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.3, 24, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xe8f4f8, transparent: true, opacity: 0.2,
        roughness: 0.05, metalness: 0, side: THREE.DoubleSide,
        transmission: 0.95, clearcoat: 1, clearcoatRoughness: 0.05
      })
    );
    glass.position.set(0, 0.65, 0);
    stageScene.add(glass);

    var glassBase = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 24),
      new THREE.MeshStandardMaterial({ color: 0xddeef2, transparent: true, opacity: 0.6 })
    );
    glassBase.rotation.x = -Math.PI / 2;
    glassBase.position.set(0, 0, 0);
    stageScene.add(glassBase);

    /* 刻度 */
    for (var i = 1; i <= 4; i++) {
      var line = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.004, 0.004),
        new THREE.MeshStandardMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
      );
      line.position.set(-0.5, 0.25 + i * 0.25, 0.66);
      stageScene.add(line);
    }

    /* 液面 */
    var beakerLiquid = null;
    function updateBeaker3D() {
      if (beakerLiquid) {
        stageScene.remove(beakerLiquid);
        beakerLiquid.geometry.dispose();
        beakerLiquid.material.dispose();
      }
      if (beaker.length === 0) return;
      /* 混合颜色 */
      var colors = beaker.map(function (b) { return b.color; });
      var avg = colors.reduce(function (acc, c) {
        var n = parseInt(c.slice(1), 16);
        acc.r += (n >> 16) & 0xff;
        acc.g += (n >> 8) & 0xff;
        acc.b += n & 0xff;
        return acc;
      }, { r: 0, g: 0, b: 0 });
      avg.r = Math.round(avg.r / colors.length);
      avg.g = Math.round(avg.g / colors.length);
      avg.b = Math.round(avg.b / colors.length);
      var mixedColor = (avg.r << 16) | (avg.g << 8) | avg.b;
      var fillRatio = Math.min(0.75, 0.15 + beaker.length * 0.15);
      var geo = new THREE.CylinderGeometry(0.63, 0.63, 1.25 * fillRatio, 20);
      var mat = new THREE.MeshStandardMaterial({ color: mixedColor, transparent: true, opacity: 0.75, roughness: 0.3 });
      beakerLiquid = new THREE.Mesh(geo, mat);
      beakerLiquid.position.set(0, 0.04 + 0.625 * fillRatio, 0);
      stageScene.add(beakerLiquid);
    }

    function resizeStage() {
      var r = stageHost.getBoundingClientRect();
      stageRenderer.setSize(r.width, r.height);
      stageCamera.aspect = r.width / Math.max(r.height, 1);
      stageCamera.updateProjectionMatrix();
    }
    new ResizeObserver(resizeStage).observe(stageHost);
    resizeStage();
    (function tick() {
      requestAnimationFrame(tick);
      stageControls.update();
      stageRenderer.render(stageScene, stageCamera);
    })();

    /* ---------- 7. 反应按钮 ---------- */
    host.querySelector('[data-act="lab-react"]').addEventListener('click', function () {
      if (beaker.length < 2) {
        flashResult('至少需要 2 种材料', 'warn');
        return;
      }
      var names = beaker.map(function (b) { return b.name; });
      var cond = {};
      (ctx && ctx.variables || []).forEach(function (v) {
        if (!v) return;
        if (v.key && /温度|Temp|temperature/i.test(v.key)) cond.temperature = (v.levels && v.levels[0]) || v.value;
        if (v.key && /时间|time/i.test(v.key))              cond.time = (v.levels && v.levels[0]) || v.value;
      });
      reactionResult = MR.chem.react(names, cond);
      showResult();
      showProduct3D();
    });
    host.querySelector('[data-act="lab-clear"]').addEventListener('click', function () {
      beaker = [];
      rackGrid.querySelectorAll('.lab-reagent').forEach(function (el) {
        el.style.opacity = '1';
        el.style.borderStyle = 'solid';
      });
      refreshAdded();
      updateBeaker3D();
      host.querySelector('#labResult').innerHTML = '';
      host.querySelector('#labProductHost').innerHTML = '';
    });

    function flashResult(text, kind) {
      var colors = { warn: 0xffaa40, info: 0x60a5fa };
      if (beakerLiquid) {
        beakerLiquid.material.color.setHex(colors[kind] || 0xffaa40);
      }
    }

    /* ---------- 8. 反应结果 ---------- */
    function showResult() {
      var el = host.querySelector('#labResult');
      var r = reactionResult;
      var bannerClass = r.reacted ? 'ok' : (r.description && r.description.indexOf('未观察') !== -1 ? 'warn' : 'err');
      var bannerColor = r.reacted ? 'var(--acc)' : 'var(--amber)';
      el.innerHTML = `
        <div style="background:rgba(45,212,103,.08);border:1px solid rgba(45,212,103,.25);border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:24px;height:24px;border-radius:6px;display:grid;place-items:center;background:${bannerColor};color:var(--acc-ink);font-size:14px;flex:none">${r.reacted ? '✓' : '·'}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${r.reacted ? '发生反应' : '无可见反应'}</div>
            <div style="font-size:11.5px;color:var(--ink-2);margin-top:2px">${r.description || ''}</div>
          </div>
        </div>
        ${r.equation ? `<div style="font-family:var(--mono);font-size:11.5px;background:var(--surface-2);padding:9px 11px;border-radius:8px;border-left:2px solid var(--acc);margin-bottom:10px">${r.equation}</div>` : ''}
        ${r.reacted ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:5px 9px;font-size:11.5px;display:flex;align-items:center;gap:5px">
            <span style="width:6px;height:6px;border-radius:50%;background:${r.producesGas ? 'var(--acc)' : 'var(--ink-3)'}"></span>${r.producesGas ? '✓ 产气' : '· 无气体'}
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:5px 9px;font-size:11.5px;display:flex;align-items:center;gap:5px">
            <span style="width:6px;height:6px;border-radius:50%;background:${r.producesPrecipitate ? 'var(--acc)' : 'var(--ink-3)'}"></span>${r.producesPrecipitate ? '✓ 沉淀' : '· 无沉淀'}
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:5px 9px;font-size:11.5px;display:flex;align-items:center;gap:5px">
            <span style="width:6px;height:6px;border-radius:50%;background:${r.colorChange ? 'var(--acc)' : 'var(--ink-3)'}"></span>${r.colorChange ? '✓ 颜色变化' : '· 颜色不变'}
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:5px 9px;font-size:11.5px;display:flex;align-items:center;gap:5px">
            <span style="width:6px;height:6px;border-radius:50%;background:${r.thermal !== 'none' ? 'var(--acc)' : 'var(--ink-3)'}"></span>${r.thermal === 'exothermic' ? '✓ 放热' : r.thermal === 'endothermic' ? '✓ 吸热' : '· 无热效应'}
          </div>
        </div>` : ''}
        ${r.reacted && r.products && r.products.length ? `
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px">
          ${r.products.map(function (p) {
            return `<span style="background:rgba(45,212,191,.1);border:1px solid rgba(45,212,191,.25);border-radius:6px;padding:3px 9px;font-size:11px"><b style="color:var(--acc);font-family:var(--mono)">${p.formula}</b> ${p.name}</span>`;
          }).join('')}
        </div>` : ''}`;
    }

    /* ---------- 9. 产物 3D ---------- */
    var prodHost = host.querySelector('#labProductHost');
    var prodRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    prodRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    prodHost.appendChild(prodRenderer.domElement);
    var prodScene = new THREE.Scene();
    var prodCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    prodCamera.position.set(2.5, 1.5, 3);
    prodScene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var dl2 = new THREE.DirectionalLight(0xffffff, 0.9); dl2.position.set(3, 5, 4); prodScene.add(dl2);
    var prodControls = makeControls(prodCamera, prodRenderer.domElement, { target: new THREE.Vector3(0, 0, 0), autoRotate: true, autoRotateSpeed: 0.8 });
    prodControls.enableDamping = true;
    prodControls.autoRotate = true;
    prodControls.autoRotateSpeed = 0.8;

    var prodGroup = null;
    var ELEMENTS_COLORS = { H: 0xf5f5f5, C: 0x3a3a3a, N: 0x3050ff, O: 0xff4040, Cl: 0x4ade80, Na: 0xb05cf2, Cu: 0xc08060, Fe: 0xe06633, Ba: 0xd0c0a0, Mn: 0xa04030, S: 0xe0d030, Ag: 0xc0c0d0, Zn: 0xa8a8b0, Mg: 0xc0c0c8 };
    var ATOM_SCALE = { H: 0.3, C: 0.5, N: 0.5, O: 0.5, Cl: 0.5, Na: 0.7, Cu: 0.6, Fe: 0.6, Ba: 0.7, Mn: 0.55, S: 0.55, Ag: 0.6, Zn: 0.6, Mg: 0.55 };

    function clearProd() {
      if (prodGroup) {
        prodGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        prodScene.remove(prodGroup);
        prodGroup = null;
      }
    }
    function showProduct3D() {
      if (!reactionResult || !reactionResult.reacted) return;
      clearProd();
      var main = reactionResult.products.find(function (p) { return p.formula !== 'H2O' && p.formula !== 'water'; }) || reactionResult.products[0];
      if (!main) return;
      var atoms = buildMolecule3D(main.formula);
      prodGroup = new THREE.Group();
      var sphereGeo = new THREE.SphereGeometry(0.5, 22, 14);
      atoms.forEach(function (a) {
        var m = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({
          color: ELEMENTS_COLORS[a.el] || 0xaaaaaa, roughness: 0.4, metalness: 0.2
        }));
        m.position.set(a.pos[0], a.pos[1], a.pos[2]);
        m.scale.setScalar(ATOM_SCALE[a.el] || 0.5);
        prodGroup.add(m);
      });
      for (var i = 0; i < atoms.length; i++) {
        for (var j = i + 1; j < atoms.length; j++) {
          var a = atoms[i], b = atoms[j];
          var d = Math.sqrt((a.pos[0] - b.pos[0]) ** 2 + (a.pos[1] - b.pos[1]) ** 2 + (a.pos[2] - b.pos[2]) ** 2);
          if (d < 1.6) {
            var mid = [(a.pos[0] + b.pos[0]) / 2, (a.pos[1] + b.pos[1]) / 2, (a.pos[2] + b.pos[2]) / 2];
            var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, d, 12), new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.5 }));
            cyl.position.set(mid[0], mid[1], mid[2]);
            cyl.scale.set(1, d, 1);
            cyl.lookAt(b.pos[0], b.pos[1], b.pos[2]);
            cyl.rotateX(Math.PI / 2);
            prodGroup.add(cyl);
          }
        }
      }
      prodScene.add(prodGroup);
      prodControls.target.set(0, 0, 0);
      prodControls.update();
    }
    function buildMolecule3D(formula) {
      if (!formula) return [{ el: 'C', pos: [0, 0, 0] }];
      var TEMPLATES = {
        'NaCl': [{ el: 'Na', pos: [1.0, 0, 0] }, { el: 'Cl', pos: [-1.0, 0, 0] }],
        'H2O': [{ el: 'O', pos: [0, 0, 0] }, { el: 'H', pos: [0.78, 0.6, 0] }, { el: 'H', pos: [-0.78, 0.6, 0] }],
        'CO2': [{ el: 'C', pos: [0, 0, 0] }, { el: 'O', pos: [-1.2, 0, 0] }, { el: 'O', pos: [1.2, 0, 0] }],
        'Cu': [{ el: 'Cu', pos: [0, 0, 0] }],
        'AgCl': [{ el: 'Ag', pos: [1.0, 0, 0] }, { el: 'Cl', pos: [-1.0, 0, 0] }],
        'ZnSO4': [{ el: 'Zn', pos: [1.4, 0, 0] }, { el: 'S', pos: [-0.4, 0, 0] }, { el: 'O', pos: [-1.6, 0.6, 0] }, { el: 'O', pos: [-1.6, -0.6, 0] }, { el: 'O', pos: [0.2, 1.0, 0] }, { el: 'O', pos: [0.2, -1.0, 0] }]
      };
      if (TEMPLATES[formula]) return TEMPLATES[formula];
      var parsed = MR.chem.parseFormulaFor3D(formula);
      if (!parsed.atoms || parsed.atoms.length === 0) return [{ el: 'C', pos: [0, 0, 0] }];
      var atoms = [];
      for (var i = 0; i < parsed.atoms.length; i++) {
        var a = parsed.atoms[i];
        var phi = Math.acos(1 - 2 * (i + 0.5) / parsed.atoms.length);
        var theta = Math.PI * (1 + Math.sqrt(5)) * i;
        var r = 0.9;
        atoms.push({ el: a.el, pos: [r * Math.cos(theta) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi)] });
      }
      return atoms;
    }
    function resizeProd() {
      var r = prodHost.getBoundingClientRect();
      prodRenderer.setSize(r.width, r.height);
      prodCamera.aspect = r.width / Math.max(r.height, 1);
      prodCamera.updateProjectionMatrix();
    }
    new ResizeObserver(resizeProd).observe(prodHost);
    resizeProd();
    (function tickProd() {
      requestAnimationFrame(tickProd);
      if (prodGroup) prodGroup.rotation.y += 0.008;
      prodControls.update();
      prodRenderer.render(prodScene, prodCamera);
    })();
  }

  /* ---------- 10. 挂载到 MR ---------- */
  MR.lab = {
    renderLabPanel: renderLabPanel,
    SAMPLE_PROFILES: SAMPLE_PROFILES,
    extractFromProfile: extractFromProfile,
    derivePaperContext: derivePaperContext,
    deriveFallbackExperiment: deriveFallbackExperiment,
    renderVariableSweepSVG: renderVariableSweepSVG
  };

  function categoryColor(cat) {
    return ({
      acid: '#ff6b35', base: '#6ba6ff', salt: '#a8d8a8', carbonate: '#c89666',
      metal: '#888888', oxide: '#604040', gas: '#a0d8e8', water: '#a0c8f0',
      indicator: '#e06699', oxidizer: '#a050a0', reducer: '#603030', organic: '#e0c896',
      alloy: '#b0a98a',       /* 合金——暖砂色 */
      fiber: '#7aa8a8',       /* 纤维——青灰 */
      polymer: '#c89ec0',     /* 树脂——粉灰 */
      silane: '#d4af6a',      /* 偶联剂——金棕 */
      mineral: '#a89570',     /* 矿物——浅褐 */
      cathode: '#ff8c5a',     /* 正极——亮橙 */
      carbon: '#3a3a3a',      /* 导电炭黑——黑 */
      bio: '#cce07a',         /* 生物试剂——嫩绿 */
      precipitate: '#cab9d6', /* 沉淀——淡紫 */
      material: '#b0b0b0',    /* 通用材料——灰 */
      other: '#888888'
    })[cat] || '#888888';
  }

})();