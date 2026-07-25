"use server";

import { requireAdminAction } from "@/core/auth/guard";
import { deleteObject } from "@/lib/oss";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export type UserDelState = {
  message?: string;
  status: number;
};

// 删除用户
export async function deleteUser(
  id: string,
  avatarFileName: string,
): Promise<UserDelState> {
  // [安全修复] 只有 ADMIN 才能删除用户
  await requireAdminAction();

  let delAvatarResult = null;
  if (avatarFileName) {
    // 删除OSS中用户头像
    delAvatarResult = await deleteObject(avatarFileName);
  }
  const res = await fetch(`${baseUrl}/api/user/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid: id }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      message: "",
      status: 500,
    };
  }
  if (avatarFileName && !delAvatarResult) {
    return {
      message: "",
      status: 500,
    };
  }
  return {
    message: data.message,
    status: data.status,
  };
}
