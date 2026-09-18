// core/speech/speech-evaluate.service.ts
// Core speech evaluation service — extracted from lib/actions/speech.ts.
// Both the Server Action and the REST endpoint call this service,
// following the "dual exposure" rule in structure.md.

/* eslint-disable @typescript-eslint/no-explicit-any */

import prisma from "@/lib/prisma";
import { uploadFile } from "@/lib/oss";
import { isPremiumUser } from "@/core/auth/guard";
import {
  FREE_REVIEW_EVALUATIONS_PER_DAY,
  REVIEW_EVAL_DAILY_BUFFER,
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
 * 评测场景标记（数据画像用）：
 * - learn   学新：剧集页沉浸跟读（精听）
 * - review  复习：发音弱项闯关 / 句子本影子跟读
 * [全局日池统一] learn 与 review 共用同一"每日跟读配额"池（5+1 buffer/日），
 * scenario 仅作落库画像与埋点维度，不再参与配额分流（原 learn 月池已废止）。
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

/** 配额拦截结果：code 供前端区分弹窗场景（统一日池一律 REVIEW_EVAL_QUOTA_EXCEEDED） */
export interface EvaluationQuotaBlock {
  code: string;
  message: string;
  scenario: EvalScenario;
}

/** 配额状态查询结果（/api/speech/quota 预检，供评分按钮置锁） */
export interface EvaluationQuotaStatus {
  scenario: EvalScenario;
  used: number;
  /** 对外承诺额度（不含日池缓冲） */
  limit: number;
  /** 实际还可评测次数（含 +1 缓冲）；会员为 null（无限） */
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
  return crypto.createHash("sha256").update(signStr, "utf-8").digest("hex");
}

function getDayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * [全局日池] 当日已用跟读评测次数：跨场景（learn + review）、跨剧集统一计数，
 * 不论在哪个剧集或哪种练习入口，每天录音跟读共用一个池
 */
async function getDailyEvaluationCount(userid: string): Promise<number> {
  return prisma.speech_recognition.count({
    where: {
      userid,
      recognitionDate: { gte: getDayStart() },
    },
  });
}

/**
 * [全局日池] 评测配额检查（唯一规则维护点，server action 前置检查与保存兜底同源）。
 * 会员/管理员直接放行；learn / review 场景一律查当日跨场景总数（5 次 + 1 buffer，
 * 自然日重置）。返回 null 表示放行，否则返回拦截 code 与文案。
 * 检查与写入间的并发轻微越限无害（次日自动归零），不引入咨询锁。
 */
export async function checkEvaluationQuota(
  user: { role?: string | null; userid?: string },
  scenario: EvalScenario = "learn",
): Promise<EvaluationQuotaBlock | null> {
  const hasPremium = await isPremiumUser(user);
  if (hasPremium) return null;

  const used = await getDailyEvaluationCount(user.userid!);
  if (used < FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER) {
    return null;
  }
  return {
    code: REVIEW_EVAL_QUOTA_EXCEEDED,
    message: `今日 ${FREE_REVIEW_EVALUATIONS_PER_DAY} 次免费跟读评测已用完，明日额度自动就位。升级 PRO 解锁无限评测！`,
    scenario,
  };
}

/**
 * [全局日池] 配额状态查询（/api/speech/quota）：供各练习入口预检置锁评分按钮。
 * learn / review 入口查的是同一个池（当日跨场景总数），scenario 仅原样回显。
 */
export async function getEvaluationQuotaStatus(
  user: { role?: string | null; userid?: string },
  scenario: EvalScenario = "learn",
): Promise<EvaluationQuotaStatus> {
  const hasPremium = await isPremiumUser(user);
  const limit = FREE_REVIEW_EVALUATIONS_PER_DAY;
  const buffer = REVIEW_EVAL_DAILY_BUFFER;
  const used = await getDailyEvaluationCount(user.userid!);
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

    // [P3-g] 返回载荷剥离 OSS 直链：record.userAudioUrl/detailUrl 是未签名的
    // OSS 直链，落库需要它们，但任何客户端 payload 都不需要（Web 端即时回放
    // 走本地 blob URL，历史回放/评测细节由 practice-data 按会员态签名下发）。
    // 全部调用方（server action / REST evaluateAndSave）均不消费这两个字段。
    const safeRecord: Record<string, unknown> = { ...record };
    delete safeRecord.userAudioUrl;
    delete safeRecord.detailUrl;
    return { success: true, data: safeRecord };
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
