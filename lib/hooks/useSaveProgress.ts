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

  // 每次 render 后更新 ref
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // 核心保存函数
  // [修改点 1] 增加 force 参数
  const saveToBackend = useCallback(
    async (time: number, finished: boolean, force: boolean = false) => {
      // [修改点 2] 如果是强制保存(force=true)，则无视锁；否则才检查锁
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

  // 1. 监听 episodeId 变化（切歌）
  useEffect(() => {
    return () => {
      const lastTime = currentTimeRef.current;
      // 只有当进度 > 0 且跟上次保存不同的时候才存
      if (lastTime > 0 && Math.abs(lastTime - lastSavedTimeRef.current) > 2) {
        console.log(`检测到切歌/卸载，强制保存上一集进度: ${lastTime}`);
        // [修改点 3] 传入 true 开启强制模式，防止被正在进行的自动保存阻塞
        saveToBackend(lastTime, false, true);
      }
    };
  }, [episodeId, saveToBackend]);

  // 2. 暂停时保存
  useEffect(() => {
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
