import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { dismissWeakSentence } from "@/core/speech/weak-sentences.service";

/**
 * [P2-4] 弱项句子"标记已攻克"：将句子从弱项本移除（打标，非软删评测流水）。
 * - 免费且不限次数（会员管理动作，非配额墙，无弹窗承接要求）；
 * - 免费用户对试用可见的前 3 条同样可标记（totalErrors 随之下降，锁定卡口径一致）；
 * - 标记之后该句再次出现低于分数线的新评测时，自动重回弱项本；
 * - requireAuth：Web Cookie 与移动端 Bearer 双口径（与 errors 一致）。
 */
async function handle(req: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const userid = authResult.session.user.userid;

  try {
    const body = await req.json().catch(() => ({}));
    const targetText = String(body?.targetText ?? "").trim();

    if (!targetText || targetText.length > 1000) {
      return NextResponse.json(
        { error: "缺少有效的句子文本（targetText）" },
        { status: 400 },
      );
    }

    await dismissWeakSentence(userid, targetText);

    return NextResponse.json({
      success: true,
      message: "已标记为攻克，该句已从弱项本移除",
    });
  } catch (error) {
    console.error("[POST /api/speech/errors/dismiss]", error);
    return NextResponse.json(
      { error: "标记失败，请稍后重试" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

// DELETE 同义（"标记已攻克"即从弱项本删除该句），方便调用方按 REST 语义使用
export async function DELETE(req: Request) {
  return handle(req);
}
