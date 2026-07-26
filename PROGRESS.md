# 远路播客 UI 重设计 · 进度记录

> 分支：`feat/redesign` ｜ 最近提交：`0b2c1a3`
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

### ✅ Step 10：学习报告页旅程化

- `StatsOverview` 旅程仪表盘：累计里程 km 大数字（`totalHours × 5`）+ 连续天数🔥 + 词汇路标，统一 ink/primary/accent 设计令牌
- `MilestoneRoadmap` SVG 里程碑路图：新建 5 节点（1/5/21.1/42.2/100km）蜿蜒旅程路径，已达成节点着远青色+曙光橙旗帜，当前位置脉冲动画圆点
- `ActivityChart` 单色化去网格：删除 CartesianGrid 降低视觉噪音，Tooltip 改为暖纸色系，标题更新为「本周行程记录」
- `AchievementsCard` 里程碑化：标题改为「远路里程碑」，解锁/未解锁双态配色统一至 ink/primary 设计令牌
- `personal-center/page.tsx` 页面组装：在 StatsOverview 和 ActivityChart 之间嵌入 MilestoneRoadmap

### ⚠️ 踩过的坑（重要）

**DaisyUI 5 不支持 JS 内联主题对象**（v4 语法静默失效，页面渲染默认紫/粉主题色）。
解法：`globals.css` 中用 `html[data-theme="light/dark"]`（特异度 0,1,1 > daisy 的 0,1,0）覆写 `--color-primary` 等全套变量。

---

## 三、未完成任务

### 设计系统遗留

- [ ] **圆角类重映射**：`rounded-lg/xl` 等 Tailwind 默认值未改（避免未审先变），待组件级改造时按 8/12/16/24 阶梯逐个落地
- [ ] **阴影统一**：卡片 e0（1px 边框）→ hover e2 的模式未全站推广
- [ ] z-index magic number（190/195/200/210）替换为 `--z-*` 变量
- [ ] `--header-height-mobile: 80px` 与实际 `h-14`(56px) 不一致
- [ ] `bg-base-*` / `bg-ink-*` 混用清理（两套底色写法已同值，但类名未统一）

### 待实施的 Step（来自实施 Prompt）

- [x] **Step 4**：`components/ui/PodcastCard.tsx` 统一播客卡（4:3 封面、≤1 角标、meta 行难度圆点），替换 discover 页 3 处内联实现
- [x] **Step 8**：播放器统一——`PlayControlBar` 悬浮药丸规范（h-16、rounded-full、e3）、进度条 h-1 + 12px 白圆点、播放中封面 4 柱 `animate-eq` 波形；下线遗留 `components/player/Player.tsx`
- [x] **Step 9**：**听写模式**（新功能）——逐字稿区内 Tab 切换（非新路由）：单句循环 + 0.8x、隐藏 input 逐词比对（正确 `text-primary-600` / 错误 `text-error line-through` 保留用户输入 / 待填 dashed 下划线）、3 次失败出「提示」、自动通关跳转
- [x] **Step 10**：学习报告页——累计里程大数字（分钟 ÷ 12 = km）、SVG 里程碑路图（1/5/21.1/42.2/100km 旗帜）、`ActivityChart` 单色化去网格、成就墙改里程碑体系
- [ ] **Step 11**：z-index token 落地

### 已知小问题

- 个人中心横幅已拍平为 `bg-primary`，但整体改版（头像 + 「远行客 Lv.X」身份行 + Tab 重构）未做

---

## 四、下一步计划（建议顺序）

1. **Step 11 z-index token 落地** + 圆角/阴影阶梯全站推广
2. **个人中心头部重构** (解决遗留的已知小问题)

## 五、工作方式备忘

- 校验三连：`npx tsc --noEmit` → `npm run lint` → dev 冒烟（curl 关键页面 200）
- 换肤类批量修改一律走 `scripts/retheme.mjs` 式脚本 + grep 残留扫描（lookbehind 只排字母、**不能排连字符**，否则 `text-slate-` 全部漏网）
- 截图验收时注意：移动端长截图的区块"重复"是拼接重影，非 bug
