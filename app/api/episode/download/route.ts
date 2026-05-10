import { NextRequest, NextResponse } from "next/server";
import { episodeService } from "@/core/episode/episode.service";

/**
 * 获取音频下载链接接口
 * 由于 OSS 签名 URL 不支持手动在客户端拼接参数（会破坏签名），
 * 因此需要通过后端重新生成带 content-disposition=attachment 的签名链接。
 */
export async function GET(req: NextRequest) {
  const episodeid = req.nextUrl.searchParams.get("episodeid");

  if (!episodeid) {
    return NextResponse.json(
      { success: false, error: "缺少 episodeid 参数" },
      { status: 400 },
    );
  }

  try {
    const downloadUrl = await episodeService.getDownloadUrl(episodeid);
    return NextResponse.json({ success: true, downloadUrl });
  } catch (error: unknown) {
    console.error("[GET /api/episode/download]", error);
    const errorMessage =
      error instanceof Error ? error.message : "获取下载链接失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
