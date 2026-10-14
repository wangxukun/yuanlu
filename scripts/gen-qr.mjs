/* global process */
// scripts/gen-qr.mjs — 小程序码生成客户端（公众号联动 T1）
//
// 生成动作发生在服务器端（IP 已白名单），本脚本只是 HTTP 客户端：
//   node scripts/gen-qr.mjs --scene gzh_follow --type follow
//   node scripts/gen-qr.mjs --scene gzh_w1_b --type episode --episode <cuid>
//   node scripts/gen-qr.mjs --scene gzh_w2_b --type article --article gzh_w2_b --episode <cuid>
//
// 参数：
//   --scene    短码（^[A-Za-z0-9_.\-]{1,32}$）
//   --type     follow | episode | article
//   --episode  剧集 cuid（type=episode/article 时需要）
//   --article  公众号文章编号（可选，对账用）
//   --page     落地页路径（可选，默认小程序首页）
//   --env      release | trial | develop（默认 release；小程序未发布线上版时用 trial 自测）
//   --base     API 基址（默认 https://www.wxkzd.com，本地联调可指 http://localhost:3000）
//
// 鉴权：环境变量 YUANLU_INTERNAL_SECRET（与 .env 中同名变量一致）。
// 产物：OSS URL（wxkzd bucket 的 wxacode/<scene>.jpg，public-read，可直接贴进公众号图文）。

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv);
const base = args.base || process.env.YUANLU_BASE || "https://www.wxkzd.com";
const secret = process.env.YUANLU_INTERNAL_SECRET;

if (!args.scene || !args.type) {
  console.error(
    "用法: node scripts/gen-qr.mjs --scene <短码> --type <follow|episode|article> [--episode <cuid>] [--article <编号>] [--page <路径>] [--env trial] [--base <url>]",
  );
  process.exit(1);
}
if (!secret) {
  console.error(
    "缺少环境变量 YUANLU_INTERNAL_SECRET（与后端 .env 同名变量一致）",
  );
  process.exit(1);
}

const payload = {
  scene: args.scene,
  targetType: args.type,
  episodeId: args.episode,
  articleNo: args.article,
  page: args.page,
  envVersion: args.env,
};

const res = await fetch(`${base}/api/wxacode`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-internal-secret": secret,
  },
  body: JSON.stringify(payload),
});

const body = await res.json().catch(() => ({}));

if (!res.ok || !body.success) {
  console.error(`生成失败（HTTP ${res.status}）:`, body.error ?? body);
  process.exit(1);
}

console.log(`✓ ${body.data.scene} → ${body.data.fileUrl}`);
