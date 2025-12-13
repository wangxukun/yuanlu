import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeDocument from "@/components/episode/EpisodeDocument";
import EpisodeComments from "@/components/episode/EpisodeComments";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await fetchEpisodeById(id);
  const subtitles = await mergeSubtitles(episode);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
      {/* [重要修改]
         将 lg:grid-cols-12 改为 xl:grid-cols-12
         这意味着在 iPad Pro (1024px, 属于 lg 断点) 上，
         布局将回退到 grid-cols-1 (单栏)，避免拥挤。
      */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12 items-start relative">
        {/* 左侧/顶部：剧集概览 */}
        {/* 同样，将 lg: 前缀改为 xl: */}
        <div className="xl:col-span-3 xl:sticky xl:top-24 transition-all z-10">
          <EpisodeSummarize episode={episode} />
        </div>

        {/* 右侧/底部：主要内容 */}
        {/* 同样，将 lg: 前缀改为 xl: */}
        <div className="xl:col-span-9 flex flex-col gap-10 min-w-0">
          <section>
            <EpisodeDocument subtitle={subtitles} episode={episode} />
          </section>

          <section>
            <EpisodeComments episodeId={episode.episodeid} />
          </section>
        </div>
      </div>
    </div>
  );
}
