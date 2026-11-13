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
  /**
   * [M1/T1.2] v2 管线预计算的切片窗口（含 pad + overlap 裁剪）。
   * 读序：cut 优先 → 缺失/非法回落 startTime/endTime 动态计算（旧行为）。
   */
  cutStart?: number | null;
  cutEnd?: number | null;
  /**
   * [M1/T1.2] 对象名指纹（sha256(enText+cut+codec)[:16]）——挂对象名 {id}-{hash8}.mp3，
   * 切片参数变更自动失效旧对象；缺省走旧对象名 {id}.mp3（命中不变）。
   */
  contentHash?: string | null;
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

  // cut 读序：v2 预计算窗口优先（已含 pad/裁剪，不再二次让位）；
  // 缺失或非法（越界/倒序/超出字幕窗）→ 回落动态计算（旧行为不变）
  const hasCut =
    typeof input.cutStart === "number" &&
    typeof input.cutEnd === "number" &&
    isFinite(input.cutStart) &&
    isFinite(input.cutEnd) &&
    input.cutEnd > input.cutStart &&
    input.cutStart >= input.startTime - 1 &&
    input.cutEnd <= input.endTime + 1;
  const sliceStart = hasCut
    ? Math.max(0, input.cutStart as number)
    : Math.max(0, input.startTime - padBefore);
  const sliceEnd = hasCut ? (input.cutEnd as number) : input.endTime + padAfter;
  const duration = sliceEnd - sliceStart;
  if (duration > maxDuration) {
    // 红线 2 服务端闸门：超时长（理论仅脏数据可触发，批处理已保证 ≤40s）
    return { ok: false, code: "TOO_LONG" };
  }

  // [2026-11-13] 切片容器全面迁 AAC/ADTS：mp3 无帧索引，InnerAudioContext
  // 的 startTime seek 落点先天不准（词级毫秒扫光漂移），AAC 帧头自带精确
  // 时戳。实测 contentHash 列全库为空（M1 指纹未灌数）→ 全部行走缺省分支，
  // 故缺省对象名同步迁 {id}.aac（存量 ~118 个旧 mp3 缓存对象失权懒重切，
  // 换代成本可接受；clipAudioKey 回填自动指新对象）。指纹分支保留 .aac
  // 规则（未来 M1 补灌后无缝衔接）。
  const hash8 =
    typeof input.contentHash === "string" && input.contentHash.length >= 8
      ? input.contentHash.slice(0, 8)
      : null;
  const objectKey = hash8
    ? `yuanlu/clips/${id}-${hash8}.aac`
    : `yuanlu/clips/${id}.aac`;

  return {
    ok: true,
    window: {
      sliceStart,
      sliceEnd,
      duration: Math.round(duration * 1000) / 1000,
      clipOffset: sliceStart,
      objectKey,
    },
  };
}

/** FFmpeg 参数（输入 seek + 64kbps/24kHz/mono + 双端 150ms 淡入淡出 → stdout）。
 * format 默认 mp3（旧行为）；'aac' = ADTS 流（指纹行新批次，seek 精确）。 */
export function buildFfmpegArgs(params: {
  sourceUrl: string;
  sliceStart: number;
  duration: number;
  fadeSec?: number;
  format?: "mp3" | "aac";
}): string[] {
  const fadeSec = params.fadeSec ?? SLICE_FADE_SEC;
  const aac = params.format === "aac";
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
    ...(aac ? ["-c:a", "aac"] : []),
    "-b:a",
    "64k",
    "-f",
    aac ? "adts" : "mp3",
    "pipe:1",
  ];
}
