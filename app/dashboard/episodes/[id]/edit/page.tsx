import { Metadata } from "next";
import { fetchEpisodeById } from "@/app/lib/data";
import { Episode } from "@/app/types/podcast";
import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import { notFound } from "next/navigation";
import EpisodeEditForm from "@/app/dashboard/episodes/[id]/edit/episode-edit-form";

export const metadata: Metadata = {
  title: "Edit Episode",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  const episode: Episode = await fetchEpisodeById(id);

  if (!episode) {
    notFound();
  }

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "剧集", href: "/dashboard/episodes" },
          {
            label: "编辑剧集",
            href: `/dashboard/episodes/${id}/edit`,
            active: true,
          },
        ]}
      />
      <EpisodeEditForm episode={episode} />
    </main>
  );
}
