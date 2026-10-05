import { redirect } from "next/navigation";

// 历史成就通知的 targetUrl 曾误发 /charts(Web 端从未有过该路由),
// 此页仅为存量收件箱通知提供落点,重定向到学习报表真实路由。
// 后端自 2026-10 起已直发 /library/learning-report。
export default function ChartsRedirectPage() {
  redirect("/library/learning-report");
}
