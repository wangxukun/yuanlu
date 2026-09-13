import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { sentencesService } from "@/core/sentences/sentences.service";
import SentenceShadowingPractice from "./SentenceShadowingPractice";

export const metadata = {
  title: "AI 影子跟读评测 | 远路播客",
};

/**
 * AI 影子跟读评测页（独立于剧集页语音评测）：
 * 数据源与刷句复习页一致 —— 服务端直取收藏句列表，
 * 客户端按 subtitleId 定位初始句并复用 SpeechEvaluationCard 评测。
 */
export default async function SentenceShadowingPracticePage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const sentences = await sentencesService.getSavedSentences(
    session.user.userid,
  );

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen transition-colors duration-300">
      <Suspense fallback={null}>
        <SentenceShadowingPractice sentences={sentences} />
      </Suspense>
    </div>
  );
}
