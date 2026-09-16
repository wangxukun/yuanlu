/**
 * [P3-a] 80% 预告判定单测（一次性）
 * 运行：npx tsx scripts/test-p3-a-preview.ts
 */
import { shouldPreviewSentenceQuota } from "../lib/quota";

const cases: Array<[number, boolean]> = [
  [23, false],
  [24, true],
  [29, true],
  [30, false],
  [31, false],
];

let ok = 0;
for (const [n, exp] of cases) {
  const got = shouldPreviewSentenceQuota(n);
  const pass = got === exp;
  if (pass) ok++;
  else console.log("  ❌", n, got, "!=", exp);
}
console.log(`shouldPreviewSentenceQuota: ${ok}/${cases.length} 通过`);
process.exit(ok === cases.length ? 0 : 1);
