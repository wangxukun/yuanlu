import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * 语音评测设置中心
 *
 * 除 weakThreshold（额外同步到 user_profile 后端）外，其余配置均仅持久化到 localStorage。
 * 换剧集后保留，无需重新配置。
 */

export type TextMode = "normal" | "ipa" | "blind";
export type Strictness = "lenient" | "standard" | "strict";
export type PlaybackRate = 0.75 | 1.0 | 1.25;

export interface PracticeSettingsState {
  // ── 界面与显示 ──
  /** 字幕字号档位（0=小 1=中 2=大） */
  fontSizeLevel: number;
  /** 默认显示中文翻译 */
  showTranslation: boolean;
  /** 结果区显示音素 /IPA 诊断块 */
  showIpa: boolean;
  /** 文本模式：原文 / 音标 / 盲读遮罩 */
  textMode: TextMode;

  // ── 评测与弱项 ──
  /** 过关分数线（自动跳下一句 / 标记完成的判定基准） */
  passThreshold: number;
  /** 评测严格度：影响 effectivePassThreshold 的偏移 */
  strictness: Strictness;
  /** 弱项本分数线（同步到 user_profile.weakScoreThreshold） */
  weakThreshold: number;
  /** 句子长度过滤：最小词数 */
  minWords: number;
  /** 句子长度过滤：最大词数 */
  maxWords: number;
  /** 只练未掌握（隐藏最新得分已达标的句子） */
  onlyUnmastered: boolean;

  // ── 声音与跟读 ──
  /** 评测达标后自动跳下一句 */
  autoAdvance: boolean;
  /** 评测出分后自动播放 原音 → 我的录音 */
  autoCompare: boolean;
  /** 单句循环 */
  loopSentence: boolean;
  /** 参考音 / 录音回放语速 */
  playbackRate: PlaybackRate;

  // ── setters ──
  setFontSizeLevel: (v: number) => void;
  setShowTranslation: (v: boolean) => void;
  setShowIpa: (v: boolean) => void;
  setTextMode: (v: TextMode) => void;
  setPassThreshold: (v: number) => void;
  setStrictness: (v: Strictness) => void;
  setWeakThreshold: (v: number) => void;
  setMinWords: (v: number) => void;
  setMaxWords: (v: number) => void;
  setOnlyUnmastered: (v: boolean) => void;
  setAutoAdvance: (v: boolean) => void;
  setAutoCompare: (v: boolean) => void;
  setLoopSentence: (v: boolean) => void;
  setPlaybackRate: (v: PlaybackRate) => void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const usePracticeSettingsStore = create<PracticeSettingsState>()(
  persist(
    (set) => ({
      fontSizeLevel: 1,
      showTranslation: false,
      showIpa: false,
      textMode: "normal",

      passThreshold: 80,
      strictness: "standard",
      weakThreshold: 80,
      minWords: 0,
      // 50 代表「不限」（Stepper 上限为 50，显示 50+）；与 ImmersiveSpeechPractice
      // 的过滤条件 maxWords < 50 配合，默认不按最大词数过滤。
      maxWords: 50,
      onlyUnmastered: false,

      autoAdvance: true,
      autoCompare: false,
      loopSentence: false,
      playbackRate: 1.0,

      setFontSizeLevel: (v) => set({ fontSizeLevel: clamp(v, 0, 2) }),
      setShowTranslation: (v) => set({ showTranslation: v }),
      setShowIpa: (v) => set({ showIpa: v }),
      setTextMode: (v) => set({ textMode: v }),
      setPassThreshold: (v) => set({ passThreshold: clamp(v, 60, 95) }),
      setStrictness: (v) => set({ strictness: v }),
      setWeakThreshold: (v) => set({ weakThreshold: clamp(v, 60, 95) }),
      setMinWords: (v) => set({ minWords: Math.max(0, Math.min(50, v)) }),
      setMaxWords: (v) => set({ maxWords: Math.max(0, Math.min(50, v)) }),
      setOnlyUnmastered: (v) => set({ onlyUnmastered: v }),
      setAutoAdvance: (v) => set({ autoAdvance: v }),
      setAutoCompare: (v) => set({ autoCompare: v }),
      setLoopSentence: (v) => set({ loopSentence: v }),
      setPlaybackRate: (v) => set({ playbackRate: v }),
    }),
    {
      name: "practice-settings",
      storage: createJSONStorage(() => localStorage),
      // 该 store 仅被 "use client" 组件（ImmersiveSpeechPractice / PracticeSettingsPanel）
      // 消费，不存在 SSR 水合问题，因此使用 persist 默认的自动 hydrate，
      // 避免手动 rehydrate 带来的时序问题（曾导致开关改动不即时生效）。
    },
  ),
);

/**
 * 严格度 → 过关线偏移。
 * lenient 偏宽松（更易过关），strict 偏严格。
 */
const STRICTNESS_OFFSET: Record<Strictness, number> = {
  lenient: -5,
  standard: 0,
  strict: 5,
};

/** 实际生效的过关分数线（已叠加严格度偏移，并夹到 [0,100]） */
export const selectEffectivePassThreshold = (s: PracticeSettingsState) =>
  clamp(s.passThreshold + STRICTNESS_OFFSET[s.strictness], 0, 100);

/**
 * 字幕字号档位（小/中/大）的 Tailwind class。
 *
 * 注意：这些 class 字符串必须出现在 Tailwind content 扫描范围内的文件里
 * （tailwind.config 的 content 仅扫描 ./app 与 ./components），
 * 因此实际定义放在 components/voice/SettingsControls.tsx，这里仅 re-export，
 * 以便 store 消费方沿用旧导入路径。
 */
export { PRACTICE_FONT_SIZE_LEVELS } from "@/components/voice/SettingsControls";
