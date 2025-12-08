import PodcastForm from "@/components/admin/podcasts/podcast-form";
import React from "react";
import Breadcrumbs from "@/components/admin/breadcrumbs";
export default function Page() {
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "合集管理", href: "/admin/podcasts" },
          {
            label: "创建合集",
            href: "/admin/podcasts/create",
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
