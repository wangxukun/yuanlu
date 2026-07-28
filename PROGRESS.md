# 远路播客 UI 重设计 · 进度记录

> 分支：`feat/redesign` ｜ 最近提交：`b437fb1`
> 设计概念：**「纸上远行」**——暖纸底色（书的温度）+ 远青（路的延伸）+ 曙光橙（每一步的奖励），用"旅程/里程"隐喻承载学习数据，替代原 AI 默认的 indigo→purple 渐变风。

---

## 一、总体思路

### 诊断结论（原界面核心问题）

1. **两个品牌紫并存**：`indigo-600` 与硬编码 `#5830E0` 各据一方
2. **两套样式体系并存**：DaisyUI 语义 token vs 硬编码 slate/indigo
3. **三套字体体系**：fonts.ts + 26 处内联 `Plus Jakarta Sans` + `font-['Lexend']`
4. **徽章过载**：8+ 处复制粘贴的 PRO 渐变徽章、5 处重复难度配色映射
5. **品牌零落地**：「远路」的旅程意象在视觉中不存在
6. 同屏三种圆角、听写功能缺失、播放键 hover 才浮现等交互问题

### 设计系统（已落地的 token）

| 角色   | 色板                 | 主值                                           |
| ------ | -------------------- | ---------------------------------------------- |
| 中性色 | `ink`（暖纸，11 级） | bg `#FAF8F3` / 文字 `#1B1812` / 暗色 `#151310` |
| 主色   | `primary`（远青）    | 主按钮 `#1F7A5C` / hover `#1A6349`             |
| 强调   | `accent`（曙光橙）   | 生词高亮 `#FAE5C6` / 徽章 `#D98A17`            |
| 信息   | `info`（黛蓝）       | `#4A7FA5`                                      |
| 错误   | `error`（陶土红）    | `#D2503F`                                      |

- 字体：**Plus Jakarta Sans**（UI/西文，`--font-jakarta`）+ **Source Serif 4**（英文精读，`--font-serif`），中文落系统栈
- 圆角阶梯：8/12/16/24（`--r-sm/md/lg/xl`）；阴影：`--e1/e2/e3`；z-index 分层：`--z-*`
- 难度配色：A→远青 / B1→黛蓝 / B2→曙光橙 / C→陶土红
- 里程换算：收听 1 小时 = 5km（步行速度隐喻）

---

## 二、已完成（对应实施 Prompt 的 Step 编号）

### ✅ Step 1-3：设计 token + 字体收编 + 全局换肤

- `tailwind.config.mjs`：五组色板 + `font-display` + `eq` 波形动画 keyframes
- `globals.css`：全套 CSS 变量 + DaisyUI 5 `--color-*` 语义色覆盖（见"坑"一节）
- `components/fonts.ts`：Jakarta + Source Serif 4（next/font 自托管），删除 Google Fonts `<link>`、26 处内联 fontFamily、1 处 Lexend
- `scripts/retheme.mjs`：一次性换肤脚本，110 文件 ~2000 处替换（slate/gray→ink、indigo/emerald/green→primary、purple/orange/amber/yellow→accent、blue/sky/cyan/violet→info、red/rose→error、硬编码 hex/rgba→token、品牌渐变拍平）

### ✅ Step 5：徽章/难度组件化

- 新建 `components/ui/ProBadge.tsx`、`components/ui/DifficultyBadge.tsx`、`lib/difficulty.ts`
- 替换 8 处 PRO 渐变徽章、5 处难度映射；amber 全局并入 accent（零残留）

### ✅ Step 7：首页旅程化

- `HomeClient` 重构：文字问候 + 🔥streak chip；继续收听卡（封面+进度+「还剩约 N 分钟」+ 实心 ResumeButton）
- `WeeklyMileageCard`（替代 UserStatsCard）：本周里程 km = 小时 × 5，「词汇路标」
- `JourneyStrip`：SVG 蜿蜒小径 + 7 日节点（学习日点亮+小旗、今天虚线圈），数据接 `statsService.getWeeklyActivityChart`
- 响应式修复：收听卡移动端封面通栏；JourneyStrip 移动/桌面双画幅参数化渲染

### ✅ Step 6：剧集页

