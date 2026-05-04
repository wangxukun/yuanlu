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
    <div className="min-h-screen bg-[#f9f9ff] dark:bg-slate-950 transition-colors duration-300 font-['Lexend',sans-serif]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 pt-8 md:pt-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* --- Left Column: Main Content (8/12) --- */}
          <div className="lg:col-span-8 flex flex-col gap-12 min-w-0">
            {/* Hero Section: EpisodeSummarize handles Player + Title + Meta */}
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

          {/* --- Right Column: Sidebar (4/12) --- */}
          <aside className="lg:col-span-4 flex flex-col gap-10">
            <div className="lg:sticky lg:top-8">
              <RelatedEpisodes
                podcast={podcast}
                currentId={episode.episodeid}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
