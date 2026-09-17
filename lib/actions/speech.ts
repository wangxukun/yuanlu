/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

/**
 * [P3-b 前置重构] 语音评测 Server Action —— thin wrapper 层。
 *
 * 全部业务逻辑（配额规则 / 有道 ISE 签名调用 / OSS 上传与落库）收敛至
 * core/speech/speech-evaluate.service 唯一维护点，本文件只做三件事：
 *   1. 会话鉴权（auth()）
 *   2. 配额前置检查 + QUOTA_BLOCKED 埋点（learn 月池 / review 日池双口径同源）
 *   3. 调用 service 并保持 revalidate 等框架层副作用
 *
 * 此前 evaluateSpeech/saveSpeechResult 内嵌的 getEvaluationQuotaMessage、
 * truncate/encrypt 签名、Youdao fetch、OSS 上传与 phonemeStats 更新等代码副本
 * 已全部删除（N4 双卡点分叉的根治）。
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordConversionEvent } from "@/lib/track";
import {
  callYoudaoISE,
  checkEvaluationQuota,
  saveSpeechResultCore,
  type EvalScenario,
  type SaveSpeechResultInput,
} from "@/core/speech/speech-evaluate.service";

/**
 * 调用有道云语音评测（前置配额检查在调用有道 API 之前，超限用户不产生评测费用）。
 * @param scenario learn=学新（月池 20 次/月）/ review=复习（日池 5 次/日），默认 learn
 */
export async function evaluateSpeech(
  audioBase64: string,
  text: string,
  rate: number = 16000,
  scenario: EvalScenario = "learn",
) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  const quotaBlock = await checkEvaluationQuota(session.user, scenario);
  if (quotaBlock) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_evaluation",
      userid: session.user.userid,
      metadata: { scenario },
    });
    return { error: quotaBlock.code, message: quotaBlock.message };
  }

  return callYoudaoISE(audioBase64, text, rate);
}

export async function saveSpeechResult(params: {
  episodeId: string;
  targetText: string;
  speechText: string;
  accuracyScore: number;
  targetStartTime: number;
  subtitleId?: number;
  fluencyScore?: number;
  integrityScore?: number;
  overallScore?: number;
  speed?: number;
  audioBase64?: string;
  detailJson?: any;
  scenario?: EvalScenario;
}) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  // 兜底配额检查：正常流程在 evaluateSpeech 已拦截，这里防止并发或绕过评测接口直接保存
  const scenario = params.scenario ?? "learn";
  const quotaBlock = await checkEvaluationQuota(session.user, scenario);
  if (quotaBlock) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_save",
      userid: session.user.userid,
      metadata: { episodeid: params.episodeId, scenario },
    });
    return { error: quotaBlock.code, message: quotaBlock.message };
  }

  const result = await saveSpeechResultCore(session.user.userid, {
    ...params,
    scenario,
  } satisfies SaveSpeechResultInput);

  if (result.success) {
    revalidatePath(`/episode/${params.episodeId}/practice`);
  }
  return result;
}

/**
 * 更新当前用户的发音弱项本分数线。
 * 该阈值决定哪些句子/音素计入弱项本（pronunciation 页面、/api/speech/errors、音素 lowScoreCount）。
 * @param score 60-95 之间的整数
 */
export async function updateWeakScoreThreshold(score: number) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  const clamped = Math.max(60, Math.min(95, Math.round(score)));
  try {
    await prisma.user_profile.update({
      where: { userid: session.user.userid },
      data: { weakScoreThreshold: clamped },
    });
    revalidatePath("/library/pronunciation");
    return { success: true, weakScoreThreshold: clamped };
  } catch (error) {
    console.error("Failed to update weakScoreThreshold:", error);
    return { error: "Failed to update threshold" };
  }
}

/**
 * 读取当前用户的发音弱项本分数线（供需要动态判定弱项的地方使用）。
 */
export async function getWeakScoreThreshold(userid: string): Promise<number> {
  const profile = await prisma.user_profile.findUnique({
    where: { userid },
    select: { weakScoreThreshold: true },
  });
  return profile?.weakScoreThreshold ?? 80;
}
