import { auth } from "@/auth";
import { formatChineseDate } from "@/lib/tools";
import prisma from "@/lib/prisma";
import { SubscribeClient } from "./subscribe-client";

export const metadata = {
  title: "我的订阅 - 远路播客",
};

export default async function SubscribePage() {
  const session = await auth();

  let user = null;

  if (session?.user) {
    const activeSubscription = await prisma.subscriptions.findFirst({
      where: {
        userid: session.user.userid,
        subscriptionType: "PREMIUM",
        endDate: {
          gte: new Date(),
        },
      },
      orderBy: { endDate: "desc" },
    });

    // [P0-1] 与 isPremiumUser 同口径：ADMIN 直通，其余只认有效订阅。
    // 不再看 role === "PREMIUM"（展示缓存可能滞后于订阅事实）。
    const isPremium = session.user.role === "ADMIN" || !!activeSubscription;
    const expiryDate = activeSubscription?.endDate
      ? formatChineseDate(activeSubscription.endDate)
      : null;

    user = {
      userid: session.user.userid,
      phone: session.user.phone || null,
      email: session.user.email,
      role: session.user.role || "USER",
      isPremium,
      expiryDate,
    };
  }

  return <SubscribeClient user={user} />;
}
