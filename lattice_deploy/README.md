# LATTICE 部署上传包

把本文件夹内的 9 个文件**覆盖**到 GitHub 仓库 `klein-kk/LATTICE-materials` 的 `gh-pages` 分支**根目录**。

路径 1:1 对应，直接覆盖即可：

```
index.html                  -> gh-pages/index.html
supabase-config.js          -> gh-pages/supabase-config.js
assets/css/auth.css         -> gh-pages/assets/css/auth.css
assets/css/mascot.css       -> gh-pages/assets/css/mascot.css
assets/js/app.js            -> gh-pages/assets/js/app.js
assets/js/cloud.js          -> gh-pages/assets/js/cloud.js
assets/js/mascot.js         -> gh-pages/assets/js/mascot.js
assets/js/views2-paper.js   -> gh-pages/assets/js/views2-paper.js
assets/js/views2-stages.js  -> gh-pages/assets/js/views2-stages.js
```

## 重要提醒

**不要动** `assets/3d/S4_nasicion.glb`（31.6 MB）——它已经在 gh-pages 上了，重复上传会卡死网页端。本包刻意不包含它。

部署后刷新的判断标准：`index.html` 应为 **11,175 字节**（旧版是 10,174）。

---

## 方式 A：有 git（推荐，2 分钟）

在**能连通 GitHub** 的机器上（仓库已 clone 到 `LATTICE-materials/`，当前分支 `gh-pages`）：

```bash
cd LATTICE-materials
git checkout gh-pages
git pull origin gh-pages

# 把本包内容拷到仓库根目录（覆盖）
cp -r /d/lattice_deploy/* ./

git add index.html supabase-config.js assets/css/auth.css assets/css/mascot.css \
        assets/js/app.js assets/js/cloud.js assets/js/mascot.js \
        assets/js/views2-paper.js assets/js/views2-stages.js

git commit -m "feat: Supabase 登录 + 云端论文库 + 桌面宠物小晶"
git push origin gh-pages
```

没 clone 过的话：

```bash
git clone -b gh-pages https://github.com/klein-kk/LATTICE-materials.git
cd LATTICE-materials
cp -r /d/lattice_deploy/* ./
git add . && git commit -m "feat: Supabase + mascot" && git push origin gh-pages
```

## 方式 B：只有网页（约 10 分钟）

打开 https://github.com/klein-kk/LATTICE-materials/tree/gh-pages

- **改已有文件**（`index.html`、`app.js`、`views2-paper.js`、`views2-stages.js`）：点进去 → 右上角铅笔 → 用本包对应文件内容**全选替换** → Commit changes
- **加新文件**：进对应目录 → 右上角 "Add file" → "Create new file" → 上方文件名框里**直接打完整路径**即可自动建目录，例如 `supabase-config.js`、`assets/js/cloud.js`、`assets/js/mascot.js`、`assets/css/auth.css`、`assets/css/mascot.css` → 粘贴内容 → Commit

---

## 推完之后：Supabase 控制台 3 步（必做）

1. **SQL Editor** → New query → 粘贴运行 `lattice-platform/supabase-schema.sql`（建 `papers` 表 + 4 条 RLS 策略）
2. **Authentication → Providers → Email** → 关掉 **Confirm email**
3. **Authentication → URL Configuration** → **Site URL** 填 `https://klein-kk.github.io/LATTICE-materials/`，**Redirect URLs** 也加同一行

---

## 验证

打开 https://klein-kk.github.io/LATTICE-materials/ 并 `Ctrl+Shift+R` 强刷：

- 右上角出现「登录」按钮 → 新版生效
- 邮箱注册登录后，右下角弹出晶格小人「小晶」→ 桌面宠物上线
- F12 → Network → `index.html` 的 Size 为 11,175 → 确认是新版

**注意**：Google 登录按钮不可用（需 GCP OAuth 凭据），请用邮箱注册/登录。
