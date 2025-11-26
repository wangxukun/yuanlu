import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import React from "react";
import TagForm from "@/components/dashboard/tags/tag-form";
import { fetchTagGroups } from "@/lib/data";

export default async function page() {
  const tagGroups = await fetchTagGroups();
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "标签管理", href: "/dashboard/tags" },
          {
            label: "创建标签",
            href: "/dashboard/tags/create",
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <TagForm tagGroups={tagGroups} />
      </div>
    </div>
  );
}
