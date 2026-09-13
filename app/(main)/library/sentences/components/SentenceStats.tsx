import Link from "next/link";
import {
  BookA,
  BrainCircuit,
  PlayCircle,
  Tag,
  TextQuote,
} from "lucide-react";

interface SentenceStatsProps {
  /** 收藏关键句总数 */
  sentenceCount: number;
  /** 已联动的生词本词汇数 */
  vocabCount: number;
  /** 分类标签数 */
  tagCount: number;
}

/**
 * 句子本头部：标题区 + 三张统计小卡 + 复习引导横幅。
 * 排版规范与生词本 VocabularyStats 完全对齐（同一套白色统计卡与墨绿横幅）。
 */
export function SentenceStats({
  sentenceCount,
  vocabCount,
  tagCount,
}: SentenceStatsProps) {
  return (
    <>
      {/* 1. 头部与统计面板 */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-end pb-6 gap-6">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold text-base-content flex items-center">
            <TextQuote
              className="mr-3 text-primary-600 dark:text-primary-400"
              size={32}
            />
            句子本
          </h1>
          <p className="text-base-content/60 mt-2 text-sm xl:text-base">
            沉浸式收集播客中的地道表达与长难句。原音精准截取，与生词本深度联动，支持随时开展
            AI 影子跟读与卡片复习。
          </p>
        </div>

        {/* 统计卡片：Mobile (<xl) 使用 Grid，Desktop (>=xl) 使用 Flex 行 */}
        <div className="w-full xl:w-auto">
          <div className="grid grid-cols-3 gap-2 xl:flex xl:gap-4 xl:overflow-x-auto">
            {/* 关键句 Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="text-primary-600 dark:text-primary-400 mb-1 xl:mb-0">
                <TextQuote size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  关键句
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {sentenceCount}
                </div>
              </div>
            </div>

            {/* 联动词汇 Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-warning/10 text-warning rounded-lg mb-1 xl:mb-0">
                <BookA size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  联动词汇
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {vocabCount}
                </div>
              </div>
            </div>

            {/* 分类标签 Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-white dark:bg-ink-900 px-2 py-3 xl:px-4 xl:py-3 rounded-lg xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-info/10 text-info-600 dark:text-info-400 rounded-lg mb-1 xl:mb-0">
                <Tag size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  分类标签
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {tagCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 卡片复习入口 */}
      <section className="grid grid-cols-1 gap-6">
        <div className="bg-primary-600 dark:bg-primary-900/40 rounded-lg p-6 xl:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 transition-colors">
          <div>
            <h2 className="text-xl xl:text-2xl font-bold flex items-center mb-2">
              <BrainCircuit className="mr-3 text-primary-300" />
              卡片复习已就绪
            </h2>
            <p className="text-white/80 max-w-lg text-sm xl:text-base">
              共收藏{" "}
              <span className="text-white font-bold">
                {sentenceCount} 个关键句
              </span>
              ，与生词本{" "}
              <span className="text-white font-bold">
                {vocabCount} 个词汇
              </span>{" "}
              深度联动，随时开始 AI 影子跟读与卡片复习。
            </p>
          </div>
          <Link
            href="/library/sentences/review"
            title="进入全屏滑动复习卡片模式"
            className="w-full sm:w-auto bg-white text-primary-600 px-8 py-3 rounded-lg font-bold hover:bg-ink-50 transition-all flex items-center justify-center shrink-0"
          >
            <PlayCircle className="mr-2" size={20} />
            卡片复习模式
          </Link>
        </div>
      </section>
    </>
  );
}
