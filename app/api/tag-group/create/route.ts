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

    const tagGroupName = stringifyField(formData.get("tagGroupName"));
    const coverUrl = stringifyField(formData.get("coverUrl"));
    const coverFileName = stringifyField(formData.get("coverFileName"));
    const sortOrder = Number(stringifyField(formData.get("sortOrder")));
    const description = stringifyField(formData.get("description"));
    const allowedTypes = stringifyField(formData.get("allowedTypes"));

    // 检查是否缺少参数
    if (
      !tagGroupName ||
      !sortOrder ||
      !coverUrl ||
      !coverFileName ||
      !description ||
      !allowedTypes
    ) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const tagGroup = await prisma.tag_group.create({
      data: {
        name: tagGroupName,
        coverUrl: coverUrl,
        coverFileName: coverFileName,
        description: description,
        sortOrder: sortOrder,
        allowedTypes: JSON.parse(allowedTypes),
      },
    });
    if (!tagGroup) {
      return NextResponse.json({
        success: false,
        message: "创建标签组失败",
        status: 402,
      });
    }

    return NextResponse.json({
      success: true,
      message: "标签组创建成功",
      status: 201,
    });
  } catch (error) {
    console.error("标签组创建时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
