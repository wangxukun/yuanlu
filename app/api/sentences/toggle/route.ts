import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { toggleSentenceSaveSchema } from "@/core/sentences/dto";
import { SENTENCE_QUOTA_EXCEEDED } from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

/**
 * POST /api/sentences/toggle
 * 切换句子收藏（与 server action toggleSentenceSave 同一 service 入口，
 * 供移动端 Bearer 调用与 fetch 兜底）。
 * [P3-a] 免费容量触墙：返回 403 + code，客户端走"暂存 + 浮卡"承接。
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const userid = authResult.session.user.userid;

  try {
    const body = await request.json();
    const parsed = toggleSentenceSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    const result = await sentencesService.toggleSave(userid, parsed.data);

    if (result.quotaExceeded) {
      // 服务端埋点：句子收藏触墙（QUOTA_BLOCKED/sentence_total，
      // 与 speech_evaluation / vocabulary_total 同款漏斗口径）
      await recordConversionEvent({
        eventType: "QUOTA_BLOCKED",
        source: "sentence_total",
        userid,
        metadata: {
          totalCount: result.totalCount,
          limit: result.limit,
        },
      });
      return NextResponse.json(
        {
          success: false,
          code: SENTENCE_QUOTA_EXCEEDED,
          message: `句子本免费容量已满（${result.totalCount}/${result.limit}），这句先帮你暂存了`,
          data: {
            totalCount: result.totalCount,
            limit: result.limit,
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.saved ? "已收藏该句子" : "已取消收藏",
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/sentences/toggle]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
