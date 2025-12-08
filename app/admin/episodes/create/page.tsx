import EpisodeForm from "@/components/admin/episodes/episode-form";
import React from "react";

export default function Page() {
  return (
    <main>
      <div className="rounded-lg bg-base-200 text-sm p-6 max-w-4xl mx-auto">
        <EpisodeForm />
      </div>
    </main>
  );
}
