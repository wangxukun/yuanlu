// app/api/user/profile/route.ts

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateSignatureUrl, getBucketAcl, uploadFile } from "@/lib/oss";

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.userid) {
    console.error("Unauthorized", req);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      await getBucketAcl();

      updateData.avatarFileName = fileName;
      updateData.avatarUrl = avatarUrl;
    }

    // 更新数据库
    const updatedProfile = await prisma.user_profile.upsert({
      where: { userid: session.user.userid },
      update: updateData,
      create: {
        userid: session.user.userid,
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
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
