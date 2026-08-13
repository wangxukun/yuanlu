import { Metadata } from "next";
import { notFound } from "next/navigation";
import { episodeService } from "@/core/episode/episode.service";
import { AudioUploadForm } from "@/components/admin/episodes/AudioUploadForm";
import React from "react";

export const metadata: Metadata = {
  title: "Management Audio",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  // 使用 getEditItem 获取包含签名的 audioUrl 和其他信息
  const episode = await episodeService.getEditItem(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-base-300">
          <h1 className="text-2xl font-bold text-primary">音频管理</h1>
          <p className="text-base-content/70 mt-1">
            上传新音频将替换并删除原有的音频文件
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-8">
            <div className="flex-grow w-full">
              <h2 className="text-2xl font-bold text-base-content mb-6">
                {episode.title}
              </h2>

              <div className="space-y-4">
                <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-primary">
                        单集音频
                      </h3>
                      <p className="text-base-content/70 text-sm mt-1">
                        Episode Audio
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AudioUploadForm episodeId={id} />
                    </div>
                  </div>

                  {episode.audioUrl ? (
                    <div className="mt-4 p-4 bg-base-100 rounded-lg">
                      <p
                        className="text-sm text-base-content/70 mb-2 truncate"
                        title={episode.audioFileName || ""}
                      >
                        当前文件: {episode.audioFileName || "已上传音频"}
                      </p>
                      <audio controls className="w-full">
                        <source src={episode.audioUrl} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-base-100 rounded-lg flex items-center justify-center text-base-content/50">
                      暂无音频，请上传
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
