import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateTagConnectOrCreate } from "@/lib/tools"; // [新增] 引入工具函数

export async function POST(request: Request) {
  console.log("POST /api/podcast/create");
  try {
    // 从请求体中获取数据
    const {
      podcastName,
      platform,
      description,
      coverUrl,
      coverFileName,
      tags, // 这里现在接收的是标签名字符串数组 ["Business", "English"]
      isEditorPick,
    } = await request.json();

    // 检查是否缺少参数
    if (!podcastName || !platform || !description || !coverUrl) {
      return NextResponse.json(
        { success: false, message: "缺少参数" },
        { status: 400 },
      );
    }

    const podcastNameExists = await prisma.podcast.findFirst({
      where: {
        title: podcastName,
      },
      select: {
        podcastid: true,
      },
    });

    if (podcastNameExists) {
      return NextResponse.json(
        { success: false, message: "播客名称已存在" },
        { status: 401 },
      );
    }

    // [新增] 准备标签关联数据
    const tagsConnect = generateTagConnectOrCreate(tags);

    const podcast = await prisma.podcast.create({
      data: {
        title: podcastName,
        platform: platform,
        description,
        coverFileName,
        coverUrl,
        isEditorPick,
        // [修改] 使用 connectOrCreate 逻辑
        tags: tagsConnect
          ? {
              connectOrCreate: tagsConnect,
            }
          : undefined,
      },
    });

    if (!podcast) {
      return NextResponse.json(
        { success: false, message: "创建播客失败" },
        { status: 402 },
      );
    }

    return NextResponse.json(
      { success: true, message: "播客创建成功" },
      { status: 201 },
    );
  } catch (error) {
    console.error("播客创建时出错:", error);

    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
