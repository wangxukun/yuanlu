"use client";
import PodcastIcon from "@/components/icons/PodcastIcon";

export default function PodcastAuthPrompt() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-primary to-secondary flex flex-col items-center justify-center xl:justify-start p-6 xl:p-12 transition-all">
      <div className="text-center space-y-8 xl:space-y-6 justify-center w-full max-w-sm xl:max-w-none">
        {/* 标题 */}
        <h1 className="text-3xl xl:text-4xl font-bold text-base-100">
          跟上您的节目
        </h1>

        {/* 图标 - 响应式处理 */}
        <div className="flex justify-center">
          {/* Mobile: 较小的尺寸 (280px) */}
          <div className="block xl:hidden">
            <PodcastIcon size={280} fill="fill-base-100" />
          </div>
          {/* Desktop: 严格保持原尺寸 (480px) */}
          <div className="hidden xl:block">
            <PodcastIcon size={480} fill="fill-base-100" />
          </div>
        </div>

        {/* 描述文字 */}
        <p className="text-base-200 text-base xl:text-lg leading-relaxed px-2 xl:px-0">
          保存您的位置，关注节目并查看最新剧集，生词收藏等获取最多功能。
        </p>

        {/* 登录按钮 */}
        <button
          onClick={() =>
            (
              document.getElementById(
                "email_check_modal_box",
              ) as HTMLDialogElement
            )?.showModal()
          }
          className="
            mx-auto
            w-full xl:w-auto        /* Mobile: 全宽; Desktop: 自动宽度 */
            xl:min-w-48             /* Desktop: 保持原有最小宽度 */
            bg-base-100
            text-base-content
            font-medium
            py-3.5 xl:py-3 px-6     /* Mobile: 增加点击区域 */
            rounded-xl xl:rounded-lg /* Mobile: 更圆润的边角 */
            shadow-lg
            flex items-center justify-center gap-2
            active:scale-98 transition-transform /* Mobile: 点击反馈 */
          "
        >
          登录
        </button>
      </div>
    </div>
  );
}
