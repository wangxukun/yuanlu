"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// 环境变量获取
const APP_KEY = process.env.YOUDAO_APP_KEY || "";
const APP_SECRET = process.env.YOUDAO_APP_SECRET || "";
const YOUDAO_URL = "https://openapi.youdao.com/iseapi";

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

    revalidatePath(`/episode/${episodeId}/practice`);
    return { success: true, data: record };
  } catch (error) {
    console.error("Failed to save speech recognition result:", error);
    return { error: "Failed to save result" };
  }
}
