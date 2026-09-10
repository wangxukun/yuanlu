/**
 * User Service — Core business logic for user operations.
 *
 * This is the ONLY entry point for user deletion.
 * Both the API route and Server Action must call this service.
 */
import prisma from "@/lib/prisma";
import { deleteObject } from "@/lib/oss";

/** Result of a user deletion operation */
export interface DeleteUserResult {
  success: boolean;
  message: string;
  /** Number of OSS files that failed to delete (non-blocking) */
  ossFailures: number;
}

/**
 * Delete a user and all associated data.
 *
 * Steps:
 * 1. Verify user exists and retrieve all associated OSS file references
 * 2. Delete OSS files (avatar, speech audio, speech detail JSON)
 * 3. Delete user record (triggers PostgreSQL CASCADE for all related tables)
 *
 * @param userid - The user ID to delete
 * @param operatorId - The admin user performing the deletion (for self-delete prevention)
 */
export async function deleteUser(
  userid: string,
  operatorId: string,
): Promise<DeleteUserResult> {
  // 1. Prevent self-deletion
  if (userid === operatorId) {
    return {
      success: false,
      message: "不能删除自己的账号",
      ossFailures: 0,
    };
  }

  // 2. Verify user exists and gather all OSS file references in one query
  const user = await prisma.user.findUnique({
    where: { userid },
    select: {
      userid: true,
      user_profile: {
        select: { avatarFileName: true },
      },
      speech_recognition: {
        select: {
          userAudioUrl: true,
          detailUrl: true,
        },
        where: {
          OR: [{ userAudioUrl: { not: null } }, { detailUrl: { not: null } }],
        },
      },
    },
  });

  if (!user) {
    return {
      success: false,
      message: "用户不存在",
      ossFailures: 0,
    };
  }

  // 3. Collect all OSS file keys that need deletion
  const ossKeysToDelete: string[] = [];

  // 3a. Avatar file
  if (user.user_profile?.avatarFileName) {
    ossKeysToDelete.push(user.user_profile.avatarFileName);
  }

  // 3b. Speech recognition audio and detail JSON files
  for (const record of user.speech_recognition) {
    if (record.userAudioUrl) {
      // Extract OSS key from full URL if necessary
      const audioKey = extractOssKey(record.userAudioUrl);
      if (audioKey) ossKeysToDelete.push(audioKey);
    }
    if (record.detailUrl) {
      const detailKey = extractOssKey(record.detailUrl);
      if (detailKey) ossKeysToDelete.push(detailKey);
    }
  }

  // 4. Delete OSS files (best-effort, don't block user deletion)
  let ossFailures = 0;
  const deletePromises = ossKeysToDelete.map(async (key) => {
    try {
      await deleteObject(key);
    } catch (error) {
      console.error(`[UserService] Failed to delete OSS file: ${key}`, error);
      ossFailures++;
    }
  });
  await Promise.allSettled(deletePromises);

  // 5. Delete user record — PostgreSQL CASCADE handles all related tables
  try {
    await prisma.user.delete({
      where: { userid },
    });
  } catch (error) {
    console.error("[UserService] Failed to delete user from database:", error);
    return {
      success: false,
      message: "数据库删除失败",
      ossFailures,
    };
  }

  return {
    success: true,
    message: `用户已删除，清理了 ${ossKeysToDelete.length - ossFailures}/${ossKeysToDelete.length} 个 OSS 文件`,
    ossFailures,
  };
}

/**
 * Extract the OSS object key from a full URL or return the key directly.
 *
 * OSS URLs typically look like:
 *   https://bucket.oss-cn-hangzhou.aliyuncs.com/yuanlu/speech/userId/...
 *
 * We need just the path portion: "yuanlu/speech/userId/..."
 */
function extractOssKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;

  // If it's already a relative key (no protocol), return as-is
  if (!urlOrKey.startsWith("http")) return urlOrKey;

  try {
    const url = new URL(urlOrKey);
    // Remove leading slash from pathname
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    // If URL parsing fails, return original value as potential key
    return urlOrKey;
  }
}
