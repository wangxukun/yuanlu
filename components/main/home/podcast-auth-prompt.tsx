"use client";
import PodcastIcon from "@/components/icons/PodcastIcon";

export default function PodcastAuthPrompt() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-primary to-secondary flex flex-col items-center justify-start p-12">
      <div className="text-center space-y-6 justify-center">
        {/* 标题 */}
        <h1 className="text-4xl font-bold text-base-100">跟上您的节目</h1>

        <PodcastIcon size={480} fill="fill-base-100" />

        {/* 描述文字 */}
        <p className="text-base-200 text-lg leading-relaxed">
          保存您的位置，关注节目并查看最新剧集 - 所有这些都是免费的。
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
            min-w-48
            bg-base-100
            text-base-content
            font-medium
            py-3 px-6
            rounded-lg
            shadow-lg
            flex items-center justify-center gap-2
          "
        >
          登录
        </button>
      </div>
    </div>
  );
}
