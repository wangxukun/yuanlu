// app/api/user/profile/route.ts

import { requireAuth } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateSignatureUrl, uploadFile } from "@/lib/oss";

// --- Types ---
// 定义 ProfileData 接口以包含学习目标
interface ProfileData {
  nickname: string | null;
  bio: string | null;
  learnLevel: string | null;
  // [新增] 学习目标字段
  dailyStudyGoalMins?: number;
  weeklyListeningGoalHours?: number;
  weeklyWordsGoal?: number;
  avatarFileName?: string | null;
  avatarUrl?: string | null;
}

export async function GET() {
  // requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  const profile = await prisma.user_profile.findUnique({
    where: { userid: session.user.userid },
    include: {
      User: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 这里的 typeof profile 已经自动包含了 Schema 中新增的字段（只要你跑了 prisma generate）
  type UserProfileWithAvatar = typeof profile & {
    avatarFileName?: string | null;
  };

  const safeProfile = profile as UserProfileWithAvatar;

  const profileWithSignature = {
    ...safeProfile,
    avatarUrl: safeProfile.avatarFileName
      ? await generateSignatureUrl(safeProfile.avatarFileName, 3600 * 3)
      : null,
  };

  return NextResponse.json(profileWithSignature);
}

// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
export async function PUT(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  try {
    const formData = await req.formData();

    // 提取基础信息
    const nickname = formData.get("nickname") as string;
    const bio = formData.get("bio") as string;
    const learnLevel = formData.get("learnLevel") as string;

    // [新增] 提取学习目标 (注意类型转换)
    const dailyGoal = formData.get("dailyStudyGoalMins");
    const weeklyListening = formData.get("weeklyListeningGoalHours");
    const weeklyWords = formData.get("weeklyWordsGoal");

    const file = formData.get("avatar") as File | null;

    const updateData: ProfileData = {
      nickname: nickname || null,
      bio: bio || null,
      learnLevel: learnLevel || null,
    };

    // [新增] 只有当字段存在时才更新，并确保转换为数字
    if (dailyGoal)
      updateData.dailyStudyGoalMins = parseInt(dailyGoal.toString(), 10);
    if (weeklyListening)
      updateData.weeklyListeningGoalHours = parseInt(
        weeklyListening.toString(),
        10,
      );
    if (weeklyWords)
      updateData.weeklyWordsGoal = parseInt(weeklyWords.toString(), 10);

    // 处理头像上传
    if (file && file.size > 0) {
      const timestamp = Date.now();
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `yuanlu/avatar/${timestamp}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;

      const { fileUrl: avatarUrl } = await uploadFile(buffer, fileName);

      updateData.avatarFileName = fileName;
      updateData.avatarUrl = avatarUrl;
    }

    // 更新数据库（默认值兜底与签名头像回包见 persistProfileUpdate）
    return persistProfileUpdate(session.user.userid, updateData);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * 小程序端保存资料的两条链路都以 POST 进（wx.uploadFile 无 method 参数只能 POST；
 * 纯文本保存走 wx.request JSON——uploadFile 必须带文件，无法只发表单字段）：
 * - multipart/form-data → 复用 PUT 同一处理器（含头像分片与 objectKey 生成），Web/Android 不受影响；
 * - application/json    → 字段同构、无头像分支，复用同一持久化与回包。
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return PUT(req);
  }

  // requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  try {
    const body = await req.json();
    const updateData: ProfileData = {
      nickname: body.nickname || null,
      bio: body.bio || null,
      learnLevel: body.learnLevel || null,
    };

    // 与 PUT 的 formData 分支同口径：只有当字段存在时才更新，并确保转换为数字
    if (body.dailyStudyGoalMins) {
      updateData.dailyStudyGoalMins = parseInt(body.dailyStudyGoalMins, 10);
    }
    if (body.weeklyListeningGoalHours) {
      updateData.weeklyListeningGoalHours = parseInt(
        body.weeklyListeningGoalHours,
        10,
      );
    }
    if (body.weeklyWordsGoal) {
      updateData.weeklyWordsGoal = parseInt(body.weeklyWordsGoal, 10);
    }

    return persistProfileUpdate(session.user.userid, updateData);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** upsert user_profile 并回带 3 小时签名头像（PUT 与 POST(JSON) 共用收尾） */
async function persistProfileUpdate(userid: string, updateData: ProfileData) {
  const updatedProfile = await prisma.user_profile.upsert({
    where: { userid: userid },
    update: updateData,
    create: {
      userid: userid,
      ...updateData,
      // 如果是创建，确保目标有默认值 (Schema 中已有 default，但显式写更安全)
      dailyStudyGoalMins: updateData.dailyStudyGoalMins ?? 30,
      weeklyListeningGoalHours: updateData.weeklyListeningGoalHours ?? 5,
      weeklyWordsGoal: updateData.weeklyWordsGoal ?? 50,
    },
  });

  // 重新生成签名 URL 返回给前端
  type UserProfileWithAvatar = typeof updatedProfile & {
    avatarFileName?: string | null;
  };
  const safeProfile = updatedProfile as UserProfileWithAvatar;
  const profileWithSignature = {
    ...safeProfile,
    avatarUrl: safeProfile.avatarFileName
      ? await generateSignatureUrl(safeProfile.avatarFileName, 3600 * 3)
      : null,
  };

  return NextResponse.json({ success: true, data: profileWithSignature });
}
