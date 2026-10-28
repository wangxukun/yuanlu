// yuanlu/core/corpus/clip-attach.core.ts

/**
 * [RESHAPE T1.3-4] 存量响应的切片字段装饰器（纯 additive，网页版零感知）。
 *
 * 为 /api/sentences/list 与 /api/speech/practice-data 等既有响应的条目
 * 追加可选语料切片字段：
 *   clipId        命中的 corpus_clips.clipid（未命中不追加任何字段）
 *   clipAudioUrl  仅当物理切片已缓存（clipAudioKey 非空）时签发；
 *                 未缓存不触发转码——客户端可经 /api/clips/{clipId}/audio
 *                 懒取（首访转码并缓存，二次起命中）
 *   clipOffset    切片在原字幕时间轴上的起点（进度对齐协议，与
 *                 /api/clips/{id}/audio 同口径 = max(0, start-0.25)）
 *   clipDuration  切片时长（含两端让位）
 *
 * 防御口径：签名失败/窗口非法仅缺省对应字段，绝不抛错拖垮既有响应。
 */

import { computeSliceWindow } from "@/core/corpus/clip-slice.core";

export interface ClipAttachRow {
  clipid: string;
  subtitleId: number;
  startTime: number;
  endTime: number;
  clipAudioKey: string | null;
}

export interface ClipAttachFields {
  clipId?: string;
  clipAudioUrl?: string;
  clipOffset?: number;
  clipDuration?: number;
}

export function buildClipAttachIndex(
  rows: ClipAttachRow[],
): Map<number, ClipAttachRow> {
  const index = new Map<number, ClipAttachRow>();
  for (const row of rows || []) {
    if (row && typeof row.subtitleId === "number")
      index.set(row.subtitleId, row);
  }
  return index;
}

/**
 * 装饰条目：按 keyOf 取条目的字幕句 id，命中切片行则追加字段。
 * 未命中条目原样返回（引用不变），绝不修改/删除既有字段。
 */
export async function attachClipAudio<T>(
  items: T[],
  clipRows: ClipAttachRow[],
  sign: (objectKey: string, expireSec: number) => Promise<string>,
  keyOf: (item: T) => number | null | undefined,
  options?: { expireSec?: number },
): Promise<Array<T & ClipAttachFields>> {
  const expireSec = options?.expireSec ?? 3600;
  const index = buildClipAttachIndex(clipRows);

  return Promise.all(
    (items || []).map(async (item) => {
      const key = keyOf(item);
      const row = key == null ? undefined : index.get(key);
      if (!row) return item as T & ClipAttachFields;

      const decorated = { ...item, clipId: row.clipid } as T & ClipAttachFields;

      // 已缓存切片：签发直链 + 对齐协议的偏移/时长（窗口口径与网关一致）
      if (row.clipAudioKey) {
        const win = computeSliceWindow(row.clipid, {
          startTime: row.startTime,
          endTime: row.endTime,
        });
        try {
          const url = await sign(row.clipAudioKey, expireSec);
          if (url) decorated.clipAudioUrl = url;
        } catch {
          // 签名失败仅缺省 url（客户端可走 /api/clips/{clipId}/audio 兜底）
        }
        if (win.ok) {
          decorated.clipOffset = win.window.clipOffset;
          decorated.clipDuration = win.window.duration;
        }
      }
      return decorated;
    }),
  );
}

/**
 * 批量切片行查询参数构造：按 episodeid 分组 subtitleId（列表跨多集时
 * 单条 OR 复合 where 一次取回）。调用方拿去 prisma.corpus_clips.findMany。
 */
export function buildClipRowsWhere(
  pairs: Array<{ episodeid: string; subtitleId: number }>,
): { OR: Array<{ episodeid: string; subtitleId: { in: number[] } }> } | null {
  const byEpisode = new Map<string, Set<number>>();
  for (const p of pairs || []) {
    if (!p?.episodeid || typeof p.subtitleId !== "number") continue;
    if (!byEpisode.has(p.episodeid)) byEpisode.set(p.episodeid, new Set());
    byEpisode.get(p.episodeid)!.add(p.subtitleId);
  }
  if (byEpisode.size === 0) return null;
  return {
    OR: Array.from(byEpisode.entries()).map(([episodeid, ids]) => ({
      episodeid,
      subtitleId: { in: Array.from(ids) },
    })),
  };
}
