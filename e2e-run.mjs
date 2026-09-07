// E2E 断言脚本：对运行中的 dev 服务器执行学习路径 9 端点全量验证。
// 覆盖：401 未登录 / 双用户权限矩阵（拥有者 vs 非拥有者）/ 业务失败口径 / 全 CRUD。
import { readFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3000";
const { tokenA, tokenB, episode1, episode2 } = JSON.parse(
  readFileSync("e2e-tokens.json", "utf8"),
);

let passed = 0;
let failed = 0;

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const results = [];
console.log("== 1. 未登录鉴权 ==");
{
  const r = await api("GET", "/api/learning-paths/mine");
  check("GET mine 未登录 -> 401", r.status === 401, `got ${r.status}`);
  const r2 = await api("POST", "/api/learning-paths", null, { pathName: "x" });
  check("POST create 未登录 -> 401", r2.status === 401, `got ${r2.status}`);
}

console.log("== 2. 创建（用户A 私有路径）==");
let P1;
{
  const r = await api("POST", "/api/learning-paths", tokenA, {
    pathName: "E2E甲的私有路径",
    description: "端到端测试数据，稍后删除",
    isPublic: false,
  });
  P1 = r.json?.data?.pathid;
  check(
    "POST create -> success + pathid",
    r.status === 200 && r.json?.success && P1 > 0,
    JSON.stringify(r.json),
  );

  const bad = await api("POST", "/api/learning-paths", tokenA, {
    pathName: "",
  });
  check(
    "POST create 空名称 -> 400",
    bad.status === 400 && bad.json?.success === false,
    `got ${bad.status}`,
  );

  const mine = await api("GET", "/api/learning-paths/mine", tokenA);
  const summary = mine.json?.data?.find?.((p) => p.pathid === P1);
  check(
    "GET mine 包含新路径（进度0/0集）",
    mine.json?.success &&
      summary &&
      summary.itemCount === 0 &&
      summary.progress === 0 &&
      summary.creatorName === "安卓E2E甲",
    JSON.stringify(summary),
  );

  const pub = await api("GET", "/api/learning-paths/public", tokenA);
  check(
    "GET public 不含私有路径",
    pub.json?.success && !pub.json.data.some((p) => p.pathid === P1),
    "",
  );
}

console.log("== 3. 添加剧集（重复/不存在）==");
let item1Id;
{
  const r1 = await api("POST", `/api/learning-paths/${P1}/episodes`, tokenA, {
    episodeid: episode1,
  });
  check(
    "POST episodes ep1 -> success",
    r1.json?.success === true,
    JSON.stringify(r1.json),
  );

  const dup = await api("POST", `/api/learning-paths/${P1}/episodes`, tokenA, {
    episodeid: episode1,
  });
  check(
    "POST episodes 重复 -> 200 + success=false + message",
    dup.status === 200 &&
      dup.json?.success === false &&
      dup.json?.message === "该剧集已在列表中",
    JSON.stringify(dup),
  );

  await api("POST", `/api/learning-paths/${P1}/episodes`, tokenA, {
    episodeid: episode2,
  });

  const bad = await api("POST", `/api/learning-paths/${P1}/episodes`, tokenA, {
    episodeid: "nonexistent-xyz",
  });
  check("POST episodes 不存在 -> 400", bad.status === 400, `got ${bad.status}`);

  const noBody = await api(
    "POST",
    `/api/learning-paths/${P1}/episodes`,
    tokenA,
    {},
  );
  check(
    "POST episodes 缺参 -> 400",
    noBody.status === 400,
    `got ${noBody.status}`,
  );
}

console.log("== 4. 详情（拥有者装配）==");
{
  const r = await api("GET", `/api/learning-paths/${P1}`, tokenA);
  const d = r.json?.data;
  check(
    "GET detail -> success",
    r.json?.success === true && d?.pathid === P1,
    JSON.stringify(r.json).slice(0, 200),
  );
  check(
    "detail userid = 用户A",
    d?.userid?.startsWith("android-e2e-user-a"),
    d?.userid,
  );
  check(
    "detail items=2 且 order 递增",
    d?.items?.length === 2 && d.items[0].order <= d.items[1].order,
    JSON.stringify(d?.items?.map((i) => i.order)),
  );
  const ep = d?.items?.[0]?.episode;
  check(
    "episode 快照完整（标题/播客/时长/签名URL/收听态）",
    ep?.title &&
      ep?.podcast?.title &&
      typeof ep?.duration === "number" &&
      typeof ep?.coverUrl === "string" &&
      ep.coverUrl.includes("http") &&
      typeof ep?.audioUrl === "string" &&
      ep.audioUrl.includes("http") &&
      ep?.progressSeconds === 0 &&
      ep?.isFinished === false,
    JSON.stringify(ep).slice(0, 160),
  );
  check(
    "路径封面 = 第一集封面",
    d?.coverUrl === d?.items?.[0]?.episode?.coverUrl,
    "",
  );
  item1Id = d?.items?.[0]?.id;
  const r404 = await api("GET", "/api/learning-paths/99999999", tokenA);
  check("GET detail 不存在 -> 404", r404.status === 404, `got ${r404.status}`);
}

console.log("== 5. 编辑（拥有者）==");
{
  const r = await api("PATCH", `/api/learning-paths/${P1}`, tokenA, {
    pathName: "E2E甲改名后的路径",
    description: null,
    isPublic: false,
  });
  check("PATCH -> success", r.json?.success === true, JSON.stringify(r.json));
  const d = await api("GET", `/api/learning-paths/${P1}`, tokenA);
  check(
    "改名生效",
    d.json?.data?.pathName === "E2E甲改名后的路径",
    d.json?.data?.pathName,
  );
  const bad = await api("PATCH", `/api/learning-paths/${P1}`, tokenA, {
    pathName: "",
  });
  check("PATCH 空名称 -> 400", bad.status === 400, `got ${bad.status}`);
}

console.log("== 6. 公开路径（用户B）与非拥有者权限 ==");
let P2;
{
  const r = await api("POST", "/api/learning-paths", tokenB, {
    pathName: "E2E乙的公开路径",
    isPublic: true,
  });
  P2 = r.json?.data?.pathid;
  check("B 创建公开路径", P2 > 0, JSON.stringify(r.json));

  const pub = await api("GET", "/api/learning-paths/public", tokenA);
  const found = pub.json?.data?.find?.((p) => p.pathid === P2);
  check(
    "A 的发现列表包含 B 的公开路径",
    found && found.creatorName === "安卓E2E乙",
    JSON.stringify(found),
  );

  const mineA = await api("GET", "/api/learning-paths/mine", tokenA);
  check(
    "A 的我的集合不含 B 的路径",
    !mineA.json?.data?.some((p) => p.pathid === P2),
    "",
  );

  const secret = await api("GET", `/api/learning-paths/${P1}`, tokenB);
  check(
    "B 访问 A 的私有路径 -> 403",
    secret.status === 403,
    `got ${secret.status}`,
  );

  const pubDetail = await api("GET", `/api/learning-paths/${P2}`, tokenA);
  check(
    "A 访问 B 的公开路径 -> success（isOwner 数据齐全）",
    pubDetail.json?.success &&
      pubDetail.json?.data?.userid?.startsWith("android-e2e-user-b"),
    "",
  );

  const patch = await api("PATCH", `/api/learning-paths/${P2}`, tokenA, {
    pathName: "越权",
    isPublic: true,
  });
  check("A 改 B 的路径 -> 403", patch.status === 403, `got ${patch.status}`);

  const del = await api("DELETE", `/api/learning-paths/${P2}`, tokenA);
  check("A 删 B 的路径 -> 403", del.status === 403, `got ${del.status}`);

  const add = await api("POST", `/api/learning-paths/${P2}/episodes`, tokenA, {
    episodeid: episode1,
  });
  check("A 给 B 的路径加剧集 -> 403", add.status === 403, `got ${add.status}`);
}

console.log("== 7. 移除剧集 ==");
{
  const r = await api(
    "DELETE",
    `/api/learning-paths/${P1}/episodes/${item1Id}`,
    tokenA,
  );
  check(
    "DELETE item -> success",
    r.json?.success === true,
    JSON.stringify(r.json),
  );
  const d = await api("GET", `/api/learning-paths/${P1}`, tokenA);
  check("移除后 items=1", d.json?.data?.items?.length === 1, "");
  const notFound = await api(
    "DELETE",
    `/api/learning-paths/${P1}/episodes/99999999`,
    tokenA,
  );
  check(
    "DELETE 不存在条目 -> 404",
    notFound.status === 404,
    `got ${notFound.status}`,
  );
}

console.log("== 8. 剧集搜索 ==");
{
  const r = await api(
    "GET",
    "/api/episode/search-for-path?query=climate",
    tokenA,
  );
  check(
    "搜索 climate -> 非空结果（含 id/title/author/thumbnailUrl/duration）",
    r.json?.success &&
      r.json.data.length > 0 &&
      r.json.data[0].id &&
      r.json.data[0].title &&
      r.json.data[0].thumbnailUrl &&
      typeof r.json.data[0].duration === "number",
    JSON.stringify(r.json?.data?.[0]).slice(0, 140),
  );
  const blank = await api("GET", "/api/episode/search-for-path?query=", tokenA);
  check(
    "空 query -> 空数组",
    blank.json?.success && blank.json.data.length === 0,
    "",
  );
  const noAuth = await api("GET", "/api/episode/search-for-path?query=a", null);
  check("搜索未登录 -> 401", noAuth.status === 401, `got ${noAuth.status}`);
}

console.log("== 9. 删除路径（级联清理）==");
{
  const r1 = await api("DELETE", `/api/learning-paths/${P1}`, tokenA);
  const r2 = await api("DELETE", `/api/learning-paths/${P2}`, tokenB);
  check(
    "A/B 删除各自路径 -> success",
    r1.json?.success && r2.json?.success,
    "",
  );
  const g1 = await api("GET", `/api/learning-paths/${P1}`, tokenA);
  check("删除后详情 -> 404", g1.status === 404, `got ${g1.status}`);
}

console.log(`\n==== 结果: ${passed} passed, ${failed} failed ====`);
process.exit(failed > 0 ? 1 : 0);
