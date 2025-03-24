import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    // 从请求体中获取数据
    const { podcastName, from, description, coverUrl, coverFileName } =
      await request.json();
    console.log(podcastName, from, description, coverUrl, coverFileName);
    // 检查是否缺少参数
    if (!podcastName || !from || !description || !coverUrl) {
      return NextResponse.json(
        { success: false, message: "缺少参数" },
        { status: 400 },
      );
    }

    const podcastNameExists = await prisma.category.findFirst({
      where: {
        title: podcastName,
      },
      select: {
        categoryid: true,
      }, // 仅查询必要的字段
    });
    if (podcastNameExists) {
      return NextResponse.json(
        { success: false, message: "播客类别已存在" },
        { status: 401 },
      );
    }

    const podcast = await prisma.category.create({
      data: {
        title: podcastName,
        from,
        description,
        coverFileName,
        coverUrl,
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
