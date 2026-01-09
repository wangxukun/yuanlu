import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeDocument from "@/components/episode/EpisodeDocument";
import EpisodeComments from "@/components/episode/EpisodeComments";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // fetchEpisodeById 在 lib/data.ts 中使用了 fetch，
  // Next.js 会自动对 fetch 请求进行去重（Request Memoization），所以直接调用两次是安全的。
  const episode = await fetchEpisodeById(id);

  if (!episode) return { title: "单集未找到" };

  return {
    title: `${episode.title} | ${episode.podcast?.title || "远路播客"}`,
    description: episode.description?.slice(0, 150) + "...",
    openGraph: {
      title: episode.title,
      description: episode.description || "",
      images: episode.coverUrl ? [episode.coverUrl] : [],
      type: "article", // 或者 "music.song"
      audio: episode.audioUrl, // 如果支持音频预览
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await fetchEpisodeById(id);
  const subtitles = await mergeSubtitles(episode);

  // SEO 优化
  // 1. 定义 JSON-LD 数据结构
  // 价值： 帮助 Google 等搜索引擎理解这是一个“播客”或“音频单集”，有机会在搜索结果中展示富媒体摘要。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    description: episode.description,
    image: episode.coverUrl,
    datePublished: episode.publishAt, // 推荐添加发布时间
    timeRequired: `PT${Math.floor(episode.duration / 60)}M`, // ISO 8601 时长格式，例如 PT30M
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.audioUrl,
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: episode.podcast?.title,
      // 注意：请将下面的域名替换为你实际的生产环境域名，或者使用 process.env.NEXT_PUBLIC_BASE_URL
      url: `https://www.wxkzd.com/podcast/${episode.podcast?.podcastid}`,
    },
  };

  return (
    // [Layout Change 1] 全局背景微调，增加层次感
    <div className="min-h-screen bg-base-200/30">
      {/* 2. 在此处插入 JSON-LD 脚本 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
