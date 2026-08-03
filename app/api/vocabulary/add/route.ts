import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { isPremiumUser } from "@/core/auth/guard";

export async function POST(request: Request) {
  try {
    const session = await auth();

    // 1. 鉴权：使用你修正后的 userid
    if (!session?.user?.userid) {
      return NextResponse.json(
        { success: false, message: "未认证用户" },
        { status: 401 },
      );
    }

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

    // 3. 配额检查
    const hasPremium = await isPremiumUser(session.user);
    if (!hasPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.vocabulary.count({
        where: {
          userid: userId,
          addedDate: { gte: today },
        },
      });

      if (todayCount >= 20) {
        return NextResponse.json(
          {
            success: false,
            message:
              "普通用户每天最多保存 20 个生词。升级高级会员解锁无限制生词本！",
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
