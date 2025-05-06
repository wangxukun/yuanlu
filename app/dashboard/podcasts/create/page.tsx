import PodcastForm from "@/components/dashboard/podcasts/podcast-form";
import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import React from "react";
export default function Page() {
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "播客管理", href: "/dashboard/podcasts" },
          {
            label: "创建播客",
            href: "/dashboard/podcasts/batch-create",
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <PodcastForm />
      </div>
    </div>
  );
}
