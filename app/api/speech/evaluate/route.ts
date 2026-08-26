// app/api/speech/evaluate/route.ts
// REST endpoint for speech evaluation — mobile clients call this
// instead of the Server Action (which requires Next-Action headers).
// Implements the "dual exposure" rule: both this route and the
// Server Action call the same core service.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { evaluateAndSave } from "@/core/speech/speech-evaluate.service";

interface EvaluateRequest {
  episodeId: string;
  subtitleId?: number;
  targetText: string;
  audioBase64: string;
  rate?: number; // default 16000
}

export async function POST(request: NextRequest) {
  // Auth check (supports both cookie and Bearer token)
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  try {
    const body: EvaluateRequest = await request.json();

    // Validate required fields
    if (!body.episodeId || !body.targetText || !body.audioBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必填字段: episodeId, targetText, audioBase64",
        },
        { status: 400 },
      );
    }

    // Call core evaluation service
    const result = await evaluateAndSave(
      session.user.userid,
      session.user.role,
      {
        episodeId: body.episodeId,
        subtitleId: body.subtitleId,
        targetText: body.targetText,
        audioBase64: body.audioBase64,
        rate: body.rate || 16000,
      },
    );

    if (result.error && !result.success) {
      // Quota exceeded or evaluation error
      const status = result.error === "EVALUATION_QUOTA_EXCEEDED" ? 403 : 500;
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        score: result.score,
        details: result.details,
        recognitionId: result.recognitionId,
      },
    });
  } catch (error) {
    console.error("Speech evaluate API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "评测失败",
      },
      { status: 500 },
    );
  }
}
