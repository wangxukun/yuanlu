import { generateSignatureUrl } from "../lib/oss";
import * as fs from "fs";

async function main() {
  const targets = [
    { name: "cut-corners", key: process.argv[2] },
    { name: "elan-pron", key: process.argv[3] },
  ];
  for (const t of targets) {
    if (!t.key) continue;
    const url = await generateSignatureUrl(t.key, 600);
    const res = await fetch(url);
    const data = await res.json();
    fs.writeFileSync(
      `D:/wxkzd/AI-Podcast-Studio/微信公众号/稿件/A5/${t.name}-双语字幕.json`,
      JSON.stringify(data, null, 1),
    );
    console.log(
      t.name,
      "sentences:",
      Array.isArray(data) ? data.length : Object.keys(data).length,
    );
  }
}
main();
