import { fetchEpisodeById, fetchPodcastById } from "@/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeComments from "@/components/episode/EpisodeComments";
import ShowNotes from "@/components/episode/ShowNotes";
import RelatedEpisodes from "@/components/episode/RelatedEpisodes";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const episode = await fetchEpisodeById(id);

  if (!episode) return { title: "单集未找到" };

  return {
    title: `${episode.title} | ${episode.podcast?.title || "远路播客"}`,
    description: episode.description?.slice(0, 150) + "...",
    openGraph: {
      title: episode.title,
      description: episode.description || "",
      images: episode.coverUrl ? [episode.coverUrl] : [],
      type: "article",
      audio: episode.audioUrl,
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
  const podcast = await fetchPodcastById(episode.podcastid);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    description: episode.description,
    image: episode.coverUrl,
    datePublished: episode.publishAt,
    timeRequired: `PT${Math.floor(episode.duration / 60)}M`,
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.audioUrl,
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: episode.podcast?.title,
      url: `https://www.wxkzd.com/podcast/${episode.podcast?.podcastid}`,
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-12 pt-8 md:pt-12 pb-32">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 lg:gap-16">
          {/* --- Left Column: Main Content (2/3) --- */}
          <div className="xl:col-span-2 flex flex-col gap-12 md:gap-16 min-w-0">
            {/* Hero Section */}
            <EpisodeSummarize episode={episode} />

            {/* Immersive Mode Card */}
            {/* <ImmersiveCard episode={episode} subtitles={subtitles} /> */}

            {/* Show Notes */}
            <ShowNotes episode={episode} />

            {/* Discussion Module */}
            <section className="rounded-2xl flex flex-col gap-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                互动讨论
              </h2>
              <EpisodeComments episodeId={episode.episodeid} />
            </section>
          </div>

          {/* --- Right Column: Sidebar (1/3) --- */}
          <aside className="flex flex-col gap-10">
            <RelatedEpisodes podcast={podcast} currentId={episode.episodeid} />
          </aside>
        </div>
      </main>
    </div>
  );
}
