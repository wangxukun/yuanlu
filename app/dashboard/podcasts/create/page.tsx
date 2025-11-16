import PodcastForm from "@/components/dashboard/podcasts/podcast-form";
import React from "react";
export default function Page() {
  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/podcasts">合集管理</a>
          </li>
          <li>创建合集</li>
        </ul>
      </div>
      <div className="rounded-lg bg-base-200 text-sm p-2 md:pt-0 max-w-5xl mx-auto">
        <PodcastForm />
      </div>
    </div>
  );
}
