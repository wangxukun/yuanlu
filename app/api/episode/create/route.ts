import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: Request) {
  console.log("POST /api/podcast/create");

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
      uploaderId,
    } = await request.json();
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
      !tags ||
      !uploaderId
    ) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
        data: {
          title: title,
          description: description,
          audioFileName: audioFileName,
          audioUrl: audioUrl,
          audioDuration: audioDuration,
          coverFileName: coverFileName,
          coverUrl: coverUrl,
          subtitleEnFileName: subtitleEnFileName,
          subtitleZhFileName: subtitleZhFileName,
          subtitleEnUrl: subtitleEnUrl,
          subtitleZhUrl: subtitleZhUrl,
          publishStatus: publishStatus,
          isExclusive: isExclusive,
          publishDate: publishDate,
          tags: tags,
          podcastId: podcastId,
        },
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
        publishAt: new Date(publishDate),
        duration: parseInt(audioDuration, 10),
        status: publishStatus,
        uploaderid: uploaderId,
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
