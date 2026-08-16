import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSignatureUrl } from "@/lib/oss";
import { canAccessEpisode } from "@/core/auth/guard";

/**
 * GET /api/episode/audio-proxy?id=xxx
 *
 * 同源音频代理:把 OSS 跨域音频流式转发到当前站点,供 Web Audio API 的
 * fetch(arrayBuffer) + decodeAudioData 使用(跨域 OSS 会触发 CORS,fetch 被拦截)。
 * 支持 Range 请求,便于大文件分段下载。
 *
 * 鉴权:需登录;若为独家剧集需高级会员/管理员。
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const episode = await prisma.episode.findUnique({
      where: { episodeid: id },
      select: {
        episodeid: true,
        audioFileName: true,
        audioUrl: true,
        isExclusive: true,
      },
    });

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // 会员专享剧集权限校验（统一入口 canAccessEpisode：role 或有效订阅任一命中）
    if (!(await canAccessEpisode(session.user, episode))) {
      return NextResponse.json(
        { error: "Premium membership required" },
        { status: 403 },
      );
    }

    // 生成签名 URL
    const signedUrl = episode.audioFileName
      ? await generateSignatureUrl(episode.audioFileName, 3600).catch(
          () => episode.audioUrl || "",
        )
      : episode.audioUrl || "";

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Audio source unavailable" },
        { status: 404 },
      );
    }

    // 转发客户端的 Range 头(用于分段下载)
    const upstreamHeaders: Record<string, string> = {};
    const range = req.headers.get("range");
    if (range) upstreamHeaders["Range"] = range;

    const upstreamRes = await fetch(signedUrl, { headers: upstreamHeaders });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream audio error: ${upstreamRes.status}` },
        { status: 502 },
      );
    }

    // 透传上游的状态码(200 或 206 Partial Content)、Content-Type、Content-Length、
    // Content-Range、Accept-Ranges,保持分段下载语义。
    const respHeaders: Record<string, string> = {
      "Cache-Control": "private, max-age=3600",
    };
    const passThrough = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
    ];
    for (const h of passThrough) {
      const v = upstreamRes.headers.get(h);
      if (v) respHeaders[h] = v;
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: respHeaders,
    });
  } catch (error) {
    console.error("[GET /api/episode/audio-proxy]", error);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
