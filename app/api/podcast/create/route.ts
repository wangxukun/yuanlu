import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

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
      tags,
    } = await request.json();
    console.log(
      podcastName,
      platform,
      description,
      coverUrl,
      coverFileName,
      tags,
    );
    // 检查是否缺少参数
    if (!podcastName || !platform || !description || !coverUrl || !tags) {
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
      }, // 仅查询必要的字段
    });
    if (podcastNameExists) {
      return NextResponse.json(
        { success: false, message: "播客类别已存在" },
        { status: 401 },
      );
    }

    const podcast = await prisma.podcast.create({
      data: {
        title: podcastName,
        platform: platform,
        description,
        coverFileName,
        coverUrl,
        tags: {
          create: tags.map((tagId: string) => ({
            tag: {
              connect: {
                tagid: tagId,
              },
            },
          })),
        },
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
