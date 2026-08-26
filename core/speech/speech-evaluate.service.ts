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
  SPEECH_QUOTA_EXCEEDED,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";
import crypto from "crypto";

// ── Environment variables ──
const APP_KEY = process.env.YOUDAO_APP_KEY || "";
const APP_SECRET = process.env.YOUDAO_APP_SECRET || "";
const YOUDAO_URL = "https://openapi.youdao.com/iseapi";

// ── DTOs ──

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

async function getMonthlyEvaluationCount(userid: string): Promise<number> {
  return prisma.speech_recognition.count({
    where: {
      userid,
      recognitionDate: { gte: getMonthStart() },
    },
  });
}

/**
 * Check evaluation quota for a user.
 * Returns null if allowed, or a message string if quota exceeded.
 */
export async function checkEvaluationQuota(user: {
  role?: string | null;
  userid?: string;
}): Promise<string | null> {
  const hasPremium = await isPremiumUser(user);
  if (hasPremium) return null;

  const used = await getMonthlyEvaluationCount(user.userid!);
  if (used < FREE_SPEECH_EVALUATIONS_PER_MONTH) return null;

  return `本月 ${FREE_SPEECH_EVALUATIONS_PER_MONTH} 次免费语音评测已用完，升级会员解锁无限次评测！`;
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
  },
): Promise<{
  success?: boolean;
  score?: number;
  details?: any;
  recognitionId?: number;
  error?: string;
  message?: string;
}> {
  // 1. Check quota
  const quotaMessage = await checkEvaluationQuota({
    role: userRole,
    userid,
  });
  if (quotaMessage) {
    await recordConversionEvent({
      eventType: "QUOTA_BLOCKED",
      source: "speech_evaluation",
      userid,
    });
    return { error: SPEECH_QUOTA_EXCEEDED, message: quotaMessage };
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
