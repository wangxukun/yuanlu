"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logVisit } from "@/lib/actions/log-actions";

export default function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 使用 ref 记录上一次访问的路径，避免 React 严格模式下的重复记录（可选优化）
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // 组合完整的 URL (包含查询参数，例如 ?page=1)
    const fullUrl =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    // 防止重复记录同一页面（如果需要记录刷新，可以去掉这个判断）
    // 或者仅仅依赖 pathname 变化

    const log = async () => {
      await logVisit(fullUrl);
    };

    log();

    lastPathRef.current = fullUrl;
  }, [pathname, searchParams]);

  return null; // 这个组件不渲染任何 UI
}
