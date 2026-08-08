"use client";

import { useEffect } from "react";

// ─── Word Highlight (smooth, audio-driven) ─────────────────────────────────
// 随语速线性过渡的"扫光"效果：背景光斑由句首扫向句尾（当前朗读词），
// 已读词改为 accent 字体颜色（text-accent-700 dark:text-accent-300）便于跟读回看。
// 间隙越大（停顿/慢读）→ 过渡越慢；间隙越小（快读）→ 过渡越快，天然自适应语速。
// 直接读写 DOM（rgba 覆盖底色 + 插值字体色），绕开 React 渲染，保证 60fps。

export const ACCENT_BG_LIGHT = "250, 229, 198"; // accent-100 #FAE5C6
export const ACCENT_BG_DARK = "78, 46, 11"; // accent-900 #4E2E0B
// 已读词字体色：accent-700 / accent-300
export const READ_TEXT_LIGHT = [150, 88, 13]; // accent-700 #96580D
export const READ_TEXT_DARK = [236, 179, 94]; // accent-300 #ECB35E

export interface WordHighlightController {
  /** 当前播放秒（绝对，与 words 时间戳同一时间轴）；未播放时返回 -1 */
  getTime: () => number;
  /** 是否正在播放（决定是否点亮扫光） */
  isPlaying: () => boolean;
}

export interface WordLike {
  word: string;
  start: number;
  end: number;
}

/**
 * 可复用的单词扫光高亮 hook。
 *
 * @example
 * useWordHighlight({
 *   controller: {
 *     getTime: () => audioEl?.currentTime ?? -1,
 *     isPlaying: () => !!audioEl && !audioEl.paused,
 *   },
 *   containerRef,
 *   isHighlighted: isActive,
 *   words: sub.words,
 *   start: sub.start,
 *   end: sub.end,
 * });
 */
export function useWordHighlight(opts: {
  controller: WordHighlightController;
  containerRef: React.RefObject<HTMLElement | null>;
  isHighlighted: boolean;
  words?: WordLike[];
  start: number;
  end: number;
}) {
  const { controller, containerRef, isHighlighted, words, start, end } = opts;
  useEffect(() => {
    if (!isHighlighted || !words || words.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    // 背景光斑：当前朗读词全亮，其余词背景透明
    const applyBg = (el: HTMLElement, op: number) => {
      if (op <= 0) {
        el.style.backgroundColor = "";
        return;
      }
      const a = mql.matches ? (op * 0.4).toFixed(3) : op.toFixed(3);
      const base = mql.matches ? ACCENT_BG_DARK : ACCENT_BG_LIGHT;
      el.style.backgroundColor = `rgba(${base}, ${a})`;
    };

    // 已读词字体色：p=0 → 继承父级（primary），p=1 → accent
    const applyReadColor = (el: HTMLElement, p: number) => {
      if (p <= 0) {
        el.style.color = "";
        return;
      }
      const [r, g, b] = mql.matches ? READ_TEXT_DARK : READ_TEXT_LIGHT;
      el.style.color = `rgba(${r}, ${g}, ${b}, ${p.toFixed(3)})`;
    };

    const clearAll = () => {
      container.querySelectorAll<HTMLElement>("[data-wi]").forEach((el) => {
        el.style.backgroundColor = "";
        el.style.color = "";
      });
    };

    const tick = () => {
      const els = container.querySelectorAll<HTMLElement>("[data-wi]");

      if (!controller.isPlaying()) {
        // 未播放：清除 inline 样式，回落到 className 兜底
        clearAll();
      } else {
        const t = controller.getTime();
        if (t < start) {
          els.forEach((el) => {
            applyBg(el, 0);
            applyReadColor(el, 0);
          });
        } else if (t >= end) {
          // 整句已读完：全部转为已读字体色，背景透明
          els.forEach((el) => {
            applyBg(el, 0);
            applyReadColor(el, 1);
          });
        } else {
          // 定位当前词
          let k = -1;
          for (let i = 0; i < words.length; i++) {
            if (t >= words[i].start && t <= words[i].end) {
              k = i;
              break;
            }
          }
          if (k !== -1) {
            for (let i = 0; i < words.length; i++) {
              const el = els[i];
              if (!el) continue;
              if (i < k) {
                applyBg(el, 0);
                applyReadColor(el, 1); // 已读：accent 色
              } else if (i === k) {
                applyBg(el, 1); // 当前朗读词：背景全亮
                applyReadColor(el, 0); // 保持父级 primary
              } else {
                applyBg(el, 0);
                applyReadColor(el, 0); // 未读：primary
              }
            }
          } else {
            // 落在词间间隙：找出 prev（已读最后一个）、next（未读第一个）
            let prev = -1;
            let next = words.length;
            for (let i = 0; i < words.length; i++) {
              if (words[i].end < t) prev = i;
              if (words[i].start > t && next === words.length) next = i;
            }
            // 已读部分（< next）转 accent 色，未读部分保持 primary，背景均透明
            for (let i = 0; i < words.length; i++) {
              const el = els[i];
              if (!el) continue;
              if (i < next) {
                applyBg(el, 0);
                applyReadColor(el, 1);
              } else {
                applyBg(el, 0);
                applyReadColor(el, 0);
              }
            }
            // 在间隙内交叉过渡：
            //   背景：prev 1→0、next 0→1
            //   字体色：prev 0→1（primary→accent）、next 保持 0（primary）
            if (prev !== -1 && next < words.length) {
              const gap = words[next].start - words[prev].end;
              if (gap > 0) {
                const p = Math.min(1, Math.max(0, (t - words[prev].end) / gap));
                applyBg(els[prev], 1 - p);
                applyBg(els[next], p);
                applyReadColor(els[prev], p);
                applyReadColor(els[next], 0);
              }
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearAll();
    };
  }, [isHighlighted, controller, words, start, end, containerRef]);
}
