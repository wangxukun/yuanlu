import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  const onlineUsers = await prisma.user.findMany({
    where: { isOnline: true },
    select: { userid: true, email: true, lastActiveAt: true },
  });
  return NextResponse.json({
    count: onlineUsers.length,
    users: onlineUsers,
  });
}
