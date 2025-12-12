import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeDocument from "@/components/episode/EpisodeDocument";
import EpisodeComments from "@/components/episode/EpisodeComments"; // 引入新组件

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await fetchEpisodeById(id);
  const subtitles = await mergeSubtitles(episode);

  return (
    // 外层容器：限制最大宽度，居中
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
      {/* 响应式网格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start">
        {/* 左侧：信息概览 (Desktop Sticky) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-24 transition-all">
            <EpisodeSummarize episode={episode} />
          </div>
        </div>

        {/* 右侧：主要内容 (逐字稿 + 评论) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-10">
          {/* 精读文档卡片 */}
          <section>
            <EpisodeDocument subtitle={subtitles} episode={episode} />
          </section>

          {/* 评论区 (放在文档下方) */}
          <section className="bg-base-100 rounded-3xl p-6 md:p-8 shadow-sm border border-base-200">
            <EpisodeComments episodeId={episode.episodeid} />
          </section>
        </div>
      </div>
    </div>
  );
}
