/**
 * Uploads a file to OSS and returns the URL of the uploaded file.
 * 上传文件到OSS并返回上传文件的URL
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/oss";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const coverFile = formData.get("audio") as File;

  if (!coverFile) {
    return NextResponse.json({ error: "请上传音频" }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const bytes = await coverFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `yuanlu/podcastes/episodes/audios/${timestamp}_${Math.random().toString(36).substring(2)}.${coverFile.name.split(".").pop()}`;
    const { fileUrl: audioUrl } = await uploadFile(buffer, fileName);

    return NextResponse.json({
      message: "音频上传成功",
      status: 200,
      audioUrl: audioUrl,
      audioFileName: fileName,
    });
  } catch (error) {
    console.error("OSS Upload Error:", error);
    return NextResponse.json({ message: "音频上传失败", status: 500 });
  }
}
