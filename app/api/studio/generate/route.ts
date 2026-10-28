import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";
import { createStudioGenerateService } from "@/core/studio/studio-generate.service";

/**
 * [RESHAPE T1.4] POST /api/studio/generate — 心愿定制工坊（PRO 专属）。
 *
 * Body: { prompt: string, moodTag?: string, includeDueVocab?: boolean, focusWeakPhoneme?: boolean }
 * 响应口径（与 learning-paths/generate 同风格，小程序端降级承接）：
 *   200 { success, data: { pathid, pathName, curatorIntro, cards[] } }
 *   403 PREMIUM_REQUIRED / 429 RATE_LIMITED / 422 INVALID_PROMPT|NO_MATCH
 *   503 LLM_UNAVAILABLE
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const input = {
      prompt: typeof body?.prompt === "string" ? body.prompt : "",
      moodTag: typeof body?.moodTag === "string" ? body.moodTag : null,
      includeDueVocab: body?.includeDueVocab === true,
      focusWeakPhoneme: body?.focusWeakPhoneme === true,
    };

    const service = createStudioGenerateService({
      prisma: {
        corpus_clips: {
          findMany: (args) => prisma.corpus_clips.findMany(args as never),
        },
        vocabulary: {
          findMany: (args) => prisma.vocabulary.findMany(args as never),
        },
        learning_paths: {
          create: (args) => prisma.learning_paths.create(args as never),
        },
        learning_path_items: {
          createMany: (args) =>
            prisma.learning_path_items.createMany(args as never),
        },
      },
      isPremium: (user) => isPremiumUser(user),
      callLlm: async (messages, maxTokens) => {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        const baseUrl =
          process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
        const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
        if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60_000);
        try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: modelName,
              messages,
              response_format: { type: "json_object" },
              temperature: 0.4,
              max_tokens: maxTokens,
            }),
          });
          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            throw new Error(
              `DeepSeek API error (${response.status}): ${errorText}`,
            );
          }
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("Empty LLM response");
          return content;
        } finally {
          clearTimeout(timer);
        }
      },
    });

    const result = await service.generate(
      guard.session.user.userid,
      guard.session.user.role,
      input,
    );

    if (!result.ok) {
      const status =
        result.code === "PREMIUM_REQUIRED"
          ? 403
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "LLM_UNAVAILABLE"
              ? 503
              : 422;
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message ?? "生成失败",
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pathid: result.pathid,
        pathName: result.pathName,
        curatorIntro: result.curatorIntro,
        cards: result.cards,
      },
    });
  } catch (error) {
    console.error("[POST /api/studio/generate]", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate studio montage" },
      { status: 500 },
    );
  }
}
