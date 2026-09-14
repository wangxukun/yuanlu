import SentenceShadowingPracticePage from "@/app/(main)/library/sentences/review/practice/page";

export const metadata = {
  title: "AI 影子跟读评测 | 远路播客",
};

/** 复习中心 - AI 影子跟读评测（复用 /library/sentences/review/practice 的服务端实现）。
 *  置于 /review 路由段内，保证顶部 Top Tabs 跨导航常驻、句子本 Tab 保持高亮。 */
export default function ReviewSentencePracticePage() {
  return <SentenceShadowingPracticePage />;
}