- 封面播放键常驻右下 56px（`primary-600` + e3 阴影），移除 hover 才浮现
- 「开始精听」主 CTA：播放 + 打开沉浸逐字稿（`isLyricsOpen` 提升至 `player-store`）
- 逐字稿排版：英文 serif `text-lg/xl leading-[1.85]/[1.9]`；激活句 `bg-primary-50` + 3px `primary-500` 竖条；中文 `text-sm leading-[1.7] ink-400`；单词 hover 统一 `bg-accent-100 text-accent-700`
- 修复：768px 按钮重叠（`sm:flex-row`→`lg:flex-row`）；≤820px 音频/文稿/收藏/分享仅图标；相关剧集改单列

### ✅ Step 8：播放器统一与波形微交互

- `PlayControlBar` 悬浮药丸规范：桌面/平板端固定高度 `h-16 px-6`，应用纯圆角 `rounded-full` 与 `md:shadow-[var(--e3)]`
- 进度条粗细精修：桌面端进度条轨高度调整为 `h-1`（保留 12px 白色拖拽滑块）
- 品牌波形微交互：播放中封面图叠加半透明黑底 + 4 柱 `animate-eq` 白色跳动波形，同步应用至桌面控制条、播放列表当前项及移动端 `MobilePlayerBar` Mini 播放器
- 下线清理：彻底清理并删除废弃遗留组件 `components/player/Player.tsx`

### ✅ Step 4：播客卡统一

- `components/ui/PodcastCard.tsx`：抽象通用播客卡片，采用 `aspect-square` 正方形封面、角标插槽（如 01/02/03 排行榜与 New 标签）、圆点分隔的 Meta 信息行及 Hover 缩放微交互
- 重构 `app/(main)/discover/page.tsx`：替换热门节目 (Trending)、为您推荐 (For You)、新节目 (New Programs) 3 处内联重复实现，精简代码

### ✅ Step 9：听写模式（核心新功能）

- `DictationItem.tsx`：隐藏 Input 捕获键盘与手机软键盘输入，实时逐词比对引擎（正确 `text-primary-600` / 错误 `text-error line-through` / 待填 `border-dashed` 虚线下划线），同句 3 次拼写错误触发提示
- `InteractiveTranscript.tsx` 与 `FullContentTranscript.tsx` 多端集成：桌面端/平板端（`FullContentTranscript`）与移动端（`InteractiveTranscript`）均支持「📖 精读 / ✍️ 听写」模式切换；听写模式下自动切至 0.8x 慢速播放，底层通过 `useTranscriptScroll` 在 60fps 动画帧侦听层原生实现单句死循环锁定与拼写正确后的自动下一句跳动（解决了计时器竞态与 React 闭包导致移动端死循环失效的问题）。

### ✅ Step 10：学习报告页旅程化

- `StatsOverview` 旅程仪表盘：累计里程 km 大数字（`totalHours × 5`）+ 连续天数🔥 + 词汇路标，统一 ink/primary/accent 设计令牌
- `MilestoneRoadmap` SVG 里程碑路图：新建 5 节点（1/5/21.1/42.2/100km）蜿蜒旅程路径，已达成节点着远青色+曙光橙旗帜，当前位置脉冲动画圆点
- `ActivityChart` 单色化去网格：删除 CartesianGrid 降低视觉噪音，Tooltip 改为暖纸色系，标题更新为「本周行程记录」
- `AchievementsCard` 里程碑化：标题改为「远路里程碑」，解锁/未解锁双态配色统一至 ink/primary 设计令牌
- `personal-center/page.tsx` 页面组装：在 StatsOverview 和 ActivityChart 之间嵌入 MilestoneRoadmap

### ✅ Step 11：设计令牌落地与个人中心重构

- `tailwind.config.mjs`：正式将 `app/globals.css` 中的 `--r-*`, `--e*`, `--z-*` 等变量注册为 Tailwind 配置（覆盖 `borderRadius` 的 sm/md/lg/xl，新增 `boxShadow` e1/e2/e3 及 `zIndex` 别名）
- 个人中心重构：废弃大横幅设计，改为卡片化风格，包含居中的头像和「远行客 Lv.X」身份徽章，引入「旅程数据」「里程碑」「最近听过」三大下划线 Tab 切页，并彻底下线遗留的 `ProfileCard` 组件。

### ✅ Step 12：响应式布局优化与按钮风格统一

