import { useEffect, useRef, useState, RefObject } from "react";
import { SelectionMenuState, ProcessedSubtitle } from "./types";

export function useTranscriptSelection(
  containerRef: RefObject<HTMLDivElement | null>,
  processedSubtitles: ProcessedSubtitle[],
) {
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>({
    visible: false,
    x: 0,
    y: 0,
    text: "",
    contextEn: "",
    contextZh: "",
  });

  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      // 防抖处理：等待用户手指离开或停止拖动 handles
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();

        // 1. 基础校验：无选区或选区收起时，隐藏菜单
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          setSelectionMenu((prev) =>
            prev.visible ? { ...prev, visible: false } : prev,
          );
          return;
        }

        const text = selection.toString().trim();
        if (!text) return;

        // 2. 校验选区是否在当前组件容器内
        // 使用 anchorNode (开始点) 来判断
        const anchorNode = selection.anchorNode;
        if (!anchorNode || !containerRef.current?.contains(anchorNode)) {
          return;
        }

        // 3. 反向查找：通过 DOM 结构找到对应的字幕数据
        const parentElement =
          anchorNode.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : (anchorNode as HTMLElement);

        const subtitleRow = parentElement?.closest('[id^="subtitle-"]');

        if (subtitleRow) {
          const idStr = subtitleRow.id.split("-")[1];
          const subId = parseInt(idStr, 10);
          const subData = processedSubtitles.find((s) => s.id === subId);

          if (subData) {
            // 4. 计算菜单位置
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 移动端优化：如果 rect.width 为 0 (异常情况)，则不显示
            if (rect.width === 0 && rect.height === 0) return;

            setSelectionMenu({
              visible: true,
              x: rect.left + rect.width / 2, // 水平居中
              y: rect.top, // 显示在选区顶部
              text: text,
              contextEn: subData.textEn,
              contextZh: subData.textZh,
            });
          }
        }
      }, 300); // 延迟 300ms，给予移动端 selection handles 动画时间
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    // 监听滚动事件，滚动时隐藏菜单，避免位置错乱
    document.addEventListener(
      "scroll",
      () => {
        setSelectionMenu((prev) =>
          prev.visible ? { ...prev, visible: false } : prev,
        );
      },
      { capture: true, passive: true },
    );

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [processedSubtitles, containerRef]);

  // 全局点击监听 (辅助关闭)
  useEffect(() => {
    const handleGlobalClick = () => {
      // 只有当有菜单且选区为空时才关闭，否则 selectionchange 会负责处理
      const selection = window.getSelection();
      if (selection?.isCollapsed) {
        setSelectionMenu((prev) =>
          prev.visible ? { ...prev, visible: false } : prev,
        );
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    window.addEventListener("touchstart", handleGlobalClick);

    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("touchstart", handleGlobalClick);
    };
  }, []);

  return { selectionMenu, setSelectionMenu };
}
