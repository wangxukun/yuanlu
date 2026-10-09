import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/oss";

/**
 * POST /api/admin/channel/upload-cover
 * 频道品牌横幅上传（管理员），存入 OSS channel-covers/ 前缀（私有，签名分发）。
 * 返回结构与 UploadCover 组件约定一致：{ status, message, coverUrl, coverFileName }。
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { status: 401, message: "未授权，需要管理员权限" },
      { status: 401 },
    );
  }

  const file = (await req.formData()).get("cover") as File | null;
  if (!file) {
    return NextResponse.json(
      { status: 400, message: "请上传横幅图片" },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext =
      (file.name.split(".").pop() || "png")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
    const fileName = `channel-covers/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { fileUrl, fileName: saved } = await uploadFile(buffer, fileName);

    return NextResponse.json({
      status: 200,
      message: "横幅上传成功",
      coverUrl: fileUrl,
      coverFileName: saved,
    });
  } catch (error) {
    console.error("[POST /api/admin/channel/upload-cover]", error);
    return NextResponse.json(
      { status: 500, message: "横幅上传失败" },
      { status: 500 },
    );
  }
}
