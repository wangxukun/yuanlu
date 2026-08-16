/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useRouter } from "next/navigation";
import { Target, Trophy, Activity, Lock } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

export function PronunciationList({
  stats,
  errors,
  isPremium = true,
  totalErrors,
}: {
  stats: any[];
  errors: any[];
  /** 会员为全量；非会员 errors 为试用切片，列表尾部渲染锁定卡片 */
  isPremium?: boolean;
  totalErrors?: number;
}) {
  const router = useRouter();
  const lockedCount =
    !isPremium && totalErrors !== undefined
      ? Math.max(0, totalErrors - errors.length)
      : 0;

  const chartData = stats.slice(0, 6).map((s) => ({
    phoneme: `/${s.phoneme}/`,
    score: s.avgScore,
    fullMark: 100,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Diagnostic Radar */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm h-full flex flex-col transition-colors">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Target size={20} />
            </div>
            <h2 className="text-lg font-bold text-base-content">
              薄弱音素诊断雷达
            </h2>
          </div>

          {chartData.length >= 3 ? (
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={chartData}
                >
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="phoneme"
                    tick={{ fill: "#6b7280", fontSize: 14, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [`${value}分`, "平均得分"]}
                  />
                  <Radar
                    name="音素平均分"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-base-100 dark:bg-ink-950 rounded-2xl">
              <Activity className="w-12 h-12 text-base-content/20 mb-3" />
              <p className="text-base-content/60 font-medium">数据积累中</p>
              <p className="text-xs text-base-content/40 mt-1">
                完成更多评测即可解锁雷达图
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Error Notebook List */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-warning/10 rounded-lg text-warning-600">
              <Trophy size={20} />
            </div>
            <h2 className="text-lg font-bold text-base-content">
              待复习弱项句子
            </h2>
          </div>

          {errors.length > 0 ? (
            <div className="space-y-4">
              {errors.map((record) => (
                <div
                  key={record.recognitionid}
                  onClick={() =>
                    router.push(
                      `/episode/${record.episodeid}?practice=true&subtitleId=${record.subtitleId}`,
                    )
                  }
                  className="p-4 rounded-2xl border border-base-200/80 dark:border-ink-800 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-md transition-all group flex items-center gap-4 bg-base-50/30 dark:bg-ink-950/30 cursor-pointer"
                >
                  {record.episode?.coverUrl && (
                    <div className="w-36 aspect-video rounded-lg overflow-hidden shrink-0 bg-base-200 hidden sm:block">
                      <img
                        src={record.episode.coverUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-base-content/40 mb-1 truncate">
                      {record.episode?.title || "未知播客"}
                    </div>
                    <p className="text-lg font-medium text-base-content mb-2 leading-relaxed truncate">
                      {record.targetText}
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          record.overallScore >= 80
                            ? "bg-success/10 text-success-700"
                            : record.overallScore >= 60
                              ? "bg-warning/10 text-warning-700"
                              : "bg-error/10 text-error-700"
                        }`}
                      >
                        上次得分: {Math.round(record.overallScore)}
                      </span>
                      <span className="text-base-content/40 font-medium text-xs">
                        {new Date(record.recognitionDate).toLocaleDateString(
                          "zh-CN",
                          { year: "numeric", month: "long", day: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 非会员试用：剩余弱项句子锁定卡片 */}
              {lockedCount > 0 && (
                <div
                  onClick={() =>
                    useUIStore
                      .getState()
                      .openPremiumModal("pronunciation_locked")
                  }
                  className="p-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-4 cursor-pointer"
                >
                  <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                    <Lock size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-base-content">
                      还有 {lockedCount} 条弱项句子待攻克
                    </p>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      解锁 PRO 会员查看完整弱项本，开始针对性循环练习
                    </p>
                  </div>
                  <span className="btn btn-primary bg-primary-600 text-white shadow-lg shadow-primary/20 btn-sm rounded-full shrink-0 border-0">
                    解锁
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-base-100 dark:bg-ink-950 rounded-2xl">
              <p className="text-lg font-bold text-base-content/60">太棒了！</p>
              <p className="text-base-content/40 mt-1">
                您目前没有待复习的弱项句子
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
