import SentenceReviewPage from "@/app/(main)/library/sentences/review/page";

export const metadata = {
  title: "句子复习 | 远路播客",
};

/** 复习中心 - 刷句复习（复用 /library/sentences/review 的服务端实现）。
 *  置于 /review 路由段内，保证顶部 Top Tabs 跨导航常驻、句子本 Tab 保持高亮。
 *  透传 ?subtitleId= 深链参数（影子跟读页「返回卡片」定位对应滑动卡）。 */
export default function ReviewSentenceReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ subtitleId?: string }>;
}) {
  return <SentenceReviewPage searchParams={searchParams} />;
}
