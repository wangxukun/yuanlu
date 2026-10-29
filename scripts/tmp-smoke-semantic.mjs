import fs from "node:fs";
import path from "node:path";
for (const line of fs
  .readFileSync(path.join(process.cwd(), ".env"), "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const route = await import("../app/api/scenes/semantic-search/route.ts");
for (const q of ["电话预约", "机场值机", "面试自我介绍"]) {
  const r = await route.POST(
    new Request("http://localhost/api/scenes/semantic-search", {
      method: "POST",
      body: JSON.stringify({ q }),
    }),
  );
  const j = await r.json();
  console.log(`\n[${q}]`);
  (j.data?.items || []).forEach((it, i) =>
    console.log(`  ${i + 1}. ${it.enText.slice(0, 62)}`),
  );
}
