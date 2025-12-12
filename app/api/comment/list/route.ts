import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeid = searchParams.get("episodeid");

  if (!episodeid) {
    return NextResponse.json({ error: "Missing episodeid" }, { status: 400 });
  }

  try {
    const comments = await prisma.comments.findMany({
      where: {
        episodeid: episodeid,
      },
      orderBy: {
        commentAt: Prisma.SortOrder.desc,
      },
      include: {
        User: {
          select: {
            userid: true,
            email: true,
            user_profile: {
              select: {
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
