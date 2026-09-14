"use client";

import { usePathname } from "next/navigation";

/**
 * 句子本/发音弱项本在复习中心(/review)与独立页(/library)双分支复用同一套组件，
 * 子页面（刷句复习/影子跟读/达人榜/闯关）入口与返回链接需要绝对路径前缀。
 *
 * 不能用相对路径：Segment Cache 的 Link 将相对 href 解析为相对于组件所属的
 * layout 路由段（如在 /review/sentences 页面上 "review" 会被解析成 /review/review），
 * 与标准 URL 解析语义不同，曾导致 404。
 */
export function useNotebookBase(module: "sentences" | "pronunciation"): string {
  const pathname = usePathname();
  return pathname?.startsWith("/review")
    ? `/review/${module}`
    : `/library/${module}`;
}
