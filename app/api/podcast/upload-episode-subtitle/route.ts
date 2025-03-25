/**
 * Uploads a file to OSS and returns the URL of the uploaded file.
 * 上传文件到OSS并返回上传文件的URL
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/app/lib/oss";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const subtitleFile = formData.get("subtitle") as File;

  if (!subtitleFile) {
    return NextResponse.json({ error: "请上传字幕" }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const bytes = await subtitleFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `yuanlu/podcastes/episodes/subtitles/${timestamp}_${Math.random().toString(36).substring(2)}.${subtitleFile.name.split(".").pop()}`;
    const { fileUrl: subtitleUrl } = await uploadFile(buffer, fileName);

    return NextResponse.json({
      message: "字幕上传成功",
      status: 200,
      subtitleUrl: subtitleUrl,
      subtitleFileName: fileName,
    });
  } catch (error) {
    console.error("OSS Upload Error:", error);
    return NextResponse.json({ message: "字幕上传失败", status: 500 });
  }
}
