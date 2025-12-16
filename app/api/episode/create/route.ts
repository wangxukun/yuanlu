import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateTagConnectOrCreate } from "@/lib/tools";

export async function POST(request: Request) {
  try {
    // 1. 权限校验
    const session = await auth();
    console.log("POST /api/podcast/create", session);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 从请求体中获取数据
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
      !publishStatus
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

    // 3. 准备标签关联数据
    const tagsConnect = generateTagConnectOrCreate(tags);

    // 4. 写入数据库
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
        tags: tagsConnect
          ? {
              connectOrCreate: tagsConnect,
            }
          : undefined,
      },
      include: {
        tags: true, // 添加此选项以返回关联的标签
      },
    });
    if (!episode) {
      return NextResponse.json({
        success: false,
        message: "创建剧集失败",
        status: 402,
      });
    }
    console.log("API剧集创建成功:", episode);
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
