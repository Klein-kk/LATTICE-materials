/* ============================================================
   LATTICE · 启动
   ============================================================ */
(function () {
  var KEYS = ['imp', 'scope', 'design', 'figure', 'analysis', 'guide', 'feedback', 'paper', 'lang', 'review'];
  function start() {
    try {
      MR.boot();
      try { if (MR.project) MR.project.bind(); } catch (e) { console.warn('[project.bind]', e); }
      MR.log('INFO', '流水线引擎就绪 · 10 个环节 · 材料方向 ' + MR.domain.MATERIAL_DOMAINS.length + ' 类 · 性能指标词表 ' + MR.domain.ALL_IND.length + ' 项 · 本地文献库 ' + MR.lib.rows.length + ' 条');
      /* 深链：#imp / #feedback / #review 等 */
      function goHash() {
        var h = (location.hash || '').replace('#', '');
        if (!h) return;
        var parts = h.split(':');
        var k = parts[0];
        if (KEYS.indexOf(k) < 0) return;
        /* 深链： #figure:S1 → 载入内置示例 S1 后打开环节 figure */
        if (parts[1] && /^(S[1-4]|C[1-3])$/.test(parts[1])) {
          var pid = parts[1];
          if (!MR.state.paper || MR.state.paper.id !== pid) MR.loadPaper(pid);
        }
        MR.app.setView(k);
      }
      goHash();
      window.addEventListener('hashchange', goHash);
    } catch (err) {
      var main = document.getElementById('main');
      if (main) {
        main.innerHTML = '<div class="view" style="padding:20px"><div class="note note--risk">' +
          '<span><b>初始化失败：</b>' + (err && err.message ? err.message : err) + '</span></div></div>';
      }
      if (window.console) console.error(err);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
