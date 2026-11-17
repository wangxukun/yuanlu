# 语音评测与媒体保留

代码核对：2026-11-17。评测、保存的公共实现为 [core/speech/speech-evaluate.service.ts](core/speech/speech-evaluate.service.ts)；Web [lib/actions/speech.ts](lib/actions/speech.ts) 与 REST [app/api/speech](app/api/speech) 共用它。

| 功能                      | 入口                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 请求/结果 DTO、配额与保存 | core/speech/speech-evaluate.service.ts；[lib/quota.ts](lib/quota.ts)                                                                                         |
| 录音交互、原声、分数展示  | [components/voice](components/voice)、[components/voice/hooks/useSpeechEvaluation.ts](components/voice/hooks/useSpeechEvaluation.ts)                         |
| 弱项查询与动态分数线      | [core/speech/weak-sentences.service.ts](core/speech/weak-sentences.service.ts)                                                                               |
| 排行 / 能力画像 / 成就    | [core/speech/leaderboard.service.ts](core/speech/leaderboard.service.ts)、[core/speech-profile](core/speech-profile)、[core/achievements](core/achievements) |
| 数据模型                  | prisma/schema.prisma：speech_recognition、user_profile.phonemeStats                                                                                          |

## 权限与数据

免费评测已统一为跨入口日池（5 次承诺 +1 缓冲）；learn/review 只作场景维度，不再分别消耗月池/日池。配额和会员判定见 [会员说明](docs/MEMBERSHIP.md)。保留评测数据库行用于计数与统计，不能通过删旧行腾配额。

saveSpeechResultCore 仅为会员保存 OSS 录音与 DB detailJson；免费用户保存分数等记录、更新音素画像，并可使用本次响应中的词级结果。新明细不再上传 OSS JSON；detail 路由优先 DB、兼容旧 detailUrl。历史接口按权限裁剪 URL/细节，客户端不能自行拼 OSS 地址。

同一 `(userid, episodeid, targetText)` 保留最近 3 份录音；超额删除媒体、清空引用但保留记录。历史面板 [EvaluationHistoryPanel.tsx](components/voice/EvaluationHistoryPanel.tsx) 同样按句限制。剧集删除通过 deleteEpisodeSpeechMedia 清理关联对象。

## 清理与运维

[core/speech/speech-cleanup.service.ts](core/speech/speech-cleanup.service.ts) 默认媒体保留 90 天；[lib/cleanupCron.ts](lib/cleanupCron.ts) 每日 03:30 调度，可由 SPEECH_MEDIA_RETENTION_DAYS 覆盖（调度时区取运行环境）。[instrumentation.ts](instrumentation.ts) 注册后台任务。

桶生命周期的规划值为 91 天，需在控制台独立核实；仓库里的 scripts/set-speech-lifecycle.ts 不代表当前桶规则已配置。应用保留期应比桶生命周期短，避免引用已消失的对象。

- scripts/cleanup-speech-oss.ts：存量清理；scripts/sweep-speech-orphans.ts：无引用孤儿对账。先按脚本参数 dry-run 核对，`--apply` 会实际删除。
- 修改配额、弱项线、保存结构时运行相应 scripts/test-p3-\*.ts 与客户端回归；真实麦克风、原声 seek、云评测和历史回放仍需设备验证。
