import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
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
    const formData = await request.formData();
    // 显式转换所有字段为字符串
    const stringifyField = (field: FormDataEntryValue | null) =>
      field instanceof File ? field.name : String(field || "");

    const podcastid = stringifyField(formData.get("podcastid"));
    const userid = stringifyField(formData.get("userid"));

    // 检查是否缺少参数
    if (!podcastid || !userid) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const favorite = await prisma.podcast_favorites.create({
      data: {
        podcastid: podcastid,
        userid: userid,
      },
    });
    if (!favorite) {
      return NextResponse.json({
        success: false,
        message: "收藏播客失败",
        status: 500,
      });
    }

    return NextResponse.json({
      success: true,
      message: "收藏播客成功",
      status: 200,
    });
  } catch (error) {
    console.error("播客收藏时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
