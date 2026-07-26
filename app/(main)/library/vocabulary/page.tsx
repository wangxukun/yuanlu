import { auth } from "@/auth";
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

  // 服务端获取数据
  const vocabularyList = await vocabularyService.getAllVocabulary(
    session.user.userid,
  );

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <VocabularyNotebook vocabularyList={vocabularyList} />
    </div>
  );
}
