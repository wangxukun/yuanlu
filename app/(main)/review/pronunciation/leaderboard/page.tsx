import PronunciationLeaderboardPage from "@/app/(main)/library/pronunciation/leaderboard/page";

export const metadata = {
  title: "发音达人榜 | 远路播客",
};

/** 复习中心 - 发音达人榜（复用 /library/pronunciation/leaderboard 的实现）。
 *  置于 /review 路由段内，保证顶部 Top Tabs 跨导航常驻、发音弱项本 Tab 保持高亮。 */
export default function ReviewPronunciationLeaderboardPage() {
  return <PronunciationLeaderboardPage />;
}
