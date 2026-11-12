import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// [暂时下线 2026-11-12] 「远路播客微信小程序正式上线」产品公告落地页暂停展示。
// 原因：小程序主体升级停服中（已发退款致歉广播），「正式上线」文案与实况矛盾。
// 处理：路由保留跳首页——收件箱 245 条广播行与旧链接的 targetUrl 均指向 /app，
//       不留死链；横幅同步关闭（AnnouncementBanner.ANNOUNCEMENT_ENABLED=false）。
// 恢复：git revert 本提交（原落地页含小程序码/六功能卡完整回放）。
// ---------------------------------------------------------------------------

export default function MiniProgramLandingPage() {
  redirect("/home");
}
