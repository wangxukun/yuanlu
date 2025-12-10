import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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
    } = body;

    if (!word || !episodeid) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数 (word, episodeid)" },
        { status: 400 },
      );
    }

    // 3. 写入数据库
    // 策略：允许同一个词在不同语境下多次保存。
    // 如果你希望由“一个词只有一条记录”，可以使用 upsert，但精听通常建议保留不同例句。
    const newVocab = await prisma.vocabulary.create({
      data: {
        userid: userId,
        word: word,
        definition: definition || "", // 如果前端还没调用翻译API，可能为空
        contextSentence: contextSentence || "",
        translation: translation || "",
        episodeid: episodeid,
        timestamp: Math.floor(timestamp || 0),
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
