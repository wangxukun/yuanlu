import Breadcrumbs from "@/components/admin/breadcrumbs";
import React from "react";
import TagForm from "@/components/admin/tags/tag-form";
import { fetchTagGroups } from "@/lib/data";

export default async function page() {
  const tagGroups = await fetchTagGroups();
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "标签管理", href: "/admin/tags" },
          {
            label: "创建标签",
            href: "/admin/tags/create",
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
