import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    return NextResponse.json({
      exists: true,
      message: "用户已经存在",
    });
  }

  return NextResponse.json({
    exists: false,
    message: "电子邮箱地址有效",
  });
}
