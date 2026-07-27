"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatDate } from "@/lib/tools";

import { UserProfile } from "@/core/user-profile/user-profile.entity";
import EditProfileModal from "@/components/main/profile/EditProfileModal";
import AchievementsCard from "@/components/main/profile/AchievementsCard";
import StatsOverview from "@/components/main/profile/StatsOverview";
import ActivityChart from "@/components/main/profile/ActivityChart";
import MilestoneRoadmap from "@/components/main/profile/MilestoneRoadmap";
import RecentHistory from "@/components/main/profile/RecentHistory";
import Image from "next/image";
import { UserCircleIcon } from "@heroicons/react/24/outline";

export default function PersonalCenterPage() {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    userid: "",
    nickname: "",
    avatarUrl: "",
    avatarFileName: "",
    bio: "",
    learnLevel: "中级",
    joinDate: new Date().toLocaleDateString(),
    dailyStudyGoalMins: 20,
    weeklyListeningGoalHours: 2,
    weeklyWordsGoal: 50,
    user: undefined,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "journey" | "achievements" | "history"
  >("journey");

  const LEVEL_MAPPING: Record<string, string> = {
    Beginner: "初级",
    Intermediate: "中级",
    Advanced: "高级",
    General: "未分级",
  };

  // 获取数据
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          userid: data.userid,
          nickname: data.nickname || session?.user?.name || "User",
          avatarUrl: data.avatarUrl || session?.user?.image || "",
          avatarFileName: data.avatarFileName || "",
          bio: data.bio || "路虽远行则将至，事虽难做则可成。",
          learnLevel: data.learnLevel || "中级",
          joinDate: formatDate(data.User.createAt.toString()),
          dailyStudyGoalMins: data.dailyStudyGoalMins || 20,
          weeklyListeningGoalHours: data.weeklyListeningGoalHours || 2,
          weeklyWordsGoal: data.weeklyWordsGoal || 50,
          user: undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("加载个人资料失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Update failed");
      const result = await res.json();

      // 更新本地 Session
      await updateSession({
        // ...session,
        user: {
          // ...session?.user,
          nickname: result.data.nickname,
          avatarUrl: result.data.avatarUrl,
          avatarFileName: result.data.avatarFileName,
        },
      });

      toast.success("设置已更新");
      fetchProfile(); // 刷新数据以更新 UI
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("更新失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-ink-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 pb-12">
      {/* Edit Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={profile}
        onSave={handleUpdateProfile}
      />

      {/* 头部身份区 */}
      <div className="bg-white dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800 shadow-sm pt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-8">
            {/* 头像与信息 */}
            <div className="flex flex-row items-start sm:items-center gap-4 sm:gap-6 flex-1">
              {/* 头像 */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-e2 border-4 border-white dark:border-ink-800 bg-ink-100 flex-shrink-0">
                {profile.avatarUrl &&
                profile.avatarUrl !== "default_avatar_url" ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.nickname}
                    width={112}
                    height={112}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-300">
                    <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-3 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink-900 dark:text-ink-100 truncate">
                    {profile.nickname || "User"}
                  </h1>
                  <div className="inline-flex items-center gap-1 bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold border border-accent-200 dark:border-accent-800 self-start sm:self-auto w-fit">
                    <span className="material-symbols-outlined text-[14px]">
                      hiking
                    </span>
                    <span>
                      远行客 ·{" "}
                      {LEVEL_MAPPING[profile.learnLevel] || profile.learnLevel}
                    </span>
                  </div>
                </div>
                <p className="text-ink-500 dark:text-ink-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  {profile.bio}
                </p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-ink-400">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      calendar_month
                    </span>
                    <span>{formatDate(profile.joinDate)} 加入</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      location_on
                    </span>
                    <span>中国</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作 */}
            <div className="flex justify-end mt-2 md:mt-0">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full sm:w-auto px-6 h-10 rounded-xl border border-ink-200 dark:border-ink-700 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors shadow-sm"
              >
                编辑资料
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 md:space-x-8 border-t border-transparent translate-y-[1px] overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("journey")}
              className={`pb-4 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
                activeTab === "journey"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
              }`}
            >
              旅程数据
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`pb-4 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
                activeTab === "achievements"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
              }`}
            >
              里程碑
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-4 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
                activeTab === "history"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
              }`}
            >
              最近听过
            </button>
          </div>
        </div>
      </div>

      {/* 选项卡内容区 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {activeTab === "journey" && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StatsOverview />
            <ActivityChart />
          </div>
        )}
        {activeTab === "achievements" && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <MilestoneRoadmap />
            <AchievementsCard />
          </div>
        )}
        {activeTab === "history" && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RecentHistory />
          </div>
        )}
      </div>
    </div>
  );
}
