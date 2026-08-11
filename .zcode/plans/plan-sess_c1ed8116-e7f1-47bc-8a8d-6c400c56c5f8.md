# 语音评测 Settings 设置中心 — 实现计划（含盲读/遮罩模式）

## 总体结构（Drawer + 下拉双形态，三组分类）

桌面：右侧滑入 Drawer（`z-[210]`，高于沉浸层 `z-[200]`）；移动端：下拉面板（复用 FCT 样式，`z-50`）。触发图标用 Material Symbols `settings`。

```
⚙️ 语音评测设置
├── 🎨 界面与显示
│   ├── 深浅色（ThemeSwitcher）
│   ├── 字幕字号（A- / A+ 步进器，3 档）
│   ├── 显示中文翻译（开关）
│   ├── 显示音标 /IPA（开关，控制结果区音素块）
│   └── 文本模式（分段：原文 / 拼音音标 / 盲读遮罩）★ 高阶练习
├── 🎯 评测与弱项
│   ├── 过关分数线（步进器，默认 80，60–95）
│   ├── 评测严格度（宽松/标准/严格，影响过关线偏移）
│   ├── 弱项本分数线（步进器，默认 80，写入后端）★
│   ├── 句子长度过滤（最小 / 最大词数步进器）
│   └── 只练未掌握（开关，隐藏已达标句子）
└── 🎙️ 声音与跟读
    ├── 自动跳下一句（开关）
    ├── 自动播放对比（开关：原音 → 我的录音）
    ├── 单句循环（开关）
    └── 语速（0.75 / 1.0 / 1.25 分段）
```

★ = 重点项（见下文详述）。复用 `FullContentTranscript.tsx:332-379` 的 `SettingsRow`/`Toggle` 视觉，但提取为共享文件 `components/voice/SettingsControls.tsx`（导出 `SettingsRow`、`Toggle`、`Stepper`、`Segmented`）。

---

## 第 1 步：新建设置 Store（localStorage 持久化）

**新文件 `store/practice-settings-store.ts`** — Zustand + `persist` 中间件（zustand v5，`skipHydration:true` 配合客户端 mount 避免 SSR 水合问题；若 persist 有坑则退回 FCT 已验证的手动 `useEffect`+`localStorage` 模式）。

```ts
type TextMode = "normal" | "ipa" | "blind"; // 原文 / 音标 / 盲读遮罩

interface PracticeSettings {
  // 显示
  fontSizeLevel: number; // 0-2
  showTranslation: boolean; // 默认 true
  showIpa: boolean; // 默认 false（结果区音素）
  textMode: TextMode; // 默认 'normal'
  // 评测
  passThreshold: number; // 默认 80
  strictness: "lenient" | "standard" | "strict";
  weakThreshold: number; // 默认 80，额外同步后端
  minWords: number; // 默认 0
  maxWords: number; // 默认 999
  onlyUnmastered: boolean; // 默认 false
  // 声音
  autoAdvance: boolean; // 默认 true
  autoCompare: boolean; // 默认 false
  loopSentence: boolean; // 默认 false
  playbackRate: 0.75 | 1.0 | 1.25; // 默认 1.0
}
```

派生 selector：`effectivePassThreshold = passThreshold + (strict:+5 / standard:0 / lenient:-5)`。

---

## 第 2 步：后端 — 弱项本分数线真正生效

### 2a. 数据模型加列

`prisma/schema.prisma:56` `user_profile` 新增：

```prisma
weakScoreThreshold Int @default(80)
```

`npx prisma migrate dev --name add_weak_score_threshold`。

### 2b. 四处硬编码 `< 80` 改为动态读取

1. `app/(main)/library/pronunciation/page.tsx`（约 line 43、78）— 先 `user_profile.findUnique` 取阈值。
2. `app/api/speech/errors/route.ts:20,62` — `lt: 80` 与 `.filter(...<80)` 改动态。
3. `lib/actions/speech.ts:209` — 音素 `lowScoreCount` 判定改读 `userProfile.weakScoreThreshold`（此处已 findUnique）。

### 2c. 新增写阈值 action

`lib/actions/speech.ts` 加 `updateWeakScoreThreshold(score:number)`（限 60–95，session 校验）。前端调阈值时 debounce 调用。

> 过关线/严格度/长度等**纯前端**配置不进后端。

---

## 第 3 步：新建 UI 组件

- **`components/voice/SettingsControls.tsx`** — `SettingsRow`、`Toggle`、`Stepper`、`Segmented` 原子组件（FCT 风格）。
- **`components/voice/PracticeSettingsPanel.tsx`** — 三组设置内容（纯展示+控件）。
- **`components/voice/PracticeSettingsButton.tsx`** — 触发按钮 + 弹层逻辑：
  - `variant="drawer"`（桌面）：`AnimatePresence` 右侧滑入 Drawer。
  - `variant="mobile"`（移动）：下拉面板，`useRef`+`mousedown` 关闭。

---

## 第 4 步：接入 ImmersiveSpeechPractice

文件 `components/voice/ImmersiveSpeechPractice.tsx`：

1. **放置触发按钮**：
   - 移动端顶栏 line 428 的空占位 `<div className="w-8">` → `<PracticeSettingsButton variant="mobile" />`。
   - 桌面左面板顶栏（line 277-288 `justify-between`）右侧加 `<div className="hidden md:block"><PracticeSettingsButton variant="drawer" /></div>`。
