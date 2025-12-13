import { Metadata } from "next";
import { notFound } from "next/navigation";
import EpisodeEditForm from "@/components/admin/episodes/episode-edit-form";
import { episodeService } from "@/core/episode/episode.service";
import { EpisodeEditItem } from "@/core/episode/dto/episode-edit-item";

export const metadata: Metadata = {
  title: "Update Episode",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  const episode: EpisodeEditItem = await episodeService.getEditItem(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="rounded-lg bg-base-200 text-sm p-6 max-w-4xl mx-auto">
      <EpisodeEditForm episode={episode} />
    </div>
  );
}
