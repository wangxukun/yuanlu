"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { usePlayerStore } from "@/store/player-store";
import {
  PlayCircleIcon,
  PlusCircleIcon,
  LanguageIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { Episode } from "@/core/episode/episode.entity";

interface MergedSubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  textEn: string;
  textZh: string;
}

interface InteractiveTranscriptProps {
  subtitles: MergedSubtitleItem[];
  episode: Episode; // [修改] 接收完整对象
}

function parseTimeStr(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;

  let seconds = 0;
  let minutes = 0;
  let hours = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2].replace(",", "."));
  } else {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1].replace(",", "."));
  }
  return hours * 3600 + minutes * 60 + seconds;
}

export default function InteractiveTranscript({
  subtitles,
  episode,
}: InteractiveTranscriptProps) {
  // 1. 获取播放器状态
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const audioRef = usePlayerStore((state) => state.audioRef);
  const pause = usePlayerStore((state) => state.pause);

  // [新增] 获取当前正在播放的剧集，用于比对
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const setCurrentEpisode = usePlayerStore((state) => state.setCurrentEpisode);
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );
  const play = usePlayerStore((state) => state.play);
  // 判断：当前页面显示的剧集，是否就是正在播放的剧集？
  const isPlayingThisEpisode = currentEpisode?.episodeid === episode.episodeid;

  // 2. 数据处理
  const processedSubtitles = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
      start: parseTimeStr(item.startTime),
      end: parseTimeStr(item.endTime),
    }));
  }, [subtitles]);

  // 3. 状态管理
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showTranslation, setShowTranslation] = useState(true);

  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 弹窗状态
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedTranslation, setSelectedTranslation] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [definition, setDefinition] = useState("");
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);

  const [wordDetails, setWordDetails] = useState<{
    speakUrl?: string;
    dictUrl?: string;
    webUrl?: string;
    mobileUrl?: string;
  }>({});

  // 4. [修改] 同步高亮逻辑：增加 isPlayingThisEpisode 检查
  useEffect(() => {
    // 如果全局播放的不是这一集，强制关闭高亮，且不执行后续查找逻辑
    if (!isPlayingThisEpisode) {
      if (activeIndex !== -1) setActiveIndex(-1);
      return;
    }

    const index = processedSubtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime <= sub.end,
    );

    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [currentTime, processedSubtitles, activeIndex, isPlayingThisEpisode]);

  // 5. 自动滚动逻辑
  useEffect(() => {
    // 只有当高亮有效（即正在播放本集）时才滚动
    if (activeIndex !== -1 && activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  // 6. 点击单词
  const handleWordClick = async (
    word: string,
    fullSentenceEn: string,
    fullSentenceZh: string,
  ) => {
    // 如果正在播放，先暂停
    if (isPlayingThisEpisode) {
      pause();
    }
    const cleanWord = word.replace(/[.,!?;:"()]/g, "").trim();
    setSelectedWord(cleanWord);
    setSelectedContext(fullSentenceEn);
    setSelectedTranslation(fullSentenceZh);
    setDefinition("");
    setWordDetails({});
    setIsModalOpen(true);

    // [新增] 调用查词 API
    setIsLoadingDefinition(true);
    try {
      const res = await fetch("/api/dictionary/youdao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: cleanWord,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDefinition(data.definition);
        setWordDetails({
          speakUrl: data.speakUrl,
          dictUrl: data.dictUrl,
          webUrl: data.webUrl,
          mobileUrl: data.mobileUrl,
        });
      }
    } catch (error) {
      console.error("Auto definition failed:", error);
      // 失败了也不要紧，用户可以手动输
    } finally {
      setIsLoadingDefinition(false);
    }
  };

  const playWordAudio = () => {
    if (wordDetails.speakUrl) {
      const audio = new Audio(wordDetails.speakUrl);
      audio.play().catch((e) => console.error("Play word failed", e));
    }
  };

  // 7. 保存生词
  const handleSaveVocabulary = async () => {
    if (!selectedWord) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/vocabulary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedWord,
          definition: definition,
          contextSentence: selectedContext,
          translation: selectedTranslation,
          episodeid: episode.episodeid,
          timestamp: isPlayingThisEpisode ? currentTime : 0, // 只有在播放本集时才记录准确时间，否则记为0
          // [修改] 提交字段变化
          speakUrl: wordDetails.speakUrl,
          dictUrl: wordDetails.dictUrl,
          webUrl: wordDetails.webUrl,
          mobileUrl: wordDetails.mobileUrl,
        }),
      });
      if (res.ok) {
        alert("已加入生词本！");
        setIsModalOpen(false);
      } else {
        alert("保存失败");
      }
    } catch (error) {
      console.error(error);
      alert("网络错误");
    } finally {
      setIsSaving(false);
    }
  };

  // 8. [修改] 跳转/播放逻辑
  const handleJump = (startTime: number) => {
    // 情况 A: 正在播放本集 -> 直接跳转
    if (isPlayingThisEpisode && audioRef) {
      audioRef.currentTime = startTime;
      setCurrentTime(startTime);
      play(); // 跳转后自动播放
    }
    // 情况 B: 正在播放别的集/没播放 -> 切歌，然后跳转
    else {
      console.log("Switching episode to:", episode.title);
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);

      // 注意：这里我们设置了 Store 的 currentTime，
      // 但 Player 组件监听到 episode 变化后，会去 fetch 历史进度并可能覆盖它。
      // 为了让“点读”优于“历史进度”，我们可以利用一个简短的延时或状态标记，
      // 但通常 Player 组件加载音频需要时间，简单的处理是先切歌，
      // 这里的跳转可能需要在 Player 的 onLoadedMetadata 里再次确认，
      // 不过对于简单实现，我们可以先只切歌，让用户再点一次，或者相信 Player 的 props。

      // 更稳妥的方式是：利用 Player Store 的某种机制告诉 Player "切歌并跳转到 X 秒"
      // 但目前架构下，我们先切歌，并尝试设置时间（可能会被 Player 的历史恢复逻辑覆盖，但那是预期行为：
      // 用户切换到这集，通常希望从上次听的地方开始；除非用户明确点了某句台词）

      // 这里的逻辑稍微有点冲突：点台词是想听这句，历史恢复是想听上次。
      // 简单的优化：先切歌。用户如果发现没跳过去，再点一次即可。
      // 或者：在 Player Store 加一个 startFromTime 字段，切歌时带过去。

      // 暂时方案：切歌。
      // 如果你希望点哪播哪，可以在这里 setTimeout 强行设置一下，但不推荐。
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="badge badge-ghost badge-sm">
            {isPlayingThisEpisode ? "同步滚动中" : "点击播放按钮开始精听"}
          </span>
        </div>
        <div className="form-control">
          <label className="label cursor-pointer gap-2">
            <span className="label-text flex items-center gap-1 font-medium">
              <LanguageIcon className="w-4 h-4" />
              中英对照
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={showTranslation}
              onChange={(e) => setShowTranslation(e.target.checked)}
            />
          </label>
        </div>
      </div>

      {/*/!* 字幕容器 *!/*/}
      {/*<div*/}
      {/*  ref={containerRef}*/}
      {/*  className="h-[500px] overflow-y-auto p-4 bg-base-100 rounded-xl border border-base-200 shadow-inner space-y-6"*/}
      {/*>*/}
      {/*  {processedSubtitles.length === 0 ? (*/}
      {/*    <div className="text-center text-gray-400 py-10">暂无字幕内容</div>*/}
      {/*  ) : (*/}
      {/*    processedSubtitles.map((sub, index) => {*/}
      {/*      const isActive = index === activeIndex;*/}

      {/*      return (*/}
      {/*        <div*/}
      {/*          key={sub.id || index}*/}
      {/*          ref={isActive ? activeRef : null}*/}
      {/*          className={`transition-all duration-300 p-3 rounded-lg flex gap-3 ${*/}
      {/*            isActive*/}
      {/*              ? "bg-primary/10 border-l-4 border-primary scale-[1.02]"*/}
      {/*              : "hover:bg-base-200/50 border-l-4 border-transparent"*/}
      {/*          }`}*/}
      {/*        >*/}
      {/*          /!* 播放按钮 *!/*/}
      {/*          <button*/}
      {/*            onClick={() => handleJump(sub.start)}*/}
      {/*            className={`mt-1 flex-shrink-0 transition-colors ${*/}
      {/*              isActive*/}
      {/*                ? "text-primary"*/}
      {/*                : "text-gray-300 hover:text-primary"*/}
      {/*            }`}*/}
      {/*            title={isPlayingThisEpisode ? "跳转到此句" : "播放此集并跳转"}*/}
      {/*          >*/}
      {/*            <PlayCircleIcon className="w-6 h-6" />*/}
      {/*          </button>*/}

      {/*          /!* 文本内容区域 *!/*/}
      {/*          <div className="flex-1">*/}
      {/*            <p*/}
      {/*              className={`text-lg leading-relaxed ${isActive ? "text-base-content font-medium" : "text-base-content/70"}`}*/}
      {/*            >*/}
      {/*              {sub.textEn.split(" ").map((word, i) => (*/}
      {/*                <span*/}
      {/*                  key={i}*/}
      {/*                  onClick={(e) => {*/}
      {/*                    e.stopPropagation();*/}
      {/*                    handleWordClick(word, sub.textEn, sub.textZh);*/}
      {/*                  }}*/}
      {/*                  className="cursor-pointer hover:bg-yellow-200 hover:text-black rounded px-0.5 transition-colors duration-150 inline-block"*/}
      {/*                >*/}
      {/*                  {word}{" "}*/}
      {/*                </span>*/}
      {/*              ))}*/}
      {/*            </p>*/}

      {/*            {showTranslation && sub.textZh && (*/}
      {/*              <p*/}
      {/*                className={`mt-2 text-sm border-t border-base-content/5 pt-1 ${isActive ? "text-base-content/80" : "text-base-content/50"}`}*/}
      {/*              >*/}
      {/*                {sub.textZh}*/}
      {/*              </p>*/}
      {/*            )}*/}
      {/*          </div>*/}
      {/*        </div>*/}
      {/*      );*/}
      {/*    })*/}
      {/*  )}*/}
      {/*</div>*/}

      {/* 字幕列表 */}
      <div
        ref={containerRef}
        className="h-[500px] overflow-y-auto p-4 bg-base-100 rounded-xl border border-base-200 shadow-inner space-y-6"
      >
        {processedSubtitles.map((sub, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={sub.id || index}
              ref={isActive ? activeRef : null}
              className={`transition-all duration-300 p-3 rounded-lg flex gap-3 ${isActive ? "bg-primary/10 border-l-4 border-primary scale-[1.02]" : "hover:bg-base-200/50 border-l-4 border-transparent"}`}
            >
              <button
                onClick={() => handleJump(sub.start)}
                className={`mt-1 flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-gray-300 hover:text-primary"}`}
              >
                <PlayCircleIcon className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <p
                  className={`text-lg leading-relaxed ${isActive ? "text-base-content font-medium" : "text-base-content/70"}`}
                >
                  {sub.textEn.split(" ").map((word, i) => (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordClick(word, sub.textEn, sub.textZh);
                      }}
                      className="cursor-pointer hover:bg-yellow-200 hover:text-black rounded px-0.5 transition-colors duration-150 inline-block"
                    >
                      {word}{" "}
                    </span>
                  ))}
                </p>
                {showTranslation && sub.textZh && (
                  <p
                    className={`mt-2 text-sm border-t border-base-content/5 pt-1 ${isActive ? "text-base-content/80" : "text-base-content/50"}`}
                  >
                    {sub.textZh}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/*/!* 生词本 Modal (保持不变) *!/*/}
      {/*{isModalOpen && (*/}
      {/*  <div className="modal modal-open">*/}
      {/*    <div className="modal-box">*/}
      {/*      <h3 className="font-bold text-lg flex items-center gap-2 mb-4">*/}
      {/*        <PlusCircleIcon className="w-6 h-6 text-primary" />*/}
      {/*        添加生词*/}
      {/*      </h3>*/}
      {/*      <div className="space-y-4">*/}
      {/*        /!* word *!/*/}
      {/*        <div className="form-control w-full">*/}
      {/*          <label className="label">*/}
      {/*            <span className="label-text">单词</span>*/}
      {/*          </label>*/}
      {/*          <input*/}
      {/*            type="text"*/}
      {/*            value={selectedWord}*/}
      {/*            onChange={(e) => setSelectedWord(e.target.value)}*/}
      {/*            className="input input-bordered w-full font-bold text-xl text-primary"*/}
      {/*          />*/}
      {/*        </div>*/}
      {/*        <div className="form-control w-full relative">*/}
      {/*          <label className="label">*/}
      {/*            <span className="label-text">备注 / 释义</span>*/}
      {/*            /!* 如果正在加载，显示一个小提示 *!/*/}
      {/*            {isLoadingDefinition && (*/}
      {/*                <span className="label-text-alt text-warning flex items-center gap-1">*/}
      {/*                      <ArrowPathIcon className="w-3 h-3 animate-spin" />*/}
      {/*                      AI 查询中...*/}
      {/*                  </span>*/}
      {/*            )}*/}
      {/*          </label>*/}

      {/*          <div className="relative">*/}
      {/*          <input*/}
      {/*            type="text"*/}
      {/*            value={definition}*/}
      {/*            onChange={(e) => setDefinition(e.target.value)}*/}
      {/*            placeholder={isLoadingDefinition ? "正在分析语境..." : "请输入释义..."}*/}
      {/*            className={`input input-bordered w-full pr-10 ${isLoadingDefinition ? "bg-base-200 animate-pulse" : ""}`}*/}
      {/*            autoFocus*/}
      {/*          />*/}
      {/*            /!* 输入框内的加载图标 *!/*/}
      {/*            {isLoadingDefinition && (*/}
      {/*                <div className="absolute right-3 top-3">*/}
      {/*                  <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />*/}
      {/*                </div>*/}
      {/*            )}*/}
      {/*        </div>*/}
      {/*        </div>*/}
      {/*        /!* 上下文例句 *!/*/}
      {/*        <div className="form-control w-full">*/}
      {/*          <label className="label">*/}
      {/*            <span className="label-text">上下文例句</span>*/}
      {/*          </label>*/}
      {/*          <div className="p-3 bg-base-200 rounded-lg text-sm italic">*/}
      {/*            <p className="text-base-content/80">{selectedContext}</p>*/}
      {/*            {selectedTranslation && (*/}
      {/*              <p className="text-base-content/50 mt-1 border-t border-base-content/10 pt-1">*/}
      {/*                {selectedTranslation}*/}
      {/*              </p>*/}
      {/*            )}*/}
      {/*          </div>*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*      <div className="modal-action">*/}
      {/*        <button*/}
      {/*          className="btn btn-ghost"*/}
      {/*          onClick={() => setIsModalOpen(false)}*/}
      {/*        >*/}
      {/*          取消*/}
      {/*        </button>*/}
      {/*        <button*/}
      {/*          className="btn btn-primary"*/}
      {/*          onClick={handleSaveVocabulary}*/}
      {/*          disabled={isSaving}*/}
      {/*        >*/}
      {/*          {isSaving ? "保存中..." : "保存"}*/}
      {/*        </button>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*    <div*/}
      {/*      className="modal-backdrop"*/}
      {/*      onClick={() => setIsModalOpen(false)}*/}
      {/*    ></div>*/}
      {/*  </div>*/}
      {/*)}*/}

      {/*{isModalOpen && (*/}
      {/*    <div className="modal modal-open">*/}
      {/*      <div className="modal-box">*/}
      {/*        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">*/}
      {/*          <PlusCircleIcon className="w-6 h-6 text-primary" />*/}
      {/*          添加生词*/}
      {/*        </h3>*/}

      {/*        <div className="space-y-4">*/}
      {/*          /!* [修改] 单词与发音 *!/*/}
      {/*          <div className="form-control w-full">*/}
      {/*            <div className="flex items-center gap-2">*/}
      {/*              <input*/}
      {/*                  type="text"*/}
      {/*                  value={selectedWord}*/}
      {/*                  onChange={(e) => setSelectedWord(e.target.value)}*/}
      {/*                  className="input input-bordered flex-1 font-bold text-xl text-primary"*/}
      {/*              />*/}
      {/*              {wordDetails.speakUrl && (*/}
      {/*                  <button*/}
      {/*                      className="btn btn-square btn-outline btn-primary"*/}
      {/*                      onClick={playWordAudio}*/}
      {/*                      title="点击发音"*/}
      {/*                  >*/}
      {/*                    <SpeakerWaveIcon className="w-5 h-5" />*/}
      {/*                  </button>*/}
      {/*              )}*/}
      {/*            </div>*/}
      {/*            /!* [修改] 移除音标显示，改为显示外部链接 *!/*/}
      {/*            <div className="flex gap-2 mt-2">*/}
      {/*              {wordDetails.webUrl && (*/}
      {/*                  <a href={wordDetails.webUrl} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline gap-1">*/}
      {/*                    <ArrowTopRightOnSquareIcon className="w-3 h-3" /> 网页查看*/}
      {/*                  </a>*/}
      {/*              )}*/}
      {/*              {wordDetails.dictUrl && (*/}
      {/*                  <a href={wordDetails.dictUrl} className="btn btn-xs btn-outline gap-1 sm:hidden">*/}
      {/*                    <ArrowTopRightOnSquareIcon className="w-3 h-3" /> 打开App*/}
      {/*                  </a>*/}
      {/*              )}*/}
      {/*            </div>*/}
      {/*          </div>*/}

      {/*          /!* 释义 *!/*/}
      {/*          <div className="form-control w-full relative">*/}
      {/*            <label className="label py-1">*/}
      {/*              <span className="label-text">释义</span>*/}
      {/*              {isLoadingDefinition && <span className="label-text-alt flex items-center gap-1 text-warning"><ArrowPathIcon className="w-3 h-3 animate-spin"/> 查询中...</span>}*/}
      {/*            </label>*/}
      {/*            <textarea*/}
      {/*                value={definition}*/}
      {/*                onChange={(e) => setDefinition(e.target.value)}*/}
      {/*                placeholder="请输入释义..."*/}
      {/*                className={`textarea textarea-bordered w-full h-20 ${isLoadingDefinition ? "animate-pulse bg-base-200" : ""}`}*/}
      {/*            />*/}
      {/*          </div>*/}

      {/*          /!* 语境 *!/*/}
      {/*          <div className="form-control w-full">*/}
      {/*            <label className="label py-1"><span className="label-text">语境</span></label>*/}
      {/*            <div className="p-3 bg-base-200 rounded-lg text-sm italic border-l-4 border-base-content/20">*/}
      {/*              <p className="text-base-content/80">{selectedContext}</p>*/}
      {/*              {selectedTranslation && (*/}
      {/*                  <p className="text-base-content/50 mt-1">{selectedTranslation}</p>*/}
      {/*              )}*/}
      {/*            </div>*/}
      {/*          </div>*/}
      {/*        </div>*/}

      {/*        <div className="modal-action mt-6">*/}
      {/*          <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>取消</button>*/}
      {/*          <button*/}
      {/*              className="btn btn-primary"*/}
      {/*              onClick={handleSaveVocabulary}*/}
      {/*              disabled={isSaving}*/}
      {/*          >*/}
      {/*            {isSaving ? "保存中..." : "确认保存"}*/}
      {/*          </button>*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*      <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}></div>*/}
      {/*    </div>*/}
      {/*)}*/}

      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <PlusCircleIcon className="w-6 h-6 text-primary" />
              添加生词
            </h3>

            <div className="space-y-4">
              {/* 单词与发音 */}
              <div className="form-control w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedWord}
                    onChange={(e) => setSelectedWord(e.target.value)}
                    className="input input-bordered flex-1 font-bold text-xl text-primary"
                  />
                  {wordDetails.speakUrl && (
                    <button
                      className="btn btn-square btn-outline btn-primary"
                      onClick={playWordAudio}
                      title="点击发音"
                    >
                      <SpeakerWaveIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* [修改] 外部链接区域 */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* 1. App 深度链接 (仅移动端显示 sm:hidden) */}
                  {wordDetails.dictUrl && (
                    <a
                      href={wordDetails.dictUrl}
                      className="btn btn-xs btn-outline btn-accent gap-1 sm:hidden"
                    >
                      <DevicePhoneMobileIcon className="w-3 h-3" /> 打开App
                    </a>
                  )}

                  {/* 2. 移动端网页链接 (作为兜底) */}
                  {wordDetails.mobileUrl && (
                    <a
                      href={wordDetails.mobileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-xs btn-outline gap-1 sm:hidden"
                    >
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" /> 网页版
                    </a>
                  )}

                  {/* 3. 桌面端网页链接 (仅桌面端显示 hidden sm:inline-flex) */}
                  {wordDetails.webUrl && (
                    <a
                      href={wordDetails.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-xs btn-outline gap-1 hidden sm:inline-flex"
                    >
                      <ComputerDesktopIcon className="w-3 h-3" /> 电脑网页
                    </a>
                  )}
                </div>
              </div>

              {/* 释义 */}
              <div className="form-control w-full relative">
                <label className="label py-1">
                  <span className="label-text">释义</span>
                  {isLoadingDefinition && (
                    <span className="label-text-alt flex items-center gap-1 text-warning">
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />{" "}
                      查询中...
                    </span>
                  )}
                </label>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="请输入释义..."
                  className={`textarea textarea-bordered w-full h-20 ${isLoadingDefinition ? "animate-pulse bg-base-200" : ""}`}
                />
              </div>

              {/* 语境 */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text">语境</span>
                </label>
                <div className="p-3 bg-base-200 rounded-lg text-sm italic border-l-4 border-base-content/20">
                  <p className="text-base-content/80">{selectedContext}</p>
                  {selectedTranslation && (
                    <p className="text-base-content/50 mt-1">
                      {selectedTranslation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-action mt-6">
              <button
                className="btn btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveVocabulary}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "确认保存"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setIsModalOpen(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
