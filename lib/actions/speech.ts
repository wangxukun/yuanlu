"use server";

import { auth } from "@/auth"; // 假设 auth.ts 在根目录
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveSpeechResult(
  episodeId: string,
  targetText: string,
  speechText: string,
  accuracyScore: number,
  targetStartTime: number,
) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  try {
    const record = await prisma.speech_recognition.create({
      data: {
        userid: session.user.userid,
        episodeid: episodeId,
        targetText: targetText,
        speechText: speechText,
        accuracyScore: accuracyScore,
        targetStartTime: Math.floor(targetStartTime),
        recognitionDate: new Date(),
      },
    });

    // 重新验证路径，以便即时更新统计数据（如果有的话）
    revalidatePath(`/episode/${episodeId}/practice`);
    return { success: true, data: record };
  } catch (error) {
    console.error("Failed to save speech recognition result:", error);
    return { error: "Failed to save result" };
  }
}
