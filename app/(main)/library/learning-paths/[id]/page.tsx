import { auth } from "@/auth";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { notFound } from "next/navigation";
import LearningPathDetailClient from "@/components/main/library/learning-paths/LearningPathDetailClient";
import prisma from "@/lib/prisma";
import { Metadata } from "next";

// Next.js 15+ 动态路由参数类型定义
interface PageProps {
  params: Promise<{ id: string }>;
}

// 动态生成 Metadata
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const pathId = parseInt(id);
  if (isNaN(pathId)) return { title: "Learning Path Not Found" };

  // 1. 获取 Session
  const session = await auth();

  const path = await learningPathService.getById(pathId, session?.user?.userid);
  return {
    title: path ? `${path.pathName} | yuanlu` : "Learning Path",
    description: path?.description || "Learning path details",
  };
}

export default async function LearningPathDetailPage({ params }: PageProps) {
  const session = await auth();
  console.log("session USER ID: ", session?.user?.userid);

  // 关键修复：解包 Promise 参数
  const { id } = await params;
  const pathId = parseInt(id);

  if (isNaN(pathId)) return notFound();

  // 获取路径详情
  const rawPath = await learningPathService.getById(
    pathId,
    session?.user?.userid,
  );

  if (!rawPath) return notFound();

  // 额外获取创建者信息（因为 Service 中没有包含 User）
  let creatorName = "User";
  if (rawPath.userid) {
    const creator = await prisma.user.findUnique({
      where: { userid: rawPath.userid },
      include: { user_profile: true },
    });
    creatorName = creator?.user_profile?.nickname || "User";
  }

  // 转换数据结构以匹配 UI 组件
  const transformedPath = {
    pathid: rawPath.pathid,
    pathName: rawPath.pathName,
    description: rawPath.description,
    isPublic: rawPath.isPublic,
    userid: rawPath.userid,
    isOfficial: false, // 默认为 false，如有需要可根据 userId 判断
    creatorName: creatorName,
    itemCount: rawPath.items.length,
    coverUrl: rawPath.items[0]?.episode?.coverUrl || null, // 使用第一集的封面作为路径封面
    items: rawPath.items.map((item) => ({
      id: item.id,
      episode: {
        id: item.episodeid,
        title: item.episode.title,
        thumbnailUrl:
          item.episode.coverUrl || "/static/images/episode-dark.png",
        author: item.episode.podcast?.title || "",
        audioUrl: item.episode.audioUrl ?? "",
        duration: item.episode.duration,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-base-100">
      <LearningPathDetailClient
        path={transformedPath}
        currentUserId={session?.user?.userid}
      />
    </main>
  );
}
