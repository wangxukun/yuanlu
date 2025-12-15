import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSignatureUrl } from "@/lib/oss";

type comments = {
  commentid: number;
  userid: string;
  episodeid: string;
  commentText: string;
  commentAt: Date;
  User: {
    userid: string;
    email: string;
    user_profile: {
      nickname: string | null;
      avatarFileName: string | null;
      avatarUrl: string | null;
    } | null;
  };
};
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeid = searchParams.get("episodeid");

  if (!episodeid) {
    return NextResponse.json({ error: "Missing episodeid" }, { status: 400 });
  }

  try {
    const comments = (await prisma.comments.findMany({
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
                avatarFileName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })) as comments[];

    await Promise.all(
      comments.map(async (comment) => {
        if (comment.User.user_profile?.avatarFileName) {
          comment.User.user_profile.avatarUrl = await generateSignatureUrl(
            comment.User.user_profile.avatarFileName || "",
            3600 * 3,
          );
        }
      }),
    );

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
