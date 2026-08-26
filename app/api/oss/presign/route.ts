// app/api/oss/presign/route.ts
// Generate presigned PUT URLs for mobile clients to directly upload files to OSS.
// This avoids large file uploads passing through the Next.js server.
// Usage: POST with { fileName, contentType, purpose }
// Returns: { putUrl, fileName, expiresAt }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import OSS from "ali-oss";
import crypto from "crypto";

// Valid upload purposes and their OSS path prefixes
const PURPOSE_PATHS: Record<string, string> = {
  recording: "yuanlu/speech",
  avatar: "yuanlu/avatars",
  audio: "yuanlu/audio",
};

// Allowed content types per purpose
const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  recording: ["audio/wav", "audio/wave", "audio/x-wav"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  audio: [
    "audio/mpeg",
    "audio/mp4",
    "audio/mp3",
    "audio/wav",
    "audio/x-m4a",
    "audio/aac",
  ],
};

// Presigned URL validity: 1 hour
const PRESIGN_EXPIRY_SECONDS = 3600;

interface PresignRequest {
  fileName: string;
  contentType: string;
  purpose: "recording" | "avatar" | "audio";
}

function getOssClient(): OSS {
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;

  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error("OSS client is not configured.");
  }

  return new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    secure: true,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  try {
    const body: PresignRequest = await request.json();

    // Validate purpose
    if (!body.purpose || !PURPOSE_PATHS[body.purpose]) {
      return NextResponse.json(
        {
          success: false,
          error: `无效的上传用途。支持: ${Object.keys(PURPOSE_PATHS).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate content type
    const allowed = ALLOWED_CONTENT_TYPES[body.purpose];
    if (!body.contentType || !allowed.includes(body.contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的文件类型: ${body.contentType}。允许: ${allowed.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Generate unique OSS object key
    const ext = body.fileName ? body.fileName.split(".").pop() || "bin" : "bin";
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().substring(0, 8);
    const objectKey = `${PURPOSE_PATHS[body.purpose]}/${session.user.userid}/${timestamp}_${randomStr}.${ext}`;

    // Generate presigned PUT URL
    const client = getOssClient();
    const putUrl = client.signatureUrl(objectKey, {
      method: "PUT",
      expires: PRESIGN_EXPIRY_SECONDS,
      "Content-Type": body.contentType,
    });

    const expiresAt = new Date(
      Date.now() + PRESIGN_EXPIRY_SECONDS * 1000,
    ).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        putUrl,
        fileName: objectKey,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("OSS presign error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成上传地址失败",
      },
      { status: 500 },
    );
  }
}
