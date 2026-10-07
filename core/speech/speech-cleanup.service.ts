// core/speech/speech-cleanup.service.ts
// [存储优化 2026-10] 跟读录音 OSS 生命周期对账清理。
//
// 与 OSS Bucket 的前缀生命周期规则（yuanlu/speech/，scripts/set-speech-lifecycle.ts
// 配置）配套：生命周期规则负责删对象，本服务负责把 DB 里已超期的
// userAudioUrl/detailUrl 引用置空，避免 practice-data 对已删对象签名下发、
// 回放 404。行本身保留——配额计数、弱项本、图表统计均不依赖媒体文件。

import prisma from "@/lib/prisma";
import { deleteObject, extractOssKey } from "@/lib/oss";

/**
 * 对账保留期默认 90 天 = OSS 生命周期天数（91，控制台配置）- 1：
 * 对账 cron 须先于生命周期把 DB 引用置空（第 90 天置空、第 91 天 OSS 删对象），
 * 避免 PRO 回放拿到已删对象的签名 URL。调整生命周期天数时同步改这里。
 */
export const DEFAULT_SPEECH_MEDIA_RETENTION_DAYS = 90;

export interface SpeechMediaCleanupResult {
  retentionDays: number;
  dryRun: boolean;
  /** 命中"超期且带媒体引用"的行数 */
  scannedRows: number;
  objectsDeleted: number;
  objectsFailed: number;
  rowsCleared: number;
}

/** 单批扫描行数：控制内存与单次 DB 往返 */
const BATCH_SIZE = 200;

/**
 * 对账清理超期跟读录音的 OSS 文件：
 * 找出 recognitionDate 早于 cutoff 且仍带 userAudioUrl/detailUrl 的行，
 * 逐行删除 OSS 对象（best-effort）并将 DB 引用置空。
 * dryRun=true 仅统计与列举，不做任何删除/更新（脚本首次对账用）。
 */
export async function cleanupExpiredSpeechMedia(
  retentionDays: number = DEFAULT_SPEECH_MEDIA_RETENTION_DAYS,
  options?: { dryRun?: boolean },
): Promise<SpeechMediaCleanupResult> {
  const dryRun = options?.dryRun ?? false;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result: SpeechMediaCleanupResult = {
    retentionDays,
    dryRun,
    scannedRows: 0,
    objectsDeleted: 0,
    objectsFailed: 0,
    rowsCleared: 0,
  };

  let cursor: number | undefined;
  // cursor 分页：行被置空后不再命中 where，但游标按 recognitionid 前进不受影响
  for (;;) {
    const rows = await prisma.speech_recognition.findMany({
      where: {
        recognitionDate: { lt: cutoff },
        OR: [{ userAudioUrl: { not: null } }, { detailUrl: { not: null } }],
      },
      orderBy: { recognitionid: "asc" },
      take: BATCH_SIZE,
      ...(cursor !== undefined
        ? { skip: 1, cursor: { recognitionid: cursor } }
        : {}),
      select: { recognitionid: true, userAudioUrl: true, detailUrl: true },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      result.scannedRows += 1;
      if (dryRun) continue;

      for (const url of [row.userAudioUrl, row.detailUrl]) {
        if (!url) continue;
        const key = extractOssKey(url);
        if (!key) continue;
        // deleteObject 内部吞错并返回 undefined，据此计数失败对象
        const res = await deleteObject(key);
        if (res) {
          result.objectsDeleted += 1;
        } else {
          result.objectsFailed += 1;
        }
      }

      // 对象删除失败（如网络抖动）也置空引用：次日生命周期规则兜底删对象，
      // 残留的悬空引用只影响该行回放（前端已有 404 容错），不值得重试整行
      await prisma.speech_recognition.update({
        where: { recognitionid: row.recognitionid },
        data: { userAudioUrl: null, detailUrl: null },
      });
      result.rowsCleared += 1;
    }

    cursor = rows[rows.length - 1].recognitionid;
  }

  return result;
}
