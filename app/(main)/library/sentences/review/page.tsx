import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import ReviewDeck from "./ReviewDeck";

export const metadata = {
  title: "句子复习 | 远路播客",
};

export default async function SentenceReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ subtitleId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const userid = session.user.userid;

  // 收藏列表 + 生词本 + 会员态（[P3-d] 高级模式/翻卡成就置锁判定）
  const [sentences, vocabRows, isPremium] = await Promise.all([
    sentencesService.getSavedSentences(userid),
    prisma.vocabulary.findMany({
      where: { userid },
      select: { word: true, definition: true },
    }),
    isPremiumUser(session.user),
  ]);

  // 深链定位：影子跟读评测页「返回卡片」携带 subtitleId 回到对应滑动卡
  const { subtitleId } = (await searchParams) ?? {};

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen transition-colors duration-300">
      <ReviewDeck
        sentences={sentences}
        vocabWords={vocabRows}
        initialSubtitleId={subtitleId}
        isPremium={isPremium}
      />
    </div>
  );
}
