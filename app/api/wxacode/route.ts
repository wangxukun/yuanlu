// app/api/wxacode/route.ts — 小程序码生成与解析（公众号联动 T1）
//
// POST /api/wxacode   生成码（内部调用：x-internal-secret 或 ADMIN 会话）
//   body: { scene, targetType, episodeId?, articleNo?, page?, envVersion? }
//   行为: upsert qr_scene 短码映射 → 调微信 getwxacodeunlimit → 存 OSS → 返回 URL
//   幂等: 同 scene 重复调用只刷新映射并重新生成（微信接口侧不限量）
//
// GET /api/wxacode?scene=xxx   公开解析（小程序启动时换取落地目标）
//   → { success, data: { scene, targetType, episodeId?, articleNo? } }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadFile, generateSignatureUrl } from "@/lib/oss";
import { generateWxacodeBuffer } from "@/core/wx/wxacode.service";
import { requireAdmin } from "@/core/auth/guard";

// scene 短码约束：与 getwxacodeunlimit 上限 32 字符、安全字符集对齐
const SCENE_RE = /^[A-Za-z0-9_.-]{1,32}$/;
const TARGET_TYPES = new Set(["follow", "episode", "article"]);

export async function POST(request: NextRequest) {
  try {
    // 1. 权限：内部脚本（x-internal-secret）或 ADMIN 会话（对齐 episode/create）
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.YUANLU_INTERNAL_SECRET) {
      const guard = await requireAdmin();
      if (!guard.ok) return guard.response;
    }

    const body = (await request.json()) as {
      scene?: unknown;
      targetType?: unknown;
      episodeId?: unknown;
      articleNo?: unknown;
      page?: unknown;
      envVersion?: unknown;
    };

    const scene = typeof body.scene === "string" ? body.scene.trim() : "";
    const targetType =
      typeof body.targetType === "string" ? body.targetType.trim() : "";
    const episodeId =
      typeof body.episodeId === "string" && body.episodeId.trim()
        ? body.episodeId.trim()
        : null;
    const articleNo =
      typeof body.articleNo === "string" && body.articleNo.trim()
        ? body.articleNo.trim()
        : null;
    const page =
      typeof body.page === "string" && body.page.trim()
        ? body.page.trim()
        : undefined;
    const envVersion =
      body.envVersion === "trial" || body.envVersion === "develop"
        ? body.envVersion
        : undefined;

    if (!SCENE_RE.test(scene)) {
      return NextResponse.json(
        { success: false, error: "scene 非法（^[A-Za-z0-9_.\\-]{1,32}$）" },
        { status: 400 },
      );
    }
    if (!TARGET_TYPES.has(targetType)) {
      return NextResponse.json(
        { success: false, error: "targetType 须为 follow | episode | article" },
        { status: 400 },
      );
    }
    if (targetType === "episode" && !episodeId) {
      return NextResponse.json(
        { success: false, error: "episode 类型必须提供 episodeId" },
        { status: 400 },
      );
    }

    // 2. 落库映射（幂等 upsert：同 scene 重新生成时允许更新目标）
    await prisma.qr_scene.upsert({
      where: { scene },
      update: { targetType, episodeId, articleNo },
      create: { scene, targetType, episodeId, articleNo },
    });

    // 3. 生成码图并存 OSS——bucket 为 RAM 私有策略（禁止 public-read，实测
    //    AccessDenied: Put public object acl is not allowed），私有 ACL 继承 +
    //    长时效签名 URL 分发，对齐频道封面的既有模式；gen-qr 客户端会下载落盘
    const buffer = await generateWxacodeBuffer(scene, { page, envVersion });
    const fileName = `wxacode/${scene}.jpg`;
    await uploadFile(buffer, fileName);
    const signedUrl = await generateSignatureUrl(fileName, 604800); // 7 天

    return NextResponse.json({
      success: true,
      data: { scene, fileUrl: signedUrl, fileName },
    });
  } catch (error) {
    console.error("wxacode generate error:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const scene = request.nextUrl.searchParams.get("scene")?.trim() ?? "";
    if (!SCENE_RE.test(scene)) {
      return NextResponse.json(
        { success: false, error: "scene 非法" },
        { status: 400 },
      );
    }

    const row = await prisma.qr_scene.findUnique({ where: { scene } });
    if (!row) {
      return NextResponse.json(
        { success: false, error: "短码不存在" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scene: row.scene,
        targetType: row.targetType,
        episodeId: row.episodeId,
        articleNo: row.articleNo,
      },
    });
  } catch (error) {
    console.error("wxacode resolve error:", error);
    return NextResponse.json(
      { success: false, error: "解析失败" },
      { status: 500 },
    );
  }
}
