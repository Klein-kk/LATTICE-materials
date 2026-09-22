# LATTICE Workspace

LATTICE —— 面向**材料学科全部方向**的十环节科研流水线 Web 应用。纯静态、零构建、零第三方运行时依赖。

本仓库保存平台的完整工作区：可运行的前端平台、开发期脚本与调试记录、架构提案、事故复盘，以及交付物。

## 目录结构

| 目录 | 内容 |
|---|---|
| `lattice-platform/` | **平台本体**。纯静态站点，双击 `index.html` 即可运行，或 `python -m http.server`。含 `assets/js`（26 个模块）、`assets/css` |
| `_dev/` | 开发期资料：构建与补丁脚本（`build_*.py` / `patch_*.py`）、冒烟与调试脚本（`smoke*.js` / `*dbg.js`）、架构提案、事故复盘、以及 `shots/`~`shots6/` 六批界面截图 |
| `deliverables/` | 交付文档，如 `engineering-assurance/incident-lattice-en-import-2026-09-18.md` |

> `.learnbuddy/` 为本地工作记忆，已在 `.gitignore` 中排除，不同步到仓库。

## 在线访问

GitHub Pages（站点副本，由 `gh-pages` 分支发布）：推送后在仓库 **Settings → Pages** 中把 Source 选为 `gh-pages` / `/(root)`，即可得到一个公开网址。

## 快速开始

```bash
cd lattice-platform
python -m http.server 8000
# 打开 http://localhost:8000
```

## 两条硬原则

1. **不预设研究方向** —— 平台不绑定任何具体课题，由导入的论文定义课题。
2. **只分析原文有的内容** —— 抽取引擎只输出论文中真实出现的东西，抽不到的标「原文未报告」，绝不补全、绝不臆造。

平台的详细能力说明见 [`lattice-platform/README.md`](lattice-platform/README.md)。