- **个人中心移动端布局** (`personal-center/page.tsx`)：移动端头像与个人信息调整为 `flex-row` 左右列布局，信息文本左对齐，并优化了各种窄屏设备的响应式间距与元素遮挡。
- **单集详情页平板端收拢** (`episode/[id]/page.tsx` & `ActionButtons.tsx`)：将单集详情页网格断点由 `md` 提升至 `lg`，使平板端统一应用全宽单列布局；`ActionButtons` 响应式断点下调至 `md`，实现在平板端所有按钮呈一行优雅排版。
- **按钮视觉风格统一** (`ActionButtons.tsx` & `LearningPathsClient.tsx`)：剥离 DaisyUI `.btn` 自带的修饰阴影与微缩放，统一采用 `PodcastHero` 的纯粹原生 Tailwind 色块风格（`bg-[#1F7A5C] hover:bg-[#1A6349]` 等）。
- **频道页 Banner 与暗色模式修复** (`ChannelClient.tsx`)：显式指定浅色模式深绿底色 `bg-[#1F7A5C]` 解决原 `bg-primary` 失效导致对比度缺失问题，增加 `antialiased` 修复深色背景上的文字边缘发虚，并添加 `dark:bg-ink-950` 实现暗色模式下的沉浸式纯黑底板。

### ✅ Step 15：个人中心与弹窗统一精修

- **个人简介与首页融合**：`HomeClient.tsx` 与个人中心全线优先渲染用户 `profile.bio`，空状态下优雅回退至“路虽远行则将至，事虽难做则可成。”；个人中心加入时间规范化为“YYYY年M月D日”中文字符格式。
- **编辑资料弹窗重构 (`EditProfileModal.tsx`)**：
  - 风格完全对齐 `ProofreadModal`：采用原生 `<dialog>`、DaisyUI `modal-box` 结构、`rounded-xl` / `shadow-e3` / `bg-base-100`、顶部品牌渐变 Header。
  - Tabs 标签页升级：重构为 `tabs-boxed` 药丸切页风格，选中态高亮浮起。
  - 清理重复表单：移除“学习目标”中重复且数值不规范的“英语水平”选择框，仅在“个人资料”保留一处。
  - 学习目标与输入框布局重构：统一进度条为 `range-primary` 与精致 Tag 角标；解决刻度下标 (`10m/60m/120m`) 对齐问题；重构 Flex 布局，确保桌面端、平板端与移动端下的标题、进度条及输入框均单独一行全宽优雅排版。
- **查词助手弹窗对齐 (`VocabularyModal.tsx`)**：
  - 结构样式对齐 `ProofreadModal`：应用 `max-h-[80vh]`、滚动体、`bg-ink-50` 上下文参考框及 `bg-primary-600` 定制风格按钮，修复底部 safe-area 对齐导致按键贴边的 Padding 问题。

### ✅ Step 16：移动端全屏播放器沉浸式体验重构

- **去除巨型封面 (`MobilePlayerSheet.tsx`)**：移除了移动端播放器默认在顶部占据近半屏高度的正方形大封面图，彻底重构为横向紧凑布局 (Compact Header)。封面缩小为 48x48 并与标题同行显示，对齐 Spotify/Apple Music 展开歌词后的顶部常驻栏体验。
- **释放精听字幕空间**：将进度条、播放/暂停、倍速、循环等控制按钮的间距深度压缩。重构后，播放器头部仅占用 25%~30% 屏幕高度，释放出高达 70% 的垂直空间专门用于 `InteractiveTranscript`（精读与听写区域），大幅提升了移动端沉浸式学习体验。

### ✅ Step 13：卡片、弹窗与小组件样式统一规范化

- **弹窗与抽屉层 (Modals & Sheets)**：重构 `ReviewModal`, `TranscriptPreviewModal`, `PremiumModal`, `MobilePlayerSheet`, `VocabularyModal`, `ProofreadModal`, `DeleteCommentModal` 等，统一采用 `rounded-xl`、`shadow-e3` 与 `bg-base-100`，彻底替代内联硬编码样式。
- **核心卡片层 (Core Cards)**：重构 `PodcastCard`, `EpisodeCard`, `SpeechEvaluationCard`, `ImmersiveCard`, `AchievementsCard` 等卡片，统一阴影层级为 `shadow-e1`（Hover 浮起 `shadow-e2`），采用 DaisyUI 语义色 `bg-base-100`/`bg-base-200`，消除暗黑模式下样式不匹配与碎片化现象。
- **列表与微组件层 (Lists & Micro-components)**：重构 `List`, `SubtitleItem`, `DictationItem`, `CommentItem`, `TranscriptToolbar`, `PlayControlBar` 等组件，规范边框为 `border-base-200` 并收敛阴影与背景色。

