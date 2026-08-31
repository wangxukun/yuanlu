import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isPremiumUser, requireAuth } from "@/core/auth/guard";
import {
  FREE_VOCABULARY_LIMIT,
  FREE_VOCABULARY_DAILY_LIMIT,
  VOCABULARY_QUOTA_EXCEEDED,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

export async function POST(request: Request) {
  try {
    // 1. 鉴权：移动端 Bearer 兼容（Cookie 优先、Bearer 兜底）
    const authResult = await requireAuth();
    if (!authResult.ok) {
      return authResult.response;
    }
    const session = authResult.session;

    const userId = session.user.userid;
    const body = await request.json();

    // 2. 解构前端传来的数据
    const {
      word,
      definition,
      contextSentence,
      translation,
      episodeid,
      timestamp,
      speakUrl,
      dictUrl,
      webUrl,
      mobileUrl,
    } = body;

    if (!word || !episodeid) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数 (word, episodeid)" },
        { status: 400 },
      );
    }

    // 3. 配额检查：免费用户有每日新增上限和生词本总量上限，会员不限
    const hasPremium = await isPremiumUser(session.user);
    if (!hasPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayCount, totalCount] = await Promise.all([
        prisma.vocabulary.count({
          where: {
            userid: userId,
            addedDate: { gte: today },
          },
        }),
        prisma.vocabulary.count({
          where: { userid: userId },
        }),
      ]);

      if (totalCount >= FREE_VOCABULARY_LIMIT) {
        await recordConversionEvent({
          eventType: "QUOTA_BLOCKED",
          source: "vocabulary_total",
          userid: userId,
          metadata: { totalCount },
        });
        return NextResponse.json(
          {
            success: false,
            code: VOCABULARY_QUOTA_EXCEEDED,
            message: `生词本已满：免费用户最多保存 ${FREE_VOCABULARY_LIMIT} 个生词。删除部分生词可腾出空间，或升级会员解锁无限生词本！`,
          },
          { status: 403 },
        );
      }

      if (todayCount >= FREE_VOCABULARY_DAILY_LIMIT) {
        await recordConversionEvent({
          eventType: "QUOTA_BLOCKED",
          source: "vocabulary_daily",
          userid: userId,
          metadata: { todayCount },
        });
        return NextResponse.json(
          {
            success: false,
            message: `普通用户每天最多保存 ${FREE_VOCABULARY_DAILY_LIMIT} 个生词。升级高级会员解锁无限制生词本！`,
          },
          { status: 403 },
        );
      }
    }

    // 4. 检查是否该单词已经被该用户收藏过（全局）
    const exactTimestamp = Math.floor(timestamp || 0);
    const existingVocab = await prisma.vocabulary.findFirst({
      where: {
        userid: userId,
        word: word,
      },
    });

    if (existingVocab) {
      return NextResponse.json(
        {
          success: false,
          message: "该单词已在生词本中",
          data: existingVocab,
        },
        { status: 400 },
      );
    }

    // 5. 写入数据库
    const newVocab = await prisma.vocabulary.create({
      data: {
        userid: userId,
        word: word,
        definition: definition || "", // 如果前端还没调用翻译API，可能为空
        contextSentence: contextSentence || "",
        translation: translation || "",
        episodeid: episodeid,
        timestamp: exactTimestamp,
        speakUrl: speakUrl || "",
        dictUrl: dictUrl || "",
        webUrl: webUrl || "",
        mobileUrl: mobileUrl || "",
        proficiency: 0, // 初始熟练度
        addedDate: new Date(),
        nextReviewAt: new Date(), // 立即加入复习队列
      },
    });

    return NextResponse.json({
      success: true,
      message: "生词保存成功",
      data: newVocab,
    });
  } catch (error) {
    console.error("Save vocabulary error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
