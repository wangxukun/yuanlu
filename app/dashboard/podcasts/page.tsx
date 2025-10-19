"use client";
import PodcastItem from "@/components/dashboard/podcasts/PodcastItem";
import { Podcast } from "@/app/types/podcast";
import React, { Suspense, useEffect, useState } from "react";
import Search from "@/components/search";
import { CreatePodcastBtn } from "@/components/dashboard/buttons";

export default function Home() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  useEffect(() => {
    const fetchPodcasts = async () => {
      const response = await fetch("/api/podcast/list");
      const data = await response.json();
      setPodcasts(data);
    };
    fetchPodcasts();
  }, []);
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <div className="breadcrumbs text-xl">
          <ul>
            <li>播客管理</li>
          </ul>
        </div>
      </div>
      <Suspense>
        <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
          <Search placeholder="搜索播客资源..." />
          <CreatePodcastBtn />
        </div>
        <div className="space-y-4">
          {podcasts.map((podcast) => (
            <PodcastItem key={podcast.podcastid} podcast={podcast} />
          ))}
        </div>
      </Suspense>
    </div>
  );
}