### ✅ Step 14：数据库时区问题与日期统计修复

- **时区问题根因修复** (`core/utils/china-date.ts` & `core/stats/stats.service.ts`)：解决 `date-fns` 的 `startOfDay` 在 UTC+8 环境下将本地时间转换为 UTC 传给 Prisma 时，被 PostgreSQL `@db.Date` 截断导致存储日期比实际中国日期早一天（CST 7/27 -> 存储 7/26）的问题。
- **中国时区工具库封装** (`core/utils/china-date.ts`)：新增 `chinaToday`, `chinaStartOfWeek`, `chinaEndOfWeek`, `addUTCDays`, `subUTCDays`, `isSameUTCDay`, `dateToUTCKey` 等工具方法，统一返回以 China Standard Time (UTC+8) 为准的 UTC 午夜 Date / Key 对象。
- **统计服务彻底重构** (`stats.service.ts`)：将活动打卡 `updateDailyActivity`、首页及报告页图表 `getWeeklyActivityChart`、连续天数 `calculateStreak` 等核心逻辑全部迁移至 `china-date` 工具集，消除了读取与写入端不匹配及连续打卡计算断层的 Bug。
- **历史数据全量迁移与合并** (`scripts/fix-activity-dates.js`)：编写并成功执行一次性全量修正脚本，根据记录的真实创建时间 `createAt (Timestamptz)` 自动重计算并更正 `user_daily_activity` 表的 `date` 字段，对已有同天记录自动合并秒数与学习词汇量，修复了全库 1100+ 条历史偏差记录。

### ⚠️ 踩过的坑（重要）

**DaisyUI 5 不支持 JS 内联主题对象**（v4 语法静默失效，页面渲染默认紫/粉主题色）。
解法：`globals.css` 中用 `html[data-theme="light/dark"]`（特异度 0,1,1 > daisy 的 0,1,0）覆写 `--color-primary` 等全套变量。

---

## 三、未完成任务

### 设计系统遗留

- [x] **阴影统一**：卡片 e1/e2 与弹窗 e3 规范已在全站核心卡片、弹窗与列表小组件推广完成
- [ ] z-index magic number（190/195/200/210）替换为 `--z-*` 变量 (部分完成)
- [ ] `--header-height-mobile: 80px` 与实际 `h-14`(56px) 不一致
- [ ] `bg-base-*` / `bg-ink-*` 混用清理（两套底色写法已同值，但类名未统一）

### 待实施的 Step（来自实施 Prompt）

- [x] **Step 4**：`components/ui/PodcastCard.tsx` 统一播客卡（4:3 封面、≤1 角标、meta 行难度圆点），替换 discover 页 3 处内联实现
- [x] **Step 8**：播放器统一——`PlayControlBar` 悬浮药丸规范（h-16、rounded-full、e3）、进度条 h-1 + 12px 白圆点、播放中封面 4 柱 `animate-eq` 波形；下线遗留 `components/player/Player.tsx`
- [x] **Step 9**：**听写模式**（新功能）——逐字稿区内 Tab 切换（非新路由）：单句循环 + 0.8x、隐藏 input 逐词比对（正确 `text-primary-600` / 错误 `text-error line-through` 保留用户输入 / 待填 dashed 下划线）、3 次失败出「提示」、自动通关跳转
- [x] **Step 10**：学习报告页——累计里程大数字（分钟 ÷ 12 = km）、SVG 里程碑路图（1/5/21.1/42.2/100km 旗帜）、`ActivityChart` 单色化去网格、成就墙改里程碑体系
- [x] **Step 11**：z-index/圆角/阴影 token 落地，并完成个人中心横幅与 Tabs 的改版

---

## 四、下一步计划（建议顺序）

1. 深入清理设计系统遗留问题（如 `bg-base` 类名、固定高度变量不一致）
2. 其他模块的响应式或移动端专项适配

## 五、工作方式备忘

- 校验三连：`npx tsc --noEmit` → `npm run lint` → dev 冒烟（curl 关键页面 200）
- 换肤类批量修改一律走 `scripts/retheme.mjs` 式脚本 + grep 残留扫描（lookbehind 只排字母、**不能排连字符**，否则 `text-slate-` 全部漏网）
- 截图验收时注意：移动端长截图的区块"重复"是拼接重影，非 bug
