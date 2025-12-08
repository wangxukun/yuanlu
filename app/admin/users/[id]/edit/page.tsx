import Breadcrumbs from "@/components/admin/breadcrumbs";
import React from "react";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "用户管理", href: "/admin/users" },
          {
            label: "修改用户",
            href: `/admin/users/${id}/edit`,
            active: true,
          },
        ]}
      />
    </div>
  );
}
