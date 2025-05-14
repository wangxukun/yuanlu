"use client";
import PodcastIcon from "@/components/icons/PodcastIcon";

export default function PodcastAuthPrompt() {
  return (
    <div className="min-h-screen bg-linear-to-r from-purple-500 to-purple-700 flex flex-col items-center justify-start p-12">
      <div className="text-center space-y-6 justify-center">
        {/* 标题 */}
        <h1 className="text-4xl font-bold text-white">跟上您的节目</h1>

        <PodcastIcon size={480} fill="fill-white" />

        {/* 描述文字 */}
        <p className="text-pink-200 text-lg leading-relaxed">
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
            bg-white
            text-black
            font-medium
            py-3 px-6
            rounded-lg
            shadow-lg
            {/*transform hover:scale-105*/}
            flex items-center justify-center gap-2
          "
        >
          登录
        </button>
      </div>
    </div>
  );
}
