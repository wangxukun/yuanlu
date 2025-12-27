"use client";

import React, { useEffect, useState } from "react";
import { AchievementItemDto } from "@/core/achievements/dto";
import { toast } from "sonner";

export default function AchievementsCard() {
  const [achievements, setAchievements] = useState<AchievementItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch("/api/user/achievements");
        if (res.ok) {
          const data = await res.json();
          setAchievements(data);
        }
      } catch (error) {
        console.error("Failed to fetch achievements", error);
        toast.error("加载成就失败");
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 min-h-[180px] animate-pulse">
        <div className="h-6 bg-base-200 w-24 rounded mb-6"></div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-base-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // 只展示前 8 个或者全部，这里根据布局展示所有，但在 Grid 里自适应
  // 为了美观，可以优先展示已解锁的
  const sortedAchievements = [...achievements].sort((a, b) => {
    // 已解锁的排前面
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return 0;
  });

  // 仅展示前 8 个 (2行) 用于卡片预览，防止过长
  const displayCount = 8;
  const displayList = sortedAchievements.slice(0, displayCount);

  return (
    <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base-content">
          我的成就 ({achievements.filter((a) => a.unlocked).length})
        </h3>
        <button
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
          onClick={() => toast.info("完整成就墙页面开发中...")}
        >
          全部查看
        </button>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-8 text-base-content/50 text-sm">
          暂无成就数据
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {displayList.map((achievement) => (
            <div
              key={achievement.key}
              className={`group relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 border transition-all duration-200 ${
                achievement.unlocked
                  ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                  : "bg-base-200/30 border-base-200 text-base-content/20 grayscale opacity-70"
              }`}
            >
              <span className="text-2xl sm:text-3xl mb-1 select-none">
                {achievement.icon}
              </span>

              {/* Tooltip via simple absolute positioning or DaisyUI tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral text-neutral-content text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                <div className="font-bold">{achievement.name}</div>
                <div className="text-[10px] opacity-90">
                  {achievement.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
