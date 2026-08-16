"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trophy, Loader2, Medal, ArrowLeft, Crown } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  userid: string;
  nickname: string;
  avatar: string;
  evalCount: number;
  avgScore: number;
}

interface MyRank {
  rank: number;
  evalCount: number;
  avgScore: number;
}

type Period = "weekly" | "daily";
type Metric = "score" | "count";

const RANK_STYLES = ["text-yellow-500", "text-gray-400", "text-amber-600"];

/**
 * 发音达人排行榜（VOICE-EVALUATION 阶段四·任务2）。
 * 周期（近7天/今日）与指标（平均分/练习次数）可切换，底部固定展示我的排名。
 */
export default function LeaderboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("weekly");
  const [metric, setMetric] = useState<Metric>("score");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async (p: Period, m: Metric) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/speech/leaderboard?period=${p}&metric=${m}`,
      );
      if (res.status === 401) {
        toast.error("请先登录后查看排行榜");
        setEntries([]);
        setMe(null);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries);
        setMe(json.data.me);
      }
    } catch {
      toast.error("排行榜加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard(period, metric);
  }, [period, metric, fetchBoard]);

  const metricLabel =
    metric === "score" ? "平均综合分（≥5次评测）" : "练习次数";

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/library/pronunciation")}
            className="btn btn-circle btn-ghost"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
              <div className="p-1.5 bg-warning/10 text-warning-600 rounded-lg">
                <Trophy size={22} />
              </div>
              发音达人榜
            </h1>
            <p className="text-xs text-base-content/50 mt-1">
              榜单按{metricLabel}排名
            </p>
          </div>
        </div>

        {/* 切换器 */}
        <div className="flex flex-wrap gap-2">
          <div className="join">
            {(
              [
                ["weekly", "近 7 天"],
                ["daily", "今日"],
              ] as [Period, string][]
            ).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`join-item btn btn-sm rounded-xl font-bold ${
                  period === p
                    ? "btn-primary"
                    : "btn-ghost bg-base-100 border-base-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="join">
            {(
              [
                ["score", "平均分榜"],
                ["count", "勤奋榜"],
              ] as [Metric, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`join-item btn btn-sm rounded-xl font-bold ${
                  metric === m
                    ? "btn-secondary"
                    : "btn-ghost bg-base-100 border-base-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 榜单 */}
        <div className="bg-white dark:bg-ink-900 rounded-2xl border border-base-200/60 dark:border-ink-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-base-content/50 font-medium">
                本周期暂无上榜记录
              </p>
              <p className="text-xs text-base-content/40 mt-1">
                完成语音评测即可上榜
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-base-200/60 dark:divide-ink-800">
              {entries.map((entry, index) => (
                <li
                  key={entry.userid}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-base-100/60 transition-colors"
                >
                  <div className="w-8 text-center font-black text-base-content/60">
                    {index < 3 ? (
                      index === 0 ? (
                        <Crown size={20} className="mx-auto text-yellow-500" />
                      ) : (
                        <Medal
                          size={20}
                          className={`mx-auto ${RANK_STYLES[index]}`}
                        />
                      )
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      <Image
                        src={entry.avatar}
                        alt={entry.nickname}
                        width={40}
                        height={40}
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 font-bold text-sm text-base-content truncate">
                    {entry.nickname}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-primary">
                      {metric === "score"
                        ? `${entry.avgScore} 分`
                        : `${entry.evalCount} 次`}
                    </span>
                    <span className="block text-[10px] text-base-content/40">
                      {metric === "score"
                        ? `${entry.evalCount} 次评测`
                        : `平均 ${entry.avgScore} 分`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 我的排名 */}
        {me && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-2xl font-black text-primary">#{me.rank}</span>
            <div>
              <p className="font-bold text-sm text-base-content">我的排名</p>
              <p className="text-xs text-base-content/60">
                {me.evalCount} 次评测 · 平均 {me.avgScore} 分
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
