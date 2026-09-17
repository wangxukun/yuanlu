/**
 * [P3-d] 句子本导出（PRO 专属）——纯前端生成，零后端成本。
 *
 * 数据源为服务端已下发 sentences 列表，CSV 与 Anki 两种格式：
 * - CSV：全字段表格（原文/译文/笔记/标签/来源/时间），带 UTF-8 BOM 保证 Excel 中文不乱码
 * - Anki：Tab 分隔的 front/back/tags 三列 .txt，Anki「导入文件」直接可用
 *   （front=英文原句；back=中文译文 + 学习笔记；tags=句子标签）
 *
 * 触发导出前调用方需自行完成会员校验（免费用户弹 sentence_export 场景会员窗）。
 */
import type { SavedSentenceItem } from "@/core/sentences/dto";

/** CSV 全字段（逗号分隔 + 双引号转义，Excel/Numbers 直接打开） */
export function buildSentenceCsv(sentences: SavedSentenceItem[]): string {
  const esc = (v: string | null | undefined) =>
    `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "英文原句",
    "中文翻译",
    "学习笔记",
    "标签",
    "来源剧集",
    "收藏时间",
  ];
  const rows = sentences.map((s) =>
    [
      esc(s.enText),
      esc(s.zhText),
      esc(s.note),
      esc((s.tags || []).join(" ")),
      esc(s.episodeTitle),
      esc(new Date(s.createAt).toLocaleString("zh-CN")),
    ].join(","),
  );
  return "\uFEFF" + [header.join(","), ...rows].join("\r\n");
}

/** Anki 导入格式：front \t back \t tags（Anki 文件导入默认 Tab 分隔） */
export function buildAnkiDeck(sentences: SavedSentenceItem[]): string {
  const esc = (v: string) => v.replace(/\t/g, " ").replace(/\n/g, "<br>");
  const rows = sentences.map((s) => {
    const backParts = [s.zhText?.trim() || "", s.note?.trim() || ""]
      .filter(Boolean)
      .map(esc)
      .join("<br><br>");
    const tags = (s.tags || []).map((t) => t.replace(/\s+/g, "_")).join(" ");
    return [esc(s.enText), backParts, tags].filter(Boolean).join("\t");
  });
  return rows.join("\r\n");
}

/** 触发浏览器下载 */
export function downloadTextFile(
  content: string,
  fileName: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
