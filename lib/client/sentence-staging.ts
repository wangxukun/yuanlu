/**
 * [P3-a] 本集句子暂存区（触墙承接，主报告 4.3 剧本 1）。
 *
 * 免费用户句子本满 30 条后再点收藏：书签翻转为"半亮 PRO 徽记态"，
 * 句子写入本暂存区（localStorage 按用户维度存储，含暂存时间戳）——
 * "书签不死"：视觉语义是"已记下"而非"失败"。
 *
 * 生命周期：
 * - 上限 10 条，超出提示先清理；
 * - 条目 30 天过期（读时惰性清理），第 23 天起视为"即将过期"供 UI 提示；
 * - 升级 PRO 或腾出容量后由 SentenceStagingManager 自动补提交（flush）；
 * - 换设备/清缓存丢失为已声明边界（跨设备同步 → P3-d 后端持久化增强）。
 *
 * 变更通知：同标签页派发 STAGING_CHANGED_EVENT，跨标签页由 storage 事件
 * 天然覆盖；组件经 subscribeStaging 订阅以重渲染书签三态。
 */

export interface StagedSentence {
  episodeid: string;
  subtitleId: number | null;
  startTime: number;
  endTime: number;
  enText: string;
  zhText?: string | null;
  /** 暂存时间戳（ms） */
  stagedAt: number;
}

/** 暂存条目上限（超出拒绝入暂存，提示先清理） */
export const SENTENCE_STAGING_LIMIT = 10;
/** 暂存条目存活期：30 天 */
export const SENTENCE_STAGING_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 第 23 天起视为"即将过期"（供暂存列表 UI 提示） */
export const SENTENCE_STAGING_WARN_MS = 23 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = "yuanlu_sentence_staging";
const STAGING_CHANGED_EVENT = "yuanlu:sentence-staging-changed";

/** 暂存条目唯一键：subtitleId 优先，缺失时以 startTime 落点定位（与 toggle 口径一致） */
export function stagedSentenceKey(s: {
  episodeid: string;
  subtitleId?: number | null;
  startTime: number;
}): string {
  return `${s.episodeid}::${s.subtitleId != null ? `s${s.subtitleId}` : `t${s.startTime}`}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readRaw(): StagedSentence[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.episodeid === "string" &&
        typeof s.enText === "string" &&
        typeof s.startTime === "number",
    );
  } catch {
    // 损坏 JSON 容错：静默清空
    return [];
  }
}

function writeRaw(items: StagedSentence[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 存储满等异常静默（暂存是增强体验，不是关键路径）
  }
  window.dispatchEvent(new CustomEvent(STAGING_CHANGED_EVENT));
}

/** 读取未过期的暂存条目（顺带惰性清理过期项） */
export function getStagedSentences(): StagedSentence[] {
  const now = Date.now();
  const all = readRaw();
  const alive = all.filter((s) => now - s.stagedAt < SENTENCE_STAGING_TTL_MS);
  if (alive.length !== all.length) writeRaw(alive);
  return alive;
}

/** 是否即将过期（暂存 ≥ 23 天） */
export function isStagingExpiringSoon(s: StagedSentence): boolean {
  return Date.now() - s.stagedAt >= SENTENCE_STAGING_WARN_MS;
}

/** 该字幕句是否已暂存（书签"半亮"态判定） */
export function isSentenceStaged(s: {
  episodeid: string;
  subtitleId?: number | null;
  startTime: number;
}): boolean {
  const key = stagedSentenceKey(s);
  return getStagedSentences().some((item) => stagedSentenceKey(item) === key);
}

export type StageSentenceResult =
  | { ok: true }
  | { ok: false; reason: "LIMIT_REACHED"; count: number }
  | { ok: false; reason: "DUPLICATE" };

/** 写入暂存区（重复点击同一句幂等返回 DUPLICATE） */
export function stageSentence(
  input: Omit<StagedSentence, "stagedAt">,
): StageSentenceResult {
  const items = getStagedSentences();
  const key = stagedSentenceKey(input);
  if (items.some((item) => stagedSentenceKey(item) === key)) {
    return { ok: false, reason: "DUPLICATE" };
  }
  if (items.length >= SENTENCE_STAGING_LIMIT) {
    return { ok: false, reason: "LIMIT_REACHED", count: items.length };
  }
  writeRaw([...items, { ...input, stagedAt: Date.now() }]);
  return { ok: true };
}

/** 移除暂存条目（再点半亮书签 = 取消暂存） */
export function removeStagedSentence(s: {
  episodeid: string;
  subtitleId?: number | null;
  startTime: number;
}): void {
  const key = stagedSentenceKey(s);
  writeRaw(
    getStagedSentences().filter((item) => stagedSentenceKey(item) !== key),
  );
}

/** 清空暂存区（补提交完成后调用） */
export function clearStagedSentences(): void {
  writeRaw([]);
}

/** 暂存条目数 */
export function stagedSentenceCount(): number {
  return getStagedSentences().length;
}

/**
 * 订阅暂存区变更（同标签页自定义事件 + 跨标签页 storage 事件）。
 * 返回取消订阅函数，配合 useEffect 使用。
 */
export function subscribeStaging(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener(STAGING_CHANGED_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(STAGING_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
