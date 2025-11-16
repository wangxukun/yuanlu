import EpisodeForm from "@/components/dashboard/episodes/episode-form";
import React from "react";

export default function Page() {
  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/episodes">音频管理</a>
          </li>
          <li>发布音频</li>
        </ul>
      </div>
      <div className="rounded-lg bg-base-200 text-sm p-2 md:pt-0 max-w-5xl mx-auto">
        <EpisodeForm />
      </div>
    </div>
  );
}
