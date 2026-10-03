/**
 * scripts/test-msg-sec-check.mjs — UGC 内容安全检测单测（msgSecCheck）
 *
 * 直测 core/security/msg-sec-check.core.ts（零依赖纯函数）+
 * service 依赖注入联测（假 fetch / 假 token 源，覆盖 v1/v2 双协议、
 * 拒绝口径、access_token 失效强刷重试、fail-open 兜底）。
 * 运行：node scripts/test-msg-sec-check.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import { registerHooks } from "node:module";
import {
  buildSecCheckBody,
  parseSecCheckResponse,
  SEC_SCENE,
  TOKEN_RETRY_ERRCODES,
} from "../core/security/msg-sec-check.core.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}

console.log("━━━ 一、请求体构建（v1/v2 双协议） ━━━");
const v2Body = buildSecCheckBody({
  content: "hello",
  openid: "oABC",
  scene: 2,
});
assert(
  v2Body.content === "hello" &&
    v2Body.version === 2 &&
    v2Body.scene === 2 &&
    v2Body.openid === "oABC",
  "有 openid → v2 体 { content, version:2, scene, openid }",
);
const v1Body = buildSecCheckBody({ content: "hi", openid: null });
assert(
  JSON.stringify(Object.keys(v1Body)) === JSON.stringify(["content"]),
  "无 openid → v1 兼容体（仅 content，不带 version 字段）",
);
const v1BodyEmpty = buildSecCheckBody({ content: "hi" });
assert(
  !("openid" in v1BodyEmpty) && !("version" in v1BodyEmpty),
  "openid 缺省 → 同 v1 体",
);
assert(
  buildSecCheckBody({ content: "x", openid: "o" }).scene === SEC_SCENE.COMMENT,
  "scene 缺省 → COMMENT（评论场景）",
);
assert(
  SEC_SCENE.PROFILE === 1 && SEC_SCENE.COMMENT === 2,
  "scene 枚举 1=资料 2=评论",
);

console.log("━━━ 二、响应解析三态 ━━━");
assert(
  parseSecCheckResponse({ errcode: 0, result: { suggest: "pass", label: 100 } })
    .kind === "pass",
  "v2 suggest=pass → pass",
);
const rej = parseSecCheckResponse({
  errcode: 0,
  result: { suggest: "risky", label: 10001 },
});
assert(
  rej.kind === "reject" && rej.suggest === "risky" && rej.label === 10001,
  "v2 suggest=risky → reject（携带 label）",
);
assert(
  parseSecCheckResponse({
    errcode: 0,
    result: { suggest: "review", label: 20001 },
  }).kind === "reject",
  "v2 suggest=review → 拒绝（保守口径：非 pass 即拒）",
);
assert(
  parseSecCheckResponse({ errcode: 0 }).kind === "pass",
  "v1 errcode=0 → pass",
);
assert(
  parseSecCheckResponse({ errcode: 87014, errmsg: "risky content" }).kind ===
    "reject",
  "v1 errcode=87014 → reject（老协议归一）",
);
const errV = parseSecCheckResponse({
  errcode: 40001,
  errmsg: "invalid credential",
});
assert(
  errV.kind === "error" &&
    errV.errcode === 40001 &&
    TOKEN_RETRY_ERRCODES.has(40001) &&
    TOKEN_RETRY_ERRCODES.has(42001),
  "errcode=40001 → error 且属 token 失效重试集（40001/42001）",
);
assert(
  parseSecCheckResponse({ errcode: 45009 }).kind === "error" &&
    !TOKEN_RETRY_ERRCODES.has(45009),
  "errcode=45009（限频）→ error 且不触发 token 重试",
);
assert(
  parseSecCheckResponse({}).kind === "pass",
  "空响应 → pass（fail-open 同口径）",
);

console.log("━━━ 三、服务层（依赖注入联测） ━━━");
// TS 直跑解析钩子（对齐 test-wxpay-notify 模式）：@/core/* → 仓内 .ts、
// 相对无扩展名补 .ts；服务经动态 import 在钩子生效后加载
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/core/")) {
      return {
        url: new URL(
          "../core/" + specifier.slice("@/core/".length) + ".ts",
          import.meta.url,
        ).href,
        shortCircuit: true,
      };
    }
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        context.parentURL &&
        context.parentURL.endsWith(".ts")
      ) {
        return nextResolve(specifier + ".ts", context);
      }
      throw err;
    }
  },
});
const { checkUserGeneratedText } = await import(
  "../core/security/msg-sec-check.service.ts"
);
// 假 fetch：按序回放脚本化响应；假 token 源记录 force 调用
function makeDeps(responses, { networkFailAt = -1 } = {}) {
  const calls = { tokenForces: [], fetchUrls: [], fetchBodies: [] };
  let i = 0;
  const fetchImpl = async (url, init) => {
    if (i === networkFailAt) {
      i++;
      throw new Error("network down");
    }
    calls.fetchUrls.push(url);
    calls.fetchBodies.push(init.body);
    const r = responses[i] ?? { errcode: 0 };
    i++;
    return { json: async () => r };
  };
  const getToken = async (force) => {
    calls.tokenForces.push(force);
    return "T" + calls.tokenForces.length;
  };
  return { calls, deps: { getToken, fetchImpl } };
}

// ① v2 违规 → 拒绝，reason 透出
{
  const { deps } = makeDeps([
    { errcode: 0, result: { suggest: "risky", label: 10006 } },
  ]);
  const r = await checkUserGeneratedText(
    "bad",
    { openid: "oX", scene: 2 },
    deps,
  );
  assert(
    r.ok === false && /安全检测/.test(r.reason || ""),
    "① v2 risky → ok=false + reason 文案",
  );
}
// ② v1 违规（无 openid 用户）→ 拒绝
{
  const { deps } = makeDeps([{ errcode: 87014 }]);
  const r = await checkUserGeneratedText("bad", { openid: null }, deps);
  assert(r.ok === false, "② v1 87014（无微信绑定用户）→ ok=false");
}
// ③ 首轮 40001 → 强刷 token 重试一次后通过
{
  const { calls, deps } = makeDeps([
    { errcode: 40001, errmsg: "invalid credential" },
    { errcode: 0, result: { suggest: "pass", label: 100 } },
  ]);
  const r = await checkUserGeneratedText("ok", { openid: "oX" }, deps);
  assert(
    r.ok === true &&
      calls.tokenForces.length === 2 &&
      calls.tokenForces[0] === false &&
      calls.tokenForces[1] === true &&
      calls.fetchUrls.length === 2,
    "③ 40001 → 第二次 getToken(force=true) 强刷重试后通过",
  );
}
// ④ 非重试类 error（限频）→ 不重试、fail-open 放行
{
  const { calls, deps } = makeDeps([{ errcode: 45009, errmsg: "api limit" }]);
  const r = await checkUserGeneratedText("ok", { openid: "oX" }, deps);
  assert(
    r.ok === true &&
      calls.fetchUrls.length === 1 &&
      calls.tokenForces.length === 1,
    "④ 45009 限频 → 不重试直接放行（fail-open）",
  );
}
// ⑤ 网络异常首轮 → 第二次仍异常 → 放行
{
  const { calls, deps } = makeDeps([], { networkFailAt: 0 });
  // 让第二次也抛:networkFailAt 只抛一次,再给一个 500 后的 json error?——直接全抛:
  let n = 0;
  const deps2 = {
    getToken: async () => "T",
    fetchImpl: async () => {
      n++;
      throw new Error("timeout");
    },
  };
  const r = await checkUserGeneratedText("ok", {}, deps2);
  assert(r.ok === true && n === 2, "⑤ 网络两轮全挂 → 放行且恰试两次");
}
// ⑥ 请求体形态:v2 带 openid 的体确实发上网络
{
  const { calls, deps } = makeDeps([{ errcode: 0 }]);
  await checkUserGeneratedText("hello", { openid: "oNET", scene: 2 }, deps);
  const sent = JSON.parse(calls.fetchBodies[0]);
  assert(
    sent.version === 2 &&
      sent.openid === "oNET" &&
      sent.scene === 2 &&
      sent.content === "hello",
    "⑥ 线上请求体 = v2 形态（content/version/scene/openid）",
  );
  assert(
    calls.fetchUrls[0].startsWith(
      "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=T",
    ),
    "⑥ 目标 URL = msg_sec_check 且携带 access_token",
  );
}

console.log("──────────────────────");
if (failed) {
  console.error(`msg-sec-check 测试：${failed} 项失败`);
  process.exit(1);
}
console.log("msg-sec-check 测试：全部通过");
