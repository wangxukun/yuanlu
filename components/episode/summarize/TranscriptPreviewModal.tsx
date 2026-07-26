import { X, Sparkles, Crown } from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { UseEpisodeSummarizeReturn } from "./useEpisodeSummarize";

export function TranscriptPreviewModal({
  episode,
  hookOptions,
}: {
  episode: Episode;
  hookOptions: UseEpisodeSummarizeReturn;
}) {
  const {
    isTranscriptPreviewOpen,
    setIsTranscriptPreviewOpen,
    transcriptPreview,
    router,
  } = hookOptions;

  if (!isTranscriptPreviewOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-350">
      <div
        className="absolute inset-0 bg-base-300/80 backdrop-blur-md cursor-pointer"
        onClick={() => setIsTranscriptPreviewOpen(false)}
      ></div>

      <div className="relative bg-base-100 rounded-[2.5rem] p-6 sm:p-10 max-w-lg w-full border border-base-250/60 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => setIsTranscriptPreviewOpen(false)}
          className="absolute right-6 top-6 p-2 rounded-xl text-base-content opacity-40 hover:opacity-100 hover:bg-base-200 transition-colors active:scale-95"
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {/* Glowing Label / Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 w-fit mb-4">
          <Sparkles size={12} className="fill-current animate-pulse" /> 文稿预览
        </div>

        {/* ── PDF Page Replica ── */}
        <div className="relative rounded-xl overflow-hidden mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-ink-200 dark:border-ink-600">
          <div
            className="bg-white select-none"
            style={{ aspectRatio: "595 / 560" }}
          >
            <div className="px-[9.4%] pt-[3%] pb-[8.3%] h-full flex flex-col">
              {/* ── Page Header ── */}
              <div className="flex justify-between items-baseline mb-1">
                <span
                  className="text-[0.55rem] sm:text-[0.65rem] font-medium truncate"
                  style={{ color: "#003366" }}
                >
                  远路播客 |{" "}
                  {transcriptPreview?.podcastTitle ||
                    episode.podcast?.title ||
                    "远路播客"}
                </span>
                <span
                  className="text-[0.45rem] sm:text-[0.5rem] font-medium flex-shrink-0 ml-2"
                  style={{ color: "#666" }}
                >
                  AI翻译 仅供参考
                </span>
              </div>
              <div className="h-[0.5px] bg-ink-300 mb-3 sm:mb-4"></div>

              {/* ── Title Block with Cover ── */}
              <div className="flex items-start gap-2 sm:gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[0.7rem] sm:text-[0.8rem] font-bold leading-snug mb-0.5"
                    style={{ color: "#212121" }}
                  >
                    {transcriptPreview?.podcastTitle ||
                      episode.podcast?.title ||
                      "远路播客"}
                  </p>
                  <p
                    className="text-[0.6rem] sm:text-[0.7rem] font-semibold leading-snug break-words"
                    style={{ color: "#003366" }}
                  >
                    {transcriptPreview?.episodeTitle || episode.title}
                  </p>
                </div>
                {(transcriptPreview?.coverUrl || episode.coverUrl) && (
                  <img
                    src={transcriptPreview?.coverUrl || episode.coverUrl}
                    alt=""
                    className="w-14 sm:w-[70px] aspect-video rounded object-cover flex-shrink-0"
                  />
                )}
              </div>
              <div className="h-[1px] bg-ink-700 my-1.5 sm:my-2"></div>

              {/* ── Transcript Blocks (max 4) ── */}
              <div className="flex-1 space-y-2.5 sm:space-y-3 mt-1">
                {transcriptPreview?.subtitles &&
                transcriptPreview.subtitles.length > 0 ? (
                  transcriptPreview.subtitles.map(
                    (sub: { textEn: string; textZh: string }, i: number) => (
                      <div key={i}>
                        <p
                          className="text-[0.6rem] sm:text-[0.65rem] leading-relaxed"
                          style={{
                            color: "#000",
                            fontFamily: "'Roboto', serif",
                          }}
                        >
                          {sub.textEn}
                        </p>
                        <p
                          className="text-[0.5rem] sm:text-[0.55rem] leading-relaxed mt-0.5"
                          style={{
                            color: "rgba(0,0,0,0.75)",
                            fontFamily: "'Noto Sans SC', sans-serif",
                          }}
                        >
                          {sub.textZh}
                        </p>
                      </div>
                    ),
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[0.6rem]" style={{ color: "#999" }}>
                      暂无预览数据
                    </span>
                  </div>
                )}
              </div>

              {/* ── Page Footer ── */}
              <div className="mt-auto pt-1">
                <div className="h-[0.4px] bg-ink-300 mb-1"></div>
                <div className="flex justify-between">
                  <span
                    className="text-[0.4rem] sm:text-[0.42rem]"
                    style={{ color: "#666" }}
                  >
                    远路播客&nbsp;&nbsp;&nbsp;&nbsp;wxkzd.com
                  </span>
                  <span
                    className="text-[0.4rem] sm:text-[0.42rem]"
                    style={{ color: "#666" }}
                  >
                    共{" "}
                    {transcriptPreview
                      ? Math.max(
                          1,
                          1 +
                            Math.ceil(
                              Math.max(
                                0,
                                transcriptPreview.totalSubtitles - 8,
                              ) / 12,
                            ),
                        )
                      : 1}{" "}
                    页，第 1 页
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gaussian blur gradient mask over bottom portion */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-base-100 via-base-100/85 to-transparent pointer-events-none"></div>
        </div>

        {/* Intercept Card with Sincere Advocacy */}
        <div className="bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-2xl p-6 border border-primary-500/10 text-center space-y-4 relative">
          <div className="w-10 h-10 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm shadow-primary-500">
            <Crown size={20} className="animate-pulse" />
          </div>
          <h4 className="text-lg font-black text-primary-950 dark:text-primary-300">
            这里是会员专享内容
          </h4>

          <p className="text-xs sm:text-sm text-base-content opacity-75 leading-relaxed font-semibold px-2">
            为了支持网站长期高质量运转，此内容仅向赞助会员开放。如果您喜欢这里的内容，欢迎加入我们的会员社区，享受专属权益。
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setIsTranscriptPreviewOpen(false);
                router.push("/auth/subscribe");
              }}
              className="flex-1 btn btn-primary h-11 min-h-[44px] rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              去看看赞助方案
            </button>
            <button
              onClick={() => setIsTranscriptPreviewOpen(false)}
              className="btn btn-ghost h-11 min-h-[44px] rounded-xl text-xs font-bold text-base-content opacity-50 hover:bg-base-200 opacity-50 transition-colors"
            >
              暂不需要
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
