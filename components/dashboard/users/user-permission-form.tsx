import React from "react";
import { fetchUserById } from "@/app/lib/data";

export default async function UserPermissionForm({
  userid,
}: {
  userid: string;
}) {
  const user = await fetchUserById(userid);

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-bold mb-4">当前用户权限信息</h1>
          <h2 className="text-lg font-bold text-slate-500">
            用户账号：
            {user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") || ""}
          </h2>
          <ul>
            <li>用户角色：{user.role}</li>
            <li>评论权限：{user.isCommentAllowed ? "有" : "无"}</li>
          </ul>
        </div>
      </div>
      <form className="space-y-3 max-w-7xl mx-auto mt-6">
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          在这里实现配置权限表单
        </div>
      </form>
    </>
  );
}
