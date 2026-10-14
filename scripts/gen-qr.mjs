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
//   --out      码图保存路径（默认 wxacode/<scene>.jpg；--out none 只打印 URL）
//
// 鉴权：自动读仓库根 .env 的 YUANLU_INTERNAL_SECRET（进程环境变量优先）——
// Windows CMD 不支持 "VAR=x cmd" 前缀写法，脚本自己读 .env 免去设置环境变量。
// 产物：OSS URL（wxkzd bucket 的 wxacode/<scene>.jpg，public-read，可直接贴进公众号图文）。

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** 从仓库根 .env 读取缺失的环境变量（简单 KEY=VALUE 解析，进程 env 优先） */
function loadDotenvDefaults() {
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (!(key in process.env)) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env 不存在（如服务器上凭真实环境变量运行）——跳过
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

loadDotenvDefaults();
const args = parseArgs(process.argv);
const base = args.base || process.env.YUANLU_BASE || "https://www.wxkzd.com";
const secret = process.env.YUANLU_INTERNAL_SECRET;

if (!args.scene || !args.type) {
  console.error(
    "用法: node scripts/gen-qr.mjs --scene <短码> --type <follow|episode|article> [--episode <cuid>] [--article <编号>] [--page <路径>] [--env trial] [--base <url>] [--out <路径|none>]",
  );
  process.exit(1);
}
if (!secret) {
  console.error(
    "缺少 YUANLU_INTERNAL_SECRET：脚本会自动读仓库根 .env，若在别处运行请设置同名环境变量",
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

// 签名 URL 7 天过期，默认把码图下载落盘（公众号素材库/欢迎卡片用的就是本地文件）
// --out <路径> 自定义保存位置；--out none 只打印 URL 不下载
const out =
  args.out === "none" ? null : args.out || `wxacode/${body.data.scene}.jpg`;
if (out) {
  const img = await fetch(body.data.fileUrl);
  if (!img.ok) {
    console.error(
      `✓ 已生成，但下载失败（HTTP ${img.status}）——可用 URL 手动下载：`,
    );
    console.log(`  ${body.data.fileUrl}`);
    process.exit(1);
  }
  const bytes = Buffer.from(await img.arrayBuffer());
  const dir = dirname(out);
  if (dir && dir !== ".") mkdirSync(dir, { recursive: true });
  writeFileSync(out, bytes);
  console.log(`✓ ${body.data.scene} 已保存到 ${out}（${bytes.length} 字节）`);
  console.log(`  备用签名 URL（7 天有效）：${body.data.fileUrl}`);
} else {
  console.log(`✓ ${body.data.scene} → ${body.data.fileUrl}（7 天有效）`);
}
