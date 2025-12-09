import { useEffect, useRef, useCallback } from "react";

interface UseSaveProgressProps {
  episodeId: string;
  currentTime: number; // 当前播放时间 (秒)
  isPlaying: boolean; // 播放状态
  duration: number; // 总时长
}

export function useSaveProgress({
  episodeId,
  currentTime,
  isPlaying,
  duration,
}: UseSaveProgressProps) {
  // 使用 useRef 记录上一次保存的时间点
  const lastSavedTimeRef = useRef<number>(0);
  // 增加一个 ref 防止短时间内重复请求
  const isSavingRef = useRef<boolean>(false);

  // 定义核心保存函数
  const saveToBackend = useCallback(
    async (time: number, finished: boolean) => {
      // 防止重入：如果正在保存中，且不是强制完成状态，则跳过
      if (isSavingRef.current && !finished) return;

      try {
        // 在发起请求前，立即更新 lastSavedTimeRef
        lastSavedTimeRef.current = time;
        isSavingRef.current = true;

        await fetch(`/api/episode/${episodeId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progressSeconds: time,
            isFinished: finished,
          }),
          keepalive: true,
          credentials: "include",
        });

        console.log(`进度已保存: ${time}s (Finished: ${finished})`);
      } catch (error) {
        console.error("保存进度失败", error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [episodeId],
  );

  // 1. 逻辑：当播放暂停时，立即保存
  useEffect(() => {
    if (
      !isPlaying &&
      currentTime > 0 &&
      currentTime !== lastSavedTimeRef.current
    ) {
      saveToBackend(currentTime, currentTime >= duration - 5);
    }
  }, [isPlaying, currentTime, duration, saveToBackend]);

  // 2. 逻辑：播放中，每隔 15 秒保存一次
  useEffect(() => {
    if (!isPlaying) return;
    if (Math.abs(currentTime - lastSavedTimeRef.current) > 15) {
      saveToBackend(currentTime, false);
    }
  }, [currentTime, isPlaying, saveToBackend]);

  // 3. 逻辑：页面卸载前强制保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        progressSeconds: currentTime,
        isFinished: false,
      });
      fetch(`/api/episode/${episodeId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        credentials: "include",
      }).catch((e) => console.error("Leave save failed", e));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [episodeId, currentTime]);

  // ✅ [新增] 暴露方法给外部使用
  return { saveToBackend };
}
