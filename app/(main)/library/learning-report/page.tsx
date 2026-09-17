import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isPremiumUser } from "@/core/auth/guard";
import { getLearningReport } from "@/core/stats/learning-report.service";
import { LearningReportView } from "./LearningReportView";

export const metadata = {
  title: "学习报表 | 远路播客",
};

/**
 * [P3-f] 学习报表页（个人中心入口）：
 * 免费层 = 近 7 天学习简报；PRO = 近 365 天（月/季/年趋势 + 全年热力图 +
 * 智能学习建议）。数据切片在服务端完成（免费只取 7 天，前端锁定层弹
 * stats_report 场景会员窗承接——弹窗 + 埋点为验收红线）。
 */
export default async function LearningReportPage() {
  const session = await auth();
  if (!session?.user?.userid) {
    redirect("/");
  }

  const isPremium = await isPremiumUser(session.user);
  const report = await getLearningReport(session.user.userid, isPremium);

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <LearningReportView report={report} isPremium={isPremium} />
    </div>
  );
}
