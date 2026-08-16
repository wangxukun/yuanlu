/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { isPremiumUser } from "@/core/auth/guard";
import {
  FREE_SPEECH_EVALUATIONS_PER_MONTH,
  SPEECH_QUOTA_EXCEEDED,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

// 环境变量获取
const APP_KEY = process.env.YOUDAO_APP_KEY || "";
const APP_SECRET = process.env.YOUDAO_APP_SECRET || "";
const YOUDAO_URL = "https://openapi.youdao.com/iseapi";

/**
 * 计算当前自然月的起始时间（本地时区），作为月度配额的统计边界
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * 查询用户本自然月已保存的语音评测次数
 */
async function getMonthlyEvaluationCount(userid: string): Promise<number> {
  return prisma.speech_recognition.count({
    where: {
      userid,
      recognitionDate: { gte: getMonthStart() },
    },
  });
}

/**
 * 校验免费用户的月度评测配额。
 * 会员/管理员直接放行；免费用户本月已用满则返回提示文案，否则返回 null。
 * 注意：调用方需将文案以内联对象字面量返回，保证联合类型归一化。
 */
async function getEvaluationQuotaMessage(user: {
  role?: string | null;
  userid?: string;
}): Promise<string | null> {
  const hasPremium = await isPremiumUser(user);
  if (hasPremium) return null;

  const used = await getMonthlyEvaluationCount(user.userid!);
  if (used < FREE_SPEECH_EVALUATIONS_PER_MONTH) return null;

  return `本月 ${FREE_SPEECH_EVALUATIONS_PER_MONTH} 次免费语音评测已用完，升级会员解锁无限次评测！`;
}

/**
 * 对应 Python 示例中的 truncate 函数
 * 用于处理过长的 input (q) 生成签名
 */
function truncate(q: string) {
  if (!q) return null;
  const size = q.length;
  return size <= 20 ? q : q.substring(0, 10) + size + q.substring(size - 10);
}

/**
 * SHA256 加密生成签名
 */
function encrypt(signStr: string) {
  return crypto.createHash("sha256").update(signStr, "utf8").digest("hex");
}

/**
 * 调用有道云语音评测 API
 * @param audioBase64 音频文件的 Base64 字符串 (不带 data:audio/wav;base64, 前缀)
 * @param text 评测文本
 * @param rate 采样率，默认 16000
 */
export async function evaluateSpeech(
  audioBase64: string,
  text: string,
  rate: number = 16000,
) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  // 配额检查放在调用有道 API 之前，超限用户不产生评测费用
  const quotaMessage = await getEvaluationQuotaMessage(session.user);
  if (quotaMessage) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_evaluation",
      userid: session.user.userid,
    });
    return { error: SPEECH_QUOTA_EXCEEDED, message: quotaMessage };
  }

  if (!APP_KEY || !APP_SECRET) {
    console.error("Missing Youdao API credentials");
    return { error: "Service configuration error" };
  }

  try {
    const q = audioBase64;
    const curtime = Math.floor(Date.now() / 1000).toString();
    const salt = crypto.randomUUID();

    // 签名生成规则：sign = sha256(应用ID + truncate(q) + salt + curtime + 应用密钥)
    const signStr = APP_KEY + truncate(q) + salt + curtime + APP_SECRET;
    const sign = encrypt(signStr);

    // 构造 Form Data
    const formData = new URLSearchParams();
    formData.append("text", text);
    formData.append("q", q);
    formData.append("appKey", APP_KEY);
    formData.append("salt", salt);
    formData.append("curtime", curtime);
    formData.append("sign", sign);
    formData.append("signType", "v2");
    formData.append("langType", "en"); // 英语
    formData.append("rate", rate.toString());
    formData.append("format", "wav");
    formData.append("channel", "1");
    formData.append("type", "1"); // 业务类型

    const response = await fetch(YOUDAO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.errorCode !== "0") {
      console.error("Youdao API Error:", result);
      return { error: `Evaluation failed: Error Code ${result.errorCode}` };
    }

    // 解析结果
    // 有道 API 返回的 integrity(完整度), pronunciation(发音), fluency(流利度) 等
    // 这里的解析逻辑基于常见有道 ISE 响应，如果需要更详细的单词级别数据，可以解析 result.words

    // 简单计算一个综合分，或者直接使用 pronunciation
    // 如果返回没有具体的 accuracyScore 字段，可以用 pronunciation 代替
    // 注意：有道返回的分数通常是 0-100
    const score = result.pronunciation || 0;

    return {
      success: true,
      score: score,
      details: result, // 返回完整详情供前端可能的进一步展示（如单词纠错）
    };
  } catch (error) {
    console.error("Speech evaluation error:", error);
    return { error: "Internal processing error" };
  }
}

