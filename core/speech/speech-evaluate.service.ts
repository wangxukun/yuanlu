// core/speech/speech-evaluate.service.ts
// Core speech evaluation service — extracted from lib/actions/speech.ts.
// Both the Server Action and the REST endpoint call this service,
// following the "dual exposure" rule in structure.md.

/* eslint-disable @typescript-eslint/no-explicit-any */

import prisma from "@/lib/prisma";
import { uploadFile } from "@/lib/oss";
import { isPremiumUser } from "@/core/auth/guard";
import {
  FREE_SPEECH_EVALUATIONS_PER_MONTH,
  FREE_REVIEW_EVALUATIONS_PER_DAY,
  REVIEW_EVAL_DAILY_BUFFER,
  SPEECH_QUOTA_EXCEEDED,
  REVIEW_EVAL_QUOTA_EXCEEDED,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";
import crypto from "crypto";

// ── Environment variables ──
const APP_KEY = process.env.YOUDAO_APP_KEY || "";
const APP_SECRET = process.env.YOUDAO_APP_SECRET || "";
const YOUDAO_URL = "https://openapi.youdao.com/iseapi";

// ── DTOs ──

/**
 * [P3-b] 评测场景双池拆分（报告 4.2-B）：
 * - learn   学新：剧集页沉浸跟读，共享月池（FREE_SPEECH_EVALUATIONS_PER_MONTH）
 * - review  复习：发音弱项闯关 / 句子本影子跟读，独立日池（FREE_REVIEW_EVALUATIONS_PER_DAY）
 */
export type EvalScenario = "learn" | "review";

/** 外部输入（server action 参数 / REST body）的 scenario 归一化，非法值一律按 learn */
export function normalizeScenario(input: unknown): EvalScenario {
  return input === "review" ? "review" : "learn";
}

export interface EvaluateSpeechInput {
  audioBase64: string;
  targetText: string;
  rate?: number; // default 16000
}

export interface SaveSpeechResultInput {
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
}

export interface EvaluateSpeechResult {
  success?: boolean;
  score?: number;
  details?: any;
  error?: string;
  message?: string;
}

export interface SaveSpeechResultOutput {
  success?: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/** 配额拦截结果：code 供前端区分弹窗场景（speech_quota / review_eval_quota） */
export interface EvaluationQuotaBlock {
  code: string;
  message: string;
  scenario: EvalScenario;
}

/** 配额状态查询结果（/api/speech/quota 预检，供评分按钮置锁） */
export interface EvaluationQuotaStatus {
  scenario: EvalScenario;
  used: number;
  /** 对外承诺额度（不含复习日池缓冲） */
  limit: number;
  /** 实际还可评测次数（复习日池含 +1 缓冲）；会员为 null（无限） */
  remaining: number | null;
  exhausted: boolean;
  isPremium: boolean;
}

// ── Internal helpers ──

function truncate(q: string) {
  if (!q) return null;
  const size = q.length;
  return size <= 20 ? q : q.substring(0, 10) + size + q.substring(size - 10);
}

function encrypt(signStr: string) {
  return crypto.createHash("sha256").update(signStr, "utf8").digest("hex");
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getDayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 学新月池计数：本自然月的 learn 场景落库行数（存量行经 migration 回填为 learn） */
async function getMonthlyEvaluationCount(userid: string): Promise<number> {
  return prisma.speech_recognition.count({
    where: {
      userid,
      scenario: "learn",
      recognitionDate: { gte: getMonthStart() },
    },
  });
}

/** 复习日池计数：当日的 review 场景落库行数 */
async function getDailyReviewCount(userid: string): Promise<number> {
  return prisma.speech_recognition.count({
    where: {
      userid,
      scenario: "review",
      recognitionDate: { gte: getDayStart() },
    },
  });
}

/**
 * [P3-b] 评测配额检查（唯一规则维护点，server action 前置检查与保存兜底同源）。
 * 会员/管理员直接放行；按 scenario 分流：learn 查月池、review 查日池（5+1 buffer）。
 * 返回 null 表示放行，否则返回拦截 code 与文案。
 */
export async function checkEvaluationQuota(
  user: { role?: string | null; userid?: string },
  scenario: EvalScenario = "learn",
): Promise<EvaluationQuotaBlock | null> {
  const hasPremium = await isPremiumUser(user);
  if (hasPremium) return null;

  if (scenario === "review") {
    // 日池天然按自然日重置，检查与写入间的并发轻微越限无害（次日自动归零），
    // 不引入 sentences.toggleSave 级别的咨询锁
    const used = await getDailyReviewCount(user.userid!);
    if (used < FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER) {
      return null;
    }
    return {
      code: REVIEW_EVAL_QUOTA_EXCEEDED,
      message: `今日 ${FREE_REVIEW_EVALUATIONS_PER_DAY} 次免费跟读评测已用完，明日额度自动就位。升级 PRO 解锁无限评测！`,
      scenario,
    };
  }

  const used = await getMonthlyEvaluationCount(user.userid!);
  if (used < FREE_SPEECH_EVALUATIONS_PER_MONTH) return null;

  return {
    code: SPEECH_QUOTA_EXCEEDED,
    message: `本月 ${FREE_SPEECH_EVALUATIONS_PER_MONTH} 次免费语音评测已用完，升级会员解锁无限次评测！`,
    scenario,
  };
}

/**
 * [P3-b] 配额状态查询（/api/speech/quota）：供复习练习页预检置锁评分按钮。
 */
export async function getEvaluationQuotaStatus(
  user: { role?: string | null; userid?: string },
  scenario: EvalScenario = "learn",
): Promise<EvaluationQuotaStatus> {
  const hasPremium = await isPremiumUser(user);
  const limit =
    scenario === "review"
      ? FREE_REVIEW_EVALUATIONS_PER_DAY
      : FREE_SPEECH_EVALUATIONS_PER_MONTH;
  const buffer = scenario === "review" ? REVIEW_EVAL_DAILY_BUFFER : 0;
  const used =
    scenario === "review"
      ? await getDailyReviewCount(user.userid!)
      : await getMonthlyEvaluationCount(user.userid!);
  const remaining = Math.max(0, limit + buffer - used);

  return {
    scenario,
    used,
    limit,
    remaining: hasPremium ? null : remaining,
    exhausted: !hasPremium && remaining <= 0,
    isPremium: hasPremium,
  };
}

// ── Core service functions ──

/**
 * Call Youdao ISE API for speech evaluation.
 * This function does NOT check auth or quota — callers must do that.
 */
export async function callYoudaoISE(
  audioBase64: string,
  text: string,
  rate: number = 16000,
): Promise<EvaluateSpeechResult> {
  if (!APP_KEY || !APP_SECRET) {
    console.error("Missing Youdao API credentials");
    return { error: "Service configuration error" };
  }

  try {
    const q = audioBase64;
    const curtime = Math.floor(Date.now() / 1000).toString();
    const salt = crypto.randomUUID();

    // Signature: sha256(appKey + truncate(q) + salt + curtime + appSecret)
    const signStr = APP_KEY + truncate(q) + salt + curtime + APP_SECRET;
    const sign = encrypt(signStr);

    const formData = new URLSearchParams();
    formData.append("text", text);
    formData.append("q", q);
    formData.append("appKey", APP_KEY);
    formData.append("salt", salt);
    formData.append("curtime", curtime);
    formData.append("sign", sign);
    formData.append("signType", "v2");
    formData.append("langType", "en");
    formData.append("rate", rate.toString());
    formData.append("format", "wav");
    formData.append("channel", "1");
    formData.append("type", "1");

    const response = await fetch(YOUDAO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    const score = result.pronunciation || 0;
    return { success: true, score, details: result };
  } catch (error) {
    console.error("Speech evaluation error:", error);
    return { error: "Internal processing error" };
  }
}

/**
 * Save speech evaluation result to DB and OSS.
 * This function does NOT check auth — callers must provide userid.
 */
export async function saveSpeechResultCore(
  userid: string,
  params: SaveSpeechResultInput,
): Promise<SaveSpeechResultOutput> {
  try {
    let userAudioUrl = undefined;
    let detailUrl = undefined;
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().substring(0, 8);

    // 1. Upload audio to OSS
    if (params.audioBase64) {
      try {
        const audioBuffer = Buffer.from(params.audioBase64, "base64");
        const audioFileName = `yuanlu/speech/${userid}/${params.episodeId}/${timestamp}_${randomStr}.wav`;
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
        const jsonFileName = `yuanlu/speech/${userid}/${params.episodeId}/${timestamp}_${randomStr}.json`;
        const jsonUploadResult = await uploadFile(jsonBuffer, jsonFileName);
        detailUrl = jsonUploadResult.fileUrl;
      } catch (e) {
        console.error("Failed to upload detail JSON to OSS", e);
      }
    }

    // 3. Create speech_recognition record
    const record = await prisma.speech_recognition.create({
      data: {
        userid,
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
        userAudioUrl,
        detailUrl,
        // [P3-b] 评测场景落库：月池/日池按此字段分流计数
        scenario: params.scenario ?? "learn",
      },
    });

    // 4. Update phonemeStats in user_profile
    if (params.detailJson?.words) {
      try {
        const userProfile = await prisma.user_profile.findUnique({
          where: { userid },
        });

        const phonemeStats: any = userProfile?.phonemeStats || {};
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
            where: { userid },
            data: { phonemeStats },
          });
        }
      } catch (e) {
        console.error("Failed to update phonemeStats", e);
      }
    }

    return { success: true, data: record };
  } catch (error) {
    console.error("Failed to save speech recognition result:", error);
    return { error: "Failed to save result" };
  }
}

/**
 * Full evaluate-and-save pipeline for a single speech evaluation request.
 * Checks quota, calls Youdao ISE, then saves result.
 * Used by the REST endpoint.
 */
export async function evaluateAndSave(
  userid: string,
  userRole: string | null,
  params: {
    episodeId: string;
    subtitleId?: number;
    targetText: string;
    audioBase64: string;
    rate?: number;
    scenario?: EvalScenario;
  },
): Promise<{
  success?: boolean;
  score?: number;
  details?: any;
  recognitionId?: number;
  error?: string;
  message?: string;
}> {
  const scenario = params.scenario ?? "learn";

  // 1. Check quota
  const quotaBlock = await checkEvaluationQuota(
    { role: userRole, userid },
    scenario,
  );
  if (quotaBlock) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_evaluation",
      userid,
      metadata: { scenario },
    });
    return { error: quotaBlock.code, message: quotaBlock.message };
  }

  // 2. Call Youdao ISE
  const evalResult = await callYoudaoISE(
    params.audioBase64,
    params.targetText,
    params.rate || 16000,
  );
  if (evalResult.error) {
    return evalResult;
  }

  // 3. Save result
  const saveResult = await saveSpeechResultCore(userid, {
    episodeId: params.episodeId,
    targetText: params.targetText,
    speechText: evalResult.details?.rec_paper?.read_chapter?.rec_paper || "",
    accuracyScore: evalResult.score || 0,
    targetStartTime: 0,
    subtitleId: params.subtitleId,
    fluencyScore: evalResult.details?.fluency,
    integrityScore: evalResult.details?.integrity,
    overallScore: evalResult.details?.overall,
    speed: evalResult.details?.speed,
    audioBase64: params.audioBase64,
    detailJson: evalResult.details,
    scenario,
  });

  if (saveResult.error) {
    // Evaluation succeeded but save failed — still return the score
    return {
      success: true,
      score: evalResult.score,
      details: evalResult.details,
      error: saveResult.error,
    };
  }

  return {
    success: true,
    score: evalResult.score,
    details: evalResult.details,
    recognitionId: saveResult.data?.recognitionid,
  };
}
