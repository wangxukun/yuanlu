import PronunciationPage from "../../library/pronunciation/page";

export const metadata = {
  title: "发音弱项本 | 远路播客",
};

/** 复习中心 - 发音弱项本（复用 /library/pronunciation 的服务端实现） */
export default function ReviewPronunciationPage() {
  return <PronunciationPage />;
}
