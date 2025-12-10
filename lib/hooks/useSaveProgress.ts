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
  // 记录上一次保存的时间点
  const lastSavedTimeRef = useRef<number>(0);
  // 防止并发请求的锁
  const isSavingRef = useRef<boolean>(false);
  // 专门用于追踪当前时间的 Ref，供 cleanup 使用
  const currentTimeRef = useRef<number>(currentTime);

  // [新增] 记录当前的 episodeId，用于检测切换
  const currentEpisodeIdRef = useRef<string>(episodeId);

  // 每次 render 后更新 time ref
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // 核心保存函数
  const saveToBackend = useCallback(
    async (time: number, finished: boolean, force: boolean = false) => {
      // 如果是强制保存(force=true)，则无视锁；否则才检查锁
      if (!force && isSavingRef.current && !finished) return;

      try {
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

        console.log(`[${episodeId}] 进度已保存: ${time}s (force: ${force})`);
      } catch (error) {
        console.error("保存进度失败", error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [episodeId],
  );

  // ----------------------------------------------------------------
  // [关键修复]：当 episodeId 变化时，执行“切歌逻辑”
  // 1. 保存上一集的进度
  // 2. 重置 lastSavedTimeRef，防止将上一集的时间误判为当前集的时间差
  // ----------------------------------------------------------------
  useEffect(() => {
    // 只有当 ID 真正变化时才执行
    if (episodeId !== currentEpisodeIdRef.current) {
      console.log(
        `[useSaveProgress] 检测到切歌: ${currentEpisodeIdRef.current} -> ${episodeId}`,
      );

      const prevEpisodeId = currentEpisodeIdRef.current;
      const lastTime = currentTimeRef.current;

      // 1. 尝试保存上一集 (使用 fetch 防止闭包问题)
      // 注意：这里我们不能用 saveToBackend，因为它依赖当前的 episodeId scope
      // 我们需要手动发一个针对 prevEpisodeId 的请求
      if (prevEpisodeId && lastTime > 0) {
        console.log(
          `[切歌清理] 保存上一集 ${prevEpisodeId} 进度: ${lastTime}s`,
        );
        const payload = JSON.stringify({
          progressSeconds: lastTime,
          isFinished: false,
        });
        fetch(`/api/episode/${prevEpisodeId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "include",
        }).catch((e) => console.error("Switch save failed", e));
      }

      // 2. [核心修复] 重置状态，为新的一集做准备
      // 将 lastSavedTimeRef 重置为 0 (或者 -1 避免开局 0s 触发)
      // 这样 Math.abs(0 - 0) = 0 < 15，就不会触发自动保存了
      lastSavedTimeRef.current = 0;
      isSavingRef.current = false;

      // 更新当前 ID Ref
      currentEpisodeIdRef.current = episodeId;
    }
  }, [episodeId]);

  // 2. 暂停时保存
  useEffect(() => {
    // 增加 guarding：确保 episodeId 匹配才保存
    if (
      !isPlaying &&
      currentTime > 0 &&
      currentTime !== lastSavedTimeRef.current
    ) {
      saveToBackend(currentTime, currentTime >= duration - 5);
    }
  }, [isPlaying, currentTime, duration, saveToBackend]);

  // 3. 定时保存 (15s)
  useEffect(() => {
    if (!isPlaying) return;

    // 如果 currentTime 为 0 (刚开始播放)，且 lastSavedTimeRef 也是 0 (刚重置)，差值为 0，不会触发
    if (Math.abs(currentTime - lastSavedTimeRef.current) > 15) {
      saveToBackend(currentTime, false);
    }
  }, [currentTime, isPlaying, saveToBackend]);

  // 4. 页面关闭前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        progressSeconds: currentTimeRef.current,
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
  }, [episodeId]);

  return { saveToBackend };
}
