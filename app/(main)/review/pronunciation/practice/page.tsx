import PronunciationPracticePage from "@/app/(main)/library/pronunciation/practice/page";

export const metadata = {
  title: "发音弱项闯关复习 | 远路播客",
};

/** 复习中心 - 弱项闯关复习（复用 /library/pronunciation/practice 的实现）。
 *  置于 /review 路由段内，保证顶部 Top Tabs 跨导航常驻、发音弱项本 Tab 保持高亮。 */
export default function ReviewPronunciationPracticePage() {
  return <PronunciationPracticePage />;
}
