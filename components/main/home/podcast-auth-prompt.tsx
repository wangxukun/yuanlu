"use client";
import PodcastIcon from "@/components/icons/PodcastIcon";

export default function PodcastAuthPrompt() {
  return (
    <div className="min-h-[80vh] bg-ink-50 dark:bg-ink-950 flex flex-col items-center justify-center p-6 xl:p-12 transition-all">
      <div className="text-center space-y-8 xl:space-y-6 justify-center w-full max-w-lg">
        {/* 标题 */}
        <h1 className="text-3xl xl:text-4xl font-bold text-ink-900 dark:text-ink-50 font-display">
          跟上您的节目
        </h1>

        {/* 图标 - 响应式处理 */}
        <div className="flex justify-center">
          {/* Mobile: 较小的尺寸 (240px) */}
          <div className="block xl:hidden text-primary-600 dark:text-primary-400">
            <PodcastIcon size={240} />
          </div>
          {/* Desktop: 严格保持原尺寸 (360px) */}
          <div className="hidden xl:block text-primary-600 dark:text-primary-400">
            <PodcastIcon size={360} />
          </div>
        </div>

        {/* 描述文字 */}
        <p className="text-ink-500 dark:text-ink-400 text-base xl:text-lg leading-relaxed px-4 max-w-md mx-auto">
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
            w-full sm:w-auto
            sm:min-w-48
            bg-primary-600 hover:bg-primary-700
            text-white
            font-semibold
            py-3 px-8
            rounded-full
            shadow-md hover:shadow-lg
            flex items-center justify-center gap-2
            active:scale-95 transition-all
          "
        >
          立即登录
        </button>
      </div>
    </div>
  );
}
