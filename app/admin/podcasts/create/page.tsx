import React from "react";
import PodcastForm from "@/components/admin/podcasts/podcast-form";
import { createPodcast } from "@/lib/actions";

export default function CreatePodcastPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* 传入 createPodcast Action */}
      <PodcastForm formAction={createPodcast} mode="create" />
    </div>
  );
}
