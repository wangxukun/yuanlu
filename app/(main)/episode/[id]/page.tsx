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
    // [Layout Change 1] 全局背景微调，增加层次感
    <div className="min-h-screen bg-base-200/30">
      <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-10">
        {/* [Grid System]
           < xl (Mobile/Tablet): 单列布局
           >= xl (Desktop): 12列布局
        */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-16 items-start relative">
          {/* --- 左侧边栏 (Sidebar) --- */}
          {/* Desktop: Sticky 定位，随页面滚动但固定在视口 */}
          <aside className="xl:col-span-3 xl:sticky xl:top-28 transition-all z-10 order-1">
            <EpisodeSummarize episode={episode} />
          </aside>

          {/* --- 右侧主要内容区 (Main Content) --- */}
          {/* 包含：精读文稿 + 评论区 */}
          <main className="xl:col-span-9 flex flex-col gap-10 min-w-0 order-2">
            <section>
              <EpisodeDocument subtitle={subtitles} episode={episode} />
            </section>

            <section className="{/*max-w-4xl*/}">
              <EpisodeComments episodeId={episode.episodeid} />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
