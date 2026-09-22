# LATTICE 工作区 · GitHub 发布清单

> 生成时间：2026-09-22　目标仓库：`Klein-kk/lattice-workspace`（Public）
> 本地 Git 已就绪：`main` 分支已提交 161 个文件（15.8MB），`gh-pages` 站点分支已建好。**你只需要建仓库 + 推送。**

---

## 一、要上传的文件（161 个，约 15.8MB）

| 目录 | 文件数 | 体积 | 说明 |
|---|---|---|---|
| `lattice-platform/` | 31 | 960KB | **主网站本体**：`index.html` + `assets/js`（26 个模块）+ `assets/css`（3 个）+ `README.md` |
| `_dev/` | 约 125 | 15MB | 开发期资料：`build_*.py` / `patch_*.py` 脚本、`smoke*.js` 冒烟脚本、`architecture/` 架构提案、`incident/` 事故复盘、`shots/`~`shots6/` 六批界面截图（62 张 PNG，13.8MB）、`src/` 论文素材 |
| `LATTICE-PPT/` | 3 | 34KB | `DESIGN.md`、`STORY.md`、`build_pptx.py` |
| `deliverables/` | 1 | 8KB | `engineering-assurance/incident-lattice-en-import-2026-09-18.md` |
| `README.md` · `.gitignore` | 2 | — | 仓库首页说明与忽略规则 |

## 二、明确不上传（已写进 `.gitignore`）

| 路径 | 原因 |
|---|---|
| `.learnbuddy/` | 本地工作记忆，非交付内容 |
| `LATTICE-PPT/_slidep_extract/` | 第三方 npm 包解压目录，含 39MB 的 `slidep.js` 打包产物（等同 `node_modules`） |
| `__pycache__/` `*.pyc` `node_modules/` `.DS_Store` | 常规忽略项 |

> ⚠️ 唯一需要你自己判断的：`_dev/src/` 下有 3 篇论文原文 txt（`1954Nature_…`、`2000Nature_…`、`2001Trends_…`）和 `thesis.txt`。仓库是公开的，若介意版权，推送前执行
> `git rm -r --cached _dev/src && git commit -m "chore: 移除论文素材"` 即可，本地文件不受影响。

## 三、推送步骤

### 1. 建空仓库（网页，30 秒）

打开 <https://github.com/new> ，填：

- Repository name：`lattice-workspace`
- 选 **Public**
- **不要**勾选 Add README / .gitignore / License（勾了会导致推送冲突）

### 2. 推送（本地终端，工作区根目录）

```bash
cd "D:/learnbuddy内容/2026-09-17-01-28-37"

git push -u origin main      # 首次会弹 GitHub 登录窗，用浏览器授权即可
git push origin gh-pages     # 站点分支，供 GitHub Pages 使用
```

`origin` 已经指向 `https://github.com/Klein-kk/lattice-workspace.git`，不用再配。

若登录窗没弹出或报 `could not read Username`，去 <https://github.com/settings/personal-access-tokens/new>
生成一个 Fine-grained token（只对 `lattice-workspace`，权限 `Contents: Read and write`），然后在 Git Credential Manager 的弹窗里粘贴它作为密码。

### 3. 开启 GitHub Pages（可选，但推荐）

推送完 `gh-pages` 后：仓库 **Settings → Pages → Build and deployment**

- Source：**Deploy from a branch**
- Branch：`gh-pages` / `/(root)` → Save

一两分钟后得到公开网址：`https://klein-kk.github.io/lattice-workspace/`

`gh-pages` 分支由 `git subtree split --prefix=lattice-platform` 生成，站点文件已在分支根目录，Pages 能直接识别。以后主站改了，重新生成一次即可：

```bash
git subtree split --prefix=lattice-platform -b gh-pages --rejoin
git push -f origin gh-pages
```

## 四、备选：网页拖拽上传（不推荐）

GitHub 网页单次上传上限 100 个文件，`_dev/` 有 125 个，需要分多批拖拽（`lattice-platform/` → `LATTICE-PPT/` → `deliverables/` → `_dev/` 拆两批），容易漏。命令行一次搞定更稳。
