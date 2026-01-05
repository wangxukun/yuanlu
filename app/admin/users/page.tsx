import React from "react";
import { fetchUsers } from "@/lib/data";
import { User } from "@/core/user/user.entity";
import UserManagementClient from "@/components/admin/users/UserManagementClient";

export default async function Page() {
  const usersData = (await fetchUsers()) as User[];

  // 修复：使用 new Date() 确保它是 Date 对象后再调用 toISOString()
  // 这是因为 fetch 返回的 JSON 中日期通常是字符串，而不是 JS Date 对象
  const serializedUsers = usersData.map((user) => ({
    ...user,
    createAt: new Date(user.createAt).toISOString(),
    updateAt: new Date(user.updateAt).toISOString(),
    lastActiveAt: user.lastActiveAt
      ? new Date(user.lastActiveAt).toISOString()
      : null,
    emailVerified: user.emailVerified
      ? new Date(user.emailVerified).toISOString()
      : null,
    // 确保可选字段存在，防止 undefined 报错
    isCommentAllowed: (user as User).isCommentAllowed ?? true,
  }));

  return (
    <div className="w-full">
      <UserManagementClient initialUsers={serializedUsers} />
    </div>
  );
}
