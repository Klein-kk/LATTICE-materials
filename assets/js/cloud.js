/* ============================================================
   LATTICE · 后端层（本地优先 + Supabase 云同步）
   ------------------------------------------------------------
   设计原则（与平台「文件不离开本机」的隐私立场一致）：
     · 论文始终先存本机（localStorage），不依赖网络
     · 登录后，论文再同步到该用户私有的云端行
       Supabase 表  papers(user_id, id, name, kind, chars, content, ...)
     · 行级安全（RLS）保证每位用户只能读写自己的行
     · 未启用后端 / 离线时，所有功能降级为本机模式，不报错
   为什么不用 Firebase：Google Cloud 在部分组织账号下被禁用；
   Supabase 注册不依赖 Google Cloud。
   ============================================================ */
window.MR = window.MR || {};
(function () {
  var KEY_CAT  = 'lattice.papers.catalog';                        // 论文目录（仅元数据）
  var KEY_TEXT = function (id) { return 'lattice.paper.' + id; };  // 单篇全文
  var KEY_USER = 'lattice.user';                                   // 本地登录态
  var SDK_URL  = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  var TABLE    = 'papers';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ---------------- 本地论文库（local-first） ---------------- */
  MR.store = {
    list: function () {
      try { return JSON.parse(localStorage.getItem(KEY_CAT) || '[]'); }
      catch (e) { return []; }
    },
    get: function (id) {
      try { return JSON.parse(localStorage.getItem(KEY_TEXT(id)) || 'null'); }
      catch (e) { return null; }
    },
    /* p: {id,name,kind,date,text}；opts.skipSync=true 时不回写云端（用于「从云端拉取」时避免回环） */
    put: function (p, opts) {
      if (!p || !p.id) return null;
      opts = opts || {};
      var cat = this.list();
      var meta = {
        id: p.id, name: p.name || '未命名论文',
        kind: p.kind || '上传文献',
        date: p.date || new Date().toISOString(),
        chars: (p.text || '').length
      };
      var i = -1;
      for (var k = 0; k < cat.length; k++) if (cat[k].id === p.id) { i = k; break; }
      if (i >= 0) cat[i] = meta; else cat.unshift(meta);
      try { localStorage.setItem(KEY_CAT, JSON.stringify(cat)); }
      catch (e) { MR.log && MR.log('WARN', '论文目录保存失败（本机存储配额受限）'); }
      try {
        localStorage.setItem(KEY_TEXT(p.id), JSON.stringify({
          id: p.id, name: meta.name, kind: meta.kind, date: meta.date, text: p.text || ''
        }));
      } catch (e) {
        MR.log && MR.log('WARN', '论文正文过大（' + ((p.text || '').length / 1024).toFixed(0) +
          ' KB），本机长期保存失败，本次仅会话内可用。可登录后存到云端。');
      }
      if (!opts.skipSync) this.sync(p);   // 已登录则同步云端
      return meta;
    },
    del: function (id) {
      var cat = this.list().filter(function (x) { return x.id !== id; });
      try { localStorage.setItem(KEY_CAT, JSON.stringify(cat)); localStorage.removeItem(KEY_TEXT(id)); }
      catch (e) {}
      if (MR.cloud && MR.cloud.uid) MR.cloud.deletePaper(id);
    },
    /* 当前正在处理的用户论文：自动归档，避免刷新丢失 */
    rememberCurrent: function () {
      var p = MR.state && MR.state.paper;
      if (!p || !p.text) return;
      var isUser = p.kind === '上传文献' || p.kind === '粘贴文本' || (p.id && String(p.id).indexOf('U') === 0);
      if (!isUser) return;
      this.put({ id: p.id, name: p.name, kind: p.kind, text: p.text });
    },
    sync: function (p) { if (MR.cloud && MR.cloud.uid) MR.cloud.savePaper(p); }
  };

  /* ---------------- Supabase 云同步层 ---------------- */
  MR.cloud = {
    cfg: null, enabled: false, client: null,
    uid: null, user: null, ready: false,
    init: function () {
      this.cfg = window.LATTICE_SUPABASE || null;
      this.enabled = !!(this.cfg && this.cfg.enabled &&
        this.cfg.url && this.cfg.url.indexOf('YOUR_') !== 0 &&
        this.cfg.anonKey && this.cfg.anonKey.indexOf('YOUR_') !== 0);
      /* 先恢复本地登录态做展示（离线也能显示上次登录的用户） */
      try {
        var u = JSON.parse(localStorage.getItem(KEY_USER) || 'null');
        if (u) { this.user = u; this.uid = u.uid; MR.ui && MR.ui.updateUser(); }
      } catch (e) {}
      if (!this.enabled) {
        MR.log && MR.log('INFO', '后端未配置：论文库仅存本机。配置 Supabase 后可启用登录与云端同步（见 SUPABASE-接入指南.md）。');
        return;
      }
      /* 启用后：按需加载 SDK 并校验会话（失败则保持本机模式） */
      var self = this;
      this.loadSdk()
        .then(function () { self._wire(); return self.client.auth.getSession(); })
        .then(function (res) {
          var s = res && res.data && res.data.session;
          if (s && s.user) self._setUser(s.user);
          else { self.user = null; self.uid = null; try { localStorage.removeItem(KEY_USER); } catch (e) {} MR.ui && MR.ui.updateUser(); }
        })
        .catch(function (e) {
          MR.log && MR.log('WARN', 'Supabase 初始化失败：' + e.message + '（将以本机模式运行）');
        });
    },
    loadSdk: function () {
      if (window.supabase && window.supabase.createClient) return Promise.resolve();
      if (!this.enabled) return Promise.reject(new Error('后端未配置'));
      var self = this;
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = SDK_URL; s.async = true;
        s.onload = function () {
          try { self.client = window.supabase.createClient(self.cfg.url, self.cfg.anonKey); res(); }
          catch (e) { rej(e); }
        };
        s.onerror = function () { rej(new Error('Supabase SDK 加载失败（可能离线或被网络策略拦截）')); };
        document.head.appendChild(s);
      });
    },
    _setUser: function (u) {
      var meta = u.user_metadata || {};
      this.user = {
        uid: u.id, email: u.email || '',
        name: meta.full_name || meta.name || (u.email || '').split('@')[0],
        photo: meta.avatar_url || ''
      };
      this.uid = u.id; this.ready = true;
      try { localStorage.setItem(KEY_USER, JSON.stringify(this.user)); } catch (e) {}
      this.pullPapers();
      MR.ui && MR.ui.updateUser();
      MR.log && MR.log('OK', '已登录：<b>' + esc(this.user.email || this.user.uid) + '</b> · 论文库已切换到你的私有云端');
    },
    _wire: function () {
      var self = this;
      this.client.auth.onAuthStateChange(function (event, session) {
        if (session && session.user) { self._setUser(session.user); }
        else {
          self.user = null; self.uid = null; self.ready = false;
          try { localStorage.removeItem(KEY_USER); } catch (e) {}
          MR.ui && MR.ui.updateUser();
          MR.log && MR.log('INFO', '已退出登录；论文库回退为本机数据');
        }
        MR.app && MR.app.render && MR.app.render();
      });
    },
    signUpEmail: function (email, pw) {
      var self = this;
      return this.loadSdk()
        .then(function () { return self.client.auth.signUp({ email: email, password: pw }); })
        .then(function (r) { if (r.error) throw r.error; return r; })
        .catch(function (e) { MR.log && MR.log('RISK', '注册失败：' + e.message); throw e; });
    },
    signInEmail: function (email, pw) {
      var self = this;
      return this.loadSdk()
        .then(function () { return self.client.auth.signInWithPassword({ email: email, password: pw }); })
        .then(function (r) { if (r.error) throw r.error; return r; })
        .catch(function (e) { MR.log && MR.log('RISK', '登录失败：' + e.message); throw e; });
    },
    signInGoogle: function () {
      var self = this;
      return this.loadSdk()
        .then(function () {
          return self.client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
          });
        })
        .catch(function (e) { MR.log && MR.log('RISK', 'Google 登录失败：' + e.message); throw e; });
    },
    signOut: function () {
      if (!this.client) { this.user = null; this.uid = null; try { localStorage.removeItem(KEY_USER); } catch (e) {} MR.ui && MR.ui.updateUser(); return Promise.resolve(); }
      return this.client.auth.signOut();
    },
    /* —— 找回密码：发送重置邮件 —— 
       「忘记密码？」链接点进来后调用。
       Supabase 会把恢复链接发到用户邮箱；点击后浏览器跳到 redirectTo 指定页（reset.html）。
       返回 Promise<{ok, error}>：ok=true 表示已尝试发送；Supabase 出于安全考虑，无论邮箱是否注册都会返回成功。 */
    requestPasswordReset: function (email) {
      var self = this;
      if (!this.enabled) return Promise.resolve({ ok: false, error: new Error('本地模式不支持找回密码：未配置 Supabase 后端。') });
      var em = String(email || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return Promise.resolve({ ok: false, error: new Error('请填写有效的邮箱地址') });
      return this.loadSdk()
        .then(function () {
          return self.client.auth.resetPasswordForEmail(em, {
            redirectTo: window.location.origin + '/reset.html'
          });
        })
        .then(function (r) { if (r && r.error) throw r.error; return { ok: true }; })
        .catch(function (e) { MR.log && MR.log('RISK', '发送重置邮件失败：' + e.message); return { ok: false, error: e }; });
    },
    /* —— 用户在 reset.html 输入新密码后调用 —— 
       假设此时 Supabase JS 已从 URL fragment 自动恢复 recovery session（auth.onAuthStateChange 会触发）。 */
    updatePassword: function (newPw) {
      var self = this;
      if (!this.client) return Promise.resolve({ ok: false, error: new Error('后端未连接') });
      if (!newPw || newPw.length < 6) return Promise.resolve({ ok: false, error: new Error('新密码至少 6 位') });
      return this.client.auth.updateUser({ password: newPw })
        .then(function (r) { if (r && r.error) throw r.error; return { ok: true }; })
        .catch(function (e) { return { ok: false, error: e }; });
    },

    /* —— 论文表：papers(user_id, id, name, kind, chars, content) —— */
    savePaper: function (p) {
      if (!this.client || !this.uid) return Promise.resolve();
      var row = {
        user_id: this.uid, id: p.id,
        name: p.name || '未命名论文', kind: p.kind || '上传文献',
        chars: (p.text || '').length, content: p.text || '',
        updated_at: new Date().toISOString()
      };
      return this.client.from(TABLE).upsert(row, { onConflict: 'user_id,id' })
        .then(function (r) { if (r.error) throw r.error; MR.log && MR.log('OK', '已同步到云端：<b>' + esc(p.name) + '</b>'); })
        .catch(function (e) { MR.log && MR.log('WARN', '云端同步失败：' + e.message + '（本机副本仍在）'); });
    },
    deletePaper: function (id) {
      if (!this.client || !this.uid) return;
      this.client.from(TABLE).delete().eq('id', id).eq('user_id', this.uid)
        .then(function (r) { if (r.error) throw r.error; })
        .catch(function (e) { MR.log && MR.log('WARN', '云端删除失败：' + e.message); });
    },
    pullPapers: function () {
      if (!this.client || !this.uid) return;
      var self = this;
      this.client.from(TABLE)
        .select('id,name,kind,chars,created_at,content')
        .eq('user_id', this.uid)
        .then(function (r) {
          if (r.error) throw r.error;
          var rows = r.data || [];
          if (!rows.length) { MR.log && MR.log('INFO', '云端暂无论文，可保存本机论文到云端'); return; }
          rows.forEach(function (d) {
            MR.store.put({ id: d.id, name: d.name, kind: d.kind, date: d.created_at, text: d.content || '' }, { skipSync: true });
          });
          MR.log && MR.log('OK', '已从云端拉取 <b>' + rows.length + '</b> 篇论文到本机');
          MR.app && MR.app.render && MR.app.render();
        })
        .catch(function (e) { MR.log && MR.log('WARN', '云端拉取失败：' + e.message); });
    }
  };

  /* ---------------- 登录 / 用户 UI ---------------- */
  /* 把反馈（错误/成功/进度）渲染到弹窗里的醒目条带上：带图标 + 自适应颜色。
     `kind`: 'ok' (绿色 acc) | 'err' (粉色 pink) | 'info' (灰色 ink-3 + spinner) | '' (清除) */
  function showAuthMsg(box, kind, html, spinner, forceVisible) {
    if (!box) return;
    box.classList.remove('is-ok', 'is-err', 'is-info');
    if (!kind) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.classList.add('is-' + kind);
    var iconHtml;
    if (spinner) iconHtml = '<span class="auth__msg-spin" aria-hidden="true"></span>';
    else if (kind === 'ok') iconHtml = '<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><path d="M2.5 7.4 5.6 10.5 11.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    else if (kind === 'err') iconHtml = '<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 4.6v3.2M7 9.4v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    else iconHtml = '';
    box.innerHTML = iconHtml + '<span>' + html + '</span>';
  }
  MR.ui = {
    updateUser: function () {
      var btn = document.getElementById('loginBtn');
      var chip = document.getElementById('userChip');
      if (!btn || !chip) return;
      var u = MR.cloud.user;
      if (u) {
        btn.hidden = true; chip.hidden = false;
        var nm = chip.querySelector('[data-uname]');
        var av = chip.querySelector('[data-uav]');
        if (nm) nm.textContent = u.name || u.email || '用户';
        if (av) {
          if (u.photo) { av.innerHTML = '<img src="' + esc(u.photo) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">'; }
          else { av.textContent = (u.name || u.email || 'U').slice(0, 1).toUpperCase(); }
        }
        chip.setAttribute('title', (u.email || '') + ' · 点击退出登录');
      } else {
        btn.hidden = false; chip.hidden = true;
      }
    },
    openLogin: function () {
      if (!MR.cloud.enabled) {
        MR.modal.open('后端未配置',
          MR.note('当前为<b>纯本地模式</b>：论文库仅保存在你这台设备的浏览器中，刷新或换设备不会同步。', 'acc', 'review1') +
          '<div class="note" style="margin-top:12px">' + MR.icon('plan', 14) +
          '<span>要启用「邮箱 / Google 登录 + 每位用户独立云端论文库」，请在 <b>supabase-config.js</b> 填入真实配置并把 <b>enabled</b> 改为 true。详细步骤见 <b>SUPABASE-接入指南.md</b>。</span></div>',
          '<button class="btn btn--primary" data-close="1">知道了</button>');
        return;
      }
      MR.modal.open('登录 LATTICE',
        '<div class="auth">' +
        '<div class="auth__tabs"><button type="button" class="is-on" data-atab="signin">登录</button><button type="button" data-atab="signup">注册</button></div>' +
        '<div class="auth__row"><label>邮箱</label><input type="email" id="authEmail" class="eq" placeholder="you@example.com" autocomplete="email"></div>' +
        '<div class="auth__row"><label class="auth__rowlabel">密码 <button type="button" class="auth__forgot" data-act="authForgot" title="把密码重置链接发到你的邮箱">忘记密码？</button></label><input type="password" id="authPw" class="eq" placeholder="至少 6 位" autocomplete="current-password"></div>' +
        '<div class="auth__msg" data-ahint hidden></div>' +
        '<button class="btn btn--primary" data-act="authGo" style="width:100%;margin-top:8px">登录</button>' +
        '<div class="auth__sep"><span>或</span></div>' +
        '<button class="btn" data-act="authGoogle" style="width:100%">' + MR.icon('lit', 14) + ' 使用 Google 账号登录</button>' +
        '<div class="note note--acc" style="margin-top:14px">' + MR.icon('review1', 14) +
        '<span>登录后，你的论文只写入 <b>papers</b> 表中 <b>user_id = 你的账户</b> 的行，由数据库行级安全策略强制隔离，他人无法读取。</span></div>' +
        '</div>',
        '<button class="btn" data-close="1">取消</button>');
      setTimeout(function () {
        var em = document.getElementById('authEmail'); if (em) em.focus();
        var box = document.getElementById('modal');
        if (!box) return;
        box.querySelectorAll('[data-atab]').forEach(function (b) {
          b.addEventListener('click', function () {
            box.querySelectorAll('[data-atab]').forEach(function (x) { x.classList.remove('is-on'); });
            b.classList.add('is-on');
            var go = box.querySelector('[data-act="authGo"]');
            if (go) go.textContent = b.getAttribute('data-atab') === 'signup' ? '注册并登录' : '登录';
          });
        });
        var go = box.querySelector('[data-act="authGo"]');
        if (go) go.addEventListener('click', function () {
          var email = (document.getElementById('authEmail').value || '').trim();
          var pw = document.getElementById('authPw').value || '';
          var hint = box.querySelector('[data-ahint]');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showAuthMsg(hint, 'err', '请填写有效的邮箱地址'); return; }
          if (pw.length < 6) { showAuthMsg(hint, 'err', '密码至少 6 位'); return; }
          var mode = box.querySelector('[data-atab].is-on').getAttribute('data-atab');
          showAuthMsg(hint, 'info', '正在连接…', null, true);
          var p = (mode === 'signup') ? MR.cloud.signUpEmail(email, pw) : MR.cloud.signInEmail(email, pw);
          p.then(function () {
            if (mode === 'signup' && MR.cloud && MR.cloud.enabled && !MR.cloud.uid) {
              showAuthMsg(hint, 'ok', '注册成功：若开启了邮箱确认，请到邮箱点击确认链接后再登录。');
              return;
            }
            MR.modal.close();
          }).catch(function (e) { showAuthMsg(hint, 'err', (e && e.message) || '操作失败'); });
        });
        var g = box.querySelector('[data-act="authGoogle"]');
        if (g) g.addEventListener('click', function () {
          MR.cloud.signInGoogle().then(function () {}).catch(function () {});
        });
        var fp = box.querySelector('[data-act="authForgot"]');
        if (fp) fp.addEventListener('click', function () {
          var emailEl = document.getElementById('authEmail');
          var hint = box.querySelector('[data-ahint]');
          var email = emailEl ? (emailEl.value || '').trim() : '';
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            showAuthMsg(hint, 'err', '请先在上方填写注册邮箱');
            if (emailEl) emailEl.focus();
            return;
          }
          showAuthMsg(hint, 'info', '正在发送重置邮件…', null, true);
          fp.disabled = true;
          MR.cloud.requestPasswordReset(email).then(function (r) {
            fp.disabled = false;
            if (r && r.ok) {
              showAuthMsg(hint, 'ok', '重置邮件已发送至 <b>' + email + '</b>。请到邮箱点击链接设置新密码。');
              MR.log && MR.log('OK', '密码重置邮件已发送：<b>' + email + '</b>');
              /* 顺手让密码框失焦，避免输入残留感 */
              var pwEl = document.getElementById('authPw'); if (pwEl) pwEl.blur();
            } else {
              showAuthMsg(hint, 'err', (r && r.error && r.error.message) || '发送失败');
            }
          });
        });
      }, 0);
    },
    signOut: function () {
      MR.cloud.signOut().then(function () { MR.log && MR.log('OK', '已退出登录'); });
    }
  };

  /* ---------------- 接入现有上传 / 粘贴流程（自动归档） ---------------- */
  if (typeof MR.loadText === 'function') {
    var _lt = MR.loadText;
    MR.loadText = function (text, name) {
      _lt(text, name);
      MR.store.rememberCurrent();
    };
  }
})();
