import PodcastForm from "@/components/dashboard/podcasts/podcast-form";
import React from "react";
import Breadcrumbs from "@/components/dashboard/breadcrumbs";
export default function Page() {
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "合集管理", href: "/dashboard/podcasts" },
          {
            label: "创建合集",
            href: "/dashboard/podcasts/create",
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-base-200 text-sm p-6 max-w-4xl mx-auto">
        <PodcastForm />
      </div>
    </main>
  );
}
