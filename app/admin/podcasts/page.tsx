"use client";
import PodcastItem from "@/components/admin/podcasts/PodcastItem";
import React, { Suspense, useEffect, useState } from "react";
import Search from "@/components/search";
import { CreatePodcastBtn } from "@/components/admin/buttons";
import { Podcast } from "@/core/podcast/podcast.entity";

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
      <Suspense>
        <div className="flex items-center justify-between gap-2">
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
