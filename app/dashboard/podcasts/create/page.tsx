import PodcastForm from "@/components/dashboard/podcasts/podcast-form";
import React from "react";
export default function Page() {
  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/podcasts">播客管理</a>
          </li>
          <li>创建播客</li>
        </ul>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <PodcastForm />
      </div>
    </div>
  );
}
