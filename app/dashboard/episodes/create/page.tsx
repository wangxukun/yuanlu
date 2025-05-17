import React from "react";
import EpisodeForm from "@/components/dashboard/episodes/episode-form";
import { fetchPodcasts } from "@/app/lib/data";
export default async function Page() {
  const podcasts = await fetchPodcasts();
  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/episodes">剧集管理</a>
          </li>
          <li>发布播客剧集</li>
        </ul>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <EpisodeForm podcasts={podcasts} />
      </div>
    </div>
  );
}
