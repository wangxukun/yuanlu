import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import React from "react";
import EpisodeForm from "@/components/dashboard/podcasts/episode-form";
import { fetchPodcasts } from "@/app/lib/data";
export default async function Page() {
  const podcasts = await fetchPodcasts();
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "剧集管理", href: "/dashboard/episodes" },
          {
            label: "发布播客剧集",
            href: "/dashboard/episodes/create",
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <EpisodeForm podcasts={podcasts} />
      </div>
    </div>
  );
}
