import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
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
  const [sentences, vocabRows] = await Promise.all([
    sentencesService.getSavedSentences(userid),
    prisma.vocabulary.findMany({
      where: { userid },
      select: { word: true, definition: true },
    }),
  ]);

  return (
    <div className="bg-[#F5F5F7] dark:bg-ink-950 min-h-screen transition-colors duration-300">
      <SentenceNotebook sentences={sentences} vocabWords={vocabRows} />
    </div>
  );
}
