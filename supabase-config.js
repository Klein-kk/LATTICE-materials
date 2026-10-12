/* ============================================================
   LATTICE · Supabase 配置（占位）
   ------------------------------------------------------------
   为什么用 Supabase：它的注册不依赖 Google Cloud，
   用邮箱或 GitHub 就能开项目；同样提供「登录 + 每用户独立数据 + 行级权限」。
   拿到真实配置后：
     1. 把下面 url / anonKey 换成你的真实值
     2. 把 enabled 改为 true
     3. 在 Supabase SQL Editor 里执行 supabase-schema.sql（建表 + RLS）
   未启用（enabled:false）时：
     - 平台所有功能本地可用，论文库仅存于本机浏览器
     - 登录按钮提示「后端未配置」，不会尝试连网
   详见 SUPABASE-接入指南.md
   ============================================================ */
window.LATTICE_SUPABASE = {
  enabled: true,                                    // 已启用
  url:     "https://rfruuxosxrwensktjszi.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcnV1eG9zeHJ3ZW5za3Rqc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Mjc1OTQsImV4cCI6MjEwNzEwMzU5NH0.DXM1mKwQGGxzwAdq5FD698mvYuryHGDRPMENpVJym50"
};
/* 说明：anonKey 是「公开匿名密钥」，本就设计为可暴露在前端；
   真正的数据隔离由数据库的行级安全策略（RLS）保证。 */
