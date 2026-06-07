import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatChineseDate } from "@/lib/tools";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userid: session.user.userid },
      select: {
        role: true,
        subscriptions: {
          where: { subscriptionType: "PREMIUM", endDate: { gte: new Date() } },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { endDate: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    const expiryDate = activeSubscription?.endDate
      ? formatChineseDate(activeSubscription.endDate)
      : null;

    return NextResponse.json({
      role: user.role,
      expiryDate: expiryDate,
    });
  } catch (error) {
    console.error("[Subscription Status API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
