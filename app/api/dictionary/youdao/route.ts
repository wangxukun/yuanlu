import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import crypto from "crypto"; // Node.js 原生加密库
import {
  checkDictionaryQuota,
  recordDictionaryLookup,
} from "@/lib/dictionary-quota";
import {
  DICTIONARY_QUOTA_EXCEEDED,
  FREE_DICTIONARY_DAILY_LIMIT,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

// 配置你的有道密钥
const APP_KEY = process.env.YOUDAO_APP_KEY;
const APP_SECRET = process.env.YOUDAO_APP_SECRET;
const API_URL = process.env.YOUDAO_API_URL;

/**
 * 有道 V3 签名算法所需的截断逻辑
 * 当文本长度 > 20 时，取前10 + 长度 + 后10
 */
function truncate(q: string): string {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

export async function POST(request: Request) {
  try {
    // requireAuth：Web Cookie 会话优先，回退移动端 Bearer JWT（Android 端登录用户同样可译）
    const authResult = await requireAuth();
    if (!authResult.ok) {
      return authResult.response;
    }
    const session = authResult.session;

    const { word } = await request.json();
    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    // 配额检查放在调用有道 API 之前（每次调用都有按次成本），会员不限
    if (!(await checkDictionaryQuota(session.user))) {
      await recordConversionEvent({
        eventType: "QUOTA_BLOCKED",
        source: "dictionary_daily",
        userid: session.user.userid,
      });
      return NextResponse.json(
        {
          error: "Quota exceeded",
          code: DICTIONARY_QUOTA_EXCEEDED,
          message: `今日 ${FREE_DICTIONARY_DAILY_LIMIT} 次免费词典查询已用完，升级会员解锁无限查询！`,
        },
        { status: 403 },
      );
    }

    const salt = crypto.randomUUID();
    const curtime = Math.round(new Date().getTime() / 1000).toString();
    const str1 = APP_KEY + truncate(word) + salt + curtime + APP_SECRET;
    const sign = crypto.createHash("sha256").update(str1).digest("hex");

    const formData = new URLSearchParams();
    formData.append("q", word);
    formData.append("from", "en");
    formData.append("to", "zh-CHS");
    formData.append("appKey", APP_KEY as string);
    formData.append("salt", salt);
    formData.append("sign", sign);
    formData.append("signType", "v3");
    formData.append("curtime", curtime);

    const res = await fetch(API_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await res.json();

    if (data.errorCode !== "0") {
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 },
      );
    }

    // 调用成功才计入当日配额（失败不占用用户额度）
    await recordDictionaryLookup(
      session.user.userid,
      "youdao",
      typeof word === "string" ? word : undefined,
    );

    // [核心修改] 字段映射
    // 根据你的描述：
    // webdict (http://mobile.youdao.com...) -> mobileUrl
    // mTerminalDict (https://m.youdao.com...) -> webUrl

    return NextResponse.json({
      word: data.query,
      definition: data.translation ? data.translation.join("; ") : "",
      speakUrl: data.speakUrl || "",
      dictUrl: data.dict?.url || "",
      webUrl: data.mTerminalDict?.url || "", // 对应 https://m.youdao.com...
      mobileUrl: data.webdict?.url || "", // [新增] 对应 http://mobile.youdao.com...
    });
  } catch (error) {
    console.error("Youdao proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
