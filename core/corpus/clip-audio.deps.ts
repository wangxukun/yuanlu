// yuanlu/core/corpus/clip-audio.deps.ts

/**
 * [RESHAPE T1.3/T1.4] clipAudioService 的真机依赖装配（lib/prisma + lib/oss +
 * FFmpeg 子进程），供 /api/clips/[id]/audio 与 /api/scenes/[sceneid] 共用。
 * 依赖注入边界留在 service 侧，本文件只做真实实现绑定（单测不走这里）。
 */

import { spawn } from "node:child_process";
import prisma from "@/lib/prisma";
import { generateSignatureUrl, objectExists, uploadFile } from "@/lib/oss";
import type { ClipAudioDeps } from "@/core/corpus/clip-audio.service";

/** FFmpeg 子进程：stdout 收集切片 buffer，非零退出拒绝 */
export function runFfmpeg(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    const chunks: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-2000);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0 && chunks.length > 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

export function buildRealClipAudioDeps(): ClipAudioDeps {
  return {
    prisma: {
      corpus_clips: {
        findUnique: (args: { where: { clipid: string } }) =>
          prisma.corpus_clips.findUnique(args),
      },
      micro_scenes: {
        findUnique: (args: { where: { sceneid: string } }) =>
          prisma.micro_scenes.findUnique(args),
      },
      episode: {
        findUnique: (args: { where: { episodeid: string } }) =>
          prisma.episode.findUnique({
            where: args.where,
            select: { audioFileName: true, audioUrl: true },
          }),
      },
      corpus_clips_update: (id: string, key: string) =>
        prisma.corpus_clips.update({
          where: { clipid: id },
          data: { clipAudioKey: key },
        }),
      micro_scenes_update: (id: string, key: string) =>
        prisma.micro_scenes.update({
          where: { sceneid: id },
          data: { clipAudioKey: key },
        }),
    },
    oss: {
      exists: (objectKey) => objectExists(objectKey),
      resolveSourceUrl: async (episodeid) => {
        const ep = await prisma.episode.findUnique({
          where: { episodeid },
          select: { audioFileName: true, audioUrl: true },
        });
        if (!ep) return null;
        if (ep.audioFileName) {
          // 整集直链仅进入 ffmpeg 进程参数（短期签名），绝不随响应外发（红线 2）
          const signed = await generateSignatureUrl(
            ep.audioFileName,
            1800,
          ).catch(() => "");
          return signed || ep.audioUrl || null;
        }
        return ep.audioUrl || null;
      },
      put: async (objectKey, buffer) => {
        await uploadFile(buffer, objectKey);
      },
      sign: (objectKey, expireSec) =>
        generateSignatureUrl(objectKey, expireSec),
    },
    runFfmpeg,
  };
}
