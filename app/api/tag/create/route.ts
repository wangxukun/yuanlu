import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { isTagType } from "@/app/types/tag";

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

    const tagName = stringifyField(formData.get("tagName"));
    const coverUrl = stringifyField(formData.get("coverUrl"));
    const coverFileName = stringifyField(formData.get("coverFileName"));
    const description = stringifyField(formData.get("description"));
    const groupId = stringifyField(formData.get("groupId"));
    const tagType = stringifyField(formData.get("tagType"));
    const isFeatured = stringifyField(formData.get("isFeatured")) === "true";
    const sortWeight = Number(stringifyField(formData.get("sortOrder")));

    const type = isTagType(tagType) ? tagType : "UNIVERSAL";

    // 检查是否缺少参数
    if (!tagName || !coverUrl || !coverFileName || !description || !tagType) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const createdTag = await prisma.tag.create({
      data: {
        name: tagName,
        description: description,
        coverUrl: coverUrl,
        coverFileName: coverFileName,
        type: type,
        isFeatured: isFeatured,
        groupLinks: {
          create: {
            group: {
              connect: {
                groupid: groupId,
              },
            },
            sortWeight: sortWeight || 0,
          },
        },
      },
    });

    if (!createdTag) {
      return NextResponse.json({
        success: false,
        message: "创建标签失败",
        status: 402,
      });
    }

    return NextResponse.json({
      success: true,
      message: "标签创建成功",
      status: 201,
    });
  } catch (error) {
    console.error("标签创建时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
