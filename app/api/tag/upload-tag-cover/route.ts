/**
 * Uploads a file to OSS and returns the URL of the uploaded file.
 * 上传文件到OSS并返回上传文件的URL
 */
import { NextRequest, NextResponse } from "next/server";
import { getBucketAcl, uploadFile } from "@/lib/oss";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const coverFile = formData.get("cover") as File;

  if (!coverFile) {
    return NextResponse.json({ error: "请上传封面图片" }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const bytes = await coverFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `yuanlu/tags/tag-covers/${timestamp}_${Math.random().toString(36).substring(2)}.${coverFile.name.split(".").pop()}`;
    const { fileUrl: coverUrl } = await uploadFile(buffer, fileName);
    await getBucketAcl();

    return NextResponse.json({
      message: "图片上传成功",
      status: 200,
      coverUrl: coverUrl,
      coverFileName: fileName,
    });
  } catch (error) {
    console.error("OSS Upload Error:", error);
    return NextResponse.json({ message: "图片上传失败", status: 500 });
  }
}
