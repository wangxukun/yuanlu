import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client"; // 引入 auth 以获取当前用户状态

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeid = searchParams.get("episodeid");

  if (!episodeid) {
    return NextResponse.json({ error: "Missing episodeid" }, { status: 400 });
  }

  try {
    // 1. 获取当前用户 Session，用于判断 isLiked
    const session = await auth();
    const currentUserId = session?.user?.userid;

    // 2. 查询评论数据
    const rawComments = await prisma.comments.findMany({
      where: {
        episodeid: episodeid,
      },
      orderBy: {
        commentAt: Prisma.SortOrder.desc,
      },
      include: {
        // 包含用户信息
        User: {
          select: {
            userid: true,
            email: true,
            user_profile: {
              select: {
                nickname: true,
                avatarFileName: true,
                avatarUrl: true,
                learnLevel: true, // [新增] 前端需要展示用户等级
              },
            },
          },
        },
        // [新增] 统计点赞数
        _count: {
          select: { likes: true },
        },
        // [新增] 查询当前用户是否点赞（如果未登录则不查询）
        likes: currentUserId
          ? {
              where: { userid: currentUserId },
              select: { likeid: true },
            }
          : false,
      },
    });

    // 3. 数据转换与签名处理
    const comments = await Promise.all(
      rawComments.map(async (comment) => {
        // 处理头像签名 URL
        if (comment.User?.user_profile?.avatarFileName) {
          comment.User.user_profile.avatarUrl = await generateSignatureUrl(
            comment.User.user_profile.avatarFileName,
            3600 * 3,
          );
        }

        // 返回前端所需的扁平化结构
        return {
          ...comment,
          // 确保 parentId 显式传递（虽然 findMany 默认会返回，但这样更清晰）
          parentId: comment.parentId,
          // 将 Prisma 的聚合数据扁平化
          likesCount: comment._count.likes,
          isLiked: currentUserId ? comment.likes.length > 0 : false,
          // 移除不需要传输给前端的原始关联字段
          likes: undefined,
          _count: undefined,
        };
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