import { uploadFile } from "@/lib/oss";

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
}) {
  const session = await auth();
  if (!session?.user?.userid) {
    return { error: "Unauthorized" };
  }

  // 兜底配额检查：正常流程在 evaluateSpeech 已拦截，这里防止并发或绕过评测接口直接保存
  const quotaMessage = await getEvaluationQuotaMessage(session.user);
  if (quotaMessage) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_save",
      userid: session.user.userid,
      metadata: { episodeid: params.episodeId },
    });
    return { error: SPEECH_QUOTA_EXCEEDED, message: quotaMessage };
  }

  try {
    let userAudioUrl = undefined;
    let detailUrl = undefined;
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().substring(0, 8);

    // 1. Upload audio to OSS
    if (params.audioBase64) {
      try {
        const audioBuffer = Buffer.from(params.audioBase64, "base64");
        const audioFileName = `yuanlu/speech/${session.user.userid}/${params.episodeId}/${timestamp}_${randomStr}.wav`;
        const audioUploadResult = await uploadFile(audioBuffer, audioFileName);
        userAudioUrl = audioUploadResult.fileUrl;
      } catch (e) {
        console.error("Failed to upload audio to OSS", e);
      }
    }

    // 2. Upload detail JSON to OSS
    if (params.detailJson) {
      try {
        const jsonBuffer = Buffer.from(JSON.stringify(params.detailJson));
        const jsonFileName = `yuanlu/speech/${session.user.userid}/${params.episodeId}/${timestamp}_${randomStr}.json`;
        const jsonUploadResult = await uploadFile(jsonBuffer, jsonFileName);
        detailUrl = jsonUploadResult.fileUrl;
      } catch (e) {
        console.error("Failed to upload detail JSON to OSS", e);
      }
    }

    const record = await prisma.speech_recognition.create({
      data: {
        userid: session.user.userid,
        episodeid: params.episodeId,
        targetText: params.targetText,
        speechText: params.speechText,
        accuracyScore: params.accuracyScore,
        targetStartTime: Math.floor(params.targetStartTime),
        recognitionDate: new Date(),
        subtitleId: params.subtitleId,
        fluencyScore: params.fluencyScore,
        integrityScore: params.integrityScore,
        overallScore: params.overallScore,
        speed: params.speed,
        userAudioUrl: userAudioUrl,
        detailUrl: detailUrl,
      },
    });

    // 3. Update phonemeStats in user_profile
    if (params.detailJson && params.detailJson.words) {
      try {
        const userProfile = await prisma.user_profile.findUnique({
          where: { userid: session.user.userid },
        });

        const phonemeStats: any = userProfile?.phonemeStats || {};
        // 弱项分数线：低于该分才计入 lowScoreCount（默认 80）
        const weakThreshold = userProfile?.weakScoreThreshold ?? 80;

        params.detailJson.words.forEach((word: any) => {
          if (word.phonemes) {
            word.phonemes.forEach((ph: any) => {
              const phName = ph.phoneme;
              const phScore = ph.score;
              if (phName && typeof phScore === "number") {
                if (!phonemeStats[phName]) {
                  phonemeStats[phName] = {
                    totalScore: 0,
                    count: 0,
                    lowScoreCount: 0,
                  };
                }
                phonemeStats[phName].totalScore += phScore;
                phonemeStats[phName].count += 1;
                if (phScore < weakThreshold) {
                  phonemeStats[phName].lowScoreCount += 1;
                }
              }
            });
          }
        });

        if (userProfile) {
          await prisma.user_profile.update({
            where: { userid: session.user.userid },
            data: { phonemeStats },
          });
        }
      } catch (e) {
        console.error("Failed to update phonemeStats", e);
      }
    }

    revalidatePath(`/episode/${params.episodeId}/practice`);
    return { success: true, data: record };
  } catch (error) {
    console.error("Failed to save speech recognition result:", error);
    return { error: "Failed to save result" };
  }
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
