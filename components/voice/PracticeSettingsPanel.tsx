"use client";

import React from "react";
import ThemeSwitcher from "@/components/theme-switcher";
import { usePracticeSettingsStore } from "@/store/practice-settings-store";
import { updateWeakScoreThreshold } from "@/lib/actions/speech";
import {
  SettingsRow,
  Toggle,
  Stepper,
  Segmented,
  SettingsGroupTitle,
  SettingsDivider,
} from "./SettingsControls";

/**
 * 弱项分数线防抖同步到后端。
 * 仅在值确实变化后调用 server action，避免拖动时频繁请求。
 */
function useDebouncedWeakThresholdSync() {
  const weakThreshold = usePracticeSettingsStore((s) => s.weakThreshold);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateWeakScoreThreshold(weakThreshold).catch(() => {
        // 静默失败：本地值仍生效，下次保存评测时会以服务端值为准
      });
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [weakThreshold]);
}

/**
 * 语音评测设置面板内容（三组：界面与显示 / 评测与弱项 / 声音与跟读）。
 * 纯展示 + 控件，不含弹层容器。供 Drawer 与移动端下拉复用。
 */
export default function PracticeSettingsPanel() {
  const s = usePracticeSettingsStore();
  useDebouncedWeakThresholdSync();

  return (
    <div className="text-ink-800 dark:text-ink-100">
      {/* ── 界面与显示 ── */}
      <SettingsGroupTitle>🎨 界面与显示</SettingsGroupTitle>

      <SettingsRow icon="contrast" label="深浅色">
        <ThemeSwitcher className="flex items-center justify-center w-8 h-8 rounded-xl text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors" />
      </SettingsRow>

      <SettingsRow icon="format_size" label="字幕字号">
        <Stepper
          value={s.fontSizeLevel}
          onChange={s.setFontSizeLevel}
          min={0}
          max={2}
          displayValue={["小", "中", "大"][s.fontSizeLevel]}
        />
      </SettingsRow>

      <SettingsRow
        icon="translate"
        label="显示中文翻译"
        onClick={() => s.setShowTranslation(!s.showTranslation)}
      >
        <Toggle checked={s.showTranslation} />
      </SettingsRow>

      <SettingsRow
        icon="record_voice_over"
        label="显示音标 /IPA"
        onClick={() => s.setShowIpa(!s.showIpa)}
      >
        <Toggle checked={s.showIpa} />
      </SettingsRow>

      <SettingsRow icon="visibility" label="文本模式">
        <Segmented
          value={s.textMode}
          onChange={s.setTextMode}
          options={[
            { value: "normal", label: "原文" },
            { value: "ipa", label: "音标" },
            { value: "blind", label: "盲读" },
          ]}
        />
      </SettingsRow>

      <SettingsDivider />

      {/* ── 评测与弱项 ── */}
      <SettingsGroupTitle>🎯 评测与弱项</SettingsGroupTitle>

      <SettingsRow icon="check_circle" label="过关分数线">
        <Stepper
          value={s.passThreshold}
          onChange={s.setPassThreshold}
          min={60}
          max={95}
          step={5}
        />
      </SettingsRow>

      <SettingsRow icon="tune" label="评测严格度">
        <Segmented
          value={s.strictness}
          onChange={s.setStrictness}
          options={[
            { value: "lenient", label: "宽松" },
            { value: "standard", label: "标准" },
            { value: "strict", label: "严格" },
          ]}
        />
      </SettingsRow>

      <SettingsRow icon="bookmark" label="弱项本分数线">
        <Stepper
          value={s.weakThreshold}
          onChange={s.setWeakThreshold}
          min={60}
          max={95}
          step={5}
        />
      </SettingsRow>

      <SettingsRow icon="text_fields" label="句子最小词数">
        <Stepper value={s.minWords} onChange={s.setMinWords} min={0} max={50} />
      </SettingsRow>

      <SettingsRow icon="text_fields" label="句子最大词数">
        <Stepper
          value={s.maxWords}
          onChange={s.setMaxWords}
          min={0}
          max={50}
          displayValue={s.maxWords >= 50 ? "50+" : s.maxWords}
        />
      </SettingsRow>

      <SettingsRow
        icon="filter_alt"
        label="只练未掌握"
        onClick={() => s.setOnlyUnmastered(!s.onlyUnmastered)}
      >
        <Toggle checked={s.onlyUnmastered} />
      </SettingsRow>

      <SettingsDivider />

      {/* ── 声音与跟读 ── */}
      <SettingsGroupTitle>🎙️ 声音与跟读</SettingsGroupTitle>

      <SettingsRow
        icon="skip_next"
        label="自动跳下一句"
        onClick={() => s.setAutoAdvance(!s.autoAdvance)}
      >
        <Toggle checked={s.autoAdvance} />
      </SettingsRow>

      <SettingsDivider />
      <p className="px-3 py-1.5 text-[11px] leading-relaxed text-ink-400 dark:text-ink-500">
        ←/→ 切换句子 · Space 录音/停止 · Esc 收起
      </p>
      <p className="px-3 pb-1.5 text-[11px] text-ink-300 dark:text-ink-600">
        设置自动保存到本机，弱项本分数线会同步到云端
      </p>
    </div>
  );
}
