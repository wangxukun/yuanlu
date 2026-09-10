"use server";

import { requireAdminAction } from "@/core/auth/guard";
import { deleteUser as deleteUserCore } from "@/core/user/user.service";

export type UserDelState = {
  message?: string;
  status: number;
};

/**
 * Server Action: Delete a user (admin only).
 *
 * Directly calls core/user/user.service.ts — no internal HTTP fetch.
 * OSS file cleanup (avatar, speech audio, detail JSON) is handled by the service.
 */
export async function deleteUser(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _avatarFileName: string, // Kept for backward compatibility with existing UI binding
): Promise<UserDelState> {
  // 1. Only ADMIN can delete users
  const session = await requireAdminAction();

  // 2. Call Core Service directly
  const result = await deleteUserCore(id, session.user.userid);

  if (!result.success) {
    return {
      message: result.message,
      status: 400,
    };
  }

  return {
    message: "redirect:/admin/users/delete-success",
    status: 200,
  };
}
