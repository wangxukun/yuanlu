import React from "react";
import {
  TrophyIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

export default function AchievementsCard() {
  return (
    <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
      <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
        <TrophyIcon className="w-5 h-5 text-warning" />
        近期成就
      </h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-warning/10 p-2 rounded-full">
            <BookOpenIcon className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-base-content">
              Vocabulary Master
            </p>
            <p className="text-xs text-base-content/60">Learned 500 words</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-success/10 p-2 rounded-full">
            <ArrowTrendingUpIcon className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-base-content">
              Consistency King
            </p>
            <p className="text-xs text-base-content/60">7 day streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
