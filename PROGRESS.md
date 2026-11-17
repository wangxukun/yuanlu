# Web 组件与样式规范

2026-11-17 对照源码整理；本文件保留长期规范，替代 UI 重设计流水账。

| 事项                   | 唯一入口 / 约定                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 色板、圆角、阴影、层级 | [tailwind.config.mjs](tailwind.config.mjs) + [app/globals.css](app/globals.css)：ink 暖纸、primary 远青、accent 曙光橙、info 黛蓝、error 陶土红                                                                                                          |
| 圆角 / 阴影            | `--r-sm/md/lg/xl`=8/12/16/24px；`shadow-e1/e2/e3`；新组件优先现有 token                                                                                                                                                                                  |
| 字体                   | [components/fonts.ts](components/fonts.ts)：Plus Jakarta Sans 用于 UI，Source Serif 4 用于英文精读，中文用系统栈                                                                                                                                         |
| 深色主题               | Tailwind selector `[data-theme="dark"]`；DaisyUI 5 的 `--color-*` 在 globals.css 覆写，保持选择器优先级；不要恢复旧版内联主题配置                                                                                                                        |
| 卡片 / 徽章            | [components/ui](components/ui)：PodcastCard（正方形封面）、ProBadge、DifficultyBadge；难度映射复用 [lib/difficulty.ts](lib/difficulty.ts)                                                                                                                |
| 全局音频               | [components/player/GlobalAudio.tsx](components/player/GlobalAudio.tsx) + [store/player-store.ts](store/player-store.ts)                                                                                                                                  |
| 桌面 / 移动控制        | [components/controls/PlayControlBar.tsx](components/controls/PlayControlBar.tsx)、MobilePlayerBar、MobilePlayerSheet（components/player/）                                                                                                               |
| 字幕交互               | [components/episode/transcript](components/episode/transcript)：滚动/选择/键盘 hooks、SubtitleItem、DictationItem、TranscriptToolbar、VocabularyModal；逐词高亮见 [components/transcript/useWordHighlight.ts](components/transcript/useWordHighlight.ts) |
| 会员浮层               | [components/subscription](components/subscription)；场景文案与埋点 source 复用现有定义                                                                                                                                                                   |

## 需要继续遵守的细节

- 底部固定导航/迷你条复用 `--safe-bottom-max` 与 `--mobile-bottom-*` 占位；背景和 padding 放在 fixed 元素自身，避免滚动时安全区变化造成跳动。
- 新浮层用既有 z token，检查与移动底导、播放器、toast 的覆盖关系。代码仍有 190/200 等历史数值，不能声称已全量统一。
- 复用现有听写的单句循环、0.8x、拼写反馈与自动跳句逻辑；时间轴不要另写第二套。
- 里程展示沿用收听小时 ×5；业务日期统一用 core/utils/china-date.ts。
- 小屏、平板、桌面分别检查字幕长句、键盘弹出、滚动与弹层遮挡；长文案不能因垂直居中被削顶。

## 尚存的整理点

globals.css 的 `--header-height-mobile=80px` 与部分 Header 高度、历史 z-index 数值及 base/ink 背景写法仍需按调用点清理；这些是后续代码工作，本轮只修文档。一次性 scripts/retheme.mjs 不作为日常全仓格式化/换肤命令。
