/**
 * 远路设计系统 · 一次性换肤脚本
 * 用法: node scripts/retheme.mjs
 * 范围: app/ components/ 下的 .tsx .ts .css
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components"];
const EXTS = new Set([".tsx", ".ts", ".css", ".jsx", ".js"]);

/** 有序替换规则：[名称, 正则, 替换值] */
const RULES = [
  // --- 特殊类名修正 ---
  ["episode-bg-arbitrary", /bg-\[#f9f9ff\]/gi, "bg-ink-50"],
  ["lexend-class", /\s*font-\['Lexend', ?sans-serif\]/g, ""],

  // --- 内联字体移除（仅当 style 对象只含 fontFamily 一个键时）---
  // 注意：不匹配 TranscriptPreviewModal 中多键 style（fontFamily 后带逗号）
  ["inline-font-family", /\s*style=\{\{\s*fontFamily:\s*"[^"]*"\s*\}\}/g, ""],

  // --- 硬编码品牌紫/冷灰 hex → 远路色板 ---
  ["hex-5830E0", /#5830E0/gi, "#1F7A5C"],
  ["hex-470fd0", /#470fd0/gi, "#1A6349"],
  ["hex-4f46e5", /#4f46e5/gi, "#1F7A5C"],
  ["hex-4338ca", /#4338ca/gi, "#1A6349"],
  ["hex-6366f1", /#6366f1/gi, "#2E8F6F"],
  ["hex-818cf8", /#818cf8/gi, "#4DA989"],
  ["hex-e0e7ff", /#e0e7ff/gi, "#D5EDE1"],
  ["hex-eef2ff", /#eef2ff/gi, "#EDF7F2"],
  ["hex-e7eeff", /#e7eeff/gi, "#D5EDE1"],
  ["hex-94a3b8", /#94a3b8/gi, "#A79E8A"],
  ["rgba-90-66-232", /rgba\(90,\s*66,\s*232/gi, "rgba(31,122,92"],
  ["rgba-79-70-229", /rgba\(79,\s*70,\s*229/gi, "rgba(31,122,92"],

  // --- 色板族映射（lookbehind 仅排除字母，防止误伤 shared-/colored- 等）---
  ["slate", /(?<![a-zA-Z])slate-/g, "ink-"],
  ["gray", /(?<![a-zA-Z])gray-/g, "ink-"],
  ["indigo", /(?<![a-zA-Z])indigo-/g, "primary-"],
  ["emerald", /(?<![a-zA-Z])emerald-/g, "primary-"],
  ["green", /(?<![a-zA-Z])green-/g, "primary-"],
  ["purple", /(?<![a-zA-Z])purple-/g, "accent-"],
  ["orange", /(?<![a-zA-Z])orange-/g, "accent-"],
  ["blue", /(?<![a-zA-Z])blue-/g, "info-"],
  ["sky", /(?<![a-zA-Z])sky-/g, "info-"],
  ["cyan", /(?<![a-zA-Z])cyan-/g, "info-"],
  ["violet", /(?<![a-zA-Z])violet-/g, "info-"],
  ["yellow", /(?<![a-zA-Z])yellow-/g, "accent-"],
  ["rose", /(?<![a-zA-Z])rose-/g, "error-"],
  ["red", /(?<![a-zA-Z])red-/g, "error-"],

  // --- 品牌渐变拍平（须在色板映射之后执行）---
  [
    "flatten-brand-gradient",
    /bg-gradient-to-(?:r|l|t|b|tr|tl|br|bl) from-primary-\d{3}(?: via-[a-z]+-\d{3}(?:\/\d+)?)? to-accent-\d{3}/g,
    "bg-primary-600",
  ],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (EXTS.has(extname(name))) yield p;
  }
}

let totalFiles = 0;
const ruleHits = Object.fromEntries(RULES.map(([n]) => [n, 0]));

for (const root of ROOTS) {
  for (const file of walk(root)) {
    let src = readFileSync(file, "utf8");
    let out = src;
    for (const [name, re, to] of RULES) {
      out = out.replace(re, (...args) => {
        ruleHits[name]++;
        return to;
      });
    }
    if (out !== src) {
      writeFileSync(file, out, "utf8");
      totalFiles++;
      console.log("updated:", file);
    }
  }
}

console.log("\n=== 汇总 ===");
console.log("修改文件数:", totalFiles);
for (const [n, c] of Object.entries(ruleHits)) if (c) console.log(`${n}: ${c}`);
