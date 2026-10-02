/**
 * scripts/test-wx-bind.mjs — 微信绑定纯逻辑仿真（模块 E T3.2 验收）
 *
 * 直测 core/auth/wx-bind.core.ts 纯函数（Node ≥22 type stripping 直跑 .ts）：
 *   1. parseCode2Session：成功解析 / errcode 透出（40029 无效、40163 已用、
 *      45011 频率）/ openid 或 session_key 缺失兜底文案；
 *   2. decideWxBind 四象限：CREATE（未绑未占）/ REFRESH（同 openid 幂等）/
 *      REJECT_OWNER（openid 被其他账号占用）/ REJECT_SWAP（换单绑拒绝）。
 * 运行：node scripts/test-wx-bind.mjs（yuanlu 仓；不挂 weapp npm test 链）
 */
import {
  parseCode2Session,
  decideWxBind,
  WX_BIND_MESSAGES,
} from "../core/auth/wx-bind.core.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}
function assertThrows(fn, includes, msg) {
  try {
    fn();
    assert(false, msg + "（未抛错）");
  } catch (e) {
    assert(
      e instanceof Error && e.message.includes(includes),
      `${msg}（文案含「${includes}」，实际「${e.message}」）`,
    );
  }
}

console.log("━━━ 一、parseCode2Session ━━━");
const ok = parseCode2Session({
  openid: "oABC123",
  session_key: "sk==",
});
assert(
  ok.openid === "oABC123" && ok.sessionKey === "sk==",
  "成功解析 openid+sessionKey",
);

assertThrows(
  () => parseCode2Session({ errcode: 40029, errmsg: "invalid code" }),
  "40029",
  "无效 code（40029）文案透出 errcode",
);
assertThrows(
  () => parseCode2Session({ errcode: 40163, errmsg: "code been used" }),
  "40163",
  "已使用 code（40163）文案透出 errcode",
);
assertThrows(
  () => parseCode2Session({ errcode: 45011, errmsg: "api minute-quota" }),
  "45011",
  "频率限制（45011）文案透出 errcode",
);
assertThrows(
  () => parseCode2Session({ openid: "oABC123" }),
  "EMPTY",
  "缺 session_key 走 EMPTY 兜底文案",
);

console.log("━━━ 二、decideWxBind 决策矩阵 ━━━");
assert(
  decideWxBind("oA", null, null, "u1") === "CREATE",
  "未绑定+openid 未占用 → CREATE",
);
assert(
  decideWxBind("oA", "oA", "u1", "u1") === "REFRESH",
  "同 openid 重复绑定 → REFRESH（幂等，仅刷新 sessionKey）",
);
assert(
  decideWxBind("oA", null, "u2", "u1") === "REJECT_OWNER",
  "openid 已被他人占用 → REJECT_OWNER",
);
assert(
  decideWxBind("oB", "oA", null, "u1") === "REJECT_SWAP",
  "已绑定 oA 又来 oB → REJECT_SWAP（换单绑拒绝）",
);
assert(
  decideWxBind("oB", "oA", "u2", "u1") === "REJECT_OWNER",
  "既换绑又占用 → REJECT_OWNER 优先（openid 归属防线先行）",
);
assert(
  WX_BIND_MESSAGES.REJECT_OWNER === "该微信号已绑定其他账号" &&
    WX_BIND_MESSAGES.REJECT_SWAP === "当前账号已绑定其他微信号，请先解绑后更换",
  "拒绝类文案（一号多绑/换单绑口径）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WX-BIND TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
