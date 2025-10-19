import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getToken, JWT } from "next-auth/jwt";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const token = (await getToken({ req: request })) as JWT;
  if (token?.userid) {
    await prisma.user.update({
      where: { userid: token.userid },
      data: { lastActiveAt: new Date() },
    });
  }
  return NextResponse.json({ success: true });
}
