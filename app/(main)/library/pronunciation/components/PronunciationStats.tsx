/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import {
  Mic,
  Target,
  Award,
  BrainCircuit,
  PlayCircle,
  CheckCircle,
  FileText,
  Trophy,
} from "lucide-react";

export function PronunciationStats({
  stats,
  errors,
  totalErrors,
}: {
  stats: any[];
  errors: any[];
  /** 弱项句子总数；非会员试用模式下 errors 为切片，统计需展示真实总量 */
  totalErrors?: number;
}) {
  const weakSentencesCount = totalErrors ?? errors.length;
  const weakestPhoneme = stats.length > 0 ? `/${stats[0].phoneme}/` : "-";
  const masteredPhonemesCount = stats.filter((s) => s.avgScore >= 85).length;

  return (
    <>
      {/* 1. 头部与统计面板 */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-end pb-6 gap-6">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold text-base-content flex items-center">
            <Mic className="mr-3 text-info-600 dark:text-info-400" size={32} />
            发音弱项本
          </h1>
          <p className="text-base-content/60 mt-2 text-sm xl:text-base">
            针对性攻克发音短板，提升口语地道程度。
          </p>
        </div>

        {/* 发音达人榜入口（社区功能，对所有用户开放） */}
        <Link
          href="/library/pronunciation/leaderboard"
          className="btn btn-sm rounded-full gap-1.5 border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning-700 dark:text-warning-400 self-start xl:self-end"
        >
          <Trophy size={16} />
          发音达人榜
        </Link>

        {/* 统计卡片：Mobile (<xl) 使用 Grid，Desktop (>=xl) 使用 Flex 行 */}
        <div className="w-full xl:w-auto">
          <div className="grid grid-cols-3 gap-2 xl:flex xl:gap-4 xl:overflow-x-auto">
            {/* Weak Sentences Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-warning/10 text-warning rounded-lg mb-1 xl:mb-0">
                <FileText size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  待复习句子
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {weakSentencesCount}
                </div>
              </div>
            </div>

            {/* Weakest Phoneme Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-error/10 text-error rounded-lg mb-1 xl:mb-0">
                <Target size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  最弱音素
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content font-mono">
                  {weakestPhoneme}
                </div>
              </div>
            </div>

            {/* Mastered Phonemes Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-success/10 text-success rounded-lg mb-1 xl:mb-0">
                <Award size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  已攻克音素
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {masteredPhonemesCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 复习入口 */}
      <section className="grid grid-cols-1 gap-6">
        {weakSentencesCount > 0 ? (
          <div className="bg-info-600 dark:bg-info-900/40 rounded-lg p-6 xl:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 transition-colors">
            <div>
              <h2 className="text-xl xl:text-2xl font-bold flex items-center mb-2">
                <BrainCircuit className="mr-3 text-info-300" />
                复习计划已就绪
              </h2>
              <p className="text-white/80 max-w-lg text-sm xl:text-base">
                针对你的发音短板，你有{" "}
                <span className="text-white font-bold">
                  {weakSentencesCount} 个弱项句子
                </span>{" "}
                需要复习。
              </p>
            </div>
            <Link
              href="/library/pronunciation/practice"
              className="w-full sm:w-auto bg-white text-info-600 px-8 py-3 rounded-lg font-bold hover:bg-ink-50 transition-all flex items-center justify-center shrink-0"
            >
              <PlayCircle className="mr-2" size={20} />
              开始闯关复习
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-ink-900 rounded-lg p-6 text-center text-base-content/60 transition-colors">
            <CheckCircle className="mx-auto mb-2 text-success" size={32} />
            <h3 className="font-medium text-base-content">全部完成了！</h3>
            <p className="text-sm">
              你做得很好，目前没有待复习的弱项句子。快去挑战新播客吧。
            </p>
          </div>
        )}
      </section>
    </>
  );
}
