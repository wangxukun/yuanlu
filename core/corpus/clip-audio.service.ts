// yuanlu/core/corpus/clip-audio.service.ts

/**
 * [RESHAPE T1.3] 短音频物理切片网关服务。
 *
 * ensureClipAudio(id)：
 *   1. id 命中 corpus_clips（单句）或 micro_scenes（微剧场）取时间窗；
 *      均未命中 → NOT_FOUND；
 *   2. computeSliceWindow 硬闸门（≤45s，超时长拒绝——绝不切片整集音频）；
 *   3. OSS 已有 yuanlu/clips/{id}.mp3 → 直接签 1h 签名 URL（缓存命中）；
 *   4. 未命中 → 签源音频短期 URL → FFmpeg 截取+淡入淡出+64kbps mono mp3 →
 *      上传 OSS 永久缓存 → 回填 clipAudioKey → 签发；
 *   5. 同 id 并发请求单飞（in-flight Promise 去重，防重复转码）。
 *
 * 依赖全部注入（prisma/oss/ffmpeg），单测 scripts/test-corpus-clip.mjs 直测。
 * 返回协议（weapp audio-clip 切片直连锁死）：{ url, duration, clipOffset }。
 */

import {
  buildFfmpegArgs,
  computeSliceWindow,
} from "@/core/corpus/clip-slice.core";

export interface ClipLookupRow {
  startTime: number;
  endTime: number;
}

export interface ClipAudioDeps {
  prisma: {
    corpus_clips: {
      findUnique(args: {
        where: { clipid: string };
      }): Promise<
        | (ClipLookupRow & { episodeid: string; clipAudioKey: string | null })
        | null
      >;
    };
    micro_scenes: {
      findUnique(args: {
        where: { sceneid: string };
      }): Promise<
        | (ClipLookupRow & { episodeid: string; clipAudioKey: string | null })
        | null
      >;
    };
    episode: {
      findUnique(args: {
        where: { episodeid: string };
      }): Promise<{ audioFileName: string | null; audioUrl: string } | null>;
    };
    corpus_clips_update?: (id: string, key: string) => Promise<unknown>;
    micro_scenes_update?: (id: string, key: string) => Promise<unknown>;
  };
  oss: {
    /** 对象是否存在（HEAD） */
    exists(objectKey: string): Promise<boolean>;
    /** 源音频可访问 URL（audioFileName 签名 / audioUrl 原值） */
    resolveSourceUrl(episodeid: string): Promise<string | null>;
    /** 上传切片 buffer（私有 ACL） */
    put(objectKey: string, buffer: Buffer): Promise<void>;
    /** 签发切片访问 URL */
    sign(objectKey: string, expireSec: number): Promise<string>;
  };
  runFfmpeg(args: string[]): Promise<Buffer>;
}

export type ClipAudioResult =
  | {
      ok: true;
      url: string;
      duration: number;
      clipOffset: number;
      cached: boolean;
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "INVALID_WINDOW"
        | "TOO_LONG"
        | "NO_SOURCE_AUDIO"
        | "SLICE_UNAVAILABLE";
      message?: string;
    };

const SIGN_EXPIRE_SEC = 3600;

/** 同 id 单飞：并发请求共享一次转码 */
const inFlight = new Map<string, Promise<ClipAudioResult>>();

export const clipAudioService = {
  async ensureClipAudio(
    id: string,
    deps: ClipAudioDeps,
  ): Promise<ClipAudioResult> {
    const running = inFlight.get(id);
    if (running) return running;
    const p = this.sliceOnce(id, deps).finally(() => inFlight.delete(id));
    inFlight.set(id, p);
    return p;
  },

  async sliceOnce(id: string, deps: ClipAudioDeps): Promise<ClipAudioResult> {
    if (!id) return { ok: false, code: "NOT_FOUND" };

    let windowInput: ClipLookupRow | null = null;
    let kind: "clip" | "scene" | null = null;
    let episodeid = "";

    const clip = await deps.prisma.corpus_clips.findUnique({
      where: { clipid: id },
    });
    if (clip) {
      windowInput = clip;
      kind = "clip";
      episodeid = clip.episodeid;
    } else {
      const scene = await deps.prisma.micro_scenes.findUnique({
        where: { sceneid: id },
      });
      if (scene) {
        windowInput = scene;
        kind = "scene";
        episodeid = scene.episodeid;
      }
    }
    if (!windowInput || !kind) {
      return { ok: false, code: "NOT_FOUND", message: "切片不存在" };
    }

    const windowResult = computeSliceWindow(id, {
      startTime: windowInput.startTime,
      endTime: windowInput.endTime,
    });
    if (!windowResult.ok) {
      return { ok: false, code: windowResult.code };
    }
    const win = windowResult.window;

    // 缓存命中：OSS 已有切片对象 → 直接签发
    try {
      if (await deps.oss.exists(win.objectKey)) {
        const url = await deps.oss.sign(win.objectKey, SIGN_EXPIRE_SEC);
        return {
          ok: true,
          url,
          duration: win.duration,
          clipOffset: win.clipOffset,
          cached: true,
        };
      }
    } catch (error) {
      console.warn("[clip-audio] OSS exists 探测失败，继续走转码路径:", error);
    }

    // 源音频 URL（整集直链只进 ffmpeg 进程参数，绝不返回给客户端——红线 2）
    const sourceUrl = await deps.oss.resolveSourceUrl(episodeid);
    if (!sourceUrl) {
      return { ok: false, code: "NO_SOURCE_AUDIO", message: "源音频不可用" };
    }

    let buffer: Buffer;
    try {
      buffer = await deps.runFfmpeg(
        buildFfmpegArgs({
          sourceUrl,
          sliceStart: win.sliceStart,
          duration: win.duration,
        }),
      );
    } catch (error) {
      console.error("[clip-audio] FFmpeg 切片失败:", error);
      return {
        ok: false,
        code: "SLICE_UNAVAILABLE",
        message: "切片服务暂不可用，请稍后重试",
      };
    }
    if (!buffer || buffer.length === 0) {
      return { ok: false, code: "SLICE_UNAVAILABLE", message: "切片产物为空" };
    }

    await deps.oss.put(win.objectKey, buffer);

    // 回填 clipAudioKey（尽力而为，失败不影响签发）
    const update =
      kind === "clip"
        ? deps.prisma.corpus_clips_update
        : deps.prisma.micro_scenes_update;
    if (update) {
      update(id, win.objectKey).catch(() => {});
    }

    const url = await deps.oss.sign(win.objectKey, SIGN_EXPIRE_SEC);
    return {
      ok: true,
      url,
      duration: win.duration,
      clipOffset: win.clipOffset,
      cached: false,
    };
  },
};
