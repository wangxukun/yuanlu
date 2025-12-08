"use client";
import React from "react";
import { Podcast } from "@/core/podcast/podcast.entity";

interface PodcastSelecterProps {
  currentPodcastId: string;
  podcasts: Podcast[];
  onValueChange: (value: string) => void;
}
export default function PodcastSelecter({
  currentPodcastId,
  podcasts,
  onValueChange,
}: PodcastSelecterProps) {
  const [podcastId, setPodcastId] = React.useState(currentPodcastId);
  console.log("PodcastSelecter podcastId", podcastId);
  return (
    <div className="relative w-80">
      <select
        id="podcastid"
        name="podcastid"
        className="select select-success"
        value={podcastId}
        onChange={(e) => {
          const selectedPodcastId = e.target.value;
          setPodcastId(selectedPodcastId);
          onValueChange(selectedPodcastId);
          console.log("PodcastSelecter podcastId", podcastId);
        }}
        aria-describedby="customer-error"
      >
        {podcastId === "" && (
          <option value="" disabled>
            选择一个播客
          </option>
        )}
        {podcasts.map((podcast) => (
          <option key={podcast.podcastid} value={podcast.podcastid}>
            {podcast.title}
          </option>
        ))}
      </select>
    </div>
  );
}
