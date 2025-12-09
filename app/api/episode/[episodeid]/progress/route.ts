import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ episodeid: string }> },
) {
  // 1. Next.js 15: 等待 params
  const params = await props.params;
  const episodeId = params.episodeid;

  try {
    const session = await auth();

    // 2. 鉴权
    if (!session?.user?.userid) {
      return NextResponse.json(
        { success: false, message: "未认证用户" },
        { status: 401 },
      );
    }

    const userId = session.user.userid;

    // 3. 解析 Body
    const body = await request.json();
    const { progressSeconds, isFinished } = body;

    if (typeof progressSeconds !== "number") {
      return NextResponse.json(
        { success: false, message: "Invalid data" },
        { status: 400 },
      );
    }

    // 4. [稳健修改] 不使用 upsert，改为手动查找 -> 更新或创建
    // 这样可以避开复合唯一索引命名不匹配的问题
    const existingRecord = await prisma.listening_history.findFirst({
      where: {
        userid: userId,
        episodeid: episodeId,
      },
    });

    let history;
    const now = new Date();

    if (existingRecord) {
      // 如果存在，通过主键 ID 更新
      history = await prisma.listening_history.update({
        where: {
          historyid: existingRecord.historyid,
        },
        data: {
          progressSeconds: Math.floor(progressSeconds),
          isFinished: isFinished || false,
          listenAt: now,
        },
      });
    } else {
      // 如果不存在，创建新记录
      history = await prisma.listening_history.create({
        data: {
          userid: userId,
          episodeid: episodeId,
          progressSeconds: Math.floor(progressSeconds),
          isFinished: isFinished || false,
          listenAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Progress saved successfully",
      data: history,
    });
  } catch (error) {
    // 在终端打印详细错误，方便调试
    console.error("Progress save error DETAILS:", error);

    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 },
    );
  }
}
