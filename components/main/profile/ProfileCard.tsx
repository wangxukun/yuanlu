import React from "react";
import Image from "next/image";
import {
  MapPinIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { UserProfile } from "@/core/user-profile/user-profile.entity";

// [新增] 难度映射表：将用户配置的粗粒度等级映射为剧集的细粒度 CEFR 标准
const LEVEL_MAPPING: Record<string, string> = {
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
  General: "未分级",
};

interface ProfileCardProps {
  profile: UserProfile;
  onEditClick: () => void;
}

export default function ProfileCard({
  profile,
  onEditClick,
}: ProfileCardProps) {
  return (
    <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
      <div className="p-6 text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-full border-4 border-base-100 shadow-lg mx-auto overflow-hidden bg-base-200">
            {profile.avatarUrl && profile.avatarUrl !== "default_avatar_url" ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserCircleIcon className="w-20 h-20 text-base-content/20" />
              </div>
            )}
          </div>
          <div
            className="absolute bottom-2 right-2 bg-success p-2 rounded-full border-2 border-base-100"
            title="Online"
          ></div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-base-content">
          {profile.nickname || "User"}
        </h1>
        <p className="text-sm font-medium bg-primary/10 text-primary py-1 px-3 rounded-full inline-block mt-2">
          {LEVEL_MAPPING[profile.learnLevel]}
        </p>

        <p className="mt-4 text-base-content/70 text-sm leading-relaxed px-4">
          {profile.bio}
        </p>

        <div className="mt-6 flex flex-col space-y-3 text-sm text-base-content/60">
          <div className="flex items-center justify-center space-x-2">
            <MapPinIcon className="w-4 h-4" />
            <span>中国</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <CalendarDaysIcon className="w-4 h-4" />
            <span>{profile.joinDate} 加入</span>
          </div>
        </div>

        <div className="mt-6 border-t border-base-200 pt-6">
          <button
            onClick={onEditClick}
            className="btn btn-primary w-full shadow-md shadow-primary/20"
          >
            编辑个人资料/学习目标
          </button>
        </div>
      </div>
    </div>
  );
}
