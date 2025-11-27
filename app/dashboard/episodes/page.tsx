import React from "react";
import EpisodeTable from "@/components/dashboard/episodes/EpisodeTable";
import { MicIcon } from "@/components/dashboard/episodes/Icons";
import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export default async function Page() {
  const result = await fetch(`${baseUrl}/api/episode/management-list`);
  const episodeManagementItems = await result.json();
  return (
    <main className="flex-1 overflow-y-auto scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Overview (Optional Mini Dashboard) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "总单集数",
              value: "1,284",
              change: "+12%",
              color: "text-primary",
            },
            {
              label: "本周播放",
              value: "45.2k",
              change: "+5.4%",
              color: "text-emerald-600",
            },
            {
              label: "新增订阅",
              value: "892",
              change: "+2.1%",
              color: "text-amber-600",
            },
            {
              label: "平均完播率",
              value: "68%",
              change: "-0.5%",
              color: "text-rose-600",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col"
            >
              <span className="text-xs text-slate-500 font-medium mb-1">
                {stat.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </span>
                <span
                  className={`text-xs font-medium bg-slate-50 px-2 py-1 rounded-md ${stat.color}`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Table Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
              全部 (1284)
            </button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
              已发布 (1020)
            </button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
              审核中 (24)
            </button>
          </div>
          <Link
            href="/dashboard/episodes/contribute"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <MicIcon size={16} />
            投稿
          </Link>
        </div>

        {/* Data Table */}
        <EpisodeTable episodeManagementItems={episodeManagementItems} />
      </div>
    </main>
  );
}
