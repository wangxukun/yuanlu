"use client";
import React, { useState } from "react";
import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { User } from "@/core/user/user.entity";

export default function UserPermissionForm({ user }: { user: User }) {
  const [isCommentAllowed, setIsCommentAllowed] = useState(
    user.isCommentAllowed,
  );
  const roles = ["USER", "ADMIN", "PREMIUM"];
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      userid: user.userid,
      role: formData.get("role"),
      isCommentAllowed: isCommentAllowed,
    };
    try {
      const res = await fetch(`/api/user/setting`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        console.log("User updated successfully:", result);
        alert("用户更新成功！");
      } else {
        const error = await res.json();
        console.error("User update failed:", error);
        alert(`用户更新失败: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("更新用户时发生错误，请重试。");
    }
  };
  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 max-w-7xl mx-auto mt-6"
      >
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          <h2 className="text-lg font-bold text-slate-500">设置用户</h2>
          <div className="pl-4">
            <p className="text-sm text-slate-400 py-4">
              确定用户
              <span className="text-red-400">{user.email}</span>
              的角色，并设置用户是否允许评论。
            </p>

            <div className="flex flex-row items-center justify-start py-6 space-x-9">
              <label className="block text-sm font-medium text-gray-700">
                用户角色
              </label>
              <div className="min-w-64 bg-amber-100">
                <select
                  id="role"
                  name="role"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                  defaultValue={user.role}
                  aria-describedby="customer-error"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="flex flex-row items-center justify-start space-x-9">
              <label className="block text-sm font-medium text-gray-700">
                评论权限
              </label>
              <div className="rounded-md border border-gray-200 bg-white px-4 py-1">
                <div className="flex gap-9 min-w-48">
                  <div className="flex items-center">
                    <input
                      id="no"
                      name="status"
                      type="radio"
                      value="no"
                      checked={isCommentAllowed === false}
                      onChange={() => setIsCommentAllowed(false)}
                      className="text-white-600 h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 focus:ring-2"
                    />
                    <label
                      htmlFor="no"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                    >
                      禁止 <ClockIcon className="h-4 w-4" />
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="yes"
                      name="status"
                      type="radio"
                      checked={isCommentAllowed === true}
                      onChange={() => setIsCommentAllowed(true)}
                      value="yes"
                      className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                    />
                    <label
                      htmlFor="yes"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      允许 <CheckIcon className="h-4 w-4" />
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>
            <Button type="submit" className="mt-6 w-24 justify-center">
              保存
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