2. **应用设置**：
   - 自动跳转：`handleEvaluate` line 190 的 `score >= 80` → `effectivePassThreshold`，加 `if(autoAdvance)` 守卫。
   - 句长过滤 + 只练未掌握：`useMemo` 过滤 `subtitles`（词数 = `textEn.split(/\s+/).length`；未掌握 = latest `accuracyScore < effectivePassThreshold`）；`activeCardIndex`/`handleNext/Prev`/`URLSearchParams subtitleId` 跳转全部基于 filtered 数组（目标被过滤则回退 0）。
   - 把 `fontSizeLevel/showTranslation/showIpa/textMode/playbackRate/autoCompare/loopSentence/effectivePassThreshold` 透传给卡片。
3. **试用期(isTrialMode 前 5 句)**：过滤正常叠加，但锁定/解锁判定（line 394-414）仍基于原始 subtitles，解锁逻辑不变。

---

## 第 5 步：扩展 SpeechEvaluationCard（含盲读/遮罩模式）★

文件 `components/voice/SpeechEvaluationCard.tsx`，Props 全部向后兼容（optional）：

```ts
fontSizeLevel?: number;     // 替换 line 209 硬编码字号
showTranslation?: boolean;  // line 256-265/269 默认值
showIpa?: boolean;          // line 570-601 音素块守卫
textMode?: 'normal'|'ipa'|'blind';   // ★ 文本模式
playbackRate?: 0.75|1.0|1.25;
autoCompare?: boolean;
loopSentence?: boolean;
passThreshold?: number;     // 结果区达标标记/文案
```

### 字号

用共享的 `FONT_SIZE_LEVELS`（从 SettingsControls 导出）替换 line 209 的 `text-xl md:text-2xl lg:text-3xl`。

### ★ 文本模式（原文 / 音标 / 盲读遮罩）— 核心实现

`textRef` 区（line 206-266）按 `textMode` 分支：

- **`normal`（默认）**：现状，渲染英文单词。
- **`ipa`（拼音音标）**：每个词的位置显示其 IPA。**实现**：用一个 `useEffect` 在 subtitle 变化时，对去标点后的 unique 词批量请求 `/api/dict/[word]`（参考 FCT:711-725 单词查词典的调用），缓存到 `Record<string, DictEntryDTO>`（用 ref 做缓存避免重复请求）。渲染时每词显示 `/phonetics.us/`（取不到则回退显示原文词）。
- **`blind`（盲读遮罩）**：用与原文等宽的占位条遮罩每个词（`bg-ink-200 dark:bg-ink-700 rounded blur-sm select-none`），保留词间距和句长节奏感，用户只能凭听原音跟读。点击录音区或评测后可选择揭示（评测出分后自动取消遮罩，方便对照）。

> 选用分段控件而非三个开关，避免"显示音标"与"盲读"语义冲突（盲读时本就不显文本）。`showIpa` 仍单独控制**结果区**的音素诊断块，与文本模式正交。

### 其余接线

- 默认显示翻译：`showTranslation` state 初值由 prop 决定。
- IPA 结果块：`showIpa` 守卫 line 570。
- 语速/自动对比/循环：在 `useSpeechEvaluation` 调用或 effect 中接线（`playbackRate` 已是该 hook 内部概念）。
- 过关线：结果区把 `>= 80/85` 文案/配色改用 `passThreshold` prop（85/60 颜色档位映射保留）。

---

## 第 6 步：延后项

- **麦克风设备切换 + 试音**：需改 `getUserMedia({audio:{deviceId}})` + `enumerateDevices` + 音量分析，工作量与本次其他项关联弱。**本期不做**，"声音与跟读"组先放说明文案或留空。

---

## 涉及文件清单

**新增(4)**：

- `store/practice-settings-store.ts`
- `components/voice/PracticeSettingsPanel.tsx`
- `components/voice/PracticeSettingsButton.tsx`
- `components/voice/SettingsControls.tsx`

**修改**：

- `prisma/schema.prisma`（加 `weakScoreThreshold`）+ 新迁移
- `lib/actions/speech.ts`（阈值读取 + `updateWeakScoreThreshold`）
- `app/(main)/library/pronunciation/page.tsx`（阈值读取）
- `app/api/speech/errors/route.ts`（阈值读取）
- `components/voice/ImmersiveSpeechPractice.tsx`（放按钮 + 应用设置）
- `components/voice/SpeechEvaluationCard.tsx`（消费 props + 三种文本模式）

**不动**：`VoiceEvaluationClient.tsx`（未被引用）。

---

## 验证

1. `npx prisma migrate dev` → `npm run build` 类型检查通过。
2. 浏览器：剧集 → 语音评测 → 设置按钮，桌面出 Drawer / 移动端出下拉，各项调整即时生效。
3. 文本模式切到"音标"显示 IPA，切到"盲读"出现占位遮罩、评测出分后揭示。
4. 调弱项分数线 → 弱项本页面句子集合按新阈值变化（验证后端）。
5. 字号/翻译/模式等 localStorage 持久化（换剧集保留）。

---

## 风险/注意

- **`activeCardIndex` 与过滤后数组同步**：统一用 filtered 数组；`subtitleId` URL 跳转若目标被隐藏则回退 0。
- **z-index**：沉浸层 `z-[200]`，Drawer `z-[210]`。
- **persist SSR**：`skipHydration:true` + 客户端 mount rehydrate，或退回手动 localStorage。
- **IPA 批量请求**：用 ref 缓存 + 仅 unique 词，避免重复请求；失败优雅回退显示原文。
- **试用期**：过滤不破坏前 5 句锁定/解锁判定。

是否按此计划实施？麦克风项我默认延后，其余全做。
