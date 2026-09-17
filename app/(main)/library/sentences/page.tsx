import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import SentenceNotebook from "./SentenceNotebook";

export const metadata = {
  title: "句子本 | 远路播客",
};

export default async function SentencesPage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const userid = session.user.userid;

  // 收藏列表 + 生词本（word + 释义，用于英文原句中生词高亮联动）
  // + 会员态（[P3-d] 容量条口径 / 导出 PRO 化判定）
  const [sentences, vocabRows, isPremium] = await Promise.all([
    sentencesService.getSavedSentences(userid),
    prisma.vocabulary.findMany({
      where: { userid },
      select: { word: true, definition: true },
    }),
    isPremiumUser(session.user),
  ]);

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <SentenceNotebook
        sentences={sentences}
        vocabWords={vocabRows}
        isPremium={isPremium}
      />
    </div>
  );
}
