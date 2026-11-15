import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import prisma from "@/lib/prisma";

/**
 * [weapp-backend] GET /api/vocabulary/context-clip — 生词语境句 → corpus 切片
 * 懒解析（闪卡「听原声语境」合规切片级出口，替代退役的整集字幕接口）。
 *
 * Query: episodeid（必填）+ text（语境句）+ word（生词）+ timestamp?（词在
 * 剧集中的秒位兜底）。匹配三级：enText 精确 → 归一化（去标点/大小写）→
 * timestamp 落窗且句含生词。命中返回切片窗口与词级时间戳（相对切片音频），
 * 前端经 /api/clips/{clipid}/audio 网关取物理切片播放（单一切片出口铁律）。
 */
function normalize(s: string | null | undefined): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const sp = req.nextUrl.searchParams;
  const episodeid = (sp.get("episodeid") || "").trim();
  const text = sp.get("text") || "";
  const word = (sp.get("word") || "").trim();
  const timestampRaw = Number(sp.get("timestamp"));
  const timestamp =
    Number.isFinite(timestampRaw) && timestampRaw >= 0 ? timestampRaw : null;

  if (!episodeid) {
    return NextResponse.json(
      { success: false, error: "Missing episodeid" },
      { status: 400 },
    );
  }

  try {
    const clips = await prisma.corpus_clips.findMany({
      where: { episodeid },
      select: {
        clipid: true,
        startTime: true,
        endTime: true,
        duration: true,
        enText: true,
        wordsJson: true,
      },
      take: 1000,
      orderBy: { subtitleId: "asc" },
    });

    const trimmed = text.trim();
    const normText = normalize(trimmed);
    // 双向包含（A工程 resolveAudio 同款：收藏语境句常是字幕行的子串，≥10 字符防误吞）
    const isSubstring = (candidate: string) => {
      const a = normText;
      const b = normalize(candidate);
      return (
        a.length >= 10 && b.length >= 10 && (a.includes(b) || b.includes(a))
      );
    };
    const target =
      clips.find((c) => c.enText.trim() === trimmed) ||
      (normText
        ? clips.find((c) => normalize(c.enText) === normText) ||
          clips.find((c) => isSubstring(c.enText))
        : null) ||
      (timestamp != null && word
        ? clips.find(
            (c) =>
              c.startTime <= timestamp &&
              timestamp < c.endTime &&
              c.enText.toLowerCase().includes(word.toLowerCase()),
          )
        : null);

    if (!target) {
      return NextResponse.json(
        { success: false, code: "NO_CLIP", message: "未找到该词的原声语境" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        clipid: target.clipid,
        // 字幕绝对秒（前端 sentenceWindow 配 /api/clips/{id}/audio 的 clipOffset 用）
        start: target.startTime,
        end: target.endTime,
        duration: target.duration,
        words: Array.isArray(target.wordsJson) ? target.wordsJson : [],
      },
    });
  } catch (error) {
    console.error("[GET /api/vocabulary/context-clip]", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve context clip" },
      { status: 500 },
    );
  }
}
