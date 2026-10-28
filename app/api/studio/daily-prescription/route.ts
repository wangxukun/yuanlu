import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { signOssHttpUrl } from "@/lib/oss";
import { createDailyPrescriptionService } from "@/core/studio/daily-prescription.service";

/**
 * [RESHAPE T1.4] GET /api/studio/daily-prescription — 今日五分钟双螺旋处方。
 *
 * 200 { success, data: { cards[] } }（vocab_revival ×≤2 / weak_phoneme ×≤2 / micro_scene ×≤1）
 * 422 { success:false, code:"NOT_READY" } 语料尚未就绪（0 卡）
 */
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  try {
    const service = createDailyPrescriptionService({
      prisma: {
        vocabulary: {
          findMany: (args) => prisma.vocabulary.findMany(args as never),
        },
        corpus_clips: {
          findMany: (args) => prisma.corpus_clips.findMany(args as never),
        },
        micro_scenes: {
          findMany: (args) => prisma.micro_scenes.findMany(args as never),
        },
        user_profile: {
          findUnique: (args) => prisma.user_profile.findUnique(args as never),
        },
      },
    });

    const result = await service.build(guard.session.user.userid);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, code: result.code, message: result.message },
        { status: 422 },
      );
    }
    // 私有桶直链 403：卡片封面统一现签（TTL 3h，与 detail 路由口径一致）
    const cards = await Promise.all(
      result.cards.map(async (card) => ({
        ...card,
        coverUrl: await signOssHttpUrl(card.coverUrl),
      })),
    );
    return NextResponse.json({ success: true, data: { cards } });
  } catch (error) {
    console.error("[GET /api/studio/daily-prescription]", error);
    return NextResponse.json(
      { success: false, error: "Failed to build daily prescription" },
      { status: 500 },
    );
  }
}
