import {
  BookOpen,
  Clock,
  Award,
  BrainCircuit,
  PlayCircle,
  CheckCircle,
} from "lucide-react";
import { UseVocabularyNotebookReturn } from "../hooks/useVocabularyNotebook";

export function VocabularyStats({
  hookOptions,
}: {
  hookOptions: UseVocabularyNotebookReturn;
}) {
  const { stats, startReview } = hookOptions;

  return (
    <>
      {/* 1. 头部与统计面板 */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-end pb-6 gap-6">
        <div>
          <h1
            className="text-2xl xl:text-3xl font-bold text-base-content flex items-center"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <BookOpen
              className="mr-3 text-indigo-600 dark:text-indigo-400"
              size={32}
            />
            生词本
          </h1>
          <p className="text-base-content/60 mt-2 text-sm xl:text-base">
            管理你的生词收藏并进行科学的间隔复习。
          </p>
        </div>

        {/* 统计卡片：Mobile (<xl) 使用 Grid，Desktop (>=xl) 使用 Flex 行 */}
        <div className="w-full xl:w-auto">
          <div className="grid grid-cols-3 gap-2 xl:flex xl:gap-4 xl:overflow-x-auto">
            {/* Total Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-slate-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-slate-50 dark:bg-slate-950 text-base-content/60 rounded-lg mb-1 xl:mb-0">
                <BookOpen size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  总计
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.total}
                </div>
              </div>
            </div>

            {/* Due Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-slate-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-warning/10 text-warning rounded-lg mb-1 xl:mb-0">
                <Clock size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  待复习
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.due}
                </div>
              </div>
            </div>

            {/* Mastered Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-slate-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-success/10 text-success rounded-lg mb-1 xl:mb-0">
                <Award size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  已掌握
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.mastered}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 复习入口 (SRS) */}
      <section className="grid grid-cols-1 gap-6">
        {stats.due > 0 ? (
          <div className="bg-indigo-600 dark:bg-indigo-900/40 rounded-lg p-6 xl:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 transition-colors">
            <div>
              <h2 className="text-xl xl:text-2xl font-bold flex items-center mb-2">
                <BrainCircuit className="mr-3 text-indigo-300" />
                复习计划已就绪
              </h2>
              <p className="text-white/80 max-w-lg text-sm xl:text-base">
                根据遗忘曲线，你有{" "}
                <span className="text-white font-bold">{stats.due} 个生词</span>{" "}
                需要复习。
              </p>
            </div>
            <button
              onClick={startReview}
              className="w-full sm:w-auto bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center shrink-0"
            >
              <PlayCircle className="mr-2" size={20} />
              开始复习
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 text-center text-base-content/60 transition-colors">
            <CheckCircle className="mx-auto mb-2 text-success" size={32} />
            <h3 className="font-medium text-base-content">全部完成了！</h3>
            <p className="text-sm">
              你做得很好，今日复习任务已清空。快去听播客添加新词吧。
            </p>
          </div>
        )}
      </section>
    </>
  );
}
