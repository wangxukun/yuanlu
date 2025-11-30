import { Metadata } from "next";
import { notFound } from "next/navigation";
import { episodeService } from "@/core/episode/episode.service";
import { EpisodeSubtitles } from "@/core/episode/dto/episode-subtitles";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { deleteOSSFile } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Management Subtitles",
};

// 删除英文字幕的 Server Action
async function deleteEnSubtitle(formData: FormData) {
  "use server";
  const id = formData.get("episodeId") as string;
  const fileName = formData.get("fileName") as string;
  try {
    // 从服务器删除文件
    await deleteOSSFile(fileName);
    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleEnUrl: null,
      subtitleEnFileName: null,
    };
    await episodeService.updateSubtitleEn(id, updateData);
    return { success: true };
  } catch (error) {
    console.error("删除英文字幕失败:", error);
    return { success: false, error: "删除失败" };
  }
}

// 删除中文字幕的 Server Action
async function deleteZhSubtitle(formData: FormData) {
  "use server";
  const id = formData.get("episodeId") as string;
  const fileName = formData.get("fileName") as string;
  try {
    // 从服务器删除文件
    await deleteOSSFile(fileName);
    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleZhUrl: null,
      subtitleZhFileName: null,
    };
    await episodeService.updateSubtitleZh(id, updateData);
    return { success: true };
  } catch (error) {
    console.error("删除中文字幕失败:", error);
    return { success: false, error: "删除失败" };
  }
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  const episodeSubtitles: EpisodeSubtitles =
    await episodeService.getSubtitles(id);
  console.log("Management Subtitles:", episodeSubtitles);

  if (!episodeSubtitles) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-base-300">
          <h1 className="text-2xl font-bold text-primary">字幕管理</h1>
          <p className="text-base-content/70 mt-1">下载并管理节目字幕</p>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={episodeSubtitles.coverUrl}
                  alt={episodeSubtitles.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-grow">
              <h2 className="text-2xl font-bold text-base-content mb-6">
                {episodeSubtitles.title}
              </h2>

              <div className="space-y-4">
                {episodeSubtitles.subtitleEnUrl ? (
                  <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">
                          英文字幕
                        </h3>
                        <p className="text-base-content/70 text-sm mt-1">
                          English Subtitle
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={episodeSubtitles.subtitleEnUrl}
                          className="btn btn-primary"
                          target="_blank"
                        >
                          下载
                        </Link>
                        <form action={deleteEnSubtitle}>
                          <input type="hidden" name="episodeId" value={id} />
                          <input
                            type="hidden"
                            name="fileName"
                            value={episodeSubtitles.subtitleEnFileName || ""}
                          />
                          <button type="submit" className="btn btn-error">
                            删除
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">
                          无英文字幕
                        </h3>
                        <p className="text-base-content/70 text-sm mt-1">
                          No English Subtitle
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {episodeSubtitles.subtitleZhUrl ? (
                  <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">
                          中文字幕
                        </h3>
                        <p className="text-base-content/70 text-sm mt-1">
                          Chinese Subtitle
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={episodeSubtitles.subtitleZhUrl}
                          className="btn btn-primary"
                          target="_blank"
                        >
                          下载
                        </Link>
                        <form action={deleteZhSubtitle}>
                          <input type="hidden" name="episodeId" value={id} />
                          <input
                            type="hidden"
                            name="fileName"
                            value={episodeSubtitles.subtitleZhFileName || ""}
                          />
                          <button type="submit" className="btn btn-error">
                            删除
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-200 rounded-xl p-5 hover:bg-base-300 transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">
                          无中文字幕
                        </h3>
                        <p className="text-base-content/70 text-sm mt-1">
                          No Chinese Subtitle
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
