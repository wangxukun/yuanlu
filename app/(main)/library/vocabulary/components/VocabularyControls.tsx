import { Search } from "lucide-react";
import { UseVocabularyNotebookReturn } from "../hooks/useVocabularyNotebook";

export function VocabularyControls({
  hookOptions,
}: {
  hookOptions: UseVocabularyNotebookReturn;
}) {
  const { searchQuery, setSearchQuery, sortMethod, setSortMethod } =
    hookOptions;

  return (
    <div className="flex flex-col gap-4 bg-white/95 dark:bg-ink-900/95 backdrop-blur-xl p-3 rounded-xl transition-colors sticky top-0 md:top-20 z-30 xl:static shadow-sm border border-base-200 dark:border-ink-800">
      {/* 状态切换 Tab */}
      <div className="flex items-center space-x-1 border-b border-base-200/50 pb-2">
        <button
          onClick={() => hookOptions.setFilterStatus("LEARNING")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            hookOptions.filterStatus === "LEARNING"
              ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              : "text-base-content/60 hover:bg-ink-50 dark:hover:bg-ink-800"
          }`}
        >
          学习中
        </button>
        <button
          onClick={() => hookOptions.setFilterStatus("MASTERED")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            hookOptions.filterStatus === "MASTERED"
              ? "bg-success/10 text-success dark:bg-success/20 dark:text-success-400"
              : "text-base-content/60 hover:bg-ink-50 dark:hover:bg-ink-800"
          }`}
        >
          已掌握
        </button>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="relative w-full xl:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-4 py-2 bg-ink-50 dark:bg-ink-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm text-base-content placeholder-base-content/40 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
          <span className="text-xs font-semibold text-base-content/40 uppercase mr-1 whitespace-nowrap hidden xl:inline">
            排序:
          </span>
          <div className="flex w-full xl:w-auto gap-2">
            {[
              { id: "review", label: "复习时间" },
              { id: "added", label: "添加时间" },
              { id: "alpha", label: "A-Z" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  setSortMethod(opt.id as "review" | "added" | "alpha")
                }
                className={`flex-1 xl:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  sortMethod === opt.id
                    ? "bg-primary-600 dark:bg-primary-500 text-white shadow-sm"
                    : "text-base-content/60 hover:bg-ink-50 dark:hover:bg-ink-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
