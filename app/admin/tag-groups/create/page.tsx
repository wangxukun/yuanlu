import Breadcrumbs from "@/components/admin/breadcrumbs";
import React from "react";
import TagGroupForm from "@/components/admin/tag-groups/tag-group-form";

export default function page() {
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "标签分组", href: "/admin/tag-groups" },
          {
            label: "创建标签分组",
            href: "/admin/tag-groups/create",
            active: true,
          },
        ]}
      />
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <TagGroupForm />
      </div>
    </div>
  );
}
