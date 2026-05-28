import { Metadata } from "next";
import { notFound } from "next/navigation";
import { episodeService } from "@/core/episode/episode.service";
import { CoverUploadForm } from "@/components/admin/episodes/CoverUploadForm";

export const metadata: Metadata = {
  title: "Management Cover",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  // 使用 getSubtitles 获取包含签名的 coverUrl 和其他信息
  const episode = await episodeService.getSubtitles(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-base-300">
          <h1 className="text-2xl font-bold text-primary">封面管理</h1>
          <p className="text-base-content/70 mt-1">
            上传新图片将替换并删除原有的封面文件
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={episode.coverUrl}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-grow w-full">
              <h2 className="text-2xl font-bold text-base-content mb-6">
                {episode.title}
              </h2>

              <div className="space-y-4">
                <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg text-primary">
                        单集封面
                      </h3>
                      <p className="text-base-content/70 text-sm mt-1">
                        Episode Cover
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <CoverUploadForm episodeId={id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
