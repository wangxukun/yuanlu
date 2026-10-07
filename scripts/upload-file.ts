/**
 * 通用 OSS 直传工具：npx tsx scripts/upload-file.ts <本地文件> <OSS key>
 * 返回 JSON { fileUrl, fileName }（与站点 /api/podcast/upload-* 接口返回一致）。
 * 用途：大文件经站点 API 上传触发 500 时，绕过 API 直接上传 OSS。
 * 注意：lib/oss.ts 在模块加载时读取 env，必须先加载 .env 再动态 import。
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

async function main() {
  const [localPath, key] = process.argv.slice(2);
  if (!localPath || !key) {
    console.error("usage: npx tsx scripts/upload-file.ts <localPath> <ossKey>");
    process.exit(1);
  }
  const { uploadFile } = await import("@/lib/oss");
  const buffer = fs.readFileSync(localPath);
  const { fileUrl, fileName } = await uploadFile(buffer, key);
  console.log(JSON.stringify({ fileUrl, fileName }));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
