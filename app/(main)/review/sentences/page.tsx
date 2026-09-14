import SentencesPage from "../../library/sentences/page";

export const metadata = {
  title: "句子本 | 远路播客",
};

/** 复习中心 - 句子本（复用 /library/sentences 的服务端实现） */
export default function ReviewSentencesPage() {
  return <SentencesPage />;
}
