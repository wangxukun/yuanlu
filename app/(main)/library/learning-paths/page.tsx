import { auth } from "@/auth";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { redirect } from "next/navigation";
import LearningPathsClient from "@/components/main/library/learning-paths/LearningPathsClient";
import { LearningPath } from "@/components/main/library/learning-paths/LearningPathCard";

export const metadata = {
  title: "学习路径 | 远路播客",
};

export default async function LearningPathsPage() {
  const session = await auth();
  if (!session?.user?.userid) {
    redirect("/");
  }

  // 并行获取数据
  const [myPaths, publicPaths] = (await Promise.all([
    learningPathService.listWithDetails(session.user.userid),
    learningPathService.listPublic(session.user.userid),
  ])) as [LearningPath[], LearningPath[]];

  return (
    // 使用 bg-base-200 适配模式切换
    <div className="min-h-screen bg-base-200/50 pb-20 transition-colors duration-300">
      <LearningPathsClient myPaths={myPaths} publicPaths={publicPaths} />
    </div>
  );
}
