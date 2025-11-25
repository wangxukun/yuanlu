import { Metadata } from "next";
import { fetchEpisodeById } from "@/app/lib/data";
import { Episode } from "@/app/types/podcast";
import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import { notFound } from "next/navigation";
import EpisodeEditForm from "@/app/dashboard/episodes/[id]/edit/episode-edit-form";

export const metadata: Metadata = {
  title: "Update Episode",
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
          { label: "音频管理", href: "/dashboard/episodes" },
          {
            label: "修改音频",
            href: `/dashboard/episodes/${id}/edit`,
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-base-200 text-sm p-6 max-w-4xl mx-auto">
        <EpisodeEditForm episode={episode} />
      </div>
    </main>
  );
}
