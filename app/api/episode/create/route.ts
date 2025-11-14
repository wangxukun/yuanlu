import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  console.log("POST /api/podcast/create");
  const session = await auth();
  // 用户认证检查
  if (!session?.user?.userid) {
    return NextResponse.json({
      success: false,
      message: "未认证用户",
      status: 401,
    });
  }

  try {
    // 从请求体中获取数据
    const {
      title,
      description,
      audioFileName,
      audioUrl,
      audioDuration,
      coverFileName,
      coverUrl,
      subtitleEnFileName,
      subtitleZhFileName,
      subtitleEnUrl,
      subtitleZhUrl,
      publishStatus,
      isExclusive,
      publishDate,
      tags,
      podcastId,
    } = await request.json();
    console.log(
      "Create episode API receive data: ",
      title,
      description,
      audioFileName,
      audioUrl,
      audioDuration,
      coverFileName,
      coverUrl,
      subtitleEnFileName,
      subtitleZhFileName,
      subtitleEnUrl,
      subtitleZhUrl,
      publishStatus,
      isExclusive,
      publishDate,
      tags,
      podcastId,
    );
    // 检查是否缺少参数
    if (
      !podcastId ||
      !title ||
      !coverUrl ||
      !coverFileName ||
      !audioUrl ||
      !audioFileName ||
      !audioDuration ||
      !publishDate ||
      !description ||
      !publishStatus ||
      !tags
    ) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const episode = await prisma.episode.create({
      data: {
        title: title,
        description: description,
        audioFileName: audioFileName,
        audioUrl: audioUrl,
        coverFileName: coverFileName,
        coverUrl: coverUrl,
        subtitleEnFileName: subtitleEnFileName,
        subtitleZhFileName: subtitleZhFileName,
        subtitleEnUrl: subtitleEnUrl,
        subtitleZhUrl: subtitleZhUrl,
        podcastid: podcastId,
        isExclusive: isExclusive,
        publishAt: publishDate,
        duration: audioDuration,
        status: publishStatus,
        uploaderid: session?.user.userid,
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
    if (!episode) {
      return NextResponse.json({
        success: false,
        message: "创建剧集失败",
        status: 402,
      });
    }

    return NextResponse.json({
      success: true,
      message: "剧集创建成功",
      status: 201,
    });
  } catch (error) {
    console.error("剧集创建时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
