import ReviewTabs from "@/components/main/review/ReviewTabs";

/**
 * 复习中心布局：顶部横向选项卡（生词本 / 句子本 / 发音弱项本）。
 * review-hub 类向子页面注入 --review-offset（Tab 栏高度），
 * 供子页面内 sticky 控件（如生词本筛选栏）吸附在 Tab 栏下方。
 */
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="review-hub">
      <ReviewTabs>{children}</ReviewTabs>
    </div>
  );
}
