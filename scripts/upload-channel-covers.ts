/**
 * 频道品牌横幅批量上传 OSS：npx tsx scripts/upload-channel-covers.ts
 * 将 assets/channel-covers/ 下所有图片上传到 OSS channel-covers/ 前缀（私有 ACL，
 * 经 /api/channels 与服务端渲染以长时效签名 URL 分发——当前 RAM 策略禁止 public-read）。
 * 注意：lib/oss.ts 在模块加载时读取 env，必须先加载 .env 再动态 import（同 upload-file.ts）。
 */
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

async function main() {
  const localDir = path.join(process.cwd(), "assets", "channel-covers");
  const files = fs
    .readdirSync(localDir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (files.length === 0) {
    console.error(`no images found in ${localDir}`);
    process.exit(1);
  }

  const { uploadFile } = await import("@/lib/oss");
  for (const file of files) {
    const key = `channel-covers/${file}`;
    const buffer = fs.readFileSync(path.join(localDir, file));
    const { fileName } = await uploadFile(buffer, key);
    console.log(`${file} -> ${fileName}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
