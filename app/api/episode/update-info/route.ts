import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateTagConnectOrCreate } from "@/lib/tools"; // [新增] 引入工具函数

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      episodeid,
      title,
      description,
      status,
      publishAt,
      podcastId,
      isExclusive,
      difficulty,
      // 接收标签名数组 ["Business", "Tech"]
      tags,
    } = body;

    // 简单校验
    if (!episodeid || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // [新增] 准备标签关联数据
    const tagsConnect = generateTagConnectOrCreate(tags);

    const updatedEpisode = await prisma.episode.update({
      where: { episodeid },
      data: {
        title,
        description,
        status,
        difficulty,
        publishAt: publishAt ? new Date(publishAt) : undefined,
        podcastid: podcastId,
        isExclusive: isExclusive === "on" || isExclusive === true,

        // [核心修改] 更新标签
        tags: {
          // 1. 先断开所有现有的标签关联
          set: [],
          // 2. 再关联或创建新的标签
          // 注意：如果 tagsConnect 为 undefined (即没有传标签)，则只执行了 set: []，等于清空标签，符合预期
          connectOrCreate: tagsConnect || [],
        },
      },
      include: {
        tags: true, // 返回结果包含标签以便验证
      },
    });

    return NextResponse.json(updatedEpisode);
  } catch (error) {
    console.error("Update episode info failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
