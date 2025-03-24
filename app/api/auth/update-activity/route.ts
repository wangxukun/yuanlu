import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (token?.id) {
    await prisma.user.update({
      where: { userid: token.id },
      data: { lastActiveAt: new Date() },
    });
  }
  return NextResponse.json({ success: true });
}
