import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
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
    const formData = await request.formData();
    // 显式转换所有字段为字符串
    const stringifyField = (field: FormDataEntryValue | null) =>
      field instanceof File ? field.name : String(field || "");

    const podcastid = stringifyField(formData.get("podcastid"));
    const episodeTitle = stringifyField(formData.get("episodeTitle"));
    const coverUrl = stringifyField(formData.get("coverUrl"));
    const coverFileName = stringifyField(formData.get("coverFileName"));
    const audioUrl = stringifyField(formData.get("audioUrl"));
    const audioFileName = stringifyField(formData.get("audioFileName"));
    const duration = Number(stringifyField(formData.get("duration")));
    const publishDate = new Date(stringifyField(formData.get("publishDate")));
    const subtitleEnUrl = stringifyField(formData.get("subtitleEnUrl"));
    const subtitleEnFileName = stringifyField(
      formData.get("subtitleEnFileName"),
    );
    const subtitleZhUrl = stringifyField(formData.get("subtitleZhUrl"));
    const subtitleZhFileName = stringifyField(
      formData.get("subtitleZhFileName"),
    );
    const description = stringifyField(formData.get("description"));
    const publishStatus = stringifyField(formData.get("publishStatus"));
    const isExclusive = stringifyField(formData.get("isExclusive")) === "true";

    // 检查是否缺少参数
    if (
      !podcastid ||
      !episodeTitle ||
      !coverUrl ||
      !coverFileName ||
      !audioUrl ||
      !audioFileName ||
      duration! ||
      !publishDate ||
      !description ||
      !publishStatus
    ) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const episode = await prisma.episode.create({
      data: {
        title: episodeTitle,
        podcastid: podcastid,
        isExclusive: isExclusive,
        coverUrl: coverUrl,
        coverFileName: coverFileName,
        description: description,
        audioUrl: audioUrl,
        publishAt: publishDate,
        audioFileName: audioFileName,
        subtitleEnUrl: subtitleEnUrl,
        subtitleEnFileName: subtitleEnFileName,
        subtitleZhUrl: subtitleZhUrl,
        subtitleZhFileName: subtitleZhFileName,
        duration: duration,
        status: publishStatus,
        uploaderid: session?.user.userid,
      },
    });
    if (!episode) {
      return NextResponse.json({
        success: false,
        message: "创建单集失败",
        status: 402,
      });
    }

    return NextResponse.json({
      success: true,
      message: "播客创建成功",
      status: 201,
    });
  } catch (error) {
    console.error("播客创建时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
