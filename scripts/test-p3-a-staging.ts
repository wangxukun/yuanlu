/**
 * [P3-a] 暂存区纯逻辑单测（node 端 mock window/localStorage，一次性）
 * 运行：npx tsx scripts/test-p3-a-staging.ts
 */

// ── 浏览器环境 mock（须在 import 目标模块前就位）──
class MockStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
}

const listeners = new Map<string, Set<() => void>>();
const mockWindow = {
  localStorage: new MockStorage(),
  dispatchEvent: (e: { type: string }) => {
    (listeners.get(e.type) ?? new Set()).forEach((fn) => fn());
    return true;
  },
  addEventListener: (type: string, fn: () => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  },
  removeEventListener: (type: string, fn: () => void) => {
    listeners.get(type)?.delete(fn);
  },
};
(globalThis as Record<string, unknown>).window = mockWindow;
(globalThis as Record<string, unknown>).CustomEvent = class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

import {
  stageSentence,
  isSentenceStaged,
  removeStagedSentence,
  clearStagedSentences,
  stagedSentenceCount,
  isStagingExpiringSoon,
  subscribeStaging,
  SENTENCE_STAGING_LIMIT,
  SENTENCE_STAGING_TTL_MS,
} from "../lib/client/sentence-staging";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}${detail ? ` —— ${detail}` : ""}`);
  }
}

const SENT = (i: number, stagedAtDeltaMs = 0) => ({
  episodeid: "ep1",
  subtitleId: i,
  startTime: i * 10,
  endTime: i * 10 + 5,
  enText: `Sentence ${i}`,
  zhText: `第 ${i} 句`,
  stagedAt: Date.now() - stagedAtDeltaMs,
});

function main() {
  console.log("\n[1] 写入/读取/判定");
  clearStagedSentences();
  const r1 = stageSentence(SENT(1));
  assert(r1.ok, "stageSentence ok");
  assert(
    isSentenceStaged({ episodeid: "ep1", subtitleId: 1, startTime: 10 }),
    "isSentenceStaged 命中",
  );
  assert(
    !isSentenceStaged({ episodeid: "ep1", subtitleId: 2, startTime: 20 }),
    "未暂存句不命中",
  );
  assert(
    !isSentenceStaged({ episodeid: "ep2", subtitleId: 1, startTime: 10 }),
    "跨剧集不串扰",
  );

  console.log("\n[2] 重复与上限");
  const dup = stageSentence(SENT(1));
  assert(!dup.ok && dup.reason === "DUPLICATE", "重复入暂存返回 DUPLICATE");
  for (let i = 2; i <= SENTENCE_STAGING_LIMIT; i++) stageSentence(SENT(i));
  assert(
    stagedSentenceCount() === SENTENCE_STAGING_LIMIT,
    `上限 ${SENTENCE_STAGING_LIMIT} 条`,
  );
  const over = stageSentence(SENT(99));
  assert(
    !over.ok && over.reason === "LIMIT_REACHED",
    "超上限返回 LIMIT_REACHED",
  );

  console.log("\n[3] TTL 30 天过期");
  clearStagedSentences();
  stageSentence(SENT(1));
  stageSentence(SENT(2));
  // stageSentence 会以当前时间覆盖 stagedAt——过期条目直写存储注入
  const storageKey =
    Object.keys(mockWindow.localStorage).find((k) =>
      k.includes("sentence_staging"),
    ) ?? "yuanlu_sentence_staging";
  const raw = JSON.parse(
    (mockWindow.localStorage.getItem(storageKey) as string) || "[]",
  ) as Array<{ episodeid: string; subtitleId: number; stagedAt: number }>;
  for (const item of raw) {
    if (item.subtitleId === 1)
      item.stagedAt = Date.now() - (SENTENCE_STAGING_TTL_MS + 1000);
  }
  mockWindow.localStorage.setItem(storageKey, JSON.stringify(raw));
  assert(
    stagedSentenceCount() === 1 &&
      isSentenceStaged({ episodeid: "ep1", subtitleId: 2, startTime: 20 }),
    "过期条目读时被惰性清理，新条目保留",
  );
  assert(
    !isSentenceStaged({ episodeid: "ep1", subtitleId: 1, startTime: 10 }),
    "过期句不再命中暂存态",
  );

  console.log("\n[4] 即将过期（≥23 天）");
  assert(
    isStagingExpiringSoon(SENT(9, 24 * 24 * 3600 * 1000)),
    "24 天前暂存 → 即将过期",
  );
  assert(
    !isStagingExpiringSoon(SENT(9, 22 * 24 * 3600 * 1000)),
    "22 天前暂存 → 未到提醒线",
  );

  console.log("\n[5] 移除与清空");
  removeStagedSentence({ episodeid: "ep1", subtitleId: 2, startTime: 20 });
  assert(stagedSentenceCount() === 0, "removeStagedSentence 生效");
  clearStagedSentences();

  console.log("\n[6] 变更订阅");
  let fired = 0;
  const off = subscribeStaging(() => {
    fired++;
  });
  stageSentence(SENT(1));
  assert(fired === 1, "写入触发订阅回调（自定义事件）");
  off();
  stageSentence(SENT(2));
  assert(fired === 1, "取消订阅后不再触发");

  console.log(`\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`);
  if (failed > 0) process.exit(1);
}

main();
