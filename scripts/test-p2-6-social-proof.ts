/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * [P2-6] 社会认同文案渲染门槛用例（一次性自测）
 * 运行：npx tsx scripts/test-p2-6-social-proof.ts
 */
import {
  renderSocialProof,
  SOCIAL_PROOF_MIN_MEMBERS,
} from "../components/subscription/premium-modal-scenarios";

const cases: Array<[any, string]> = [
  [null, ""],
  [{ memberCount: 0, totalLearningHours: 100 }, ""],
  [{ memberCount: 4, totalLearningHours: 100 }, ""],
  [{ memberCount: 5, totalLearningHours: 0 }, "已有 5 位学习者加入 PRO"],
  [
    { memberCount: 23, totalLearningHours: 640 },
    "已有 23 位学习者加入 PRO · 累计陪伴学习 640 小时",
  ],
  [
    { memberCount: 100, totalLearningHours: 12345 },
    "已有 100 位学习者加入 PRO · 累计陪伴学习 1.2 万小时",
  ],
];

let ok = 0;
let fail = 0;
for (const [input, expected] of cases) {
  const got = renderSocialProof(input);
  const pass = got === expected;
  if (pass) ok++;
  else fail++;
  console.log(
    pass ? "  ✅" : "  ❌",
    JSON.stringify(input),
    "->",
    JSON.stringify(got),
  );
}
console.log(
  `门槛=${SOCIAL_PROOF_MIN_MEMBERS}，结果：${ok} 通过 / ${fail} 失败`,
);
process.exit(fail ? 1 : 0);
