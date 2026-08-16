# 远路播客：语音评测功能开发任务清单 (Voice Evaluation Features)

基于有道 ISE API 返回的详尽评测数据，为了充分发挥口语练习的数据价值，提升用户留存与学习体验，特制定以下分阶段开发任务清单。

## 阶段一：数据基建与持久化 (Data Infrastructure)

**目标**：完善数据库结构，确保用户的每一次有效评测都能被结构化、完整地保存下来。

- [x] **1. 更新 Prisma Schema**
  - 修改 `prisma/schema.prisma` 中的 `speech_recognition` 模型。
  - 新增核心指标字段：`accuracyScore`, `fluencyScore`, `integrityScore`, `overallScore`, `speed` (Float 类型)。
  - 新增详情数据字段：`detailUrl`（String 类型，将包含 `words`, `phonemes` 的完整 JSON 存入 OSS/S3，数据库仅保存其 URL 以避免字段臃肿）。
  - 新增音频字段：`userAudioUrl`（String 类型，保存用户录音的 OSS/S3 链接）。
  - 新增字幕关联字段：`subtitleId`（Int 类型，更稳定地关联原始字幕）。
- [x] **2. 数据库迁移 (Migration)**
  - 运行 `npx prisma migrate dev` 应用表结构变更并更新客户端。
- [x] **3. 录音文件上传服务集成 (Audio Upload)**
  - 开发或接入音频上传接口，将评测结束后的录音文件流式或直接上传至云存储（OSS），获取稳定的音频 URL。
- [x] **4. 更新后端 Action (`lib/actions/speech.ts`)**
  - 重构 `saveSpeechResult` 方法，使其支持接收并保存新增的核心分数、语速、音频 URL 和完整的 `detailJson`。

## 阶段二：基础功能升级与可视化 (Core Visualization)

**目标**：在现有的练习页面中，展示更丰富的维度数据，并支持本地及历史音频对比。

- [x] **1. 评测卡片多维分数展示**
  - 完善 `SpeechEvaluationCard.tsx`，真实绑定并展示准确度、流利度、完整度的进度条和具体分数。
- [x] **2. 单句历史对比与复盘**
  - 在 `VoiceEvaluationClient` 中，当用户再次练习同一句话时，通过对比数据库中拉取出的历史记录，展示“最高分”或给与“进步”视觉提示。
- [x] **3. 云端录音对比回放 (Audio Playback)**
  - 评测卡片利用保存的 `userAudioUrl`，允许用户不仅在本次会话中，甚至在以后复习时，也能点击“我的发音”按钮回放自己当时录音，与原声进行深度对比。

## 阶段三：高级学习闭环 (Advanced Learning Loop)

**目标**：利用深度的 JSON 数据（音素级评分），构建用户的个性化学习资产和诊断体系。

- [x] **1. 音素级可视化纠错 (Phoneme-level Feedback)**
  - 前端解析 `detailJson` 中的 `words[].phonemes` 数据。
  - 实现交互：点击被标红/标黄的错误单词，展开该单词的具体音素级得分（例如明确指出是元音 `/æ/` 还是辅音 `/θ/` 发错），精确指出错误位置。
- [x] **2. 智能发音错题本/弱项本 (Pronunciation Error Notebook)**
  - 在系统的“学习中心 (Library)” 新增“发音弱项本”模块。
  - 后端增加事件触发机制：自动筛选 `overallScore < 70` 或含有低分单词的句子，归入用户的弱项本。
  - 支持在弱项本中集中过滤、复习和重新评测这些薄弱环节。
- [x] **3. 个人发音弱点诊断报告 (Diagnostic Report)**
  - 编写统计算法，聚合用户过去特定周期（如 30 天）的评测数据。
  - 找出准确率持续偏低的特定音素（Phonemes），生成个性化雷达图和诊断报告。

## 阶段四：产品运营与游戏化 (Gamification & Operations)

**目标**：提升用户粘性、自适应推荐内容，打造高活跃社区。

- [x] **1. 学习成就与激励体系**
  - 设计并发放成就勋章（例如：累计获得 100 次 `overallScore >= 85` 可解锁“口语达人”勋章）。
  - 实现：`core/achievements/constants.ts` 新增 5 枚口语徽章（开口先锋/勤学苦练/百炼成钢/出口成章/口语达人），沿用惰性评估架构（查看成就页时自动解锁并发通知）。
- [x] **2. 发音达人排行榜 (Leaderboard)**
  - 构建每日/每周口语排行榜，展示高分/高频练习用户，促进社区竞争。
  - 实现：`/api/speech/leaderboard`（周期"近7天/今日" × 指标"平均分榜/勤奋榜"，平均分榜需 ≥5 次评测防单次满分霸榜）+ 页面 `/library/pronunciation/leaderboard`（含"我的排名"），弱项本页头部有入口。
- [x] **3. 播客难度自适应推荐 (Adaptive Recommendation)**
  - 根据用户的全局平均流利度和语速 (`speed`)，为其自动描绘能力等级画像（如 CEFR A2/B1）。
  - 首页或播客列表页根据该画像，优先推荐语速与难度匹配的 Episode。
  - 实现：`core/speech-profile` 服务聚合五维画像（准确/流利/完整/语速适配/综合）并推导 CEFR 等级（≥5 次评测生效）；弱项本页顶部展示画像雷达卡；首页"为你推荐"优先按画像等级匹配剧集难度（不足 5 次回退手动 learnLevel 设置）。
