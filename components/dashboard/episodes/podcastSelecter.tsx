"use client";
import React from "react";
import { Podcast } from "@/core/podcast/podcast.entity";

interface PodcastSelecterProps {
  podcasts: Podcast[];
  onValueChange: (value: string) => void;
}
export default function PodcastSelecter({
  podcasts,
  onValueChange,
}: PodcastSelecterProps) {
  const [podcastId, setPodcastId] = React.useState("");
  return (
    <div className="relative w-80">
      <select
        id="podcastid"
        name="podcastid"
        className="select select-success"
        defaultValue=""
        onChange={(e) => {
          const selectedPodcastId = e.target.value;
          setPodcastId(selectedPodcastId);
          onValueChange(selectedPodcastId);
          console.log("PodcastSelecter podcastId", podcastId);
        }}
        aria-describedby="customer-error"
      >
        <option value="" disabled>
          选择一个播客
        </option>
        {podcasts.map((podcast) => (
          <option key={podcast.podcastid} value={podcast.podcastid}>
            {podcast.title}
          </option>
        ))}
      </select>
    </div>
  );
}
