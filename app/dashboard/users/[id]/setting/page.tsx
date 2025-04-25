import Breadcrumbs from "@/components/dashboard/breadcrumbs";
import React from "react";
import UserPermissionForm from "@/components/dashboard/users/user-permission-form";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  return (
    <div className="inline-block w-full align-middle">
      <Breadcrumbs
        breadcrumbs={[
          { label: "用户管理", href: "/dashboard/users" },
          {
            label: "用户权限设置",
            href: `/dashboard/users/${id}/setting`,
            active: true,
          },
        ]}
      />
      <UserPermissionForm userid={id} />
    </div>
  );
}
