/* LATTICE · three-manifest.js — 内置 3D 模型清单（运行时，嵌入以避免 file:// 下 fetch 失败）
 * 键 = MR.state.paperId（内置示例文档 S1–S4）。
 * glb 由 agent 端基于该文晶格参数 / 代表结构文生3D 产出，纯示意、非精修结构。
 * 用户上传论文的 paperId 不在本表时，环节04 仅显示 SVG 球棍图（含「需代理 / 离线生成」提示）。
 */
window.MR = window.MR || {};
MR.threeManifest = {
  "S4": {
    "glb": "assets/3d/S4_nasicion.glb",
    "title": "碳包覆磷酸钒钠（Na3V2(PO4)3 / NASICON 型）晶胞示意",
    "badge": "AI 生成 · 示意 · 基于本文晶格参数",
    "elements": ["Na", "V", "P", "O"],
    "prompt": "ball-and-stick crystal unit cell of a NASICON-type sodium vanadium phosphate Na3V2(PO4)3, showing Na (violet), V (blue-grey), P (orange) and O (red) atoms in CPK colors connected by bonds, a/b/c axes labeled, clean scientific illustration, soft studio lighting, white background, high detail"
  }
};
