import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { savedSentenceQuerySchema } from "@/core/sentences/dto";
import {
  attachClipAudio,
  buildClipRowsWhere,
  type ClipAttachRow,
} from "@/core/corpus/clip-attach.core";

/**
 * GET /api/sentences/list
 * 用户收藏列表（支持 episodeid/tag/from/to/q 多维筛选与中英文检索），
 * 供 PWA / Android 客户端复用（Cookie 优先、Bearer 兜底）。
 *
 * [RESHAPE T1.3-4] 条目追加可选语料切片字段（clipId / clipAudioUrl /
 * clipOffset / clipDuration）：命中的句子若已有语料切片则携带直链；
 * 未命中/未缓存条目不追加字段——纯 additive，既有客户端零感知。
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const sp = req.nextUrl.searchParams;
    const parsed = savedSentenceQuerySchema.safeParse({
      episodeid: sp.get("episodeid") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "筛选参数无效" },
        { status: 400 },
      );
    }

    const list = await sentencesService.getSavedSentences(
      authResult.session.user.userid,
      parsed.data,
    );

    // 语料切片装饰（尽力而为：任何异常不拖垮既有列表响应）
    let decorated = list;
    try {
      const where = buildClipRowsWhere(
        list
          .filter((s) => s.subtitleId != null)
          .map((s) => ({
            episodeid: s.episodeid,
            subtitleId: s.subtitleId as number,
          })),
      );
      if (where) {
        const clipRows = await prisma.corpus_clips.findMany({
          where,
          select: {
            clipid: true,
            subtitleId: true,
            startTime: true,
            endTime: true,
            clipAudioKey: true,
          },
        });
        decorated = await attachClipAudio(
          list,
          clipRows as ClipAttachRow[],
          (key, expire) => generateSignatureUrl(key, expire),
          (item) => item.subtitleId,
        );
      }
    } catch (error) {
      console.warn("[GET /api/sentences/list] clip decorate skipped:", error);
    }

    return NextResponse.json({ success: true, data: decorated });
  } catch (error) {
    console.error("[GET /api/sentences/list]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
