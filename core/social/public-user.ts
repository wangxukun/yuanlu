import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";

/**
 * [weapp-backend] 公开用户信息装饰（昵称/头像）：日榜与接力房共用同一口径——
 * 昵称 user_profile.nickname 缺省回退 email 前缀 / 手机尾号 / `用户_{userid尾4}`；
 * 头像 avatarFileName 现签 3h，回落 avatarUrl，再回落默认头像。
 */

export interface PublicUser {
  nickname: string;
  avatar: string;
}

const DEFAULT_AVATAR = "/static/images/default-avatar.png";

export async function decoratePublicUsers(
  userids: string[],
): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  const ids = [...new Set(userids.filter(Boolean))];
  if (!ids.length) return map;

  const users = await prisma.user.findMany({
    where: { userid: { in: ids } },
    select: {
      userid: true,
      email: true,
      phone: true,
      user_profile: {
        select: { nickname: true, avatarFileName: true, avatarUrl: true },
      },
    },
  });

  await Promise.all(
    users.map(async (u) => {
      const profile = u.user_profile;
      let avatar = DEFAULT_AVATAR;
      if (profile?.avatarFileName) {
        avatar = await generateSignatureUrl(profile.avatarFileName, 3600 * 3)
          .then((url: string) => url || avatar)
          .catch(() => avatar);
      } else if (
        profile?.avatarUrl &&
        profile.avatarUrl !== "default_avatar_url"
      ) {
        avatar = profile.avatarUrl;
      }

      let nickname = profile?.nickname;
      if (!nickname) {
        if (u.email) {
          nickname = u.email.split("@")[0];
        } else if (u.phone && u.phone.length >= 4) {
          nickname = `用户_${u.phone.slice(-4)}`;
        } else {
          nickname = `用户_${u.userid.slice(-4)}`;
        }
      }

      map.set(u.userid, { nickname, avatar });
    }),
  );

  return map;
}
