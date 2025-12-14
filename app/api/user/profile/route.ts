import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateSignatureUrl, getBucketAcl, uploadFile } from "@/lib/oss";

// 获取用户个人资料
export async function GET(req: Request) {
  console.log("[GET /api/user/profile]", req);
  const session = await auth();
  if (!session?.user?.userid) {
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

interface ProfileData {
  nickname: string | null;
  bio: string | null;
  learnLevel: string | null;
  avatarFileName?: string | null;
  avatarUrl?: string | null;
}
// 更新用户个人资料（含头像上传）
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const nickname = formData.get("nickname") as string;
    const bio = formData.get("bio") as string;
    const learnLevel = formData.get("learnLevel") as string;
    const file = formData.get("avatar") as File | null;

    const updateData: ProfileData = {
      nickname: nickname || null,
      bio: bio || null,
      learnLevel: learnLevel || null,
    };

    // 处理头像上传
    if (file && file.size > 0) {
      // 1. 生成唯一文件名 (保留扩展名)
      const timestamp = Date.now();
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      // 2. 指定上传目录
      const fileName = `yuanlu/avator/${timestamp}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;
      // 3. 上传到阿里云 OSS
      const { fileUrl: avatarUrl } = await uploadFile(buffer, fileName);
      await getBucketAcl();

      // 4. 记录到数据库的数据
      updateData.avatarFileName = fileName;
      updateData.avatarUrl = avatarUrl;
    }

    // 更新或创建 user_profile
    const updatedProfile = await prisma.user_profile.upsert({
      where: { userid: session.user.userid },
      update: updateData,
      create: {
        userid: session.user.userid,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
