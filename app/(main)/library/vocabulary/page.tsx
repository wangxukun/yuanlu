import { auth } from "@/auth";
import { isPremiumUser } from "@/core/auth/guard";
import { vocabularyService } from "@/core/vocabulary/vocabulary.service";
import VocabularyNotebook from "./VocabularyNotebook";
import { redirect } from "next/navigation";

export const metadata = {
  title: "生词本 | 远路播客",
};

export default async function VocabularyPage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  // 服务端获取数据 + 会员态（配额双栏卡口径：免费 50 上限 / PRO 无限）
  const [vocabularyList, isPremium] = await Promise.all([
    vocabularyService.getAllVocabulary(session.user.userid),
    isPremiumUser(session.user),
  ]);

  // 今日已新增生词数：与 /api/vocabulary/add 配额检查同一口径
  // （服务器本地 0 点起按 addedDate 计数），展示与执法不漂移；
  // 服务层 addedDate 已序列化为 ISO 字符串，new Date 解析无时歧义
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAddedCount = vocabularyList.filter(
    (v) => v.addedDate && new Date(v.addedDate) >= today,
  ).length;

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <VocabularyNotebook
        vocabularyList={vocabularyList}
        isPremium={isPremium}
        todayAddedCount={todayAddedCount}
      />
    </div>
  );
}
