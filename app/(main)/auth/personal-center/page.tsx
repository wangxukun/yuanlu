"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatDate } from "@/lib/tools";

// 引入拆分的组件
import { UserProfile } from "@/core/user-profile/user-profile.entity";
import EditProfileModal from "@/components/main/profile/EditProfileModal";
import ProfileCard from "@/components/main/profile/ProfileCard";
import AchievementsCard from "@/components/main/profile/AchievementsCard";
import StatsOverview from "@/components/main/profile/StatsOverview";
import ActivityChart from "@/components/main/profile/ActivityChart";
import RecentHistory from "@/components/main/profile/RecentHistory";

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
          bio: data.bio || "用户尚未填写个人简介",
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
        ...session,
        user: {
          ...session?.user,
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
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 pb-12">
      {/* Edit Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={profile}
        onSave={handleUpdateProfile}
      />

      {/* Header Background */}
      <div className="h-48 bg-gradient-to-r from-primary to-secondary w-full relative">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Card & Achievements */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard
              profile={profile}
              onEditClick={() => setIsEditModalOpen(true)}
            />
            <AchievementsCard />
          </div>

          {/* Right Column: Stats, Chart & History */}
          <div className="lg:col-span-2 space-y-6">
            <StatsOverview />
            <ActivityChart />
            <RecentHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
