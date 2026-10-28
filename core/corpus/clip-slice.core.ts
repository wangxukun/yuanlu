// yuanlu/core/corpus/clip-slice.core.ts

/**
 * [RESHAPE T1.3] 短音频物理切片纯逻辑（零依赖，供网关路由与单测直用）。
 *
 * 切片口径（RESHAPE-TASK §二/T1.3）：
 *   - 窗口 = [start - 0.25s, end + 0.35s]（前让爆破音起振、后让尾音完整）；
 *   - 150ms 淡入淡出防爆音；
 *   - 转码 64kbps / 24kHz / 单声道 mp3（8s 句 ≈ 64KB，35s 上限 ≈ 280KB）；
 *   - 硬限制 duration ≤ 45s——绝不签发整集长音频（红线 2 的服务端闸门）；
 *   - clipOffset = sliceStart：小程序进度回调 +clipOffset 与原字幕毫秒
 *     时间戳无缝对齐（weapp audio-clip 切片直连协议，test-acoustic-microscope 锁死）。
 */

export const SLICE_PAD_BEFORE_SEC = 0.25;
export const SLICE_PAD_AFTER_SEC = 0.35;
export const SLICE_FADE_SEC = 0.15;
export const SLICE_MAX_DURATION_SEC = 45;

export interface SliceWindowInput {
  startTime: number;
  endTime: number;
}

export interface SliceWindow {
  /** 切片在源音频内的起点（秒） */
  sliceStart: number;
  sliceEnd: number;
  /** 切片时长（秒，含两端让位） */
  duration: number;
  /** 切片起点对应的原字幕时间轴偏移（小程序对齐协议） */
  clipOffset: number;
  /** OSS 对象 key */
  objectKey: string;
}

export type SliceWindowResult =
  | { ok: true; window: SliceWindow }
  | { ok: false; code: "INVALID_WINDOW" | "TOO_LONG" };

export function computeSliceWindow(
  id: string,
  input: SliceWindowInput,
  options?: { padBefore?: number; padAfter?: number; maxDuration?: number },
): SliceWindowResult {
  const padBefore = options?.padBefore ?? SLICE_PAD_BEFORE_SEC;
  const padAfter = options?.padAfter ?? SLICE_PAD_AFTER_SEC;
  const maxDuration = options?.maxDuration ?? SLICE_MAX_DURATION_SEC;

  if (
    !isFinite(input.startTime) ||
    !isFinite(input.endTime) ||
    input.endTime <= input.startTime
  ) {
    return { ok: false, code: "INVALID_WINDOW" };
  }

  const sliceStart = Math.max(0, input.startTime - padBefore);
  const sliceEnd = input.endTime + padAfter;
  const duration = sliceEnd - sliceStart;
  if (duration > maxDuration) {
    // 红线 2 服务端闸门：超时长（理论仅脏数据可触发，批处理已保证 ≤40s）
    return { ok: false, code: "TOO_LONG" };
  }

  return {
    ok: true,
    window: {
      sliceStart,
      sliceEnd,
      duration: Math.round(duration * 1000) / 1000,
      clipOffset: sliceStart,
      objectKey: `yuanlu/clips/${id}.mp3`,
    },
  };
}

/** FFmpeg 参数（输入 seek + 64kbps/24kHz/mono + 双端 150ms 淡入淡出 → stdout） */
export function buildFfmpegArgs(params: {
  sourceUrl: string;
  sliceStart: number;
  duration: number;
  fadeSec?: number;
}): string[] {
  const fadeSec = params.fadeSec ?? SLICE_FADE_SEC;
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    params.sliceStart.toFixed(3),
    "-t",
    params.duration.toFixed(3),
    "-i",
    params.sourceUrl,
    "-af",
    `afade=t=in:st=0:d=${fadeSec},afade=t=out:st=${Math.max(0, params.duration - fadeSec).toFixed(3)}:d=${fadeSec}`,
    "-ac",
    "1",
    "-ar",
    "24000",
    "-b:a",
    "64k",
    "-f",
    "mp3",
    "pipe:1",
  ];
}
